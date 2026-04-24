"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inMemoryBookings = void 0;
exports.connectDatabase = connectDatabase;
exports.isInMemoryMode = isInMemoryMode;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
// In-memory fallback storage
exports.inMemoryBookings = new Map();
let useInMemory = false;
async function connectDatabase() {
    try {
        await mongoose_1.default.connect(config_1.config.mongodbUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });
        console.log("✅ MongoDB connected successfully");
        useInMemory = false;
    }
    catch (error) {
        console.warn("⚠️  MongoDB connection failed, using in-memory storage");
        console.log("💾 In-memory storage active (data will not persist)");
        useInMemory = true;
    }
}
function isInMemoryMode() {
    return useInMemory;
}
// Disable auto-reconnect to avoid repeated errors
mongoose_1.default.connection.on("disconnected", () => {
    console.log("⚠️  MongoDB disconnected");
    useInMemory = true;
});
mongoose_1.default.connection.on("error", () => {
    // Suppress repeated errors in console
});
//# sourceMappingURL=db.js.map