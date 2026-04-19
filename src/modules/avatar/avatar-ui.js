import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  AVATAR_ACCESSORY_PRESETS,
  AVATAR_BODY_PRESETS,
  AVATAR_BROW_PRESETS,
  AVATAR_EAR_PRESETS,
  AVATAR_EYE_PRESETS,
  AVATAR_HAIR_PRESETS,
  AVATAR_HEAD_MOLDS,
  AVATAR_HEAD_SHAPES,
  AVATAR_MOUTH_PRESETS,
  AVATAR_NOSE_PRESETS,
  AVATAR_PALETTES,
  AVATAR_STYLE_LIBRARY_TARGETS_BY_TYPE,
} from '../../data/avatar/catalog.js';
import { emit } from '../../event-bus.js';
import { state } from '../shared/state.js';
import { onLangChange, t } from '../shared/i18n.js';
import { pushAction } from '../shared/undo.js';
import { showToast } from '../shared/ui-helpers.js';
import { refreshObjectList, updateSelectedOverlay } from '../viewport/object-list.js';
import { deselectAll, selectMesh } from '../viewport/selection.js';
import { buildAvatarGroup } from './avatar-builder.js';
import {
  AVATAR_HEAD_BUILD_MODE_LEGACY,
  AVATAR_HEAD_BUILD_MODE_MOLD,
  cloneAvatarRecipe,
  createDefaultAvatarRecipe,
  mergeAvatarRecipe,
  resolveAvatarRecipe,
} from './avatar-recipe.js';

const PREVIEW_DEFAULT_DELAY = 160;
const PREVIEW_FOCUS_FULL = 'full';
const PREVIEW_FOCUS_HEAD = 'head';
const HEAD_SLOT_ID = 'HEAD';
const previewClock = new THREE.Timer();

if (typeof document !== 'undefined') {
  previewClock.connect(document);
}

const avatarForgeState = {
  initialized: false,
  open: false,
  targetGroup: null,
  recipe: createDefaultAvatarRecipe(),
  previewRenderer: null,
  previewScene: null,
  previewCamera: null,
  previewControls: null,
  previewGroup: null,
  previewFocusMode: PREVIEW_FOCUS_FULL,
  previewCameraNeedsReframe: true,
  previewFrameId: null,
  rebuildTimer: null,
  rebuildNonce: 0,
  building: false,
  confirming: false,
  status: {
    kind: 'idle',
    detail: '',
  },
};

const AVATAR_COLOR_FIELDS = Object.freeze([
  { key: 'skin', inputId: 'avatar-color-skin', valueId: 'avatar-color-skin-value' },
  { key: 'hair', inputId: 'avatar-color-hair', valueId: 'avatar-color-hair-value' },
  { key: 'iris', inputId: 'avatar-color-iris', valueId: 'avatar-color-iris-value' },
  { key: 'bodyPrimary', inputId: 'avatar-color-body-primary', valueId: 'avatar-color-body-primary-value' },
  { key: 'bodySecondary', inputId: 'avatar-color-body-secondary', valueId: 'avatar-color-body-secondary-value' },
  { key: 'accent', inputId: 'avatar-color-accent', valueId: 'avatar-color-accent-value' },
]);

const AVATAR_PLACEMENT_FIELD_CONFIG = Object.freeze({
  size: Object.freeze({ labelKey: 'avatarPlacementSize', min: 0.7, max: 1.35, step: 0.01, defaultValue: 1 }),
  offsetX: Object.freeze({ labelKey: 'avatarPlacementX', min: -48, max: 48, step: 1, defaultValue: 0 }),
  offsetY: Object.freeze({ labelKey: 'avatarPlacementY', min: -48, max: 48, step: 1, defaultValue: 0 }),
  spacing: Object.freeze({ labelKey: 'avatarPlacementSpacing', min: -32, max: 32, step: 1, defaultValue: 0 }),
});

