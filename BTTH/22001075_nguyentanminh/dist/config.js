"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
dotenv_1.default.config({ path: "src/services/.env" });
const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const toBoolean = (value, fallback) => {
    if (value === undefined) {
        return fallback;
    }
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};
exports.config = {
    port: toNumber(process.env.PORT, 8083),
    userServiceUrl: process.env.USER_SERVICE_URL || "http://10.62.245.189:8081",
    foodServiceUrl: process.env.FOOD_SERVICE_URL || "http://10.62.245.189:8082",
    upstreamTimeoutMs: toNumber(process.env.UPSTREAM_TIMEOUT_MS, 12000),
    independentMode: toBoolean(process.env.ORDER_INDEPENDENT_MODE, true),
    dbHost: process.env.DB_HOST || "10.62.245.189",
    dbPort: toNumber(process.env.DB_PORT, 3306),
    dbName: process.env.DB_NAME || "food_db",
    dbUser: process.env.DB_USER || "order_user",
    dbPassword: process.env.DB_PASSWORD || "",
    corsOrigins: process.env.CORS_ORIGINS || "*",
};
//# sourceMappingURL=config.js.map