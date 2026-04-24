import { config } from "./config";
import { closePool, createItem, ensureSchema } from "./db";
import {
  closeRedis,
  connectRedis,
  deleteCacheKey,
  isRedisAvailable,
  popWriteTask,
} from "./redisClient";
import { WriteTask } from "./types";

const itemCacheKey = (id: number): string => `item:${id}`;

const processQueue = async (): Promise<void> => {
  console.log(`[worker] listening queue: ${config.writeQueueKey}`);

  while (true) {
    const taskRaw = await popWriteTask(config.writeQueueKey);
    if (!taskRaw) {
      continue;
    }

    try {
      const task = JSON.parse(taskRaw) as WriteTask;
      const newId = await createItem({
        name: task.name,
        description: task.description,
        price: task.price,
      });

      await deleteCacheKey(itemCacheKey(newId));
      console.log(`[worker] wrote item id=${newId}`);
    } catch (error) {
      console.error("[worker] failed to process task", error);
    }
  }
};

const start = async (): Promise<void> => {
  await ensureSchema();
  await connectRedis();

  if (!isRedisAvailable()) {
    throw new Error("Redis is required to run the worker");
  }

  await processQueue();
};

const shutdown = async (): Promise<void> => {
  await closeRedis();
  await closePool();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

start().catch((error) => {
  console.error("Worker failed to start", error);
  process.exit(1);
});
