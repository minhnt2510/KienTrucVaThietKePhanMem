import { createClient, RedisClientType } from "redis";
import { config } from "./config";

export const redisClient: RedisClientType = createClient({
  url: config.redisUrl,
});

redisClient.on("error", (error) => {
  console.error("[redis] error", error);
});

export const connectRedis = async (): Promise<void> => {
  if (!config.redisEnabled || redisClient.isOpen) {
    return;
  }

  try {
    await redisClient.connect();
    console.log("[redis] connected");
  } catch (error) {
    console.error("[redis] connection failed, fallback to DB-only mode", error);
  }
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};

export const isRedisAvailable = (): boolean => {
  return config.redisEnabled && redisClient.isReady;
};

export const getCacheJSON = async <T>(key: string): Promise<T | null> => {
  if (!isRedisAvailable()) {
    return null;
  }

  const value = await redisClient.get(key);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const setCacheJSON = async (
  key: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> => {
  if (!isRedisAvailable()) {
    return;
  }

  await redisClient.set(key, JSON.stringify(payload), {
    EX: ttlSeconds,
  });
};

export const deleteCacheKey = async (key: string): Promise<void> => {
  if (!isRedisAvailable()) {
    return;
  }

  await redisClient.del(key);
};

export const enqueueWriteTask = async (
  queueKey: string,
  task: unknown,
): Promise<number> => {
  if (!isRedisAvailable()) {
    throw new Error("Redis is not available");
  }

  return redisClient.lPush(queueKey, JSON.stringify(task));
};

export const popWriteTask = async (
  queueKey: string,
): Promise<string | null> => {
  if (!isRedisAvailable()) {
    return null;
  }

  const result = await redisClient.brPop(queueKey, 0);
  return result?.element ?? null;
};

export const getQueueLength = async (queueKey: string): Promise<number> => {
  if (!isRedisAvailable()) {
    return 0;
  }

  return redisClient.lLen(queueKey);
};
