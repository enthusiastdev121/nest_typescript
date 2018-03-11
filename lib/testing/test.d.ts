import { ModuleMetadata } from '@nestjs/common/interfaces/modules/module-metadata.interface';
import { TestingModuleBuilder } from './testing-module.builder';
export declare class Test {
    private static metadataScanner;
    static createTestingModule(metadata: ModuleMetadata): TestingModuleBuilder;
    private static init();
}
