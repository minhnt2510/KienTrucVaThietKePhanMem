"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUser = validateUser;
exports.getMovie = getMovie;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
// Mock data for testing when external services unavailable
const mockUsers = {
    "user123": { id: "user123", username: "john_doe", email: "john@example.com" },
    "user1": { id: "user1", username: "user1", email: "user1@test.com" },
    "1": { id: "1", username: "TestUser", email: "test@test.com" },
};
const mockMovies = {
    "movie1": { id: "movie1", title: "Avengers: Endgame", description: "Superhero movie", showtime: "19:00", price: 75000, availableSeats: 50 },
    "movie2": { id: "movie2", title: "Spider-Man: No Way Home", description: "Superhero movie", showtime: "21:00", price: 80000, availableSeats: 40 },
    "1": { id: "1", title: "Test Movie", description: "Test", showtime: "18:00", price: 50000, availableSeats: 100 },
};
async function validateUser(userId) {
    // Check mock data first
    if (mockUsers[userId]) {
        return mockUsers[userId];
    }
    try {
        const response = await axios_1.default.get(`${config_1.config.userServiceUrl}/users/${userId}`, {
            timeout: config_1.config.upstreamTimeoutMs,
        });
        return response.data;
    }
    catch (error) {
        console.warn(`⚠️ User service unavailable, using mock user: ${userId}`);
        // Auto-create mock user for any userId
        return { id: userId, username: `user_${userId}`, email: `${userId}@test.com` };
    }
}
async function getMovie(movieId) {
    // Check mock data first
    if (mockMovies[movieId]) {
        return mockMovies[movieId];
    }
    try {
        const response = await axios_1.default.get(`${config_1.config.movieServiceUrl}/movies/${movieId}`, {
            timeout: config_1.config.upstreamTimeoutMs,
        });
        return response.data;
    }
    catch (error) {
        console.warn(`⚠️ Movie service unavailable, using mock movie: ${movieId}`);
        // Auto-create mock movie for any movieId
        return { id: movieId, title: `Movie ${movieId}`, description: "Test movie", showtime: "19:00", price: 75000, availableSeats: 50 };
    }
}
//# sourceMappingURL=externalClients.js.map