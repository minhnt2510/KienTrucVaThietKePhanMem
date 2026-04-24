"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.seedItems = exports.createItem = exports.getItemsSnapshot = exports.getItemById = exports.ensureSchema = exports.pingDatabase = void 0;
const mariadb_1 = __importDefault(require("mariadb"));
const config_1 = require("./config");
const pool = mariadb_1.default.createPool({
    host: config_1.config.dbHost,
    port: config_1.config.dbPort,
    user: config_1.config.dbUser,
    password: config_1.config.dbPassword,
    database: config_1.config.dbName,
    connectionLimit: 10,
    insertIdAsNumber: true,
    bigIntAsNumber: true,
});
const withConnection = async (action) => {
    const connection = await pool.getConnection();
    try {
        return await action(connection);
    }
    finally {
        connection.release();
    }
};
const pingDatabase = async () => {
    await withConnection(async (connection) => {
        await connection.query("SELECT 1");
    });
};
exports.pingDatabase = pingDatabase;
const ensureSchema = async () => {
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
exports.ensureSchema = ensureSchema;
const getItemById = async (id) => {
    return withConnection(async (connection) => {
        const rows = (await connection.query("SELECT id, name, description, price, updated_at AS updatedAt FROM benchmark_items WHERE id = ? LIMIT 1", [id]));
        if (!Array.isArray(rows) || rows.length === 0) {
            return null;
        }
        const row = rows[0];
        const updatedAt = row.updatedAt instanceof Date
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
exports.getItemById = getItemById;
const getItemsSnapshot = async (limit) => {
    return withConnection(async (connection) => {
        const rows = (await connection.query("SELECT id, name, description, price, updated_at AS updatedAt FROM benchmark_items ORDER BY id DESC LIMIT ?", [limit]));
        const countRows = (await connection.query("SELECT COUNT(*) AS total FROM benchmark_items"));
        const items = rows.map((row) => {
            const updatedAt = row.updatedAt instanceof Date
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
exports.getItemsSnapshot = getItemsSnapshot;
const createItem = async (item) => {
    return withConnection(async (connection) => {
        const result = (await connection.query("INSERT INTO benchmark_items (name, description, price) VALUES (?, ?, ?)", [item.name, item.description, item.price]));
        return Number(result.insertId ?? 0);
    });
};
exports.createItem = createItem;
const seedItems = async (count) => {
    return withConnection(async (connection) => {
        const chunkSize = 500;
        let inserted = 0;
        for (let i = 0; i < count; i += chunkSize) {
            const size = Math.min(chunkSize, count - i);
            const placeholders = Array.from({ length: size }, () => "(?, ?, ?)").join(", ");
            const values = [];
            for (let j = 0; j < size; j += 1) {
                const n = i + j + 1;
                values.push(`Item ${n}`, `Benchmark item ${n}`, Number((Math.random() * 1000).toFixed(2)));
            }
            await connection.query(`INSERT INTO benchmark_items (name, description, price) VALUES ${placeholders}`, values);
            inserted += size;
        }
        return inserted;
    });
};
exports.seedItems = seedItems;
const closePool = async () => {
    await pool.end();
};
exports.closePool = closePool;
