"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
require("reflect-metadata");
const runtime_exception_1 = require("../errors/exceptions/runtime.exception");
const undefined_dependency_exception_1 = require("../errors/exceptions/undefined-dependency.exception");
const unknown_dependencies_exception_1 = require("../errors/exceptions/unknown-dependencies.exception");
class Injector {
    async loadInstanceOfMiddleware(wrapper, collection, module) {
        const { metatype } = wrapper;
        const currentMetatype = collection.get(metatype.name);
        if (currentMetatype.instance !== null)
            return;
        await this.resolveConstructorParams(wrapper, module, null, instances => {
            collection.set(metatype.name, {
                instance: new metatype(...instances),
                metatype,
            });
        });
    }
    async loadInstanceOfRoute(wrapper, module) {
        const routes = module.routes;
        await this.loadInstance(wrapper, routes, module);
    }
    async loadInstanceOfInjectable(wrapper, module) {
        const injectables = module.injectables;
        await this.loadInstance(wrapper, injectables, module);
    }
    loadPrototypeOfInstance({ metatype, name }, collection) {
        if (!collection)
            return null;
        const target = collection.get(name);
        if (target.isResolved || !shared_utils_1.isNil(target.inject) || !metatype.prototype)
            return null;
        collection.set(name, Object.assign({}, collection.get(name), { instance: Object.create(metatype.prototype) }));
    }
    async loadInstanceOfComponent(wrapper, module) {
        const components = module.components;
        await this.loadInstance(wrapper, components, module);
    }
    applyDoneHook(wrapper) {
        let done;
        wrapper.done$ = new Promise((resolve, reject) => {
            done = resolve;
        });
        wrapper.isPending = true;
        return done;
    }
    async loadInstance(wrapper, collection, module) {
        if (wrapper.isPending) {
            return await wrapper.done$;
        }
        const done = this.applyDoneHook(wrapper);
        const { metatype, name, inject } = wrapper;
        const currentMetatype = collection.get(name);
        if (shared_utils_1.isUndefined(currentMetatype)) {
            throw new runtime_exception_1.RuntimeException();
        }
        if (currentMetatype.isResolved) {
            return void 0;
        }
        await this.resolveConstructorParams(wrapper, module, inject, async (instances) => {
            if (shared_utils_1.isNil(inject)) {
                currentMetatype.instance = Object.assign(currentMetatype.instance, new metatype(...instances));
            }
            else {
                const factoryResult = currentMetatype.metatype(...instances);
                currentMetatype.instance = await this.resolveFactoryInstance(factoryResult);
            }
            currentMetatype.isResolved = true;
            done();
        });
    }
    async resolveConstructorParams(wrapper, module, inject, callback) {
        let isResolved = true;
        const dependencies = shared_utils_1.isNil(inject)
            ? this.reflectConstructorParams(wrapper.metatype)
            : inject;
        const optionalDependenciesIds = shared_utils_1.isNil(inject)
            ? this.reflectOptionalParams(wrapper.metatype)
            : [];
        const instances = await Promise.all(dependencies.map(async (param, index) => {
            try {
                const paramWrapper = await this.resolveSingleParam(wrapper, param, { index, dependencies }, module);
                if (!paramWrapper.isResolved && !paramWrapper.forwardRef) {
                    isResolved = false;
                }
                return paramWrapper.instance;
            }
            catch (err) {
                const isOptional = optionalDependenciesIds.includes(index);
                if (!isOptional) {
                    throw err;
                }
                return null;
            }
        }));
        isResolved && (await callback(instances));
    }
    reflectConstructorParams(type) {
        const paramtypes = Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, type) || [];
        const selfParams = this.reflectSelfParams(type);
        selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
        return paramtypes;
    }
    reflectOptionalParams(type) {
        return Reflect.getMetadata(constants_1.OPTIONAL_DEPS_METADATA, type) || [];
    }
    reflectSelfParams(type) {
        return Reflect.getMetadata(constants_1.SELF_DECLARED_DEPS_METADATA, type) || [];
    }
    async resolveSingleParam(wrapper, param, dependencyContext, module) {
        if (shared_utils_1.isUndefined(param)) {
            throw new undefined_dependency_exception_1.UndefinedDependencyException(wrapper.name, dependencyContext);
        }
        const token = this.resolveParamToken(wrapper, param);
        return await this.resolveComponentInstance(module, shared_utils_1.isFunction(token) ? token.name : token, dependencyContext, wrapper);
    }
    resolveParamToken(wrapper, param) {
        if (!param.forwardRef) {
            return param;
        }
        wrapper.forwardRef = true;
        return param.forwardRef();
    }
    async resolveComponentInstance(module, name, dependencyContext, wrapper) {
        const components = module.components;
        const instanceWrapper = await this.lookupComponent(components, module, Object.assign({ name }, dependencyContext), wrapper);
        if (!instanceWrapper.isResolved && !instanceWrapper.forwardRef) {
            await this.loadInstanceOfComponent(instanceWrapper, module);
        }
        if (instanceWrapper.async) {
            instanceWrapper.instance = await instanceWrapper.instance;
        }
        return instanceWrapper;
    }
    async lookupComponent(components, module, dependencyContext, wrapper) {
        const { name } = dependencyContext;
        const scanInExports = () => this.lookupComponentInExports(components, dependencyContext, module, wrapper);
        return components.has(name) ? components.get(name) : await scanInExports();
    }
    async lookupComponentInExports(components, dependencyContext, module, wrapper) {
        const instanceWrapper = await this.lookupComponentInRelatedModules(module, dependencyContext.name);
        if (shared_utils_1.isNil(instanceWrapper)) {
            throw new unknown_dependencies_exception_1.UnknownDependenciesException(wrapper.name, dependencyContext);
        }
        return instanceWrapper;
    }
    async lookupComponentInRelatedModules(module, name, moduleRegistry = []) {
        let componentRef = null;
        const relatedModules = module.relatedModules || new Set();
        const children = [...relatedModules.values()].filter(item => item);
        for (const relatedModule of children) {
            if (moduleRegistry.includes(relatedModule.id)) {
                continue;
            }
            moduleRegistry.push(relatedModule.id);
            const { components, exports } = relatedModule;
            if (!exports.has(name) || !components.has(name)) {
                const instanceRef = await this.lookupComponentInRelatedModules(relatedModule, name, moduleRegistry);
                if (instanceRef) {
                    return instanceRef;
                }
                continue;
            }
            componentRef = components.get(name);
            if (!componentRef.isResolved && !componentRef.forwardRef) {
                await this.loadInstanceOfComponent(componentRef, relatedModule);
                break;
            }
        }
        return componentRef;
    }
    async resolveFactoryInstance(factoryResult) {
        if (!(factoryResult instanceof Promise)) {
            return factoryResult;
        }
        const result = await factoryResult;
        return result;
    }
}
exports.Injector = Injector;
