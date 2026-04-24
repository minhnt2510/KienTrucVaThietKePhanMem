import { createApp } from "./app";
import { config } from "./config";
import { connectDatabase } from "./db";
import { connectRabbitMQ } from "./rabbitmq";

async function main() {
  console.log("🎬 Movie Booking Service - Event-Driven Architecture");
  console.log("─".repeat(50));

  // Connect to MongoDB
  await connectDatabase();

  // Connect to RabbitMQ
  await connectRabbitMQ();

  // Create and start Express app
  const app = createApp();

  app.listen(config.port, () => {
    console.log(`✅ Booking Service running on port ${config.port}`);
    console.log(`📡 USER_SERVICE_URL: ${config.userServiceUrl}`);
    console.log(`🎥 MOVIE_SERVICE_URL: ${config.movieServiceUrl}`);
    console.log(`🐰 RABBITMQ_URL: ${config.rabbitmqUrl}`);
  });
}

main().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

// Seed data for testing (if needed)
export async function seedMovies() {
  // This would be used by Movie Service, not here
}
