import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientProxy } from '../../client/client-proxy';
import { Observable } from 'rxjs';

class TestClientProxy extends ClientProxy {
  public sendSingleMessage(pattern, callback) {}
}

describe('ClientProxy', () => {
  const client = new TestClientProxy();

  describe('send', () => {
    it(`should return an observable stream`, () => {
      const stream$ = client.send({}, '');
      expect(stream$ instanceof Observable).to.be.true;
    });
    it(`should call "sendSingleMessage" on subscribe`, () => {
      const pattern = { test: 3 };
      const data = 'test';
      const sendSingleMessageSpy = sinon.spy();
      const stream$ = client.send(pattern, data);
      client.sendSingleMessage = sendSingleMessageSpy;

      stream$.subscribe();
      expect(sendSingleMessageSpy.calledOnce).to.be.true;
    });
  });

  describe('createObserver', () => {
    it(`should return function`, () => {
      expect(typeof client['createObserver'](null)).to.be.eql('function');
    });

    describe('returned function calls', () => {
      let fn;
      const error = sinon.spy(),
        next = sinon.spy(),
        complete = sinon.spy(),
        observer = {
          error,
          next,
          complete,
        };

      before(() => {
        fn = client['createObserver'](observer);
      });

      it(`"error" when first parameter is not null or undefined`, () => {
        const err = 'test';
        fn(err);
        expect(error.calledWith(err)).to.be.true;
      });

      it(`"next" when first parameter is null or undefined`, () => {
        const data = 'test';
        fn(null, data);
        expect(next.calledWith(data)).to.be.true;
      });

      it(`"complete" when third parameter is true`, () => {
        const data = 'test';
        fn(null, data, true);
        expect(complete.called).to.be.true;
      });
    });
  });
});
