import { expect } from 'chai';
import safeStringify from 'fast-safe-stringify';
import * as hash from 'object-hash';
import { SingleScope } from '../../../common';
import { ModuleTokenFactory } from '../../injector/module-token-factory';

describe('ModuleTokenFactory', () => {
  let factory: ModuleTokenFactory;
  beforeEach(() => {
    factory = new ModuleTokenFactory();
  });
  describe('create', () => {
    class Module {}
    it('should force global scope when it is not set', () => {
      const scope = 'global';
      const token = factory.create(Module as any, [Module], undefined);
      expect(token).to.be.deep.eq(
        hash({
          module: Module.name,
          dynamic: '',
          scope,
        }),
      );
    });
    it('should returns expected token', () => {
      const token = factory.create(
        SingleScope()(Module) as any,
        [Module],
        undefined,
      );
      expect(token).to.be.deep.eq(
        hash({
          module: Module.name,
          dynamic: '',
          scope: [Module.name],
        }),
      );
    });
    it('should include dynamic metadata', () => {
      const token = factory.create(SingleScope()(Module) as any, [Module], {
        providers: [{}],
      } as any);
      expect(token).to.be.deep.eq(
        hash({
          module: Module.name,
          dynamic: safeStringify({
            providers: [{}],
          }),
          scope: [Module.name],
        }),
      );
    });
  });
  describe('getModuleName', () => {
    it('should map module metatype to name', () => {
      const metatype = () => {};
      expect(factory.getModuleName(metatype as any)).to.be.eql(metatype.name);
    });
  });
  describe('getDynamicMetadataToken', () => {
    describe('when metadata exists', () => {
      it('should return hash', () => {
        const metadata = { providers: ['', {}] };
        expect(factory.getDynamicMetadataToken(metadata as any)).to.be.eql(
          JSON.stringify(metadata),
        );
      });
    });
    describe('when metadata does not exist', () => {
      it('should return empty string', () => {
        expect(factory.getDynamicMetadataToken(undefined)).to.be.eql('');
      });
    });
  });
  describe('getScopeStack', () => {
    it('should map metatypes to the array with last metatype', () => {
      const metatype1 = () => {};
      const metatype2 = () => {};
      expect(
        factory.getScopeStack([metatype1 as any, metatype2 as any]),
      ).to.be.eql([metatype2.name]);
    });
  });
});
