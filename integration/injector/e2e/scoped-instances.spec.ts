import { InvalidClassScopeException } from '@nestjs/core/errors/exceptions/invalid-class-scope.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { ScopedController } from '../src/scoped/scoped.controller';
import { ScopedModule } from '../src/scoped/scoped.module';
import { ScopedService } from '../src/scoped/scoped.service';
import { TransientService } from '../src/scoped/transient.service';

describe('Scoped Instances', () => {
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [ScopedModule],
    }).compile();
  });

  it('should dynamically resolve transient provider', async () => {
    const transient1 = await testingModule.resolve(TransientService);
    const transient2 = await testingModule.resolve(TransientService);

    expect(transient1).to.be.instanceOf(TransientService);
    expect(transient2).to.be.instanceOf(TransientService);
    expect(transient1).to.be.equal(transient2);
  });

  it('should dynamically resolve request-scoped provider', async () => {
    const request1 = await testingModule.resolve(ScopedService);
    const request2 = await testingModule.resolve(ScopedService);
    const request3 = await testingModule.resolve(ScopedService, { id: 1 });

    expect(request1).to.be.instanceOf(ScopedService);
    expect(request2).to.be.instanceOf(ScopedService);
    expect(request3).to.not.be.equal(request2);
  });

  it('should dynamically resolve request-scoped controller', async () => {
    const request1 = await testingModule.resolve(ScopedController);
    const request2 = await testingModule.resolve(ScopedController);
    const request3 = await testingModule.resolve(ScopedController, { id: 1 });

    expect(request1).to.be.instanceOf(ScopedController);
    expect(request2).to.be.instanceOf(ScopedController);
    expect(request3).to.not.be.equal(request2);
  });

  it('should throw an exception when "get()" method is used', async () => {
    try {
      testingModule.get(ScopedController);
    } catch (err) {
      expect(err).to.be.instanceOf(InvalidClassScopeException);
    }
  });
});
