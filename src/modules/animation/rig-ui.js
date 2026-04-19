// Rig/Animation UI — dual viewport panel for skeleton binding and animation preview

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from '../shared/state.js';
import { t } from '../shared/i18n.js';
import { getSkeletonsByArchetype, getSkeletonById } from './skeleton-registry.js';
import { compileAnimation } from './animation.js';
import { getSlots } from './archetype-system.js';
import { getProfileById } from './animation-profiles.js';
import { emit } from '../../event-bus.js';
import { buildBoneToTargetMap, translateAnimForMesh } from './mesh-animation-translation.js';
import { autoAssignSlotsToGroup, rebuildRigAnimationsForGroup } from './rigging-utils.js';

let rigGroup = null;
let modelRenderer = null;
let modelScene = null;
let modelCamera = null;
let modelControls = null;
let modelClone = null;
let modelViewportClickCleanup = null;
let skelViewportClickCleanup = null;

let skelRenderer = null;
let skelScene = null;
let skelCamera = null;
let skelControls = null;
let skelBoneObjects = []; // { name, sphere, node }
let skelRootNode = null; // root of the skeleton hierarchy in skelScene

let rigAnimId = null;
let rigMixerModel = null;
let rigPlaying = false;
let rigCurrentAnim = null;
let rigCurrentAnimDuration = 0;
// Manual FK skeleton animation (bypasses AnimationMixer entirely)
let rigSkelAnimDef = null;
let rigSkelAnimTime = 0;
let selectedSlot = null;
let selectedBone = null;
let currentSkeleton = null;

const BONE_GEO = new THREE.SphereGeometry(0.15, 6, 4);
const BONE_MAT = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, depthTest: false });
const BONE_LINE_MAT = new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false });
const HIGHLIGHT_COLOR = new THREE.Color(0x00ffcc);
const PIECE_CLICK_COLOR = new THREE.Color(0xff00ff);
const BONE_DEFAULT_COLOR = 0x00ffff;
const BONE_BOUND_COLOR = 0x00ffcc;
const BONE_SELECTED_COLOR = 0xffcc00;
const MODEL_VIEWPORT_DRAG_THRESHOLD_PX = 4;

