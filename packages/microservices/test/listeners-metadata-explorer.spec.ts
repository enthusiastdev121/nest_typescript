import * as sinon from 'sinon';
import { expect } from 'chai';
import { ListenerMetadataExplorer } from '../listener-metadata-explorer';
import { MessagePattern } from '../utils/pattern.decorator';
import { Client } from '../utils/client.decorator';
import { Transport } from '../enums/transport.enum';
import { MetadataScanner } from '../../core/metadata-scanner';

describe('ListenerMetadataExplorer', () => {
  const pattern = { pattern: 'test' };
  const secPattern = { role: '2', cmd: 'm' };
  const clientMetadata = {};
  const clientSecMetadata = { transport: Transport.REDIS };

  class Test {
    @Client(clientMetadata as any) public client;
    @Client(clientSecMetadata as any) public redisClient;

    get testGet() {
      return 0;
    }
    set testSet(val) {}

    constructor() {}

    @MessagePattern(pattern)
    public test() {}

    @MessagePattern(secPattern)
    public testSec() {}

    public noPattern() {}
  }
  let scanner: MetadataScanner;
  let instance: ListenerMetadataExplorer;

  beforeEach(() => {
    scanner = new MetadataScanner();
    instance = new ListenerMetadataExplorer(scanner);
  });
  describe('explore', () => {
    let scanFromPrototype: sinon.SinonSpy;
    beforeEach(() => {
      scanFromPrototype = sinon.spy(scanner, 'scanFromPrototype');
    });
    it(`should call "scanFromPrototype" with expected arguments`, () => {
      const obj = new Test();
      instance.explore(obj);

      const { args } = scanFromPrototype.getCall(0);
      expect(args[0]).to.be.eql(obj);
      expect(args[1]).to.be.eql(Object.getPrototypeOf(obj));
    });
  });
  describe('exploreMethodMetadata', () => {
    let test: Test;
    beforeEach(() => {
      test = new Test();
    });
    it(`should return null when "isPattern" metadata is undefined`, () => {
      const metadata = instance.exploreMethodMetadata(
        test,
        Object.getPrototypeOf(test),
        'noPattern',
      );
      expect(metadata).to.eq(null);
    });
    it(`should return pattern properties when "isPattern" metadata is not undefined`, () => {
      const metadata = instance.exploreMethodMetadata(
        test,
        Object.getPrototypeOf(test),
        'test',
      );
      expect(metadata).to.have.keys(['targetCallback', 'pattern']);
      expect(metadata.pattern).to.eql(pattern);
    });
  });
  describe('scanForClientHooks', () => {
    it(`should returns properties with @Client decorator`, () => {
      const obj = new Test();
      const hooks = [...instance.scanForClientHooks(obj)];

      expect(hooks).to.have.length(2);
      expect(hooks[0]).to.deep.eq({
        property: 'client',
        metadata: clientMetadata,
      });
      expect(hooks[1]).to.deep.eq({
        property: 'redisClient',
        metadata: clientSecMetadata,
      });
    });
  });
});
