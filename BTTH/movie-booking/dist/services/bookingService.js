"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
exports.getBookings = getBookings;
exports.getBookingById = getBookingById;
const Booking_1 = require("../models/Booking");
const rabbitmq_1 = require("../rabbitmq");
const externalClients_1 = require("../clients/externalClients");
const db_1 = require("../db");
let inMemoryIdCounter = 1;
async function createBooking(input) {
    const { userId, userName, items } = input;
    // 1. Validate user
    const user = await (0, externalClients_1.validateUser)(userId);
    if (!user) {
        throw new Error(`User validation failed: userId ${userId} not found`);
    }
    // 2. Fetch movie info and build items with price
    const bookingItems = [];
    let totalAmount = 0;
    for (const item of items) {
        const movie = await (0, externalClients_1.getMovie)(item.movieId);
        if (!movie) {
            throw new Error(`Movie not found: ${item.movieId}`);
        }
        const itemTotal = movie.price * item.quantity;
        totalAmount += itemTotal;
        bookingItems.push({
            movieId: movie.id,
            movieTitle: movie.title,
            quantity: item.quantity,
            price: movie.price,
            seatNumbers: item.seatNumbers,
        });
    }
    // 3. Create booking (MongoDB or In-Memory)
    if ((0, db_1.isInMemoryMode)()) {
        const id = `booking_${inMemoryIdCounter++}`;
        const booking = {
            _id: id,
            userId,
            userName: userName || user.username || undefined,
            items: bookingItems,
            totalAmount,
            status: "PENDING",
            createdAt: new Date(),
            toString: function () { return JSON.stringify(this); }
        };
        db_1.inMemoryBookings.set(id, booking);
        console.log(`💾 Booking saved to memory: ${id}`);
        // 4. Publish BOOKING_CREATED event
        const eventPayload = {
            event: rabbitmq_1.EVENTS.BOOKING_CREATED,
            bookingId: id,
            userId,
            userName: booking.userName,
            items: bookingItems,
            totalAmount,
            timestamp: new Date().toISOString(),
        };
        (0, rabbitmq_1.publishEvent)(rabbitmq_1.EVENTS.BOOKING_CREATED, eventPayload);
        console.log(`✅ Booking created (in-memory): ${id} for user ${userId}`);
        return booking;
    }
    // MongoDB mode
    const booking = new Booking_1.BookingModel({
        userId,
        userName: userName || user.username || undefined,
        items: bookingItems,
        totalAmount,
        status: "PENDING",
    });
    await booking.save();
    // 4. Publish BOOKING_CREATED event
    const eventPayload = {
        event: rabbitmq_1.EVENTS.BOOKING_CREATED,
        bookingId: booking._id?.toString() ?? "",
        userId,
        userName: booking.userName,
        items: bookingItems,
        totalAmount,
        timestamp: new Date().toISOString(),
    };
    (0, rabbitmq_1.publishEvent)(rabbitmq_1.EVENTS.BOOKING_CREATED, eventPayload);
    console.log(`✅ Booking created: ${booking._id} for user ${userId}`);
    return booking;
}
async function getBookings(userId) {
    if ((0, db_1.isInMemoryMode)()) {
        const all = Array.from(db_1.inMemoryBookings.values());
        return userId ? all.filter(b => b.userId === userId) : all;
    }
    const filter = userId ? { userId } : {};
    return Booking_1.BookingModel.find(filter).sort({ createdAt: -1 }).exec();
}
async function getBookingById(bookingId) {
    if ((0, db_1.isInMemoryMode)()) {
        return db_1.inMemoryBookings.get(bookingId) || null;
    }
    return Booking_1.BookingModel.findById(bookingId).exec();
}
//# sourceMappingURL=bookingService.js.map