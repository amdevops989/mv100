const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { Kafka } = require('kafkajs');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // <-- Enable CORS

const pool = new Pool({
  user: process.env.PGUSER || 'appuser',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'mv100db',
  password: process.env.PGPASSWORD || 'appuser',
  port: process.env.PGPORT || 5432,
});

const kafka = new Kafka({ clientId: 'orders-service', brokers: ['localhost:9094'] });
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
    } finally {
      client.release();
    }
  });

  app.get('/orders', auth, async (req, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM orders WHERE user_id=$1', [req.userId]);
      res.json(result.rows);
    } finally {
      client.release();
    }
  });

  const port = process.env.PORT || 3003;
  app.listen(port, () => console.log(`Orders service listening on ${port}`));
}

start().catch(err => { console.error(err); process.exit(1); });
