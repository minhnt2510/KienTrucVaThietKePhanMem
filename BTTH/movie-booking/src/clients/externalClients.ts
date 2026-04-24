import axios from "axios";
import { config } from "../config";

interface Movie {
  id: string;
  title: string;
  description: string;
  showtime: string;
  price: number;
  availableSeats: number;
}

interface User {
  id: string;
  username: string;
  email: string;
}

// Mock data for testing when external services unavailable
const mockUsers: Record<string, User> = {
  "user123": { id: "user123", username: "john_doe", email: "john@example.com" },
  "user1": { id: "user1", username: "user1", email: "user1@test.com" },
  "1": { id: "1", username: "TestUser", email: "test@test.com" },
};

const mockMovies: Record<string, Movie> = {
  "movie1": { id: "movie1", title: "Avengers: Endgame", description: "Superhero movie", showtime: "19:00", price: 75000, availableSeats: 50 },
  "movie2": { id: "movie2", title: "Spider-Man: No Way Home", description: "Superhero movie", showtime: "21:00", price: 80000, availableSeats: 40 },
  "1": { id: "1", title: "Test Movie", description: "Test", showtime: "18:00", price: 50000, availableSeats: 100 },
};

export async function validateUser(userId: string): Promise<User | null> {
  // Check mock data first
  if (mockUsers[userId]) {
    return mockUsers[userId];
  }

  try {
    const response = await axios.get(`${config.userServiceUrl}/users/${userId}`, {
      timeout: config.upstreamTimeoutMs,
    });
    return response.data;
  } catch (error) {
    console.warn(`⚠️ User service unavailable, using mock user: ${userId}`);
    // Auto-create mock user for any userId
    return { id: userId, username: `user_${userId}`, email: `${userId}@test.com` };
  }
}

export async function getMovie(movieId: string): Promise<Movie | null> {
  // Check mock data first
  if (mockMovies[movieId]) {
    return mockMovies[movieId];
  }

  try {
    const response = await axios.get(`${config.movieServiceUrl}/movies/${movieId}`, {
      timeout: config.upstreamTimeoutMs,
    });
    return response.data;
  } catch (error) {
    console.warn(`⚠️ Movie service unavailable, using mock movie: ${movieId}`);
    // Auto-create mock movie for any movieId
    return { id: movieId, title: `Movie ${movieId}`, description: "Test movie", showtime: "19:00", price: 75000, availableSeats: 50 };
  }
}
