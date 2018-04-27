import * as sinon from 'sinon';
import { expect } from 'chai';
import { Observable, of } from 'rxjs';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context.host';

describe('InterceptorsConsumer', () => {
  let consumer: InterceptorsConsumer;
  let interceptors: any[];
  beforeEach(() => {
    consumer = new InterceptorsConsumer();
    interceptors = [
      {
        intercept: sinon.stub().returns(of(true)),
      },
      {
        intercept: sinon.stub().returns(of(true)),
      },
    ];
  });
  describe('intercept', () => {
    describe('when interceptors array is empty', () => {
      let next: sinon.SinonSpy;
      beforeEach(() => {
        next = sinon.spy();
      });
      it('should call next()', async () => {
        await consumer.intercept([], null, { constructor: null }, null, next);
        expect(next.calledOnce).to.be.true;
      });
    });
    describe('when interceptors array is not empty', () => {
      let next: sinon.SinonSpy;
      beforeEach(() => {
        next = sinon.spy();
      });
      it('should call every `intercept` method', async () => {
        await consumer.intercept(
          interceptors,
          null,
          { constructor: null },
          null,
          next,
        );

        expect(interceptors[0].intercept.calledOnce).to.be.true;
        expect(interceptors[1].intercept.calledOnce).to.be.true;
      });
      it('should not call `next` (lazy evaluation)', async () => {
        await consumer.intercept(
          interceptors,
          null,
          { constructor: null },
          null,
          next,
        );
        expect(next.called).to.be.false;
      });
    });
  });
  describe('createContext', () => {
    it('should returns execution context object', () => {
      const instance = { constructor: {} };
      const callback = () => null;
      const context = consumer.createContext([], instance, callback);

      expect(context.getClass()).to.be.eql(instance.constructor);
      expect(context.getHandler()).to.be.eql(callback);
    });
  });
  describe('transformDeffered', () => {
    describe('when next() result is plain value', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => val;
        expect(
          await await consumer.transformDeffered(next).toPromise(),
        ).to.be.eql(val);
      });
    });
    describe('when next() result is Promise', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = () => Promise.resolve(val);
        expect(
          await await consumer.transformDeffered(next).toPromise(),
        ).to.be.eql(val);
      });
    });
    describe('when next() result is Observable', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => of(val);
        expect(
          await (await (consumer.transformDeffered(next) as any)).toPromise(),
        ).to.be.eql(val);
      });
    });
  });
});
