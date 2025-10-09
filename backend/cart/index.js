const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // <-- added
const Redis = require('ioredis');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors()); // <-- enable CORS globally
app.use(bodyParser.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const pool = new Pool({
  user: process.env.PGUSER || 'appuser',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'mv100db',
  password: process.env.PGPASSWORD || 'appuser',
  port: process.env.PGPORT || 5432,
});

const kafka = new Kafka({ clientId: 'cart-service', brokers: ['localhost:9094'] });
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
