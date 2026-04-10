"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDbConnection = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const config_1 = require("./config");
exports.pool = promise_1.default.createPool({
    host: config_1.config.dbHost,
    port: config_1.config.dbPort,
    user: config_1.config.dbUser,
    password: config_1.config.dbPassword,
    database: config_1.config.dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
const testDbConnection = async () => {
    const conn = await exports.pool.getConnection();
    try {
        await conn.ping();
    }
    finally {
        conn.release();
    }
};
exports.testDbConnection = testDbConnection;
//# sourceMappingURL=db.js.map