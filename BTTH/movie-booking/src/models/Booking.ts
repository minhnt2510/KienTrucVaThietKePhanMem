import mongoose, { Schema, Document } from "mongoose";

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

const BookingItemSchema = new Schema(
  {
    movieId: { type: String, required: true },
    movieTitle: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    seatNumbers: [{ type: String, required: true }],
  },
  { _id: false }
);

const BookingSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String },
    items: { type: [BookingItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "FAILED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export const BookingModel = mongoose.model<IBooking>("Booking", BookingSchema);
