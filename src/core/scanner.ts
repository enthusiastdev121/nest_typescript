import 'reflect-metadata';
import { NestContainer } from './injector/container';
import { Controller } from '../common/interfaces/controller.interface';
import { Injectable } from '../common/interfaces/injectable.interface';
import { metadata, EXCEPTION_FILTERS_METADATA } from '../common/constants';
import { NestModuleMetatype } from '../common/interfaces/module-metatype.interface';
import { Metatype } from '../common/interfaces/metatype.interface';
import { GATEWAY_MIDDLEWARES } from '../websockets/constants';

export class DependenciesScanner {
    constructor(private container: NestContainer) {}

    public scan(module: NestModuleMetatype) {
        this.scanForModules(module);
        this.scanModulesForDependencies();
    }

    private scanForModules(module: NestModuleMetatype) {
        this.storeModule(module);

        const importedModules = this.reflectMetadata(module, metadata.MODULES);
        importedModules.map((innerModule) => this.scanForModules(innerModule));
    }

    private storeModule(module: NestModuleMetatype) {
        this.container.addModule(module);
    }

    private scanModulesForDependencies() {
        const modules = this.container.getModules();

        modules.forEach(({ metatype }) => {
            this.reflectRelatedModules(metatype);
            this.reflectComponents(metatype);
            this.reflectControllers(metatype);
            this.reflectExports(metatype);
        });
    }

    private reflectRelatedModules(module: NestModuleMetatype) {
        const modules = this.reflectMetadata(module, metadata.MODULES);
        modules.map((related) => this.storeRelatedModule(related, module));
    }

    private reflectComponents(module: NestModuleMetatype) {
        const components = this.reflectMetadata(module, metadata.COMPONENTS);
        components.map((component) => {
            this.storeComponent(component, module);
            this.reflectGatewaysMiddlewares(component, module);
        });
    }

    private reflectControllers(module: NestModuleMetatype) {
        const routes = this.reflectMetadata(module, metadata.CONTROLLERS);
        routes.map((route) => {
            this.storeRoute(route, module);
            this.reflectExceptionFilters(route, module);
        });
    }

    private reflectExports(module: NestModuleMetatype) {
        const exports = this.reflectMetadata(module, metadata.EXPORTS);
        exports.map((exportedComponent) => this.storeExportedComponent(exportedComponent, module));
    }

    private reflectExceptionFilters(component: Metatype<Injectable>, module: NestModuleMetatype) {
        const filters = this.reflectMetadata(component, EXCEPTION_FILTERS_METADATA);
        filters.map((filter) => this.storeComponent(filter, module));
    }

    private reflectGatewaysMiddlewares(component: Metatype<Injectable>, module: NestModuleMetatype) {
        const middlewares = this.reflectMetadata(component, GATEWAY_MIDDLEWARES);
        middlewares.map((middleware) => this.storeComponent(middleware, module));
    }

    private storeRelatedModule(related: NestModuleMetatype, module: NestModuleMetatype) {
        this.container.addRelatedModule(related, module);
    }

    private storeComponent(component: Metatype<Injectable>, module: NestModuleMetatype) {
        this.container.addComponent(component, module);
    }

    private storeExportedComponent(exportedComponent: Metatype<Injectable>, module: NestModuleMetatype) {
        this.container.addExportedComponent(exportedComponent, module);
    }

    private storeRoute(route: Metatype<Controller>, module: NestModuleMetatype) {
        this.container.addController(route, module);
    }

    private reflectMetadata(module: NestModuleMetatype, metadata: string) {
        return Reflect.getMetadata(metadata, module) || [];
    }

}