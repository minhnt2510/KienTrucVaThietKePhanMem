import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { config } from "./config";
import {
  closePool,
  createItem,
  ensureSchema,
  getItemById,
  getItemsSnapshot,
  pingDatabase,
  seedItems,
} from "./db";
import {
  closeRedis,
  connectRedis,
  deleteCacheKey,
  enqueueWriteTask,
  getCacheJSON,
  getQueueLength,
  isRedisAvailable,
  setCacheJSON,
} from "./redisClient";
import { BenchmarkItem, ItemInput, WriteTask } from "./types";

const app = express();
app.use(cors());
app.use(express.json());

type AsyncRoute = (req: Request, res: Response) => Promise<Response | void>;

const asyncRoute =
  (handler: AsyncRoute) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };

const itemCacheKey = (id: number): string => `item:${id}`;
const listCacheKey = (limit: number): string => `items:list:${limit}`;

const parsePositiveInt = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const parseIntInRange = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number | null => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
};

const parseItemInput = (payload: unknown): ItemInput | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    return null;
  }

  if (
    typeof body.description !== "string" ||
    body.description.trim().length < 2
  ) {
    return null;
  }

  if (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price <= 0
  ) {
    return null;
  }

  return {
    name: body.name.trim(),
    description: body.description.trim(),
    price: Number(body.price.toFixed(2)),
  };
};

const elapsedMs = (start: bigint): number => {
  return Number(process.hrtime.bigint() - start) / 1_000_000;
};

const getItemWithRedis = async (
  id: number,
): Promise<{ item: BenchmarkItem | null; source: string }> => {
  const key = itemCacheKey(id);
  const cached = await getCacheJSON<BenchmarkItem>(key);

  if (cached) {
    return {
      item: cached,
      source: "redis",
    };
  }

  const fromDb = await getItemById(id);
  if (fromDb) {
    await setCacheJSON(key, fromDb, config.redisTtlSeconds);
  }

  return {
    item: fromDb,
    source: isRedisAvailable()
      ? "mariadb(cache-miss)"
      : "mariadb(redis-disabled)",
  };
};

type SnapshotPayload = {
  items: BenchmarkItem[];
  total: number;
  checksum: number;
  generatedAt: string;
};

const getItemsSnapshotWithRedis = async (
  limit: number,
): Promise<{ payload: SnapshotPayload; source: string }> => {
  const key = listCacheKey(limit);
  const cached = await getCacheJSON<SnapshotPayload>(key);

  if (cached) {
    return {
      payload: cached,
      source: "redis",
    };
  }

  const dbSnapshot = await getItemsSnapshot(limit);
  const payload: SnapshotPayload = {
    ...dbSnapshot,
    generatedAt: new Date().toISOString(),
  };

  await setCacheJSON(key, payload, config.redisTtlSeconds);

  return {
    payload,
    source: isRedisAvailable()
      ? "mariadb(cache-miss)"
      : "mariadb(redis-disabled)",
  };
};

app.get(
  "/health",
  asyncRoute(async (_req: Request, res: Response) => {
    try {
      await pingDatabase();
      return res.json({
        ok: true,
        database: "connected",
        redis: isRedisAvailable() ? "connected" : "disabled-or-unavailable",
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: (error as Error).message,
      });
    }
  }),
);

app.post(
  "/setup",
  asyncRoute(async (_req: Request, res: Response) => {
    await ensureSchema();
    return res.json({
      ok: true,
      message: "Table benchmark_items is ready",
    });
  }),
);

app.post(
  "/seed",
  asyncRoute(async (req: Request, res: Response) => {
    const requested = Number((req.body as { count?: number })?.count ?? 5000);

    if (!Number.isInteger(requested) || requested <= 0 || requested > 100000) {
      return res.status(400).json({
        ok: false,
        message: "count must be an integer from 1 to 100000",
      });
    }

    const inserted = await seedItems(requested);
    return res.json({
      ok: true,
      inserted,
    });
  }),
);

app.get(
  "/items/:id(\\d+)/no-redis",
  asyncRoute(async (req: Request, res: Response) => {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        ok: false,
        message: "id must be a positive integer",
      });
    }

    const startedAt = process.hrtime.bigint();
    const item = await getItemById(id);
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
  }),
);

app.get(
  "/items/:id(\\d+)/with-redis",
  asyncRoute(async (req: Request, res: Response) => {
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
      redisEnabled: isRedisAvailable(),
    });
  }),
);

app.get(
  "/items/list/no-redis",
  asyncRoute(async (req: Request, res: Response) => {
    const limit = parseIntInRange(req.query.limit, 2000, 10, 5000);

    if (limit === null) {
      return res.status(400).json({
        ok: false,
        message: "limit must be an integer from 10 to 5000",
      });
    }

    const startedAt = process.hrtime.bigint();
    const snapshot = await getItemsSnapshot(limit);
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
  }),
);

app.get(
  "/items/list/with-redis",
  asyncRoute(async (req: Request, res: Response) => {
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
      redisEnabled: isRedisAvailable(),
      limit,
      durationMs,
      total: result.payload.total,
      checksum: result.payload.checksum,
      generatedAt: result.payload.generatedAt,
      items: result.payload.items,
    });
  }),
);

