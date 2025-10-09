require('dotenv').config(); // <-- Load environment variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Kafka, logLevel } = require('kafkajs');
const pino = require('pino');
const morgan = require('morgan');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

// Redis
const redis = new Redis(process.env.REDIS_URL);

// Kafka
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'catalog-service',
  brokers: process.env.KAFKA_BROKERS.split(','),
  logLevel: logLevel.INFO,
});
const producer = kafka.producer();

async function publishProductEvent(eventType, product) {
  try {
    await producer.send({
      topic: process.env.KAFKA_TOPIC_PRODUCTS,
      messages: [
        {
          key: String(product.id),
          value: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            payload: product,
          }),
        },
      ],
    });
    logger.info({ productId: product.id, eventType }, 'Product event published');
  } catch (err) {
    logger.error({ err }, 'Failed to publish product event');
  }
}

async function start() {
  await producer.connect();
  logger.info('✅ Kafka producer connected');

  // Create product
  app.post('/products', async (req, res) => {
    const { name, description, price, image_url } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'name and price are required' });

    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO products (name, description, price, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description || null, price, image_url || null]
      );
      const product = result.rows[0];
      await publishProductEvent('PRODUCT_CREATED', product);
      await redis.del('products:all');
      res.json({ success: true, product });
    } catch (err) {
      logger.error({ err }, 'Create product failed');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Get all products
  app.get('/products', async (req, res) => {
    try {
      const cache = await redis.get('products:all');
      if (cache) {
        logger.info('📦 Cache hit for /products');
        return res.json(JSON.parse(cache));
      }

      const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
      await redis.set('products:all', JSON.stringify(result.rows), 'EX', 60);
      res.json(result.rows);
    } catch (err) {
      logger.error({ err }, 'Fetch products failed');
      res.status(500).json({ error: err.message });
    }
  });

  // Get one product
  app.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error({ err }, 'Fetch product failed');
      res.status(500).json({ error: err.message });
    }
  });

  // Update product
  app.put('/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, image_url } = req.body;
    const client = await pool.connect();

    try {
      const result = await client.query(
        'UPDATE products SET name=$1, description=$2, price=$3, image_url=$4 WHERE id=$5 RETURNING *',
        [name, description, price, image_url, id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
      const product = result.rows[0];
      await publishProductEvent('PRODUCT_UPDATED', product);
      await redis.del('products:all');
      res.json(product);
    } catch (err) {
      logger.error({ err }, 'Update product failed');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Delete product
  app.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      const result = await client.query('DELETE FROM products WHERE id=$1 RETURNING *', [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
      const product = result.rows[0];
      await publishProductEvent('PRODUCT_DELETED', product);
      await redis.del('products:all');
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, 'Delete product failed');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Health check
  app.get('/health', (_, res) => {
    res.json({ status: 'ok', service: 'catalog-service', time: new Date().toISOString() });
  });

  const port = process.env.PORT || 3001;
  app.listen(port, () => logger.info(`🚀 Catalog service running on port ${port}`));
}

start().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
