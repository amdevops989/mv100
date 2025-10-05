const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const { Kafka } = require("kafkajs");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const pool = new Pool({
  user: process.env.PGUSER || "appuser",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "mv100db",
  password: process.env.PGPASSWORD || "appuser",
  port: process.env.PGPORT || 5432,
});

const kafka = new Kafka({
  clientId: "payments-service",
  brokers: ["localhost:9094"], // or "kafka:9092" if in Docker
});
const producer = kafka.producer();

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function start() {
  await producer.connect();

  app.post("/payments", auth, async (req, res) => {
    const { orderId, amount } = req.body;
    if (!orderId || !amount)
      return res.status(400).json({ error: "orderId + amount required" });

    const client = await pool.connect();
    try {
      // 1️⃣ Create payment record
      const result = await client.query(
        "INSERT INTO payments (order_id, amount, status) VALUES ($1,$2,$3) RETURNING *",
        [orderId, amount, "initiated"]
      );
      const payment = result.rows[0];

      // 2️⃣ Mark order as paid
      await client.query("UPDATE orders SET status=$1 WHERE id=$2", ["paid", orderId]);

      // 3️⃣ Fetch user email for notification
      const userResult = await client.query(
        `SELECT u.email FROM users u
         JOIN orders o ON u.id = o.user_id
         WHERE o.id = $1`,
        [orderId]
      );
      const userEmail = userResult.rows[0]?.email || "unknown@user.com";

      // 4️⃣ Emit Kafka event (this was missing / misplaced)
      await producer.send({
        topic: "payment_completed",
        messages: [
          {
            value: JSON.stringify({
              userEmail,
              orderId,
              amount,
              paymentId: payment.id,
              status: "completed",
            }),
          },
        ],
      });
      console.log("💸 Payment event emitted to Kafka:", { userEmail, orderId, amount });

      res.json(payment);
    } catch (err) {
      console.error("Payment failed:", err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get("/payments", auth, async (req, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT p.* FROM payments p
         JOIN orders o ON p.order_id = o.id
         WHERE o.user_id=$1`,
        [req.userId]
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  });

  const port = process.env.PORT || 3004;
  app.listen(port, () => console.log(`💰 Payments service listening on ${port}`));
}

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
