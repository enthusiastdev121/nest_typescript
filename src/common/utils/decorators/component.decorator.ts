/**
 * Defines the Component. The component can inject dependencies through constructor.
 * Those dependencies should belongs to the same module.
 */
export const Component = (): ClassDecorator => {
    return (target: object) => {};
};

/**
 * Defines the Pipe. The Pipe should implements the `PipeTransform` interface.
 */
export const Pipe = (): ClassDecorator => {
    return (target: object) => {};
};

/**
 * Defines the Guard. The Guard should implement the `CanActivate` interface.
 */
export const Guard = (): ClassDecorator => {
    return (target: object) => {};
};

/**
 * Defines the Middleware. The Middleware should implement the `NestMiddleware` interface.
 */
export const Middleware = (): ClassDecorator => {
    return (target: object) => {};
};

/**
 * Defines the Interceptor. The Interceptor should implement `HttpInterceptor`, `RpcInterceptor` or `WsInterceptor` interface.
 */
export const Interceptor = (): ClassDecorator => {
    return (target: object) => {};
};

export function mixin(mixinClass) {
  this.offset = this.offset ? ++this.offset : (Math.random() * 100);
  Object.defineProperty(mixinClass, 'name', { value: JSON.stringify(this.offset) });
  Component()(mixinClass);
  return mixinClass;
}