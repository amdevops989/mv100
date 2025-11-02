const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('ioredis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Kafka, logLevel } = require('kafkajs');
const morgan = require('morgan'); // <-- logging middleware
const pino = require('pino');

// Structured logger
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();

// Middleware
const corsOptions = {
  origin: 'https://frontend.localdev.me', // must match exactly
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true, // allow cookies / auth headers
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight support

app.use(bodyParser.json());
app.use(morgan('dev'));

// PostgreSQL connection
const pool = new Pool({
  user: process.env.PGUSER || 'appuser',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'mv100db',
  password: process.env.PGPASSWORD || 'appuser',
  port: process.env.PGPORT || 5432,
});

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Kafka setup
const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9094').split(','),
  logLevel: logLevel.INFO,
});
const producer = kafka.producer();

// Helper: Publish user CDC message
async function publishUserEvent(eventType, user) {
  try {
    await producer.send({
      topic: 'mv100db.public.users',
      messages: [
        {
          key: String(user.id),
          value: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            payload: { id: user.id, email: user.email },
          }),
        },
      ],
    });
    logger.info({ userId: user.id, eventType }, 'User event published');
  } catch (err) {
    logger.error({ err }, 'Failed to publish user event');
  }
}

async function start() {
  await producer.connect();
  logger.info('✅ Kafka producer connected');

  app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();

    try {
      const result = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, hash]
      );
      const user = result.rows[0];
      await publishUserEvent('USER_CREATED', user);
      res.json({ success: true, id: user.id, email: user.email });
    } catch (err) {
      logger.error({ err }, 'Signup failed');
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
      if (!result.rows.length) {
        logger.warn({ email }, 'Invalid email login attempt');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        logger.warn({ email }, 'Invalid password login attempt');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'supersecretkey',
        { expiresIn: '2h' }
      );

      await redis.set(`session:${user.id}`, token, 'EX', 60 * 60 * 2);
      logger.info({ userId: user.id }, 'User logged in');
      res.json({ token });
    } catch (err) {
      logger.error({ err }, 'Login failed');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get('/health', async (_, res) => {
    res.json({ status: 'ok', service: 'auth-service', time: new Date().toISOString() });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => logger.info(`🚀 Auth service running on port ${port}`));
}

start().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
