import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class NotFoundException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Found') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.NOT_FOUND),
      HttpStatus.NOT_FOUND,
    );
  }
}
