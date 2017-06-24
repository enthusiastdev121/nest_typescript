## 3.0.1 (24.06.2017)
**@nestjs/core**
- Hierarchical injector bugfix,
- Middlewares `@UseFilters()` bugfix (#95).

**@nestjs/microservices**
- TCP server / client bugfix (#91)

## 3.0.0 (03.06.2017)
**@nestjs/common - BREAKING CHANGE**
- You should now pass objects into `@UseFilters()` decorator instead of metatypes,
- Exception Filters can't inject dependencies (they're not coupled with modules),
- `@ExceptionFilters()` is deprecated, use `@UseFilters()` instead.
- `INestApplication` has new methods - `useGlobalFilters()` and `useGlobalPipes()`,
- New lifecycle hook - `OnModuleDestroy` interface.

**@nestjs/core**
- `@Pipe()` feature (async & sync),
- Exception Filters can have global, controller and method scope.

**@nestjs/websockets - BREAKING CHANGE**
- Use `useWebSocketAdapter()` instead of `setIoAdapter()`,
- You can port any WS library - just implement `WebSocketAdapter` (@nestjs/common).

**@nestjs/microservices - BREAKING CHANGE**
- Now methods have to return `Observable`, and they receive only one argument `data`,
- Microservices can return multiple values, but after emitting `Observable` has to be COMPLETED!
- You can port any transport strategy instead of built-in Redis/TCP, just implement `CustomTransportStrategy`.

## 2.1.3 (27.05.2017)
**@nestjs/common**, **@nestjs/websockets**
- `INestApplication` and `INestMicroservice` has new method now - `setIoAdapter()`,
- Ability to use custom `IoAdapter`

## 2.1.1 (24.05.2017)
**@nestjs/common**, **@nestjs/websockets**, **@nestjs/microservices**
- `INestApplication` and `INestMicroservice` has new method now - `setIoAdapter()`,
- Ability to use custom `IoAdapter`

## 2.1.0 (22.05.2017)
**@nestjs/common**, **@nestjs/core**
- `INestApplication` has new methods now - `init()`, `setGlobalPrefix()`, `connectMicroservice()`, `close()`, `startAllMicroservices()`,
- `INestMicroservice` has new method - `close()`

## 2.0.3 (15.05.2017)
**@nestjs/common**
- `Req()` (`Request()`) and `Res()` (`Response()`) aliases to avoid conflicts with express typings

## 2.0.0 (14.05.2017)

- **Hierarchical injector** improvements
- `@Shared(token?: string)` decorator for **scoped**, shared Modules
- Modules **are not singletons** anymore
- Added `iterare` library for applying multiple transformations to a collection
- `Logger` service is public,
- Nest is now splitted into feature packages:
```typescript
@nestjs/core
@nestjs/common
@nestjs/microservices
@nestjs/testing
@nestjs/websockets
```
- `rxjs`, `redis` and `reflect-metadata` moved into `peerDependencies`
- `@Patch()` support

## 1.0.0 (Final - 01.05.2017)

- Added **Gateway Middlewares** support:

```
@WebSocketGateway({
    port: 2000,
    middlewares: [ChatMiddleware],
})
```
Gateway Middleware example:
```
@Middleware()
export class ChatMiddleware implements GatewayMiddleware {
    public resolve(): (socket, next) => void {
        return (socket, next) => {
            console.log('Authorization...');
            next();
        };
    }
}
```

- New Gateway lifecycle interfaces `OnGatewayInit`, `OnGatewayConnection`, `OnGatewayDisconnect`
- `@SubscribeMessage()` now accepts also plain strings:

```
@SubscribeMessage('event')
```

- `@Controller()` now accepts also plain strings: 

```
@Controller('users')
```

- `HttpStatus` (`HttpStatus.OK` etc.) enumerator
- **Route params decorators** support 

```
Request: () => ParameterDecorator
Response: () => ParameterDecorator
Next: () => ParameterDecorator
Query: (property?: string) => ParameterDecorator
Body: (property?: string) => ParameterDecorator
Param: (property?: string) => ParameterDecorator
Session: () => ParameterDecorator
Headers: (property?: string) => ParameterDecorator
```

- `MiddlewaresBuilder` -> `MiddlewaresConsumer`
- **Exception Filters** support

```
@ExceptionFilters(CustomExceptionFilter, NextExceptionFilter)
export class UsersController {}
```
Exception filter example:

```
export class CustomException {}

@Catch(CustomException)
export class CustomExceptionFilter implements ExceptionFilter {
    public catch(exception, response) {
        response.status(500).json({
            message: 'Custom exception message.',
        });
    }
}
```
- Module injection support:

```
export class UsersController {
    constructor(private module: UsersModule) {}
}
```

- `ModuleRef` support

## 1.0.0-RC7 (08.04.2017)

- MiddlewareBuilder: `use()` deprecated, use `apply()` instead
- MiddlewareBuilder: new `apply()` method

## 1.0.0-RC4 (08.04.2017)

- Support for `@Post`, `@Get`, `@Delete`, `@Put`, `@All` decorators
- Added ability to pass data to middleware metatypes

## 1.0.0-BETA-1 (23.03.2017)

- `@Inject` -> `@Dependencies`
- `@Inject` decorator for custom constructor parameters
- Custom providers support (useClass, useValue, useFactory)

## 1.0.0-ALPHA-23 (19.03.2017)

- Microservices support (TCP & Redis transports)
- NestRunner -> NestFactory
- Simplify application initialization & configuration
- Added abillity to pass custom express instance
- `@Inject` decorator for ES6+
- SocketGateway -> WebSocketGateway
- GatewayServer -> WebSocketServer
