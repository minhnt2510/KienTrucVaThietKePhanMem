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
export declare function validateUser(userId: string): Promise<User | null>;
export declare function getMovie(movieId: string): Promise<Movie | null>;
export {};
//# sourceMappingURL=externalClients.d.ts.map