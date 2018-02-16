import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { CUSTOM_ROUTE_AGRS_METADATA } from '../../../common/constants';
import { createRouteParamDecorator } from '../../../common/decorators/http/create-route-param-metadata.decorator';
import { RouterExecutionContext } from '../../router/router-execution-context';
import { RouteParamsMetadata, Request, Body } from '../../../index';
import { RouteParamsFactory } from '../../router/route-params-factory';
import { PipesContextCreator } from '../../pipes/pipes-context-creator';
import { PipesConsumer } from '../../pipes/pipes-consumer';
import { ApplicationConfig } from '../../application-config';
import { GuardsConsumer } from '../../guards/guards-consumer';
import { GuardsContextCreator } from '../../guards/guards-context-creator';
import { NestContainer } from '../../injector/container';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';

describe('RouterExecutionContext', () => {
  let contextCreator: RouterExecutionContext;
  let callback;
  let applySpy: sinon.SinonSpy;
  let bindSpy: sinon.SinonSpy;
  let factory: RouteParamsFactory;
  let consumer: PipesConsumer;
  let guardsConsumer: GuardsConsumer;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    bindSpy = sinon.spy(callback, 'bind');
    applySpy = sinon.spy(callback, 'apply');

    factory = new RouteParamsFactory();
    consumer = new PipesConsumer();
    guardsConsumer = new GuardsConsumer();

    contextCreator = new RouterExecutionContext(
      factory,
      new PipesContextCreator(new ApplicationConfig()),
      consumer,
      new GuardsContextCreator(new NestContainer()),
      guardsConsumer,
      new InterceptorsContextCreator(new NestContainer()),
      new InterceptorsConsumer(),
    );
  });
  describe('create', () => {
    describe('when callback metadata is not undefined', () => {
      let metadata: RouteParamsMetadata;
      let exchangeKeysForValuesSpy: sinon.SinonSpy;
      beforeEach(() => {
        metadata = {
          [RouteParamtypes.NEXT]: { index: 0 },
          [RouteParamtypes.BODY]: {
            index: 2,
            data: 'test',
          },
        };
        sinon.stub(contextCreator, 'reflectCallbackMetadata').returns(metadata);
        sinon.stub(contextCreator, 'reflectCallbackParamtypes').returns([]);
        exchangeKeysForValuesSpy = sinon.spy(
          contextCreator,
          'exchangeKeysForValues',
        );
      });
      it('should call "exchangeKeysForValues" with expected arguments', done => {
        const keys = Object.keys(metadata);

        contextCreator.create({ foo: 'bar' }, callback as any, '', '', 0);
        expect(exchangeKeysForValuesSpy.called).to.be.true;
        expect(exchangeKeysForValuesSpy.calledWith(keys, metadata)).to.be.true;
        done();
      });
      describe('returns proxy function', () => {
        let proxyContext;
        let instance;

        beforeEach(() => {
          instance = { foo: 'bar' };
          proxyContext = contextCreator.create(
            instance,
            callback as any,
            '',
            '',
            0,
          );
        });
        it('should be a function', () => {
          expect(proxyContext).to.be.a('function');
        });
        describe('when proxy function called', () => {
          let request;
          const response = {
            status: () => response,
            send: () => response,
            json: () => response,
          };
          const next = {};

          beforeEach(() => {
            request = {
              body: {
                test: 3,
              },
            };
          });
          it('should apply expected context and arguments to callback', done => {
            proxyContext(request, response, next).then(() => {
              const args = [next, null, request.body.test];
              expect(applySpy.called).to.be.true;
              expect(applySpy.calledWith(instance, args)).to.be.true;
              done();
            });
          });
          it('should throw exception when "tryActivate" returns false', () => {
            sinon.stub(guardsConsumer, 'tryActivate', () => false);
            expect(proxyContext(request, response, next)).to.eventually.throw();
          });
        });
      });
    });
  });
  describe('reflectCallbackMetadata', () => {
    const CustomDecorator = createRouteParamDecorator(() => {});
    class TestController {
      public callback(
        @Request() req,
        @Body() body,
        @CustomDecorator() custom,
      ) {}
    }
    it('should returns ROUTE_ARGS_METADATA callback metadata', () => {
      const instance = new TestController();
      const metadata = contextCreator.reflectCallbackMetadata(
        instance,
        'callback',
      );

      const expectedMetadata = {
        [`${RouteParamtypes.REQUEST}:0`]: {
          index: 0,
          data: undefined,
          pipes: [],
        },
        [`${RouteParamtypes.BODY}:1`]: {
          index: 1,
          data: undefined,
          pipes: [],
        },
        [`custom${CUSTOM_ROUTE_AGRS_METADATA}:2`]: {
          index: 2,
          factory: () => {},
          data: undefined,
        },
      };
      expect(metadata[`${RouteParamtypes.REQUEST}:0`]).to.deep.equal(
        expectedMetadata[`${RouteParamtypes.REQUEST}:0`],
      );
      expect(metadata[`${RouteParamtypes.REQUEST}:1`]).to.deep.equal(
        expectedMetadata[`${RouteParamtypes.REQUEST}:1`],
      );

      const keys = Object.keys(metadata);
      const custom = keys.find(key => key.includes(CUSTOM_ROUTE_AGRS_METADATA));

      expect(metadata[custom]).to.be.an('object');
      expect(metadata[custom].index).to.be.eq(2);
      expect(metadata[custom].data).to.be.eq(undefined);
      expect(metadata[custom].factory).to.be.a('function');
    });
  });
  describe('getArgumentsLength', () => {
    it('should returns maximum index + 1 (length) placed in array', () => {
      const max = 4;
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0 },
        [RouteParamtypes.BODY]: {
          index: max,
        },
      };
      expect(
        contextCreator.getArgumentsLength(Object.keys(metadata), metadata),
      ).to.be.eq(max + 1);
    });
  });
  describe('createNullArray', () => {
    it('should create N size array filled with null', () => {
      const size = 3;
      expect(contextCreator.createNullArray(size)).to.be.deep.eq([
        null,
        null,
        null,
      ]);
    });
  });
  describe('exchangeKeysForValues', () => {
    const res = { body: 'res' };
    const req = { body: { test: 'req' } };
    const next = () => {};

    it('should exchange arguments keys for appropriate values', () => {
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0, data: 'test', pipes: [] },
        [RouteParamtypes.BODY]: { index: 2, data: 'test', pipes: [] },
        [`key${CUSTOM_ROUTE_AGRS_METADATA}`]: {
          index: 3,
          data: 'custom',
          pipes: [],
        },
      };
      const keys = Object.keys(metadata);
      const values = contextCreator.exchangeKeysForValues(keys, metadata);
      const expectedValues = [
        { index: 0, type: RouteParamtypes.REQUEST, data: 'test' },
        { index: 2, type: RouteParamtypes.BODY, data: 'test' },
        { index: 3, type: `key${CUSTOM_ROUTE_AGRS_METADATA}`, data: 'custom' },
      ];
      expect(values[0]).to.deep.include(expectedValues[0]);
      expect(values[1]).to.deep.include(expectedValues[1]);
    });
  });
  describe('getCustomFactory', () => {
    describe('when factory is function', () => {
      it('should return curried factory', () => {
        const data = 3;
        const result = 10;
        const customFactory = (_, req) => result;

        expect(
          contextCreator.getCustomFactory(customFactory, data)(),
        ).to.be.eql(result);
      });
    });
    describe('when factory is undefined / is not a function', () => {
      it('should return curried null identity', () => {
        const result = 10;
        const customFactory = undefined;
        expect(
          contextCreator.getCustomFactory(customFactory, undefined)(),
        ).to.be.eql(null);
      });
    });
  });
  describe('mergeParamsMetatypes', () => {
    it('should return "paramsProperties" when paramtypes array doesnt exists', () => {
      const paramsProperties = ['1'];
      expect(
        contextCreator.mergeParamsMetatypes(paramsProperties as any, null),
      ).to.be.eql(paramsProperties);
    });
  });
  describe('getParamValue', () => {
    let consumerApplySpy: sinon.SinonSpy;
    const value = 3,
      metatype = null,
      transforms = [];

    beforeEach(() => {
      consumerApplySpy = sinon.spy(consumer, 'apply');
    });
    describe('when paramtype is query, body or param', () => {
      it('should call "consumer.apply" with expected arguments', () => {
        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.QUERY, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.QUERY, data: null },
            transforms,
          ),
        ).to.be.true;

        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.BODY, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.BODY, data: null },
            transforms,
          ),
        ).to.be.true;

        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.PARAM, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.PARAM, data: null },
            transforms,
          ),
        ).to.be.true;
      });
    });
    describe('when paramtype is not query, body and param', () => {
      it('should not call "consumer.apply"', () => {
        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.NEXT, data: null },
          transforms,
        );
        expect(consumerApplySpy.called).to.be.false;
      });
    });
  });
  describe('createPipesFn', () => {
    describe('when "paramsOptions" is empty', () => {
      it('returns null', async () => {
        const pipesFn = contextCreator.createPipesFn([], []);
        expect(pipesFn).to.be.null;
      });
    });
  });
  describe('createGuardsFn', () => {
    it('should throw exception when "tryActivate" returns false', () => {
      const guardsFn = contextCreator.createGuardsFn([null], null, null);
      sinon.stub(guardsConsumer, 'tryActivate', () => false);
      expect(guardsFn({})).to.eventually.throw();
    });
  });
  describe('createHandleResponseFn', () => {
    describe('when "renderTemplate" is defined', () => {
      it('should call "res.render()" with expected args', () => {
        const template = 'template';
        const value = 'test';
        const response = { render: sinon.spy() };
        
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(template);
        const handler = contextCreator.createHandleResponseFn(null, true, 100);
        handler(value, response);

        expect(response.render.calledWith(template, value)).to.be.true;
      });
    });
    describe('when "renderTemplate" is undefined', () => {
      it('should not call "res.render()"', () => {
        const result = Promise.resolve('test');
        const response = { render: sinon.spy() };
        
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined);
        const handler = contextCreator.createHandleResponseFn(null, true, 100);
        handler(result, response);

        expect(response.render.called).to.be.false;
      });
    });
  });
});
