import { AVATAR_HEAD_MOLD_MAP } from '../../data/avatar/catalog.js';
import { AVATAR_HEAD_BUILD_MODE_MOLD, resolveAvatarRecipe } from './avatar-recipe.js';

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHex(hex, fallback = '#ffcc00') {
  if (typeof hex !== 'string') return fallback;
  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
  }
  return fallback;
}

function shadeHex(hex, amount = 0) {
  const value = normalizeHex(hex);
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  const factor = amount >= 0 ? amount : -amount;
  const next = amount >= 0
    ? [
        r + ((255 - r) * factor),
        g + ((255 - g) * factor),
        b + ((255 - b) * factor),
      ]
    : [
        r * (1 - factor),
        g * (1 - factor),
        b * (1 - factor),
      ];
  return `#${clampChannel(next[0]).toString(16).padStart(2, '0')}${clampChannel(next[1]).toString(16).padStart(2, '0')}${clampChannel(next[2]).toString(16).padStart(2, '0')}`;
}

function replaceTokens(markup, tokens) {
  return String(markup || '').replace(/\{\{([^}]+)\}\}/g, (_, key) => tokens[key] || '');
}

function escapeXmlAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildColorTokens(palette) {
  return {
    skin: normalizeHex(palette.skin, '#efc2aa'),
    skinLight: shadeHex(palette.skin, 0.08),
    skinShade: shadeHex(palette.skin, -0.14),
    hair: normalizeHex(palette.hair, '#6c3a2a'),
    hairLight: shadeHex(palette.hair, 0.12),
    hairDark: shadeHex(palette.hair, -0.18),
    iris: normalizeHex(palette.iris, '#5a88cf'),
    irisDark: shadeHex(palette.iris, -0.16),
    bodyPrimary: normalizeHex(palette.bodyPrimary, '#8a4b68'),
    bodySecondary: normalizeHex(palette.bodySecondary, '#46527a'),
    accent: normalizeHex(palette.accent, '#2d9cc2'),
    accentDark: shadeHex(palette.accent, -0.18),
    eyeWhite: '#fff8f2',
    lip: shadeHex(palette.skin, -0.46),
    outline: '#111111',
    outlineSoft: shadeHex(palette.hair, -0.36),
  };
}

function formatDirectiveNumber(value, fallback) {
  const resolved = Number.isFinite(value) ? value : fallback;
  return Number(resolved).toFixed(3).replace(/\.?0+$/, '');
}

function formatTransformNumber(value, fallback = 0) {
  const resolved = Number.isFinite(value) ? value : fallback;
  return Number(resolved).toFixed(3).replace(/\.?0+$/, '');
}

function mergeTransforms(...transforms) {
  let hasTransform = false;
  const merged = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    originX: 256,
    originY: 256,
  };

  transforms.forEach((transform) => {
    if (!transform || typeof transform !== 'object') return;
    hasTransform = true;
    if (Number.isFinite(transform.x)) merged.x += transform.x;
    if (Number.isFinite(transform.y)) merged.y += transform.y;
    if (Number.isFinite(transform.scaleX) && transform.scaleX > 0) merged.scaleX *= transform.scaleX;
    if (Number.isFinite(transform.scaleY) && transform.scaleY > 0) merged.scaleY *= transform.scaleY;
    if (Number.isFinite(transform.originX)) merged.originX = transform.originX;
    if (Number.isFinite(transform.originY)) merged.originY = transform.originY;
  });

  return hasTransform ? merged : null;
}

function resolvePartMarkup(sourceHead, partKey, variantId, fallbackMarkup = '') {
  if (variantId) {
    const overrideMarkup = sourceHead?.partPresetMarkupOverrides?.[partKey]?.[variantId];
    if (typeof overrideMarkup === 'string') return overrideMarkup;
  }
  return fallbackMarkup;
}

function wrapMarkupWithOffset(markup, offset = null) {
  if (!markup) return '';
  const x = Number.isFinite(offset?.x) ? offset.x : 0;
  const y = Number.isFinite(offset?.y) ? offset.y : 0;
  const scaleX = Number.isFinite(offset?.scaleX) && offset.scaleX > 0 ? offset.scaleX : 1;
  const scaleY = Number.isFinite(offset?.scaleY) && offset.scaleY > 0 ? offset.scaleY : 1;
  const originX = Number.isFinite(offset?.originX) ? offset.originX : 256;
  const originY = Number.isFinite(offset?.originY) ? offset.originY : 256;

  if (x === 0 && y === 0 && scaleX === 1 && scaleY === 1) return markup;

  const transforms = [];
  if (x !== 0 || y !== 0) {
    transforms.push(`translate(${formatTransformNumber(x)} ${formatTransformNumber(y)})`);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`translate(${formatTransformNumber(originX)} ${formatTransformNumber(originY)})`);
    transforms.push(`scale(${formatTransformNumber(scaleX, 1)} ${formatTransformNumber(scaleY, 1)})`);
    transforms.push(`translate(${formatTransformNumber(-originX)} ${formatTransformNumber(-originY)})`);
  }

  return `<g transform="${transforms.join(' ')}">${markup}</g>`;
}

