export type UserRole = "USER" | "ADMIN";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PAID"
  | "CANCELLED";

export interface User {
  id: number;
  username?: string;
  name?: string;
  email: string;
  role: UserRole;
}

export interface Food {
  id: number;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  available?: boolean;
}

export interface CreateOrderItemInput {
  foodId: number;
  quantity: number;
  foodName?: string;
  foodPrice?: number;
}

export type PaymentMethod = "CASH" | "BANKING";

export type PaymentMethodInput = "COD" | PaymentMethod;

export interface CreateOrderInput {
  userId: number;
  paymentMethod: PaymentMethodInput;
  items: CreateOrderItemInput[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  foodId: number;
  foodName: string;
  foodPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}
