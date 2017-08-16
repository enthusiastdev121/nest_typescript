import 'reflect-metadata';
import { ControllerMetadata } from '../../interfaces/controllers/controller-metadata.interface';
import { isString } from '../shared.utils';
import { PATH_METADATA, SHARED_MODULE_METADATA } from '../../constants';
import { NestModuleMetatype } from '../../interfaces/modules/module-metatype.interface';

/**
 * Specifies scope of this module. When module is `@Shared()`, Nest will create only one instance of this
 * module and share them between all of the modules.
 */
export const Shared = (scope: string = 'global') => {
    return (target: any) => {
        const Metatype = target as FunctionConstructor;
        const Type = class extends Metatype {
            constructor(...args) {
                super(...args);
            }
        };
        Reflect.defineMetadata(SHARED_MODULE_METADATA, scope, Type);
        Object.defineProperty(Type, 'name', { value: target.name });
        return Type as any;
    };
};