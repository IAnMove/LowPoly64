// Rig/Animation UI — dual viewport panel for skeleton binding and animation preview

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from './state.js';
import { t } from './i18n.js';
import { getSkeletonsByArchetype, getSkeletonById } from './skeleton-registry.js';
import { compileAnimation } from './animation.js';
import { getSlots } from './archetype-system.js';
import { getProfileById } from './animation-profiles.js';

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
let skelBoneObjects = []; // { name, sphere, parentLine? }

let rigAnimId = null;
let rigMixerModel = null;
let rigMixerSkel = null;
let rigPlaying = false;
let rigCurrentAnim = null;
let rigCurrentAnimDuration = 0;
let selectedSlot = null;
let currentSkeleton = null;

const BONE_GEO = new THREE.SphereGeometry(0.15, 6, 4);
const BONE_MAT = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, depthTest: false });
const BONE_MAT_HIGHLIGHT = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, depthTest: false });
const BONE_LINE_MAT = new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false });
const HIGHLIGHT_COLOR = new THREE.Color(0x00ffcc);

export function openRigPanel(group) {
  const g = group || state.selectedMesh;
  if (!g || !g.isGroup || !g.userData.archetype) return;
  rigGroup = g;

  document.getElementById('rig-panel-modal').classList.remove('hidden');
  state.rigPanelOpen = true;
  state.rigPanelGroup = g;

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

  loadSkeletonIntoViewport();
}

function loadSkeletonIntoViewport() {
  // Clear old bones
  skelBoneObjects.forEach(({ sphere, line }) => {
    if (sphere) skelScene.remove(sphere);
    if (line) { line.geometry.dispose(); skelScene.remove(line); }
  });
  skelBoneObjects = [];

  if (!currentSkeleton || !currentSkeleton.bones) return;

  const bonePositions = {}; // name → world position (accumulated)

  // First pass: compute world positions
  for (const bone of currentSkeleton.bones) {
    const parentPos = bone.parent ? bonePositions[bone.parent] : [0, 0, 0];
    bonePositions[bone.name] = [
      (parentPos ? parentPos[0] : 0) + bone.position[0],
      (parentPos ? parentPos[1] : 0) + bone.position[1],
      (parentPos ? parentPos[2] : 0) + bone.position[2],
    ];
  }

  // Second pass: create visuals
  for (const bone of currentSkeleton.bones) {
    const pos = bonePositions[bone.name];
    const sphere = new THREE.Mesh(BONE_GEO, BONE_MAT.clone());
    sphere.position.set(pos[0], pos[1], pos[2]);
    sphere.userData.boneName = bone.name;
    sphere.renderOrder = 999;
    skelScene.add(sphere);

    let line = null;
    if (bone.parent && bonePositions[bone.parent]) {
      const pPos = bonePositions[bone.parent];
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pPos[0], pPos[1], pPos[2]),
        new THREE.Vector3(pos[0], pos[1], pos[2]),
      ]);
      line = new THREE.Line(geo, BONE_LINE_MAT);
      line.renderOrder = 999;
      skelScene.add(line);
    }

    skelBoneObjects.push({ name: bone.name, sphere, line });
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

  slots.forEach((slotId) => {
    const isSelected = selectedSlot === slotId;

    const row = document.createElement('div');
    row.className = `px-1 py-1 cursor-pointer hover:bg-zinc-800 rounded ${isSelected ? 'bg-zinc-700' : ''}`;

    const header = document.createElement('div');
    header.className = 'flex items-center gap-2';

    const label = document.createElement('span');
    label.className = 'text-[#ffcc00] w-28 flex-shrink-0 text-[10px]';
    label.textContent = slotId;

    const boneSummary = document.createElement('span');
    boneSummary.className = 'text-zinc-400 flex-1 truncate text-[10px]';
    boneSummary.textContent = (bindings[slotId] || []).join(', ') || '—';

    header.appendChild(label);
    header.appendChild(boneSummary);
    row.appendChild(header);

    // Bone checkboxes (only shown when slot is selected and skeleton has bones)
    if (isSelected && allBones.length > 0) {
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'flex flex-wrap gap-1 mt-1 ml-2';

      allBones.forEach((boneName) => {
        const checked = (bindings[slotId] || []).includes(boneName);
        const itemEl = document.createElement('label');
        itemEl.className = 'flex items-center gap-1 text-[9px] text-zinc-300 cursor-pointer select-none';

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
          } else {
            rigGroup.userData.slotBindings[slotId] = current.filter((b) => b !== boneName);
          }
          highlightBoundBones(slotId, rigGroup.userData.slotBindings);
          boneSummary.textContent = (rigGroup.userData.slotBindings[slotId] || []).join(', ') || '—';
        });

        itemEl.appendChild(cb);
        itemEl.appendChild(document.createTextNode(boneName));
        checkboxContainer.appendChild(itemEl);
      });

      row.appendChild(checkboxContainer);
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
    }
  });

  // Highlight pieces in this slot
  modelClone.traverse((child) => {
    if (child.isMesh || child.userData.isPivot) {
      const name = child.userData.name || child.name;
      if (names.includes(name)) {
        if (child.isMesh && child.material && child.material.emissive) {
          child.material.emissive.copy(HIGHLIGHT_COLOR);
          child.material.emissiveIntensity = 0.5;
        }
        // Also check child mesh of pivot
        if (child.userData.isPivot) {
          const mesh = child.children.find((c) => c.isMesh);
          if (mesh && mesh.material && mesh.material.emissive) {
            mesh.material.emissive.copy(HIGHLIGHT_COLOR);
            mesh.material.emissiveIntensity = 0.5;
          }
        }
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

function playRigAnim(animDef) {
  stopRigAnim();

  // Compile for model clone
  if (modelClone) {
    const clip = compileAnimation(animDef, modelClone);
    if (clip) {
      rigMixerModel = new THREE.AnimationMixer(modelClone);
      const action = rigMixerModel.clipAction(clip);
      action.setLoop(animDef.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.play();
    }
  }

  // Compile for skeleton bones (we create a virtual group with named objects at bone positions)
  if (skelBoneObjects.length > 0) {
    const skelGroup = new THREE.Group();
    skelBoneObjects.forEach(({ name, sphere }) => {
      sphere.name = name;
      skelGroup.add(sphere);
    });
    const clip = compileAnimation(animDef, skelGroup);
    if (clip) {
      rigMixerSkel = new THREE.AnimationMixer(skelGroup);
      const action = rigMixerSkel.clipAction(clip);
      action.setLoop(animDef.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.play();
    }
    // Remove from group after (we don't want skelGroup to interfere)
    skelBoneObjects.forEach(({ sphere }) => skelGroup.remove(sphere));
  }

  rigPlaying = true;
  rigCurrentAnimDuration = animDef.duration || 1;
}

function stopRigAnim() {
  if (rigMixerModel) { rigMixerModel.stopAllAction(); rigMixerModel = null; }
  if (rigMixerSkel) { rigMixerSkel.stopAllAction(); rigMixerSkel = null; }
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
      if (rigMixerSkel) rigMixerSkel.update(delta);

      // Update progress bar
      if (rigMixerModel && rigCurrentAnimDuration > 0) {
        const pct = ((rigMixerModel.time % rigCurrentAnimDuration) / rigCurrentAnimDuration) * 100;
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
