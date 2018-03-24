import { Transport } from './../enums/transport.enum';
export interface ClientOptions {
    transport?: Transport;
    url?: string;
    port?: number;
    host?: string;
    retryAttempts?: number;
    retryDelay?: number;
}
