import { expect } from 'chai';
import * as sinon from 'sinon';
import { Component } from '../../../common/decorators/core/component.decorator';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { RequestMapping } from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { NestMiddleware } from '../../../common/interfaces/middleware/nest-middleware.interface';
import { ExpressAdapter } from '../../adapters/express-adapter';
import { ApplicationConfig } from '../../application-config';
import { InvalidMiddlewareException } from '../../errors/exceptions/invalid-middleware.exception';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { NestContainer } from '../../injector/container';
import { MiddlewareBuilder } from '../../middleware/builder';
import { MiddlewareContainer } from '../../middleware/container';
import { MiddlewareModule } from '../../middleware/middleware-module';
import { RouterExceptionFilters } from '../../router/router-exception-filters';

describe('MiddlewareModule', () => {
  let middlewareModule: MiddlewareModule;

  @Controller('test')
  class AnotherRoute {}

  @Controller('test')
  class TestRoute {
    @RequestMapping({ path: 'test' })
    public getTest() {}

    @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
    public getAnother() {}
  }

  @Component()
  class TestMiddleware implements NestMiddleware {
    public resolve() {
      return (req, res, next) => {};
    }
  }

  beforeEach(() => {
    const appConfig = new ApplicationConfig();
    middlewareModule = new MiddlewareModule();
    (middlewareModule as any).routerExceptionFilter = new RouterExceptionFilters(
      new NestContainer(),
      appConfig,
      new ExpressAdapter({}),
    );
    (middlewareModule as any).config = appConfig;
  });

  describe('loadConfiguration', () => {
    it('should call "configure" method if method is implemented', () => {
      const configureSpy = sinon.spy();
      const mockModule = {
        configure: configureSpy,
      };

      middlewareModule.loadConfiguration(
        new MiddlewareContainer(),
        mockModule as any,
        'Test' as any,
      );

      expect(configureSpy.calledOnce).to.be.true;
      expect(
        configureSpy.calledWith(
          new MiddlewareBuilder((middlewareModule as any).routesMapper),
        ),
      ).to.be.true;
    });
  });

  describe('registerRouteMiddleware', () => {
    it('should throw "RuntimeException" exception when middleware is not stored in container', () => {
      const route = { path: 'Test' };
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: [TestRoute],
      };

      const useSpy = sinon.spy();
      const app = { use: useSpy };

      expect(
        middlewareModule.registerRouteMiddleware(
          new MiddlewareContainer(),
          route as any,
          configuration,
          'Test' as any,
          app as any,
        ),
      ).to.eventually.be.rejectedWith(RuntimeException);
    });

    it('should throw "InvalidMiddlewareException" exception when middleware does not have "resolve" method', () => {
      @Component()
      class InvalidMiddleware {}

      const route = { path: 'Test' };
      const configuration = {
        middleware: [InvalidMiddleware],
        forRoutes: [TestRoute],
      };

      const useSpy = sinon.spy();
      const app = { use: useSpy };

      const container = new MiddlewareContainer();
      const moduleKey = 'Test' as any;
      container.addConfig([configuration as any], moduleKey);

      const instance = new InvalidMiddleware();
      container.getMiddleware(moduleKey).set('InvalidMiddleware', {
        metatype: InvalidMiddleware,
        instance,
      } as any);

      expect(
        middlewareModule.registerRouteMiddleware(
          container,
          route as any,
          configuration,
          moduleKey,
          app as any,
        ),
      ).to.be.rejectedWith(InvalidMiddlewareException);
    });

    it('should mount middleware when is stored in container', () => {
      const route = 'testPath';
      const configuration = {
        middleware: [TestMiddleware],
        forRoutes: ['test', AnotherRoute, TestRoute],
      };

      const createMiddlewareFactorySpy = sinon.spy();
      const app = {
        createMiddlewareFactory: createMiddlewareFactorySpy,
      };
      const container = new MiddlewareContainer();
      const moduleKey = 'Test' as any;
      container.addConfig([configuration], moduleKey);

      const instance = new TestMiddleware();
      container.getMiddleware(moduleKey).set('TestMiddleware', {
        metatype: TestMiddleware,
        instance,
      });

      middlewareModule.registerRouteMiddleware(
        container,
        { path: route, method: RequestMethod.ALL },
        configuration,
        moduleKey,
        app as any,
      );
      expect(createMiddlewareFactorySpy.calledOnce).to.be.true;
    });
  });
});
