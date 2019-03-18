import {
  CanActivate,
  ExceptionFilter,
  HttpServer,
  INestApplication,
  INestMicroservice,
  NestInterceptor,
  PipeTransform,
  WebSocketAdapter,
} from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isObject, validatePath } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import * as optional from 'optional';
import { AbstractHttpAdapter } from './adapters';
import { ApplicationConfig } from './application-config';
import { MESSAGES } from './constants';
import { NestContainer } from './injector/container';
import { Injector } from './injector/injector';
import { MiddlewareContainer } from './middleware/container';
import { MiddlewareModule } from './middleware/middleware-module';
import { NestApplicationContext } from './nest-application-context';
import { Resolver } from './router/interfaces/resolver.interface';
import { RoutesResolver } from './router/routes-resolver';

const { SocketModule } =
  optional('@nestjs/websockets/socket-module') || ({} as any);
const { MicroservicesModule } =
  optional('@nestjs/microservices/microservices-module') || ({} as any);

export class NestApplication extends NestApplicationContext
  implements INestApplication {
  private readonly logger = new Logger(NestApplication.name, true);
  private readonly injector = new Injector();
  private readonly middlewareModule = new MiddlewareModule();
  private readonly middlewareContainer = new MiddlewareContainer();
  private readonly microservicesModule = MicroservicesModule
    ? new MicroservicesModule()
    : null;
  private readonly socketModule = SocketModule ? new SocketModule() : null;
  private readonly routesResolver: Resolver;
  private readonly microservices: any[] = [];
  private httpServer: any;
  private isInitialized = false;

  constructor(
    container: NestContainer,
    private readonly httpAdapter: HttpServer,
    private readonly config: ApplicationConfig,
    private readonly appOptions: NestApplicationOptions = {},
  ) {
    super(container);

    this.applyOptions();
    this.selectContextModule();
    this.registerHttpServer();

    this.routesResolver = new RoutesResolver(
      this.container,
      this.config,
      this.injector,
    );
  }

  public getHttpAdapter(): AbstractHttpAdapter {
    return this.httpAdapter as AbstractHttpAdapter;
  }

  public registerHttpServer() {
    this.httpServer = this.createServer();
  }

  public getUnderlyingHttpServer<T>(): T {
    return this.httpAdapter.getHttpServer();
  }

  public applyOptions() {
    if (!this.appOptions || !this.appOptions.cors) {
      return undefined;
    }
    const isCorsOptionsObj = isObject(this.appOptions.cors);
    if (!isCorsOptionsObj) {
      return this.enableCors();
    }
    this.enableCors(this.appOptions.cors as CorsOptions);
  }

  public createServer<T = any>(): T {
    this.httpAdapter.initHttpServer(this.appOptions);
    return this.httpAdapter.getHttpServer() as T;
  }

  public async registerModules() {
    this.registerWsModule();

    if (this.microservicesModule) {
      this.microservicesModule.register(this.container, this.config);
      this.microservicesModule.setupClients(this.container);
    }
    await this.middlewareModule.register(
      this.middlewareContainer,
      this.container,
      this.config,
      this.injector,
    );
  }

  public registerWsModule() {
    if (!this.socketModule) {
      return;
    }
    this.socketModule.register(this.container, this.config, this.httpServer);
  }

  public async init(): Promise<this> {
    const useBodyParser =
      this.appOptions && this.appOptions.bodyParser !== false;
    useBodyParser && this.registerParserMiddleware();

    await this.registerModules();
    await this.registerRouter();
    await this.callInitHook();
    await this.registerRouterHooks();
    await this.callBootstrapHook();

    this.isInitialized = true;
    this.logger.log(MESSAGES.APPLICATION_READY);
    return this;
  }

  public registerParserMiddleware() {
    this.httpAdapter.registerParserMiddleware();
  }

  public async registerRouter() {
    await this.registerMiddleware(this.httpAdapter);

    const prefix = this.config.getGlobalPrefix();
    const basePath = validatePath(prefix);
    this.routesResolver.resolve(this.httpAdapter, basePath);
  }

  public async registerRouterHooks() {
    this.routesResolver.registerNotFoundHandler();
    this.routesResolver.registerExceptionHandler();
  }

  public connectMicroservice(options: MicroserviceOptions): INestMicroservice {
    const { NestMicroservice } = loadPackage(
      '@nestjs/microservices',
      'NestFactory',
      () => require('@nestjs/microservices'),
    );

    const applicationConfig = new ApplicationConfig();
    const instance = new NestMicroservice(
      this.container,
      options,
      applicationConfig,
    );
    instance.registerListeners();
    instance.setIsInitialized(true);
    instance.setIsInitHookCalled(true);

    this.microservices.push(instance);
    return instance;
  }

  public getMicroservices(): INestMicroservice[] {
    return this.microservices;
  }

  public getHttpServer() {
    return this.httpServer;
  }

  public startAllMicroservices(callback?: () => void): this {
    Promise.all(this.microservices.map(this.listenToPromise)).then(
      () => callback && callback(),
    );
    return this;
  }

  public startAllMicroservicesAsync(): Promise<void> {
    return new Promise(resolve => this.startAllMicroservices(resolve));
  }

  public use(...args: [any, any?]): this {
    this.httpAdapter.use(...args);
    return this;
  }

  public enableCors(options?: CorsOptions): this {
    this.httpAdapter.enableCors(options);
    return this;
  }

  public async listen(
    port: number | string,
    callback?: () => void,
  ): Promise<any>;
  public async listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  ): Promise<any>;
  public async listen(port: number | string, ...args: any[]): Promise<any> {
    !this.isInitialized && (await this.init());

    this.httpAdapter.listen(port, ...args);
    return this.httpServer;
  }

  public listenAsync(port: number | string, hostname?: string): Promise<any> {
    return new Promise(resolve => {
      const server: any = this.listen(port, hostname, () => resolve(server));
    });
  }

  public async close(): Promise<any> {
    this.socketModule && (await this.socketModule.close());
    this.httpAdapter && this.httpAdapter.close();

    await Promise.all(
      iterate(this.microservices).map(async microservice => {
        microservice.setIsTerminated(true);
        await microservice.close();
      }),
    );
    await super.close();
  }

  public setGlobalPrefix(prefix: string): this {
    this.config.setGlobalPrefix(prefix);
    return this;
  }

  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
    this.config.setIoAdapter(adapter);
    return this;
  }

  public useGlobalFilters(...filters: ExceptionFilter[]): this {
    this.config.useGlobalFilters(...filters);
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    this.config.useGlobalPipes(...pipes);
    return this;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
    this.config.useGlobalInterceptors(...interceptors);
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
    this.config.useGlobalGuards(...guards);
    return this;
  }

  public useStaticAssets(options: any): this;
  public useStaticAssets(path: string, options?: any): this;
  public useStaticAssets(pathOrOptions: any, options?: any): this {
    this.httpAdapter.useStaticAssets &&
      this.httpAdapter.useStaticAssets(pathOrOptions, options);
    return this;
  }

  public setBaseViewsDir(path: string | string[]): this {
    this.httpAdapter.setBaseViewsDir && this.httpAdapter.setBaseViewsDir(path);
    return this;
  }

  public setViewEngine(engineOrOptions: any): this {
    this.httpAdapter.setViewEngine &&
      this.httpAdapter.setViewEngine(engineOrOptions);
    return this;
  }

  private async registerMiddleware(instance: any) {
    await this.middlewareModule.registerMiddleware(
      this.middlewareContainer,
      instance,
    );
  }

  private listenToPromise(microservice: INestMicroservice) {
    return new Promise(async (resolve, reject) => {
      await microservice.listen(resolve);
    });
  }
}
