import axios from "axios";
import { config } from "../config";
import { User } from "../types";

const userApi = axios.create({
  baseURL: config.userServiceUrl,
  timeout: config.upstreamTimeoutMs,
});

export const validateUserById = async (userId: number): Promise<User> => {
  try {
    const response = await userApi.get<User[]>("/users");
    const user = response.data.find((u) => Number(u.id) === Number(userId));

    if (!user) {
      throw new Error(`User ${userId} not found in User Service`);
    }

    return user;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        throw new Error(
          `User Service timeout (${config.userServiceUrl}) after ${config.upstreamTimeoutMs}ms`
        );
      }

      if (!error.response) {
        throw new Error(
          `Cannot reach User Service at ${config.userServiceUrl}. Check IP/port/firewall.`
        );
      }

      throw new Error(
        `User Service error ${error.response.status} at ${config.userServiceUrl}`
      );
    }

    throw error;
  }
};
