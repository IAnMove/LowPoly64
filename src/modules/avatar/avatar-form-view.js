import {
  AVATAR_ACCESSORY_PRESETS,
  AVATAR_BODY_PRESETS,
  AVATAR_BROW_PRESETS,
  AVATAR_EAR_PRESETS,
  AVATAR_EYE_PRESETS,
  AVATAR_FULL_FACE_PRESETS,
  AVATAR_HAIR_PRESETS,
  AVATAR_HEAD_MOLDS,
  AVATAR_MOUTH_PRESETS,
  AVATAR_NOSE_PRESETS,
  AVATAR_PALETTES,
} from '../../data/avatar/catalog.js';
import { getLang, t } from '../shared/i18n.js';
import {
  AVATAR_COLOR_FIELDS,
  AVATAR_FEATURE_PLACEMENT_CONTROLS,
  AVATAR_HEAD_PARAM_CONTROLS,
  AVATAR_PLACEMENT_FIELD_CONFIG,
  buildHeadParamInputId,
  buildHeadParamValueId,
  buildPlacementInputId,
  buildPlacementValueId,
  formatHeadParamValue,
  formatPlacementValue,
  getAccessoryValue,
  populateSelect,
  sortCatalogEntriesByTargetOrder,
} from './avatar-form-controls.js';
import {
  buildPaletteTokens,
  FEATURE_SLAB_DEPTH_PRESETS,
} from './avatar-builder.js';
import { loadSprite } from '../texture/texture-generator.js';
import {
  closeAvatarFaceGallery,
  initAvatarFaceGallery,
  isAvatarFaceGalleryOpen,
  openAvatarFaceGallery,
} from './avatar-face-gallery.js';
import { exportAvatarFeaturePresetSvg } from './avatar-feature-svg.js';
import {
  PREVIEW_FOCUS_FULL,
  PREVIEW_FOCUS_HEAD,
} from './avatar-preview-diagnostics.js';
import {
  AVATAR_HEAD_BUILD_MODE_MOLD,
  createMoldAvatarRecipe,
  resolveAvatarRecipe,
} from './avatar-recipe.js';

function getElement(id) {
  return document.getElementById(id);
}

function getCatalogEntryLabel(entry) {
  if (!entry) return '';
  const labels = entry.labels && typeof entry.labels === 'object' ? entry.labels : null;
  if (labels) return labels[getLang()] || labels.en || entry.label || entry.id;
  return entry.label || entry.id;
}

function getFullFacePresetLabel(entry) {
  const label = getCatalogEntryLabel(entry);
  if (entry?.surfaceMode === 'transparent') return `[TRANSPARENT] ${label}`;
  if (entry?.surfaceMode === 'skinPlate') return `[SKIN PLATE] ${label}`;
  return label;
}

function formatHeadScale(value) {
  const numeric = Number.isFinite(value) ? value : 1;
  return numeric.toFixed(2);
}

function getFeatureSlabPresetLabel(entry) {
  if (!entry) return '';
  const label = entry.labels?.[getLang()] || entry.labels?.en || entry.id;
  const headDepth = Number.isFinite(entry.headDepthRatio)
    ? `${Math.round(entry.headDepthRatio * 100)}% head`
    : 'head depth';
  const visible = Number.isFinite(entry.frontProtrusionRatio)
    ? `${Math.round(entry.frontProtrusionRatio * 100)}% front`
    : 'front';
  return `${label} / ${headDepth} / ${visible}`;
}

function syncFeatureSlabPresetNote(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  const preset = FEATURE_SLAB_DEPTH_PRESETS[resolved.recipe.featureSlabPresetId];
  const note = getElement('avatar-feature-slab-preset-note');
  if (note) note.textContent = preset?.descriptions?.[getLang()] || preset?.descriptions?.en || preset?.description || '';
}

function syncFullFaceModeNote(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  const note = getElement('avatar-full-face-mode-note');
  if (!note) return;
  const mode = resolved.fullFacePreset?.surfaceMode;
  const key = mode === 'transparent'
    ? 'avatarFullFaceTransparentNote'
    : mode === 'skinPlate'
      ? 'avatarFullFaceSkinPlateNote'
      : 'avatarFullFaceCustomNote';
  note.textContent = t(key);
  note.classList.toggle('text-[#9dffcb]', mode === 'transparent');
  note.classList.toggle('text-[#ffcc00]', mode === 'skinPlate');
  note.classList.toggle('text-zinc-500', !mode);
}

let facePreviewGeneration = 0;
let syncedAvatarRecipe = null;

