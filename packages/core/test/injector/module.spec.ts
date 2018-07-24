import { expect } from 'chai';
import * as sinon from 'sinon';
import { Component } from '../../../common/decorators/core/component.decorator';
import { Module as ModuleDecorator } from '../../../common/decorators/modules/module.decorator';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { UnknownElementException } from '../../errors/exceptions/unknown-element.exception';
import { UnknownExportException } from '../../errors/exceptions/unknown-export.exception';
import { NestContainer } from '../../injector/container';
import { Module } from '../../injector/module';

describe('Module', () => {
  let module: Module;
  let container: NestContainer;

  @ModuleDecorator({})
  class TestModule {}
  @Component()
  class TestComponent {}

  beforeEach(() => {
    container = new NestContainer();
    module = new Module(TestModule as any, [], container);
  });

  it('should add route', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    (module as any)._routes = collection;

    class Test {}
    module.addRoute(Test);
    expect(setSpy.getCall(0).args).to.deep.equal([
      'Test',
      {
        name: 'Test',
        metatype: Test,
        instance: null,
        isResolved: false,
      },
    ]);
  });

  it('should add injectable', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    (module as any)._injectables = collection;

    module.addInjectable(TestComponent);
    expect(setSpy.getCall(0).args).to.deep.equal([
      'TestComponent',
      {
        name: 'TestComponent',
        metatype: TestComponent,
        instance: null,
        isResolved: false,
      },
    ]);
  });

  describe('when injectable is custom provided', () => {
    it('should call `addCustomProvider`', () => {
      const addCustomProviderSpy = sinon.spy(module, 'addCustomProvider');

      module.addInjectable({ provide: 'test' } as any);
      expect(addCustomProviderSpy.called).to.be.true;
    });
  });

  it('should add component', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    (module as any)._components = collection;

    module.addComponent(TestComponent);
    expect(setSpy.getCall(0).args).to.deep.equal([
      'TestComponent',
      {
        name: 'TestComponent',
        metatype: TestComponent,
        instance: null,
        isResolved: false,
      },
    ]);
  });

  it('should call "addCustomProvider" when "provide" property exists', () => {
    const addCustomProvider = sinon.spy();
    module.addCustomProvider = addCustomProvider;

    const provider = { provide: 'test', useValue: 'test' };

    module.addComponent(provider as any);
    expect((addCustomProvider as sinon.SinonSpy).called).to.be.true;
  });

  it('should call "addCustomClass" when "useClass" property exists', () => {
    const addCustomClass = sinon.spy();
    module.addCustomClass = addCustomClass;

    const provider = { provide: 'test', useClass: () => null };

    module.addCustomProvider(provider as any, new Map());
    expect((addCustomClass as sinon.SinonSpy).called).to.be.true;
  });

  it('should call "addCustomValue" when "useValue" property exists', () => {
    const addCustomValue = sinon.spy();
    module.addCustomValue = addCustomValue;

    const provider = { provide: 'test', useValue: () => null };

    module.addCustomProvider(provider as any, new Map());
    expect((addCustomValue as sinon.SinonSpy).called).to.be.true;
  });

  it('should call "addCustomFactory" when "useFactory" property exists', () => {
    const addCustomFactory = sinon.spy();
    module.addCustomFactory = addCustomFactory;

    const provider = { provide: 'test', useFactory: () => null };

    module.addCustomProvider(provider as any, new Map());
    expect((addCustomFactory as sinon.SinonSpy).called).to.be.true;
  });

  describe('addCustomClass', () => {
    const type = { name: 'TypeTest' };
    const component = { provide: type, useClass: type, name: 'test' };
    let setSpy;
    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      (module as any)._components = collection;
    });
    it('should store component', () => {
      module.addCustomClass(component as any, (module as any)._components);
      expect(
        setSpy.calledWith(component.name, {
          name: component.name,
          metatype: type,
          instance: null,
          isResolved: false,
        }),
      ).to.be.true;
    });
  });

  describe('addCustomValue', () => {
    let setSpy;
    const value = () => ({});
    const name = 'test';
    const component = { provide: value, name, useValue: value };

    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      (module as any)._components = collection;
    });

    it('should store component', () => {
      module.addCustomValue(component as any, (module as any)._components);
      expect(
        setSpy.calledWith(name, {
          name,
          metatype: null,
          instance: value,
          isResolved: true,
          isNotMetatype: true,
          async: false,
        }),
      ).to.be.true;
    });
  });

  describe('addCustomFactory', () => {
    const type = { name: 'TypeTest' };
    const inject = [1, 2, 3];
    const component = { provide: type, useFactory: type, name: 'test', inject };

    let setSpy;
    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      (module as any)._components = collection;
    });
    it('should store component', () => {
      module.addCustomFactory(component as any, (module as any)._components);
      expect(setSpy.getCall(0).args).to.deep.equal([
        component.name,
        {
          name: component.name,
          metatype: type,
          instance: null,
          isResolved: false,
          inject,
          isNotMetatype: true,
        },
      ]);
    });
  });

  describe('when get instance', () => {
    describe('when metatype does not exists in components collection', () => {
      beforeEach(() => {
        sinon.stub((module as any)._components, 'has').returns(false);
      });
      it('should throws RuntimeException', () => {
        expect(() => module.instance).to.throws(RuntimeException);
      });
    });
    describe('when metatype exists in components collection', () => {
      it('should returns null', () => {
        expect(module.instance).to.be.eql(null);
      });
    });
  });

  describe('when exported component is custom provided', () => {
    beforeEach(() => {
      sinon.stub(module, 'validateExportedProvider').callsFake(o => o);
    });
    it('should call `addCustomExportedComponent`', () => {
      const addCustomExportedComponentSpy = sinon.spy(
        module,
        'addCustomExportedComponent',
      );

      module.addExportedComponent({ provide: 'test' } as any);
      expect(addCustomExportedComponentSpy.called).to.be.true;
    });
    it('should support symbols', () => {
      const addCustomExportedComponentSpy = sinon.spy(
        module,
        'addCustomExportedComponent',
      );
      const symb = Symbol('test');
      module.addExportedComponent({ provide: symb } as any);
      expect(addCustomExportedComponentSpy.called).to.be.true;
      expect((module as any)._exports.has(symb)).to.be.true;
    });
  });

  describe('replace', () => {
    describe('when component', () => {
      it('should call `addComponent`', () => {
        const addComponentSpy = sinon.spy(module, 'addComponent');
        module.replace(null, { isComponent: true });
        expect(addComponentSpy.called).to.be.true;
      });
    });
    describe('when guard', () => {
      it('should call `addInjectable`', () => {
        const addInjectableSpy = sinon.spy(module, 'addInjectable');
        module.replace(null, {});
        expect(addInjectableSpy.called).to.be.true;
      });
    });
  });

  describe('relatedModules', () => {
    it('should return relatedModules', () => {
      const test = ['test'];
      (module as any)._relatedModules = test;
      expect(module.relatedModules).to.be.eql(test);
    });
  });

  describe('injectables', () => {
    it('should return injectables', () => {
      const test = ['test'];
      (module as any)._injectables = test;
      expect(module.injectables).to.be.eql(test);
    });
  });

  describe('routes', () => {
    it('should return routes', () => {
      const test = ['test'];
      (module as any)._routes = test;
      expect(module.routes).to.be.eql(test);
    });
  });

  describe('exports', () => {
    it('should return exports', () => {
      const test = ['test'];
      (module as any)._exports = test;
      expect(module.exports).to.be.eql(test);
    });
  });

  describe('createModuleRefMetatype', () => {
    let moduleRef;

    class SimpleClass {}

    beforeEach(() => {
      const Class = module.createModuleRefMetatype();
      moduleRef = new Class();
    });

    it('should return metatype with "get" method', () => {
      expect(!!moduleRef.get).to.be.true;
    });
    describe('get', () => {
      it('should throw exception if not exists', () => {
        expect(() => moduleRef.get('fail')).to.throws(UnknownElementException);
      });
    });
  });
  describe('validateExportedProvider', () => {
    const token = 'token';

    describe('when unit exists in component collection', () => {
      it('should behave as identity', () => {
        (module as any)._components = new Map([[token, true]]);
        expect(module.validateExportedProvider(token)).to.be.eql(token);
      });
    });
    describe('when unit exists in related modules collection', () => {
      it('should behave as identity', () => {
        const metatype = { name: token };
        (module as any)._relatedModules = new Set([
          new Module(metatype as any, [], new NestContainer()),
        ]);
        expect(module.validateExportedProvider(token)).to.be.eql(token);
      });
    });
    describe('when unit does not exist in both component and related modules collections', () => {
      it('should throw UnknownExportException', () => {
        expect(() => module.validateExportedProvider(token)).to.throws(
          UnknownExportException,
        );
      });
    });
  });
});
