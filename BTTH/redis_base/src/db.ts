import mariadb, { Pool, PoolConnection } from "mariadb";
import { config } from "./config";
import { BenchmarkItem, ItemInput } from "./types";

const pool: Pool = mariadb.createPool({
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  connectionLimit: 10,
  insertIdAsNumber: true,
  bigIntAsNumber: true,
});

const withConnection = async <T>(
  action: (connection: PoolConnection) => Promise<T>,
): Promise<T> => {
  const connection = await pool.getConnection();
  try {
    return await action(connection);
  } finally {
    connection.release();
  }
};

export const pingDatabase = async (): Promise<void> => {
  await withConnection(async (connection) => {
    await connection.query("SELECT 1");
  });
};

export const ensureSchema = async (): Promise<void> => {
  await withConnection(async (connection) => {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS benchmark_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  });
};

export const getItemById = async (
  id: number,
): Promise<BenchmarkItem | null> => {
  return withConnection(async (connection) => {
    const rows = (await connection.query(
      "SELECT id, name, description, price, updated_at AS updatedAt FROM benchmark_items WHERE id = ? LIMIT 1",
      [id],
    )) as Array<Record<string, unknown>>;

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const updatedAt =
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt);

    return {
      id: Number(row.id),
      name: String(row.name),
      description: String(row.description),
      price: Number(row.price),
      updatedAt,
    };
  });
};

export const getItemsSnapshot = async (
  limit: number,
): Promise<{ items: BenchmarkItem[]; total: number; checksum: number }> => {
  return withConnection(async (connection) => {
    const rows = (await connection.query(
      "SELECT id, name, description, price, updated_at AS updatedAt FROM benchmark_items ORDER BY id DESC LIMIT ?",
      [limit],
    )) as Array<Record<string, unknown>>;

    const countRows = (await connection.query(
      "SELECT COUNT(*) AS total FROM benchmark_items",
    )) as Array<Record<string, unknown>>;

    const items: BenchmarkItem[] = rows.map((row) => {
      const updatedAt =
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt);

      return {
        id: Number(row.id),
        name: String(row.name),
        description: String(row.description),
        price: Number(row.price),
        updatedAt,
      };
    });

    // Small CPU step to emulate serialization/transformation work on API side.
    const checksum = items.reduce((acc, item) => {
      return acc + item.id + item.name.length + item.description.length;
    }, 0);

    return {
      items,
      total: Number(countRows[0]?.total ?? 0),
      checksum,
    };
  });
};

export const createItem = async (item: ItemInput): Promise<number> => {
  return withConnection(async (connection) => {
    const result = (await connection.query(
      "INSERT INTO benchmark_items (name, description, price) VALUES (?, ?, ?)",
      [item.name, item.description, item.price],
    )) as { insertId?: number };

    return Number(result.insertId ?? 0);
  });
};

export const seedItems = async (count: number): Promise<number> => {
  return withConnection(async (connection) => {
    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < count; i += chunkSize) {
      const size = Math.min(chunkSize, count - i);
      const placeholders = Array.from({ length: size }, () => "(?, ?, ?)").join(
        ", ",
      );
      const values: Array<string | number> = [];

      for (let j = 0; j < size; j += 1) {
        const n = i + j + 1;
        values.push(
          `Item ${n}`,
          `Benchmark item ${n}`,
          Number((Math.random() * 1000).toFixed(2)),
        );
      }

      await connection.query(
        `INSERT INTO benchmark_items (name, description, price) VALUES ${placeholders}`,
        values,
      );

      inserted += size;
    }

    return inserted;
  });
};

export const closePool = async (): Promise<void> => {
  await pool.end();
};