function resizeRigViewport(containerId, canvasId, renderer, camera) {
  const container = document.getElementById(containerId);
  const canvas = document.getElementById(canvasId);
  if (!container || !canvas || !renderer || !camera) return false;

  const width = Math.max(container.clientWidth || 0, 1);
  const height = Math.max(container.clientHeight || 0, 1);
  const resized = canvas.width !== width || canvas.height !== height;

  if (resized) {
    canvas.width = width;
    canvas.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  return resized;
}

function frameRigCamera(camera, controls, object3D, fallbackCenter = new THREE.Vector3(0, 2, 0)) {
  if (!camera || !controls) return;

  const box = object3D ? new THREE.Box3().setFromObject(object3D) : null;
  if (!box || box.isEmpty()) {
    controls.target.copy(fallbackCenter);
    camera.position.copy(fallbackCenter).add(new THREE.Vector3(6, 5, 8));
    camera.lookAt(fallbackCenter);
    controls.update();
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const fitHeight = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const fitWidth = fitHeight / Math.max(camera.aspect, 0.1);
  const distance = Math.max(fitHeight, fitWidth, 4) * 1.35;
  const offset = new THREE.Vector3(1.1, 0.75, 1.1).normalize().multiplyScalar(distance);

  controls.target.copy(center);
  camera.position.copy(center).add(offset);
  camera.lookAt(center);
  controls.update();
}

function refreshRigViewportLayout({ frameModel = false, frameSkeleton = false } = {}) {
  const modelResized = resizeRigViewport('rig-model-viewport', 'rig-model-canvas', modelRenderer, modelCamera);
  const skeletonResized = resizeRigViewport('rig-skeleton-viewport', 'rig-skeleton-canvas', skelRenderer, skelCamera);

  if ((frameModel || modelResized) && modelClone) {
    frameRigCamera(modelCamera, modelControls, modelClone);
  }
  if ((frameSkeleton || skeletonResized) && skelRootNode) {
    frameRigCamera(skelCamera, skelControls, skelRootNode, new THREE.Vector3(0, 1.6, 0));
  }
}

function queueRigViewportLayout() {
  requestAnimationFrame(() => {
    refreshRigViewportLayout({ frameModel: true, frameSkeleton: true });
    requestAnimationFrame(() => {
      refreshRigViewportLayout({ frameModel: true, frameSkeleton: true });
    });
  });
}

export function openRigPanel(group) {
  const g = group || state.selectedMesh;
  if (!g || !g.isGroup) return;

  // If no archetype assigned yet, delegate to assign-rig modal
  if (!g.userData.archetype) {
    emit('rig:assign-requested', g);
    return;
  }

  rigGroup = g;
  if (!Array.isArray(rigGroup.userData.animations) || rigGroup.userData.animations.length === 0) {
    rebuildRigAnimationsForGroup(rigGroup);
  }
  selectedSlot = (getSlots(g.userData.archetype) || [])[0] || null;
  selectedBone = null;

  document.getElementById('rig-panel-modal').classList.remove('hidden');
  state.rigPanelOpen = true;
  state.rigPanelGroup = g;

  // Show archetype in header
  const archetypeLabel = document.getElementById('rig-archetype-label');
  if (archetypeLabel) archetypeLabel.textContent = g.userData.archetype;

  initModelViewport();
  initSkeletonViewport();
  populateSkeletonSelect();
  populateBindings();
  populateAnimations();
  refreshRigHighlights();
  startRigRenderLoop();
  queueRigViewportLayout();
}

function syncRigAnimations() {
  if (!rigGroup) return;
  rebuildRigAnimationsForGroup(rigGroup, {
    skeletonId: currentSkeleton?.id || rigGroup.userData?.skeletonId || null,
  });
}

export function rigAutoBind() {
  if (!rigGroup?.isGroup) return;
  rigGroup.userData.slotMap = autoAssignSlotsToGroup(rigGroup, rigGroup.userData.archetype);
  syncRigAnimations();
  refreshRigHighlights();
  populateBindings();
  populateAnimations();
}

export function closeRigPanel() {
  stopRigAnim();
  document.getElementById('rig-panel-modal').classList.add('hidden');
  state.rigPanelOpen = false;
  state.rigPanelGroup = null;

  cleanupModelViewportClick();
  cleanupSkeletonViewportClick();
  if (modelRenderer) { modelRenderer.dispose(); modelRenderer = null; }
  if (skelRenderer) { skelRenderer.dispose(); skelRenderer = null; }
  if (modelControls) { modelControls.dispose(); modelControls = null; }
  if (skelControls) { skelControls.dispose(); skelControls = null; }
  if (rigAnimId) { cancelAnimationFrame(rigAnimId); rigAnimId = null; }

  modelScene = null;
  modelCamera = null;
  modelClone = null;
  skelScene = null;
  skelCamera = null;
  skelBoneObjects = [];
  skelRootNode = null;
  rigGroup = null;
  selectedSlot = null;
  selectedBone = null;
  currentSkeleton = null;
}

function initModelViewport() {
  const container = document.getElementById('rig-model-viewport');
  const canvas = document.getElementById('rig-model-canvas');
  const w = container.clientWidth;
  const h = container.clientHeight;

  canvas.width = w;
  canvas.height = h;

  modelScene = new THREE.Scene();
  modelScene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffeecc, 1.2);
  dir.position.set(15, 25, 10);
  modelScene.add(dir);

  const grid = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
  modelScene.add(grid);

  modelCamera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
  modelCamera.position.set(8, 6, 10);

  modelRenderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  modelRenderer.setSize(w, h);

  modelControls = new OrbitControls(modelCamera, canvas);
  modelControls.enableDamping = true;

  // Clone the model group into this scene
  modelClone = rigGroup.clone(true);
  modelScene.add(modelClone);

  setupModelViewportClick(canvas);
  refreshRigViewportLayout({ frameModel: true });
}

function cleanupModelViewportClick() {
  if (!modelViewportClickCleanup) return;
  modelViewportClickCleanup();
  modelViewportClickCleanup = null;
}

function cleanupSkeletonViewportClick() {
  if (!skelViewportClickCleanup) return;
  skelViewportClickCleanup();
  skelViewportClickCleanup = null;
}

// Raycaster: click on model viewport to assign/unassign piece to selected slot
function setupModelViewportClick(canvas) {
  cleanupModelViewportClick();

  const raycaster = new THREE.Raycaster();
  const pointerState = {
    pointerId: null,
    startX: 0,
    startY: 0,
    dragged: false,
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    pointerState.pointerId = e.pointerId;
    pointerState.startX = e.clientX;
    pointerState.startY = e.clientY;
    pointerState.dragged = false;
  };

  const onPointerMove = (e) => {
    if (pointerState.pointerId !== e.pointerId) return;

    const dx = e.clientX - pointerState.startX;
    const dy = e.clientY - pointerState.startY;
    if ((dx * dx) + (dy * dy) >= (MODEL_VIEWPORT_DRAG_THRESHOLD_PX * MODEL_VIEWPORT_DRAG_THRESHOLD_PX)) {
      pointerState.dragged = true;
    }
  };

  const onPointerEnd = (e) => {
    if (pointerState.pointerId === e.pointerId) {
      pointerState.pointerId = null;
    }
  };

  const onClick = (e) => {
    const wasDragged = pointerState.dragged;
    pointerState.pointerId = null;
    pointerState.dragged = false;

    if (wasDragged || !selectedSlot || !modelClone || !modelCamera || !rigGroup) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera({ x, y }, modelCamera);

    const meshes = [];
    modelClone.traverse((c) => { if (c.isMesh) meshes.push(c); });
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return;

    // Walk up to find a named piece
    let obj = hits[0].object;
    let pieceName = null;
    while (obj && obj !== modelClone) {
      const n = obj.userData.name || (obj.isGroup ? obj.name : '');
      if (n) { pieceName = n; break; }
      obj = obj.parent;
    }
    if (!pieceName) return;

    // Toggle assignment
    if (!rigGroup.userData.slotMap) rigGroup.userData.slotMap = {};
    const current = rigGroup.userData.slotMap[selectedSlot] || [];
    if (current.includes(pieceName)) {
      rigGroup.userData.slotMap[selectedSlot] = current.filter((p) => p !== pieceName);
    } else {
      rigGroup.userData.slotMap[selectedSlot] = [...current, pieceName];
    }

    refreshRigHighlights();
    syncRigAnimations();
    populateBindings();
    populateAnimations();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  canvas.addEventListener('click', onClick);

  modelViewportClickCleanup = () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerEnd);
    canvas.removeEventListener('pointercancel', onPointerEnd);
    canvas.removeEventListener('click', onClick);
    pointerState.pointerId = null;
    pointerState.dragged = false;
  };
}

