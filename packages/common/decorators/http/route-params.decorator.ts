import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '../../constants';
import { RouteParamtypes } from '../../enums/route-paramtypes.enum';
import { PipeTransform } from '../../index';
import { Type } from '../../interfaces';
import { isNil, isString } from '../../utils/shared.utils';

export type ParamData = object | string | number;
export interface RouteParamsMetadata {
  [prop: number]: {
    index: number;
    data?: ParamData;
  };
}

const assignMetadata = (
  args: RouteParamsMetadata,
  paramtype: RouteParamtypes,
  index: number,
  data?: ParamData,
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
) => ({
  ...args,
  [`${paramtype}:${index}`]: {
    index,
    data,
    pipes,
  },
});

const createRouteParamDecorator = (paramtype: RouteParamtypes) => {
  return (data?: ParamData): ParameterDecorator => (target, key, index) => {
    const args =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};
    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      assignMetadata(args, paramtype, index, data),
      target.constructor,
      key,
    );
  };
};

const createPipesRouteParamDecorator = (paramtype: RouteParamtypes) => (
  data?,
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
): ParameterDecorator => (target, key, index) => {
  const args =
    Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || {};
  const hasParamData = isNil(data) || isString(data);
  const paramData = hasParamData ? data : undefined;
  const paramPipes = hasParamData ? pipes : [data, ...pipes];

  Reflect.defineMetadata(
    ROUTE_ARGS_METADATA,
    assignMetadata(args, paramtype, index, paramData, ...paramPipes),
    target.constructor,
    key,
  );
};

export const Request: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.REQUEST,
);
export const Response: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.RESPONSE,
);
export const Next: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.NEXT,
);
export const Session: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.SESSION,
);
export const UploadedFile: (fileKey?: string) => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.FILE,
);
export const UploadedFiles: () => ParameterDecorator = createRouteParamDecorator(
  RouteParamtypes.FILES,
);
export const Headers: (
  property?: string,
) => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.HEADERS);

export function Query();
export function Query(...pipes: (Type<PipeTransform> | PipeTransform)[]);
export function Query(
  property: string,
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
);
export function Query(
  property?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
) {
  return createPipesRouteParamDecorator(RouteParamtypes.QUERY)(
    property,
    ...pipes,
  );
}

export function Body();
export function Body(...pipes: (Type<PipeTransform> | PipeTransform)[]);
export function Body(
  property: string,
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
);
export function Body(
  property?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
) {
  return createPipesRouteParamDecorator(RouteParamtypes.BODY)(
    property,
    ...pipes,
  );
}

export function Param();
export function Param(...pipes: (Type<PipeTransform> | PipeTransform)[]);
export function Param(
  property: string,
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
);
export function Param(
  property?: string | (Type<PipeTransform> | PipeTransform),
  ...pipes: (Type<PipeTransform> | PipeTransform)[],
) {
  return createPipesRouteParamDecorator(RouteParamtypes.PARAM)(
    property,
    ...pipes,
  );
}

export const Req = Request;
export const Res = Response;
