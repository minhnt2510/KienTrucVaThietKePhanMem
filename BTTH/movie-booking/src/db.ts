import mongoose from "mongoose";
import { config } from "./config";

// In-memory fallback storage
export const inMemoryBookings: Map<string, any> = new Map();
let useInMemory = false;

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log("✅ MongoDB connected successfully");
    useInMemory = false;
  } catch (error) {
    console.warn("⚠️  MongoDB connection failed, using in-memory storage");
    console.log("💾 In-memory storage active (data will not persist)");
    useInMemory = true;
  }
}

export function isInMemoryMode(): boolean {
  return useInMemory;
}

// Disable auto-reconnect to avoid repeated errors
mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected");
  useInMemory = true;
});

mongoose.connection.on("error", () => {
  // Suppress repeated errors in console
});
