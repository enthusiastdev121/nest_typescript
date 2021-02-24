import { expect } from 'chai';
import * as sinon from 'sinon';
import { VERSION_NEUTRAL } from '@nestjs/common';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import {
  All,
  Get,
  Post,
} from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { VersioningType } from '../../../common/enums/version-type.enum';
import { VersioningOptions } from '../../../common/interfaces/version-options.interface';
import { Injector } from '../../../core/injector/injector';
import { ApplicationConfig } from '../../application-config';
import { ExecutionContextHost } from '../../helpers/execution-context-host';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { MetadataScanner } from '../../metadata-scanner';
import { RouterExceptionFilters } from '../../router/router-exception-filters';
import { RouterExplorer } from '../../router/router-explorer';

describe('RouterExplorer', () => {
  @Controller('global')
  class TestRoute {
    @Get('test')
    public getTest() {}

    @Post('test')
    public postTest() {}

    @All('another-test')
    public anotherTest() {}

    @Get(['foo', 'bar'])
    public getTestUsingArray() {}
  }

  @Controller(['global', 'global-alias'])
  class TestRouteAlias {
    @Get('test')
    public getTest() {}

    @Post('test')
    public postTest() {}

    @All('another-test')
    public anotherTest() {}

    @Get(['foo', 'bar'])
    public getTestUsingArray() {}
  }

  let routerBuilder: RouterExplorer;
  let injector: Injector;
  let exceptionsFilter: RouterExceptionFilters;
  let applicationConfig: ApplicationConfig;

  beforeEach(() => {
    const container = new NestContainer();

    applicationConfig = new ApplicationConfig();
    injector = new Injector();
    exceptionsFilter = new RouterExceptionFilters(
      container,
      applicationConfig,
      null,
    );
    routerBuilder = new RouterExplorer(
      new MetadataScanner(),
      container,
      injector,
      null,
      exceptionsFilter,
      applicationConfig,
    );
  });

  describe('scanForPaths', () => {
    it('should method return expected list of route paths', () => {
      const paths = routerBuilder.scanForPaths(new TestRoute());

      expect(paths).to.have.length(4);

      expect(paths[0].path).to.eql(['/test']);
      expect(paths[1].path).to.eql(['/test']);
      expect(paths[2].path).to.eql(['/another-test']);
      expect(paths[3].path).to.eql(['/foo', '/bar']);

      expect(paths[0].requestMethod).to.eql(RequestMethod.GET);
      expect(paths[1].requestMethod).to.eql(RequestMethod.POST);
      expect(paths[2].requestMethod).to.eql(RequestMethod.ALL);
      expect(paths[3].requestMethod).to.eql(RequestMethod.GET);
    });

    it('should method return expected list of route paths alias', () => {
      const paths = routerBuilder.scanForPaths(new TestRouteAlias());

      expect(paths).to.have.length(4);

      expect(paths[0].path).to.eql(['/test']);
      expect(paths[1].path).to.eql(['/test']);
      expect(paths[2].path).to.eql(['/another-test']);
      expect(paths[3].path).to.eql(['/foo', '/bar']);

      expect(paths[0].requestMethod).to.eql(RequestMethod.GET);
      expect(paths[1].requestMethod).to.eql(RequestMethod.POST);
      expect(paths[2].requestMethod).to.eql(RequestMethod.ALL);
      expect(paths[3].requestMethod).to.eql(RequestMethod.GET);
    });
  });

  describe('exploreMethodMetadata', () => {
    it('should method return expected object which represent single route', () => {
      const instance = new TestRoute();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = routerBuilder.exploreMethodMetadata(
        new TestRoute(),
        instanceProto,
        'getTest',
      );

      expect(route.path).to.eql(['/test']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
    });

    it('should method return expected object which represent single route with alias', () => {
      const instance = new TestRouteAlias();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = routerBuilder.exploreMethodMetadata(
        new TestRouteAlias(),
        instanceProto,
        'getTest',
      );

      expect(route.path).to.eql(['/test']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
    });

    it('should method return expected object which represent multiple routes', () => {
      const instance = new TestRoute();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = routerBuilder.exploreMethodMetadata(
        new TestRoute(),
        instanceProto,
        'getTestUsingArray',
      );

      expect(route.path).to.eql(['/foo', '/bar']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
    });

    it('should method return expected object which represent multiple routes with alias', () => {
      const instance = new TestRouteAlias();
      const instanceProto = Object.getPrototypeOf(instance);

      const route = routerBuilder.exploreMethodMetadata(
        new TestRouteAlias(),
        instanceProto,
        'getTestUsingArray',
      );

      expect(route.path).to.eql(['/foo', '/bar']);
      expect(route.requestMethod).to.eql(RequestMethod.GET);
    });
  });

  describe('applyPathsToRouterProxy', () => {
    it('should method return expected object which represent single route', () => {
      const bindStub = sinon.stub(
        routerBuilder,
        'applyCallbackToRouter' as any,
      );
      const paths = [
        { path: [''], requestMethod: RequestMethod.GET },
        { path: ['test'], requestMethod: RequestMethod.GET },
        { path: ['foo', 'bar'], requestMethod: RequestMethod.GET },
      ];

      routerBuilder.applyPathsToRouterProxy(
        null,
        paths as any,
        null,
        '',
        '',
        '',
      );

      expect(bindStub.calledWith(null, paths[0], null)).to.be.true;
      expect(bindStub.callCount).to.be.eql(paths.length);
    });

    it('should method return expected object which represents a single versioned route', () => {
      const bindStub = sinon.stub(
        routerBuilder,
        'applyCallbackToRouter' as any,
      );
      const paths = [
        { path: [''], requestMethod: RequestMethod.GET },
        { path: ['test'], requestMethod: RequestMethod.GET },
        { path: ['foo', 'bar'], requestMethod: RequestMethod.GET },
      ];

      routerBuilder.applyPathsToRouterProxy(
        null,
        paths as any,
        null,
        '',
        '',
        '',
        { type: VersioningType.URI },
        '1',
      );

      expect(
        bindStub.calledWith(
          null,
          paths[0],
          null,
          '',
          '',
          '',
          {
            type: VersioningType.URI,
          },
          '1',
        ),
      ).to.be.true;
      expect(bindStub.callCount).to.be.eql(paths.length);
    });
  });

  describe('removeGlobalPrefixFromPath', () => {
    it('should remove global prefix from path', () => {
      sinon
        .stub(applicationConfig, 'getGlobalPrefix')
        .returns('/some/prefixed');

      expect(
        routerBuilder.removeGlobalPrefixFromPath('/some/prefixed/cats'),
      ).be.eql('/cats');
    });
    it('should not change path when there is no GlobalPrefix', () => {
      sinon.stub(applicationConfig, 'getGlobalPrefix').returns('');
      expect(routerBuilder.removeGlobalPrefixFromPath('/cats')).be.eql('/cats');
    });
  });

  describe('stripEndSlash', () => {
    it('should strip end slash if present', () => {
      expect(routerBuilder.stripEndSlash('/cats/')).to.equal('/cats');
      expect(routerBuilder.stripEndSlash('/cats')).to.equal('/cats');
    });
  });

  describe('isRouteExcludedFromGlobalPrefix', () => {
    describe('when there is no exclude configuration', () => {
      it('should return false', () => {
        sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
          exclude: undefined,
        });
        expect(
          routerBuilder.isRouteExcludedFromGlobalPrefix(
            '/cats',
            RequestMethod.GET,
          ),
        ).to.be.false;
      });
    });
    describe('otherwise', () => {
      describe('when route is not excluded', () => {
        it('should return false', () => {
          sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
            exclude: [
              {
                path: '/random',
                method: RequestMethod.ALL,
              },
            ],
          });
          expect(
            routerBuilder.isRouteExcludedFromGlobalPrefix(
              '/cats',
              RequestMethod.GET,
            ),
          ).to.be.false;
        });
      });
      describe('when route is excluded (by path)', () => {
        it('should return true', () => {
          sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
            exclude: [
              {
                path: '/cats',
                method: RequestMethod.ALL,
              },
              'cats',
            ],
          });
          expect(
            routerBuilder.isRouteExcludedFromGlobalPrefix(
              '/cats',
              RequestMethod.GET,
            ),
          ).to.be.true;
        });

        describe('when route is excluded (by method and path)', () => {
          it('should return true', () => {
            sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
              exclude: [
                {
                  path: '/cats',
                  method: RequestMethod.GET,
                },
              ],
            });
            expect(
              routerBuilder.isRouteExcludedFromGlobalPrefix(
                '/cats',
                RequestMethod.GET,
              ),
            ).to.be.true;
          });
        });
      });
    });
  });

  describe('extractRouterPath', () => {
    it('should return expected path', () => {
      expect(routerBuilder.extractRouterPath(TestRoute)).to.be.eql(['/global']);
      expect(routerBuilder.extractRouterPath(TestRoute, '/module')).to.be.eql([
        '/module/global',
      ]);
    });

    it('should return expected path with alias', () => {
      expect(routerBuilder.extractRouterPath(TestRouteAlias)).to.be.eql([
        '/global',
        '/global-alias',
      ]);
      expect(
        routerBuilder.extractRouterPath(TestRouteAlias, '/module'),
      ).to.be.eql(['/module/global', '/module/global-alias']);
    });
  });

  describe('createRequestScopedHandler', () => {
    let nextSpy: sinon.SinonSpy;

    beforeEach(() => {
      sinon.stub(injector, 'loadPerContext').callsFake(() => {
        throw new Error();
      });
      nextSpy = sinon.spy();
      sinon.stub(exceptionsFilter, 'create').callsFake(
        () =>
          ({
            next: nextSpy,
          } as any),
      );
    });

    describe('when "loadPerContext" throws', () => {
      const moduleKey = 'moduleKey';
      const methodKey = 'methodKey';
      const module = {
        controllers: new Map(),
      } as any;
      const wrapper = new InstanceWrapper({
        instance: { [methodKey]: {} },
      });

      it('should delegete error to exception filters', async () => {
        const handler = routerBuilder.createRequestScopedHandler(
          wrapper,
          RequestMethod.ALL,
          module,
          moduleKey,
          methodKey,
        );
        await handler(null, null, null);

        expect(nextSpy.called).to.be.true;
        expect(nextSpy.getCall(0).args[0]).to.be.instanceOf(Error);
        expect(nextSpy.getCall(0).args[1]).to.be.instanceOf(
          ExecutionContextHost,
        );
      });
    });
  });

  describe('applyUriVersioningCallbacks', () => {
    describe('when the version is VERSION_NEUTRAL', () => {
      it('should add the router callback for the unversioned url', () => {
        const version = VERSION_NEUTRAL;
        const versioningOptions: VersioningOptions = {
          type: VersioningType.URI,
        };
        const basePath = '/api/';
        const path = '/test';
        const handler = sinon.stub();
        const routerMethod = sinon.stub();

        (routerBuilder as any).applyUriVersioningCallbacks(
          version,
          versioningOptions,
          basePath,
          path,
          handler,
          routerMethod,
        );
        expect(routerMethod.calledWith('/api/test', handler)).to.be.true;
      });
    });

    describe('when the version prefix is configured', () => {
      it('should add the router callbacks for the version urls with the string version prefix', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.URI,
          prefix: 'version',
        };
        const basePath = '/api/';
        const path = '/test';
        const handler = sinon.stub();
        const routerMethod = sinon.stub();

        (routerBuilder as any).applyUriVersioningCallbacks(
          version,
          versioningOptions,
          basePath,
          path,
          handler,
          routerMethod,
        );

        expect(routerMethod.calledWith('/api/version1/test', handler)).to.be
          .true;
      });

      it('should add the router callbacks for the version urls without the version prefix when set to false', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.URI,
          prefix: false,
        };
        const basePath = '/api/';
        const path = '/test';
        const handler = sinon.stub();
        const routerMethod = sinon.stub();

        (routerBuilder as any).applyUriVersioningCallbacks(
          version,
          versioningOptions,
          basePath,
          path,
          handler,
          routerMethod,
        );

        expect(routerMethod.calledWith('/api/1/test', handler)).to.be.true;
      });

      it('should add the router callbacks for the version urls with the default version prefix', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.URI,
        };
        const basePath = '/api/';
        const path = '/test';
        const handler = sinon.stub();
        const routerMethod = sinon.stub();

        (routerBuilder as any).applyUriVersioningCallbacks(
          version,
          versioningOptions,
          basePath,
          path,
          handler,
          routerMethod,
        );

        expect(routerMethod.calledWith('/api/v1/test', handler)).to.be.true;
      });
    });

    describe('when the version is an array', () => {
      it('should add the router callback for the version urls', () => {
        const version = ['1', '2'];
        const versioningOptions: VersioningOptions = {
          type: VersioningType.URI,
        };
        const basePath = '/api/';
        const path = '/test';
        const handler = sinon.stub();
        const routerMethod = sinon.stub();

        (routerBuilder as any).applyUriVersioningCallbacks(
          version,
          versioningOptions,
          basePath,
          path,
          handler,
          routerMethod,
        );

        expect(routerMethod.calledWith('/api/v1/test', handler)).to.be.true;
        expect(routerMethod.calledWith('/api/v2/test', handler)).to.be.true;
        expect(routerMethod.callCount).to.be.eql(2);
      });
    });

    describe('when the version is a string', () => {
      it('should add the router callback for the version url', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.URI,
        };
        const basePath = '/api/';
        const path = '/test';
        const handler = sinon.stub();
        const routerMethod = sinon.stub();

        (routerBuilder as any).applyUriVersioningCallbacks(
          version,
          versioningOptions,
          basePath,
          path,
          handler,
          routerMethod,
        );

        expect(routerMethod.calledWith('/api/v1/test', handler)).to.be.true;
      });
    });
  });

  describe('applyVersionFilter', () => {
    describe('when the version is VERSION_NEUTRAL', () => {
      it('should return the handler', () => {
        const version = VERSION_NEUTRAL;
        const versioningOptions: VersioningOptions = {
          type: VersioningType.URI,
        };
        const handler = sinon.stub();

        const versionFilter = (routerBuilder as any).applyVersionFilter(
          version,
          versioningOptions,
          handler,
        );

        const req = {};
        const res = {};
        const next = sinon.stub();

        versionFilter(req, res, next);

        expect(handler.calledWith(req, res, next)).to.be.true;
      });
    });

    describe('when the versioning type is URI', () => {
      it('should return the handler', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.URI,
        };
        const handler = sinon.stub();

        const versionFilter = (routerBuilder as any).applyVersionFilter(
          version,
          versioningOptions,
          handler,
        );

        const req = {};
        const res = {};
        const next = sinon.stub();

        versionFilter(req, res, next);
        expect(handler.calledWith(req, res, next)).to.be.true;
      });
    });

    describe('when the versioning type is MEDIA_TYPE', () => {
      it('should return next if there is no Media Type header', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.MEDIA_TYPE,
          key: 'v=',
        };
        const handler = sinon.stub();

        const versionFilter = (routerBuilder as any).applyVersionFilter(
          version,
          versioningOptions,
          handler,
        );

        const req = { headers: {} };
        const res = {};
        const next = sinon.stub();

        versionFilter(req, res, next);

        expect(next.called).to.be.true;
      });

      it('should return next if there is no version in the Media Type header', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.MEDIA_TYPE,
          key: 'v=',
        };
        const handler = sinon.stub();

        const versionFilter = (routerBuilder as any).applyVersionFilter(
          version,
          versioningOptions,
          handler,
        );

        const req = { headers: { accept: 'application/json;' } };
        const res = {};
        const next = sinon.stub();

        versionFilter(req, res, next);

        expect(next.called).to.be.true;
      });

      describe('when the handler version is an array', () => {
        it('should return next if the version in the Media Type header does not match the handler version', () => {
          const version = ['1', '2'];
          const versioningOptions: VersioningOptions = {
            type: VersioningType.MEDIA_TYPE,
            key: 'v=',
          };
          const handler = sinon.stub();

          const versionFilter = (routerBuilder as any).applyVersionFilter(
            version,
            versioningOptions,
            handler,
          );

          const req = { headers: { accept: 'application/json;v=3' } };
          const res = {};
          const next = sinon.stub();

          versionFilter(req, res, next);

          expect(next.called).to.be.true;
        });

        it('should return the handler if the version in the Media Type header matches the handler version', () => {
          const version = ['1', '2'];
          const versioningOptions: VersioningOptions = {
            type: VersioningType.MEDIA_TYPE,
            key: 'v=',
          };
          const handler = sinon.stub();

          const versionFilter = (routerBuilder as any).applyVersionFilter(
            version,
            versioningOptions,
            handler,
          );

          const req = { headers: { accept: 'application/json;v=1' } };
          const res = {};
          const next = sinon.stub();

          versionFilter(req, res, next);

          expect(handler.calledWith(req, res, next)).to.be.true;
        });
      });

      describe('when the handler version is a string', () => {
        it('should return next if the version in the Media Type header does not match the handler version', () => {
          const version = '1';
          const versioningOptions: VersioningOptions = {
            type: VersioningType.MEDIA_TYPE,
            key: 'v=',
          };
          const handler = sinon.stub();

          const versionFilter = (routerBuilder as any).applyVersionFilter(
            version,
            versioningOptions,
            handler,
          );

          const req = { headers: { accept: 'application/json;v=3' } };
          const res = {};
          const next = sinon.stub();

          versionFilter(req, res, next);

          expect(next.called).to.be.true;
        });

        it('should return the handler if the version in the Media Type header matches the handler version', () => {
          const version = '1';
          const versioningOptions: VersioningOptions = {
            type: VersioningType.MEDIA_TYPE,
            key: 'v=',
          };
          const handler = sinon.stub();

          const versionFilter = (routerBuilder as any).applyVersionFilter(
            version,
            versioningOptions,
            handler,
          );

          const req = { headers: { accept: 'application/json;v=1' } };
          const res = {};
          const next = sinon.stub();

          versionFilter(req, res, next);

          expect(handler.calledWith(req, res, next)).to.be.true;
        });
      });
    });

    describe('when the versioning type is HEADER', () => {
      it('should return next if there is no Custom Header', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.HEADER,
          header: 'X-API-Version',
        };
        const handler = sinon.stub();

        const versionFilter = (routerBuilder as any).applyVersionFilter(
          version,
          versioningOptions,
          handler,
        );

        const req = { headers: {} };
        const res = {};
        const next = sinon.stub();

        versionFilter(req, res, next);

        expect(next.called).to.be.true;
      });

      it('should return next if there is no version in the Custom Header', () => {
        const version = '1';
        const versioningOptions: VersioningOptions = {
          type: VersioningType.HEADER,
          header: 'X-API-Version',
        };
        const handler = sinon.stub();

        const versionFilter = (routerBuilder as any).applyVersionFilter(
          version,
          versioningOptions,
          handler,
        );

        const req = { headers: { 'X-API-Version': '' } };
        const res = {};
        const next = sinon.stub();

        versionFilter(req, res, next);

        expect(next.called).to.be.true;
      });

      describe('when the handler version is an array', () => {
        it('should return next if the version in the Custom Header does not match the handler version', () => {
          const version = ['1', '2'];
          const versioningOptions: VersioningOptions = {
            type: VersioningType.HEADER,
            header: 'X-API-Version',
          };
          const handler = sinon.stub();

          const versionFilter = (routerBuilder as any).applyVersionFilter(
            version,
            versioningOptions,
            handler,
          );

          const req = { headers: { 'X-API-Version': '3' } };
          const res = {};
          const next = sinon.stub();

          versionFilter(req, res, next);

          expect(next.called).to.be.true;
        });

        it('should return the handler if the version in the Custom Header matches the handler version', () => {
          const version = ['1', '2'];
          const versioningOptions: VersioningOptions = {
            type: VersioningType.HEADER,
            header: 'X-API-Version',
          };
          const handler = sinon.stub();

          const versionFilter = (routerBuilder as any).applyVersionFilter(
            version,
            versioningOptions,
            handler,
          );

          const req = { headers: { 'X-API-Version': '1' } };
          const res = {};
          const next = sinon.stub();

          versionFilter(req, res, next);

          expect(handler.calledWith(req, res, next)).to.be.true;
        });
      });

      describe('when the handler version is a string', () => {
        it('should return next if the version in the Custom Header does not match the handler version', () => {
          const version = '1';
          const versioningOptions: VersioningOptions = {
            type: VersioningType.HEADER,
            header: 'X-API-Version',
          };
          const handler = sinon.stub();

          const versionFilter = (routerBuilder as any).applyVersionFilter(
            version,
            versioningOptions,
            handler,
          );

          const req = { headers: { 'X-API-Version': '3' } };
          const res = {};
          const next = sinon.stub();

          versionFilter(req, res, next);

          expect(next.called).to.be.true;
        });

        it('should return the handler if the version in the Custom Header matches the handler version', () => {
          const version = '1';
          const versioningOptions: VersioningOptions = {
            type: VersioningType.HEADER,
            header: 'X-API-Version',
          };
          const handler = sinon.stub();

          const versionFilter = (routerBuilder as any).applyVersionFilter(
            version,
            versioningOptions,
            handler,
          );

          const req = { headers: { 'X-API-Version': '1' } };
          const res = {};
          const next = sinon.stub();

          versionFilter(req, res, next);

          expect(handler.calledWith(req, res, next)).to.be.true;
        });
      });
    });

    describe('when versioning type is unrecognized', () => {
      it('should throw an error if there is no next function', () => {
        const version = '1';
        const versioningOptions = {
          type: 'UNKNOWN',
        };
        const handler = sinon.stub();

        const versionFilter = (routerBuilder as any).applyVersionFilter(
          version,
          versioningOptions,
          handler,
        );

        const req = {};
        const res = {};
        const next = null;

        expect(() => versionFilter(req, res, next)).to.throw(
          'HTTP adapter does not support filtering on version',
        );
      });

      it('should return next', () => {
        const version = '1';
        const versioningOptions = {
          type: 'UNKNOWN',
        };
        const handler = sinon.stub();

        const versionFilter = (routerBuilder as any).applyVersionFilter(
          version,
          versioningOptions,
          handler,
        );

        const req = {};
        const res = {};
        const next = sinon.stub();

        versionFilter(req, res, next);

        expect(next.called).to.be.true;
      });
    });
  });
});
