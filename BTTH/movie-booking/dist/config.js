"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT ?? "8083", 10),
    mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/movie_booking",
    rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://localhost:5672",
    userServiceUrl: process.env.USER_SERVICE_URL ?? "http://localhost:8081",
    movieServiceUrl: process.env.MOVIE_SERVICE_URL ?? "http://localhost:8082",
    upstreamTimeoutMs: parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? "5000", 10),
    corsOrigins: process.env.CORS_ORIGINS ?? "*",
};
//# sourceMappingURL=config.js.map