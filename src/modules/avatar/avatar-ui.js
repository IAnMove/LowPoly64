import * as THREE from 'three';
import { state } from '../shared/state.js';
import { onLangChange, t } from '../shared/i18n.js';
import { pushAction } from '../shared/undo.js';
import { showToast } from '../shared/ui-helpers.js';
import { deselectAll } from '../viewport/selection.js';
import { buildAvatarGroup } from './avatar-builder.js';
import {
  bindAvatarFormListeners,
  buildRandomAvatarRecipe,
  populateAvatarCatalogControls,
  renderAvatarCharacterSheet,
  renderFeaturePlacementControls,
  renderHeadParamControls,
  syncAvatarFormFromRecipe,
} from './avatar-form-view.js';
import {
  buildHeadSourceKey,
  collectFeatureSlabDebugNodes,
  PREVIEW_FOCUS_FULL,
  resolveFeatureAuthoringDiagnostics,
  resolveFeatureSlabDebugDiagnostics,
  resolveHeadPreviewFrontDirection,
  resolvePreviewCameraSide,
  resolvePreviewFocusMode,
  resolvePreviewHeadBounds,
  roundDiagnosticValue,
  serializeDiagnosticBox,
  serializeDiagnosticVector,
} from './avatar-preview-diagnostics.js';
import {
  createAvatarPreviewRuntime,
  frameAvatarPreviewCamera,
  resizeAvatarPreviewViewport,
} from './avatar-preview-runtime.js';
import {
  cloneAvatarRecipe,
  createDefaultAvatarRecipe,
  mergeAvatarRecipe,
  resolveAvatarRecipe,
} from './avatar-recipe.js';
import {
  insertChildAtIndex,
  removeChildIfPresent,
  replaceChildAtIndex,
  syncSceneAfterMutation,
} from './avatar-scene-mutations.js';

const PREVIEW_DEFAULT_DELAY = 160;
const FEATURE_SLAB_DEBUG_COLORS = Object.freeze({
  eye: 0x00d0ff,
  brow: 0xffcc00,
  mouth: 0xff77aa,
  default: 0xffffff,
});
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
  featureSlabDebugEnabled: false,
  featureSlabDebugOverlay: null,
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
    node.geometry?.dispose?.();
    disposeMaterial(node.material);
  });
}

function clearPreviewGroup() {
  if (!avatarForgeState.previewGroup || !avatarForgeState.previewScene) return;
  clearFeatureSlabDebugOverlay();
  avatarForgeState.previewScene.remove(avatarForgeState.previewGroup);
  disposeObject3D(avatarForgeState.previewGroup);
  avatarForgeState.previewGroup = null;
  renderPreviewEmptyState();
  renderFeatureSlabDebugPanel();
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

function resolveAvatarForgeRecipe(recipe = avatarForgeState.recipe) {
  return resolveAvatarRecipe(recipe);
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
  const randomBtn = getElement('avatar-random-btn');

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
  if (randomBtn) {
    randomBtn.disabled = avatarForgeState.building || avatarForgeState.confirming;
    randomBtn.classList.toggle('opacity-50', randomBtn.disabled);
    randomBtn.classList.toggle('cursor-not-allowed', randomBtn.disabled);
  }
}

function syncFeatureSlabDebugToggle() {
  const input = getElement('avatar-feature-slab-debug-toggle');
  if (input) input.checked = avatarForgeState.featureSlabDebugEnabled;
}

function clearFeatureSlabDebugOverlay() {
  if (!avatarForgeState.featureSlabDebugOverlay || !avatarForgeState.previewScene) return;
  avatarForgeState.previewScene.remove(avatarForgeState.featureSlabDebugOverlay);
  disposeObject3D(avatarForgeState.featureSlabDebugOverlay);
  avatarForgeState.featureSlabDebugOverlay = null;
}

function makeFeatureSlabDepthLine(box, color) {
  const center = box.getCenter(new THREE.Vector3());
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(center.x, center.y, box.min.z),
    new THREE.Vector3(center.x, center.y, box.max.z),
  ]);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 1001;
  return line;
}

function updateFeatureSlabDebugOverlay() {
  clearFeatureSlabDebugOverlay();
  if (
    !avatarForgeState.featureSlabDebugEnabled
    || !avatarForgeState.previewScene
    || !avatarForgeState.previewGroup
  ) {
    return;
  }

  avatarForgeState.previewGroup.updateWorldMatrix(true, true);
  const overlay = new THREE.Group();
  overlay.name = 'FEATURE_SLAB_DEBUG_OVERLAY';
  overlay.userData.isAvatarFeatureSlabDebugOverlay = true;

  collectFeatureSlabDebugNodes(avatarForgeState.previewGroup).forEach((node) => {
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) return;
    const kind = node.userData?.featureSlab?.kind || 'default';
    const color = FEATURE_SLAB_DEBUG_COLORS[kind] || FEATURE_SLAB_DEBUG_COLORS.default;
    const helper = new THREE.Box3Helper(box, color);
    helper.name = `${node.userData?.name || node.name || 'SLAB'}_DEBUG_BOX`;
    helper.material.transparent = true;
    helper.material.opacity = 0.92;
    helper.material.depthTest = false;
    helper.renderOrder = 1000;
    overlay.add(helper);
    overlay.add(makeFeatureSlabDepthLine(box, color));
  });

  avatarForgeState.previewScene.add(overlay);
  avatarForgeState.featureSlabDebugOverlay = overlay;
}

