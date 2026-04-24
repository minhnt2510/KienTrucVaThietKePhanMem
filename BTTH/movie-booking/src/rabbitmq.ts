import amqplib from "amqplib";
import { config } from "./config";

// Use any to avoid complex type issues with amqplib
let connection: any = null;
let channel: any = null;

export const EVENTS = {
  BOOKING_CREATED: "BOOKING_CREATED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  BOOKING_FAILED: "BOOKING_FAILED",
  USER_REGISTERED: "USER_REGISTERED",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();

    // Declare all required queues
    await channel.assertQueue(EVENTS.BOOKING_CREATED, { durable: true });
    await channel.assertQueue(EVENTS.PAYMENT_COMPLETED, { durable: true });
    await channel.assertQueue(EVENTS.BOOKING_FAILED, { durable: true });

    console.log("✅ RabbitMQ connected successfully");

    // Handle connection close
    connection.on("close", () => {
      console.warn("⚠️  RabbitMQ connection closed");
      channel = null;
      connection = null;
    });

    connection.on("error", (err: Error) => {
      console.error("❌ RabbitMQ connection error:", err);
    });
  } catch (error) {
    console.warn("⚠️  RabbitMQ connection failed (events will be logged only):", error);
  }
}

export function publishEvent(eventName: EventName, payload: object): void {
  if (channel) {
    channel.sendToQueue(eventName, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log(`📤 Event published: ${eventName}`, payload);
  } else {
    console.log(`📤 [NO RABBITMQ] Event: ${eventName}`, payload);
  }
}
