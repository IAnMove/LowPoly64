/**
 * Style budgets for the N64/PSX look.
 *
 * The retro style is mostly a set of hard constraints: few triangles,
 * tiny textures and a limited flat palette. This module measures a built
 * Object3D tree against those constraints and reports non-blocking
 * warnings, so importers and CLI tools can tell an author (human or LLM)
 * "this has 3,400 triangles, it will not read as N64".
 *
 * The module is intentionally pure: no i18n, no app state, no DOM. It can
 * run in Node (unit tests, render CLI) and in the browser (import flow).
 */

// Limits mirror the authoring contracts: ask.md keeps full characters at
// "alrededor de 800 triangulos o menos" and ask-character.md allows up to
// 1200 for special commissions. Texture size and palette come from the
// hardware-era constraints the editor emulates.
export const DEFAULT_STYLE_BUDGET = Object.freeze({
  id: 'n64_character',
  maxTriangles: 800,
  maxTextureSize: 64,
  maxMaterialColors: 32,
});

function toHexColor(color) {
  if (!color) return null;
  if (typeof color === 'string') {
    return color.trim().toLowerCase() || null;
  }
  if (typeof color.getHexString === 'function') {
    return `#${color.getHexString()}`;
  }
  return null;
}

function materialsOf(mesh) {
  const material = mesh.material;
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

function textureSizeOf(material) {
  const image = material?.map?.image;
  if (!image) return 0;
  const width = Number(image.width) || 0;
  const height = Number(image.height) || 0;
  return Math.max(width, height);
}

function triangleCountOf(geometry) {
  if (!geometry) return 0;
  const index = geometry.getIndex?.() || geometry.index || null;
  if (index && Number.isFinite(index.count)) {
    return Math.floor(index.count / 3);
  }
  const position = geometry.getAttribute?.('position') || geometry.attributes?.position || null;
  if (position && Number.isFinite(position.count)) {
    return Math.floor(position.count / 3);
  }
  return 0;
}

/**
 * Measure the retro-style metrics of an Object3D tree.
 *
 * Palette counting only considers untextured material colors: a textured
 * face reads through its texture, and vertex-color gradients are period
 * Gouraud shading rather than palette entries.
 */
export function measureStyleMetrics(root) {
  const metrics = {
    triangles: 0,
    meshes: 0,
    texturedMeshes: 0,
    vertexColorMeshes: 0,
    maxTextureSize: 0,
    materialColors: [],
  };
  if (!root || typeof root.traverse !== 'function') {
    return metrics;
  }

  const colors = new Set();
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    metrics.meshes += 1;
    metrics.triangles += triangleCountOf(node.geometry);
    if (node.geometry.getAttribute?.('color') || node.geometry.attributes?.color) {
      metrics.vertexColorMeshes += 1;
    }

    let textured = false;
    for (const material of materialsOf(node)) {
      const textureSize = textureSizeOf(material);
      if (textureSize > 0) {
        textured = true;
        metrics.maxTextureSize = Math.max(metrics.maxTextureSize, textureSize);
        continue;
      }
      const hex = toHexColor(material?.color);
      if (hex) colors.add(hex);
    }
    if (textured) metrics.texturedMeshes += 1;
  });

  metrics.materialColors = [...colors].sort();
  return metrics;
}

/**
 * Compare measured metrics against a budget.
 * Returns { budgetId, metrics, warnings, withinBudget }; warnings are
 * data ({ id, metric, value, limit }) so callers can localize them.
 */
export function evaluateStyleBudget(root, budget = DEFAULT_STYLE_BUDGET) {
  const metrics = measureStyleMetrics(root);
  const warnings = [];

  if (Number.isFinite(budget.maxTriangles) && metrics.triangles > budget.maxTriangles) {
    warnings.push({
      id: 'triangles-over-budget',
      metric: 'triangles',
      value: metrics.triangles,
      limit: budget.maxTriangles,
    });
  }
  if (Number.isFinite(budget.maxTextureSize) && metrics.maxTextureSize > budget.maxTextureSize) {
    warnings.push({
      id: 'texture-over-budget',
      metric: 'maxTextureSize',
      value: metrics.maxTextureSize,
      limit: budget.maxTextureSize,
    });
  }
  if (Number.isFinite(budget.maxMaterialColors) && metrics.materialColors.length > budget.maxMaterialColors) {
    warnings.push({
      id: 'palette-over-budget',
      metric: 'materialColors',
      value: metrics.materialColors.length,
      limit: budget.maxMaterialColors,
    });
  }

  return {
    budgetId: budget.id || 'custom',
    metrics,
    warnings,
    withinBudget: warnings.length === 0,
  };
}

const WARNING_MESSAGES = {
  'triangles-over-budget': {
    en: (w) => `${w.value} triangles exceed the N64/PSX budget of ${w.limit}; it will not read as retro.`,
    es: (w) => `${w.value} triangulos superan el presupuesto N64/PSX de ${w.limit}; no parecera retro.`,
  },
  'texture-over-budget': {
    en: (w) => `A ${w.value}px texture exceeds the ${w.limit}px retro budget.`,
    es: (w) => `Una textura de ${w.value}px supera el presupuesto retro de ${w.limit}px.`,
  },
  'palette-over-budget': {
    en: (w) => `${w.value} flat colors exceed the retro palette budget of ${w.limit}.`,
    es: (w) => `${w.value} colores planos superan el presupuesto de paleta retro de ${w.limit}.`,
  },
};

export function formatStyleBudgetWarning(warning, lang = 'en') {
  const entry = WARNING_MESSAGES[warning?.id];
  if (!entry) return '';
  const formatter = entry[lang] || entry.en;
  return formatter(warning);
}

export function formatStyleBudgetReport(evaluation, lang = 'en') {
  if (!evaluation) return '';
  const { metrics, warnings } = evaluation;
  const lines = [
    lang === 'es'
      ? `Estilo: ${metrics.triangles} triangulos, ${metrics.meshes} mallas, ${metrics.materialColors.length} colores planos, textura max ${metrics.maxTextureSize}px.`
      : `Style: ${metrics.triangles} triangles, ${metrics.meshes} meshes, ${metrics.materialColors.length} flat colors, max texture ${metrics.maxTextureSize}px.`,
  ];
  for (const warning of warnings) {
    lines.push(formatStyleBudgetWarning(warning, lang));
  }
  return lines.join('\n');
}
