#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)/fullstack-mv100"
echo "Creating project at: $ROOT"
mkdir -p "$ROOT"
cd "$ROOT"

##############################
# Write docker-compose.yml
##############################
cat > docker-compose.yml <<'YAML'
version: '3.8'

services:
  kafka:
    image: bitnami/kafka:latest
    container_name: kafka
    environment:
      - KAFKA_CFG_PROCESS_ROLES=broker,controller
      - KAFKA_CFG_NODE_ID=1
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092,EXTERNAL://localhost:9094
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@kafka:9093
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CFG_INTER_BROKER_LISTENER_NAME=PLAINTEXT
      - ALLOW_PLAINTEXT_LISTENER=yes
    ports:
      - "9092:9092"
      - "9094:9094"
      - "9093:9093"

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    depends_on:
      - kafka
    ports:
      - "8080:8080"
    environment:
      - KAFKA_CLUSTERS_0_NAME=local-cluster
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka:9092
      - KAFKA_CLUSTERS_0_READONLY=false
      - KAFKA_CLUSTERS_0_TOPIC_AUTO_CREATE=true

  postgres:
    image: postgres:14
    container_name: postgres
    environment:
      POSTGRES_DB: mv100db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    command:
      - postgres
      - -c
      - wal_level=logical
      - -c
      - max_wal_senders=10
      - -c
      - max_replication_slots=10
      - -c
      - max_wal_size=1GB
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./sql/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: pgadmin
    depends_on:
      - postgres
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"

  connect:
    image: debezium/connect:2.7.1.Final
    container_name: connect
    depends_on:
      - kafka
      - postgres
    ports:
      - "8083:8083"
    environment:
      BOOTSTRAP_SERVERS: "kafka:9092"
      GROUP_ID: "1"
      CONFIG_STORAGE_TOPIC: "connect-configs"
      OFFSET_STORAGE_TOPIC: "connect-offsets"
      STATUS_STORAGE_TOPIC: "connect-status"
      KEY_CONVERTER: "org.apache.kafka.connect.json.JsonConverter"
      VALUE_CONVERTER: "org.apache.kafka.connect.json.JsonConverter"
      KEY_CONVERTER_SCHEMAS_ENABLE: "false"
      VALUE_CONVERTER_SCHEMAS_ENABLE: "false"

  redis:
    image: redis:7
    container_name: redis
    ports:
      - "6379:6379"
    command: ["redis-server", "--save", "60", "1", "--appendonly", "yes"]
    volumes:
      - redisdata:/data

  auth:
    build:
      context: ./services/auth
    container_name: auth
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - JWT_SECRET=supersecretkey
      - REDIS_URL=redis://redis:6379
      - PGUSER=appuser
      - PGPASSWORD=appuser
      - PGHOST=postgres
      - PGDATABASE=mv100db
      - PGPORT=5432
    depends_on:
      - postgres
      - redis
      - kafka

  catalog:
    build:
      context: ./services/catalog
    container_name: catalog
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PGUSER=appuser
      - PGPASSWORD=appuser
      - PGHOST=postgres
      - PGDATABASE=mv100db
      - PGPORT=5432
    depends_on:
      - postgres
      - kafka

  cart:
    build:
      context: ./services/cart
    container_name: cart
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - PGUSER=appuser
      - PGPASSWORD=appuser
      - PGHOST=postgres
      - PGDATABASE=mv100db
      - PGPORT=5432
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=supersecretkey
    depends_on:
      - postgres
      - redis
      - kafka

  frontend:
    build:
      context: ./frontend
    container_name: frontend
    ports:
      - "8081:80"
    depends_on:
      - auth
      - catalog
      - cart

volumes:
  pgdata:
  redisdata:
YAML

echo "Wrote docker-compose.yml"

##############################
# SQL init
##############################
mkdir -p sql
cat > sql/init-db.sql <<'SQL'
-- Create replication role if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dbz') THEN
      CREATE ROLE dbz WITH REPLICATION LOGIN PASSWORD 'dbz';
   END IF;
END
$$;

-- Create database if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'mv100db') THEN
      CREATE DATABASE mv100db;
   END IF;
