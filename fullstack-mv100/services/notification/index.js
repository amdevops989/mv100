import express from "express";
import cors from "cors";
import { Kafka } from "kafkajs";

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 Kafka Setup
const kafka = new Kafka({
  clientId: "notification-service",
  brokers: ["localhost:9094"],
});

const consumer = kafka.consumer({ groupId: "notification-group" });

// 💡 Simulate sending email by logging it
async function sendNotification(eventType, payload) {
  const { userEmail, orderId, amount } = payload;
  switch (eventType) {
    case "payment_completed":
      console.log(
        `📧 [Notification Service] Email sent to ${userEmail}: "Your payment of $${amount} for order ${orderId} was successful!"`
      );
      break;
    case "order_created":
      console.log(
        `📧 [Notification Service] Email sent to ${userEmail}: "Your order ${orderId} has been created successfully!"`
      );
      break;
    default:
      console.log(`[Notification Service] Unknown event ${eventType}`);
  }
}

// 🔄 Kafka Consumer Logic
async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: "order_created", fromBeginning: false });
  await consumer.subscribe({ topic: "payment_completed", fromBeginning: false });

  console.log("📡 Notification Service listening for Kafka events...");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payload = JSON.parse(message.value.toString());
      await sendNotification(topic, payload);
    },
  });
}

run().catch(console.error);

// 🩵 Simple Healthcheck
app.get("/", (req, res) => {
  res.send("✅ Notification Service is running");
});

app.listen(3005, () => console.log("🚀 Notification Service on port 3005"));