// Collect all named piece names from the rig group
function getModelPieceNames() {
  const names = new Set();
  if (!rigGroup) return [];
  rigGroup.traverse((child) => {
    if (child === rigGroup) return;
    const name = child.userData.name || (child.isGroup && child.name ? child.name : '');
    if (name) names.add(name);
  });
  return [...names];
}

function initSkeletonViewport() {
  const container = document.getElementById('rig-skeleton-viewport');
  const canvas = document.getElementById('rig-skeleton-canvas');
  const w = container.clientWidth;
  const h = container.clientHeight;

  canvas.width = w;
  canvas.height = h;

  skelScene = new THREE.Scene();
  skelScene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const grid = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
  skelScene.add(grid);

  skelCamera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
  skelCamera.position.set(8, 6, 10);

  skelRenderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  skelRenderer.setSize(w, h);

  skelControls = new OrbitControls(skelCamera, canvas);
  skelControls.enableDamping = true;
  setupSkeletonViewportClick(canvas);
  // Skeleton is loaded after populateSkeletonSelect() sets currentSkeleton
  refreshRigViewportLayout({ frameSkeleton: true });
}

function setupSkeletonViewportClick(canvas) {
  cleanupSkeletonViewportClick();

  const raycaster = new THREE.Raycaster();
  const pointerState = {
    pointerId: null,
    startX: 0,
    startY: 0,
    dragged: false,
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    pointerState.pointerId = e.pointerId;
    pointerState.startX = e.clientX;
    pointerState.startY = e.clientY;
    pointerState.dragged = false;
  };

  const onPointerMove = (e) => {
    if (pointerState.pointerId !== e.pointerId) return;
    const dx = e.clientX - pointerState.startX;
    const dy = e.clientY - pointerState.startY;
    if ((dx * dx) + (dy * dy) >= (MODEL_VIEWPORT_DRAG_THRESHOLD_PX * MODEL_VIEWPORT_DRAG_THRESHOLD_PX)) {
      pointerState.dragged = true;
    }
  };

  const onPointerEnd = (e) => {
    if (pointerState.pointerId === e.pointerId) {
      pointerState.pointerId = null;
    }
  };

  const onClick = (e) => {
    const wasDragged = pointerState.dragged;
    pointerState.pointerId = null;
    pointerState.dragged = false;

    if (wasDragged || !skelCamera || skelBoneObjects.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera({ x, y }, skelCamera);
    const spheres = skelBoneObjects.map(({ sphere }) => sphere);
    const hits = raycaster.intersectObjects(spheres, false);
    if (hits.length === 0) return;

    selectedBone = hits[0].object?.parent?.userData?.name || hits[0].object?.name || null;
    refreshRigHighlights();
    populateBindings();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  canvas.addEventListener('click', onClick);

  skelViewportClickCleanup = () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerEnd);
    canvas.removeEventListener('pointercancel', onPointerEnd);
    canvas.removeEventListener('click', onClick);
    pointerState.pointerId = null;
    pointerState.dragged = false;
  };
}

