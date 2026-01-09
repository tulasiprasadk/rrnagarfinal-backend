const { test, expect } = require('@playwright/test');

test('health page', async ({ request }) => {
  const res = await request.get('http://localhost:3000/api/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
});
