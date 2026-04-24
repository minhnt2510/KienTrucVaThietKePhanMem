"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const db_1 = require("./db");
const rabbitmq_1 = require("./rabbitmq");
async function main() {
    console.log("🎬 Movie Booking Service - Event-Driven Architecture");
    console.log("─".repeat(50));
    // Connect to MongoDB (will use in-memory if fails)
    await (0, db_1.connectDatabase)();
    // Connect to RabbitMQ (will log only if fails)
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
    // Don't exit, try to continue
    process.exit(1);
});
//# sourceMappingURL=server.js.map