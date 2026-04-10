"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const db_1 = require("./db");
app_1.default.listen(config_1.config.port, () => {
    console.log(`Order Service running on port ${config_1.config.port}`);
    console.log(`User Service URL: ${config_1.config.userServiceUrl}`);
    console.log(`Food Service URL: ${config_1.config.foodServiceUrl}`);
    (0, db_1.testDbConnection)()
        .then(() => {
        console.log(`MariaDB connected: ${config_1.config.dbUser}@${config_1.config.dbHost}:${config_1.config.dbPort}/${config_1.config.dbName}`);
    })
        .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`MariaDB connection failed: ${message}`);
    });
});
//# sourceMappingURL=server.js.map