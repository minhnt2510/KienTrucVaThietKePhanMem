"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUserById = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const userApi = axios_1.default.create({
    baseURL: config_1.config.userServiceUrl,
    timeout: config_1.config.upstreamTimeoutMs,
});
const validateUserById = async (userId) => {
    try {
        const response = await userApi.get("/users");
        const user = response.data.find((u) => Number(u.id) === Number(userId));
        if (!user) {
            throw new Error(`User ${userId} not found in User Service`);
        }
        return user;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.code === "ECONNABORTED") {
                throw new Error(`User Service timeout (${config_1.config.userServiceUrl}) after ${config_1.config.upstreamTimeoutMs}ms`);
            }
            if (!error.response) {
                throw new Error(`Cannot reach User Service at ${config_1.config.userServiceUrl}. Check IP/port/firewall.`);
            }
            throw new Error(`User Service error ${error.response.status} at ${config_1.config.userServiceUrl}`);
        }
        throw error;
    }
};
exports.validateUserById = validateUserById;
//# sourceMappingURL=userClient.js.map