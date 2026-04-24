import dotenv from "dotenv";

dotenv.config();

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: parseInt(process.env.PORT ?? "8083", 10),
  mongodbUri:
    process.env.MONGODB_URI ?? "mongodb://localhost:27017/movie_booking",
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://localhost:5672",
  userServiceUrl: process.env.USER_SERVICE_URL ?? "http://localhost:8081",
  movieServiceUrl: process.env.MOVIE_SERVICE_URL ?? "http://localhost:8082",
  upstreamTimeoutMs: parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? "5000", 10),
  corsOrigins: process.env.CORS_ORIGINS ?? "*",
};