function loadSkeletonIntoViewport() {
  // Remove previous skeleton hierarchy
  if (skelRootNode) { skelScene.remove(skelRootNode); skelRootNode = null; }
  skelBoneObjects = [];

  if (!currentSkeleton || !currentSkeleton.bones) return;

  const boneNodes = {}; // name → THREE.Group

  // Create a node per bone (local position relative to parent)
  for (const bone of currentSkeleton.bones) {
    const node = new THREE.Group();
    node.name = bone.name;
    node.userData.name = bone.name;
    node.position.set(bone.position[0], bone.position[1], bone.position[2]);

    // Sphere at the bone's origin
    const sphere = new THREE.Mesh(BONE_GEO, BONE_MAT.clone());
    sphere.renderOrder = 999;
    node.add(sphere);

    boneNodes[bone.name] = node;
    skelBoneObjects.push({ name: bone.name, sphere, node });
  }

  // Build hierarchy; for each child add a stick line on the parent node
  let rootNode = null;
  for (const bone of currentSkeleton.bones) {
    const node = boneNodes[bone.name];
    if (bone.parent && boneNodes[bone.parent]) {
      const parentNode = boneNodes[bone.parent];
      // Line lives on the parent so it follows parent rotation automatically
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(bone.position[0], bone.position[1], bone.position[2]),
      ]);
      const line = new THREE.Line(geo, BONE_LINE_MAT);
      line.renderOrder = 999;
      parentNode.add(line);
      parentNode.add(node);
    } else {
      rootNode = node;
    }
  }

  if (rootNode) {
    skelScene.add(rootNode);
    skelRootNode = rootNode;
  }

  refreshRigViewportLayout({ frameSkeleton: true });
  refreshRigHighlights();
}

function populateSkeletonSelect() {
  const select = document.getElementById('rig-skeleton-select');
  select.innerHTML = '';

  const archetype = rigGroup.userData.archetype;
  const skeletons = getSkeletonsByArchetype(archetype);

  if (skeletons.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = t('rigNoSkeleton');
    select.appendChild(opt);
    currentSkeleton = null;
    return;
  }

  const currentId = rigGroup.userData.skeletonId;
  skeletons.forEach((skel) => {
    const opt = document.createElement('option');
    opt.value = skel.id;
    opt.textContent = skel.id;
    if (skel.id === currentId) opt.selected = true;
    select.appendChild(opt);
  });

  currentSkeleton = getSkeletonById(select.value) || skeletons[0];
  loadSkeletonIntoViewport();
  refreshRigHighlights();

  select.onchange = () => {
    currentSkeleton = getSkeletonById(select.value);
    rigGroup.userData.skeletonId = select.value;
    if (selectedBone && !currentSkeleton?.bones?.some((bone) => bone.name === selectedBone)) {
      selectedBone = null;
    }
    if (currentSkeleton && currentSkeleton.defaultBindings) {
      rigGroup.userData.slotBindings = { ...currentSkeleton.defaultBindings };
    }
    syncRigAnimations();
    loadSkeletonIntoViewport();
    populateBindings();
    populateAnimations();
    refreshRigHighlights();
  };
}