app.get(
  "/benchmark/read/:id",
  asyncRoute(async (req: Request, res: Response) => {
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

    const exists = await getItemById(id);
    if (!exists) {
      return res.status(404).json({
        ok: false,
        message: "item not found. Seed data first.",
      });
    }

    const noRedisStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i += 1) {
      await getItemById(id);
    }
    const withoutRedisMs = Number(elapsedMs(noRedisStart).toFixed(3));

    let withRedisMs = withoutRedisMs;
    let warmupMs: number | null = null;
    let speedupX: number | null = null;
    let fasterPercent: number | null = null;

    if (isRedisAvailable()) {
      await deleteCacheKey(itemCacheKey(id));

      const warmupStart = process.hrtime.bigint();
      await getItemWithRedis(id);
      warmupMs = Number(elapsedMs(warmupStart).toFixed(3));

      const withRedisStart = process.hrtime.bigint();
      for (let i = 0; i < iterations; i += 1) {
        await getItemWithRedis(id);
      }
      withRedisMs = Number(elapsedMs(withRedisStart).toFixed(3));

      speedupX = Number((withoutRedisMs / withRedisMs).toFixed(2));
      fasterPercent = Number(
        (((withoutRedisMs - withRedisMs) / withoutRedisMs) * 100).toFixed(2),
      );
    }

    return res.json({
      ok: true,
      id,
      iterations,
      redisUsed: isRedisAvailable(),
      withoutRedisMs,
      withRedisMs,
      warmupMs,
      speedupX,
      fasterPercent,
    });
  }),
);

app.get(
  "/benchmark/list",
  asyncRoute(async (req: Request, res: Response) => {
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
      await getItemsSnapshot(limit);
    }
    const withoutRedisMs = Number(elapsedMs(noRedisStart).toFixed(3));

    let withRedisMs = withoutRedisMs;
    let warmupMs: number | null = null;
    let speedupX: number | null = null;
    let fasterPercent: number | null = null;

    if (isRedisAvailable()) {
      await deleteCacheKey(listCacheKey(limit));

      const warmupStart = process.hrtime.bigint();
      await getItemsSnapshotWithRedis(limit);
      warmupMs = Number(elapsedMs(warmupStart).toFixed(3));

      const withRedisStart = process.hrtime.bigint();
      for (let i = 0; i < iterations; i += 1) {
        await getItemsSnapshotWithRedis(limit);
      }
      withRedisMs = Number(elapsedMs(withRedisStart).toFixed(3));

      speedupX = Number((withoutRedisMs / withRedisMs).toFixed(2));
      fasterPercent = Number(
        (((withoutRedisMs - withRedisMs) / withoutRedisMs) * 100).toFixed(2),
      );
    }

    return res.json({
      ok: true,
      limit,
      iterations,
      redisUsed: isRedisAvailable(),
      withoutRedisMs,
      withRedisMs,
      warmupMs,
      speedupX,
      fasterPercent,
    });
  }),
);

app.post(
  "/items/direct",
  asyncRoute(async (req: Request, res: Response) => {
    const itemInput = parseItemInput(req.body);

    if (!itemInput) {
      return res.status(400).json({
        ok: false,
        message:
          "Body must be: { name: string, description: string, price: number > 0 }",
      });
    }

    const id = await createItem(itemInput);
    await deleteCacheKey(itemCacheKey(id));

    return res.status(201).json({
      ok: true,
      mode: "direct-db",
      id,
    });
  }),
);

app.post(
  "/items/async",
  asyncRoute(async (req: Request, res: Response) => {
    const itemInput = parseItemInput(req.body);

    if (!itemInput) {
      return res.status(400).json({
        ok: false,
        message:
          "Body must be: { name: string, description: string, price: number > 0 }",
      });
    }

    if (!isRedisAvailable()) {
      return res.status(503).json({
        ok: false,
        message: "Redis is required for async queue mode",
      });
    }

    const task: WriteTask = {
      ...itemInput,
      requestedAt: new Date().toISOString(),
    };

    const queueLength = await enqueueWriteTask(config.writeQueueKey, task);

    return res.status(202).json({
      ok: true,
      mode: "queued",
      queueLength,
    });
  }),
);

app.get(
  "/queue/status",
  asyncRoute(async (_req: Request, res: Response) => {
    const queueLength = await getQueueLength(config.writeQueueKey);

    return res.json({
      ok: true,
      redisEnabled: isRedisAvailable(),
      queueKey: config.writeQueueKey,
      queueLength,
    });
  }),
);

app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): Response => {
    console.error("[api] unhandled error", error);
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  },
);

const start = async (): Promise<void> => {
  await ensureSchema();
  await connectRedis();

  app.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`);
    console.log(
      `Redis mode: ${isRedisAvailable() ? "enabled" : "disabled/fallback"}`,
    );
  });
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
  console.error("Failed to start application", error);
  process.exit(1);
});