function formatDebugNumber(value) {
  return Number.isFinite(value) ? value.toFixed(3) : '-';
}

function renderFeatureSlabDebugPanel() {
  const panel = getElement('avatar-feature-slab-debug-panel');
  if (!panel) return;

  if (!avatarForgeState.featureSlabDebugEnabled) {
    panel.classList.add('hidden');
    panel.textContent = '';
    return;
  }

  const diagnostics = resolveFeatureSlabDebugDiagnostics(avatarForgeState.previewGroup);
  panel.classList.remove('hidden');
  if (diagnostics.length === 0) {
    panel.textContent = 'SLAB DEBUG\nNo feature slabs';
    return;
  }

  panel.textContent = [
    'SLAB DEBUG',
    ...diagnostics.map((entry) => {
      const label = entry.name || 'SLAB';
      const protrusion = Number.isFinite(entry.frontProtrusionRatio)
        ? `${Math.round(entry.frontProtrusionRatio * 100)}%`
        : '-';
      return `${label} preset:${entry.presetId || '-'} sprite:${entry.spriteId || '-'} surfaceZ:${formatDebugNumber(entry.surfaceZ)} frontZ:${formatDebugNumber(entry.frontZ)} depth:${formatDebugNumber(entry.depth)} frontProtrusionRatio:${protrusion}`;
    }),
  ].join('\n');
}

function setFeatureSlabDebugEnabled(enabled) {
  avatarForgeState.featureSlabDebugEnabled = !!enabled;
  syncFeatureSlabDebugToggle();
  updateFeatureSlabDebugOverlay();
  renderFeatureSlabDebugPanel();
}