function wrapMarkupWithMount(markup, mountRole = '', featureKey = '', offset = null, anchorVariant = '') {
  if (!markup) return '';
  const roleAttr = mountRole ? ` data-rv-mount-role="${escapeXmlAttr(mountRole)}"` : '';
  const featureAttr = featureKey ? ` data-rv-feature-key="${escapeXmlAttr(featureKey)}"` : '';
  const variantAttr = anchorVariant ? ` data-rv-anchor-variant="${escapeXmlAttr(anchorVariant)}"` : '';
  return `<g${roleAttr}${featureAttr}${variantAttr}>${wrapMarkupWithOffset(markup, offset)}</g>`;
}

function hasMirroredFeatureAncestor(element) {
  let current = element?.parentElement || null;
  while (current) {
    const id = String(current.getAttribute?.('id') || '');
    if (/_L$/i.test(id) || /_R$/i.test(id)) return true;
    current = current.parentElement;
  }
  return false;
}

function prependTranslateTransform(element, x = 0, y = 0) {
  if (!element || (Math.abs(x) < 0.0001 && Math.abs(y) < 0.0001)) return;
  const translate = `translate(${formatTransformNumber(x)} ${formatTransformNumber(y)})`;
  const existing = String(element.getAttribute('transform') || '').trim();
  element.setAttribute('transform', existing ? `${translate} ${existing}` : translate);
}

function applyMirroredPairSpacing(markup, spacing = 0) {
  const delta = Number.isFinite(spacing) ? Number(spacing) : 0;
  if (!markup || Math.abs(delta) < 0.0001 || typeof DOMParser === 'undefined') return markup;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
      'image/svg+xml',
    );
    const svg = doc.documentElement;
    if (!svg) return markup;

    Array.from(svg.querySelectorAll('[id]')).forEach((element) => {
      if (hasMirroredFeatureAncestor(element)) return;
      const id = String(element.getAttribute('id') || '');
      if (/_L$/i.test(id)) {
        prependTranslateTransform(element, -(delta * 0.5), 0);
      } else if (/_R$/i.test(id)) {
        prependTranslateTransform(element, delta * 0.5, 0);
      }
    });

    return svg.innerHTML || markup;
  } catch {
    return markup;
  }
}

function scaleDirectiveAttribute(element, attributeName, factor, fallbackValue = null) {
  if (!element || !attributeName || !Number.isFinite(factor) || factor <= 0) return;
  const rawValue = element.getAttribute(attributeName);
  if (rawValue == null && !Number.isFinite(fallbackValue)) return;
  const baseValue = rawValue == null ? fallbackValue : Number.parseFloat(rawValue);
  if (!Number.isFinite(baseValue)) return;
  element.setAttribute(attributeName, formatDirectiveNumber(baseValue * factor, baseValue * factor));
}

