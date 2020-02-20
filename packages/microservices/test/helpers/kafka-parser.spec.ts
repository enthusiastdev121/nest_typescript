import { expect } from 'chai';
import { KafkaHeaders } from '../../enums/kafka-headers.enum';
import { KafkaParser } from '../../helpers/kafka-parser';

describe('KafkaParser', () => {
  describe('parse', () => {
    it('undefined', () => {
      expect(
        KafkaParser.parse({
          value: undefined,
        }),
      ).to.deep.eq({
        headers: {},
        value: null,
      });
    });

    it('null', () => {
      expect(
        KafkaParser.parse({
          value: null,
        }),
      ).to.deep.eq({
        headers: {},
        value: null,
      });
    });

    it('buffer string', () => {
      expect(
        KafkaParser.parse({
          value: Buffer.from('string'),
        }),
      ).to.deep.eq({
        headers: {},
        value: 'string',
      });
    });

    it('buffer number', () => {
      expect(
        KafkaParser.parse({
          value: Buffer.from('12345'),
        }),
      ).to.deep.eq({
        headers: {},
        value: '12345',
      });
    });

    it('buffer bigint', () => {
      const long = '9007199254740992';

      expect(
        KafkaParser.parse({
          value: Buffer.from(long),
        }),
      ).to.deep.eq({
        headers: {},
        value: long,
      });
    });

    it('buffer json', () => {
      expect(
        KafkaParser.parse({
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
        }),
      ).to.deep.eq({
        headers: {},
        value: {
          prop: 'value',
        },
      });
    });

    it('buffer json with key', () => {
      expect(
        KafkaParser.parse({
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
          key: Buffer.from('1'),
        }),
      ).to.deep.eq({
        headers: {},
        key: '1',
        value: {
          prop: 'value',
        },
      });
    });

    it('buffer json with key and headers', () => {
      expect(
        KafkaParser.parse({
          headers: {
            [KafkaHeaders.CORRELATION_ID]: Buffer.from('correlation-id'),
          },
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
          key: Buffer.from('1'),
        }),
      ).to.deep.eq({
        key: '1',
        value: {
          prop: 'value',
        },
        headers: {
          [KafkaHeaders.CORRELATION_ID]: 'correlation-id',
        },
      });
    });
  });
});
