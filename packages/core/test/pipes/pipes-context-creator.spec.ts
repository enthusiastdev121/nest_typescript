import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { PipesContextCreator } from '../../pipes/pipes-context-creator';

class Pipe {}

describe('PipesContextCreator', () => {
  let creator: PipesContextCreator;
  let container: NestContainer;

  beforeEach(() => {
    container = new NestContainer();
    creator = new PipesContextCreator(container);
  });
  describe('createConcreteContext', () => {
    describe('when metadata is empty or undefined', () => {
      it('should returns empty array', () => {
        expect(creator.createConcreteContext(undefined)).to.be.deep.equal([]);
        expect(creator.createConcreteContext([])).to.be.deep.equal([]);
      });
    });
    describe('when metadata is not empty or undefined', () => {
      const metadata = [null, {}, { transform: () => ({}) }];
      it('should returns expected array', () => {
        const transforms = creator.createConcreteContext(metadata as any);
        expect(transforms).to.have.length(1);
      });
    });
  });
  describe('getPipeInstance', () => {
    describe('when param is an object', () => {
      it('should return instance', () => {
        const instance = { transform: () => null };
        expect(creator.getPipeInstance(instance)).to.be.eql(instance);
      });
    });
    describe('when param is a constructor', () => {
      it('should pick instance from container', () => {
        const wrapper: InstanceWrapper = {
          instance: 'test',
          getInstanceByContextId: () => wrapper,
        } as any;
        sinon.stub(creator, 'getInstanceByMetatype').callsFake(() => wrapper);
        expect(creator.getPipeInstance(Pipe)).to.be.eql(wrapper.instance);
      });
      it('should return null', () => {
        sinon.stub(creator, 'getInstanceByMetatype').callsFake(() => null);
        expect(creator.getPipeInstance(Pipe)).to.be.eql(null);
      });
    });
  });

  describe('getInstanceByMetatype', () => {
    describe('when "moduleContext" is nil', () => {
      it('should return undefined', () => {
        (creator as any).moduleContext = undefined;
        expect(creator.getInstanceByMetatype(null)).to.be.undefined;
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (creator as any).moduleContext = 'test';
      });

      describe('and when module exists', () => {
        it('should return undefined', () => {
          sinon.stub(container.getModules(), 'get').callsFake(() => undefined);
          expect(creator.getInstanceByMetatype(null)).to.be.undefined;
        });
      });

      describe('and when module does not exist', () => {
        it('should return instance', () => {
          const instance = { test: true };
          const module = { injectables: { get: () => instance } };
          sinon
            .stub(container.getModules(), 'get')
            .callsFake(() => module as any);
          expect(creator.getInstanceByMetatype({ name: 'test' })).to.be.eql(
            instance,
          );
        });
      });
    });
  });
});
