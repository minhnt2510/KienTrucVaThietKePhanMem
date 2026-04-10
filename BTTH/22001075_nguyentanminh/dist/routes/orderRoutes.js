"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderService_1 = require("../services/orderService");
const router = (0, express_1.Router)();
router.post("/orders", async (req, res) => {
    try {
        const created = await (0, orderService_1.createOrder)(req.body);
        return res.status(201).json({
            message: "Order created successfully",
            data: created,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(400).json({ message });
    }
});
router.get("/orders", (req, res) => {
    try {
        const userId = req.query.userId ? Number(req.query.userId) : undefined;
        const status = req.query.status
            ? String(req.query.status).toUpperCase()
            : undefined;
        const data = (0, orderService_1.listOrders)({
            userId,
            status: status,
        });
        return res.json({ data, count: data.length });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(400).json({ message });
    }
});
router.get("/orders/:id", (req, res) => {
    try {
        const order = (0, orderService_1.getOrderById)(Number(req.params.id));
        return res.json({ data: order });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(404).json({ message });
    }
});
router.patch("/orders/:id/status", async (req, res) => {
    try {
        const status = String(req.body?.status || "").toUpperCase();
        const updated = await (0, orderService_1.updateOrderStatus)(Number(req.params.id), status);
        return res.json({
            message: "Order status updated",
            data: updated,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(400).json({ message });
    }
});
exports.default = router;
//# sourceMappingURL=orderRoutes.js.map