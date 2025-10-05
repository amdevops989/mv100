const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // <-- added
const { Pool } = require('pg');
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

const kafka = new Kafka({ clientId: 'catalog-service', brokers: ['localhost:9094'] });
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

start().catch(err => {
  console.error(err);
  process.exit(1);
});
