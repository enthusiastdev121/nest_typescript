import { expect } from 'chai';
import * as sinon from 'sinon';
import { ClientTCP } from '../../client/client-tcp';
import { ERROR_EVENT } from '../../constants';
// tslint:disable:no-string-literal

describe('ClientTCP', () => {
  let client: ClientTCP;
  let socket: {
    connect: sinon.SinonStub;
    publish: sinon.SinonSpy;
    _socket: {
      addListener: sinon.SinonStub,
      removeListener: sinon.SinonSpy;
      once: sinon.SinonStub;
    };
    on: sinon.SinonStub;
    end: sinon.SinonSpy;
    sendMessage: sinon.SinonSpy;
  };
  let createSocketStub: sinon.SinonStub;

  beforeEach(() => {
    client = new ClientTCP({});
    const onFakeCallback = (event, callback) =>
      event !== 'error' && event !== 'close' && callback({});

    socket = {
      connect: sinon.stub(),
      publish: sinon.spy(),
      on: sinon.stub().callsFake(onFakeCallback),
      _socket: {
        addListener: sinon.stub().callsFake(onFakeCallback),
        removeListener: sinon.spy(),
        once: sinon.stub().callsFake(onFakeCallback),
      },
      sendMessage: sinon.spy(),
      end: sinon.spy(),
    };
    createSocketStub = sinon
      .stub(client, 'createSocket')
      .callsFake(() => socket);
  });
  afterEach(() => {
    createSocketStub.restore();
  });
  describe('publish', () => {
    let msg;
    beforeEach(() => {
      msg = { test: 3 };
      client['isConnected'] = true;
      client['socket'] = socket;
    });
    it('should send message', () => {
      client['publish'](msg, () => ({}));
    });
    it('should listen on messages', () => {
      client['publish'](msg, () => ({}));
      expect(socket.on.called).to.be.true;
    });
    describe('on dispose', () => {
      it('should remove listener', () => {
        client['publish'](msg, () => ({}))();
        expect(socket._socket.removeListener.called).to.be.true;
      });
    });
    describe('on error', () => {
      it('should call callback', () => {
        const callback = sinon.spy();
        sinon.stub(client, 'assignPacketId').callsFake(() => {
          throw new Error();
        });
        client['publish'](msg, callback);
        expect(callback.called).to.be.true;
        expect(callback.getCall(0).args[0].err).to.be.instanceof(Error);
      });
    });
  });
  describe('handleResponse', () => {
    let callback;
    describe('when disposed', () => {
      beforeEach(() => {
        callback = sinon.spy();
        client.handleResponse(callback, { isDisposed: true });
      });
      it('should emit disposed callback', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            err: undefined,
            response: null,
            isDisposed: true,
          }),
        ).to.be.true;
      });
    });
    describe('when not disposed', () => {
      let buffer;
      beforeEach(() => {
        buffer = { err: null, response: 'res' };
        callback = sinon.spy();
        client.handleResponse(callback, buffer);
      });
      it('should not end server', () => {
        expect(socket.end.called).to.be.false;
      });
      it('should call callback with error and response data', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            err: buffer.err,
            response: buffer.response,
          }),
        ).to.be.true;
      });
    });
  });
  describe('connect', () => {
    let bindEventsSpy: sinon.SinonSpy;
    let connect$Stub: sinon.SinonStub;

    beforeEach(async () => {
      bindEventsSpy = sinon.spy(client, 'bindEvents');
    });
    afterEach(() => {
      bindEventsSpy.restore();
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        client['isConnected'] = false;
        const source = {
          subscribe: resolve => resolve(),
          toPromise: () => source,
          pipe: () => source,
        };
        connect$Stub = sinon.stub(client, 'connect$').callsFake(() => source);
        await client.connect();
      });
      afterEach(() => {
        connect$Stub.restore();
      });
      it('should call "bindEvents" once', async () => {
        expect(bindEventsSpy.called).to.be.true;
      });
      it('should call "createSocket" once', async () => {
        expect(createSocketStub.called).to.be.true;
      });
      it('should call "connect$" once', async () => {
        expect(connect$Stub.called).to.be.true;
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        client['isConnected'] = true;
      });
      it('should not call "createSocket"', () => {
        expect(createSocketStub.called).to.be.false;
      });
      it('should not call "bindEvents"', () => {
        expect(bindEventsSpy.called).to.be.false;
      });
    });
  });
  describe('close', () => {
    beforeEach(() => {
      (client as any).socket = socket;
      (client as any).isConnected = true;
      client.close();
    });
    it('should end() socket', () => {
      expect(socket.end.called).to.be.true;
    });
    it('should set "isConnected" to false', () => {
      expect((client as any).isConnected).to.be.false;
    });
    it('should set "socket" to null', () => {
      expect((client as any).socket).to.be.null;
    });
  });
  describe('bindEvents', () => {
    it('should bind error event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.bindEvents(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(ERROR_EVENT);
    });
  });
});