function populateBindings() {
  const container = document.getElementById('rig-binding-table');
  container.innerHTML = '';

  if (!rigGroup || !rigGroup.userData.archetype) return;

  const slotMap = rigGroup.userData.slotMap || {};
  const bindings = getActiveBindings();

  const archetype = rigGroup.userData.archetype;
  const slots = getSlots(archetype) || Object.keys(slotMap);

  const allBones = currentSkeleton ? currentSkeleton.bones.map((b) => b.name) : [];
  const allPieces = getModelPieceNames();

  slots.forEach((slotId) => {
    const isSelected = selectedSlot === slotId;
    const slotPieces = slotMap[slotId] || [];
    const slotBones = bindings[slotId] || [];

    const row = document.createElement('div');
    row.className = `px-1 py-1 cursor-pointer hover:bg-zinc-800 rounded ${isSelected ? 'bg-zinc-700 border border-zinc-600' : ''}`;

    // Header: slot label + piece count + bone summary
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2';

    const label = document.createElement('span');
    label.className = 'text-[#ffcc00] w-24 flex-shrink-0 text-[10px]';
    label.textContent = slotId;

    const pieceBadge = document.createElement('span');
    pieceBadge.className = `text-[9px] flex-shrink-0 px-1 rounded ${slotPieces.length ? 'text-[#ff00ff]' : 'text-zinc-600'}`;
    pieceBadge.textContent = slotPieces.length ? `${slotPieces.length}p` : '0p';

    const sep = document.createElement('span');
    sep.className = 'text-zinc-600 text-[9px]';
    sep.textContent = '→';

    const boneSummary = document.createElement('span');
    boneSummary.className = 'text-zinc-400 flex-1 truncate text-[9px]';
    boneSummary.textContent = slotBones.join(', ') || '—';

    header.appendChild(label);
    header.appendChild(pieceBadge);
    header.appendChild(sep);
    header.appendChild(boneSummary);
    row.appendChild(header);

    if (isSelected) {
      // ── PIEZAS section ──────────────────────────────
      const pieceSection = document.createElement('div');
      pieceSection.className = 'mt-2 ml-1';

      const pieceTitle = document.createElement('div');
      pieceTitle.className = 'text-[#ff00ff] text-[9px] mb-1 flex items-center gap-2';
      pieceTitle.textContent = 'PIEZAS DEL MODELO';
      if (selectedSlot) {
        const hint = document.createElement('span');
        hint.className = 'text-zinc-600 text-[9px]';
        hint.textContent = '← click en 3D para asignar';
        pieceTitle.appendChild(hint);
      }
      pieceSection.appendChild(pieceTitle);

      if (allPieces.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'text-zinc-600 text-[9px]';
        empty.textContent = '(sin piezas detectadas)';
        pieceSection.appendChild(empty);
      } else {
        const pieceWrap = document.createElement('div');
        pieceWrap.className = 'flex flex-wrap gap-x-3 gap-y-1 mb-2';

        allPieces.forEach((pieceName) => {
          const checked = slotPieces.includes(pieceName);
          const itemEl = document.createElement('label');
          itemEl.className = 'flex items-center gap-1 text-[9px] cursor-pointer select-none ' + (checked ? 'text-[#ff00ff]' : 'text-zinc-400');

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = checked;
          cb.className = 'accent-[#ff00ff]';
          cb.addEventListener('change', (e) => {
            e.stopPropagation();
            if (!rigGroup.userData.slotMap) rigGroup.userData.slotMap = {};
            const current = rigGroup.userData.slotMap[slotId] || [];
            if (cb.checked) {
              if (!current.includes(pieceName)) rigGroup.userData.slotMap[slotId] = [...current, pieceName];
              itemEl.className = itemEl.className.replace('text-zinc-400', 'text-[#ff00ff]');
            } else {
              rigGroup.userData.slotMap[slotId] = current.filter((p) => p !== pieceName);
              itemEl.className = itemEl.className.replace('text-[#ff00ff]', 'text-zinc-400');
            }
            pieceBadge.textContent = `${(rigGroup.userData.slotMap[slotId] || []).length}p`;
            pieceBadge.className = (rigGroup.userData.slotMap[slotId] || []).length
              ? 'text-[9px] flex-shrink-0 px-1 rounded text-[#ff00ff]'
              : 'text-[9px] flex-shrink-0 px-1 rounded text-zinc-600';
            refreshRigHighlights();
            syncRigAnimations();
            populateAnimations();
          });

          itemEl.appendChild(cb);
          itemEl.appendChild(document.createTextNode(pieceName));
          pieceWrap.appendChild(itemEl);
        });
        pieceSection.appendChild(pieceWrap);
      }
      row.appendChild(pieceSection);

      // ── BONES section ──────────────────────────────
      if (allBones.length > 0) {
        const bonesSection = document.createElement('div');
        bonesSection.className = 'ml-1 mt-1 mb-1';

        const bonesTitle = document.createElement('div');
        bonesTitle.className = 'text-[#00ffcc] text-[9px] mb-1';
        bonesTitle.textContent = 'BONES DEL ESQUELETO';
        bonesSection.appendChild(bonesTitle);

        const boneWrap = document.createElement('div');
        boneWrap.className = 'flex flex-wrap gap-x-3 gap-y-1';

        allBones.forEach((boneName) => {
          const checked = slotBones.includes(boneName);
          const isBoneSelected = selectedBone === boneName;
          const itemEl = document.createElement('label');
          itemEl.className = `flex items-center gap-1 text-[9px] cursor-pointer select-none ${checked ? 'text-[#00ffcc]' : 'text-zinc-400'} ${isBoneSelected ? 'ring-1 ring-[#ffcc00] rounded px-1' : ''}`;

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = checked;
          cb.className = 'accent-[#ffcc00]';
          cb.addEventListener('change', (e) => {
            e.stopPropagation();
            if (!rigGroup.userData.slotBindings) rigGroup.userData.slotBindings = { ...bindings };
            const current = rigGroup.userData.slotBindings[slotId] || [];
            if (cb.checked) {
              if (!current.includes(boneName)) rigGroup.userData.slotBindings[slotId] = [...current, boneName];
              itemEl.className = itemEl.className.replace('text-zinc-400', 'text-[#00ffcc]');
            } else {
              rigGroup.userData.slotBindings[slotId] = current.filter((b) => b !== boneName);
              itemEl.className = itemEl.className.replace('text-[#00ffcc]', 'text-zinc-400');
            }
            refreshRigHighlights();
            boneSummary.textContent = (rigGroup.userData.slotBindings[slotId] || []).join(', ') || '—';
            syncRigAnimations();
            populateAnimations();
          });

          itemEl.appendChild(cb);
          const textEl = document.createElement('span');
          textEl.textContent = boneName;
          if (isBoneSelected) {
            textEl.className = 'text-[#ffcc00]';
          }
          textEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedBone = boneName;
            refreshRigHighlights();
            populateBindings();
          });
          itemEl.appendChild(textEl);
          boneWrap.appendChild(itemEl);
        });
        bonesSection.appendChild(boneWrap);
        row.appendChild(bonesSection);
      }
    }

    container.appendChild(row);

    header.addEventListener('click', () => {
      selectedSlot = slotId;
      refreshRigHighlights();
      populateBindings();
    });
  });
}

