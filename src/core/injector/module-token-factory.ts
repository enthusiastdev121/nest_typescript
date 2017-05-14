import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { SHARED_MODULE_METADATA } from '@nestjs/common/constants';

export class ModuleTokenFactory {
    public create(metatype: NestModuleMetatype, scope: NestModuleMetatype[]) {
        const reflectedScope = this.reflectScope(metatype);
        const opaqueToken = {
            module: this.getModuleName(metatype),
            scope: isUndefined(reflectedScope) ? this.getScopeStack(scope) : reflectedScope,
        };
        return JSON.stringify(opaqueToken);
    }

    public getModuleName(metatype: NestModuleMetatype): string {
        return metatype.name;
    }

    public getScopeStack(scope: NestModuleMetatype[]): string[] {
        return scope.map((module) => module.name);
    }

    private reflectScope(metatype: NestModuleMetatype) {
        return Reflect.getMetadata(SHARED_MODULE_METADATA, metatype);
    }
}