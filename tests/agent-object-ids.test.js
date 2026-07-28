import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearAgentIds,
  ensureAgentId,
  findObjectByAgentId,
  isValidAgentId,
  normalizeAgentIds,
  setRestoredAgentId,
} from '../src/modules/agent/agent-object-ids.js';

function node(kind = 'group', children = []) {
  const value = {
    isGroup: kind === 'group',
    isMesh: kind === 'mesh',
    userData: {},
    children,
    parent: null,
    traverse(callback) {
      callback(this);
      for (const child of this.children) child.traverse(callback);
    },
  };
  for (const child of children) child.parent = value;
  return value;
}

test('stable IDs are valid and retained when unique', () => {
  const object = node('mesh');
  const id = ensureAgentId(object);
  assert.equal(isValidAgentId(id), true);
  assert.equal(ensureAgentId(object), id);
});

test('normalization assigns IDs to selectable entities but not pivot render meshes', () => {
  const renderMesh = node('mesh');
  renderMesh.userData.agentId = 'rv_abcdefgh';
  const pivot = node('group', [renderMesh]);
  pivot.userData.isPivot = true;
  const selectableMesh = node('mesh');
  const group = node('group', [pivot, selectableMesh]);
  const root = node('group', [group]);

  const result = normalizeAgentIds(root);
  assert.equal(result.objects.length, 3);
  assert.equal(isValidAgentId(group.userData.agentId), true);
  assert.equal(isValidAgentId(pivot.userData.agentId), true);
  assert.equal(isValidAgentId(selectableMesh.userData.agentId), true);
  assert.equal(renderMesh.userData.agentId, undefined);
});

test('normalization repairs collisions deterministically', () => {
  const first = node('mesh');
  const second = node('mesh');
  const root = node('group', [first, second]);
  first.userData.agentId = 'rv_abcdefgh';
  second.userData.agentId = 'rv_abcdefgh';

  const result = normalizeAgentIds(root);
  assert.equal(first.userData.agentId, 'rv_abcdefgh');
  assert.notEqual(second.userData.agentId, first.userData.agentId);
  assert.equal(result.repairedIds.length, 1);
  assert.equal(findObjectByAgentId(root, second.userData.agentId), second);
});

test('restored IDs validate and clones can clear inherited IDs', () => {
  const child = node('mesh');
  const object = node('group', [child]);
  assert.equal(setRestoredAgentId(object, 'invalid'), false);
  assert.equal(setRestoredAgentId(object, 'rv_abcdefgh'), true);
  child.userData.agentId = 'rv_ijklmnop';
  clearAgentIds(object);
  assert.equal(object.userData.agentId, undefined);
  assert.equal(child.userData.agentId, undefined);
});