END
$$;

\connect mv100db

-- Create tables if not exist
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES public.users(id),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES public.orders(id),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emails (
  id SERIAL PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMP NULL
);

-- Create publication if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'dbz_pub') THEN
      CREATE PUBLICATION dbz_pub 
      FOR TABLE public.users, public.orders, public.payments, public.emails, public.products;
   END IF;
END
$$;

-- Grant privileges to dbz user
GRANT CONNECT ON DATABASE mv100db TO dbz;
GRANT USAGE ON SCHEMA public TO dbz;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dbz;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dbz;

-- Create application user if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appuser') THEN
      CREATE ROLE appuser WITH LOGIN PASSWORD 'appuser';
   END IF;
END
$$;

-- Grant privileges for appuser
GRANT CONNECT ON DATABASE mv100db TO appuser;
GRANT USAGE ON SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO appuser;
SQL

echo "Wrote SQL init file"

##############################
# Debezium connector
##############################
mkdir -p connect
cat > connect/connector.json <<'JSON'
{
  "name": "pg-auth-catalog-orders",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "dbz",
    "database.password": "dbz",
    "database.dbname": "mv100db",

    "topic.prefix": "mv100db",

    "plugin.name": "pgoutput",
    "slot.name": "dbz_slot",
    "publication.name": "dbz_pub",

    "table.include.list": "public.users,public.orders,public.payments,public.emails,public.products",

    "snapshot.mode": "initial",

    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "key.converter.schemas.enable": "false",
    "value.converter.schemas.enable": "false",

    "decimal.handling.mode": "string"
  }
}
JSON

echo "Wrote connector.json"

##############################
# Services: auth, catalog, cart
##############################
mkdir -p services/auth services/catalog services/cart

#### AUTH service
cat > services/auth/package.json <<'JSON'
{
  "name": "auth-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.0",
    "body-parser": "^1.20.2",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.0",
    "kafkajs": "^2.2.4"
  }
}
JSON

cat > services/auth/index.js <<'JS'
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const Redis = require('ioredis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Kafka } = require('kafkajs');

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
  user: process.env.PGUSER || 'appuser',
  host: process.env.PGHOST || 'postgres',
  database: process.env.PGDATABASE || 'mv100db',
  password: process.env.PGPASSWORD || 'appuser',
  port: process.env.PGPORT || 5432,
});

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

const kafka = new Kafka({ clientId: 'auth-service', brokers: ['kafka:9092'] });
const producer = kafka.producer();

async function start() {
  await producer.connect();

  app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email+password required' });
    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, hash]
      );
      const user = result.rows[0];
      // publish to kafka (optional, Debezium will also capture)
      await producer.send({
        topic: 'mv100db.public.users',
        messages: [{ key: String(user.id), value: JSON.stringify({ id: user.id, email: user.email }) }]
      });
      res.json({ success: true, id: user.id });
    } catch (err) {
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '2h' });
      await redis.set(`session:${user.id}`, token, 'EX', 60 * 60 * 2);
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Auth service listening on ${port}`));
}

start().catch(err => { console.error(err); process.exit(1); });
JS

cat > services/auth/Dockerfile <<'DOCK'
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
DOCK

#### CATALOG service
cat > services/catalog/package.json <<'JSON'
{
  "name": "catalog-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "body-parser": "^1.20.2",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "kafkajs": "^2.2.4"
  }
}
JSON

cat > services/catalog/index.js <<'JS'
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
  user: process.env.PGUSER || 'appuser',
  host: process.env.PGHOST || 'postgres',
  database: process.env.PGDATABASE || 'mv100db',
  password: process.env.PGPASSWORD || 'appuser',
  port: process.env.PGPORT || 5432,
});

const kafka = new Kafka({ clientId: 'catalog-service', brokers: ['kafka:9092'] });
const producer = kafka.producer();

async function start() {
  await producer.connect();

  app.post('/products', async (req, res) => {
    const { name, description, price } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'name + price required' });
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *',
        [name, description || '', price]
      );
      const prod = result.rows[0];
      await producer.send({
        topic: 'mv100db.public.products',
        messages: [{ key: String(prod.id), value: JSON.stringify(prod) }]
      });
      res.json(prod);
    } finally {
      client.release();
    }
  });

  app.get('/products', async (req, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM products ORDER BY id DESC');
      res.json(result.rows);
    } finally {
      client.release();
    }
  });

  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Catalog service listening on ${port}`));
}

