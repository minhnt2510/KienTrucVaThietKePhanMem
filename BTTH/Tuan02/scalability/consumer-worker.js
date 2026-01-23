const amqp = require('amqplib');
const Redis = require('ioredis');

// Configuration
const WORKER_ID = process.env.WORKER_ID || '1';
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const QUEUE_NAME = 'order_processing_queue';

// Redis client
const redis = new Redis({
  host: REDIS_HOST,
  port: 6379
});

redis.on('connect', () => {
  console.log(`✓ Redis connected (Worker ${WORKER_ID})`);
});

// Process order event
async function processOrder(message) {
  const order = JSON.parse(message.content.toString());
  
  console.log(`\n┌─────────────────────────────────────────────────────────────┐`);
  console.log(`│ 🔄 Processing Order (Worker ${WORKER_ID})`);
  console.log(`└─────────────────────────────────────────────────────────────┘`);
  console.log(`  Order ID: ${order.orderId}`);
  console.log(`  Product: ${order.product}`);
  console.log(`  Quantity: ${order.quantity}`);
  console.log(`  Total: $${order.grandTotal}`);
  
  // Simulate processing steps
  const steps = [
    { name: 'Validating order', delay: 500 },
    { name: 'Checking inventory', delay: 300 },
    { name: 'Processing payment', delay: 800 },
    { name: 'Generating invoice', delay: 400 },
    { name: 'Sending confirmation', delay: 300 }
  ];

  for (const step of steps) {
    console.log(`  ⏳ ${step.name}...`);
    await new Promise(resolve => setTimeout(resolve, step.delay));
    console.log(`  ✓ ${step.name} completed`);
  }

  // Update order status in cache
  order.status = 'completed';
  order.completedAt = new Date().toISOString();
  order.processedBy = `Worker ${WORKER_ID}`;

  await redis.setex(
    `order:${order.orderId}`,
    3600,
    JSON.stringify(order)
  );

  console.log(`\n  ✅ Order ${order.orderId} completed by Worker ${WORKER_ID}`);
  console.log(`  ⏱️  Processing time: ${(steps.reduce((sum, s) => sum + s.delay, 0) / 1000).toFixed(1)}s`);
  console.log(`─────────────────────────────────────────────────────────────\n`);
}

// Consume messages from queue
async function startWorker() {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(`amqp://${RABBITMQ_HOST}`);
    const channel = await connection.createChannel();

    // Assert queue
    await channel.assertQueue(QUEUE_NAME, {
      durable: true
    });

    // Set prefetch to 1 (process one message at a time)
    channel.prefetch(1);

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  👷 Consumer Worker ${WORKER_ID} - SCALABILITY DEMO              
╚════════════════════════════════════════════════════════════════╝

📍 Worker ID: ${WORKER_ID}
🐰 RabbitMQ: ${RABBITMQ_HOST}
📨 Queue: ${QUEUE_NAME}
💾 Redis: ${REDIS_HOST}

✓ Worker is ready to process orders...
Waiting for messages...
    `);

    // Consume messages
    channel.consume(QUEUE_NAME, async (message) => {
      if (message !== null) {
        try {
          await processOrder(message);
          channel.ack(message);
        } catch (error) {
          console.error(`❌ Error processing message:`, error.message);
          // Reject and requeue
          channel.nack(message, false, true);
        }
      }
    });

    // Handle connection close
    connection.on('close', () => {
      console.log('❌ RabbitMQ connection closed, reconnecting in 5s...');
      setTimeout(startWorker, 5000);
    });

  } catch (error) {
    console.error('❌ Failed to start worker:', error.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(startWorker, 5000);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

// Start the worker
startWorker();
