import * as sinon from 'sinon';
import { expect } from 'chai';
import { InstanceLoader } from '../../injector/instance-loader';
import { NestContainer } from '../../injector/container';
import { Injector } from '../../injector/injector';
import { Controller } from '../../../common/utils/decorators/controller.decorator';
import { Component } from '../../../common/utils/decorators/component.decorator';
import { NestEnvironment } from '../../../common/enums/nest-environment.enum';
import { Logger } from '../../../common/services/logger.service';

describe('InstanceLoader', () => {
    let loader: InstanceLoader;
    let container: NestContainer;
    let mockContainer: sinon.SinonMock;

    @Controller({ path: '' })
    class TestRoute {}

    @Component()
    class TestComponent {}

    before(() => Logger.setMode(NestEnvironment.TEST));

    beforeEach(() => {
        container = new NestContainer();
        loader = new InstanceLoader(container);
        mockContainer = sinon.mock(container);
    });

    it('should call "loadPrototypeOfInstance" for each component and route in each module', () => {
        const injector = new Injector();
        (loader as any).injector = injector;

        const module = {
            components: new Map(),
            routes: new Map(),
            metatype: { name: 'test' },
        };
        const componentWrapper = { instance: null, metatype: TestComponent };
        const routeWrapper = { instance: null, metatype: TestRoute };

        module.components.set('TestComponent', componentWrapper);
        module.routes.set('TestRoute', routeWrapper);

        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);

        const loadComponentPrototypeStub = sinon.stub(injector, 'loadPrototypeOfInstance');

        sinon.stub(injector, 'loadInstanceOfRoute');
        sinon.stub(injector, 'loadInstanceOfComponent');

        loader.createInstancesOfDependencies();
        expect(loadComponentPrototypeStub.calledWith(componentWrapper, module.components)).to.be.true;
        expect(loadComponentPrototypeStub.calledWith(routeWrapper, module.components)).to.be.true;
    });

    it('should call "loadInstanceOfComponent" for each component in each module', () => {
        const injector = new Injector();
        (loader as any).injector = injector;

        const module = {
            components: new Map(),
            routes: new Map(),
            metatype: { name: 'test' },
        };
        const testComp = { instance: null, metatype: TestComponent, name: 'TestComponent' };

        module.components.set('TestComponent', testComp);

        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);

        const loadComponentStub = sinon.stub(injector, 'loadInstanceOfComponent');
        sinon.stub(injector, 'loadInstanceOfRoute');

        loader.createInstancesOfDependencies();
        expect(loadComponentStub.calledWith(module.components.get('TestComponent'), module)).to.be.true;
    });

    it('should call "loadInstanceOfRoute" for each route in each module', () => {
        const injector = new Injector();
        (loader as any).injector = injector;

        const module = {
            components: new Map(),
            routes: new Map(),
            metatype: { name: 'test' },
        };
        const wrapper = { name: 'TestRoute', instance: null, metatype: TestRoute };
        module.routes.set('TestRoute', wrapper);

        const modules = new Map();
        modules.set('Test', module);
        mockContainer.expects('getModules').returns(modules);

        sinon.stub(injector, 'loadInstanceOfComponent');
        const loadRoutesStub = sinon.stub(injector, 'loadInstanceOfRoute');

        loader.createInstancesOfDependencies();
        expect(loadRoutesStub.calledWith(module.routes.get('TestRoute'), module)).to.be.true;
    });

});