start().catch(err => { console.error(err); process.exit(1); });
JS

cat > services/catalog/Dockerfile <<'DOCK'
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
DOCK

#### CART service
cat > services/cart/package.json <<'JSON'
{
  "name": "cart-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "body-parser": "^1.20.2",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "ioredis": "^5.3.2",
    "pg": "^8.11.0",
    "kafkajs": "^2.2.4",
    "jsonwebtoken": "^9.0.2"
  }
}
JSON

cat > services/cart/index.js <<'JS'
const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

const pool = new Pool({
  user: process.env.PGUSER || 'appuser',
  host: process.env.PGHOST || 'postgres',
  database: process.env.PGDATABASE || 'mv100db',
  password: process.env.PGPASSWORD || 'appuser',
  port: process.env.PGPORT || 5432,
});

const kafka = new Kafka({ clientId: 'cart-service', brokers: ['kafka:9092'] });
const producer = kafka.producer();

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function start() {
  await producer.connect();

  app.post('/cart/add', authMiddleware, async (req, res) => {
    const { productId, qty } = req.body;
    const userId = req.user.userId;
    if (!productId) return res.status(400).json({ error: 'productId required' });
    await redis.hincrby(`cart:${userId}`, String(productId), Number(qty || 1));
    res.json({ success: true });
  });

  app.get('/cart', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const items = await redis.hgetall(`cart:${userId}`);
    res.json(items);
  });

  app.post('/cart/checkout', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const items = await redis.hgetall(`cart:${userId}`);
    let total = 0;
    for (const [pid, qty] of Object.entries(items)) {
      const client = await pool.connect();
      try {
        const r = await client.query('SELECT price FROM products WHERE id=$1', [pid]);
        if (r.rows.length) total += Number(r.rows[0].price) * Number(qty);
      } finally {
        client.release();
      }
    }
    const client = await pool.connect();
    try {
      const r = await client.query(
        'INSERT INTO orders (user_id, amount, status) VALUES ($1, $2, $3) RETURNING *',
        [userId, total, 'pending']
      );
      const order = r.rows[0];
      await producer.send({
        topic: 'mv100db.public.orders',
        messages: [{ key: String(order.id), value: JSON.stringify(order) }]
      });
      await redis.del(`cart:${userId}`);
      res.json({ orderId: order.id, amount: total });
    } finally {
      client.release();
    }
  });

  const port = process.env.PORT || 3002;
  app.listen(port, () => console.log(`Cart service listening on ${port}`));
}

start().catch(err => { console.error(err); process.exit(1); });
JS

cat > services/cart/Dockerfile <<'DOCK'
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 3002
CMD ["node", "index.js"]
DOCK

echo "Wrote services (auth, catalog, cart)"

##############################
# Frontend (static single page)
##############################
mkdir -p frontend
cat > frontend/Dockerfile <<'NGDOCK'
FROM nginx:stable-alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
NGDOCK