function retuneMoldFeatureMarkup(markup, featureKey = '') {
  if (!markup || typeof DOMParser === 'undefined') return markup;

  const tuningByFeature = {
    eyes: { offset: 0.16, depth: 0.03 },
    hair: {
      frontShell: 0.24,
      frontDepth: 0.26,
      backShell: 0.08,
      backDepth: 0.12,
    },
    ears: { shell: 0.22, depth: 0.24, shellFallback: 0.009, depthFallback: 0.01 },
    nose: { bump: 0.22, depth: 0.72, bumpFallback: 0.018, depthFallback: 0.006 },
    mouth: { offset: 0.18, depth: 0.22, offsetFallback: 0.003, depthFallback: 0.004 },
  };
  const tuning = tuningByFeature[featureKey];
  if (!tuning) return markup;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
      'image/svg+xml',
    );
    const svg = doc.documentElement;
    if (!svg) return markup;

    Array.from(svg.querySelectorAll('[data-rv-role]')).forEach((element) => {
      const role = String(element.getAttribute('data-rv-role') || '').trim().toLowerCase();
      if (!role) return;

      if (featureKey === 'hair' && role === 'hair') {
        scaleDirectiveAttribute(element, 'data-rv-shell', tuning.frontShell);
        scaleDirectiveAttribute(element, 'data-rv-depth', tuning.frontDepth);
      } else if (featureKey === 'hair' && role === 'hair_back') {
        scaleDirectiveAttribute(element, 'data-rv-shell', tuning.backShell);
        scaleDirectiveAttribute(element, 'data-rv-depth', tuning.backDepth);
      } else if (featureKey === 'eyes' && (role === 'eye_white' || role === 'iris' || role === 'pupil')) {
        scaleDirectiveAttribute(element, 'data-rv-offset', 1, tuning.offset);
        scaleDirectiveAttribute(element, 'data-rv-depth', 1, tuning.depth);
      } else if (featureKey === 'ears' && role === 'ear') {
        scaleDirectiveAttribute(element, 'data-rv-shell', tuning.shell, tuning.shellFallback);
        scaleDirectiveAttribute(element, 'data-rv-depth', tuning.depth, tuning.depthFallback);
      } else if (featureKey === 'nose' && role === 'nose') {
        scaleDirectiveAttribute(element, 'data-rv-bump', tuning.bump, tuning.bumpFallback);
        scaleDirectiveAttribute(element, 'data-rv-depth', tuning.depth, tuning.depthFallback);
      } else if (featureKey === 'mouth' && role === 'mouth') {
        scaleDirectiveAttribute(element, 'data-rv-offset', tuning.offset, tuning.offsetFallback);
        scaleDirectiveAttribute(element, 'data-rv-depth', tuning.depth, tuning.depthFallback);
      }
    });

    return svg.innerHTML || markup;
  } catch {
    return markup;
  }
}

function resolveHeadBuildSource(resolved) {
  return resolved.headMold?.sourceHead || null;
}

const MOLD_FEATURE_CONFIG = Object.freeze({
  hairFront: Object.freeze({ featureKey: 'hair', partKey: 'hairFront', anchorVariant: 'capFront' }),
  hairBack: Object.freeze({ featureKey: 'hair', partKey: 'hairBack', anchorVariant: 'capBack' }),
  brows: Object.freeze({ featureKey: 'brows', partKey: 'brows' }),
  eyes: Object.freeze({ featureKey: 'eyes', partKey: 'eyes' }),
  nose: Object.freeze({ featureKey: 'nose', partKey: 'nose' }),
  mouth: Object.freeze({ featureKey: 'mouth', partKey: 'mouth' }),
  ears: Object.freeze({ featureKey: 'ears', partKey: 'ears' }),
  accessories: Object.freeze({ featureKey: 'accessories', partKey: 'accessories' }),
});

function resolveMoldMountRole(headMold, featureConfig) {
  if (!headMold || !featureConfig) return '';
  return String(headMold.mountRoles?.[featureConfig.featureKey] || '').trim();
}

function resolveMoldAnchorTransform(headMold, featureConfig, variantId = '') {
  if (!headMold || !featureConfig) return null;
  const mountRole = resolveMoldMountRole(headMold, featureConfig);
  const anchorSource = mountRole ? headMold.mountAnchors?.[mountRole] : null;
  const anchorTransform = featureConfig.anchorVariant
    ? anchorSource?.[featureConfig.anchorVariant] || null
    : anchorSource || null;
  return mergeTransforms(
    anchorTransform,
    variantId ? headMold.partPresetOffsets?.[featureConfig.partKey]?.[variantId] : null,
  );
}

function resolveMoldPlacementTransform(
  headMold,
  featureConfig,
  variantId,
  placement,
  placementDefaults = null,
  anchorVariantOverride = '',
) {
  const defaults = placementDefaults && typeof placementDefaults === 'object' ? placementDefaults : {};
  const overridePlacement = placement && typeof placement === 'object' ? placement : {};
  const anchorTransform = resolveMoldAnchorTransform(
    headMold,
    anchorVariantOverride
      ? { ...featureConfig, anchorVariant: anchorVariantOverride }
      : featureConfig,
    variantId,
  );
  const size = (
    (Number.isFinite(defaults.size) ? defaults.size : 1)
    * (Number.isFinite(overridePlacement.size) ? overridePlacement.size : 1)
  );
  const x = (
    (Number.isFinite(defaults.offsetX) ? defaults.offsetX : 0)
    + (Number.isFinite(overridePlacement.offsetX) ? overridePlacement.offsetX : 0)
  );
  const y = (
    (Number.isFinite(defaults.offsetY) ? defaults.offsetY : 0)
    + (Number.isFinite(overridePlacement.offsetY) ? overridePlacement.offsetY : 0)
  );

  return mergeTransforms(
    anchorTransform,
    {
      x,
      y,
      scaleX: size,
      scaleY: size,
      originX: Number.isFinite(anchorTransform?.originX) ? anchorTransform.originX : 256,
      originY: Number.isFinite(anchorTransform?.originY) ? anchorTransform.originY : 256,
    },
  );
}