function getActiveBindings() {
  return rigGroup?.userData?.slotBindings || (currentSkeleton ? currentSkeleton.defaultBindings : {}) || {};
}

function getHighlightPulse() {
  if (!rigPlaying) return 1;
  return 1 + (Math.sin(performance.now() / 150) * 0.12);
}

function refreshRigHighlights() {
  highlightSlotPieces(selectedSlot);
  highlightBoundBones(selectedSlot, getActiveBindings());
}

function highlightSlotPieces(slotId) {
  if (!modelClone) return;
  const slotMap = rigGroup.userData.slotMap || {};
  const names = slotMap[slotId] || [];
  const intensity = 0.45 * getHighlightPulse();

  // Reset all
  modelClone.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.emissive?.set(0x000000);
      if (child.material.emissiveIntensity !== undefined) child.material.emissiveIntensity = 0;
    }
  });

  // Highlight pieces in this slot
  modelClone.traverse((child) => {
    const name = child.userData.name || child.name;
    if (!names.includes(name)) return;

    if (child.isMesh && child.material && child.material.emissive) {
      child.material.emissive.copy(HIGHLIGHT_COLOR);
      child.material.emissiveIntensity = intensity;
    }
    if (child.userData.isPivot) {
      const mesh = child.children.find((c) => c.isMesh);
      if (mesh && mesh.material && mesh.material.emissive) {
        mesh.material.emissive.copy(HIGHLIGHT_COLOR);
        mesh.material.emissiveIntensity = intensity;
      }
    }
  });
}

function highlightBoundBones(slotId, bindings) {
  const boundNames = new Set(bindings?.[slotId] || []);
  const pulse = getHighlightPulse();
  skelBoneObjects.forEach(({ name, sphere }) => {
    let color = BONE_DEFAULT_COLOR;
    let scale = 1;

    if (boundNames.has(name)) {
      color = BONE_BOUND_COLOR;
      scale = 1.08 * pulse;
    }
    if (selectedBone === name) {
      color = BONE_SELECTED_COLOR;
      scale = 1.3 * pulse;
    }

    sphere.material.color.setHex(color);
    sphere.scale.setScalar(scale);
  });
}

