import assert from 'node:assert/strict';
import test from 'node:test';
import { settlePromisesWithTimeout } from '../src/modules/shared/promise-utils.js';

test('returns immediately for an empty promise list', async () => {
  assert.deepEqual(await settlePromisesWithTimeout([], 25), {
    count: 0,
    timedOut: false,
  });
});

test('waits for resolved and rejected promises without timing out', async () => {
  const result = await settlePromisesWithTimeout([
    Promise.resolve('ready'),
    Promise.reject(new Error('fallback is still settled')),
  ], 100);

  assert.deepEqual(result, { count: 2, timedOut: false });
});

test('returns a timeout result for a stalled promise', async () => {
  const startedAt = performance.now();
  const result = await settlePromisesWithTimeout([new Promise(() => {})], 25);
  const elapsedMs = performance.now() - startedAt;

  assert.deepEqual(result, { count: 1, timedOut: true });
  assert.ok(elapsedMs >= 20, `Expected at least 20ms, received ${elapsedMs}ms`);
  assert.ok(elapsedMs < 1000, `Expected less than 1000ms, received ${elapsedMs}ms`);
});
