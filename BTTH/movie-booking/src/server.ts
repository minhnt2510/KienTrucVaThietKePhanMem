import { createApp } from "./app";
import { config } from "./config";
import { connectDatabase } from "./db";
import { connectRabbitMQ } from "./rabbitmq";

async function main() {
  console.log("🎬 Movie Booking Service - Event-Driven Architecture");
  console.log("─".repeat(50));

  // Connect to MongoDB (will use in-memory if fails)
  await connectDatabase();

  // Connect to RabbitMQ (will log only if fails)
  await connectRabbitMQ();

  // Create and start Express app
  const app = createApp();

  app.listen(config.port, config.host, () => {
    console.log(`✅ Booking Service running on port ${config.port}`);
    console.log(`🌐 Booking Service URL: http://10.62.245.226:${config.port}`);
    console.log(`📡 USER_SERVICE_URL: ${config.userServiceUrl}`);
    console.log(`🎥 MOVIE_SERVICE_URL: ${config.movieServiceUrl}`);
    console.log(`🐰 RABBITMQ_URL: ${config.rabbitmqUrl}`);
  });
}

main().catch((error) => {
  console.error("❌ Failed to start server:", error);
  // Don't exit, try to continue
  process.exit(1);
});