mkdir -p frontend/dist
cat > frontend/dist/index.html <<'HTML'
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shop Demo</title>
  <style>
    body{font-family:sans-serif;margin:20px}
    input{margin:4px}
    button{margin:4px}
    .product{border:1px solid #ddd;padding:8px;margin:6px}
  </style>
</head>
<body>
  <h1>Shop Demo</h1>

  <div id="auth">
    <h3>Signup</h3>
    <input id="su_email" placeholder="email" /> <input id="su_pass" placeholder="password" type="password" />
    <button onclick="signup()">Signup</button>

    <h3>Login</h3>
    <input id="li_email" placeholder="email" /> <input id="li_pass" placeholder="password" type="password" />
    <button onclick="login()">Login</button>
    <div id="who"></div>
  </div>

  <hr/>

  <div id="products">
    <h2>Products</h2>
    <div id="list"></div>
  </div>

  <hr/>

  <div id="cart">
    <h2>Your Cart</h2>
    <div id="cartItems"></div>
    <button onclick="checkout()">Checkout</button>
  </div>

<script>
const API_AUTH = 'http://localhost:3000';
const API_CATALOG = 'http://localhost:3001';
const API_CART = 'http://localhost:3002';
let token = localStorage.getItem('token') || null;

function setToken(t) { token = t; localStorage.setItem('token', t); updateWho(); }

function updateWho() {
  const el = document.getElementById('who');
  if (token) el.innerHTML = '<b>Logged in</b> <button onclick="logout()">Logout</button>';
  else el.innerHTML = '<i>Not logged</i>';
  fetchProducts();
  fetchCart();
}

async function signup(){
  const email = document.getElementById('su_email').value;
  const password = document.getElementById('su_pass').value;
  const res = await fetch(API_AUTH + '/signup', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password})});
  alert((await res.json()).success ? 'Signup ok' : 'Signup failed');
}

async function login(){
  const email = document.getElementById('li_email').value;
  const password = document.getElementById('li_pass').value;
  const res = await fetch(API_AUTH + '/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password})});
  const data = await res.json();
  if (data.token){ setToken(data.token); alert('Logged in'); }
  else alert('Login failed');
}

function logout(){ setToken(null); localStorage.removeItem('token'); token = null; updateWho(); }

async function fetchProducts(){
  const res = await fetch(API_CATALOG + '/products');
  const products = await res.json();
  const list = document.getElementById('list');
  list.innerHTML = '';
  products.forEach(p=>{
    const div = document.createElement('div');
    div.className='product';
    div.innerHTML = '<b>'+p.name+'</b> - $'+p.price+' <button onclick="addToCart('+p.id+')">Add to cart</button>';
    list.appendChild(div);
  });
}

async function addToCart(productId){
  if (!token) { alert('login first'); return; }
  await fetch(API_CART + '/cart/add', {
    method:'POST',
    headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify({ productId, qty: 1 })
  });
  alert('Added');
  fetchCart();
}

async function fetchCart(){
  const el = document.getElementById('cartItems');
  el.innerHTML = '';
  if (!token){ el.innerText = 'Login to see your cart'; return; }
  const res = await fetch(API_CART + '/cart', { headers: { 'Authorization': 'Bearer '+token }});
  const items = await res.json();
  if (!items || Object.keys(items).length===0) { el.innerText='Cart is empty'; return; }
  for (const k of Object.keys(items)) {
    const d = document.createElement('div');
    d.innerText = 'Product ' + k + ' — Qty: ' + items[k];
    el.appendChild(d);
  }
}

async function checkout(){
  if (!token){ alert('login first'); return; }
  const res = await fetch(API_CART + '/cart/checkout', { method: 'POST', headers: { 'Authorization': 'Bearer '+token }});
  const data = await res.json();
  alert('Checkout: ' + JSON.stringify(data));
  fetchCart();
}

updateWho();
</script>

</body>
</html>
HTML

echo "Wrote frontend static app"

##############################
# Dockerignore (optional)
##############################
cat > .dockerignore <<'IGN'
node_modules
npm-debug.log
IGN

##############################
# Build & Run (optional)
##############################
echo
echo "----------------------------------------------------------------"
echo "Scaffold created at: $ROOT"
echo
echo "Next steps (run these commands to build & bring up the stack):"
echo "  cd $ROOT"
echo "  docker compose build"
echo "  docker compose up -d"
echo
echo "After postgres is ready, register the Debezium connector:"
echo "  curl -X POST -H \"Content-Type: application/json\" --data @connect/connector.json http://localhost:8083/connectors"
echo
echo "Services:"
echo "  auth  -> http://localhost:3000"
echo "  catalog-> http://localhost:3001"
echo "  cart  -> http://localhost:3002"
echo "  kafka-ui -> http://localhost:8080"
echo "  pgadmin -> http://localhost:5050 (admin@admin.com / admin)"
echo "  frontend -> http://localhost:8081"
echo
echo "Tip: watch logs with: docker compose logs -f"
echo "----------------------------------------------------------------"
