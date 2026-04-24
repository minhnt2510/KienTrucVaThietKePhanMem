"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMovies = seedMovies;
const app_1 = require("./app");
const config_1 = require("./config");
const db_1 = require("./db");
const rabbitmq_1 = require("./rabbitmq");
async function main() {
    console.log("🎬 Movie Booking Service - Event-Driven Architecture");
    console.log("─".repeat(50));
    // Connect to MongoDB
    await (0, db_1.connectDatabase)();
    // Connect to RabbitMQ
    await (0, rabbitmq_1.connectRabbitMQ)();
    // Create and start Express app
    const app = (0, app_1.createApp)();
    app.listen(config_1.config.port, () => {
        console.log(`✅ Booking Service running on port ${config_1.config.port}`);
        console.log(`📡 USER_SERVICE_URL: ${config_1.config.userServiceUrl}`);
        console.log(`🎥 MOVIE_SERVICE_URL: ${config_1.config.movieServiceUrl}`);
        console.log(`🐰 RABBITMQ_URL: ${config_1.config.rabbitmqUrl}`);
    });
}
main().catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
});
// Seed data for testing (if needed)
async function seedMovies() {
    // This would be used by Movie Service, not here
}
//# sourceMappingURL=seed.js.map