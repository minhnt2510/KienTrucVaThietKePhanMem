"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const db_1 = require("./db");
const redisClient_1 = require("./redisClient");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const asyncRoute = (handler) => (req, res, next) => {
    void handler(req, res).catch(next);
};
const itemCacheKey = (id) => `item:${id}`;
const listCacheKey = (limit) => `items:list:${limit}`;
const parsePositiveInt = (value) => {
    if (!value) {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};
const parseIntInRange = (value, fallback, min, max) => {
    const parsed = Number(value ?? fallback);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        return null;
    }
    return parsed;
};
const parseItemInput = (payload) => {
    if (!payload || typeof payload !== "object") {
        return null;
    }
    const body = payload;
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
        return null;
    }
    if (typeof body.description !== "string" ||
        body.description.trim().length < 2) {
        return null;
    }
    if (typeof body.price !== "number" ||
        !Number.isFinite(body.price) ||
        body.price <= 0) {
        return null;
    }
    return {
        name: body.name.trim(),
        description: body.description.trim(),
        price: Number(body.price.toFixed(2)),
    };
};
const elapsedMs = (start) => {
    return Number(process.hrtime.bigint() - start) / 1000000;
};
const getItemWithRedis = async (id) => {
    const key = itemCacheKey(id);
    const cached = await (0, redisClient_1.getCacheJSON)(key);
    if (cached) {
        return {
            item: cached,
            source: "redis",
        };
    }
    const fromDb = await (0, db_1.getItemById)(id);
    if (fromDb) {
        await (0, redisClient_1.setCacheJSON)(key, fromDb, config_1.config.redisTtlSeconds);
    }
    return {
        item: fromDb,
        source: (0, redisClient_1.isRedisAvailable)()
            ? "mariadb(cache-miss)"
            : "mariadb(redis-disabled)",
    };
};
const getItemsSnapshotWithRedis = async (limit) => {
    const key = listCacheKey(limit);
    const cached = await (0, redisClient_1.getCacheJSON)(key);
    if (cached) {
        return {
            payload: cached,
            source: "redis",
        };
    }
    const dbSnapshot = await (0, db_1.getItemsSnapshot)(limit);
    const payload = {
        ...dbSnapshot,
        generatedAt: new Date().toISOString(),
    };
    await (0, redisClient_1.setCacheJSON)(key, payload, config_1.config.redisTtlSeconds);
    return {
        payload,
        source: (0, redisClient_1.isRedisAvailable)()
            ? "mariadb(cache-miss)"
            : "mariadb(redis-disabled)",
    };
};
app.get("/health", asyncRoute(async (_req, res) => {
    try {
        await (0, db_1.pingDatabase)();
        return res.json({
            ok: true,
            database: "connected",
            redis: (0, redisClient_1.isRedisAvailable)() ? "connected" : "disabled-or-unavailable",
        });
    }
    catch (error) {
        return res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
}));
app.post("/setup", asyncRoute(async (_req, res) => {
    await (0, db_1.ensureSchema)();
    return res.json({
        ok: true,
        message: "Table benchmark_items is ready",
    });
}));
app.post("/seed", asyncRoute(async (req, res) => {
    const requested = Number(req.body?.count ?? 5000);
    if (!Number.isInteger(requested) || requested <= 0 || requested > 100000) {
        return res.status(400).json({
            ok: false,
            message: "count must be an integer from 1 to 100000",
        });
    }
    const inserted = await (0, db_1.seedItems)(requested);
    return res.json({
        ok: true,
        inserted,
    });
}));
app.get("/items/:id(\\d+)/no-redis", asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
        return res.status(400).json({
            ok: false,
            message: "id must be a positive integer",
        });
    }
    const startedAt = process.hrtime.bigint();
    const item = await (0, db_1.getItemById)(id);
    const durationMs = Number(elapsedMs(startedAt).toFixed(3));
    if (!item) {
        return res.status(404).json({
            ok: false,
            source: "mariadb",
            durationMs,
            message: "item not found",
        });
    }
    return res.json({
        ok: true,
        source: "mariadb",
        durationMs,
        item,
    });
}));
app.get("/items/:id(\\d+)/with-redis", asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
        return res.status(400).json({
            ok: false,
            message: "id must be a positive integer",
        });
    }
    const startedAt = process.hrtime.bigint();
    const result = await getItemWithRedis(id);
    const durationMs = Number(elapsedMs(startedAt).toFixed(3));
    if (!result.item) {
        return res.status(404).json({
            ok: false,
            source: result.source,
            durationMs,
            message: "item not found",
        });
    }
    return res.json({
        ok: true,
        source: result.source,
        durationMs,
        item: result.item,
        redisEnabled: (0, redisClient_1.isRedisAvailable)(),
    });
}));
app.get("/items/list/no-redis", asyncRoute(async (req, res) => {
    const limit = parseIntInRange(req.query.limit, 2000, 10, 5000);
    if (limit === null) {
        return res.status(400).json({
            ok: false,
            message: "limit must be an integer from 10 to 5000",
        });
    }
    const startedAt = process.hrtime.bigint();
    const snapshot = await (0, db_1.getItemsSnapshot)(limit);
    const durationMs = Number(elapsedMs(startedAt).toFixed(3));
    return res.json({
        ok: true,
        source: "mariadb",
        limit,
        durationMs,
        total: snapshot.total,
        checksum: snapshot.checksum,
        items: snapshot.items,
    });
}));
app.get("/items/list/with-redis", asyncRoute(async (req, res) => {
    const limit = parseIntInRange(req.query.limit, 2000, 10, 5000);
    if (limit === null) {
        return res.status(400).json({
            ok: false,
            message: "limit must be an integer from 10 to 5000",
        });
    }
    const startedAt = process.hrtime.bigint();
    const result = await getItemsSnapshotWithRedis(limit);
    const durationMs = Number(elapsedMs(startedAt).toFixed(3));
    return res.json({
        ok: true,
        source: result.source,
        redisEnabled: (0, redisClient_1.isRedisAvailable)(),
        limit,
        durationMs,
        total: result.payload.total,
        checksum: result.payload.checksum,
        generatedAt: result.payload.generatedAt,
        items: result.payload.items,
    });
}));
app.get("/benchmark/read/:id", asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const iterations = Number(req.query.iterations ?? 300);
    if (!id) {
        return res.status(400).json({
            ok: false,
            message: "id must be a positive integer",
        });
    }
    if (!Number.isInteger(iterations) || iterations <= 0 || iterations > 5000) {
        return res.status(400).json({
            ok: false,
            message: "iterations must be an integer from 1 to 5000",
        });
    }
    const exists = await (0, db_1.getItemById)(id);
    if (!exists) {
        return res.status(404).json({
            ok: false,
            message: "item not found. Seed data first.",
        });
    }
    const noRedisStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i += 1) {
        await (0, db_1.getItemById)(id);
    }
    const withoutRedisMs = Number(elapsedMs(noRedisStart).toFixed(3));
    let withRedisMs = withoutRedisMs;
    let warmupMs = null;
    let speedupX = null;
    let fasterPercent = null;
    if ((0, redisClient_1.isRedisAvailable)()) {
        await (0, redisClient_1.deleteCacheKey)(itemCacheKey(id));
        const warmupStart = process.hrtime.bigint();
        await getItemWithRedis(id);
        warmupMs = Number(elapsedMs(warmupStart).toFixed(3));
        const withRedisStart = process.hrtime.bigint();
        for (let i = 0; i < iterations; i += 1) {
            await getItemWithRedis(id);
        }
        withRedisMs = Number(elapsedMs(withRedisStart).toFixed(3));
        speedupX = Number((withoutRedisMs / withRedisMs).toFixed(2));
        fasterPercent = Number((((withoutRedisMs - withRedisMs) / withoutRedisMs) * 100).toFixed(2));
    }
    return res.json({
        ok: true,
        id,
        iterations,
        redisUsed: (0, redisClient_1.isRedisAvailable)(),
        withoutRedisMs,
        withRedisMs,
        warmupMs,
        speedupX,
        fasterPercent,
    });
}));
app.get("/benchmark/list", asyncRoute(async (req, res) => {
    const limit = parseIntInRange(req.query.limit, 2000, 10, 5000);
    const iterations = parseIntInRange(req.query.iterations, 120, 1, 1000);
    if (limit === null) {
        return res.status(400).json({
            ok: false,
            message: "limit must be an integer from 10 to 5000",
        });
    }
    if (iterations === null) {
        return res.status(400).json({
            ok: false,
            message: "iterations must be an integer from 1 to 1000",
        });
    }
    const noRedisStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i += 1) {
        await (0, db_1.getItemsSnapshot)(limit);
    }
    const withoutRedisMs = Number(elapsedMs(noRedisStart).toFixed(3));
    let withRedisMs = withoutRedisMs;
    let warmupMs = null;
    let speedupX = null;
    let fasterPercent = null;
    if ((0, redisClient_1.isRedisAvailable)()) {
        await (0, redisClient_1.deleteCacheKey)(listCacheKey(limit));
        const warmupStart = process.hrtime.bigint();
        await getItemsSnapshotWithRedis(limit);
        warmupMs = Number(elapsedMs(warmupStart).toFixed(3));
        const withRedisStart = process.hrtime.bigint();
        for (let i = 0; i < iterations; i += 1) {
            await getItemsSnapshotWithRedis(limit);
        }
        withRedisMs = Number(elapsedMs(withRedisStart).toFixed(3));
        speedupX = Number((withoutRedisMs / withRedisMs).toFixed(2));
        fasterPercent = Number((((withoutRedisMs - withRedisMs) / withoutRedisMs) * 100).toFixed(2));
    }
    return res.json({
        ok: true,
        limit,
        iterations,
        redisUsed: (0, redisClient_1.isRedisAvailable)(),
        withoutRedisMs,
        withRedisMs,
        warmupMs,
        speedupX,
        fasterPercent,
    });
}));
app.post("/items/direct", asyncRoute(async (req, res) => {
    const itemInput = parseItemInput(req.body);
    if (!itemInput) {
        return res.status(400).json({
            ok: false,
            message: "Body must be: { name: string, description: string, price: number > 0 }",
        });
    }
    const id = await (0, db_1.createItem)(itemInput);
    await (0, redisClient_1.deleteCacheKey)(itemCacheKey(id));
    return res.status(201).json({
        ok: true,
        mode: "direct-db",
        id,
    });
}));
app.post("/items/async", asyncRoute(async (req, res) => {
    const itemInput = parseItemInput(req.body);
    if (!itemInput) {
        return res.status(400).json({
            ok: false,
            message: "Body must be: { name: string, description: string, price: number > 0 }",
        });
    }
    if (!(0, redisClient_1.isRedisAvailable)()) {
        return res.status(503).json({
            ok: false,
            message: "Redis is required for async queue mode",
        });
    }
    const task = {
        ...itemInput,
        requestedAt: new Date().toISOString(),
    };
    const queueLength = await (0, redisClient_1.enqueueWriteTask)(config_1.config.writeQueueKey, task);
    return res.status(202).json({
        ok: true,
        mode: "queued",
        queueLength,
    });
}));
app.get("/queue/status", asyncRoute(async (_req, res) => {
    const queueLength = await (0, redisClient_1.getQueueLength)(config_1.config.writeQueueKey);
    return res.json({
        ok: true,
        redisEnabled: (0, redisClient_1.isRedisAvailable)(),
        queueKey: config_1.config.writeQueueKey,
        queueLength,
    });
}));
app.use((error, _req, res, _next) => {
    console.error("[api] unhandled error", error);
    return res.status(500).json({
        ok: false,
        message: error.message,
    });
});
const start = async () => {
    await (0, db_1.ensureSchema)();
    await (0, redisClient_1.connectRedis)();
    app.listen(config_1.config.port, () => {
        console.log(`API listening on port ${config_1.config.port}`);
        console.log(`Redis mode: ${(0, redisClient_1.isRedisAvailable)() ? "enabled" : "disabled/fallback"}`);
    });
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
    console.error("Failed to start application", error);
    process.exit(1);
});
