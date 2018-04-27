import * as sinon from 'sinon';
import { expect } from 'chai';
import {
  Guard,
  Injectable,
  UseGuards,
  Component,
  UsePipes,
} from './../../../common';
import { RpcProxy } from './../../context/rpc-proxy';
import { RpcContextCreator } from './../../context/rpc-context-creator';
import { RpcExceptionsHandler } from '../../exceptions/rpc-exceptions-handler';
import { ExceptionFiltersContext } from './../../context/exception-filters-context';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer';
import { PARAMTYPES_METADATA } from '../../../common/constants';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator';
import { GuardsConsumer } from '../../../core/guards/guards-consumer';
import { NestContainer } from '../../../core/injector/container';
import { Observable, of } from 'rxjs';
import { RpcException } from '../../index';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer';
import { ApplicationConfig } from '../../../core/application-config';

@Guard()
class TestGuard {
  canActivate: () => true;
}

@Injectable()
class TestPipe {
  transform(val) {
    return val;
  }
}

describe('RpcContextCreator', () => {
  let contextCreator: RpcContextCreator;
  let rpcProxy: RpcProxy;
  let exceptionFiltersContext: ExceptionFiltersContext;
  let pipesCreator: PipesContextCreator;
  let pipesConsumer: PipesConsumer;
  let guardsContextCreator: GuardsContextCreator;
  let guardsConsumer: GuardsConsumer;
  let instance: Test;
  let module: string;

  @UseGuards(TestGuard)
  @Component()
  class Test {
    @UsePipes(new TestPipe())
    test(data: string) {
      return of(false);
    }
  }

  beforeEach(() => {
    const container: any = new NestContainer();
    rpcProxy = new RpcProxy();
    exceptionFiltersContext = new ExceptionFiltersContext(
      container,
      new ApplicationConfig() as any,
    );
    sinon.stub(rpcProxy, 'create').callsFake(a => a);

    pipesCreator = new PipesContextCreator(container);
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(container);
    guardsConsumer = new GuardsConsumer();
    contextCreator = new RpcContextCreator(
      rpcProxy,
      exceptionFiltersContext,
      pipesCreator as any,
      pipesConsumer as any,
      guardsContextCreator as any,
      guardsConsumer as any,
      new InterceptorsContextCreator(container) as any,
      new InterceptorsConsumer() as any,
    );

    instance = new Test();
    module = 'test';
  });
  describe('create', () => {
    it('should create exception handler', () => {
      const handlerCreateSpy = sinon.spy(exceptionFiltersContext, 'create');
      contextCreator.create(instance, instance.test, module);
      expect(handlerCreateSpy.calledWith(instance, instance.test)).to.be.true;
    });
    it('should create pipes context', () => {
      const pipesCreateSpy = sinon.spy(pipesCreator, 'create');
      contextCreator.create(instance, instance.test, module);
      expect(pipesCreateSpy.calledWith(instance, instance.test)).to.be.true;
    });
    it('should create guards context', () => {
      const guardsCreateSpy = sinon.spy(guardsContextCreator, 'create');
      contextCreator.create(instance, instance.test, module);
      expect(guardsCreateSpy.calledWith(instance, instance.test, module)).to.be
        .true;
    });
    describe('when proxy called', () => {
      it('should call guards consumer `tryActivate`', async () => {
        const tryActivateSpy = sinon.spy(guardsConsumer, 'tryActivate');
        const proxy = await contextCreator.create(
          instance,
          instance.test,
          module,
        );
        const data = 'test';
        await proxy(data);

        expect(tryActivateSpy.called).to.be.true;
      });
      describe('when can activate', () => {
        it('should call pipes consumer `applyPipes`', async () => {
          const applyPipesSpy = sinon.spy(pipesConsumer, 'applyPipes');
          const proxy = await contextCreator.create(
            instance,
            instance.test,
            module,
          );
          const data = 'test';
          await proxy(data);

          expect(applyPipesSpy.called).to.be.true;
        });
      });
      describe('when can not activate', () => {
        it('should throws forbidden exception', async () => {
          const tryActivateStub = sinon
            .stub(guardsConsumer, 'tryActivate')
            .returns(false);
          const proxy = await contextCreator.create(
            instance,
            instance.test,
            module,
          );
          const data = 'test';

          expect(proxy(data)).to.eventually.rejectedWith(RpcException);
        });
      });
    });
  });

  describe('reflectCallbackParamtypes', () => {
    it('should returns paramtypes array', () => {
      const paramtypes = contextCreator.reflectCallbackParamtypes(
        instance,
        instance.test,
      );
      expect(paramtypes).to.be.eql([String]);
    });
  });

  describe('getDataMetatype', () => {
    describe('when paramtypes are reflected', () => {
      it('should returns data paramtype', () => {
        const type = contextCreator.getDataMetatype(instance, instance.test);
        expect(type).to.be.eql(String);
      });
    });
    describe('when paramtypes are not reflected', () => {
      it('should returns null', () => {
        const type = contextCreator.getDataMetatype(instance, () => ({}));
        expect(type).to.be.null;
      });
    });
  });
});
