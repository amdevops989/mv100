require('dotenv').config();
const { Kafka, logLevel } = require('kafkajs');
const pino = require('pino');

let chalk;
import('chalk').then((module) => {
  chalk = module.default;
  start();
});

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ✅ Kafka setup
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9094').split(','),
  logLevel: logLevel.NOTHING,
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

// Simulated "send email" function
async function sendMailSimulated(to, subject, html) {
  console.log(chalk.blue(`\n📧 [Simulated Email]`));
  console.log(chalk.white(`To: ${to}`));
  console.log(chalk.white(`Subject: ${subject}`));
  console.log(chalk.gray(`----------------------------------------`));
  console.log(chalk.white(html));
  console.log(chalk.gray(`----------------------------------------\n`));
}

async function start() {
  try {
    await consumer.connect();
    console.log(chalk.cyan('🔌 Notification consumer connected to Kafka\n'));

    await consumer.subscribe({ topic: 'mv100db.public.users', fromBeginning: true });
    await consumer.subscribe({ topic: 'mv100db.public.orders', fromBeginning: true });
    await consumer.subscribe({ topic: 'mv100db.public.payments', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const key = message.key?.toString();
        const value = JSON.parse(message.value.toString());
        const op = value.op;
        const after = value.after;

        console.log(chalk.gray(`\n📦 [${topic}] Event received`));
        console.log(chalk.gray('----------------------------------------'));

        // Handle Users
        if (topic.includes('users') && op === 'c') {
          console.log(chalk.green.bold(`👤 New User Created:`), chalk.white(after.email));
        }

        // Handle Orders
        else if (topic.includes('orders') && op === 'c') {
          console.log(chalk.yellow.bold(`🛒 New Order Created:`), chalk.white(`#${after.id} (${after.status})`));

          await sendMailSimulated(
            after.email || 'customer@example.com',
            `Your order #${after.id} has been received!`,
            `
              <h2>🛍️ Thank you for your order!</h2>
              <p>Your order <strong>#${after.id}</strong> totaling <strong>${after.amount} USD</strong> has been received.</p>
              <p>Status: <strong>${after.status}</strong></p>
              <p>We’ll notify you when payment is completed.</p>
              <br/>
              <small>MV100 Store</small>
            `
          );
        }

        // Handle Payments
        else if (topic.includes('payments') && op === 'c') {
          console.log(chalk.blue.bold(`💳 Payment Recorded:`), chalk.white(`Order #${after.order_id} (Amount: ${after.amount})`));

          await sendMailSimulated(
            after.email || 'customer@example.com',
            `Payment received for your order #${after.order_id}`,
            `
              <h2>💳 Payment Confirmation</h2>
              <p>Your payment for order <strong>#${after.order_id}</strong> of <strong>${after.amount} USD</strong> has been successfully processed.</p>
              <p>Status: <strong>${after.status}</strong></p>
              <br/>
              <small>MV100 Store</small>
            `
          );
        }

        // Handle Updates (optional)
        else if (topic.includes('orders') && op === 'u') {
          console.log(chalk.magenta.bold(`🔄 Order Updated:`), chalk.white(`#${after.id} → ${after.status}`));
        }

        // Fallback
        else {
          console.log(chalk.gray(`⚙️ Unhandled event. op=${op || 'unknown'}`));
        }

        logger.info({ topic, key, op, after }, '✅ Event processed');
      },
    });
  } catch (err) {
    console.error(chalk.red('❌ Notification service failed:'), err.message);
    logger.error({ err }, '❌ Notification service failed');
    process.exit(1);
  }
}