function buildHeadBaseMarkup(sourceHead, colors) {
  const headThickness = formatDirectiveNumber(sourceHead?.thickness, 0.38);
  const headBackBias = formatDirectiveNumber(sourceHead?.backBias, 0.56);
  const headBackBoxiness = formatDirectiveNumber(sourceHead?.backBoxiness, 0.42);
  const headBackExp = formatDirectiveNumber(sourceHead?.backEnvelopeExponent, 0.8);
  const headBackBoxPower = formatDirectiveNumber(sourceHead?.backBoxPower, 1.28);
  return `<path id="HEAD_BASE" data-rv-role="head" data-rv-volume="head" data-rv-thickness="${headThickness}" data-rv-back-bias="${headBackBias}" data-rv-back-boxiness="${headBackBoxiness}" data-rv-back-exp="${headBackExp}" data-rv-back-box-power="${headBackBoxPower}" d="${sourceHead.headPath}" fill="${colors.skin}"/>`;
}

function wrapHeadSvgMarkup(resolved, sourceHead, headMarkup) {
  const modeAttribute = escapeXmlAttr(resolved.headBuildMode || AVATAR_HEAD_BUILD_MODE_MOLD);
  const moldAttribute = ` data-rv-head-mold="${escapeXmlAttr(resolved.headMold?.id || '')}"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" data-rv-import="inflated-head" data-rv-head="HEAD_BASE" data-rv-profile="${sourceHead?.profile || 'default'}" data-rv-source="avatar-forge" data-rv-avatar-label="${escapeXmlAttr(resolved.recipe.label)}" data-rv-head-build-mode="${modeAttribute}"${moldAttribute}>${headMarkup}</svg>`;
}

