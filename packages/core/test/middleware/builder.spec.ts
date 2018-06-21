import { RequestMethod } from '@nestjs/common';
import { expect } from 'chai';
import { Controller, Get } from '../../../common';
import { NestContainer } from '../../injector/container';
import { MiddlewareBuilder } from '../../middleware/builder';
import { RoutesMapper } from '../../middleware/routes-mapper';

describe('MiddlewareBuilder', () => {
  let builder: MiddlewareBuilder;

  beforeEach(() => {
    builder = new MiddlewareBuilder(new RoutesMapper(new NestContainer()));
  });
  describe('apply', () => {
    let configProxy;
    beforeEach(() => {
      configProxy = builder.apply([]);
    });
    it('should return configuration proxy', () => {
      const metatype = (MiddlewareBuilder as any).ConfigProxy;
      expect(configProxy instanceof metatype).to.be.true;
    });
    describe('configuration proxy', () => {
      it('should returns itself on "with()" call', () => {
        expect(configProxy.with()).to.be.eq(configProxy);
      });
      describe('when "forRoutes()" called', () => {
        @Controller('path')
        class Test {
          @Get('route')
          public getAll() {}
        }
        const route = { path: '/test', method: 0 };
        it('should store configuration passed as argument', () => {
          configProxy.forRoutes(route, Test);

          expect(builder.build()).to.deep.equal([
            {
              middleware: [],
              forRoutes: [
                {
                  method: 0,
                  path: route.path,
                },
                {
                  method: 0,
                  path: '/path/route',
                },
              ],
            },
          ]);
        });
      });
    });
  });

  describe('exclude', () => {
    it('should map string to RouteInfo', () => {
      const path = '/test';
      const proxy: any = builder.apply().exclude(path);

      expect(proxy.getExcludedRoutes()).to.be.eql([
        {
          path,
          method: RequestMethod.ALL,
        },
      ]);
    });
  });

  describe('isRouteExcluded', () => {
    const routeInfo = { path: '/test', method: RequestMethod.POST };
    let proxy: any;

    beforeEach(() => {
      proxy = builder.apply();
    });
    describe('when path is equal', () => {
      describe('when method is ALL', () => {
        it('should return true', () => {
          proxy.exclude(routeInfo.path);

          expect(proxy.isRouteExcluded(routeInfo)).to.be.true;
        });
      });
      describe('when method is equal', () => {
        it('should return true', () => {
          proxy.exclude({
            path: routeInfo.path,
            method: RequestMethod.POST,
          });

          expect(proxy.isRouteExcluded(routeInfo)).to.be.true;
        });
      });
      describe('when path has / at the end', () => {
        it('should return true', () => {
          proxy.exclude({
            path: 'test',
            method: RequestMethod.POST,
          });

          expect(proxy.isRouteExcluded({
            ...routeInfo,
            path: '/test/',
          })).to.be.true;
        });
      });
      describe('when method is not equal', () => {
        it('should return false', () => {
          proxy.exclude({
            path: routeInfo.path,
            method: RequestMethod.GET,
          });

          expect(proxy.isRouteExcluded(routeInfo)).to.be.false;
        });
      });
    });
    describe('when path is not equal', () => {
      it('should return false', () => {
        proxy.exclude({
          path: 'testx',
          method: RequestMethod.POST,
        });

        expect(proxy.isRouteExcluded(routeInfo)).to.be.false;
      });
    });
  });
});
