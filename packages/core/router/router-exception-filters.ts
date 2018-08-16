import { HttpServer } from '@nestjs/common';
import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import 'reflect-metadata';
import { ApplicationConfig } from '../application-config';
import { BaseExceptionFilterContext } from '../exceptions/base-exception-filter-context';
import { ExceptionsHandler } from '../exceptions/exceptions-handler';
import { NestContainer } from '../injector/container';
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
  ): ExceptionsHandler {
    this.moduleContext = module;

    const exceptionHandler = new ExceptionsHandler(this.applicationRef);
    const filters = this.createContext(
      instance,
      callback,
      EXCEPTION_FILTERS_METADATA,
    );
    if (isEmpty(filters)) {
      return exceptionHandler;
    }
    exceptionHandler.setCustomFilters(filters.reverse());
    return exceptionHandler;
  }

  public getGlobalMetadata<T extends any[]>(): T {
    return this.config.getGlobalFilters() as T;
  }
}
