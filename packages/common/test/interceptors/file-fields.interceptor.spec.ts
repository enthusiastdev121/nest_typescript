import * as sinon from 'sinon';
import { expect } from 'chai';
import { FileFieldsInterceptor } from './../../interceptors/file-fields.interceptor';
import { Observable, of } from 'rxjs';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context.host';

describe('FileFieldsInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileFieldsInterceptor([{name: 'file', maxCount: 1}, {name: 'anotherFile', maxCount: 1}]);
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe('intercept', () => {
    let stream$;
    beforeEach(() => {
      stream$ = of('test');
    });
    it('should call object with expected params', async () => {
      const fieldName1 = 'file';
      const maxCount1 = 1;
      const fieldName2 = 'anotherFile';
      const maxCount2 = 2;
      const argument = [
        {name: fieldName1, maxCount: maxCount1},
        {name: fieldName2, maxCount: maxCount2}
      ]
      const target = new (FileFieldsInterceptor(argument))();

      const callback = (req, res, next) => next();
      const fieldsSpy = sinon
        .stub((target as any).upload, 'fields')
        .returns(callback);

      await target.intercept(new ExecutionContextHost([]), stream$);

      expect(fieldsSpy.called).to.be.true;
      expect(fieldsSpy.calledWith(argument)).to.be.true;
    });
    it('should transform exception', async () => {
      const fieldName1 = 'file';
      const maxCount1 = 1;
      const fieldName2 = 'anotherFile';
      const maxCount2 = 2;
      const argument = [
        {name: fieldName1, maxCount: maxCount1},
        {name: fieldName2, maxCount: maxCount2}
      ]
      const target = new (FileFieldsInterceptor(argument));
      const err = {};
      const callback = (req, res, next) => next(err);

      (target as any).fields = {
        array: () => callback,
      };
      expect(target.intercept(new ExecutionContextHost([]), stream$)).to.eventually.throw();
    });
  });
});
