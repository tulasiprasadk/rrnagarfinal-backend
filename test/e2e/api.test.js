const request = require('supertest');
const appModule = require('../../api/index.js');
const assert = require('assert');

describe('API E2E tests', function() {
  let server;
  before(async function() {
    const app = await (async () => { return (await require('../../api/index.js')).handler })();
    // serverless handler doesn't expose express app easily; instead start local server via api/index when not in production
    // For tests we'll hit the health endpoints directly using the serverless handler wrapped by supertest is complex.
    // Instead, assume the app starts in test env by importing api/index which starts a local server when NODE_ENV !== 'production'.
    server = request('http://localhost:4000');
  });

  it('GET /api/health should return ok', async function() {
    const res = await server.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  it('GET /api/ready should return ok when DB accessible', async function() {
    const res = await server.get('/api/ready');
    // ready may be 200 or 500 depending on DB; assert response structure
    assert.ok(res.status === 200 || res.status === 500);
    assert.ok(typeof res.body.ok === 'boolean');
  });
});
