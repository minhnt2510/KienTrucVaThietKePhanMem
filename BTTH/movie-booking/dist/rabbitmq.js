"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENTS = void 0;
exports.connectRabbitMQ = connectRabbitMQ;
exports.publishEvent = publishEvent;
const amqplib_1 = __importDefault(require("amqplib"));
const config_1 = require("./config");
// Use any to avoid complex type issues with amqplib
let connection = null;
let channel = null;
exports.EVENTS = {
    BOOKING_CREATED: "BOOKING_CREATED",
    PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
    BOOKING_FAILED: "BOOKING_FAILED",
    USER_REGISTERED: "USER_REGISTERED",
};
async function connectRabbitMQ() {
    try {
        connection = await amqplib_1.default.connect(config_1.config.rabbitmqUrl);
        channel = await connection.createChannel();
        // Declare all required queues
        await channel.assertQueue(exports.EVENTS.BOOKING_CREATED, { durable: true });
        await channel.assertQueue(exports.EVENTS.PAYMENT_COMPLETED, { durable: true });
        await channel.assertQueue(exports.EVENTS.BOOKING_FAILED, { durable: true });
        console.log("✅ RabbitMQ connected successfully");
        // Handle connection close
        connection.on("close", () => {
            console.warn("⚠️  RabbitMQ connection closed");
            channel = null;
            connection = null;
        });
        connection.on("error", (err) => {
            console.error("❌ RabbitMQ connection error:", err);
        });
    }
    catch (error) {
        console.warn("⚠️  RabbitMQ connection failed (events will be logged only):", error);
    }
}
function publishEvent(eventName, payload) {
    if (channel) {
        channel.sendToQueue(eventName, Buffer.from(JSON.stringify(payload)), {
            persistent: true,
        });
        console.log(`📤 Event published: ${eventName}`, payload);
    }
    else {
        console.log(`📤 [NO RABBITMQ] Event: ${eventName}`, payload);
    }
}
//# sourceMappingURL=rabbitmq.js.map