import { DynamicModule } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import 'reflect-metadata';
import { MetadataScanner } from '../core/metadata-scanner';
import { ApplicationConfig } from './application-config';
import { NestContainer } from './injector/container';
export declare class DependenciesScanner {
    private readonly container;
    private readonly metadataScanner;
    private readonly applicationConfig;
    private readonly applicationProvidersApplyMap;
    constructor(container: NestContainer, metadataScanner: MetadataScanner, applicationConfig?: ApplicationConfig);
    scan(module: Type<any>): Promise<void>;
    scanForModules(module: Type<any> | DynamicModule, scope?: Type<any>[]): Promise<void>;
    storeModule(module: any, scope: Type<any>[]): Promise<void>;
    scanModulesForDependencies(): Promise<void>;
    reflectRelatedModules(module: Type<any>, token: string, context: string): Promise<void>;
    reflectComponents(module: Type<any>, token: string): void;
    reflectComponentMetadata(component: Type<Injectable>, token: string): void;
    reflectControllers(module: Type<any>, token: string): void;
    reflectDynamicMetadata(obj: Type<Injectable>, token: string): void;
    reflectExports(module: Type<any>, token: string): void;
    reflectGatewaysMiddleware(component: Type<Injectable>, token: string): void;
    reflectInjectables(component: Type<Injectable>, token: string, metadataKey: string): void;
    reflectParamInjectables(component: Type<Injectable>, token: string, metadataKey: string): void;
    reflectKeyMetadata(component: Type<Injectable>, key: string, method: string): any;
    storeRelatedModule(related: any, token: string, context: string): Promise<void>;
    storeComponent(component: any, token: string): string;
    storeInjectable(component: Type<Injectable>, token: string): void;
    storeExportedComponent(exportedComponent: Type<Injectable>, token: string): void;
    storeRoute(route: Type<Controller>, token: string): void;
    reflectMetadata(metatype: any, metadataKey: string): any;
    applyApplicationProviders(): void;
    getApplyProvidersMap(): {
        [type: string]: Function;
    };
}
