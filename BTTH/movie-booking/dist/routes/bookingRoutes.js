"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingService_1 = require("../services/bookingService");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const { userId, userName, items } = req.body;
        if (!userId || !items || items.length === 0) {
            res.status(400).json({
                success: false,
                error: "Missing required fields: userId and items are required",
            });
            return;
        }
        for (const item of items) {
            if (!item.movieId || !item.quantity || !item.seatNumbers?.length) {
                res.status(400).json({
                    success: false,
                    error: "Each item must have movieId, quantity, and seatNumbers",
                });
                return;
            }
        }
        const booking = await (0, bookingService_1.createBooking)({ userId, userName, items });
        res.status(201).json({
            success: true,
            data: booking,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("❌ Create booking error:", message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
router.get("/", async (req, res) => {
    try {
        const { userId } = req.query;
        const bookings = await (0, bookingService_1.getBookings)(userId);
        res.json({
            success: true,
            data: bookings,
            count: bookings.length,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("❌ Get bookings error:", message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const booking = await (0, bookingService_1.getBookingById)(req.params.id);
        if (!booking) {
            res.status(404).json({
                success: false,
                error: "Booking not found",
            });
            return;
        }
        res.json({
            success: true,
            data: booking,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("❌ Get booking error:", message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=bookingRoutes.js.map