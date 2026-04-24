import { IBooking } from "../models/Booking";
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
export declare function createBooking(input: CreateBookingInput): Promise<IBooking>;
export declare function getBookings(userId?: string): Promise<IBooking[]>;
export declare function getBookingById(bookingId: string): Promise<IBooking | null>;
export {};
//# sourceMappingURL=bookingService.d.ts.map