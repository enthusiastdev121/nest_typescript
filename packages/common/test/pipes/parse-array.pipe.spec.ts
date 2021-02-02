import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { IsNumber } from 'class-validator';
import { BadRequestException } from '../../exceptions';
import { ArgumentMetadata } from '../../interfaces/features/pipe-transform.interface';
import { ParseArrayPipe } from '../../pipes/parse-array.pipe';
chai.use(chaiAsPromised);

describe('ParseArrayPipe', () => {
  let target: ParseArrayPipe;

  describe('transform', () => {
    describe('when undefined value', () => {
      describe('and optional disabled', () => {
        it('should throw an exception', async () => {
          target = new ParseArrayPipe({ optional: false });

          return expect(
            target.transform(undefined, {} as ArgumentMetadata),
          ).to.to.be.rejectedWith(BadRequestException);
        });
      });
      describe('and optional enabled', () => {
        it('should return undefined', async () => {
          target = new ParseArrayPipe({ optional: true });

          expect(await target.transform(undefined, {} as ArgumentMetadata)).to
            .be.undefined;
        });
      });
    });

    describe('when value is not parseable', () => {
      beforeEach(() => {
        target = new ParseArrayPipe();
      });
      it('should throw an exception (boolean)', async () => {
        return expect(
          target.transform(true, {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
      });
      it('should throw an exception (number)', async () => {
        return expect(
          target.transform(3, {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
      });
      it('should throw an exception (object)', async () => {
        return expect(
          target.transform({}, {} as ArgumentMetadata),
        ).to.be.rejectedWith(BadRequestException);
      });

      describe('and "optional" is enabled', () => {
        it('should throw an exception', async () => {
          const pipe = new ParseArrayPipe({
            optional: true,
            items: String,
            separator: ',',
          });
          return expect(
            pipe.transform({}, {} as ArgumentMetadata),
          ).to.be.rejectedWith(BadRequestException);
        });
      });
    });

    describe('when value is parseable (string)', () => {
      it('should parse an array based on the separator', async () => {
        target = new ParseArrayPipe();

        expect(
          await target.transform('1,2,3', {} as ArgumentMetadata),
        ).to.be.deep.equal(['1', '2', '3']);

        target = new ParseArrayPipe({ separator: '/' });

        expect(
          await target.transform('1/2/3', {} as ArgumentMetadata),
        ).to.be.deep.equal(['1', '2', '3']);

        target = new ParseArrayPipe({ separator: '.' });

        expect(
          await target.transform('1.2.3', {} as ArgumentMetadata),
        ).to.be.deep.equal(['1', '2', '3']);
      });
    });

    describe('when items type is determined', () => {
      class ArrItem {}

      it('should validate and transform each item', async () => {
        target = new ParseArrayPipe({ items: ArrItem });

        let items = await target.transform(
          [{}, {}, {}],
          {} as ArgumentMetadata,
        );
        items.forEach(item => {
          expect(item).to.be.instanceOf(ArrItem);
        });

        items = await target.transform('{},{},{}', {} as ArgumentMetadata);
        items.forEach(item => {
          expect(item).to.be.instanceOf(ArrItem);
        });
      });
      describe('when "stopAtFirstError" is explicitly turned off', () => {
        it('should validate each item and concat errors', async () => {
          class ArrItemWithProp {
            @IsNumber()
            number: number;
          }
          const pipe = new ParseArrayPipe({
            items: ArrItemWithProp,
            stopAtFirstError: false,
          });
          try {
            await pipe.transform(
              [
                { number: '1' },
                { number: '1' },
                { number: 1 },
              ] as ArrItemWithProp[],
              {} as ArgumentMetadata,
            );
          } catch (err) {
            expect(err).to.be.instanceOf(BadRequestException);
            expect(err.getResponse().message).to.deep.equal([
              '[0] number must be a number conforming to the specified constraints',
              '[1] number must be a number conforming to the specified constraints',
            ]);
          }
        });
      });
    });
  });
});
