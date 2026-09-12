import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage ||= { getItem: () => null, setItem() {} };
const { piecesToCharacterModel, characterModelToPieces, validateCharacterModel, detectFormat } = await import('../src/modules/viewport/character-model.js');
const { validateNativeGltfJSON, parseGlbGroup } = await import('../src/modules/viewport/native-gltf.js');

test('custom geometry and zero-radius primitives retain parameters through CharacterModel', () => {
  const pieces = [
    { name: 'HEAD', geometry: { type: 'custom', vertices: [[0,0,0],[1,0,0],[0,1,0]], faces: [[0,1,2]], uvs: [[0,0],[1,0],[0,1]] }, position: [0,2,0], color: '#fff', materialType: 'Basic' },
    { name: 'BODY', geometry: { type: 'cylinder', params: { radiusTop: 0, radiusBottom: 0.4, height: 2, radialSegments: 5 } }, position: [0,0,0], color: '#abc' },
  ];
  const metadata = { name: 'Test', archetype: 'HUMANOID', slotMap: { HEAD: ['HEAD'], TORSO: ['BODY'] }, retroCharacterRecipe: { format: 'retrovisor-character', version: 1 }, transform: { position: [3,0,0] }, animations: [{name:'take',tracks:[]}] };
  const model = piecesToCharacterModel(pieces, metadata);
  assert.equal(validateCharacterModel(model), null);
  const restored = characterModelToPieces(model).pieces;
  assert.deepEqual(restored[0].geometry.params.vertices, pieces[0].geometry.vertices);
  assert.deepEqual(restored[0].geometry.params.uvs, pieces[0].geometry.uvs);
  assert.equal(restored[0].materialType, 'Basic');
  assert.deepEqual(restored[1].geometry.params, pieces[1].geometry.params);
  assert.deepEqual(model.retroCharacterRecipe, metadata.retroCharacterRecipe);
  assert.deepEqual(model.transform, metadata.transform);
  assert.deepEqual(model.animations, metadata.animations);
});

test('import detection distinguishes recipes and rejects non-finite model transforms', () => {
  assert.equal(detectFormat({format:'retrovisor-character',version:1}), 'retro-character');
  assert.equal(detectFormat({format:'retrovisor-gltf',version:1}), 'native-gltf');
  assert.match(validateCharacterModel({name:'Bad', transform:{position:[NaN,0,0]}}), /transform/);
});

test('native interchange rejects unsupported versions, external images and malformed GLB', async () => {
  assert.match(validateNativeGltfJSON({format:'retrovisor-gltf',version:8}), /version/);
  assert.match(validateNativeGltfJSON({format:'retrovisor-gltf',version:1,clips:[],object:{metadata:{type:'Object'},object:{},images:[{url:'https://example.com/image.png'}]}}), /embedded/);
  await assert.rejects(parseGlbGroup(new ArrayBuffer(32)), /Invalid GLB/);
});
