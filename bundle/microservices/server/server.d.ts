import { Logger } from '@nestjs/common/services/logger.service';
import { MessageHandlers } from '../interfaces/message-handlers.interface';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { WritePacket } from './../interfaces';
export declare abstract class Server {
    protected readonly messageHandlers: MessageHandlers;
    protected readonly logger: Logger;
    getHandlers(): MessageHandlers;
    getHandlerByPattern(pattern: string): (data) => Promise<Observable<any>> | null;
    add(pattern: any, callback: (data) => Promise<Observable<any>>): void;
    send(stream$: Observable<any>, respond: (data: WritePacket) => void): Subscription;
    transformToObservable(resultOrDeffered: any): any;
    protected handleError(error: string): void;
}
