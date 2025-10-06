// payments/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const Stripe = require("stripe");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Stripe instance
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// For webhooks, we need raw body parsing
app.use(
  "/payments/webhook",
  bodyParser.raw({ type: "application/json" })
);

// JWT Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// ✅ Create Stripe Checkout Session
app.post("/payments/create-checkout-session", verifyToken, async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount)
      return res.status(400).json({ error: "Missing orderId or amount" });

    // Create a Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Order #${orderId}` },
            unit_amount: Math.round(amount * 100), // Convert $ to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:5173/orders",
      metadata: {
        orderId,
        userId: req.user.id,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Stripe Webhook for payment success/failure
app.post("/payments/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    console.log(`✅ Payment successful for order ${orderId}`);

    // Notify your Orders service to mark the order as paid
    try {
      await axios.put(`http://localhost:3003/orders/${orderId}/paid`, {
        paymentIntent: session.payment_intent,
      });
    } catch (err) {
      console.error("Failed to update order status:", err.message);
    }
  }

  res.json({ received: true });
});

app.get("/", (req, res) => res.send("Stripe Payments Service Running ✅"));

app.listen(3004, () => console.log("💳 Payments service running on port 3004"));
