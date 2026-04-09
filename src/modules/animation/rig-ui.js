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

let rigGroup = null;
let modelRenderer = null;
let modelScene = null;
let modelCamera = null;
let modelControls = null;
let modelClone = null;

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
let currentSkeleton = null;

const BONE_GEO = new THREE.SphereGeometry(0.15, 6, 4);
const BONE_MAT = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, depthTest: false });
const BONE_MAT_HIGHLIGHT = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, depthTest: false });
const BONE_LINE_MAT = new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false });
const HIGHLIGHT_COLOR = new THREE.Color(0x00ffcc);
const PIECE_CLICK_COLOR = new THREE.Color(0xff00ff);

export function openRigPanel(group) {
  const g = group || state.selectedMesh;
  if (!g || !g.isGroup) return;

  // If no archetype assigned yet, delegate to assign-rig modal
  if (!g.userData.archetype) {
    emit('rig:assign-requested', g);
    return;
  }

  rigGroup = g;

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
  startRigRenderLoop();
}

export function closeRigPanel() {
  stopRigAnim();
  document.getElementById('rig-panel-modal').classList.add('hidden');
  state.rigPanelOpen = false;
  state.rigPanelGroup = null;

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
}

// Raycaster: click on model viewport to assign/unassign piece to selected slot
function setupModelViewportClick(canvas) {
  const raycaster = new THREE.Raycaster();

  canvas.addEventListener('click', (e) => {
    if (!selectedSlot || !modelClone || !modelCamera) return;
    // Don't fire if orbit controls just panned/rotated (small movement)
    if (modelControls && modelControls._state !== 0 /* NONE */) return;

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

    highlightSlotPieces(selectedSlot);
    populateBindings();
  });
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
  // Skeleton is loaded after populateSkeletonSelect() sets currentSkeleton
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

  select.onchange = () => {
    currentSkeleton = getSkeletonById(select.value);
    rigGroup.userData.skeletonId = select.value;
    if (currentSkeleton && currentSkeleton.defaultBindings) {
      rigGroup.userData.slotBindings = { ...currentSkeleton.defaultBindings };
    }
    loadSkeletonIntoViewport();
    populateBindings();
    populateAnimations();
  };
}

function populateBindings() {
  const container = document.getElementById('rig-binding-table');
  container.innerHTML = '';

  if (!rigGroup || !rigGroup.userData.archetype) return;

  const slotMap = rigGroup.userData.slotMap || {};
  const bindings = rigGroup.userData.slotBindings || (currentSkeleton ? currentSkeleton.defaultBindings : {}) || {};

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
            highlightSlotPieces(slotId);
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
          const itemEl = document.createElement('label');
          itemEl.className = 'flex items-center gap-1 text-[9px] cursor-pointer select-none ' + (checked ? 'text-[#00ffcc]' : 'text-zinc-400');

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
            highlightBoundBones(slotId, rigGroup.userData.slotBindings);
            boneSummary.textContent = (rigGroup.userData.slotBindings[slotId] || []).join(', ') || '—';
          });

          itemEl.appendChild(cb);
          itemEl.appendChild(document.createTextNode(boneName));
          boneWrap.appendChild(itemEl);
        });
        bonesSection.appendChild(boneWrap);
        row.appendChild(bonesSection);
      }
    }

    container.appendChild(row);

    header.addEventListener('click', () => {
      selectedSlot = slotId;
      highlightSlotPieces(slotId);
      highlightBoundBones(slotId, bindings);
      populateBindings();
    });
  });
}

function highlightSlotPieces(slotId) {
  if (!modelClone) return;
  const slotMap = rigGroup.userData.slotMap || {};
  const names = slotMap[slotId] || [];

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
      child.material.emissiveIntensity = 0.5;
    }
    if (child.userData.isPivot) {
      const mesh = child.children.find((c) => c.isMesh);
      if (mesh && mesh.material && mesh.material.emissive) {
        mesh.material.emissive.copy(HIGHLIGHT_COLOR);
        mesh.material.emissiveIntensity = 0.5;
      }
    }
  });
}

function highlightBoundBones(slotId, bindings) {
  const boundNames = bindings[slotId] || [];
  skelBoneObjects.forEach(({ name, sphere }) => {
    sphere.material = boundNames.includes(name) ? BONE_MAT_HIGHLIGHT : BONE_MAT;
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
function buildBoneToPieceMap() {
  const bindings = rigGroup.userData.slotBindings
    || (currentSkeleton ? currentSkeleton.defaultBindings : {})
    || {};
  const slotMap = rigGroup.userData.slotMap || {};
  const map = {};
  for (const [slotId, boneNames] of Object.entries(bindings)) {
    const pieces = slotMap[slotId] || [];
    if (pieces.length === 0) continue;
    const primary = pieces[0];
    for (const bone of boneNames) map[bone] = primary;
  }
  return map;
}

// Translate a skeleton animation so it targets mesh pieces instead of bones.
// Position tracks are re-based relative to the piece's current rest position.
function translateAnimForMesh(animDef, boneTopiece) {
  const tracks = [];
  for (const track of animDef.tracks || []) {
    const pieceName = boneTopiece[track.target];
    if (!pieceName) continue;

    if (track.property !== 'position') {
      tracks.push({ ...track, target: pieceName });
      continue;
    }

    // Position: re-base deltas from the bone's first-keyframe rest pos
    const rest = track.keyframes[0]?.value || [0, 0, 0];
    let pieceNode = null;
    modelClone.traverse((c) => {
      if (!pieceNode && (c.userData.name === pieceName || c.name === pieceName)) pieceNode = c;
    });
    if (!pieceNode) continue;
    const base = pieceNode.position;
    tracks.push({
      ...track,
      target: pieceName,
      keyframes: track.keyframes.map((kf) => ({
        time: kf.time,
        value: [
          base.x + (kf.value[0] - rest[0]),
          base.y + (kf.value[1] - rest[1]),
          base.z + (kf.value[2] - rest[2]),
        ],
      })),
    });
  }
  return tracks.length ? { ...animDef, tracks } : null;
}

function playRigAnim(animDef) {
  stopRigAnim();

  // Compile for mesh (left viewport) — translate bone tracks → piece tracks
  if (modelClone) {
    const boneTopiece = buildBoneToPieceMap();
    const meshAnimDef = translateAnimForMesh(animDef, boneTopiece);
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

const rigClock = new THREE.Clock();

function startRigRenderLoop() {
  function animate() {
    if (!state.rigPanelOpen) return;
    rigAnimId = requestAnimationFrame(animate);

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
    }

    if (modelControls) modelControls.update();
    if (skelControls) skelControls.update();

    if (modelRenderer && modelScene && modelCamera) {
      modelRenderer.render(modelScene, modelCamera);
    }
    if (skelRenderer && skelScene && skelCamera) {
      skelRenderer.render(skelScene, skelCamera);
    }
  }
  animate();
}
