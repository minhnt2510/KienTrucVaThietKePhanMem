import { Router, Request, Response } from "express";
import { createBooking, getBookings, getBookingById } from "../services/bookingService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
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

    const booking = await createBooking({ userId, userName, items });

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Create booking error:", message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const bookings = await getBookings(userId as string | undefined);

    res.json({
      success: true,
      data: bookings,
      count: bookings.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Get bookings error:", message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const booking = await getBookingById(req.params.id);

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Get booking error:", message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
