import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction, isString } from '@nestjs/common/utils/shared.utils';
import {
  EMPTY as empty,
  from as fromPromise,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  MessageHandler,
  MicroserviceOptions,
  ReadPacket,
  WritePacket,
} from '../interfaces';
import { NO_EVENT_HANDLER } from './../constants';

export abstract class Server {
  protected readonly messageHandlers = new Map<string, MessageHandler>();
  protected readonly logger = new Logger(Server.name);

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
  ) {
    const key = isString(pattern) ? pattern : JSON.stringify(pattern);
    callback.isEventHandler = isEventHandler;
    this.messageHandlers.set(key, callback);
  }

  public getHandlers(): Map<string, MessageHandler> {
    return this.messageHandlers;
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    return this.messageHandlers.has(pattern)
      ? this.messageHandlers.get(pattern)
      : null;
  }

  public send(
    stream$: Observable<any>,
    respond: (data: WritePacket) => void,
  ): Subscription {
    return stream$
      .pipe(
        catchError((err: any) => {
          respond({ err, response: null });
          return empty;
        }),
        finalize(() => respond({ isDisposed: true })),
      )
      .subscribe((response: any) => respond({ err: null, response }));
  }

  public async handleEvent(pattern: string, packet: ReadPacket): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER);
    }
    await handler(packet.data);
  }

  public transformToObservable<T = any>(resultOrDeffered: any): Observable<T> {
    if (resultOrDeffered instanceof Promise) {
      return fromPromise(resultOrDeffered);
    } else if (!(resultOrDeffered && isFunction(resultOrDeffered.subscribe))) {
      return of(resultOrDeffered);
    }
    return resultOrDeffered;
  }

  public getOptionsProp<
    T extends MicroserviceOptions['options'],
    K extends keyof T
  >(obj: T, prop: K, defaultValue: T[K] = undefined) {
    return (obj && obj[prop]) || defaultValue;
  }

  protected handleError(error: string) {
    this.logger.error(error);
  }

  protected loadPackage<T = any>(
    name: string,
    ctx: string,
    loader?: Function,
  ): T {
    return loadPackage(name, ctx, loader);
  }
}