function compileMoldAvatarHeadSvg(resolved) {
  const headMold = AVATAR_HEAD_MOLD_MAP[resolved.headMold?.id] || resolved.headMold || null;
  const sourceHead = resolveHeadBuildSource(resolved);
  if (!sourceHead?.headPath) {
    throw new Error(`Unable to resolve mold source head for ${resolved.headMold?.id || 'unknown mold'}`);
  }
  if (!headMold) {
    throw new Error(`Unable to resolve head mold for ${resolved.headMold?.id || 'unknown mold'}`);
  }

  const {
    hairPreset,
    eyePreset,
    browPreset,
    mouthPreset,
    nosePreset,
    earPreset,
    accessories,
    palette,
    features,
  } = resolved;

  const colors = buildColorTokens(palette);
  const eyeMarkup = applyMirroredPairSpacing(
    resolvePartMarkup(sourceHead, 'eyes', eyePreset.id, eyePreset.markup),
    features.eyes?.placement?.spacing,
  );
  const tunedEyeMarkup = retuneMoldFeatureMarkup(eyeMarkup, 'eyes');
  const browMarkup = resolvePartMarkup(sourceHead, 'brows', browPreset.id, browPreset.markup);
  const mouthMarkup = retuneMoldFeatureMarkup(
    resolvePartMarkup(sourceHead, 'mouth', mouthPreset.id, mouthPreset.markup),
    'mouth',
  );
  const hairBackMarkup = retuneMoldFeatureMarkup(hairPreset.backMarkup, 'hair');
  const hairFrontMarkup = retuneMoldFeatureMarkup(hairPreset.frontMarkup, 'hair');
  const noseMarkup = retuneMoldFeatureMarkup(nosePreset?.markup || '', 'nose');
  const earLeftMarkup = retuneMoldFeatureMarkup(earPreset?.leftMarkup || '', 'ears');
  const earRightMarkup = retuneMoldFeatureMarkup(earPreset?.rightMarkup || '', 'ears');
  const hairFrontAnchorVariant = String(hairPreset.mountVariantFront || MOLD_FEATURE_CONFIG.hairFront.anchorVariant || '').trim();
  const hairBackAnchorVariant = String(hairPreset.mountVariantBack || MOLD_FEATURE_CONFIG.hairBack.anchorVariant || '').trim();
  const hairFrontPlacementDefaults = hairPreset.placementDefaultsFront || hairPreset.placementDefaults;
  const hairBackPlacementDefaults = hairPreset.placementDefaultsBack || hairPreset.placementDefaults;
  const accessoryMountRole = resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.accessories);
  const headMarkup = [
    wrapMarkupWithMount(
      hairBackMarkup,
      resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.hairBack),
      MOLD_FEATURE_CONFIG.hairBack.featureKey,
      resolveMoldPlacementTransform(
        headMold,
        MOLD_FEATURE_CONFIG.hairBack,
        hairPreset.id,
        features.hair?.placement,
        hairBackPlacementDefaults,
        hairBackAnchorVariant,
      ),
      hairBackAnchorVariant,
    ),
    wrapMarkupWithMount(
      earLeftMarkup,
      resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.ears),
      MOLD_FEATURE_CONFIG.ears.featureKey,
      resolveMoldPlacementTransform(headMold, MOLD_FEATURE_CONFIG.ears, earPreset?.id, features.ears?.placement, earPreset?.placementDefaults),
    ),
    wrapMarkupWithMount(
      earRightMarkup,
      resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.ears),
      MOLD_FEATURE_CONFIG.ears.featureKey,
      resolveMoldPlacementTransform(headMold, MOLD_FEATURE_CONFIG.ears, earPreset?.id, features.ears?.placement, earPreset?.placementDefaults),
    ),
    buildHeadBaseMarkup(sourceHead, colors),
    wrapMarkupWithMount(
      hairFrontMarkup,
      resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.hairFront),
      MOLD_FEATURE_CONFIG.hairFront.featureKey,
      resolveMoldPlacementTransform(
        headMold,
        MOLD_FEATURE_CONFIG.hairFront,
        hairPreset.id,
        features.hair?.placement,
        hairFrontPlacementDefaults,
        hairFrontAnchorVariant,
      ),
      hairFrontAnchorVariant,
    ),
    wrapMarkupWithMount(
      browMarkup,
      resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.brows),
      MOLD_FEATURE_CONFIG.brows.featureKey,
      resolveMoldPlacementTransform(headMold, MOLD_FEATURE_CONFIG.brows, browPreset.id, features.brows?.placement, browPreset.placementDefaults),
    ),
    wrapMarkupWithMount(
      tunedEyeMarkup,
      resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.eyes),
      MOLD_FEATURE_CONFIG.eyes.featureKey,
      resolveMoldPlacementTransform(headMold, MOLD_FEATURE_CONFIG.eyes, eyePreset.id, features.eyes?.placement, eyePreset.placementDefaults),
    ),
    wrapMarkupWithMount(
      noseMarkup,
      resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.nose),
      MOLD_FEATURE_CONFIG.nose.featureKey,
      resolveMoldPlacementTransform(headMold, MOLD_FEATURE_CONFIG.nose, nosePreset?.id, features.nose?.placement, nosePreset?.placementDefaults),
    ),
    wrapMarkupWithMount(
      mouthMarkup,
      resolveMoldMountRole(headMold, MOLD_FEATURE_CONFIG.mouth),
      MOLD_FEATURE_CONFIG.mouth.featureKey,
      resolveMoldPlacementTransform(headMold, MOLD_FEATURE_CONFIG.mouth, mouthPreset.id, features.mouth?.placement, mouthPreset.placementDefaults),
    ),
    accessories
      .map((entry) => {
        const accessoryAnchorVariant = String(entry.mountVariant || '').trim();
        return wrapMarkupWithMount(
          entry.markup,
          accessoryMountRole,
          MOLD_FEATURE_CONFIG.accessories.featureKey,
          resolveMoldPlacementTransform(
            headMold,
            MOLD_FEATURE_CONFIG.accessories,
            entry.id,
            null,
            entry.placementDefaults,
            accessoryAnchorVariant,
          ),
          accessoryAnchorVariant,
        );
      })
      .join(''),
  ]
    .filter(Boolean)
    .map((entry) => replaceTokens(entry, colors))
    .join('');

  return wrapHeadSvgMarkup(resolved, sourceHead, headMarkup);
}

export function compileAvatarHeadSvg(recipeInput) {
  const resolved = resolveAvatarRecipe(recipeInput);
  if (!resolved.ok) {
    throw new Error(resolved.errors.join(' | ') || 'Invalid avatar recipe');
  }

  return compileMoldAvatarHeadSvg(resolved);
}

export function createAvatarHeadSource(recipeInput) {
  const resolved = resolveAvatarRecipe(recipeInput);
  const markup = compileAvatarHeadSvg(resolved.recipe);
  return {
    mode: 'code',
    filename: `${resolved.recipe.label || 'avatar'}-head.svg`,
    markup,
    inputs: {
      system: 'avatar-forge',
      recipe: resolved.recipe,
    },
  };
}
