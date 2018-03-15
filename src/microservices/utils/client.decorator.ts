import 'reflect-metadata';
import { CLIENT_CONFIGURATION_METADATA, CLIENT_METADATA } from '../constants';
import { ClientOptions } from '../interfaces/client-metadata.interface';

/**
 * Attaches the `ClientProxy` instance to the given property
 *
 * @param  {ClientOptions} metadata Optional client metadata
 * ```
 * transport?: Transport;
 * url?: string;
 * port?: number;
 * host?: string;
 */
export const Client = (metadata?: ClientOptions) => {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.set(target, propertyKey, null);
    Reflect.defineMetadata(CLIENT_METADATA, true, target, propertyKey);
    Reflect.defineMetadata(
      CLIENT_CONFIGURATION_METADATA,
      metadata,
      target,
      propertyKey,
    );
  };
};
