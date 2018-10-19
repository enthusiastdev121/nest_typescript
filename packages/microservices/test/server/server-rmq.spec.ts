import { expect } from 'chai';
import * as sinon from 'sinon';
import { NO_PATTERN_MESSAGE } from '../../constants';
import { ServerRMQ } from '../../server/server-rmq';
// tslint:disable:no-string-literal

describe('ServerRMQ', () => {
  let server: ServerRMQ;
  beforeEach(() => {
    server = new ServerRMQ({});
  });
  describe('listen', () => {
    let createClient: sinon.SinonStub;
    let onStub: sinon.SinonStub;
    let createChannelStub: sinon.SinonStub;
    let setupChannelStub: sinon.SinonStub;
    let client: any;

    beforeEach(() => {
      onStub = sinon
        .stub()
        .callsFake((event, callback) => event === 'connect' && callback());
      createChannelStub = sinon.stub().callsFake(({ setup }) => setup());
      setupChannelStub = sinon
        .stub(server, 'setupChannel')
        .callsFake(() => ({}));

      client = {
        on: onStub,
        createChannel: createChannelStub,
      };
      createClient = sinon.stub(server, 'createClient').callsFake(() => client);

      server.listen(null);
    });
    afterEach(() => {
      setupChannelStub.restore();
    });
    it('should call "createClient"', () => {
      expect(createClient.called).to.be.true;
    });
    it('should bind "connect" event to handler', () => {
      expect(onStub.getCall(0).args[0]).to.be.equal('connect');
    });
    it('should bind "disconnect" event to handler', () => {
      expect(onStub.getCall(1).args[0]).to.be.equal('disconnect');
    });
  });
  describe('close', () => {
    const rmqServer = { close: sinon.spy() };
    const rmqChannel = { close: sinon.spy() };

    beforeEach(() => {
      (server as any).server = rmqServer;
      (server as any).channel = rmqChannel;
    });
    it('should close server', () => {
      server.close();
      expect(rmqServer.close.called).to.be.true;
    });
    it('should close channel', () => {
      server.close();
      expect(rmqChannel.close.called).to.be.true;
    });
  });

  describe('handleMessage', () => {
    const pattern = 'test';
    const msg = {
      content: {
        toString: () =>
          JSON.stringify({
            pattern,
            data: 'tests',
            id: '3',
          }),
      },
      properties: { correlationId: 1 },
    };
    let sendMessageStub: sinon.SinonStub;

    beforeEach(() => {
      sendMessageStub = sinon.stub(server, 'sendMessage').callsFake(() => ({}));
    });
    it('should send NO_PATTERN_MESSAGE error if key does not exists in handlers object', async () => {
      await server.handleMessage(msg);
      expect(
        sendMessageStub.calledWith({
          status: 'error',
          err: NO_PATTERN_MESSAGE,
        }),
      ).to.be.true;
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = sinon.spy();
      (server as any).messageHandlers = {
        [JSON.stringify(pattern)]: handler as any,
      };
      await server.handleMessage(msg);
      expect(handler.calledOnce).to.be.true;
    });
  });
  describe('setupChannel', () => {
    const queue = 'test';
    const queueOptions = {};
    const isGlobalPrefetchCount = true;
    const prefetchCount = 10;

    let channel: any = {};

    beforeEach(() => {
      (server as any)['queue'] = queue;
      (server as any)['queueOptions'] = queueOptions;
      (server as any)['isGlobalPrefetchCount'] = isGlobalPrefetchCount;
      (server as any)['prefetchCount'] = prefetchCount;

      channel = {
        assertQueue: sinon.spy(() => ({})),
        prefetch: sinon.spy(),
        consume: sinon.spy(),
      };
    });
    it('should call "assertQueue" with queue and queue options', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue.calledWith(queue, queueOptions)).to.be.true;
    });
    it('should call "prefetch" with prefetchCount and "isGlobalPrefetchCount"', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.prefetch.calledWith(prefetchCount, isGlobalPrefetchCount))
        .to.be.true;
    });
    it('should call "consumeChannel" method', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.consume.called).to.be.true;
    });
    it('should call "resolve" function', async () => {
      const resolve = sinon.spy();
      await server.setupChannel(channel, resolve);
      expect(resolve.called).to.be.true;
    });
  });

  describe('sendMessage', () => {
    let channel: any;

    beforeEach(() => {
      channel = {
        sendToQueue: sinon.spy(),
      };
      server['channel'] = channel;
    });

    it('should publish message to indicated queue', () => {
      const message = { test: true };
      const replyTo = 'test';
      const correlationId = '0';

      server.sendMessage(message, replyTo, correlationId);
      expect(
        channel.sendToQueue.calledWith(
          Buffer.from(JSON.stringify(message)),
          replyTo,
          { correlationId },
        ),
      );
    });
  });
});
