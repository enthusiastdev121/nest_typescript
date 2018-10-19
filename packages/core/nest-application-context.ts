import {
  INestApplicationContext,
  Logger,
  LoggerService,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { UnknownModuleException } from './errors/exceptions/unknown-module.exception';
import { NestContainer } from './injector/container';
import { ContainerScanner } from './injector/container-scanner';
import { Module } from './injector/module';
import { ModuleTokenFactory } from './injector/module-token-factory';

export class NestApplicationContext implements INestApplicationContext {
  private readonly moduleTokenFactory = new ModuleTokenFactory();
  private readonly containerScanner: ContainerScanner;

  constructor(
    protected readonly container: NestContainer,
    private readonly scope: Type<any>[],
    private contextModule: Module,
  ) {
    this.containerScanner = new ContainerScanner(container);
  }

  public selectContextModule() {
    const modules = this.container.getModules().values();
    this.contextModule = modules.next().value;
  }

  public select<T>(module: Type<T>): INestApplicationContext {
    const modules = this.container.getModules();
    const moduleMetatype = this.contextModule.metatype;
    const scope = this.scope.concat(moduleMetatype);

    const token = this.moduleTokenFactory.create(module, scope);
    const selectedModule = modules.get(token);
    if (!selectedModule) {
      throw new UnknownModuleException();
    }
    return new NestApplicationContext(this.container, scope, selectedModule);
  }

  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    options: { strict: boolean } = { strict: false },
  ): TResult {
    if (!(options && options.strict)) {
      return this.find<TInput, TResult>(typeOrToken);
    }
    return this.findInstanceByPrototypeOrToken<TInput, TResult>(
      typeOrToken,
      this.contextModule,
    );
  }

  public async init(): Promise<this> {
    await this.callInitHook();
    await this.callBootstrapHook();
    return this;
  }

  public async close(): Promise<void> {
    await this.callDestroyHook();
  }

  public useLogger(logger: LoggerService) {
    Logger.overrideLogger(logger);
  }

  protected async callInitHook(): Promise<any> {
    const modulesContainer = this.container.getModules();
    for (const module of [...modulesContainer.values()].reverse()) {
      await this.callModuleInitHook(module);
    }
  }

  protected async callModuleInitHook(module: Module): Promise<any> {
    const components = [...module.components];
    // The Module (class) instance is the first element of the components array
    // Lifecycle hook has to be called once all classes are properly initialized
    const [_, { instance: moduleClassInstance }] = components.shift();
    const instances = [...module.routes, ...components];

    await Promise.all(
      iterate(instances)
        .map(([key, { instance }]) => instance)
        .filter(instance => !isNil(instance))
        .filter(this.hasOnModuleInitHook)
        .map(async instance => (instance as OnModuleInit).onModuleInit()),
    );
    if (moduleClassInstance && this.hasOnModuleInitHook(moduleClassInstance)) {
      await (moduleClassInstance as OnModuleInit).onModuleInit();
    }
  }

  protected hasOnModuleInitHook(instance: any): instance is OnModuleInit {
    return !isUndefined((instance as OnModuleInit).onModuleInit);
  }

  protected async callDestroyHook(): Promise<any> {
    const modulesContainer = this.container.getModules();
    for (const module of modulesContainer.values()) {
      await this.callModuleDestroyHook(module);
    }
  }

  protected async callModuleDestroyHook(module: Module): Promise<any> {
    const components = [...module.components];
    // The Module (class) instance is the first element of the components array
    // Lifecycle hook has to be called once all classes are properly destroyed
    const [_, { instance: moduleClassInstance }] = components.shift();
    const instances = [...module.routes, ...components];

    await Promise.all(
      iterate(instances)
        .map(([key, { instance }]) => instance)
        .filter(instance => !isNil(instance))
        .filter(this.hasOnModuleDestroyHook)
        .map(async instance => (instance as OnModuleDestroy).onModuleDestroy()),
    );
    if (
      moduleClassInstance &&
      this.hasOnModuleDestroyHook(moduleClassInstance)
    ) {
      await (moduleClassInstance as OnModuleDestroy).onModuleDestroy();
    }
  }

  protected hasOnModuleDestroyHook(instance): instance is OnModuleDestroy {
    return !isUndefined((instance as OnModuleDestroy).onModuleDestroy);
  }

  protected async callBootstrapHook(): Promise<any> {
    const modulesContainer = this.container.getModules();
    for (const module of [...modulesContainer.values()].reverse()) {
      await this.callModuleBootstrapHook(module);
    }
  }

  protected async callModuleBootstrapHook(module: Module): Promise<any> {
    const components = [...module.components];
    const [_, { instance: moduleClassInstance }] = components.shift();
    const instances = [...module.routes, ...components];

    await Promise.all(
      iterate(instances)
        .map(([key, { instance }]) => instance)
        .filter(instance => !isNil(instance))
        .filter(this.hasOnAppBotstrapHook)
        .map(async instance =>
          (instance as OnApplicationBootstrap).onApplicationBootstrap(),
        ),
    );
    if (moduleClassInstance && this.hasOnAppBotstrapHook(moduleClassInstance)) {
      await (moduleClassInstance as OnApplicationBootstrap).onApplicationBootstrap();
    }
  }

  protected hasOnAppBotstrapHook(
    instance: any,
  ): instance is OnApplicationBootstrap {
    return !isUndefined(
      (instance as OnApplicationBootstrap).onApplicationBootstrap,
    );
  }

  protected find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult {
    return this.containerScanner.find<TInput, TResult>(typeOrToken);
  }

  protected findInstanceByPrototypeOrToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | string | symbol,
    contextModule: Partial<Module>,
  ): TResult {
    return this.containerScanner.findInstanceByPrototypeOrToken<
      TInput,
      TResult
    >(metatypeOrToken, contextModule);
  }
}
