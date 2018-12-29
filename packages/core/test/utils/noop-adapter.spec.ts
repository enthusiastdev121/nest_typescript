import { RequestMethod } from '@nestjs/common';
import { AbstractHttpAdapter } from '../../adapters';

export class NoopHttpAdapter extends AbstractHttpAdapter {
  constructor(instance: any) {
    super(instance);
  }
  close(): any {}
  initHttpServer(options: any): any {}
  useStaticAssets(...args: any[]): any {}
  setViewEngine(engine: string): any {}
  getRequestMethod(request: any): any {}
  getRequestUrl(request: any): any {}
  reply(response: any, body: any, statusCode: number): any {}
  render(response: any, view: string, options: any): any {}
  setErrorHandler(handler: Function): any {}
  setNotFoundHandler(handler: Function): any {}
  setHeader(response: any, name: string, value: string): any {}
  registerParserMiddleware(): any {}
  enableCors(options: any): any {}
  createMiddlewareFactory(requestMethod: RequestMethod): any {}
}
