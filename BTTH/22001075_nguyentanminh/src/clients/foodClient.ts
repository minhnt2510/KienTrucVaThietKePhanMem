import axios from "axios";
import { config } from "../config";
import { Food } from "../types";

const foodApi = axios.create({
  baseURL: config.foodServiceUrl,
  timeout: config.upstreamTimeoutMs,
});

export const getFoodsByIds = async (foodIds: number[]): Promise<Food[]> => {
  try {
    const uniqueIds = [...new Set(foodIds.map((id) => Number(id)))];
    const response = await foodApi.get<Food[]>("/foods");
    const foods = response.data.filter((food) =>
      uniqueIds.includes(Number(food.id))
    );

    if (foods.length !== uniqueIds.length) {
      const existing = new Set(foods.map((f) => Number(f.id)));
      const missingIds = uniqueIds.filter((id) => !existing.has(id));
      throw new Error(`Foods not found: ${missingIds.join(", ")}`);
    }

    return foods;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        throw new Error(
          `Food Service timeout (${config.foodServiceUrl}) after ${config.upstreamTimeoutMs}ms`
        );
      }

      if (!error.response) {
        throw new Error(
          `Cannot reach Food Service at ${config.foodServiceUrl}. Check IP/port/firewall.`
        );
      }

      throw new Error(
        `Food Service error ${error.response.status} at ${config.foodServiceUrl}`
      );
    }

    throw error;
  }
};
