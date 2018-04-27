import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouterResponseController } from '../../router/router-response-controller';
import { RequestMethod } from './../../../common';
import { Observable, of } from 'rxjs';
import { ExpressAdapter } from '../../adapters/express-adapter';

describe('RouterResponseController', () => {
  let routerResponseController: RouterResponseController;
  let handlerMock: sinon.SinonMock;

  beforeEach(() => {
    routerResponseController = new RouterResponseController(new ExpressAdapter({}));
  });

  describe('apply', () => {
    let response: {
      send: sinon.SinonSpy;
      status?: sinon.SinonSpy;
      json: sinon.SinonSpy;
    };
    beforeEach(() => {
      response = { send: sinon.spy(), json: sinon.spy() };
      response.status = sinon.stub().returns(response);
    });
    describe('when result is', () => {
      describe('nil', () => {
        it('should call send()', async () => {
          const value = null;
          await routerResponseController.apply(value, response, 200);
          expect(response.send.called).to.be.true;
        });
      });
      describe('string', () => {
        it('should call send(value)', async () => {
          const value = 'string';
          await routerResponseController.apply(value, response, 200);
          expect(response.send.called).to.be.true;
          expect(response.send.calledWith(String(value))).to.be.true;
        });
      });
      describe('object', () => {
        it('should call json(value)', async () => {
          const value = { test: 'test' };
          await routerResponseController.apply(value, response, 200);
          expect(response.json.called).to.be.true;
          expect(response.json.calledWith(value)).to.be.true;
        });
      });
    });
  });

  describe('transformToResult', () => {
    describe('when resultOrDeffered', () => {
      describe('is Promise', () => {
        it('should returns Promise', async () => {
          const value = 100;
          expect(
            await routerResponseController.transformToResult(
              Promise.resolve(value),
            ),
          ).to.be.eq(100);
        });
      });

      describe('is Observable', () => {
        it('should returns Promise', async () => {
          const value = 100;
          expect(
            await routerResponseController.transformToResult(
              of(value),
            ),
          ).to.be.eq(100);
        });
      });

      describe('is value', () => {
        it('should returns Promise', async () => {
          const value = 100;
          expect(
            await routerResponseController.transformToResult(value),
          ).to.be.eq(100);
        });
      });
    });
  });

  describe('getStatusByMethod', () => {
    describe('when RequestMethod is POST', () => {
      it('should returns 201', () => {
        expect(
          routerResponseController.getStatusByMethod(RequestMethod.POST),
        ).to.be.eql(201);
      });
    });
    describe('when RequestMethod is not POST', () => {
      it('should returns 200', () => {
        expect(
          routerResponseController.getStatusByMethod(RequestMethod.GET),
        ).to.be.eql(200);
      });
    });
  });

  describe('render', () => {
    it('should call "res.render()" with expected args', async () => {
      const template = 'template';
      const value = 'test';
      const result = Promise.resolve(value);
      const response = { render: sinon.spy() };

      await routerResponseController.render(result, response, template);
      expect(response.render.calledWith(template, value)).to.be.true;
    });
  });
});
