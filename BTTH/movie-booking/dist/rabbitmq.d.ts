export declare const EVENTS: {
    readonly BOOKING_CREATED: "BOOKING_CREATED";
    readonly PAYMENT_COMPLETED: "PAYMENT_COMPLETED";
    readonly BOOKING_FAILED: "BOOKING_FAILED";
    readonly USER_REGISTERED: "USER_REGISTERED";
};
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export declare function connectRabbitMQ(): Promise<void>;
export declare function publishEvent(eventName: EventName, payload: object): void;
//# sourceMappingURL=rabbitmq.d.ts.map