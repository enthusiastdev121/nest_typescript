import { BadRequestException, Post } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { Get } from '../../../common/decorators/http/request-mapping.decorator';
import { ExpressAdapter } from '../../adapters/express-adapter';
import { ApplicationConfig } from '../../application-config';
import { Injector } from '../../injector/injector';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { RoutesResolver } from '../../router/routes-resolver';

describe('RoutesResolver', () => {
  @Controller('global')
  class TestRoute {
    @Get('test')
    public getTest() {}

    @Post('another-test')
    public anotherTest() {}
  }

  let router;
  let routesResolver: RoutesResolver;
  let container;
  let modules: Map<string, any>;
  let applicationRef;

  beforeEach(() => {
    modules = new Map();
    applicationRef = {
      use: () => ({}),
      setNotFoundHandler: sinon.spy(),
      setErrorHandler: sinon.spy(),
    };
    container = {
      getModules: () => modules,
      getModuleByKey: (key: string) => modules.get(key),
      getApplicationRef: () => applicationRef,
    };
    router = {
      get() {},
      post() {},
    };
  });

  beforeEach(() => {
    routesResolver = new RoutesResolver(
      container,
      new ApplicationConfig(),
      new Injector(),
    );
  });

  describe('registerRouters', () => {
    it('should method register controllers to router instance', () => {
      const routes = new Map();
      const routeWrapper = new InstanceWrapper({
        instance: new TestRoute(),
        metatype: TestRoute,
      });
      routes.set('TestRoute', routeWrapper);

      const appInstance = new ExpressAdapter(router);
      const exploreSpy = sinon.spy(
        (routesResolver as any).routerBuilder,
        'explore',
      );
      const moduleName = '';
      modules.set(moduleName, {});

      sinon
        .stub((routesResolver as any).routerBuilder, 'extractRouterPath')
        .callsFake(() => '');
      routesResolver.registerRouters(routes, moduleName, '', appInstance);

      expect(exploreSpy.called).to.be.true;
      expect(exploreSpy.calledWith(routeWrapper, moduleName, appInstance, ''))
        .to.be.true;
    });
  });

  describe('resolve', () => {
    it('should call "registerRouters" for each module', () => {
      const routes = new Map();
      routes.set(
        'TestRoute',
        new InstanceWrapper({
          instance: new TestRoute(),
          metatype: TestRoute,
        }),
      );
      modules.set('TestModule', { routes });
      modules.set('TestModule2', { routes });

      const registerRoutersStub = sinon
        .stub(routesResolver, 'registerRouters')
        .callsFake(() => undefined);

      routesResolver.resolve({ use: sinon.spy() } as any, 'basePath');
      expect(registerRoutersStub.calledTwice).to.be.true;
    });
  });

  describe('mapExternalExceptions', () => {
    describe('when exception prototype is', () => {
      describe('SyntaxError', () => {
        it('should map to BadRequestException', () => {
          const err = new SyntaxError();
          const outputErr = routesResolver.mapExternalException(err);
          expect(outputErr).to.be.instanceof(BadRequestException);
        });
      });
      describe('other', () => {
        it('should behave as an identity', () => {
          const err = new Error();
          const outputErr = routesResolver.mapExternalException(err);
          expect(outputErr).to.be.eql(err);
        });
      });
    });
  });

  describe('registerNotFoundHandler', () => {
    it('should register not found handler', () => {
      routesResolver.registerNotFoundHandler();

      expect(applicationRef.setNotFoundHandler.called).to.be.true;
    });
  });

  describe('registerExceptionHandler', () => {
    it('should register exception handler', () => {
      const ref = container.getApplicationRef();
      routesResolver.registerExceptionHandler();

      expect(applicationRef.setErrorHandler.called).to.be.true;
    });
  });
});
