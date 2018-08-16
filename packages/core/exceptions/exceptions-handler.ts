import { HttpException, HttpServer } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { InvalidExceptionFilterException } from '../errors/exceptions/invalid-exception-filter.exception';
import { BaseExceptionFilter } from './base-exception-filter';

export class ExceptionsHandler extends BaseExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  constructor(applicationRef: HttpServer) {
    super(applicationRef);
  }

  public next(exception: Error | HttpException | any, ctx: ArgumentsHost) {
    if (this.invokeCustomFilters(exception, ctx)) {
      return void 0;
    }
    super.catch(exception, ctx);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters(exception, response): boolean {
    if (isEmpty(this.filters)) return false;

    const filter = this.filters.find(({ exceptionMetatypes, func }) => {
      const hasMetatype =
        !exceptionMetatypes.length ||
        exceptionMetatypes.some(
          ExceptionMetatype => exception instanceof ExceptionMetatype,
        );
      return hasMetatype;
    });
    filter && filter.func(exception, response);
    return !!filter;
  }
}
