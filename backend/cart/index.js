require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Redis = require('ioredis');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const jwt = require('jsonwebtoken');

const app = express();

/* ---------------------- 🧩 CORS Setup ---------------------- */
// const allowedOrigins = process.env.CORS_ORIGIN
//   ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
//   : ['http://localhost:5173']; // fallback for local dev (Vite default port)

// app.use(cors({
//   origin: (origin, callback) => {
//     // allow requests with no origin (like curl, postman)
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       console.warn(`❌ CORS blocked for origin: ${origin}`);
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
// }));

const corsOptions = {
  origin: 'https://frontend.localdev.me', // exact URL of your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // required if using cookies or auth headers
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight support
app.use(bodyParser.json());

/* ---------------------- 🔗 Redis ---------------------- */
const redis = new Redis(process.env.REDIS_URL);

/* ---------------------- 🐘 PostgreSQL ---------------------- */
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

/* ---------------------- 🦋 Kafka ---------------------- */
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: process.env.KAFKA_BROKERS.split(','),
});
const producer = kafka.producer();

/* ---------------------- 🔑 Auth Middleware ---------------------- */
function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/* ---------------------- 🚀 App Start ---------------------- */
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

    const client = await pool.connect();
    try {
      for (const [pid, qty] of Object.entries(items)) {
        const r = await client.query('SELECT price FROM products WHERE id=$1', [pid]);
        if (r.rows.length) total += Number(r.rows[0].price) * Number(qty);
      }

      const r = await client.query(
        'INSERT INTO orders (user_id, amount, status) VALUES ($1, $2, $3) RETURNING *',
        [userId, total, 'pending']
      );
      const order = r.rows[0];
      await producer.send({
        topic: process.env.KAFKA_TOPIC,
        messages: [{ key: String(order.id), value: JSON.stringify(order) }],
      });
      await redis.del(`cart:${userId}`);
      res.json({ orderId: order.id, amount: total });
    } finally {
      client.release();
    }
  });

  const port = process.env.PORT || 3002;
  app.listen(port, () => console.log(`Cart service listening on port ${port}`));
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
