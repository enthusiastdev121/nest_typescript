import { Transport } from '../enums/transport.enum';
import { CustomTransportStrategy, MicroserviceOptions } from '../interfaces';
import { Server } from './server';
import { ServerGrpc } from './server-grpc';
import { ServerMqtt } from './server-mqtt';
import { ServerNats } from './server-nats';
import { ServerRedis } from './server-redis';
import { ServerTCP } from './server-tcp';

export class ServerFactory {
  public static create(
    options: MicroserviceOptions,
  ): Server & CustomTransportStrategy {
    const { transport } = options as any;
    switch (transport) {
      case Transport.REDIS:
        return new ServerRedis(options);
      case Transport.NATS:
        return new ServerNats(options);
      case Transport.MQTT:
        return new ServerMqtt(options);
      case Transport.GRPC:
        return new ServerGrpc(options);
      default:
        return new ServerTCP(options);
    }
  }
}