function populateAnimations() {
  const container = document.getElementById('rig-anim-list');
  const controls = document.getElementById('rig-anim-controls');
  container.innerHTML = '';

  if (!currentSkeleton || !currentSkeleton.animations) {
    controls.classList.add('hidden');
    return;
  }

  const profileAnims = rigGroup.userData.animationProfile
    ? getProfileAnimNames()
    : null;

  const anims = profileAnims
    ? currentSkeleton.animations.filter((a) => profileAnims.includes(a.name))
    : currentSkeleton.animations;

  if (anims.length === 0) {
    controls.classList.add('hidden');
    return;
  }

  controls.classList.remove('hidden');

  anims.forEach((anim) => {
    const btn = document.createElement('button');
    btn.className = `w-full text-left px-2 py-1 hover:bg-zinc-800 rounded ${rigCurrentAnim === anim.name ? 'bg-zinc-700 text-[#00ff88]' : 'text-zinc-300'}`;
    btn.textContent = anim.name;
    btn.onclick = () => {
      rigCurrentAnim = anim.name;
      playRigAnim(anim);
      populateAnimations();
    };
    container.appendChild(btn);
  });
}

function getProfileAnimNames() {
  try {
    const profile = getProfileById(rigGroup.userData.animationProfile);
    return profile ? profile.animations : null;
  } catch (_) {
    return null;
  }
}

