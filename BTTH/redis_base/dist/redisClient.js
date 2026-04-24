"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueLength = exports.popWriteTask = exports.enqueueWriteTask = exports.deleteCacheKey = exports.setCacheJSON = exports.getCacheJSON = exports.isRedisAvailable = exports.closeRedis = exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const config_1 = require("./config");
exports.redisClient = (0, redis_1.createClient)({
    url: config_1.config.redisUrl,
});
exports.redisClient.on("error", (error) => {
    console.error("[redis] error", error);
});
const connectRedis = async () => {
    if (!config_1.config.redisEnabled || exports.redisClient.isOpen) {
        return;
    }
    try {
        await exports.redisClient.connect();
        console.log("[redis] connected");
    }
    catch (error) {
        console.error("[redis] connection failed, fallback to DB-only mode", error);
    }
};
exports.connectRedis = connectRedis;
const closeRedis = async () => {
    if (exports.redisClient.isOpen) {
        await exports.redisClient.quit();
    }
};
exports.closeRedis = closeRedis;
const isRedisAvailable = () => {
    return config_1.config.redisEnabled && exports.redisClient.isReady;
};
exports.isRedisAvailable = isRedisAvailable;
const getCacheJSON = async (key) => {
    if (!(0, exports.isRedisAvailable)()) {
        return null;
    }
    const value = await exports.redisClient.get(key);
    if (!value) {
        return null;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
};
exports.getCacheJSON = getCacheJSON;
const setCacheJSON = async (key, payload, ttlSeconds) => {
    if (!(0, exports.isRedisAvailable)()) {
        return;
    }
    await exports.redisClient.set(key, JSON.stringify(payload), {
        EX: ttlSeconds,
    });
};
exports.setCacheJSON = setCacheJSON;
const deleteCacheKey = async (key) => {
    if (!(0, exports.isRedisAvailable)()) {
        return;
    }
    await exports.redisClient.del(key);
};
exports.deleteCacheKey = deleteCacheKey;
const enqueueWriteTask = async (queueKey, task) => {
    if (!(0, exports.isRedisAvailable)()) {
        throw new Error("Redis is not available");
    }
    return exports.redisClient.lPush(queueKey, JSON.stringify(task));
};
exports.enqueueWriteTask = enqueueWriteTask;
const popWriteTask = async (queueKey) => {
    if (!(0, exports.isRedisAvailable)()) {
        return null;
    }
    const result = await exports.redisClient.brPop(queueKey, 0);
    return result?.element ?? null;
};
exports.popWriteTask = popWriteTask;
const getQueueLength = async (queueKey) => {
    if (!(0, exports.isRedisAvailable)()) {
        return 0;
    }
    return exports.redisClient.lLen(queueKey);
};
exports.getQueueLength = getQueueLength;
