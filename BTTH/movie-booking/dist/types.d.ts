export interface Movie {
    id: string;
    title: string;
    description: string;
    showtime: string;
    price: number;
    availableSeats: number;
}
export interface User {
    id: string;
    username: string;
    email: string;
}
export interface BookingItem {
    movieId: string;
    movieTitle: string;
    quantity: number;
    price: number;
    seatNumbers: string[];
}
export interface Booking {
    _id?: string;
    userId: string;
    userName?: string;
    items: BookingItem[];
    totalAmount: number;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED";
    createdAt: Date;
    updatedAt: Date;
}
export interface BookingCreatedEvent {
    event: "BOOKING_CREATED";
    bookingId: string;
    userId: string;
    userName?: string;
    items: BookingItem[];
    totalAmount: number;
    timestamp: string;
}
//# sourceMappingURL=types.d.ts.map