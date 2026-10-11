import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildBoneToTargetMap } from '../src/modules/animation/mesh-animation-translation.js';

function prop(archetype, pieceNames) {
  const group = new THREE.Group();
  group.name = 'Caja';
  group.userData = { name: 'Caja', archetype };
  return { group, slotMap: { BODY: pieceNames } };
}

test('a PROP piece named BODY does not capture the whole-object BODY bone', () => {
  const { group, slotMap } = prop('PROP', ['BODY', 'STRIP_H', 'STRIP_V']);
  assert.deepEqual(buildBoneToTargetMap(group, slotMap, { BODY: ['BODY'] }), { BODY: 'Caja' });
});

test('PROP without a BODY piece still targets the group', () => {
  const { group, slotMap } = prop('PROP', ['SEAT', 'LEG_1']);
  assert.deepEqual(buildBoneToTargetMap(group, slotMap, { BODY: ['BODY'] }), { BODY: 'Caja' });
});

test('non-prop archetypes keep exact piece-name binding', () => {
  const group = new THREE.Group();
  group.name = 'Perro';
  group.userData = { name: 'Perro', archetype: 'QUADRUPED' };
  const map = buildBoneToTargetMap(group, { TORSO: ['BODY_FRONT', 'BODY_REAR'] }, { TORSO: ['BODY_FRONT', 'BODY_REAR'] });
  assert.deepEqual(map, { BODY_FRONT: 'BODY_FRONT', BODY_REAR: 'BODY_REAR' });
});
