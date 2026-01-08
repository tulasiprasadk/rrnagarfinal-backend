process.env.NODE_ENV = 'production';

const { expect } = require('chai');
const api = require('../api/index.js');

describe('Smoke tests', function () {
  it('exports a handler function', function () {
    expect(api.handler).to.be.a('function');
  });
});
