import { expect } from 'chai';
import { Subject } from 'rxjs';
import * as sinon from 'sinon';
import { ClientRedis } from '../../client/client-redis';
import { ERROR_EVENT } from '../../constants';
// tslint:disable:no-string-literal

describe('ClientRedis', () => {
  const test = 'test';
  const client = new ClientRedis({});

  describe('getAckPatternName', () => {
    it(`should append _ack to string`, () => {
      const expectedResult = test + '_ack';
      expect(client.getAckPatternName(test)).to.equal(expectedResult);
    });
  });
  describe('getResPatternName', () => {
    it(`should append _res to string`, () => {
      const expectedResult = test + '_res';
      expect(client.getResPatternName(test)).to.equal(expectedResult);
    });
  });
  describe('publish', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data' };
    let subscribeSpy: sinon.SinonSpy,
      publishSpy: sinon.SinonSpy,
      onSpy: sinon.SinonSpy,
      removeListenerSpy: sinon.SinonSpy,
      unsubscribeSpy: sinon.SinonSpy,
      connectSpy: sinon.SinonSpy,
      sub,
      pub;

    beforeEach(() => {
      subscribeSpy = sinon.spy();
      publishSpy = sinon.spy();
      onSpy = sinon.spy();
      removeListenerSpy = sinon.spy();
      unsubscribeSpy = sinon.spy();

      sub = {
        subscribe: subscribeSpy,
        on: (type, handler) => (type === 'subscribe' ? handler() : onSpy()),
        removeListener: removeListenerSpy,
        unsubscribe: unsubscribeSpy,
        addListener: () => ({}),
      };
      pub = { publish: publishSpy };
      (client as any).subClient = sub;
      (client as any).pubClient = pub;
      connectSpy = sinon.spy(client, 'connect');
    });
    afterEach(() => {
      connectSpy.restore();
    });
    it('should subscribe to response pattern name', () => {
      client['publish'](msg, () => {});
      expect(subscribeSpy.calledWith(`${pattern}_res`)).to.be.true;
    });
    it('should publish stringified message to acknowledge pattern name', async () => {
      await client['publish'](msg, () => {});
      expect(publishSpy.calledWith(`${pattern}_ack`, JSON.stringify(msg))).to.be
        .true;
    });
    it('should listen on messages', () => {
      client['publish'](msg, () => {});
      expect(onSpy.called).to.be.true;
    });
    describe('on error', () => {
      let assignPacketIdStub: sinon.SinonStub;
      beforeEach(() => {
        assignPacketIdStub = sinon
          .stub(client, 'assignPacketId')
          .callsFake(() => {
            throw new Error();
          });
      });
      afterEach(() => {
        assignPacketIdStub.restore();
      });

      it('should call callback', () => {
        const callback = sinon.spy();
        client['publish'](msg, callback);

        expect(callback.called).to.be.true;
        expect(callback.getCall(0).args[0].err).to.be.instanceof(Error);
      });
    });
    describe('dispose callback', () => {
      let assignStub: sinon.SinonStub, getResPatternStub: sinon.SinonStub;
      let callback: sinon.SinonSpy, subscription;

      const channel = 'channel';
      const id = '1';

      beforeEach(async () => {
        callback = sinon.spy();
        assignStub = sinon
          .stub(client, 'assignPacketId')
          .callsFake(packet => Object.assign(packet, { id }));

        getResPatternStub = sinon
          .stub(client, 'getResPatternName')
          .callsFake(() => channel);
        subscription = await client['publish'](msg, callback);
        subscription(channel, JSON.stringify({ isDisposed: true, id }));
      });
      afterEach(() => {
        assignStub.restore();
        getResPatternStub.restore();
      });

      it('should unsubscribe to response pattern name', () => {
        expect(unsubscribeSpy.calledWith(channel)).to.be.true;
      });
      it('should remove listener', () => {
        expect(removeListenerSpy.called).to.be.true;
      });
    });
  });
  describe('createResponseCallback', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data', id: '1' };
    let callback: sinon.SinonSpy, subscription;
    const responseMessage = {
      err: null,
      response: 'test',
      id: '1',
    };

    describe('not completed', () => {
      beforeEach(async () => {
        callback = sinon.spy();

        subscription = client.createResponseCallback(msg, callback);
        subscription('channel', new Buffer(JSON.stringify(responseMessage)));
      });
      it('should call callback with expected arguments', () => {
        expect(
          callback.calledWith({
            err: null,
            response: responseMessage.response,
          }),
        ).to.be.true;
      });
    });
    describe('disposed and "id" is correct', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createResponseCallback(msg, callback);
        subscription(
          'channel',
          new Buffer(
            JSON.stringify({
              ...responseMessage,
              isDisposed: true,
            }),
          ),
        );
      });

      it('should call callback with dispose param', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            isDisposed: true,
            response: null,
            err: null,
          }),
        ).to.be.true;
      });
    });
    describe('disposed and "id" is incorrect', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createResponseCallback(
          {
            ...msg,
            id: '2',
          },
          callback,
        );
        subscription('channel', new Buffer(JSON.stringify(responseMessage)));
      });

      it('should not call callback', () => {
        expect(callback.called).to.be.false;
      });
    });
  });
  describe('close', () => {
    let pubClose: sinon.SinonSpy;
    let subClose: sinon.SinonSpy;
    let pub, sub;
    beforeEach(() => {
      pubClose = sinon.spy();
      subClose = sinon.spy();
      pub = { quit: pubClose };
      sub = { quit: subClose };
      (client as any).pubClient = pub;
      (client as any).subClient = sub;
    });
    it('should close "pub" when it is not null', () => {
      client.close();
      expect(pubClose.called).to.be.true;
    });
    it('should not close "pub" when it is null', () => {
      (client as any).pubClient = null;
      client.close();
      expect(pubClose.called).to.be.false;
    });
    it('should close "sub" when it is not null', () => {
      client.close();
      expect(subClose.called).to.be.true;
    });
    it('should not close "sub" when it is null', () => {
      (client as any).subClient = null;
      client.close();
      expect(subClose.called).to.be.false;
    });
  });
  describe('connect', () => {
    let createClientSpy: sinon.SinonSpy;
    let handleErrorsSpy: sinon.SinonSpy;

    beforeEach(async () => {
      createClientSpy = sinon.stub(client, 'createClient').callsFake(() => ({
        addListener: () => null,
        removeListener: () => null,
      }));
      handleErrorsSpy = sinon.spy(client, 'handleError');
      client.connect();
      client['pubClient'] = null;
    });
    afterEach(() => {
      createClientSpy.restore();
      handleErrorsSpy.restore();
    });
    it('should call "createClient" twice', () => {
      expect(createClientSpy.calledTwice).to.be.true;
    });
    it('should call "handleError" twice', () => {
      expect(handleErrorsSpy.calledTwice).to.be.true;
    });
  });
  describe('handleError', () => {
    it('should bind error event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        addListener: callback,
      };
      client.handleError(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(ERROR_EVENT);
    });
  });
  describe('getClientOptions', () => {
    it('should return options object with "retry_strategy" and call "createRetryStrategy"', () => {
      const createSpy = sinon.spy(client, 'createRetryStrategy');
      const { retry_strategy } = client.getClientOptions(new Subject());
      retry_strategy({} as any);
      expect(createSpy.called).to.be.true;
    });
  });
  describe('createRetryStrategy', () => {
    const subject = new Subject<Error>();
    describe('when is terminated', () => {
      it('should return undefined', () => {
        (client as any).isExplicitlyTerminated = true;
        const result = client.createRetryStrategy({} as any, subject);
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        (client as any).options.options = {};
        (client as any).options.options.retryAttempts = undefined;
        const result = client.createRetryStrategy({} as any, subject);
        expect(result).to.be.undefined;
      });
    });
    describe('when "attempts" count is max', () => {
      it('should return undefined', () => {
        (client as any).options.options = {};
        (client as any).options.options.retryAttempts = 3;
        const result = client.createRetryStrategy(
          { attempt: 4 } as any,
          subject,
        );
        expect(result).to.be.undefined;
      });
    });
    describe('when ECONNREFUSED', () => {
      it('should return error', () => {
        const error = { code: 'ECONNREFUSED' };
        const result = client.createRetryStrategy({ error } as any, subject);
        expect(result).to.be.eql(error);
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        (client as any).options.options = {};
        (client as any).isExplicitlyTerminated = false;
        (client as any).options.options.retryAttempts = 3;
        (client as any).options.options.retryDelay = 3;
        const result = client.createRetryStrategy(
          { attempt: 2 } as any,
          subject,
        );
        expect(result).to.be.eql((client as any).options.options.retryDelay);
      });
    });
  });
});
