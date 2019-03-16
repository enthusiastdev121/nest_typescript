import {
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  PARAMTYPES_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import {
  isFunction,
  isNil,
  isObject,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { UndefinedDependencyException } from '../errors/exceptions/undefined-dependency.exception';
import { UnknownDependenciesException } from '../errors/exceptions/unknown-dependencies.exception';
import { STATIC_CONTEXT } from './constants';
import {
  ContextId,
  InstancePerContext,
  InstanceWrapper,
  PropertyMetadata,
} from './instance-wrapper';
import { Module } from './module';

/**
 * The type of an injectable dependency
 */
export type InjectorDependency = Type<any> | Function | string | symbol;

/**
 * The property-based dependency
 */
export interface PropertyDependency {
  key: string;
  name: InjectorDependency;
  isOptional?: boolean;
  instance?: any;
}

/**
 * Context of a dependency which gets injected by
 * the injector
 */
export interface InjectorDependencyContext {
  /**
   * The name of the property key (property-based injection)
   */
  key?: string | symbol;
  /**
   * The name of the function or injection token
   */
  name?: string;
  /**
   * The index of the dependency which gets injected
   * from the dependencies array
   */
  index?: number;
  /**
   * The dependency array which gets injected
   */
  dependencies?: InjectorDependency[];
}

export class Injector {
  public async loadMiddleware(
    wrapper: InstanceWrapper,
    collection: Map<string, InstanceWrapper>,
    module: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const { metatype } = wrapper;
    const targetWrapper = collection.get(metatype.name);
    if (!isUndefined(targetWrapper.instance)) {
      return;
    }
    const loadInstance = (instances: any[]) => {
      targetWrapper.instance = targetWrapper.isDependencyTreeStatic()
        ? new metatype(...instances)
        : Object.create(metatype);
    };
    await this.resolveConstructorParams(
      wrapper,
      module,
      null,
      loadInstance,
      contextId,
      inquirer,
    );
  }

  public async loadController(
    wrapper: InstanceWrapper<Controller>,
    module: Module,
    contextId = STATIC_CONTEXT,
  ) {
    const controllers = module.controllers;
    await this.loadInstance<Controller>(
      wrapper,
      controllers,
      module,
      contextId,
      wrapper,
    );
    await this.loadEnhancersPerContext(wrapper, module, contextId, wrapper);
  }

  public async loadInjectable(
    wrapper: InstanceWrapper<Controller>,
    module: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const injectables = module.injectables;
    await this.loadInstance<Controller>(
      wrapper,
      injectables,
      module,
      contextId,
      inquirer,
    );
  }

  public async loadProvider(
    wrapper: InstanceWrapper<Injectable>,
    module: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const providers = module.providers;
    await this.loadInstance<Injectable>(
      wrapper,
      providers,
      module,
      contextId,
      inquirer,
    );
    await this.loadEnhancersPerContext(wrapper, module, contextId, wrapper);
  }

  public loadPrototype<T>(
    { name }: InstanceWrapper<T>,
    collection: Map<string, InstanceWrapper<T>>,
    contextId = STATIC_CONTEXT,
  ) {
    if (!collection) {
      return;
    }
    const target = collection.get(name);
    const instance = target.createPrototype(contextId);
    if (instance) {
      const wrapper = new InstanceWrapper({
        ...target,
        instance,
      });
      collection.set(name, wrapper);
    }
  }

  public applyDoneHook<T>(wrapper: InstancePerContext<T>): () => void {
    let done: () => void;
    wrapper.donePromise = new Promise<void>((resolve, reject) => {
      done = resolve;
    });
    wrapper.isPending = true;
    return done;
  }

  public async loadInstance<T>(
    wrapper: InstanceWrapper<T>,
    collection: Map<string, InstanceWrapper>,
    module: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = wrapper.getInstanceByContextId(contextId, inquirerId);
    if (instanceHost.isPending) {
      return instanceHost.donePromise;
    }
    const done = this.applyDoneHook(instanceHost);
    const { name, inject } = wrapper;

    const targetWrapper = collection.get(name);
    if (isUndefined(targetWrapper)) {
      throw new RuntimeException();
    }
    if (instanceHost.isResolved) {
      return;
    }
    const callback = async (instances: any[]) => {
      const properties = await this.resolveProperties(
        wrapper,
        module,
        inject,
        contextId,
        wrapper,
      );
      const instance = await this.instantiateClass(
        instances,
        wrapper,
        targetWrapper,
        contextId,
        inquirer,
      );
      this.applyProperties(instance, properties);
      done();
    };
    await this.resolveConstructorParams<T>(
      wrapper,
      module,
      inject,
      callback,
      contextId,
      wrapper,
    );
  }

  public async resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    module: Module,
    inject: InjectorDependency[],
    callback: (args: any[]) => void,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const inquirerId = this.getInquirerId(inquirer);
    const metadata = wrapper.getCtorMetadata();
    if (metadata && contextId !== STATIC_CONTEXT) {
      const deps = await this.loadCtorMetadata(metadata, contextId, inquirer);
      return callback(deps);
    }
    const dependencies = isNil(inject)
      ? this.reflectConstructorParams(wrapper.metatype)
      : inject;
    const optionalDependenciesIds = isNil(inject)
      ? this.reflectOptionalParams(wrapper.metatype)
      : [];

    let isResolved = true;
    const resolveParam = async (param, index) => {
      try {
        const paramWrapper = await this.resolveSingleParam<T>(
          wrapper,
          param,
          { index, dependencies },
          module,
          contextId,
          inquirer,
        );
        const instanceHost = paramWrapper.getInstanceByContextId(
          contextId,
          inquirerId,
        );
        if (!instanceHost.isResolved && !paramWrapper.forwardRef) {
          isResolved = false;
        }
        wrapper.addCtorMetadata(index, paramWrapper);
        return instanceHost && instanceHost.instance;
      } catch (err) {
        const isOptional = optionalDependenciesIds.includes(index);
        if (!isOptional) {
          throw err;
        }
        return undefined;
      }
    };
    const instances = await Promise.all(dependencies.map(resolveParam));
    isResolved && (await callback(instances));
  }

  public reflectConstructorParams<T>(type: Type<T>): any[] {
    const paramtypes = Reflect.getMetadata(PARAMTYPES_METADATA, type) || [];
    const selfParams = this.reflectSelfParams<T>(type);

    selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
    return paramtypes;
  }

  public reflectOptionalParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(OPTIONAL_DEPS_METADATA, type) || [];
  }

  public reflectSelfParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) || [];
  }

  public async resolveSingleParam<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | any,
    dependencyContext: InjectorDependencyContext,
    module: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    if (isUndefined(param)) {
      throw new UndefinedDependencyException(
        wrapper.name,
        dependencyContext,
        module,
      );
    }
    const token = this.resolveParamToken(wrapper, param);
    return this.resolveComponentInstance<T>(
      module,
      isFunction(token) ? (token as Type<any>).name : token,
      dependencyContext,
      wrapper,
      contextId,
      inquirer,
    );
  }

  public resolveParamToken<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | any,
  ) {
    if (!param.forwardRef) {
      return param;
    }
    wrapper.forwardRef = true;
    return param.forwardRef();
  }

  public async resolveComponentInstance<T>(
    module: Module,
    name: any,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<InstanceWrapper> {
    const providers = module.providers;
    const instanceWrapper = await this.lookupComponent(
      providers,
      module,
      { ...dependencyContext, name },
      wrapper,
      contextId,
      inquirer,
    );
    return this.resolveComponentHost(
      module,
      instanceWrapper,
      contextId,
      inquirer,
    );
  }

  public async resolveComponentHost<T>(
    module: Module,
    instanceWrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<InstanceWrapper> {
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = instanceWrapper.getInstanceByContextId(
      contextId,
      inquirerId,
    );
    if (!instanceHost.isResolved && !instanceWrapper.forwardRef) {
      await this.loadProvider(instanceWrapper, module, contextId, inquirer);
    } else if (
      !instanceHost.isResolved &&
      instanceWrapper.forwardRef &&
      (contextId !== STATIC_CONTEXT || !!inquirerId)
    ) {
      /**
       * When circular dependency has been detected between
       * either request/transient providers, we have to asynchronously
       * resolve instance host for a specific contextId or inquirer, to ensure
       * that eventual lazily created instance will be merged with the prototype
       * instantiated beforehand.
       */
      instanceHost.donePromise &&
        instanceHost.donePromise.then(() =>
          this.loadProvider(instanceWrapper, module, contextId, inquirer),
        );
    }
    if (instanceWrapper.async) {
      const host = instanceWrapper.getInstanceByContextId(
        contextId,
        inquirerId,
      );
      host.instance = await host.instance;
      instanceWrapper.setInstanceByContextId(contextId, host, inquirerId);
    }
    return instanceWrapper;
  }

  public async lookupComponent<T = any>(
    providers: Map<string, InstanceWrapper>,
    module: Module,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<InstanceWrapper<T>> {
    const { name } = dependencyContext;
    const scanInExports = () =>
      this.lookupComponentInExports(
        dependencyContext,
        module,
        wrapper,
        contextId,
        inquirer,
      );
    return providers.has(name) ? providers.get(name) : scanInExports();
  }

  public async lookupComponentInExports<T = any>(
    dependencyContext: InjectorDependencyContext,
    module: Module,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const instanceWrapper = await this.lookupComponentInImports(
      module,
      dependencyContext.name,
      wrapper,
      [],
      contextId,
      inquirer,
    );
    if (isNil(instanceWrapper)) {
      throw new UnknownDependenciesException(
        wrapper.name,
        dependencyContext,
        module,
      );
    }
    return instanceWrapper;
  }

  public async lookupComponentInImports(
    module: Module,
    name: any,
    wrapper: InstanceWrapper,
    moduleRegistry: any[] = [],
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<any> {
    let instanceWrapperRef: InstanceWrapper = null;

    const imports = module.imports || new Set<Module>();
    const children = [...imports.values()].filter(item => item);

    for (const relatedModule of children) {
      if (moduleRegistry.includes(relatedModule.id)) {
        continue;
      }
      moduleRegistry.push(relatedModule.id);
      const { providers, exports } = relatedModule;
      if (!exports.has(name) || !providers.has(name)) {
        const instanceRef = await this.lookupComponentInImports(
          relatedModule,
          name,
          wrapper,
          moduleRegistry,
          contextId,
          inquirer,
        );
        if (instanceRef) {
          return instanceRef;
        }
        continue;
      }
      instanceWrapperRef = providers.get(name);

      const inquirerId = this.getInquirerId(inquirer);
      const instanceHost = instanceWrapperRef.getInstanceByContextId(
        contextId,
        inquirerId,
      );
      if (!instanceHost.isResolved && !instanceWrapperRef.forwardRef) {
        await this.loadProvider(
          instanceWrapperRef,
          relatedModule,
          contextId,
          wrapper,
        );
        break;
      }
    }
    return instanceWrapperRef;
  }

  public async resolveProperties<T>(
    wrapper: InstanceWrapper<T>,
    module: Module,
    inject?: InjectorDependency[],
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<PropertyDependency[]> {
    if (!isNil(inject)) {
      return [];
    }
    const metadata = wrapper.getPropertiesMetadata();
    if (metadata && contextId !== STATIC_CONTEXT) {
      return this.loadPropertiesMetadata(metadata, contextId, inquirer);
    }
    const properties = this.reflectProperties(wrapper.metatype);
    const instances = await Promise.all(
      properties.map(async (item: PropertyDependency) => {
        try {
          const dependencyContext = {
            key: item.key,
            name: item.name as string,
          };
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            item.name,
            dependencyContext,
            module,
            contextId,
            inquirer,
          );
          if (!paramWrapper) {
            return undefined;
          }
          wrapper.addPropertiesMetadata(item.key, paramWrapper);

          const inquirerId = this.getInquirerId(inquirer);
          const instanceHost = paramWrapper.getInstanceByContextId(
            contextId,
            inquirerId,
          );
          return instanceHost.instance;
        } catch (err) {
          if (!item.isOptional) {
            throw err;
          }
          return undefined;
        }
      }),
    );
    return properties.map((item: PropertyDependency, index: number) => ({
      ...item,
      instance: instances[index],
    }));
  }

  public reflectProperties<T>(type: Type<T>): PropertyDependency[] {
    const properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, type) || [];
    const optionalKeys: string[] =
      Reflect.getMetadata(OPTIONAL_PROPERTY_DEPS_METADATA, type) || [];

    return properties.map((item: any) => ({
      ...item,
      name: item.type,
      isOptional: optionalKeys.includes(item.key),
    }));
  }

  public applyProperties<T = any>(
    instance: T,
    properties: PropertyDependency[],
  ): void {
    if (!isObject(instance)) {
      return undefined;
    }
    properties
      .filter(item => !isNil(item.instance))
      .forEach(item => (instance[item.key] = item.instance));
  }

  public async instantiateClass<T = any>(
    instances: any[],
    wrapper: InstanceWrapper,
    targetMetatype: InstanceWrapper,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<T> {
    const { metatype, inject } = wrapper;
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = targetMetatype.getInstanceByContextId(
      contextId,
      inquirerId,
    );
    const isStatic = wrapper.isStatic(contextId, inquirer);
    const isInRequestScope = wrapper.isInRequestScope(contextId, inquirer);
    const isLazyTransient = wrapper.isLazyTransient(contextId, inquirer);
    const isInContext = isStatic || isInRequestScope || isLazyTransient;

    if (isNil(inject) && isInContext) {
      const targetInstance = wrapper.getInstanceByContextId(
        contextId,
        inquirerId,
      );

      targetInstance.instance = wrapper.forwardRef
        ? Object.assign(targetInstance.instance, new metatype(...instances))
        : new metatype(...instances);
    } else if (isInContext) {
      const factoryReturnValue = ((targetMetatype.metatype as any) as Function)(
        ...instances,
      );
      instanceHost.instance = await factoryReturnValue;
    }
    instanceHost.isResolved = true;
    return instanceHost.instance;
  }

  public async loadPerContext<T = any>(
    instance: T,
    module: Module,
    collection: Map<string, InstanceWrapper>,
    ctx: ContextId,
  ): Promise<T> {
    const wrapper = collection.get(
      instance.constructor && instance.constructor.name,
    );
    await this.loadInstance(wrapper, collection, module, ctx, wrapper);
    await this.loadEnhancersPerContext(wrapper, module, ctx, wrapper);

    const host = wrapper.getInstanceByContextId(ctx);
    return host && (host.instance as T);
  }

  public async loadEnhancersPerContext(
    wrapper: InstanceWrapper,
    module: Module,
    ctx: ContextId,
    inquirer?: InstanceWrapper,
  ) {
    const enhancers = wrapper.getEnhancersMetadata() || [];
    const loadEnhancer = (item: InstanceWrapper) =>
      this.loadInstance(item, module.injectables, module, ctx, inquirer);
    await Promise.all(enhancers.map(loadEnhancer));
  }

  public async loadCtorMetadata(
    metadata: InstanceWrapper<any>[],
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): Promise<any[]> {
    const hosts = await Promise.all(
      metadata.map(async item =>
        this.resolveComponentHost(item.host, item, contextId, inquirer),
      ),
    );
    const inquirerId = this.getInquirerId(inquirer);
    return hosts.map(
      item => item.getInstanceByContextId(contextId, inquirerId).instance,
    );
  }

  public async loadPropertiesMetadata(
    metadata: PropertyMetadata[],
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): Promise<PropertyDependency[]> {
    const dependenciesHosts = await Promise.all(
      metadata.map(async ({ wrapper: item, key }) => ({
        key,
        host: await this.resolveComponentHost(
          item.host,
          item,
          contextId,
          inquirer,
        ),
      })),
    );
    const inquirerId = this.getInquirerId(inquirer);
    return dependenciesHosts.map(({ key, host }) => ({
      key,
      name: key,
      instance: host.getInstanceByContextId(contextId, inquirerId).instance,
    }));
  }

  private getInquirerId(inquirer: InstanceWrapper | undefined): string {
    return inquirer && inquirer.id;
  }
}
