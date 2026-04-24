import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

export const config = {
  port: toNumber(process.env.PORT, 3000),
  dbHost: process.env.DB_HOST ?? "127.0.0.1",
  dbPort: toNumber(process.env.DB_PORT, 3306),
  dbUser: process.env.DB_USER ?? "root",
  dbPassword: process.env.DB_PASSWORD ?? "root",
  dbName: process.env.DB_NAME ?? "benchdb",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6380",
  redisEnabled: toBoolean(process.env.REDIS_ENABLED, true),
  redisTtlSeconds: toNumber(process.env.REDIS_TTL_SECONDS, 120),
  writeQueueKey: process.env.WRITE_QUEUE_KEY ?? "write_queue",
} as const;
