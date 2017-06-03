import { ServerTCP } from './server-tcp';
import { ServerRedis } from './server-redis';
import { MicroserviceConfiguration, CustomTransportStrategy } from '../interfaces';
import { Server } from './server';
import { Transport } from '../enums/transport.enum';

export class ServerFactory {
    public static create(config: MicroserviceConfiguration): Server & CustomTransportStrategy {
        const { transport } = config;
        switch (transport) {
            case Transport.REDIS: return new ServerRedis(config);
            default: return new ServerTCP(config);
        }
    }
}