// Build a map: bone_name → primary piece name in the mesh
function playRigAnim(animDef) {
  stopRigAnim();
  rigCurrentAnim = animDef?.name || null;

  // Compile for mesh (left viewport) — translate bone tracks → piece tracks
  if (modelClone) {
    const boneToTarget = buildBoneToTargetMap(
      rigGroup,
      rigGroup.userData.slotMap,
      rigGroup.userData.slotBindings
    );
    const meshAnimDef = translateAnimForMesh(animDef, modelClone, boneToTarget);
    if (meshAnimDef) {
      const clip = compileAnimation(meshAnimDef, modelClone);
      if (clip) {
        rigMixerModel = new THREE.AnimationMixer(modelClone);
        const action = rigMixerModel.clipAction(clip);
        action.setLoop(animDef.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.play();
      }
    }
  }

  // Skeleton: manual FK — no AnimationMixer, direct property writes per frame
  rigSkelAnimDef = animDef;
  rigSkelAnimTime = 0;
  resetBoneTransforms();

  rigPlaying = true;
  rigCurrentAnimDuration = animDef.duration || 1;
}

// Linear interpolation between two keyframe values
function lerpTrack(track, time) {
  const kfs = track.keyframes;
  if (!kfs || kfs.length === 0) return null;
  if (kfs.length === 1) return [...kfs[0].value];
  const first = kfs[0].time, last = kfs[kfs.length - 1].time;
  if (time <= first) return [...kfs[0].value];
  if (time >= last) return [...kfs[kfs.length - 1].value];
  let i = 0;
  while (i < kfs.length - 2 && kfs[i + 1].time <= time) i++;
  const a = kfs[i], b = kfs[i + 1];
  const t = (time - a.time) / (b.time - a.time);
  return a.value.map((v, j) => v + (b.value[j] - v) * t);
}

// Apply one frame of a skeleton animation to the bone nodes
function applySkelAnimFrame(animDef, time) {
  for (const track of animDef.tracks || []) {
    const entry = skelBoneObjects.find((b) => b.name === track.target);
    if (!entry) continue;
    const v = lerpTrack(track, time);
    if (!v) continue;
    if (track.property === 'position') entry.node.position.set(v[0], v[1], v[2]);
    else if (track.property === 'rotation') entry.node.rotation.set(v[0], v[1], v[2]);
    else if (track.property === 'scale') entry.node.scale.set(v[0], v[1], v[2]);
  }
}

// Reset all bone nodes to their skeleton rest pose
function resetBoneTransforms() {
  if (!currentSkeleton) return;
  for (const { name, node } of skelBoneObjects) {
    const boneDef = currentSkeleton.bones.find((b) => b.name === name);
    if (boneDef) node.position.set(boneDef.position[0], boneDef.position[1], boneDef.position[2]);
    node.rotation.set(0, 0, 0);
    node.scale.set(1, 1, 1);
  }
}

function stopRigAnim() {
  if (rigMixerModel) { rigMixerModel.stopAllAction(); rigMixerModel = null; }
  rigSkelAnimDef = null;
  rigSkelAnimTime = 0;
  resetBoneTransforms();
  rigPlaying = false;
  rigCurrentAnim = null;
  refreshRigHighlights();
  const progress = document.getElementById('rig-anim-progress');
  if (progress) progress.style.width = '0%';
}

export function rigTogglePlay() {
  if (rigPlaying) {
    stopRigAnim();
    populateAnimations();
  }
}

export function rigStopAnim() {
  stopRigAnim();
  populateAnimations();
}

const rigClock = new THREE.Timer();
if (typeof document !== 'undefined') {
  rigClock.connect(document);
}

function startRigRenderLoop() {
  rigClock.reset();

  function animate(timestamp) {
    if (!state.rigPanelOpen) return;
    rigAnimId = requestAnimationFrame(animate);

    rigClock.update(timestamp);
    const delta = rigClock.getDelta();

    if (rigPlaying) {
      if (rigMixerModel) rigMixerModel.update(delta);

      // Manual FK skeleton update
      if (rigSkelAnimDef) {
        const dur = rigSkelAnimDef.duration || 1;
        rigSkelAnimTime += delta;
        if (rigSkelAnimDef.loop !== false) rigSkelAnimTime = rigSkelAnimTime % dur;
        else rigSkelAnimTime = Math.min(rigSkelAnimTime, dur);
        applySkelAnimFrame(rigSkelAnimDef, rigSkelAnimTime);
      }

      // Progress bar (driven by skeleton time, or model mixer if skel not active)
      const animTime = rigSkelAnimDef ? rigSkelAnimTime : (rigMixerModel ? rigMixerModel.time : 0);
      if (rigCurrentAnimDuration > 0) {
        const pct = ((animTime % rigCurrentAnimDuration) / rigCurrentAnimDuration) * 100;
        const bar = document.getElementById('rig-anim-progress');
        if (bar) bar.style.width = `${pct}%`;
      }

      refreshRigHighlights();
    }

    if (modelControls) modelControls.update();
    if (skelControls) skelControls.update();
    refreshRigViewportLayout();

    if (modelRenderer && modelScene && modelCamera) {
      modelRenderer.render(modelScene, modelCamera);
    }
    if (skelRenderer && skelScene && skelCamera) {
      skelRenderer.render(skelScene, skelCamera);
    }
  }
  animate();
}

export function selectRigSlot(slotId) {
  if (!rigGroup?.userData?.archetype) return false;
  const slots = getSlots(rigGroup.userData.archetype) || [];
  if (!slots.includes(slotId)) return false;
  selectedSlot = slotId;
  refreshRigHighlights();
  populateBindings();
  return true;
}

export function selectRigBone(boneName) {
  if (!skelBoneObjects.some((entry) => entry.name === boneName)) return false;
  selectedBone = boneName;
  refreshRigHighlights();
  populateBindings();
  return true;
}

export function getRigPanelDiagnostics() {
  const selectedBoneEntry = skelBoneObjects.find((entry) => entry.name === selectedBone) || null;
  const selectedBoneWorldPosition = selectedBoneEntry
    ? selectedBoneEntry.node.getWorldPosition(new THREE.Vector3()).toArray().map((value) => Number(value.toFixed(4)))
    : null;
  const highlightedPieceNames = rigGroup?.userData?.slotMap?.[selectedSlot] || [];
  const highlightedPieceWorldPositions = highlightedPieceNames.map((pieceName) => {
    let worldCenter = null;
    modelClone?.traverse((child) => {
      if (worldCenter || !child.isObject3D) return;
      const childName = child.userData?.name || child.name;
      if (childName !== pieceName) return;
      const box = new THREE.Box3().setFromObject(child);
      if (!box.isEmpty()) {
        worldCenter = box.getCenter(new THREE.Vector3()).toArray().map((value) => Number(value.toFixed(4)));
      }
    });
    return { name: pieceName, center: worldCenter };
  });

  return {
    open: state.rigPanelOpen,
    selectedSlot,
    selectedBone,
    highlightedPieceNames,
    highlightedPieceWorldPositions,
    highlightedBoneNames: getActiveBindings()?.[selectedSlot] || [],
    selectedBoneWorldPosition,
    selectedBoneColor: selectedBoneEntry ? selectedBoneEntry.sphere.material.color.getHexString() : null,
    selectedBoneScale: selectedBoneEntry ? Number(selectedBoneEntry.sphere.scale.x.toFixed(4)) : null,
    currentAnimation: rigCurrentAnim,
    playing: rigPlaying,
  };
}
