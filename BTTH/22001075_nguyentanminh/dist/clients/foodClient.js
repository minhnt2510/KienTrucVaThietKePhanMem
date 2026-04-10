"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFoodsByIds = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const foodApi = axios_1.default.create({
    baseURL: config_1.config.foodServiceUrl,
    timeout: config_1.config.upstreamTimeoutMs,
});
const getFoodsByIds = async (foodIds) => {
    try {
        const uniqueIds = [...new Set(foodIds.map((id) => Number(id)))];
        const response = await foodApi.get("/foods");
        const foods = response.data.filter((food) => uniqueIds.includes(Number(food.id)));
        if (foods.length !== uniqueIds.length) {
            const existing = new Set(foods.map((f) => Number(f.id)));
            const missingIds = uniqueIds.filter((id) => !existing.has(id));
            throw new Error(`Foods not found: ${missingIds.join(", ")}`);
        }
        return foods;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.code === "ECONNABORTED") {
                throw new Error(`Food Service timeout (${config_1.config.foodServiceUrl}) after ${config_1.config.upstreamTimeoutMs}ms`);
            }
            if (!error.response) {
                throw new Error(`Cannot reach Food Service at ${config_1.config.foodServiceUrl}. Check IP/port/firewall.`);
            }
            throw new Error(`Food Service error ${error.response.status} at ${config_1.config.foodServiceUrl}`);
        }
        throw error;
    }
};
exports.getFoodsByIds = getFoodsByIds;
//# sourceMappingURL=foodClient.js.map