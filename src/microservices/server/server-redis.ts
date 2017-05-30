import * as redis from 'redis';
import { Server } from './server';
import { NO_PATTERN_MESSAGE } from '../constants';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy } from './../interfaces';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/finally';

const DEFAULT_URL = 'redis://localhost:6379';
const CONNECT_EVENT = 'connect';
const MESSAGE_EVENT = 'message';

export class ServerRedis extends Server implements CustomTransportStrategy {
    private readonly url: string;
    private sub = null;
    private pub = null;

    constructor(config: MicroserviceConfiguration) {
        super();
        this.url = config.url || DEFAULT_URL;
    }

    public listen(callback: () => void) {
        this.sub = this.createRedisClient();
        this.pub = this.createRedisClient();
        this.start(callback);
    }

    public start(callback?: () => void) {
        this.sub.on(CONNECT_EVENT, () => this.handleConnection(callback, this.sub, this.pub));
    }

    public close() {
        this.pub && this.pub.quit();
        this.sub && this.sub.quit();
        this.pub = null;
        this.sub = null;
    }

    public createRedisClient() {
        return redis.createClient({ url: this.url });
    }

    public handleConnection(callback, sub, pub) {
        sub.on(MESSAGE_EVENT, this.getMessageHandler(pub).bind(this));

        const patterns = Object.keys(this.messageHandlers);
        patterns.forEach((pattern) => sub.subscribe(this.getAckQueueName(pattern)));
        callback && callback();
    }

    public getMessageHandler(pub) {
        return (channel, buffer) => this.handleMessage(channel, buffer, pub);
    }

    public handleMessage(channel, buffer, pub) {
        const msg = this.tryParse(buffer);
        const pattern = channel.replace(/_ack$/, '');
        const publish = this.getPublisher(pub, pattern);

        if (!this.messageHandlers[pattern]) {
            publish({ err: NO_PATTERN_MESSAGE });
            return;
        }
        const handler = this.messageHandlers[pattern];
        const response$ = handler(msg.data) as Observable<any>;
        response$ && this.send(response$, publish);
    }

    public getPublisher(pub, pattern) {
        return (respond) => {
            pub.publish(
                this.getResQueueName(pattern),
                JSON.stringify(respond),
            );
        };
    }

    public tryParse(content) {
        try {
            return JSON.parse(content);
        }
        catch (e) {
            return content;
        }
    }

    public getAckQueueName(pattern) {
        return `${pattern}_ack`;
    }

    public getResQueueName(pattern) {
        return `${pattern}_res`;
    }
}