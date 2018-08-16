import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { ERROR_EVENT, NATS_DEFAULT_URL } from '../constants';
import { Client } from '../external/nats-client.interface';
import { NatsOptions, PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
import { CONN_ERR } from './constants';

let natsPackage: any = {};

export class ClientNats extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private natsClient: Client;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<NatsOptions>(this.options, 'url') || NATS_DEFAULT_URL;
    natsPackage = loadPackage('nats', ClientNats.name);
  }

  public close() {
    this.natsClient && this.natsClient.close();
    this.natsClient = null;
  }

  public async connect(): Promise<any> {
    if (this.natsClient) {
      return Promise.resolve();
    }
    this.natsClient = await this.createClient();
    this.handleError(this.natsClient);
    return this.connect$(this.natsClient).toPromise();
  }

  public createClient(): Promise<Client> {
    const options: any = this.options.options || ({} as NatsOptions);
    return natsPackage.connect({
      ...options,
      url: this.url,
      json: true,
    });
  }

  public handleError(client: Client) {
    client.addListener(
      ERROR_EVENT,
      err => err.code !== CONN_ERR && this.logger.error(err),
    );
  }

  public createSubscriptionHandler(
    packet: ReadPacket & PacketId,
    callback: (packet: WritePacket) => any,
  ): Function {
    return (message: WritePacket & PacketId) => {
      if (message.id !== packet.id) {
        return undefined;
      }
      const { err, response, isDisposed } = message;
      if (isDisposed || err) {
        return callback({
          err,
          response: null,
          isDisposed: true,
        });
      }
      callback({
        err,
        response,
      });
    };
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      const packet = this.assignPacketId(partialPacket);
      const channel = this.normalizePattern(partialPacket.pattern);

      const subscriptionHandler = this.createSubscriptionHandler(
        packet,
        callback,
      );
      const subscriptionId = this.natsClient.request(
        channel,
        packet as any,
        subscriptionHandler,
      );
      return () => this.natsClient.unsubscribe(subscriptionId);
    } catch (err) {
      callback({ err });
    }
  }
}
