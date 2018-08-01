import { OPTIONAL_DEPS_METADATA, PARAMTYPES_METADATA, SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isFunction, isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import 'reflect-metadata';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { UndefinedDependencyException } from '../errors/exceptions/undefined-dependency.exception';
import { UnknownDependenciesException } from '../errors/exceptions/unknown-dependencies.exception';
import { MiddlewareWrapper } from '../middleware/container';
import { InstanceWrapper } from './container';
import { Module } from './module';

/**
 * The type of an injectable dependency
 */
export type InjectorDependency = Type<any> | Function | string;

/**
 * Context of a dependency which gets injected by
 * the injector
 */
export interface InjectorDependencyContext {
  /**
   * The name of the function or injection token
   */
  name?: string;
  /**
   * The index of the dependency which gets injected
   * from the dependencies array
   */
  index: number;
  /**
   * The dependency array which gets injected
   */
  dependencies: InjectorDependency[];
}

export class Injector {
  public async loadInstanceOfMiddleware(
    wrapper: MiddlewareWrapper,
    collection: Map<string, MiddlewareWrapper>,
    module: Module,
  ) {
    const { metatype } = wrapper;
    const currentMetatype = collection.get(metatype.name);
    if (currentMetatype.instance !== null) return;

    await this.resolveConstructorParams(
      wrapper as any,
      module,
      null,
      instances => {
        collection.set(metatype.name, {
          instance: new metatype(...instances),
          metatype,
        });
      },
    );
  }

  public async loadInstanceOfRoute(
    wrapper: InstanceWrapper<Controller>,
    module: Module,
  ) {
    const routes = module.routes;
    await this.loadInstance<Controller>(wrapper, routes, module);
  }

  public async loadInstanceOfInjectable(
    wrapper: InstanceWrapper<Controller>,
    module: Module,
  ) {
    const injectables = module.injectables;
    await this.loadInstance<Controller>(wrapper, injectables, module);
  }

  public loadPrototypeOfInstance<T>(
    { metatype, name }: InstanceWrapper<T>,
    collection: Map<string, InstanceWrapper<T>>,
  ) {
    if (!collection) return null;

    const target = collection.get(name);
    if (target.isResolved || !isNil(target.inject) || !metatype.prototype)
      return null;

    collection.set(name, {
      ...collection.get(name),
      instance: Object.create(metatype.prototype),
    });
  }

  public async loadInstanceOfComponent(
    wrapper: InstanceWrapper<Injectable>,
    module: Module,
  ) {
    const components = module.components;
    await this.loadInstance<Injectable>(wrapper, components, module);
  }

  public applyDoneHook<T>(wrapper: InstanceWrapper<T>): () => void {
    let done: () => void;
    wrapper.done$ = new Promise<void>((resolve, reject) => {
      done = resolve;
    });
    wrapper.isPending = true;
    return done;
  }

  public async loadInstance<T>(
    wrapper: InstanceWrapper<T>,
    collection,
    module: Module,
  ) {
    if (wrapper.isPending) {
      return await wrapper.done$;
    }
    const done = this.applyDoneHook(wrapper);
    const { metatype, name, inject } = wrapper;
    const currentMetatype = collection.get(name);
    if (isUndefined(currentMetatype)) {
      throw new RuntimeException();
    }
    if (currentMetatype.isResolved) {
      return void 0;
    }

    await this.resolveConstructorParams<T>(
      wrapper,
      module,
      inject,
      async instances => {
        if (isNil(inject)) {
          currentMetatype.instance = Object.assign(
            currentMetatype.instance,
            new metatype(...instances),
          );
        } else {
          const factoryResult = currentMetatype.metatype(...instances);
          currentMetatype.instance = await this.resolveFactoryInstance(
            factoryResult,
          );
        }
        currentMetatype.isResolved = true;
        done();
      },
    );
  }

  public async resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    module: Module,
    inject: InjectorDependency[],
    callback: (args) => void,
  ) {
    let isResolved = true;

    const dependencies = isNil(inject)
      ? this.reflectConstructorParams(wrapper.metatype)
      : inject;
    const optionalDependenciesIds = isNil(inject)
      ? this.reflectOptionalParams(wrapper.metatype)
      : [];

    const instances = await Promise.all(
      dependencies.map(async (param, index) => {
        try {
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            param,
            { index, dependencies },
            module,
          );
          if (!paramWrapper.isResolved && !paramWrapper.forwardRef) {
            isResolved = false;
          }
          return paramWrapper.instance;
        } catch (err) {
          const isOptional = optionalDependenciesIds.includes(index);
          if (!isOptional) {
            throw err;
          }
          return null;
        }
      }),
    );
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
  ) {
    if (isUndefined(param)) {
      throw new UndefinedDependencyException(wrapper.name, dependencyContext);
    }
    const token = this.resolveParamToken(wrapper, param);
    return await this.resolveComponentInstance<T>(
      module,
      isFunction(token) ? (token as Type<any>).name : token,
      dependencyContext,
      wrapper,
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
  ) {
    const components = module.components;
    const instanceWrapper = await this.lookupComponent(
      components,
      module,
      { name, ...dependencyContext },
      wrapper,
    );
    if (!instanceWrapper.isResolved && !instanceWrapper.forwardRef) {
      await this.loadInstanceOfComponent(instanceWrapper, module);
    }
    if (instanceWrapper.async) {
      instanceWrapper.instance = await instanceWrapper.instance;
    }
    return instanceWrapper;
  }

  public async lookupComponent<T = any>(
    components: Map<string, any>,
    module: Module,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
  ) {
    const { name } = dependencyContext;
    const scanInExports = () =>
      this.lookupComponentInExports(
        components,
        dependencyContext,
        module,
        wrapper,
      );
    return components.has(name) ? components.get(name) : await scanInExports();
  }

  public async lookupComponentInExports<T = any>(
    components: Map<string, any>,
    dependencyContext: InjectorDependencyContext,
    module: Module,
    wrapper: InstanceWrapper<T>,
  ) {
    const instanceWrapper = await this.lookupComponentInRelatedModules(
      module,
      dependencyContext.name,
    );
    if (isNil(instanceWrapper)) {
      throw new UnknownDependenciesException(wrapper.name, dependencyContext);
    }
    return instanceWrapper;
  }

  public async lookupComponentInRelatedModules(module: Module, name: any) {
    let component = null;
    const relatedModules = module.relatedModules || [];

    for (const relatedModule of this.flatMap([...relatedModules.values()])) {
      const { components, exports } = relatedModule;
      if (!exports.has(name) || !components.has(name)) {
        continue;
      }
      component = components.get(name);
      if (!component.isResolved && !component.forwardRef) {
        await this.loadInstanceOfComponent(component, relatedModule);
        break;
      }
    }
    return component;
  }

  public async resolveFactoryInstance(factoryResult): Promise<any> {
    if (!(factoryResult instanceof Promise)) {
      return factoryResult;
    }
    const result = await factoryResult;
    return result;
  }

  public flatMap(modules: Module[]): Module[] {
    if (!modules) {
      return [];
    }
    const flatten = (module: Module) => {
      const { relatedModules, exports } = module;
      return this.flatMap(
        [...relatedModules.values()]
          .filter(related => related)
          .filter(related => {
            const { metatype } = related;
            return exports.has(metatype.name);
          }),
      );
    };
    return modules.concat.apply(modules, modules.map(flatten));
  }
}
