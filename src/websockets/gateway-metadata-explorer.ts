import {isFunction, isUndefined} from '@nestjs/common/utils/shared.utils';
import {MetadataScanner} from '@nestjs/core/metadata-scanner';
import {Observable} from 'rxjs/Observable';

import {
  GATEWAY_SERVER_METADATA,
  MESSAGE_MAPPING_METADATA,
  MESSAGE_METADATA
} from './constants';
import {NestGateway} from './interfaces/nest-gateway.interface';

export class GatewayMetadataExplorer {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public explore(instance: NestGateway): MessageMappingProperties[] {
    const instancePrototype = Object.getPrototypeOf(instance);
    return this.metadataScanner
        .scanFromPrototype<NestGateway, MessageMappingProperties>(
            instance,
            instancePrototype,
            (method) => this.exploreMethodMetadata(instancePrototype, method),
        );
  }

  public exploreMethodMetadata(instancePrototype,
                               methodName: string): MessageMappingProperties {
    const callback = instancePrototype[methodName];
    const isMessageMapping =
        Reflect.getMetadata(MESSAGE_MAPPING_METADATA, callback);

    if (isUndefined(isMessageMapping)) {
      return null;
    }
    const message = Reflect.getMetadata(MESSAGE_METADATA, callback);
    return {
      callback,
      message,
    };
  }

  public * scanForServerHooks(instance: NestGateway): IterableIterator<string> {
    for (const propertyKey in instance) {
      if (isFunction(propertyKey))
        continue;

      const property = String(propertyKey);
      const isServer =
          Reflect.getMetadata(GATEWAY_SERVER_METADATA, instance, property);
      if (isUndefined(isServer))
        continue;

      yield property;
    }
  }
}

export interface MessageMappingProperties {
  message: string;
  callback: (...args) => Observable<any>| Promise<any>| void;
}