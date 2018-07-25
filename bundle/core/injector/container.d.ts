import { DynamicModule } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import 'reflect-metadata';
import { ApplicationConfig } from './../application-config';
import { Module } from './module';
import { ModulesContainer } from './modules-container';
export declare class NestContainer {
    private readonly _applicationConfig;
    private readonly globalModules;
    private readonly moduleCompiler;
    private readonly modules;
    private readonly dynamicModulesMetadata;
    private applicationRef;
    constructor(_applicationConfig?: ApplicationConfig);
    readonly applicationConfig: ApplicationConfig | undefined;
    setApplicationRef(applicationRef: any): void;
    getApplicationRef(): any;
    addModule(metatype: Type<any> | DynamicModule | Promise<DynamicModule>, scope: Type<any>[]): Promise<void>;
    addDynamicMetadata(token: string, dynamicModuleMetadata: Partial<DynamicModule>, scope: Type<any>[]): any;
    addDynamicModules(modules: any[], scope: Type<any>[]): any;
    isGlobalModule(metatype: Type<any>): boolean;
    addGlobalModule(module: Module): void;
    getModules(): ModulesContainer;
    addRelatedModule(relatedModule: Type<any> | DynamicModule, token: string): Promise<void>;
    addComponent(component: Type<any>, token: string): string;
    addInjectable(injectable: Type<any>, token: string): void;
    addExportedComponent(exportedComponent: Type<any>, token: string): void;
    addController(controller: Type<any>, token: string): void;
    clear(): void;
    replace(toReplace: any, options: any & {
        scope: any[] | null;
    }): void;
    bindGlobalScope(): void;
    bindGlobalsToRelatedModules(module: Module): void;
    bindGlobalModuleToModule(module: Module, globalModule: Module): any;
    getDynamicMetadataByToken(token: string, metadataKey: keyof DynamicModule): any[];
}
export interface InstanceWrapper<T> {
    name: any;
    metatype: Type<T>;
    instance: T;
    isResolved: boolean;
    isPending?: boolean;
    done$?: Promise<void>;
    inject?: Type<any>[];
    isNotMetatype?: boolean;
    forwardRef?: boolean;
    async?: boolean;
}
