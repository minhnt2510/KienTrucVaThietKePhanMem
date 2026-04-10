"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const app = (0, express_1.default)();
const origins = config_1.config.corsOrigins.split(",").map((o) => o.trim());
const allowAll = origins.includes("*");
app.use((0, cors_1.default)({
    origin: allowAll ? true : origins,
}));
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({
        service: "order-service",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});
app.use(orderRoutes_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map