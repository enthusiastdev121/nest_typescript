import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { EventEmitter } from 'events';
import { fromEvent, merge, Observable } from 'rxjs';
import { first, map, share, switchMap } from 'rxjs/operators';
import { ClientOptions, RmqOptions } from '../interfaces';
import {
  DISCONNECT_EVENT,
  ERROR_EVENT,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from './../constants';
import { WritePacket } from './../interfaces';
import { ClientProxy } from './client-proxy';

let rqmPackage: any = {};

export class ClientRMQ extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected connection: Promise<any>;
  protected client: any = null;
  protected channel: any = null;
  protected urls: string[];
  protected queue: string;
  protected prefetchCount: number;
  protected isGlobalPrefetchCount: boolean;
  protected queueOptions: any;
  protected replyQueue: string;
  protected responseEmitter: EventEmitter;

  constructor(protected readonly options: ClientOptions['options']) {
    super();
    this.urls = this.getOptionsProp<RmqOptions>(this.options, 'urls') || [
      RQM_DEFAULT_URL,
    ];
    this.queue =
      this.getOptionsProp<RmqOptions>(this.options, 'queue') ||
      RQM_DEFAULT_QUEUE;
    this.prefetchCount =
      this.getOptionsProp<RmqOptions>(this.options, 'prefetchCount') ||
      RQM_DEFAULT_PREFETCH_COUNT;
    this.isGlobalPrefetchCount =
      this.getOptionsProp<RmqOptions>(this.options, 'isGlobalPrefetchCount') ||
      RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
    this.queueOptions =
      this.getOptionsProp<RmqOptions>(this.options, 'queueOptions') ||
      RQM_DEFAULT_QUEUE_OPTIONS;

    loadPackage('amqplib', ClientRMQ.name);
    rqmPackage = loadPackage('amqp-connection-manager', ClientRMQ.name);
  }

  public close(): void {
    this.channel && this.channel.close();
    this.client && this.client.close();
  }

  public consumeChannel() {
    this.channel.addSetup(channel =>
      channel.consume(
        this.replyQueue,
        msg => this.responseEmitter.emit(msg.properties.correlationId, msg),
        { noAck: true },
      ),
    );
  }

  public connect(): Promise<any> {
    if (this.client) {
      return this.connection;
    }
    this.client = this.createClient();
    this.handleError(this.client);

    const connect$ = this.connect$(this.client);
    this.connection = this.mergeDisconnectEvent(this.client, connect$)
      .pipe(switchMap(() => this.createChannel()), share())
      .toPromise();
    return this.connection;
  }

  public createChannel(): Promise<void> {
    return new Promise(resolve => {
      this.channel = this.client.createChannel({
        json: false,
        setup: channel => this.setupChannel(channel, resolve),
      });
    });
  }

  public createClient<T = any>(): T {
    return rqmPackage.connect(this.urls) as T;
  }

  public mergeDisconnectEvent<T = any>(
    instance: any,
    source$: Observable<T>,
  ): Observable<T> {
    const close$ = fromEvent(instance, DISCONNECT_EVENT).pipe(
      map(err => {
        throw err;
      }),
    );
    return merge(source$, close$).pipe(first());
  }

  public async setupChannel(channel: any, resolve: Function) {
    await channel.assertQueue(this.queue, this.queueOptions);
    await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);

    this.replyQueue = (await channel.assertQueue('', {
      exclusive: true,
    })).queue;

    this.responseEmitter = new EventEmitter();
    this.responseEmitter.setMaxListeners(0);
    this.consumeChannel();

    resolve();
  }

  protected publish(
    message: any,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      const correlationId = randomStringGenerator();
      const listener = ({ content }) =>
        this.handleMessage(JSON.parse(content.toString()), callback);

      this.responseEmitter.on(correlationId, listener);
      this.channel.sendToQueue(
        this.queue,
        Buffer.from(JSON.stringify(message)),
        {
          replyTo: this.replyQueue,
          correlationId,
        },
      );
      return () => this.responseEmitter.removeListener(correlationId, listener);
    } catch (err) {
      callback({ err });
    }
  }

  public handleMessage(
    packet: WritePacket,
    callback: (packet: WritePacket) => any,
  ) {
    const { err, response, isDisposed } = packet;
    if (isDisposed || err) {
      callback({
        err,
        response: null,
        isDisposed: true,
      });
    }
    callback({
      err,
      response,
    });
  }

  public handleError(client: any): void {
    client.addListener(ERROR_EVENT, err => this.logger.error(err));
  }
}