const AVATAR_FEATURE_PLACEMENT_CONTROLS = Object.freeze([
  Object.freeze({ featureKey: 'hair', labelKey: 'avatarHair', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
  Object.freeze({ featureKey: 'eyes', labelKey: 'avatarEyes', fields: Object.freeze(['size', 'offsetX', 'offsetY', 'spacing']) }),
  Object.freeze({ featureKey: 'brows', labelKey: 'avatarBrows', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
  Object.freeze({ featureKey: 'nose', labelKey: 'avatarNose', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
  Object.freeze({ featureKey: 'mouth', labelKey: 'avatarMouth', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
  Object.freeze({ featureKey: 'ears', labelKey: 'avatarEars', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
]);

function getElement(id) {
  return document.getElementById(id);
}

function getSelectedAvatarGroup() {
  const selected = state.selectedMesh;
  if (!selected?.isGroup) return null;
  return selected.userData?.avatarRecipe ? selected : null;
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((entry) => disposeMaterial(entry));
    return;
  }
  material.dispose?.();
}

function disposeObject3D(object3D) {
  if (!object3D) return;
  object3D.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    disposeMaterial(node.material);
  });
}

function clearPreviewGroup() {
  if (!avatarForgeState.previewGroup || !avatarForgeState.previewScene) return;
  avatarForgeState.previewScene.remove(avatarForgeState.previewGroup);
  disposeObject3D(avatarForgeState.previewGroup);
  avatarForgeState.previewGroup = null;
  renderPreviewEmptyState();
}

function renderPreviewEmptyState() {
  const empty = getElement('avatar-preview-empty');
  if (!empty) return;
  empty.classList.toggle('hidden', !!avatarForgeState.previewGroup);
}

function setStatus(kind, detail = '') {
  avatarForgeState.status = { kind, detail };
  renderStatus();
}

function renderStatus() {
  const statusEl = getElement('avatar-forge-status');
  if (!statusEl) return;

  let text = '';
  let className = 'bg-zinc-950 border rounded p-3 text-[8px] leading-relaxed min-h-[64px] ';

  switch (avatarForgeState.status.kind) {
    case 'working':
      text = avatarForgeState.status.detail
        ? `${t('avatarBuildWorking')}\n${avatarForgeState.status.detail}`
        : t('avatarBuildWorking');
      className += 'border-[#ff77aa]/40 text-[#ffd0e0]';
      break;
    case 'ready':
      text = avatarForgeState.status.detail
        ? `${t('avatarBuildReady')}\n${avatarForgeState.status.detail}`
        : t('avatarBuildReady');
      className += 'border-[#00ff88]/40 text-[#9dffcb]';
      break;
    case 'error':
      text = `${t('avatarBuildError')}${avatarForgeState.status.detail || 'Unknown error'}`;
      className += 'border-red-500/60 text-red-300';
      break;
    case 'idle':
    default:
      text = t('avatarBuildIdle');
      className += 'border-zinc-700 text-zinc-400';
      break;
  }

  statusEl.textContent = text;
  statusEl.className = className;
}

function getAccessoryValue(recipe) {
  const selectedId = (recipe.accessoryIds || []).find((id) => id && id !== 'none');
  return selectedId || 'none';
}

function resolveAvatarForgeRecipe(recipe = avatarForgeState.recipe) {
  return resolveAvatarRecipe(recipe);
}

function isMoldModeRecipe(recipe = avatarForgeState.recipe) {
  return resolveAvatarForgeRecipe(recipe).headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD;
}

function buildPlacementInputId(featureKey, fieldKey) {
  return `avatar-feature-${featureKey}-${fieldKey}`;
}

function buildPlacementValueId(featureKey, fieldKey) {
  return `${buildPlacementInputId(featureKey, fieldKey)}-value`;
}

function formatPlacementValue(fieldKey, value) {
  if (fieldKey === 'size') {
    return Number(value).toFixed(2).replace(/\.?0+$/, '');
  }
  return String(Math.round(Number(value) || 0));
}

function renderFeaturePlacementControls() {
  const container = getElement('avatar-feature-controls');
  if (!container) return;

  container.innerHTML = AVATAR_FEATURE_PLACEMENT_CONTROLS.map((featureConfig) => `
    <div class="rounded border border-zinc-700 bg-zinc-950 px-3 py-2" data-feature-card="${featureConfig.featureKey}">
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
  `).join('');
}

function syncFeaturePlacementControlsFromRecipe(recipe = avatarForgeState.recipe) {
  const resolved = resolveAvatarForgeRecipe(recipe);
  const moldMode = resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD;

  AVATAR_FEATURE_PLACEMENT_CONTROLS.forEach((featureConfig) => {
    const placement = resolved.features?.[featureConfig.featureKey]?.placement || {};
    featureConfig.fields.forEach((fieldKey) => {
      const fieldConfig = AVATAR_PLACEMENT_FIELD_CONFIG[fieldKey];
      const input = getElement(buildPlacementInputId(featureConfig.featureKey, fieldKey));
      const valueEl = getElement(buildPlacementValueId(featureConfig.featureKey, fieldKey));
      const nextValue = Number.isFinite(placement[fieldKey]) ? placement[fieldKey] : fieldConfig.defaultValue;
      if (input) {
        input.value = String(nextValue);
        input.disabled = !moldMode;
      }
      if (valueEl) valueEl.textContent = formatPlacementValue(fieldKey, nextValue);
    });
  });

  const controlsRoot = getElement('avatar-feature-controls');
  if (controlsRoot) controlsRoot.classList.toggle('opacity-50', !moldMode);
}

function renderHeadModeState(recipe = avatarForgeState.recipe) {
  const resolved = resolveAvatarForgeRecipe(recipe);
  const moldMode = resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD;
  const headModeEl = getElement('avatar-head-mode');
  const noteEl = getElement('avatar-head-mode-note');
  const featureNoteEl = getElement('avatar-feature-controls-note');
  const headMoldWrap = getElement('avatar-head-mold-wrap');
  const headShapeWrap = getElement('avatar-head-shape-wrap');
  const headMoldSelect = getElement('avatar-head-mold-select');
  const headShapeSelect = getElement('avatar-head-shape-select');
  const noseWrap = getElement('avatar-nose-wrap');
  const earWrap = getElement('avatar-ear-wrap');
  const noseSelect = getElement('avatar-nose-select');
  const earSelect = getElement('avatar-ear-select');

  if (headModeEl) {
    headModeEl.textContent = t(moldMode ? 'avatarMoldMode' : 'avatarLegacyMode');
    headModeEl.className = moldMode
      ? 'text-[10px] text-[#9dffcb]'
      : 'text-[10px] text-[#ffd0a8]';
  }
  if (noteEl) noteEl.textContent = t(moldMode ? 'avatarMoldModeNote' : 'avatarLegacyModeNote');
  if (featureNoteEl) featureNoteEl.textContent = t(moldMode ? 'avatarPlacementEnabled' : 'avatarPlacementDisabled');

  headMoldWrap?.classList.toggle('hidden', !moldMode);
  headShapeWrap?.classList.toggle('hidden', moldMode);
  noseWrap?.classList.toggle('hidden', !moldMode);
  earWrap?.classList.toggle('hidden', !moldMode);

  if (headMoldSelect) headMoldSelect.disabled = !moldMode;
  if (headShapeSelect) headShapeSelect.disabled = moldMode;
  if (noseSelect) noseSelect.disabled = !moldMode;
  if (earSelect) earSelect.disabled = !moldMode;
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

function syncFormFromRecipe() {
  const recipe = avatarForgeState.recipe;
  const resolved = resolveAvatarForgeRecipe(recipe);
  const labelInput = getElement('avatar-label-input');
  const bodySelect = getElement('avatar-body-select');
  const headMoldSelect = getElement('avatar-head-mold-select');
  const headShapeSelect = getElement('avatar-head-shape-select');
  const hairSelect = getElement('avatar-hair-select');
  const eyeSelect = getElement('avatar-eye-select');
  const browSelect = getElement('avatar-brow-select');
  const noseSelect = getElement('avatar-nose-select');
  const mouthSelect = getElement('avatar-mouth-select');
  const earSelect = getElement('avatar-ear-select');
  const accessorySelect = getElement('avatar-accessory-select');
  const paletteSelect = getElement('avatar-palette-select');

  if (labelInput) labelInput.value = resolved.recipe.label || 'Avatar';
  if (bodySelect) bodySelect.value = resolved.recipe.bodyPresetId;
  if (headMoldSelect) headMoldSelect.value = resolved.recipe.headMoldId;
  if (headShapeSelect) headShapeSelect.value = resolved.recipe.headShapeId;
  if (hairSelect) hairSelect.value = resolved.features?.hair?.presetId || resolved.recipe.hairPresetId;
  if (eyeSelect) eyeSelect.value = resolved.features?.eyes?.presetId || resolved.recipe.eyePresetId;
  if (browSelect) browSelect.value = resolved.features?.brows?.presetId || resolved.recipe.browPresetId;
  if (noseSelect) noseSelect.value = resolved.features?.nose?.presetId || '';
  if (mouthSelect) mouthSelect.value = resolved.features?.mouth?.presetId || resolved.recipe.mouthPresetId;
  if (earSelect) earSelect.value = resolved.features?.ears?.presetId || '';
  if (accessorySelect) accessorySelect.value = getAccessoryValue(resolved.recipe);
  if (paletteSelect) paletteSelect.value = resolved.recipe.paletteId;
  syncColorControlsFromRecipe(recipe);
  renderHeadModeState(recipe);
  syncFeaturePlacementControlsFromRecipe(recipe);
}

function renderCharacterSheet() {
  const sheet = getElement('avatar-sheet');
  if (!sheet) return;

  const resolved = resolveAvatarForgeRecipe(avatarForgeState.recipe);
  if (!resolved.ok) {
    sheet.textContent = 'Invalid avatar recipe';
    return;
  }

  const accessories = resolved.accessories.length > 0
    ? resolved.accessories.map((entry) => entry.label).join(', ')
    : AVATAR_ACCESSORY_PRESETS[0]?.label || 'None';

  const headModeLine = `${t('avatarHeadMode')}: ${t(
    resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD ? 'avatarMoldMode' : 'avatarLegacyMode'
  )}`;
  const headBaseLine = resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD
    ? `${t('avatarHeadBase')}: ${resolved.headMold?.label || resolved.recipe.headMoldId}`
    : `${t('avatarHeadShape')}: ${resolved.headShape?.label || resolved.recipe.headShapeId}`;
  const detachedFeatureLines = resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD
    ? [
        `${t('avatarNose')}: ${resolved.nosePreset?.label || resolved.features?.nose?.presetId || '-'}`,
        `${t('avatarEars')}: ${resolved.earPreset?.label || resolved.features?.ears?.presetId || '-'}`,
      ]
    : [];

  sheet.textContent = [
    `${t('avatarLabel')}: ${resolved.recipe.label}`,
    `${t('avatarBody')}: ${resolved.bodyPreset?.label || resolved.recipe.bodyPresetId}`,
    headModeLine,
    headBaseLine,
    `${t('avatarHair')}: ${resolved.hairPreset?.label || resolved.recipe.hairPresetId}`,
    `${t('avatarEyes')}: ${resolved.eyePreset?.label || resolved.recipe.eyePresetId}`,
    `${t('avatarBrows')}: ${resolved.browPreset?.label || resolved.recipe.browPresetId}`,
    `${t('avatarMouth')}: ${resolved.mouthPreset?.label || resolved.recipe.mouthPresetId}`,
    ...detachedFeatureLines,
    `${t('avatarAccessory')}: ${accessories}`,
    `${t('avatarPalette')}: ${resolved.palettePreset?.label || resolved.recipe.paletteId}`,
    `COLORS: skin ${resolved.palette?.skin || '-'} hair ${resolved.palette?.hair || '-'} iris ${resolved.palette?.iris || '-'}`,
    `BODY: ${resolved.palette?.bodyPrimary || '-'} / ${resolved.palette?.bodySecondary || '-'} accent ${resolved.palette?.accent || '-'}`,
  ].join('\n');
}

function renderChrome() {
  const subtitle = getElement('avatar-forge-subtitle');
  const confirmBtn = getElement('avatar-forge-confirm-btn');

  if (subtitle) {
    const subtitleKey = avatarForgeState.targetGroup ? 'avatarEditingExisting' : 'avatarNewSession';
    subtitle.dataset.i18n = subtitleKey;
    subtitle.textContent = t(subtitleKey);
  }

  if (confirmBtn) {
    const confirmKey = avatarForgeState.targetGroup ? 'avatarUpdate' : 'avatarCreate';
    confirmBtn.dataset.i18n = confirmKey;
    confirmBtn.textContent = t(confirmKey);
  }

  renderActionState();
}

function renderActionState() {
  const confirmBtn = getElement('avatar-forge-confirm-btn');
  const cancelBtn = getElement('avatar-forge-cancel-btn');
  const closeTopBtn = getElement('avatar-forge-close-top');

  if (confirmBtn) {
    confirmBtn.disabled = avatarForgeState.building || avatarForgeState.confirming;
    confirmBtn.classList.toggle('opacity-50', confirmBtn.disabled);
    confirmBtn.classList.toggle('cursor-not-allowed', confirmBtn.disabled);
  }
  if (cancelBtn) {
    cancelBtn.disabled = avatarForgeState.confirming;
    cancelBtn.classList.toggle('opacity-50', cancelBtn.disabled);
    cancelBtn.classList.toggle('cursor-not-allowed', cancelBtn.disabled);
  }
  if (closeTopBtn) {
    closeTopBtn.disabled = avatarForgeState.confirming;
    closeTopBtn.classList.toggle('opacity-50', closeTopBtn.disabled);
    closeTopBtn.classList.toggle('cursor-not-allowed', closeTopBtn.disabled);
  }
}

function populateSelect(selectId, entries, { selectedId = '', labelForEntry = null } = {}) {
  const select = getElement(selectId);
  if (!select) return;

  select.innerHTML = '';
  entries.forEach((entry) => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = labelForEntry ? labelForEntry(entry) : entry.label;
    if (entry.id === selectedId) option.selected = true;
    select.appendChild(option);
  });
}

function sortCatalogEntriesByTargetOrder(type, entries) {
  const sourceEntries = Array.isArray(entries) ? [...entries] : [];
  const targetEntries = AVATAR_STYLE_LIBRARY_TARGETS_BY_TYPE?.[type] || [];
  if (!targetEntries.length) return sourceEntries;

  const targetOrder = new Map(targetEntries.map((entry, index) => [entry.id, index]));
  return sourceEntries.sort((left, right) => {
    const leftIndex = targetOrder.has(left.id) ? targetOrder.get(left.id) : Number.MAX_SAFE_INTEGER;
    const rightIndex = targetOrder.has(right.id) ? targetOrder.get(right.id) : Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return String(left.label || left.id).localeCompare(String(right.label || right.id));
  });
}

function findBodyPreset(bodyPresetId) {
  return AVATAR_BODY_PRESETS.find((entry) => entry.id === bodyPresetId) || null;
}

function findHeadShape(headShapeId) {
  return AVATAR_HEAD_SHAPES.find((entry) => entry.id === headShapeId) || null;
}

function findNodeByName(root, targetName) {
  let match = null;
  root?.traverse?.((node) => {
    if (match) return;
    const nodeName = node.userData?.name || node.name || '';
    if (nodeName === targetName) {
      match = node;
    }
  });
  return match;
}

function computeBoundsForNames(root, names = []) {
  if (!root || !Array.isArray(names) || names.length === 0) return null;

  root.updateWorldMatrix(true, true);
  let bounds = null;
  names.forEach((name) => {
    const node = findNodeByName(root, name);
    if (!node) return;
    const nodeBounds = new THREE.Box3().setFromObject(node);
    if (nodeBounds.isEmpty()) return;
    bounds = bounds ? bounds.union(nodeBounds) : nodeBounds;
  });

  return bounds && !bounds.isEmpty() ? bounds : null;
}

function resolvePreviewFocusMode(value) {
  return value === PREVIEW_FOCUS_HEAD ? PREVIEW_FOCUS_HEAD : PREVIEW_FOCUS_FULL;
}

function setPreviewFocusMode(value) {
  avatarForgeState.previewFocusMode = resolvePreviewFocusMode(value);
}

function buildHeadSourceKey(resolved) {
  if (resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD) {
    return `${AVATAR_HEAD_BUILD_MODE_MOLD}:${resolved.headMoldId || ''}`;
  }
  return `${AVATAR_HEAD_BUILD_MODE_LEGACY}:${resolved.headShapeId || ''}`;
}

function shouldReframePreviewCamera(nextRecipe, nextFocusMode = avatarForgeState.previewFocusMode) {
  const resolvedNextFocusMode = resolvePreviewFocusMode(nextFocusMode);
  const currentFocusMode = resolvePreviewFocusMode(avatarForgeState.previewFocusMode);
  if (!avatarForgeState.previewGroup || !avatarForgeState.previewCamera || !avatarForgeState.previewControls) {
    return true;
  }
  if (resolvedNextFocusMode !== currentFocusMode) {
    return true;
  }

  const currentResolved = resolveAvatarForgeRecipe(avatarForgeState.recipe);
  const nextResolved = resolveAvatarForgeRecipe(nextRecipe);
  if (nextResolved.headBuildMode !== currentResolved.headBuildMode) {
    return true;
  }
  if (buildHeadSourceKey(nextResolved) !== buildHeadSourceKey(currentResolved)) {
    return true;
  }
  if (resolvedNextFocusMode === PREVIEW_FOCUS_FULL && nextResolved.bodyPresetId !== currentResolved.bodyPresetId) {
    return true;
  }

  return false;
}

function applyPreviewFocusVisibility(object3D, focusMode = PREVIEW_FOCUS_FULL) {
  if (!object3D?.traverse) return;

  object3D.traverse((node) => {
    node.visible = true;
  });
  void focusMode;
}

function resolveHeadShapeForBodyPreset(bodyPresetId, currentHeadShapeId) {
  const bodyPreset = findBodyPreset(bodyPresetId);
  if (!bodyPreset?.defaultHeadShapeId) return currentHeadShapeId;

  const currentHeadShape = findHeadShape(currentHeadShapeId);
  if (!currentHeadShape) return bodyPreset.defaultHeadShapeId;
  if (currentHeadShape.id === bodyPreset.defaultHeadShapeId) return currentHeadShape.id;
  if (currentHeadShape.family === bodyPreset.family) return currentHeadShape.id;

  return bodyPreset.defaultHeadShapeId;
}

function populateCatalogControls() {
  populateSelect('avatar-body-select', AVATAR_BODY_PRESETS, {
    selectedId: avatarForgeState.recipe.bodyPresetId,
    labelForEntry: (entry) => `${entry.label} / ${entry.family}`,
  });
  populateSelect('avatar-head-mold-select', AVATAR_HEAD_MOLDS, {
    selectedId: avatarForgeState.recipe.headMoldId,
  });
  populateSelect('avatar-head-shape-select', sortCatalogEntriesByTargetOrder('headShape', AVATAR_HEAD_SHAPES), {
    selectedId: avatarForgeState.recipe.headShapeId,
  });
  populateSelect('avatar-hair-select', sortCatalogEntriesByTargetOrder('hair', AVATAR_HAIR_PRESETS), {
    selectedId: avatarForgeState.recipe.hairPresetId,
  });
  populateSelect('avatar-eye-select', sortCatalogEntriesByTargetOrder('eyes', AVATAR_EYE_PRESETS), {
    selectedId: avatarForgeState.recipe.eyePresetId,
  });
  populateSelect('avatar-brow-select', sortCatalogEntriesByTargetOrder('brows', AVATAR_BROW_PRESETS), {
    selectedId: avatarForgeState.recipe.browPresetId,
  });
  populateSelect('avatar-nose-select', sortCatalogEntriesByTargetOrder('nose', AVATAR_NOSE_PRESETS), {
    selectedId: avatarForgeState.recipe.features?.nose?.presetId || '',
  });
  populateSelect('avatar-mouth-select', sortCatalogEntriesByTargetOrder('mouth', AVATAR_MOUTH_PRESETS), {
    selectedId: avatarForgeState.recipe.mouthPresetId,
  });
  populateSelect('avatar-ear-select', sortCatalogEntriesByTargetOrder('ears', AVATAR_EAR_PRESETS), {
    selectedId: avatarForgeState.recipe.features?.ears?.presetId || '',
  });
  populateSelect('avatar-accessory-select', sortCatalogEntriesByTargetOrder('accessory', AVATAR_ACCESSORY_PRESETS), {
    selectedId: getAccessoryValue(avatarForgeState.recipe),
  });
  populateSelect('avatar-palette-select', sortCatalogEntriesByTargetOrder('palette', AVATAR_PALETTES), {
    selectedId: avatarForgeState.recipe.paletteId,
  });
}

function createPreviewRuntime() {
  if (avatarForgeState.previewRenderer) return;

  const canvas = getElement('avatar-preview-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0d);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  renderer.setPixelRatio(1);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(5.5, 4.2, -7.4);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 1.7, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.15));

  const keyLight = new THREE.DirectionalLight(0xfff0d9, 1.7);
  keyLight.position.set(8, 12, 10);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x99ccff, 0.8);
  rimLight.position.set(-6, 5, -8);
  scene.add(rimLight);

  const grid = new THREE.GridHelper(20, 20, 0x4a2a36, 0x1f1f28);
  scene.add(grid);

  avatarForgeState.previewRenderer = renderer;
  avatarForgeState.previewScene = scene;
  avatarForgeState.previewCamera = camera;
  avatarForgeState.previewControls = controls;
}

function resizePreviewViewport(force = false) {
  const stage = getElement('avatar-preview-stage');
  const renderer = avatarForgeState.previewRenderer;
  const camera = avatarForgeState.previewCamera;
  if (!stage || !renderer || !camera) return;

  const width = Math.max(stage.clientWidth || 0, 1);
  const height = Math.max(stage.clientHeight || 0, 1);
  const canvas = renderer.domElement;
  const needsResize = force || canvas.width !== width || canvas.height !== height;
  if (!needsResize) return;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function resolvePreviewFocus(object3D, focusMode = PREVIEW_FOCUS_FULL) {
  if (!object3D) return { box: null, faceDirection: null };

  if (resolvePreviewFocusMode(focusMode) === PREVIEW_FOCUS_HEAD) {
    const headNames = object3D.userData?.slotMap?.[HEAD_SLOT_ID];
    const headBounds = computeBoundsForNames(object3D, headNames);
    if (headBounds) {
      headBounds.expandByVector(new THREE.Vector3(0.1, 0.08, 0.1));
      const headSize = headBounds.getSize(new THREE.Vector3());
      headBounds.min.y -= headSize.y * 0.16;
      headBounds.max.y += headSize.y * 0.02;
      const headCenter = headBounds.getCenter(new THREE.Vector3());
      const noseBounds = computeBoundsForNames(object3D, ['HEAD_NOSE']);
      const faceDirection = noseBounds
        ? noseBounds.getCenter(new THREE.Vector3()).sub(headCenter)
        : null;
      return { box: headBounds, faceDirection };
    }
  }

  const bounds = new THREE.Box3().setFromObject(object3D);
  return {
    box: bounds.isEmpty() ? null : bounds,
    faceDirection: null,
  };
}

function framePreviewCamera(object3D, { focusMode = PREVIEW_FOCUS_FULL } = {}) {
  const camera = avatarForgeState.previewCamera;
  const controls = avatarForgeState.previewControls;
  if (!camera || !controls) return;

  object3D?.updateWorldMatrix?.(true, true);
  const resolvedFocusMode = resolvePreviewFocusMode(focusMode);
  const focus = resolvePreviewFocus(object3D, resolvedFocusMode);
  const box = focus.box;
  if (!box || box.isEmpty()) {
    controls.target.set(0, 1.7, 0);
    camera.position.set(5.5, 4.2, -7.4);
    camera.lookAt(controls.target);
    controls.update();
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const focusCenter = center.clone();
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const fitHeight = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const fitWidth = fitHeight / Math.max(camera.aspect, 0.1);
  const baseDistance = Math.max(
    fitHeight,
    fitWidth,
    resolvedFocusMode === PREVIEW_FOCUS_HEAD ? 1.7 : 3.8
  );
  const distance = baseDistance * (resolvedFocusMode === PREVIEW_FOCUS_HEAD ? 1.18 : 1.45);
  if (resolvedFocusMode === PREVIEW_FOCUS_HEAD) {
    focusCenter.y += size.y * 0.08;
  }
  let offsetDirection = new THREE.Vector3(1.05, 0.72, -1.08);
  if (resolvedFocusMode === PREVIEW_FOCUS_HEAD && focus.faceDirection) {
    const frontalFaceDirection = focus.faceDirection.clone();
    frontalFaceDirection.x = 0;
    frontalFaceDirection.y = 0;
    if (frontalFaceDirection.lengthSq() > 0.0001) {
      frontalFaceDirection.normalize();
      offsetDirection = frontalFaceDirection
        .multiplyScalar(1)
        .add(new THREE.Vector3(0, 0.2, 0));
    } else {
      offsetDirection = new THREE.Vector3(0, 0.2, -1);
    }
  }
  // Full-body keeps the established three-quarter view; head focus uses a straighter frontal read.
  const offset = offsetDirection.normalize().multiplyScalar(distance);

  controls.target.copy(focusCenter);
  camera.position.copy(focusCenter).add(offset);
  camera.lookAt(focusCenter);
  const previousDamping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = previousDamping;
}

function stopPreviewLoop() {
  if (!avatarForgeState.previewFrameId) return;
  cancelAnimationFrame(avatarForgeState.previewFrameId);
  avatarForgeState.previewFrameId = null;
}

function startPreviewLoop() {
  if (avatarForgeState.previewFrameId) return;
  previewClock.reset();

  function animate(timestamp) {
    if (!avatarForgeState.open) {
      avatarForgeState.previewFrameId = null;
      return;
    }

    avatarForgeState.previewFrameId = requestAnimationFrame(animate);
    previewClock.update(timestamp);

    resizePreviewViewport();
    avatarForgeState.previewControls?.update();

    if (avatarForgeState.previewRenderer && avatarForgeState.previewScene && avatarForgeState.previewCamera) {
      avatarForgeState.previewRenderer.render(avatarForgeState.previewScene, avatarForgeState.previewCamera);
    }
  }

  avatarForgeState.previewFrameId = requestAnimationFrame(animate);
}

function schedulePreview(delay = PREVIEW_DEFAULT_DELAY) {
  if (!avatarForgeState.open) return;

  if (avatarForgeState.rebuildTimer) {
    clearTimeout(avatarForgeState.rebuildTimer);
  }

  avatarForgeState.rebuildTimer = setTimeout(() => {
    avatarForgeState.rebuildTimer = null;
    void rebuildPreview();
  }, delay);
}

async function rebuildPreview() {
  if (!avatarForgeState.open) return;

  createPreviewRuntime();
  resizePreviewViewport(true);

  const nonce = ++avatarForgeState.rebuildNonce;
  const recipe = cloneAvatarRecipe(avatarForgeState.recipe);
  avatarForgeState.building = true;
  renderActionState();
  setStatus('working');

  try {
    const previewGroup = await buildAvatarGroup(recipe);
    if (!avatarForgeState.open || nonce !== avatarForgeState.rebuildNonce) {
      disposeObject3D(previewGroup);
      return;
    }

    const shouldReframeCamera = avatarForgeState.previewCameraNeedsReframe || !avatarForgeState.previewGroup;
    clearPreviewGroup();
    avatarForgeState.previewGroup = previewGroup;
    applyPreviewFocusVisibility(previewGroup, avatarForgeState.previewFocusMode);
    avatarForgeState.previewScene?.add(previewGroup);
    if (shouldReframeCamera) {
      framePreviewCamera(previewGroup, { focusMode: avatarForgeState.previewFocusMode });
    }
    avatarForgeState.previewCameraNeedsReframe = false;
    renderPreviewEmptyState();
    setStatus('ready', previewGroup.userData?.name || recipe.label);
  } catch (error) {
    if (!avatarForgeState.open || nonce !== avatarForgeState.rebuildNonce) return;
    clearPreviewGroup();
    setStatus('error', error?.message || 'Preview build failed.');
  } finally {
    if (nonce === avatarForgeState.rebuildNonce) {
      avatarForgeState.building = false;
      renderActionState();
    }
  }
}

function updateRecipe(patch, { rebuild = true, previewFocusMode = null } = {}) {
  const nextFocusMode = previewFocusMode
    ? resolvePreviewFocusMode(previewFocusMode)
    : avatarForgeState.previewFocusMode;
  const nextRecipe = mergeAvatarRecipe(avatarForgeState.recipe, patch);
  if (rebuild) {
    avatarForgeState.previewCameraNeedsReframe = avatarForgeState.previewCameraNeedsReframe
      || shouldReframePreviewCamera(nextRecipe, nextFocusMode);
  }
  if (previewFocusMode) {
    setPreviewFocusMode(nextFocusMode);
  }
  avatarForgeState.recipe = nextRecipe;
  syncFormFromRecipe();
  renderCharacterSheet();
  renderChrome();
  if (rebuild) schedulePreview();
}

function bindFieldListeners() {
  getElement('avatar-label-input')?.addEventListener('input', (event) => {
    updateRecipe({ label: event.target.value }, { rebuild: false });
  });

  getElement('avatar-body-select')?.addEventListener('change', (event) => {
    const bodyPresetId = event.target.value;
    if (isMoldModeRecipe()) {
      updateRecipe({ bodyPresetId }, { previewFocusMode: PREVIEW_FOCUS_FULL });
      return;
    }
    updateRecipe({
      bodyPresetId,
      headShapeId: resolveHeadShapeForBodyPreset(bodyPresetId, avatarForgeState.recipe.headShapeId),
    }, { previewFocusMode: PREVIEW_FOCUS_FULL });
  });
  getElement('avatar-head-mold-select')?.addEventListener('change', (event) => {
    updateRecipe({ headMoldId: event.target.value }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-head-shape-select')?.addEventListener('change', (event) => {
    updateRecipe({ headShapeId: event.target.value }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-hair-select')?.addEventListener('change', (event) => {
    updateRecipe({ features: { hair: { presetId: event.target.value } } }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-eye-select')?.addEventListener('change', (event) => {
    updateRecipe({ features: { eyes: { presetId: event.target.value } } }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-brow-select')?.addEventListener('change', (event) => {
    updateRecipe({ features: { brows: { presetId: event.target.value } } }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-nose-select')?.addEventListener('change', (event) => {
    updateRecipe({ features: { nose: { presetId: event.target.value } } }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-mouth-select')?.addEventListener('change', (event) => {
    updateRecipe({ features: { mouth: { presetId: event.target.value } } }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-ear-select')?.addEventListener('change', (event) => {
    updateRecipe({ features: { ears: { presetId: event.target.value } } }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-accessory-select')?.addEventListener('change', (event) => {
    updateRecipe({
      accessoryIds: event.target.value === 'none' ? ['none'] : [event.target.value],
    }, { previewFocusMode: PREVIEW_FOCUS_HEAD });
  });
  getElement('avatar-palette-select')?.addEventListener('change', (event) => {
    updateRecipe({
      paletteId: event.target.value,
      colorOverrides: {},
    }, { previewFocusMode: avatarForgeState.previewFocusMode });
  });
  AVATAR_COLOR_FIELDS.forEach(({ key, inputId }) => {
    getElement(inputId)?.addEventListener('input', (event) => {
      updateRecipe({
        colorOverrides: {
          [key]: event.target.value,
        },
      }, { previewFocusMode: avatarForgeState.previewFocusMode });
    });
  });
  getElement('avatar-feature-controls')?.addEventListener('input', (event) => {
    const featureKey = event.target?.dataset?.featureKey;
    const fieldKey = event.target?.dataset?.placementField;
    if (!featureKey || !fieldKey || !isMoldModeRecipe()) return;
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

  getElement('avatar-forge-close-top')?.addEventListener('click', () => closeAvatarForge());
  getElement('avatar-forge-cancel-btn')?.addEventListener('click', () => closeAvatarForge());
  getElement('avatar-forge-confirm-btn')?.addEventListener('click', () => {
    void confirmAvatarForge();
  });
}

function moveChildToIndex(parent, child, index) {
  if (!parent || !child) return;
  const currentIndex = parent.children.indexOf(child);
  if (currentIndex === -1) return;
  const safeIndex = Math.max(0, Math.min(index, parent.children.length - 1));
  if (currentIndex === safeIndex) return;
  parent.children.splice(currentIndex, 1);
  parent.children.splice(safeIndex, 0, child);
}

function insertChildAtIndex(parent, child, index) {
  if (!parent || !child) return;
  parent.add(child);
  moveChildToIndex(parent, child, index);
}

function removeChildIfPresent(parent, child) {
  if (!parent || !child || child.parent !== parent) return;
  parent.remove(child);
}

function replaceChildAtIndex(parent, currentChild, nextChild, index) {
  if (!parent || !nextChild) return;
  removeChildIfPresent(parent, currentChild);
  insertChildAtIndex(parent, nextChild, index);
}

function syncSceneAfterMutation(selectedGroup = null) {
  if (selectedGroup) {
    selectMesh(selectedGroup);
  }
  refreshObjectList();
  updateSelectedOverlay();
  emit('scene:objects-changed');
}

async function confirmAvatarForge() {
  if (avatarForgeState.confirming || avatarForgeState.building) return;

  avatarForgeState.confirming = true;
  renderActionState();
  setStatus('working', avatarForgeState.targetGroup ? t('avatarUpdate') : t('avatarCreate'));

  try {
    const recipe = cloneAvatarRecipe(avatarForgeState.recipe);
    const targetGroup = avatarForgeState.targetGroup;
    const nextGroup = await buildAvatarGroup(recipe, targetGroup ? { targetGroup } : {});

    if (targetGroup) {
      const parent = targetGroup.parent || state.userObjects;
      const insertIndex = Math.max(parent.children.indexOf(targetGroup), 0);

      deselectAll();
      replaceChildAtIndex(parent, targetGroup, nextGroup, insertIndex);
      syncSceneAfterMutation(nextGroup);

      pushAction({
        type: t('actionUpdateAvatar'),
        undo: () => {
          deselectAll();
          replaceChildAtIndex(parent, nextGroup, targetGroup, insertIndex);
          syncSceneAfterMutation(targetGroup);
        },
        redo: () => {
          deselectAll();
          replaceChildAtIndex(parent, targetGroup, nextGroup, insertIndex);
          syncSceneAfterMutation(nextGroup);
        },
      });

      showToast(t('avatarUpdated'));
    } else {
      const parent = state.userObjects;
      const insertIndex = parent.children.length;

      deselectAll();
      insertChildAtIndex(parent, nextGroup, insertIndex);
      syncSceneAfterMutation(nextGroup);

      pushAction({
        type: t('actionCreateAvatar'),
        undo: () => {
          deselectAll();
          removeChildIfPresent(parent, nextGroup);
          refreshObjectList();
          updateSelectedOverlay();
          emit('scene:objects-changed');
        },
        redo: () => {
          deselectAll();
          insertChildAtIndex(parent, nextGroup, insertIndex);
          syncSceneAfterMutation(nextGroup);
        },
      });

      showToast(t('avatarCreated'));
    }

    closeAvatarForgeInternal();
  } catch (error) {
    setStatus('error', error?.message || 'Avatar build failed.');
  } finally {
    avatarForgeState.confirming = false;
    renderActionState();
  }
}

function closeAvatarForgeInternal() {
  avatarForgeState.open = false;
  avatarForgeState.targetGroup = null;
  avatarForgeState.previewFocusMode = PREVIEW_FOCUS_FULL;
  avatarForgeState.previewCameraNeedsReframe = true;

  if (avatarForgeState.rebuildTimer) {
    clearTimeout(avatarForgeState.rebuildTimer);
    avatarForgeState.rebuildTimer = null;
  }

  avatarForgeState.rebuildNonce += 1;
  avatarForgeState.building = false;
  avatarForgeState.confirming = false;

  stopPreviewLoop();
  clearPreviewGroup();
  getElement('avatar-forge-modal')?.classList.add('hidden');
  setStatus('idle');
  renderActionState();
}

export function initAvatarForge() {
  if (avatarForgeState.initialized) return;

  renderFeaturePlacementControls();
  bindFieldListeners();
  populateCatalogControls();
  syncFormFromRecipe();
  renderCharacterSheet();
  renderChrome();
  setStatus('idle');

  onLangChange(() => {
    renderFeaturePlacementControls();
    syncFormFromRecipe();
    renderChrome();
    renderCharacterSheet();
    renderStatus();
  });

  avatarForgeState.initialized = true;
}

export function openAvatarForge() {
  if (!avatarForgeState.initialized) initAvatarForge();

  avatarForgeState.targetGroup = getSelectedAvatarGroup();
  avatarForgeState.recipe = avatarForgeState.targetGroup
    ? cloneAvatarRecipe(avatarForgeState.targetGroup.userData.avatarRecipe)
    : createDefaultAvatarRecipe();

  avatarForgeState.open = true;
  avatarForgeState.building = false;
  avatarForgeState.confirming = false;
  avatarForgeState.previewFocusMode = PREVIEW_FOCUS_FULL;
  avatarForgeState.previewCameraNeedsReframe = true;

  populateCatalogControls();
  syncFormFromRecipe();
  renderCharacterSheet();
  renderChrome();
  createPreviewRuntime();
  resizePreviewViewport(true);
  renderPreviewEmptyState();
  setStatus('idle');

  getElement('avatar-forge-modal')?.classList.remove('hidden');
  startPreviewLoop();
  schedulePreview(40);
}

export function closeAvatarForge() {
  if (avatarForgeState.confirming) return;
  closeAvatarForgeInternal();
}

export function getAvatarForgePreviewDiagnostics() {
  const camera = avatarForgeState.previewCamera;
  const controls = avatarForgeState.previewControls;
  const cameraPosition = camera ? camera.position.toArray() : null;
  const controlTarget = controls ? controls.target.toArray() : null;
  const distanceToTarget = (camera && controls)
    ? camera.position.distanceTo(controls.target)
    : null;

  return {
    open: avatarForgeState.open,
    previewFocusMode: avatarForgeState.previewFocusMode,
    hasPreviewGroup: !!avatarForgeState.previewGroup,
    cameraPosition,
    controlTarget,
    distanceToTarget,
  };
}
