import { Logger, Module } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { NestContainer } from '@nestjs/core/injector/container';
import { InstanceLoader } from '@nestjs/core/injector/instance-loader';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { OverrideBy, OverrideByFactoryOptions } from './interfaces';
import { TestingLogger } from './services/testing-logger.service';
import { TestingModule } from './testing-module';

export class TestingModuleBuilder {
  private readonly applicationConfig = new ApplicationConfig();
  private readonly container = new NestContainer(this.applicationConfig);
  private readonly overloadsMap = new Map();
  private readonly scanner: DependenciesScanner;
  private readonly instanceLoader = new InstanceLoader(this.container);
  private readonly module: any;

  constructor(metadataScanner: MetadataScanner, metadata: ModuleMetadata) {
    this.scanner = new DependenciesScanner(
      this.container,
      metadataScanner,
      this.applicationConfig,
    );
    this.module = this.createModule(metadata);
  }

  public overridePipe<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideFilter<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideGuard<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideInterceptor<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideProvider<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, true);
  }

  public async compile(): Promise<TestingModule> {
    this.applyLogger();
    await this.scanner.scan(this.module);

    this.applyOverloadsMap();
    await this.instanceLoader.createInstancesOfDependencies();
    this.scanner.applyApplicationProviders();

    const root = this.getRootModule();
    return new TestingModule(this.container, [], root, this.applicationConfig);
  }

  private override<T = any>(typeOrToken: T, isProvider: boolean): OverrideBy {
    const addOverload = (options: any) => {
      this.overloadsMap.set(typeOrToken, {
        ...options,
        isProvider,
      });
      return this;
    };
    return this.createOverrideByBuilder(addOverload);
  }

  private createOverrideByBuilder(
    add: (provider: any) => TestingModuleBuilder,
  ): OverrideBy {
    return {
      useValue: value => add({ useValue: value }),
      useFactory: (options: OverrideByFactoryOptions) =>
        add({ ...options, useFactory: options.factory }),
      useClass: metatype => add({ useClass: metatype }),
    };
  }

  private applyOverloadsMap() {
    [...this.overloadsMap.entries()].forEach(([component, options]) => {
      this.container.replace(component, options);
    });
  }

  private getRootModule() {
    const modules = this.container.getModules().values();
    return modules.next().value;
  }

  private createModule(metadata: ModuleMetadata) {
    // tslint:disable-next-line:class-name
    class _RootTestModule {}
    Module(metadata)(_RootTestModule);
    return _RootTestModule;
  }

  private applyLogger() {
    Logger.overrideLogger(new TestingLogger());
  }
}