function clearSpritePreview(canvas) {
  const context = canvas?.getContext?.('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const cell = 8;
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      context.fillStyle = ((x / cell) + (y / cell)) % 2 === 0 ? '#111114' : '#1c1c21';
      context.fillRect(x, y, cell, cell);
    }
  }
}

async function drawSpritePreview(canvasId, spriteId, tint, generation) {
  const canvas = getElement(canvasId);
  if (!canvas) return;
  const tintSignature = Object.entries(tint || {}).sort(([a], [b]) => a.localeCompare(b));
  const signature = JSON.stringify([spriteId || '', tintSignature]);
  if (canvas.dataset.previewSignature === signature) return;
  clearSpritePreview(canvas);
  if (!spriteId) {
    canvas.dataset.previewSignature = signature;
    canvas.dataset.previewRenderCount = String((Number(canvas.dataset.previewRenderCount) || 0) + 1);
    return;
  }
  const sprite = await loadSprite(spriteId, tint);
  if (generation !== facePreviewGeneration) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
  const width = Math.max(1, Math.round(sprite.width * scale));
  const height = Math.max(1, Math.round(sprite.height * scale));
  const x = Math.round((canvas.width - width) / 2);
  const y = Math.round((canvas.height - height) / 2);
  context.drawImage(sprite, x, y, width, height);
  canvas.dataset.previewSignature = signature;
  canvas.dataset.previewRenderCount = String((Number(canvas.dataset.previewRenderCount) || 0) + 1);
}

function syncFaceSpritePreviews(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  const colors = buildPaletteTokens(resolved.palette);
  const generation = ++facePreviewGeneration;
  void Promise.all([
    drawSpritePreview('avatar-eye-sprite-preview', resolved.eyePreset?.spriteId, { iris: colors.iris }, generation),
    drawSpritePreview('avatar-brow-sprite-preview', resolved.browPreset?.spriteId, { brow: colors.hairDark }, generation),
    drawSpritePreview('avatar-mouth-sprite-preview', resolved.mouthPreset?.spriteId, { lip: colors.lip }, generation),
    drawSpritePreview('avatar-full-face-sprite-preview', resolved.fullFacePreset?.spriteId, { iris: colors.iris }, generation),
  ]);
}

