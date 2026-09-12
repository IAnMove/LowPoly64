import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHairHelmetGeometry, resolveHairHelmetStyle } from '../src/modules/avatar/hair-helmet.js';

test('a coarse skull keeps a closed hair shell below the crown without changing its source', () => {
  const skull = {
    vertices: [[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1],[-1,2,-1],[1,2,-1],[1,2,1],[-1,2,1]],
    faces: [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]],
  };
  const landmarks = { eyeL: [-.4,1,1], eyeR: [.4,1,1], earL: [-1,1,0], earR: [1,1,0], chin: [0,.2,1], hairline: [0,1.5,1], crown: [0,2,0] };
  const before = JSON.stringify(skull);
  const hair = buildHairHelmetGeometry(skull, landmarks, resolveHairHelmetStyle('side_part_01'));
  assert.equal(JSON.stringify(skull), before);
  assert.ok(hair.vertices.flat().every(Number.isFinite));
  assert.ok(Math.min(...hair.vertices.map(v => v[1])) < 1.1, 'Side and back faces must reach the cut rather than collapsing to the top face');
  const edges = new Map();
  for (const face of hair.faces) for (let i=0;i<3;i++) {
    const a=face[i],b=face[(i+1)%3],key=[a,b].sort((x,y)=>x-y).join(':');
    edges.set(key,(edges.get(key)||0)+1);
  }
  assert.ok([...edges.values()].every(n => n === 2), 'Clipped outer, inner and rim surfaces must share a closed boundary');
  assert.ok(hair.faces.length < 150, 'The shell should remain low-poly');
});
