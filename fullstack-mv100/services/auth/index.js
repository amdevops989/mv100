const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // <-- added
const { Pool } = require('pg');
const Redis = require('ioredis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Kafka } = require('kafkajs');

const app = express();

app.use(cors()); // <-- enable CORS for all routes
app.use(bodyParser.json());

const pool = new Pool({
  user: process.env.PGUSER || 'appuser',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'mv100db',
  password: process.env.PGPASSWORD || 'appuser',
  port: process.env.PGPORT || 5432,
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const kafka = new Kafka({ clientId: 'auth-service', brokers: ['localhost:9094'] });
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