function setPreviewFocusMode(value) {
  avatarForgeState.previewFocusMode = resolvePreviewFocusMode(value);
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

function createPreviewRuntime() {
  if (avatarForgeState.previewRenderer) return;

  const canvas = getElement('avatar-preview-canvas');
  if (!canvas) return;

  const runtime = createAvatarPreviewRuntime(canvas);
  avatarForgeState.previewRenderer = runtime.renderer;
  avatarForgeState.previewScene = runtime.scene;
  avatarForgeState.previewCamera = runtime.camera;
  avatarForgeState.previewControls = runtime.controls;
}

function resizePreviewViewport(force = false) {
  resizeAvatarPreviewViewport(
    getElement('avatar-preview-stage'),
    avatarForgeState.previewRenderer,
    avatarForgeState.previewCamera,
    force
  );
}

function framePreviewCamera(object3D, { focusMode = PREVIEW_FOCUS_FULL } = {}) {
  frameAvatarPreviewCamera(object3D, {
    camera: avatarForgeState.previewCamera,
    controls: avatarForgeState.previewControls,
    focusMode,
  });
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
    updateFeatureSlabDebugOverlay();
    if (shouldReframeCamera) {
      framePreviewCamera(previewGroup, { focusMode: avatarForgeState.previewFocusMode });
    }
    avatarForgeState.previewCameraNeedsReframe = false;
    renderPreviewEmptyState();
    renderFeatureSlabDebugPanel();
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
  syncAvatarFormFromRecipe(avatarForgeState.recipe);
  renderAvatarCharacterSheet(avatarForgeState.recipe);
  renderChrome();
  if (rebuild) schedulePreview();
}

function randomizeAvatarForge() {
  updateRecipe(buildRandomAvatarRecipe(), { previewFocusMode: PREVIEW_FOCUS_FULL });
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
          syncSceneAfterMutation();
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
  clearFeatureSlabDebugOverlay();
  clearPreviewGroup();
  getElement('avatar-forge-modal')?.classList.add('hidden');
  setStatus('idle');
  renderActionState();
}

export function initAvatarForge() {
  if (avatarForgeState.initialized) return;

  renderFeaturePlacementControls();
  renderHeadParamControls();
  bindAvatarFormListeners({
    updateRecipe,
    randomizeAvatarForge,
    closeAvatarForge,
    confirmAvatarForge,
    getPreviewFocusMode: () => avatarForgeState.previewFocusMode,
  });
  getElement('avatar-feature-slab-debug-toggle')?.addEventListener('change', (event) => {
    setFeatureSlabDebugEnabled(event.target.checked);
  });
  populateAvatarCatalogControls(avatarForgeState.recipe);
  syncAvatarFormFromRecipe(avatarForgeState.recipe);
  renderAvatarCharacterSheet(avatarForgeState.recipe);
  renderChrome();
  syncFeatureSlabDebugToggle();
  renderFeatureSlabDebugPanel();
  setStatus('idle');

  onLangChange(() => {
    renderFeaturePlacementControls();
    renderHeadParamControls();
    populateAvatarCatalogControls(avatarForgeState.recipe);
    syncAvatarFormFromRecipe(avatarForgeState.recipe);
    renderChrome();
    renderAvatarCharacterSheet(avatarForgeState.recipe);
    syncFeatureSlabDebugToggle();
    renderFeatureSlabDebugPanel();
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

  populateAvatarCatalogControls(avatarForgeState.recipe);
  syncAvatarFormFromRecipe(avatarForgeState.recipe);
  renderAvatarCharacterSheet(avatarForgeState.recipe);
  renderChrome();
  syncFeatureSlabDebugToggle();
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
  const previewGroup = avatarForgeState.previewGroup;
  const resolved = resolveAvatarForgeRecipe(previewGroup?.userData?.avatarRecipe || avatarForgeState.recipe);
  const headBounds = resolvePreviewHeadBounds(previewGroup);
  const cameraPosition = camera ? camera.position.toArray() : null;
  const controlTarget = controls ? controls.target.toArray() : null;
  const distanceToTarget = (camera && controls)
    ? camera.position.distanceTo(controls.target)
    : null;
  const cameraOffset = (camera && controls)
    ? camera.position.clone().sub(controls.target)
    : null;

  return {
    open: avatarForgeState.open,
    previewFocusMode: avatarForgeState.previewFocusMode,
    headBuildMode: resolved.headBuildMode,
    hasPreviewGroup: !!avatarForgeState.previewGroup,
    cameraPosition,
    controlTarget,
    cameraOffset: serializeDiagnosticVector(cameraOffset),
    cameraSide: resolvePreviewCameraSide(camera, controls, previewGroup),
    distanceToTarget: Number.isFinite(distanceToTarget) ? roundDiagnosticValue(distanceToTarget) : distanceToTarget,
    headBounds: serializeDiagnosticBox(headBounds),
    featureSlabDebugEnabled: avatarForgeState.featureSlabDebugEnabled,
    featureSlabDebugOverlayCount: avatarForgeState.featureSlabDebugOverlay?.children?.length || 0,
  };
}

export function getAvatarForgeFeatureAuthoringDiagnostics(featureKey = 'eyes') {
  const previewGroup = avatarForgeState.previewGroup;
  return {
    open: avatarForgeState.open,
    hasPreviewGroup: !!previewGroup,
    previewFocusMode: avatarForgeState.previewFocusMode,
    ...resolveFeatureAuthoringDiagnostics(previewGroup, featureKey),
  };
}

export function setAvatarForgeFeatureSlabDebugEnabled(enabled) {
  setFeatureSlabDebugEnabled(enabled);
}

export function getAvatarForgeFeatureSlabDebugDiagnostics() {
  return {
    open: avatarForgeState.open,
    enabled: avatarForgeState.featureSlabDebugEnabled,
    hasPreviewGroup: !!avatarForgeState.previewGroup,
    overlayChildCount: avatarForgeState.featureSlabDebugOverlay?.children?.length || 0,
    slabs: resolveFeatureSlabDebugDiagnostics(avatarForgeState.previewGroup),
  };
}

export function setAvatarForgePreviewView(viewName = 'front') {
  const camera = avatarForgeState.previewCamera;
  const controls = avatarForgeState.previewControls;
  const previewGroup = avatarForgeState.previewGroup;
  if (!camera || !controls || !previewGroup) {
    return { ok: false, reason: 'preview unavailable' };
  }

  previewGroup.updateWorldMatrix(true, true);
  const headBounds = resolvePreviewHeadBounds(previewGroup);
  const bounds = headBounds && !headBounds.isEmpty()
    ? headBounds
    : new THREE.Box3().setFromObject(previewGroup);
  if (!bounds || bounds.isEmpty()) {
    return { ok: false, reason: 'bounds unavailable' };
  }

  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  center.y += size.y * 0.08;
  const distance = Math.max(size.x, size.y, size.z, 1) * 2.4;
  const offsets = {
    front: new THREE.Vector3(0, 0.22, 1),
    threeQuarter: new THREE.Vector3(0.72, 0.2, 0.72),
    profile: new THREE.Vector3(1, 0.16, 0),
  };
  const key = offsets[viewName] ? viewName : 'front';
  const offset = offsets[key].clone().normalize().multiplyScalar(distance);

  controls.target.copy(center);
  camera.position.copy(center).add(offset);
  camera.lookAt(center);
  controls.update();
  return {
    ok: true,
    view: key,
    cameraPosition: serializeDiagnosticVector(camera.position),
    controlTarget: serializeDiagnosticVector(controls.target),
  };
}
