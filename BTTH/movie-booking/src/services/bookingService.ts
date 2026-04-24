import { BookingModel, IBooking } from "../models/Booking";
import { BookingItem } from "../models/Booking";
import { publishEvent, EVENTS } from "../rabbitmq";
import { validateUser, getMovie } from "../clients/externalClients";
import { isInMemoryMode, inMemoryBookings } from "../db";

interface BookingItemInput {
  movieId: string;
  quantity: number;
  seatNumbers: string[];
}

interface CreateBookingInput {
  userId: string;
  userName?: string;
  items: BookingItemInput[];
}

let inMemoryIdCounter = 1;

export async function createBooking(input: CreateBookingInput): Promise<IBooking> {
  const { userId, userName, items } = input;

  // 1. Validate user
  const user = await validateUser(userId);
  if (!user) {
    throw new Error(`User validation failed: userId ${userId} not found`);
  }

  // 2. Fetch movie info and build items with price
  const bookingItems: BookingItem[] = [];
  let totalAmount = 0;

  for (const item of items) {
    const movie = await getMovie(item.movieId);
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
  if (isInMemoryMode()) {
    const id = `booking_${inMemoryIdCounter++}`;
    const booking = {
      _id: id,
      userId,
      userName: userName || user.username || undefined,
      items: bookingItems,
      totalAmount,
      status: "PENDING",
      createdAt: new Date(),
      toString: function() { return JSON.stringify(this); }
    } as unknown as IBooking;
    
    inMemoryBookings.set(id, booking);
    console.log(`💾 Booking saved to memory: ${id}`);

    // 4. Publish BOOKING_CREATED event
    const eventPayload = {
      event: EVENTS.BOOKING_CREATED,
      bookingId: id,
      userId,
      userName: booking.userName,
      items: bookingItems,
      totalAmount,
      timestamp: new Date().toISOString(),
    };

    publishEvent(EVENTS.BOOKING_CREATED, eventPayload);
    console.log(`✅ Booking created (in-memory): ${id} for user ${userId}`);

    return booking;
  }

  // MongoDB mode
  const booking = new BookingModel({
    userId,
    userName: userName || user.username || undefined,
    items: bookingItems,
    totalAmount,
    status: "PENDING",
  });

  await booking.save();

  // 4. Publish BOOKING_CREATED event
  const eventPayload = {
    event: EVENTS.BOOKING_CREATED,
    bookingId: booking._id?.toString() ?? "",
    userId,
    userName: booking.userName,
    items: bookingItems,
    totalAmount,
    timestamp: new Date().toISOString(),
  };

  publishEvent(EVENTS.BOOKING_CREATED, eventPayload);

  console.log(`✅ Booking created: ${booking._id} for user ${userId}`);

  return booking;
}

export async function getBookings(userId?: string): Promise<IBooking[]> {
  if (isInMemoryMode()) {
    const all = Array.from(inMemoryBookings.values());
    return userId ? all.filter(b => b.userId === userId) : all;
  }
  const filter = userId ? { userId } : {};
  return BookingModel.find(filter).sort({ createdAt: -1 }).exec();
}

export async function getBookingById(bookingId: string): Promise<IBooking | null> {
  if (isInMemoryMode()) {
    return inMemoryBookings.get(bookingId) || null;
  }
  return BookingModel.findById(bookingId).exec();
}
