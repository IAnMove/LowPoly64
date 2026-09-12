import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterDraftStore } from '../src/modules/agent/character-draft-store.js';

test('concurrent identical retries share one mutation; changed arguments cannot reuse the operation', async () => {
  const store = new CharacterDraftStore();
  let calls = 0;
  const action = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return { id: 'one' }; };
  const args = { operation_id: 'create-once', recipe: { style: 'psx' } };
  const result = await Promise.all([store.once('build', args, action), store.once('build', args, action)]);
  assert.equal(calls, 1);
  assert.strictEqual(result[0], result[1]);
  await assert.rejects(store.once('build', { ...args, recipe: { style: 'n64' } }, action), error => error.code === 'OPERATION_ID_REUSED');
});

test('revisions reject stale edits and retain earlier choices up to the correction budget', () => {
  const store = new CharacterDraftStore();
  const draft = store.create({ group: { silhouette: 'best' }, recipe: { name: 'original' } });
  for (let i = 1; i <= 3; i++) store.append(store.get(draft.id, i - 1), { group: { silhouette: i }, recipe: { name: `revision ${i}` } });
  assert.equal(store.version(draft, 0).group.silhouette, 'best');
  assert.throws(() => store.get(draft.id, 2), error => error.code === 'REVISION_CONFLICT');
  assert.throws(() => store.append(draft, {}), error => error.code === 'CORRECTION_LIMIT');
  assert.equal(store.describe(draft).correctionsRemaining, 0);
  assert.deepEqual(store.describe(draft).revisions, [0, 1, 2, 3]);
});

test('commit retains the chosen model and releases rejected models; discard is bounded', () => {
  const disposed = [];
  const store = new CharacterDraftStore({ maxDrafts: 1, dispose: object => disposed.push(object) });
  const first = { id: 'first' }, second = { id: 'second' };
  const draft = store.create({ group: first, recipe: {} });
  store.append(draft, { group: second, recipe: {} });
  assert.throws(() => store.create({ group: {} }), error => error.code === 'DRAFT_LIMIT');
  store.release(draft.id, first);
  assert.deepEqual(disposed, [second]);
  assert.throws(() => store.get(draft.id), error => error.code === 'DRAFT_NOT_FOUND');
  const next = store.create({ group: { id: 'discard' }, recipe: {} });
  store.release(next.id);
  assert.equal(disposed.length, 2);
});
