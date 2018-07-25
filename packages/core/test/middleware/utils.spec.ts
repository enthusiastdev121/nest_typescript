import * as sinon from 'sinon';
import { expect } from 'chai';
import {
  filterMiddleware,
  mapToClass,
  isClass,
  assignToken,
} from '../../middleware/utils';

describe('middleware utils', () => {
  class Test {}
  function fnMiddleware(req, res, next) {}

  describe('filterMiddleware', () => {
    let middleware: any[];
    beforeEach(() => {
      middleware = [Test, fnMiddleware, undefined, null];
    });
    it('should returns filtered middleware', () => {
      expect(filterMiddleware(middleware)).to.have.length(2);
    });
  });
  describe('mapToClass', () => {
    describe('when middleware is a class', () => {
      it('should returns identity', () => {
        const type = mapToClass(Test);
        expect(type).to.eql(Test);
      });
    });
    describe('when middleware is a function', () => {
      it('should returns metatype', () => {
        const metatype = mapToClass(fnMiddleware);
        expect(metatype).to.not.eql(fnMiddleware);
      });
      it('should define `resolve` method', () => {
        const metatype = mapToClass(fnMiddleware);
        expect(new metatype().resolve).to.exist;
      });
      it('should encapsulate function', () => {
        const spy = sinon.spy();
        const metatype = mapToClass(spy);
        new metatype().resolve()();
        expect(spy.called).to.be.true;
      });
    });
  });
  describe('isClass', () => {
    describe('when middleware is a class', () => {
      it('should returns true', () => {
        expect(isClass(Test)).to.be.true;
      });
    });
    describe('when middleware is a function', () => {
      it('should returns false', () => {
        expect(isClass(fnMiddleware)).to.be.false;
      });
    });
  });
  describe('assignToken', () => {
    describe('should define `name` property on metatype', () => {
      const anonymousType = class {};
      assignToken(anonymousType);
      expect(anonymousType.name).to.exist;
    });
  });
});
