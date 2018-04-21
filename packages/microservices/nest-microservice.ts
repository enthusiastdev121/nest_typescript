import * as optional from 'optional';
import iterate from 'iterare';
import { NestContainer } from '@nestjs/core/injector/container';
import { MicroservicesModule } from './microservices-module';
import { messages } from '@nestjs/core/constants';
import { Logger } from '@nestjs/common/services/logger.service';
import { Server } from './server/server';
import { MicroserviceOptions } from './interfaces/microservice-configuration.interface';
import { ServerFactory } from './server/server-factory';
import { Transport } from './enums/transport.enum';
import {
  INestMicroservice,
  WebSocketAdapter,
  CanActivate,
  PipeTransform,
  NestInterceptor,
  ExceptionFilter,
  OnModuleInit,
} from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { CustomTransportStrategy } from '@nestjs/microservices';
import { Module } from '@nestjs/core/injector/module';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import { OnModuleDestroy } from '@nestjs/common/interfaces';
import { NestApplicationContext } from '@nestjs/core/nest-application-context';

const { SocketModule } =
  optional('@nestjs/websockets/socket-module') || ({} as any);
const { IoAdapter } =
  optional('@nestjs/websockets/adapters/io-adapter') || ({} as any);

export class NestMicroservice extends NestApplicationContext
  implements INestMicroservice {
  private readonly logger = new Logger(NestMicroservice.name, true);
  private readonly microservicesModule = new MicroservicesModule();
  private readonly socketModule = SocketModule ? new SocketModule() : null;
  private microserviceConfig: MicroserviceOptions;
  private server: Server & CustomTransportStrategy;
  private isTerminated = false;
  private isInitialized = false;
  private isInitHookCalled = false;

  constructor(
    container: NestContainer,
    config: MicroserviceOptions = {},
    private readonly applicationConfig: ApplicationConfig,
  ) {
    super(container, [], null);

    this.registerWsAdapter();
    this.microservicesModule.register(container, this.applicationConfig);
    this.createServer(config);
    this.selectContextModule();
  }

  public registerWsAdapter() {
    const ioAdapter = IoAdapter ? new IoAdapter() : null;
    this.applicationConfig.setIoAdapter(ioAdapter);
  }

  public createServer(config: MicroserviceOptions) {
    try {
      this.microserviceConfig = {
        transport: Transport.TCP,
        ...config,
      } as any;
      const { strategy } = config as any;
      this.server = strategy
        ? strategy
        : ServerFactory.create(this.microserviceConfig);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async registerModules(): Promise<any> {
    this.socketModule &&
      this.socketModule.register(this.container, this.applicationConfig);
    this.microservicesModule.setupClients(this.container);

    this.registerListeners();
    this.setIsInitialized(true);

    !this.isInitHookCalled && (await this.callInitHook());
  }

  public registerListeners() {
    this.microservicesModule.setupListeners(this.container, this.server);
  }

  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
    this.applicationConfig.setIoAdapter(adapter);
    return this;
  }

  public useGlobalFilters(...filters: ExceptionFilter[]): this {
    this.applicationConfig.useGlobalFilters(...filters);
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    this.applicationConfig.useGlobalPipes(...pipes);
    return this;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
    this.applicationConfig.useGlobalInterceptors(...interceptors);
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
    this.applicationConfig.useGlobalGuards(...guards);
    return this;
  }

  public listen(callback: () => void) {
    !this.isInitialized && this.registerModules();

    this.logger.log(messages.MICROSERVICE_READY);
    this.server.listen(callback);
  }

  public async listenAsync(): Promise<any> {
    return await new Promise(resolve => this.listen(resolve));
  }

  public async close(): Promise<any> {
    await this.server.close();
    !this.isTerminated && (await this.closeApplication());
  }

  public setIsInitialized(isInitialized: boolean) {
    this.isInitialized = isInitialized;
  }

  public setIsTerminated(isTerminaed: boolean) {
    this.isTerminated = isTerminaed;
  }

  public setIsInitHookCalled(isInitHookCalled: boolean) {
    this.isInitHookCalled = isInitHookCalled;
  }

  protected async closeApplication(): Promise<any> {
    this.socketModule && (await this.socketModule.close());
    await this.callDestroyHook();
    this.setIsTerminated(true);
  }

  protected async callInitHook(): Promise<any> {
    const modules = this.container.getModules();
    await Promise.all(
      iterate(modules.values()).map(
        async module => await this.callModuleInitHook(module),
      ),
    );
    this.setIsInitHookCalled(true);
  }

  protected async callModuleInitHook(module: Module): Promise<any> {
    const components = [...module.routes, ...module.components];
    await Promise.all(
      iterate(components)
        .map(([key, { instance }]) => instance)
        .filter(instance => !isNil(instance))
        .filter(this.hasOnModuleInitHook)
        .map(async instance => await (instance as OnModuleInit).onModuleInit()),
    );
  }

  protected hasOnModuleInitHook(instance: any): instance is OnModuleInit {
    return !isUndefined((instance as OnModuleInit).onModuleInit);
  }

  private async callDestroyHook(): Promise<any> {
    const modules = this.container.getModules();
    await Promise.all(
      iterate(modules.values()).map(
        async module => await this.callModuleDestroyHook(module),
      ),
    );
  }

  private async callModuleDestroyHook(module: Module): Promise<any> {
    const components = [...module.routes, ...module.components];
    await Promise.all(
      iterate(components)
        .map(([key, { instance }]) => instance)
        .filter(instance => !isNil(instance))
        .filter(this.hasOnModuleDestroyHook)
        .map(
          async instance =>
            await (instance as OnModuleDestroy).onModuleDestroy(),
        ),
    );
  }

  private hasOnModuleDestroyHook(instance): instance is OnModuleDestroy {
    return !isUndefined((instance as OnModuleDestroy).onModuleDestroy);
  }
}
