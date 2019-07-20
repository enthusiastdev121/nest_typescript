import { HttpServer } from '@nestjs/common';
import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '../application-config';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { RouterProxyCallback } from './router-proxy';

export class RouterExceptionFilters extends BaseExceptionFilterContext {
  constructor(
    container: NestContainer,
    private readonly config: ApplicationConfig,
    private readonly applicationRef: HttpServer,
  ) {
    super(container);
  }

  public create(
    instance: Controller,
    callback: RouterProxyCallback,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExceptionsHandler {
    this.moduleContext = module;

    const exceptionHandler = new ExceptionsHandler(this.applicationRef);
    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
      contextId,
      inquirerId,
    );
    if (isEmpty(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends any[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    const globalFilters = this.config.getGlobalFilters() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalFilters;
    }
    const scopedFilterWrappers = this.config.getGlobalRequestFilters() as InstanceWrapper[];
    const scopedFilters = scopedFilterWrappers
      .map(wrapper => wrapper.getInstanceByContextId(contextId, inquirerId))
      .filter(host => host)
      .map(host => host.instance);

    return globalFilters.concat(scopedFilters) as T;
  }
}
