import * as sinon from 'sinon';
import { expect } from 'chai';
import { SocketServerProvider } from '../socket-server-provider';
import { SocketsContainer } from '../container';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { IoAdapter } from '@nestjs/websockets/adapters/io-adapter';

describe('SocketServerProvider', () => {
  let instance: SocketServerProvider;
  let socketsContainer: SocketsContainer, mockContainer: sinon.SinonMock;

  beforeEach(() => {
    socketsContainer = new SocketsContainer();
    mockContainer = sinon.mock(socketsContainer);
    instance = new SocketServerProvider(
      socketsContainer,
      new ApplicationConfig(new IoAdapter()),
    );
  });
  describe('scanForSocketServer', () => {
    let createSocketServerSpy: sinon.SinonSpy;
    const namespace = 'test';
    const port = 30;

    beforeEach(() => {
      createSocketServerSpy = sinon.spy(instance, 'createSocketServer');
    });
    afterEach(() => {
      mockContainer.restore();
    });
    it(`should returns stored server`, () => {
      const server = { test: 'test' };
      mockContainer.expects('getServerByPort').returns(server);

      const result = instance.scanForSocketServer({ namespace: null }, port);

      expect(createSocketServerSpy.called).to.be.false;
      expect(result).to.eq(server);
    });
    it(`should call "createSocketServer" when server is not stored already`, () => {
      mockContainer.expects('getServerByPort').returns(null);

      instance.scanForSocketServer({ namespace }, port);
      expect(createSocketServerSpy.called).to.be.true;
    });
  });
});
