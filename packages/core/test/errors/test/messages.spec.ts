import { expect } from 'chai';
import { UnknownDependenciesException } from '../../../errors/exceptions/unknown-dependencies.exception';

describe('UnknownDependenciesMessage', () => {
  const index = 0;
  it('should display class', () => {
    class CatService { }
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, CatService). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', CatService] }).message).to.equal(expectedResult);
  });
  it('should display the provide token', () => {
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, MY_TOKEN). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', 'MY_TOKEN'] }).message).to.equal(expectedResult);
  });
  it('should display the function name', () => {
    function CatFunction() { }
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, CatFunction). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', CatFunction] }).message).to.equal(expectedResult);
  });
  it('should use "+" if unknown dependency name', () => {
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, +). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', undefined] }).message).to.equal(expectedResult);
  });
});
