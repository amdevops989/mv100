// require("dotenv").config();
// const express = require("express");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const { Pool } = require("pg");
// const jwt = require("jsonwebtoken");

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// // ✅ PostgreSQL connection
// const pool = new Pool({
//   user: process.env.PGUSER || "appuser",
//   host: process.env.PGHOST || "localhost",
//   database: process.env.PGDATABASE || "mv100db",
//   password: process.env.PGPASSWORD || "appuser",
//   port: process.env.PGPORT || 5432,
// });

// // ✅ JWT auth middleware
// const auth = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(401).json({ error: "No token" });
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
//     req.userId = decoded.userId;
//     next();
//   } catch (err) {
//     console.error("❌ Invalid token:", err.message);
//     return res.status(401).json({ error: "Invalid token" });
//   }
// };

// // ✅ Fetch orders for current user
// app.get("/orders", auth, async (req, res) => {
//   const client = await pool.connect();
//   try {
//     console.log(`📦 Fetching orders for userId: ${req.userId}`);
//     const result = await client.query(
//       "SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC",
//       [req.userId]
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error("❌ Error fetching orders:", err.message);
//     res.status(500).json({ error: err.message });
//   } finally {
//     client.release();
//   }
// });

// // ✅ Create new order
// app.post("/orders", auth, async (req, res) => {
//   const { amount } = req.body;
//   if (!amount) return res.status(400).json({ error: "Amount is required" });

//   const client = await pool.connect();
//   try {
//     const result = await client.query(
//       "INSERT INTO orders (user_id, amount, status) VALUES ($1, $2, 'pending') RETURNING *",
//       [req.userId, amount]
//     );
//     console.log(`🆕 New order created: #${result.rows[0].id} for user ${req.userId}`);
//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("❌ Error creating order:", err.message);
//     res.status(500).json({ error: err.message });
//   } finally {
//     client.release();
//   }
// });

// // ✅ Mark order as paid (Stripe webhook or frontend)
// // Fully CDC-ready: updates orders + inserts a payment row
// app.put("/orders/:id/paid", async (req, res) => {
//   const orderId = req.params.id;
//   const { paymentIntent } = req.body;

//   const client = await pool.connect();
//   try {
//     // 1️⃣ Update order status
//     const orderResult = await client.query(
//       "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
//       ["paid", orderId]
//     );

//     if (orderResult.rowCount === 0) {
//       console.warn(`⚠️ Order ${orderId} not found`);
//       return res.status(404).json({ error: "Order not found" });
//     }
//     const order = orderResult.rows[0];
//     console.log(`✅ Order #${order.id} marked as paid`);

//     // 2️⃣ Insert payment row (Debezium will capture this)
//     const paymentResult = await client.query(
//       "INSERT INTO payments (order_id, amount, status, payment_intent) VALUES ($1, $2, 'paid', $3) RETURNING *",
//       [order.id, order.amount, paymentIntent || null]
//     );

//     console.log(`💳 Payment recorded: #${paymentResult.rows[0].id} for order #${order.id}`);

//     res.json({ order, payment: paymentResult.rows[0] });
//   } catch (err) {
//     console.error("❌ Error processing payment:", err.message);
//     res.status(500).json({ error: err.message });
//   } finally {
//     client.release();
//   }
// });

// app.get("/", (_req, res) => res.send("📦 Orders service running ✅"));

// const PORT = process.env.PORT || 3003;
// app.listen(PORT, () => console.log(`📦 Orders service running on port ${PORT}`));


require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ PostgreSQL connection
const pool = new Pool({
  user: process.env.PGUSER || "appuser",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "mv100db",
  password: process.env.PGPASSWORD || "appuser",
  port: process.env.PGPORT || 5432,
});

// ✅ Utility: structured logger
function log(level, message, data = {}) {
  const logEntry = {
    service: "orders",
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.log(JSON.stringify(logEntry));
}

// ✅ JWT auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    log("warn", "Missing auth token", { path: req.path });
    return res.status(401).json({ error: "No token" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    req.userId = decoded.userId;
    next();
  } catch (err) {
    log("error", "Invalid JWT token", { error: err.message });
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ Fetch orders for current user
app.get("/orders", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    log("info", "Fetching user orders", { userId: req.userId });
    const result = await client.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC",
      [req.userId]
    );
    log("info", "Orders fetched successfully", {
      userId: req.userId,
      orderCount: result.rowCount,
    });
    res.json(result.rows);
  } catch (err) {
    log("error", "Error fetching orders", { error: err.message, userId: req.userId });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ✅ Create new order
app.post("/orders", auth, async (req, res) => {
  const { amount } = req.body;
  if (!amount) {
    log("warn", "Attempt to create order without amount", { userId: req.userId });
    return res.status(400).json({ error: "Amount is required" });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO orders (user_id, amount, status) VALUES ($1, $2, 'pending') RETURNING *",
      [req.userId, amount]
    );
    const order = result.rows[0];
    log("info", "Order created", {
      event: "order_created",
      orderId: order.id,
      userId: req.userId,
      amount: order.amount,
      status: order.status,
    });
    res.json(order);
  } catch (err) {
    log("error", "Error creating order", { error: err.message, userId: req.userId });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ✅ Mark order as paid
app.put("/orders/:id/paid", async (req, res) => {
  const orderId = req.params.id;
  const { paymentIntent } = req.body;
  const client = await pool.connect();

  try {
    const orderResult = await client.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
      ["paid", orderId]
    );

    if (orderResult.rowCount === 0) {
      log("warn", "Order not found for payment", { event: "order_not_found", orderId });
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];
    log("info", "Order marked as paid", {
      event: "order_paid",
      orderId: order.id,
      status: order.status,
      amount: order.amount,
    });

    const paymentResult = await client.query(
      "INSERT INTO payments (order_id, amount, status, payment_intent) VALUES ($1, $2, 'paid', $3) RETURNING *",
      [order.id, order.amount, paymentIntent || null]
    );

    const payment = paymentResult.rows[0];
    log("info", "Payment recorded", {
      event: "payment_recorded",
      paymentId: payment.id,
      orderId: order.id,
      amount: payment.amount,
      status: payment.status,
    });

    res.json({ order, payment });
  } catch (err) {
    log("error", "Error marking order as paid", { error: err.message, orderId });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ✅ Health check
app.get("/", (_req, res) => res.send("📦 Orders service running ✅"));

const PORT = process.env.PORT || 3003;
app.listen(PORT, () =>
  log("info", "Orders service started", { event: "service_start", port: PORT })
);
