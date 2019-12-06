import * as uuid from 'uuid/v4';
import {
  CUSTOM_ROUTE_AGRS_METADATA,
  ROUTE_ARGS_METADATA,
} from '../../constants';
import { PipeTransform } from '../../index';
import { Type } from '../../interfaces';
import { CustomParamFactory } from '../../interfaces/features/custom-route-param-factory.interface';
import { isFunction, isNil } from '../../utils/shared.utils';
import { ParamData, RouteParamMetadata } from './route-params.decorator';

const assignCustomMetadata = (
  args: Record<number, RouteParamMetadata>,
  paramtype: number | string,
  index: number,
  factory: CustomParamFactory,
  data?: ParamData,
  ...pipes: (Type<PipeTransform> | PipeTransform)[]
) => ({
  ...args,
  [`${paramtype}${CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
    index,
    factory,
    data,
    pipes,
  },
});

export type ParamDecoratorEnhancer = ParameterDecorator;
type Unpacked<T> = T extends (infer U)[]
  ? U
  : T extends (...args: any[]) => infer U
  ? U
  : T extends Promise<infer U>
  ? U
  : T;
/**
 * Defines HTTP route param decorator
 *
 * @param factory
 */
export function createParamDecorator(
  factory: CustomParamFactory,
  enhancers: ParamDecoratorEnhancer[] = [],
): (
  ...dataOrPipes: (Type<PipeTransform> | PipeTransform | any)[]
) => ParameterDecorator {
  const paramtype = uuid();
  return (
    data?,
    ...pipes: (Type<PipeTransform> | PipeTransform)[]
  ): ParameterDecorator => (target, key, index) => {
    const args =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};

    const isPipe = (pipe: any) =>
      pipe &&
      ((isFunction(pipe) &&
        pipe.prototype &&
        isFunction(pipe.prototype.transform)) ||
        isFunction(pipe.transform));

    const hasParamData = isNil(data) || !isPipe(data);
    const paramData = hasParamData ? data : undefined;
    const paramPipes = hasParamData ? pipes : [data, ...pipes];

    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignCustomMetadata(
        args,
        paramtype,
        index,
        factory,
        paramData,
        ...(paramPipes as PipeTransform[]),
      ),
      target.constructor,
      key,
    );
    enhancers.forEach(fn => fn(target, key, index));
  };
}

export function createGenericParamDecorator<T>(
  factory: CustomParamFactory,
  enhancers: ParamDecoratorEnhancer[] = [],
): (
  ...dataOrPipes: (Type<PipeTransform> | PipeTransform | Unpacked<T>)[]
) => ParameterDecorator {
  const paramtype = uuid();
  return (
    data?,
    ...pipes: (Type<PipeTransform> | PipeTransform | Unpacked<T>)[]
  ): ParameterDecorator => (target, key, index) => {
    const args =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};

    const isPipe = (pipe: any) =>
      pipe &&
      ((isFunction(pipe) &&
        pipe.prototype &&
        isFunction(pipe.prototype.transform)) ||
        isFunction(pipe.transform));

    const hasParamData = isNil(data) || !isPipe(data);
    const paramData = hasParamData ? data : undefined;
    const paramPipes = hasParamData ? pipes : [data, ...pipes];

    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignCustomMetadata(
        args,
        paramtype,
        index,
        factory,
        paramData,
        ...(paramPipes as PipeTransform[]),
      ),
      target.constructor,
      key,
    );
    enhancers.forEach(fn => fn(target, key, index));
  };
}