const AVATAR_CATALOG_SELECT_CONTROLS = Object.freeze([
  Object.freeze({
    selectId: 'avatar-body-select',
    entries: () => AVATAR_BODY_PRESETS,
    selectedId: (resolved) => resolved.recipe.bodyPresetId,
    labelForEntry: (entry) => `${getCatalogEntryLabel(entry)} / ${entry.family}`,
    patch: (value) => ({ bodyPresetId: value }),
    previewFocusMode: PREVIEW_FOCUS_FULL,
  }),
  Object.freeze({
    selectId: 'avatar-head-mold-select',
    entries: () => AVATAR_HEAD_MOLDS,
    selectedId: (resolved) => resolved.recipe.headMoldId,
    patch: (value) => ({ headMoldId: value }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-hair-select',
    entries: () => sortCatalogEntriesByTargetOrder('hair', AVATAR_HAIR_PRESETS),
    selectedId: (resolved) => resolved.features?.hair?.presetId || resolved.recipe.hairPresetId,
    patch: (value) => ({ features: { hair: { presetId: value } } }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-full-face-select',
    entries: () => AVATAR_FULL_FACE_PRESETS,
    selectedId: (resolved) => resolved.features?.fullFace?.presetId || resolved.recipe.fullFacePresetId,
    labelForEntry: getFullFacePresetLabel,
    patch: (value) => ({
      features: {
        fullFace: { presetId: value },
      },
    }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-eye-select',
    entries: () => sortCatalogEntriesByTargetOrder('eyes', AVATAR_EYE_PRESETS),
    selectedId: (resolved) => resolved.features?.eyes?.presetId || resolved.recipe.eyePresetId,
    patch: (value) => ({ features: { eyes: { presetId: value } } }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-brow-select',
    entries: () => sortCatalogEntriesByTargetOrder('brows', AVATAR_BROW_PRESETS),
    selectedId: (resolved) => resolved.features?.brows?.presetId || resolved.recipe.browPresetId,
    patch: (value) => ({ features: { brows: { presetId: value } } }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-nose-select',
    entries: () => sortCatalogEntriesByTargetOrder('nose', AVATAR_NOSE_PRESETS),
    selectedId: (resolved) => resolved.features?.nose?.presetId || '',
    patch: (value) => ({ features: { nose: { presetId: value } } }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-mouth-select',
    entries: () => sortCatalogEntriesByTargetOrder('mouth', AVATAR_MOUTH_PRESETS),
    selectedId: (resolved) => resolved.features?.mouth?.presetId || resolved.recipe.mouthPresetId,
    patch: (value) => ({ features: { mouth: { presetId: value } } }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-feature-slab-preset-select',
    entries: () => Object.values(FEATURE_SLAB_DEPTH_PRESETS),
    selectedId: (resolved) => resolved.recipe.featureSlabPresetId,
    labelForEntry: getFeatureSlabPresetLabel,
    patch: (value) => ({ featureSlabPresetId: value }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-ear-select',
    entries: () => sortCatalogEntriesByTargetOrder('ears', AVATAR_EAR_PRESETS),
    selectedId: (resolved) => resolved.features?.ears?.presetId || '',
    patch: (value) => ({ features: { ears: { presetId: value } } }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-accessory-select',
    entries: () => sortCatalogEntriesByTargetOrder('accessory', AVATAR_ACCESSORY_PRESETS),
    selectedId: (resolved) => getAccessoryValue(resolved.recipe),
    patch: (value) => ({ accessoryIds: value === 'none' ? ['none'] : [value] }),
    previewFocusMode: PREVIEW_FOCUS_HEAD,
  }),
  Object.freeze({
    selectId: 'avatar-palette-select',
    entries: () => sortCatalogEntriesByTargetOrder('palette', AVATAR_PALETTES),
    selectedId: (resolved) => resolved.recipe.paletteId,
    patch: (value) => ({ paletteId: value, colorOverrides: {} }),
    previewFocusMode: 'current',
  }),
]);

const AVATAR_PLACEMENT_BLOCKS = Object.freeze([
  Object.freeze({
    containerId: 'avatar-face-placement-controls',
    featureKeys: Object.freeze(['fullFace', 'eyes', 'brows', 'mouth']),
  }),
  Object.freeze({
    containerId: 'avatar-extra-placement-controls',
    featureKeys: Object.freeze(['hair', 'nose', 'ears']),
  }),
]);

const FACE_CYCLE_SELECT_IDS = Object.freeze({
  eyes: 'avatar-eye-select',
  brows: 'avatar-brow-select',
  mouth: 'avatar-mouth-select',
  fullFace: 'avatar-full-face-select',
});

const FACE_GALLERY_ENTRIES = Object.freeze({
  eyes: AVATAR_EYE_PRESETS,
  brows: AVATAR_BROW_PRESETS,
  mouth: AVATAR_MOUTH_PRESETS,
  fullFace: AVATAR_FULL_FACE_PRESETS,
});

function openFaceGalleryForFeature(featureKey, recipe) {
  const select = getElement(FACE_CYCLE_SELECT_IDS[featureKey]);
  const entries = FACE_GALLERY_ENTRIES[featureKey];
  if (!select || select.disabled || !entries) return;
  const resolved = resolveAvatarRecipe(recipe);
  const colors = buildPaletteTokens(resolved.palette);
  const tint = featureKey === 'eyes'
    ? { iris: colors.iris }
    : featureKey === 'brows'
      ? { brow: colors.hairDark }
      : featureKey === 'mouth'
        ? { lip: colors.lip }
        : { iris: colors.iris };
  const title = featureKey === 'fullFace' ? 'FULL FACE' : t({ eyes: 'avatarEyes', brows: 'avatarBrows', mouth: 'avatarMouth' }[featureKey]);
  const filters = featureKey === 'fullFace'
    ? [
      { id: 'transparent', label: t('avatarFaceGalleryTransparent') },
      { id: 'skinPlate', label: t('avatarFaceGallerySkinPlate') },
    ]
    : [
      { id: 'image2', label: 'IMAGE2' },
      { id: 'classic', label: t('avatarFaceGalleryClassic') },
    ];
  openAvatarFaceGallery({
    title,
    filters,
    entries: entries.map((entry) => ({
      id: entry.id,
      category: featureKey === 'fullFace'
        ? (entry.surfaceMode || 'custom')
        : (entry.id.startsWith('image2_') ? 'image2' : 'classic'),
      spriteId: entry.spriteId || '',
      svgMarkup: !entry.spriteId && entry.markup
        ? exportAvatarFeaturePresetSvg(featureKey, entry.id, { colors })
        : '',
      label: featureKey === 'fullFace' ? getFullFacePresetLabel(entry) : getCatalogEntryLabel(entry),
    })),
    selectedId: select.value,
    tint,
    onSelect: (presetId) => {
      select.value = presetId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    },
  });
}

const FACE_CYCLE_INDICATOR_IDS = Object.freeze({
  eyes: 'avatar-eye-sprite-index',
  brows: 'avatar-brow-sprite-index',
  mouth: 'avatar-mouth-sprite-index',
  fullFace: 'avatar-full-face-sprite-index',
});

function syncFaceCycleIndicators() {
  Object.entries(FACE_CYCLE_SELECT_IDS).forEach(([featureKey, selectId]) => {
    const select = getElement(selectId);
    const indicator = getElement(FACE_CYCLE_INDICATOR_IDS[featureKey]);
    if (!select || !indicator) return;
    const current = select.options.length > 0 ? Math.max(select.selectedIndex, 0) + 1 : 0;
    indicator.textContent = `${current}/${select.options.length}`;
    const selectedLabel = select.selectedOptions?.[0]?.textContent?.trim() || '';
    indicator.title = selectedLabel;
    const preview = document.querySelector(`[data-face-preview-feature="${featureKey}"]`);
    if (preview) preview.title = selectedLabel;
  });
}

function resolveFeaturePlacementConfigs(featureKeys) {
  const wanted = new Set(featureKeys);
  return AVATAR_FEATURE_PLACEMENT_CONTROLS.filter((entry) => wanted.has(entry.featureKey));
}

function renderPlacementCard(featureConfig) {
  return `
    <div class="border border-zinc-700 bg-zinc-950 px-3 py-2" data-feature-card="${featureConfig.featureKey}">
      <div class="mb-2 text-[8px] tracking-wide text-[#ff77aa]">${t(featureConfig.labelKey)}</div>
      <div class="space-y-2">
        ${featureConfig.fields.map((fieldKey) => {
          const fieldConfig = AVATAR_PLACEMENT_FIELD_CONFIG[fieldKey];
          const inputId = buildPlacementInputId(featureConfig.featureKey, fieldKey);
          const valueId = buildPlacementValueId(featureConfig.featureKey, fieldKey);
          return `
            <label for="${inputId}" class="block">
              <div class="mb-1 flex items-center justify-between gap-2 text-[8px] text-zinc-400">
                <span>${t(fieldConfig.labelKey)}</span>
                <span id="${valueId}" class="text-zinc-200">0</span>
              </div>
              <input
                id="${inputId}"
                data-feature-key="${featureConfig.featureKey}"
                data-placement-field="${fieldKey}"
                type="range"
                min="${fieldConfig.min}"
                max="${fieldConfig.max}"
                step="${fieldConfig.step}"
                class="w-full accent-[#ff77aa]"
              >
            </label>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function renderFeaturePlacementControls() {
  AVATAR_PLACEMENT_BLOCKS.forEach((block) => {
    const container = getElement(block.containerId);
    if (!container) return;
    container.innerHTML = resolveFeaturePlacementConfigs(block.featureKeys)
      .map((featureConfig) => renderPlacementCard(featureConfig))
      .join('');
  });
}

function renderHeadParamControl(config) {
  const inputId = buildHeadParamInputId(config.key);
  const valueId = buildHeadParamValueId(config.key);
  return `
    <label for="${inputId}" class="block border border-zinc-700 bg-zinc-950 px-3 py-2">
      <div class="mb-1 flex items-center justify-between gap-2 text-[8px] text-zinc-400">
        <span>${config.label}</span>
        <span id="${valueId}" class="text-zinc-200">0.00</span>
      </div>
      <input
        id="${inputId}"
        data-head-param-key="${config.key}"
        type="range"
        min="${config.min}"
        max="${config.max}"
        step="${config.step}"
        class="w-full accent-[#ff77aa]"
      >
    </label>
  `;
}

export function renderHeadParamControls() {
  const container = getElement('avatar-head-param-controls');
  if (!container) return;
  container.innerHTML = AVATAR_HEAD_PARAM_CONTROLS
    .map((config) => renderHeadParamControl(config))
    .join('');
}

export function populateAvatarCatalogControls(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  AVATAR_CATALOG_SELECT_CONTROLS.forEach((control) => {
    populateSelect(control.selectId, control.entries(), {
      selectedId: control.selectedId(resolved),
      labelForEntry: control.labelForEntry || getCatalogEntryLabel,
    });
  });
}

function syncFeaturePlacementControlsFromRecipe(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  const moldMode = resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD;
  const fullFaceActive = resolved.features?.fullFace?.presetId && resolved.features.fullFace.presetId !== 'none_01';

  AVATAR_FEATURE_PLACEMENT_CONTROLS.forEach((featureConfig) => {
    const placement = resolved.features?.[featureConfig.featureKey]?.placement || {};
    const disabledByFullFace = fullFaceActive && ['eyes', 'brows', 'mouth'].includes(featureConfig.featureKey);
    featureConfig.fields.forEach((fieldKey) => {
      const fieldConfig = AVATAR_PLACEMENT_FIELD_CONFIG[fieldKey];
      const input = getElement(buildPlacementInputId(featureConfig.featureKey, fieldKey));
      const valueEl = getElement(buildPlacementValueId(featureConfig.featureKey, fieldKey));
      const nextValue = Number.isFinite(placement[fieldKey]) ? placement[fieldKey] : fieldConfig.defaultValue;
      if (input) {
        input.value = String(nextValue);
        input.disabled = !moldMode || disabledByFullFace;
        input.classList.toggle('opacity-50', !moldMode || disabledByFullFace);
      }
      if (valueEl) valueEl.textContent = formatPlacementValue(fieldKey, nextValue);
    });
  });

  const controlsRoot = getElement('avatar-feature-controls');
  if (controlsRoot) controlsRoot.classList.toggle('opacity-50', !moldMode);

  ['avatar-eye-select', 'avatar-brow-select', 'avatar-mouth-select'].forEach((id) => {
    const select = getElement(id);
    if (!select) return;
    select.disabled = !moldMode || fullFaceActive;
    select.classList.toggle('opacity-50', !moldMode || fullFaceActive);
  });
  document.querySelectorAll('[data-face-cycle]').forEach((button) => {
    const featureKey = button.dataset.faceCycle;
    const select = getElement(FACE_CYCLE_SELECT_IDS[featureKey]);
    const disabled = !select || select.disabled;
    button.disabled = disabled;
    button.classList.toggle('opacity-30', disabled);
    button.classList.toggle('cursor-not-allowed', disabled);
  });
  document.querySelectorAll('[data-face-preview-feature]').forEach((preview) => {
    const dimmed = fullFaceActive && ['eyes', 'brows', 'mouth'].includes(preview.dataset.facePreviewFeature);
    preview.classList.toggle('opacity-35', dimmed);
  });
}

function renderHeadModeState(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  const headModeEl = getElement('avatar-head-mode');
  const noteEl = getElement('avatar-head-mode-note');
  const featureNoteEl = getElement('avatar-feature-controls-note');
  const headMoldWrap = getElement('avatar-head-mold-wrap');
  const headMoldSelect = getElement('avatar-head-mold-select');
  const noseWrap = getElement('avatar-nose-wrap');
  const earWrap = getElement('avatar-ear-wrap');
  const noseSelect = getElement('avatar-nose-select');
  const earSelect = getElement('avatar-ear-select');

  if (headModeEl) {
    headModeEl.textContent = t('avatarMoldMode');
    headModeEl.className = 'text-[10px] text-[#9dffcb]';
  }
  if (noteEl) noteEl.textContent = t('avatarMoldModeNote');
  if (featureNoteEl) featureNoteEl.textContent = t('avatarPlacementEnabled');

  headMoldWrap?.classList.remove('hidden');
  noseWrap?.classList.remove('hidden');
  earWrap?.classList.remove('hidden');

  if (headMoldSelect) headMoldSelect.disabled = false;
  if (noseSelect) noseSelect.disabled = false;
  if (earSelect) earSelect.disabled = false;

  void resolved;
}

function syncColorControlsFromRecipe(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  AVATAR_COLOR_FIELDS.forEach(({ key, inputId, valueId }) => {
    const nextColor = resolved.palette?.[key] || '#000000';
    const input = getElement(inputId);
    const valueEl = getElement(valueId);
    if (input) input.value = nextColor;
    if (valueEl) valueEl.textContent = nextColor.toUpperCase();
  });
}

function syncHeadScaleControlFromRecipe(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  const value = Number.isFinite(resolved.recipe.headScale) ? resolved.recipe.headScale : 1;
  const input = getElement('avatar-head-scale-input');
  const valueEl = getElement('avatar-head-scale-value');
  if (input) input.value = String(value);
  if (valueEl) valueEl.textContent = formatHeadScale(value);
}

function syncFeatureDepthScaleControlFromRecipe(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  const value = Number.isFinite(resolved.recipe.featureDepthScale) ? resolved.recipe.featureDepthScale : 1;
  const input = getElement('avatar-feature-depth-scale-input');
  const valueEl = getElement('avatar-feature-depth-scale-value');
  if (input) input.value = String(value);
  if (valueEl) valueEl.textContent = `${value.toFixed(2)}x`;
}

function syncHeadParamControlsFromRecipe(recipe) {
  const resolved = resolveAvatarRecipe(recipe);
  const enabled = !!resolved.headMold?.generatedPresetId;
  const noteEl = getElement('avatar-head-param-note');
  if (noteEl) noteEl.textContent = enabled ? 'GEN' : 'LOCKED';

  AVATAR_HEAD_PARAM_CONTROLS.forEach((config) => {
    const value = Number.isFinite(resolved.recipe.headParams?.[config.key])
      ? resolved.recipe.headParams[config.key]
      : 0;
    const input = getElement(buildHeadParamInputId(config.key));
    const valueEl = getElement(buildHeadParamValueId(config.key));
    if (input) {
      input.value = String(value);
      input.disabled = !enabled;
      input.classList.toggle('opacity-50', !enabled);
    }
    if (valueEl) valueEl.textContent = formatHeadParamValue(value);
  });
}

export function syncAvatarFormFromRecipe(recipe) {
  syncedAvatarRecipe = recipe;
  const resolved = resolveAvatarRecipe(recipe);
  const labelInput = getElement('avatar-label-input');

  if (labelInput) labelInput.value = resolved.recipe.label || 'Avatar';
  AVATAR_CATALOG_SELECT_CONTROLS.forEach((control) => {
    const select = getElement(control.selectId);
    if (select) select.value = control.selectedId(resolved);
  });
  syncHeadScaleControlFromRecipe(recipe);
  syncFeatureDepthScaleControlFromRecipe(recipe);
  syncFeatureSlabPresetNote(recipe);
  syncFullFaceModeNote(recipe);
  syncFaceSpritePreviews(recipe);
  syncFaceCycleIndicators();
  syncHeadParamControlsFromRecipe(recipe);
  syncColorControlsFromRecipe(recipe);
  renderHeadModeState(recipe);
  syncFeaturePlacementControlsFromRecipe(recipe);
}

export function renderAvatarCharacterSheet(recipe) {
  const sheet = getElement('avatar-sheet');
  if (!sheet) return;

  const resolved = resolveAvatarRecipe(recipe);
  if (!resolved.ok) {
    sheet.textContent = 'Invalid avatar recipe';
    return;
  }

  const accessories = resolved.accessories.length > 0
    ? resolved.accessories.map((entry) => getCatalogEntryLabel(entry)).join(', ')
    : getCatalogEntryLabel(AVATAR_ACCESSORY_PRESETS[0]) || 'None';

  sheet.textContent = [
    `${t('avatarLabel')}: ${resolved.recipe.label}`,
    `${t('avatarBody')}: ${getCatalogEntryLabel(resolved.bodyPreset) || resolved.recipe.bodyPresetId}`,
    `${t('avatarHeadMode')}: ${t('avatarMoldMode')}`,
    `${t('avatarHeadBase')}: ${getCatalogEntryLabel(resolved.headMold) || resolved.recipe.headMoldId}`,
    `${t('avatarHeadScale')}: ${formatHeadScale(resolved.recipe.headScale)}`,
    `SKULL: ${AVATAR_HEAD_PARAM_CONTROLS.map((entry) => `${entry.label} ${formatHeadParamValue(resolved.recipe.headParams?.[entry.key])}`).join(' / ')}`,
    `${t('avatarHair')}: ${getCatalogEntryLabel(resolved.hairPreset) || resolved.recipe.hairPresetId}`,
    `FULL FACE: ${getCatalogEntryLabel(resolved.fullFacePreset) || resolved.recipe.fullFacePresetId}`,
    `${t('avatarEyes')}: ${getCatalogEntryLabel(resolved.eyePreset) || resolved.recipe.eyePresetId}`,
    `${t('avatarBrows')}: ${getCatalogEntryLabel(resolved.browPreset) || resolved.recipe.browPresetId}`,
    `${t('avatarMouth')}: ${getCatalogEntryLabel(resolved.mouthPreset) || resolved.recipe.mouthPresetId}`,
    `SLAB DEPTH: ${resolved.recipe.featureSlabPresetId}`,
    `DEPTH FINE: ${resolved.recipe.featureDepthScale.toFixed(2)}x`,
    `${t('avatarNose')}: ${getCatalogEntryLabel(resolved.nosePreset) || resolved.features?.nose?.presetId || '-'}`,
    `${t('avatarEars')}: ${getCatalogEntryLabel(resolved.earPreset) || resolved.features?.ears?.presetId || '-'}`,
    `${t('avatarAccessory')}: ${accessories}`,
    `${t('avatarPalette')}: ${getCatalogEntryLabel(resolved.palettePreset) || resolved.recipe.paletteId}`,
    `COLORS: skin ${resolved.palette?.skin || '-'} hair ${resolved.palette?.hair || '-'} iris ${resolved.palette?.iris || '-'}`,
    `BODY: ${resolved.palette?.bodyPrimary || '-'} / ${resolved.palette?.bodySecondary || '-'} accent ${resolved.palette?.accent || '-'}`,
  ].join('\n');
}

function pickRandomEntry(entries, { excludeIds = [] } = {}) {
  const blocked = new Set(excludeIds);
  const pool = (Array.isArray(entries) ? entries : []).filter((entry) => entry?.id && !blocked.has(entry.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomInt(min, max) {
  return Math.round(min + (Math.random() * (max - min)));
}

function randomFloat(min, max, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((min + (Math.random() * (max - min))) * factor) / factor;
}

function buildRandomPlacement(featureKey) {
  const placement = {
    size: randomFloat(0.82, 1.22),
    offsetX: randomInt(-18, 18),
    offsetY: randomInt(-18, 18),
  };
  if (featureKey === 'eyes') {
    placement.spacing = randomInt(-14, 14);
  }
  if (featureKey === 'hair') {
    placement.length = randomInt(-18, 18);
  }
  return placement;
}

export function buildRandomAvatarRecipe() {
  const bodyPreset = pickRandomEntry(AVATAR_BODY_PRESETS);
  const headMold = pickRandomEntry(AVATAR_HEAD_MOLDS);
  const hair = pickRandomEntry(AVATAR_HAIR_PRESETS, { excludeIds: ['none_01'] });
  const eyes = pickRandomEntry(AVATAR_EYE_PRESETS, { excludeIds: ['none_01'] });
  const brows = pickRandomEntry(AVATAR_BROW_PRESETS, { excludeIds: ['none_01'] });
  const nose = pickRandomEntry(AVATAR_NOSE_PRESETS);
  const mouth = pickRandomEntry(AVATAR_MOUTH_PRESETS, { excludeIds: ['none_01'] });
  const ears = pickRandomEntry(AVATAR_EAR_PRESETS);
  const accessory = pickRandomEntry(AVATAR_ACCESSORY_PRESETS, { excludeIds: ['none'] });
  const palette = pickRandomEntry(AVATAR_PALETTES);
  const headParams = headMold?.generatedPresetId
    ? Object.fromEntries(AVATAR_HEAD_PARAM_CONTROLS.map((entry) => [entry.key, randomFloat(entry.min * 0.45, entry.max * 0.45)]))
    : {};

  return createMoldAvatarRecipe({
    label: `Random ${randomInt(1000, 9999)}`,
    bodyPresetId: bodyPreset?.id,
    headMoldId: headMold?.id,
    headScale: randomFloat(0.92, 1.18),
    headParams,
    accessoryIds: accessory?.id ? [accessory.id] : ['none'],
    paletteId: palette?.id,
    colorOverrides: {},
    features: {
      hair: { presetId: hair?.id, placement: buildRandomPlacement('hair') },
      fullFace: { presetId: 'none_01', placement: buildRandomPlacement('fullFace') },
      eyes: { presetId: eyes?.id, placement: buildRandomPlacement('eyes') },
      brows: { presetId: brows?.id, placement: buildRandomPlacement('brows') },
      nose: { presetId: nose?.id, placement: buildRandomPlacement('nose') },
      mouth: { presetId: mouth?.id, placement: buildRandomPlacement('mouth') },
      ears: { presetId: ears?.id, placement: buildRandomPlacement('ears') },
    },
  });
}

export function bindAvatarFormListeners({
  updateRecipe,
  randomizeAvatarForge,
  closeAvatarForge,
  confirmAvatarForge,
  getPreviewFocusMode,
  focusPreviewMode,
}) {
  initAvatarFaceGallery();
  getElement('avatar-label-input')?.addEventListener('input', (event) => {
    updateRecipe({ label: event.target.value }, { rebuild: false });
  });

  AVATAR_CATALOG_SELECT_CONTROLS.forEach((control) => {
    getElement(control.selectId)?.addEventListener('change', (event) => {
      updateRecipe(control.patch(event.target.value), {
        previewFocusMode: control.previewFocusMode === 'current'
          ? getPreviewFocusMode()
          : control.previewFocusMode,
      });
    });
  });

  getElement('avatar-head-scale-input')?.addEventListener('input', (event) => {
    const nextValue = Number.parseFloat(event.target.value);
    const headScale = Number.isFinite(nextValue) ? nextValue : 1;
    const valueEl = getElement('avatar-head-scale-value');
    if (valueEl) valueEl.textContent = formatHeadScale(headScale);
    updateRecipe({ headScale }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });

  getElement('avatar-reset-face-fit')?.addEventListener('click', () => {
    updateRecipe({
      featureSlabPresetId: 'default_embedded',
      featureDepthScale: 1,
      features: {
        fullFace: { placement: { size: 1, offsetX: 0, offsetY: 0 } },
        eyes: { placement: { size: 1, offsetX: 0, offsetY: 0, spacing: 0 } },
        brows: { placement: { size: 1, offsetX: 0, offsetY: 0 } },
        mouth: { placement: { size: 1, offsetX: 0, offsetY: 0 } },
      },
    }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });

  getElement('avatar-face-sprite-previews')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-face-cycle]');
    if (!button || button.disabled) return;
    const select = getElement(FACE_CYCLE_SELECT_IDS[button.dataset.faceCycle]);
    if (!select || select.disabled || select.options.length === 0) return;
    const delta = Number.parseInt(button.dataset.cycleDelta, 10) || 1;
    const current = Math.max(select.selectedIndex, 0);
    select.selectedIndex = (current + delta + select.options.length) % select.options.length;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  getElement('avatar-face-sprite-previews')?.addEventListener('click', (event) => {
    const preview = event.target.closest('[data-open-face-gallery]');
    if (preview) {
      focusPreviewMode(PREVIEW_FOCUS_HEAD);
      openFaceGalleryForFeature(preview.dataset.openFaceGallery, syncedAvatarRecipe);
    }
  });
  getElement('avatar-face-sprite-previews')?.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const preview = event.target.closest('[data-open-face-gallery]');
    if (!preview) return;
    event.preventDefault();
    focusPreviewMode(PREVIEW_FOCUS_HEAD);
    openFaceGalleryForFeature(preview.dataset.openFaceGallery, syncedAvatarRecipe);
  });

  getElement('avatar-feature-depth-scale-input')?.addEventListener('input', (event) => {
    const nextValue = Number.parseFloat(event.target.value);
    const featureDepthScale = Number.isFinite(nextValue) ? nextValue : 1;
    const valueEl = getElement('avatar-feature-depth-scale-value');
    if (valueEl) valueEl.textContent = `${featureDepthScale.toFixed(2)}x`;
    updateRecipe({ featureDepthScale }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });

  getElement('avatar-head-param-controls')?.addEventListener('input', (event) => {
    const key = event.target?.dataset?.headParamKey;
    if (!key) return;
    const nextValue = Number.parseFloat(event.target.value);
    const value = Number.isFinite(nextValue) ? nextValue : 0;
    const valueEl = getElement(buildHeadParamValueId(key));
    if (valueEl) valueEl.textContent = formatHeadParamValue(value);
    updateRecipe({ headParams: { [key]: value } }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });

  AVATAR_COLOR_FIELDS.forEach(({ key, inputId }) => {
    getElement(inputId)?.addEventListener('input', (event) => {
      updateRecipe({
        colorOverrides: {
          [key]: event.target.value,
        },
      }, { previewFocusMode: getPreviewFocusMode() });
    });
  });

  getElement('avatar-feature-controls')?.addEventListener('input', (event) => {
    const featureKey = event.target?.dataset?.featureKey;
    const fieldKey = event.target?.dataset?.placementField;
    if (!featureKey || !fieldKey) return;
    const nextValue = fieldKey === 'size'
      ? Number.parseFloat(event.target.value)
      : Number.parseInt(event.target.value, 10);
    updateRecipe({
      features: {
        [featureKey]: {
          placement: {
            [fieldKey]: Number.isFinite(nextValue) ? nextValue : 0,
          },
        },
      },
    }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });

  getElement('avatar-random-btn')?.addEventListener('click', () => {
    randomizeAvatarForge();
  });
  getElement('avatar-forge-close-top')?.addEventListener('click', () => closeAvatarForge());
  getElement('avatar-forge-cancel-btn')?.addEventListener('click', () => closeAvatarForge());
  getElement('avatar-forge-confirm-btn')?.addEventListener('click', () => {
    void confirmAvatarForge();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (isAvatarFaceGalleryOpen()) {
      event.preventDefault();
      closeAvatarFaceGallery();
      return;
    }
    const modal = getElement('avatar-forge-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    event.preventDefault();
    closeAvatarForge();
  });
}
