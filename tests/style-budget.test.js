import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  DEFAULT_STYLE_BUDGET,
  evaluateStyleBudget,
  formatStyleBudgetReport,
  formatStyleBudgetWarning,
  measureStyleMetrics,
} from '../src/modules/viewport/style-budget.js';

function flatMesh(color = '#aa3355') {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color }),
  );
}

test('measures triangles, meshes and flat colors of a group', () => {
  const group = new THREE.Group();
  group.add(flatMesh('#aa3355'));
  group.add(flatMesh('#aa3355'));
  group.add(flatMesh('#123456'));

  const metrics = measureStyleMetrics(group);

  assert.equal(metrics.meshes, 3);
  assert.equal(metrics.triangles, 36);
  assert.deepEqual(metrics.materialColors, ['#123456', '#aa3355']);
  assert.equal(metrics.maxTextureSize, 0);
  assert.equal(metrics.texturedMeshes, 0);
});

test('stays within budget for a small retro model', () => {
  const group = new THREE.Group();
  group.add(flatMesh());

  const evaluation = evaluateStyleBudget(group);

  assert.equal(evaluation.budgetId, DEFAULT_STYLE_BUDGET.id);
  assert.equal(evaluation.withinBudget, true);
  assert.deepEqual(evaluation.warnings, []);
});

test('warns when triangles exceed the retro budget', () => {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.MeshStandardMaterial({ color: '#ffffff' }),
  ));

  const evaluation = evaluateStyleBudget(group);
  const warning = evaluation.warnings.find((entry) => entry.id === 'triangles-over-budget');

  assert.equal(evaluation.withinBudget, false);
  assert.ok(warning);
  assert.ok(warning.value > DEFAULT_STYLE_BUDGET.maxTriangles);
  assert.equal(warning.limit, DEFAULT_STYLE_BUDGET.maxTriangles);
  assert.match(formatStyleBudgetWarning(warning, 'es'), /triangulos superan/);
  assert.match(formatStyleBudgetWarning(warning, 'en'), /triangles exceed/);
});

test('warns on oversized textures and skips their base color', () => {
  const mesh = flatMesh('#aa3355');
  mesh.material.map = { image: { width: 128, height: 32 } };
  const group = new THREE.Group();
  group.add(mesh);

  const evaluation = evaluateStyleBudget(group);
  const warning = evaluation.warnings.find((entry) => entry.id === 'texture-over-budget');

  assert.equal(evaluation.metrics.maxTextureSize, 128);
  assert.equal(evaluation.metrics.texturedMeshes, 1);
  assert.deepEqual(evaluation.metrics.materialColors, []);
  assert.ok(warning);
  assert.equal(warning.limit, DEFAULT_STYLE_BUDGET.maxTextureSize);
});

test('warns when the flat palette outgrows the budget', () => {
  const group = new THREE.Group();
  for (let index = 0; index < DEFAULT_STYLE_BUDGET.maxMaterialColors + 4; index += 1) {
    group.add(flatMesh(`#${index.toString(16).padStart(2, '0')}44aa`));
  }

  const evaluation = evaluateStyleBudget(group);
  const warning = evaluation.warnings.find((entry) => entry.id === 'palette-over-budget');

  assert.ok(warning);
  assert.equal(warning.value, DEFAULT_STYLE_BUDGET.maxMaterialColors + 4);
});

test('counts vertex-colored meshes without adding palette entries', () => {
  const mesh = flatMesh('#aa3355');
  const count = mesh.geometry.getAttribute('position').count;
  mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(0.5), 3));
  const group = new THREE.Group();
  group.add(mesh);

  const metrics = measureStyleMetrics(group);

  assert.equal(metrics.vertexColorMeshes, 1);
  assert.deepEqual(metrics.materialColors, ['#aa3355']);
});

test('formats a bilingual report with metrics and warnings', () => {
  const group = new THREE.Group();
  group.add(flatMesh());

  const evaluation = evaluateStyleBudget(group);

  assert.match(formatStyleBudgetReport(evaluation, 'en'), /^Style: 12 triangles, 1 meshes/);
  assert.match(formatStyleBudgetReport(evaluation, 'es'), /^Estilo: 12 triangulos, 1 mallas/);
});

test('handles null roots and custom budgets', () => {
  const metrics = measureStyleMetrics(null);
  assert.equal(metrics.triangles, 0);

  const group = new THREE.Group();
  group.add(flatMesh());
  const strict = evaluateStyleBudget(group, { id: 'strict', maxTriangles: 6 });
  assert.equal(strict.withinBudget, false);
  assert.equal(strict.budgetId, 'strict');
});
