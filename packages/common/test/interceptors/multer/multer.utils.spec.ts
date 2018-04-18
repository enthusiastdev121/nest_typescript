import * as sinon from 'sinon';
import { expect } from 'chai';
import { transformException } from './../../../interceptors/multer/multer.utils';
import { multerExceptions } from '../../../interceptors/multer/multer.constants';
import { PayloadTooLargeException, BadRequestException, HttpException } from '../../../exceptions';

describe('transformException', () => {
  describe('if error does not exist', () => {
    it('behave as identity', () => {
      const err = undefined;
      expect(
        transformException(err)
      ).to.be.eq(err);
    });
  });
  describe('if error is instance of HttpException', () => {
    it('behave as identity', () => {
      const err = new HttpException('response', 500);
      expect(
        transformException(err)
      ).to.be.eq(err);
    });
  });
  describe('if error exists and is not instance of HttpException', () => {
    describe('and is LIMIT_FILE_SIZE exception', () => {
      it('should return "PayloadTooLargeException"', () => {
        const err = { message: multerExceptions.LIMIT_FILE_SIZE };
        expect(
          transformException(err as any)
        ).to.be.instanceof(PayloadTooLargeException);
      });
    });
    describe('and is multer exception but not a LIMIT_FILE_SIZE', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: multerExceptions.LIMIT_FIELD_KEY };
        expect(
          transformException(err as any)
        ).to.be.instanceof(BadRequestException);
      });
    });
  });
});
