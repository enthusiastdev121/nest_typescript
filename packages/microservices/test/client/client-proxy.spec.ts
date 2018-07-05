import { expect } from 'chai';
import { Observable } from 'rxjs';
import * as sinon from 'sinon';
import { ClientProxy } from '../../client/client-proxy';
// tslint:disable:no-string-literal

class TestClientProxy extends ClientProxy {
  public async connect() {}
  public publish(pattern, callback) {}
  public close() {}
}

describe('ClientProxy', () => {
  let client: TestClientProxy;
  beforeEach(() => {
    client = new TestClientProxy();
  });

  describe('send', () => {
    it(`should return an observable stream`, () => {
      const stream$ = client.send({}, '');
      expect(stream$ instanceof Observable).to.be.true;
    });
    it('should call "connect" on subscribe', () => {
      const connectSpy = sinon.spy();
      const stream$ = client.send({ test: 3 }, 'test');
      client.connect = connectSpy;

      stream$.subscribe();
      expect(connectSpy.calledOnce).to.be.true;
    });
    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        sinon.stub(client, 'connect').callsFake(() => { throw new Error(); });
        const stream$ = client.send({ test: 3 }, 'test');
        stream$.subscribe(() => {}, (err) => {
          expect(err).to.be.instanceof(Error);
        });
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        sinon.stub(client, 'connect').callsFake(() => Promise.resolve());
      });
      it(`should call "publish"`, () => {
        const pattern = { test: 3 };
        const data = 'test';
        const publishSpy = sinon.spy();
        const stream$ = client.send(pattern, data);
        client.publish = publishSpy;

        stream$.subscribe((() => {
          expect(publishSpy.calledOnce).to.be.true;
        }));
      });
    });
    it('should return Observable with error', () => {
      const err$ = client.send(null, null);
      expect(err$).to.be.instanceOf(Observable);
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
        fn({ err });
        expect(error.calledWith(err)).to.be.true;
      });

      it(`"next" when first parameter is null or undefined`, () => {
        const data = 'test';
        fn({ response: data });
        expect(next.calledWith(data)).to.be.true;
      });

      it(`"complete" when third parameter is true`, () => {
        const data = 'test';
        fn({ data, isDisposed: true });
        expect(complete.called).to.be.true;
      });
    });
  });
});
