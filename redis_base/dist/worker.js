"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const db_1 = require("./db");
const redisClient_1 = require("./redisClient");
const itemCacheKey = (id) => `item:${id}`;
const processQueue = async () => {
    console.log(`[worker] listening queue: ${config_1.config.writeQueueKey}`);
    while (true) {
        const taskRaw = await (0, redisClient_1.popWriteTask)(config_1.config.writeQueueKey);
        if (!taskRaw) {
            continue;
        }
        try {
            const task = JSON.parse(taskRaw);
            const newId = await (0, db_1.createItem)({
                name: task.name,
                description: task.description,
                price: task.price,
            });
            await (0, redisClient_1.deleteCacheKey)(itemCacheKey(newId));
            console.log(`[worker] wrote item id=${newId}`);
        }
        catch (error) {
            console.error("[worker] failed to process task", error);
        }
    }
};
const start = async () => {
    await (0, db_1.ensureSchema)();
    await (0, redisClient_1.connectRedis)();
    if (!(0, redisClient_1.isRedisAvailable)()) {
        throw new Error("Redis is required to run the worker");
    }
    await processQueue();
};
const shutdown = async () => {
    await (0, redisClient_1.closeRedis)();
    await (0, db_1.closePool)();
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
