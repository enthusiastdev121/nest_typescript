import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { isNil, isString } from '@nestjs/common/utils/shared.utils';
import {
  defer,
  fromEvent,
  merge,
  Observable,
  Observer,
  throwError as _throw,
} from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import { CONNECT_EVENT, ERROR_EVENT } from '../constants';
import { InvalidMessageException } from '../errors/invalid-message.exception';
import {
  ClientOptions,
  PacketId,
  ReadPacket,
  WritePacket,
} from '../interfaces';

export abstract class ClientProxy {
  public abstract connect(): Promise<any>;
  public abstract close(): any;

  protected routingMap = new Map<string, Function>();

  public send<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(new InvalidMessageException());
    }
    return defer(async () => this.connect()).pipe(
      mergeMap(
        () =>
          new Observable((observer: Observer<TResult>) => {
            const callback = this.createObserver(observer);
            return this.publish({ pattern, data }, callback);
          }),
      ),
    );
  }

  public emit<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(new InvalidMessageException());
    }
    return defer(async () => this.connect()).pipe(
      mergeMap(() => this.dispatchEvent({ pattern, data })),
    );
  }

  protected abstract publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): Function;

  protected abstract dispatchEvent<T = any>(packet: ReadPacket): Promise<T>;

  protected createObserver<T>(
    observer: Observer<T>,
  ): (packet: WritePacket) => void {
    return ({ err, response, isDisposed }: WritePacket) => {
      if (err) {
        return observer.error(err);
      } else if (isDisposed) {
        return observer.complete();
      }
      observer.next(response);
    };
  }

  protected assignPacketId(packet: ReadPacket): ReadPacket & PacketId {
    const id = randomStringGenerator();
    return Object.assign(packet, { id });
  }

  protected connect$(
    instance: any,
    errorEvent = ERROR_EVENT,
    connectEvent = CONNECT_EVENT,
  ): Observable<any> {
    const error$ = fromEvent(instance, errorEvent).pipe(
      map((err: any) => {
        throw err;
      }),
    );
    const connect$ = fromEvent(instance, connectEvent);
    return merge(error$, connect$).pipe(take(1));
  }

  protected getOptionsProp<
    T extends ClientOptions['options'],
    K extends keyof T
  >(obj: T, prop: K, defaultValue: T[K] = undefined) {
    return (obj && obj[prop]) || defaultValue;
  }

  protected normalizePattern<T = any>(pattern: T): string {
    return (isString(pattern) ? pattern : JSON.stringify(pattern)) as string;
  }
}
