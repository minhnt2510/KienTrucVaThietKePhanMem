import mongoose, { Document } from "mongoose";
export interface BookingItem {
    movieId: string;
    movieTitle: string;
    quantity: number;
    price: number;
    seatNumbers: string[];
}
export interface IBooking extends Document {
    userId: string;
    userName?: string;
    items: BookingItem[];
    totalAmount: number;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED";
    createdAt: Date;
    updatedAt: Date;
}
export declare const BookingModel: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}, {}> & IBooking & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Booking.d.ts.map