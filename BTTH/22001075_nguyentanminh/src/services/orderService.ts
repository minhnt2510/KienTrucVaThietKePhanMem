import { getFoodsByIds } from "../clients/foodClient";
import { validateUserById } from "../clients/userClient";
import { config } from "../config";
import { pool } from "../db";
import { ResultSetHeader } from "mysql2/promise";
import {
  CreateOrderInput,
  CreateOrderItemInput,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentMethodInput,
} from "../types";

let orderIdSeq = 1;
let orderItemIdSeq = 1;
const orders: Order[] = [];

const allowedPaymentMethods: PaymentMethod[] = ["CASH", "BANKING"];
const allowedOrderStatuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PAID",
  "CANCELLED",
];

const normalizePaymentMethod = (method: PaymentMethodInput): PaymentMethod => {
  const normalized = String(method).toUpperCase();
  if (normalized === "COD") {
    return "CASH";
  }
  if (normalized === "CASH" || normalized === "BANKING") {
    return normalized;
  }
  throw new Error("paymentMethod must be COD/CASH or BANKING");
};

const normalizeOrderStatus = (status: string): OrderStatus => {
  const normalized = String(status).toUpperCase();
  if (normalized === "SUCCESS") {
    return "PAID";
  }
  if (normalized === "FAILED") {
    return "CANCELLED";
  }
  if (allowedOrderStatuses.includes(normalized as OrderStatus)) {
    return normalized as OrderStatus;
  }
  throw new Error(`status must be one of: ${allowedOrderStatuses.join(", ")}`);
};

const nowMySqlDatetime = (): string => {
  // MySQL DATETIME(3) expects "YYYY-MM-DD HH:mm:ss.SSS" (no trailing Z).
  return new Date().toISOString().slice(0, 23).replace("T", " ");
};

const persistOrderToDb = async (order: Order): Promise<void> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderResult] = await connection.execute<ResultSetHeader>(
      "INSERT INTO `Order` (userId, totalAmount, status, paymentMethod, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      [
        order.userId,
        order.totalAmount,
        order.status,
        order.paymentMethod,
        order.createdAt,
        order.updatedAt,
      ]
    );

    const insertedOrderId = Number(orderResult.insertId);
    order.id = insertedOrderId;
    order.items.forEach((item) => {
      item.orderId = insertedOrderId;
    });

    for (const item of order.items) {
      await connection.execute(
        "INSERT INTO `OrderItem` (orderId, foodId, foodName, foodPrice, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
        [
          insertedOrderId,
          item.foodId,
          item.foodName,
          item.foodPrice,
          item.quantity,
          item.subtotal,
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const persistOrderStatusToDb = async (
  orderId: number,
  status: OrderStatus,
  updatedAt: string
): Promise<void> => {
  await pool.execute(
    "UPDATE `Order` SET status = ?, updatedAt = ? WHERE id = ?",
    [status, updatedAt, orderId]
  );
};

const buildIndependentItems = (
  orderId: number,
  orderInputs: CreateOrderItemInput[]
): OrderItem[] => {
  return orderInputs.map((input) => {
    const foodPrice = Number(input.foodPrice ?? 0);
    if (!Number.isFinite(foodPrice) || foodPrice < 0) {
      throw new Error(`foodPrice for foodId ${input.foodId} must be >= 0`);
    }

    const subtotal = Number((foodPrice * input.quantity).toFixed(2));
    return {
      id: orderItemIdSeq++,
      orderId,
      foodId: Number(input.foodId),
      foodName: input.foodName || `Food #${input.foodId}`,
      foodPrice,
      quantity: input.quantity,
      subtotal,
    };
  });
};

export const createOrder = async (payload: CreateOrderInput): Promise<Order> => {
  if (!payload.items || payload.items.length === 0) {
    throw new Error("Order must include at least one item");
  }

  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

  payload.items.forEach((item, index) => {
    if (!Number.isFinite(item.foodId) || item.foodId <= 0) {
      throw new Error(`items[${index}].foodId is invalid`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`items[${index}].quantity must be a positive integer`);
    }
  });

  const orderId = orderIdSeq++;
  let items: OrderItem[];

  if (config.independentMode) {
    items = buildIndependentItems(orderId, payload.items);
  } else {
    await validateUserById(payload.userId);

    const foods = await getFoodsByIds(payload.items.map((i) => i.foodId));
    const foodById = new Map(foods.map((f) => [Number(f.id), f]));

    items = payload.items.map((input) => {
      const food = foodById.get(Number(input.foodId));
      if (!food) {
        throw new Error(`Food ${input.foodId} not found`);
      }
      if (food.available === false) {
        throw new Error(`Food ${food.name} is unavailable`);
      }

      const subtotal = Number((food.price * input.quantity).toFixed(2));
      return {
        id: orderItemIdSeq++,
        orderId,
        foodId: Number(food.id),
        foodName: food.name,
        foodPrice: Number(food.price),
        quantity: input.quantity,
        subtotal,
      };
    });
  }

  const totalAmount = Number(
    items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
  );

  const timestamp = nowMySqlDatetime();
  const order: Order = {
    id: orderId,
    userId: payload.userId,
    totalAmount,
    status: "PENDING",
    paymentMethod,
    createdAt: timestamp,
    updatedAt: timestamp,
    items,
  };

  await persistOrderToDb(order);
  orders.push(order);
  return order;
};

export const listOrders = (filters?: {
  userId?: number;
  status?: OrderStatus;
}): Order[] => {
  return orders.filter((order) => {
    if (filters?.userId && Number(order.userId) !== Number(filters.userId)) {
      return false;
    }
    if (filters?.status && order.status !== filters.status) {
      return false;
    }
    return true;
  });
};

export const getOrderById = (id: number): Order => {
  const order = orders.find((o) => Number(o.id) === Number(id));
  if (!order) {
    throw new Error(`Order ${id} not found`);
  }
  return order;
};

export const updateOrderStatus = async (
  id: number,
  status: string
): Promise<Order> => {
  const normalizedStatus = normalizeOrderStatus(status);

  const order = getOrderById(id);
  order.status = normalizedStatus;
  order.updatedAt = nowMySqlDatetime();
  await persistOrderStatusToDb(order.id, order.status, order.updatedAt);
  return order;
};
