#!/bin/bash
set -e

# --- ORDERS SERVICE ---
mkdir -p services/orders
cat > services/orders/package.json <<'EOF'
{
  "name": "orders-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.19.2",
    "body-parser": "^1.20.2",
    "pg": "^8.11.5",
    "jsonwebtoken": "^9.0.2",
    "kafkajs": "^2.2.4"
  }
}
EOF

cat > services/orders/index.js <<'EOF'
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
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

const kafka = new Kafka({ clientId: 'orders-service', brokers: ['kafka:9092'] });
const producer = kafka.producer();

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function start() {
  await producer.connect();

  app.post('/orders', auth, async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });

    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO orders (user_id, amount, status) VALUES ($1,$2,$3) RETURNING *',
        [req.userId, amount, 'pending']
      );
      const order = result.rows[0];
      await producer.send({
        topic: 'mv100db.public.orders',
        messages: [{ key: String(order.id), value: JSON.stringify(order) }]
      });
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get('/orders', auth, async (req, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM orders WHERE user_id=$1', [req.userId]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  const port = process.env.PORT || 3003;
  app.listen(port, () => console.log(`Orders service listening on ${port}`));
}

start().catch(err => { console.error(err); process.exit(1); });
EOF

cat > services/orders/Dockerfile <<'EOF'
FROM node:18
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY . .
CMD ["npm", "start"]
EOF

# --- PAYMENTS SERVICE ---
mkdir -p services/payments
cat > services/payments/package.json <<'EOF'
{
  "name": "payments-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.19.2",
    "body-parser": "^1.20.2",
    "pg": "^8.11.5",
    "jsonwebtoken": "^9.0.2",
    "kafkajs": "^2.2.4"
  }
}
EOF

cat > services/payments/index.js <<'EOF'
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
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

const kafka = new Kafka({ clientId: 'payments-service', brokers: ['kafka:9092'] });
const producer = kafka.producer();

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function start() {
  await producer.connect();

  app.post('/payments', auth, async (req, res) => {
    const { orderId, amount } = req.body;
    if (!orderId || !amount) return res.status(400).json({ error: 'orderId+amount required' });

    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO payments (order_id, amount, status) VALUES ($1,$2,$3) RETURNING *',
        [orderId, amount, 'initiated']
      );
      const payment = result.rows[0];

      await producer.send({
        topic: 'mv100db.public.payments',
        messages: [{ key: String(payment.id), value: JSON.stringify(payment) }]
      });

      await client.query('UPDATE orders SET status=$1 WHERE id=$2', ['paid', orderId]);
      res.json(payment);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get('/payments', auth, async (req, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT p.* FROM payments p
         JOIN orders o ON p.order_id = o.id
         WHERE o.user_id=$1`,
        [req.userId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  const port = process.env.PORT || 3004;
  app.listen(port, () => console.log(`Payments service listening on ${port}`));
}

start().catch(err => { console.error(err); process.exit(1); });
EOF

cat > services/payments/Dockerfile <<'EOF'
FROM node:18
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY . .
CMD ["npm", "start"]
EOF

# --- Append to docker-compose.yml ---
cat >> docker-compose.yml <<'EOF'

  orders:
    build: ./services/orders
    container_name: orders
    ports:
      - "3003:3003"
    environment:
      - PGHOST=postgres
      - PGUSER=appuser
      - PGPASSWORD=appuser
      - PGDATABASE=mv100db
      - PGPORT=5432
      - JWT_SECRET=supersecretkey
    depends_on:
      - postgres
      - kafka

  payments:
    build: ./services/payments
    container_name: payments
    ports:
      - "3004:3004"
    environment:
      - PGHOST=postgres
      - PGUSER=appuser
      - PGPASSWORD=appuser
      - PGDATABASE=mv100db
      - PGPORT=5432
      - JWT_SECRET=supersecretkey
    depends_on:
      - postgres
      - kafka
EOF
