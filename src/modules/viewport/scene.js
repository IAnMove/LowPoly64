import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { state } from '../shared/state.js';
import { updatePropertiesPanel, updateMultiSelectionPanel } from './ui.js';
import { pushAction } from '../shared/undo.js';
import { updateAnimationMixer } from '../animation/animation.js';
import { retroRender } from './retro-effects.js';
import { emit, on } from '../../event-bus.js';

export function initScene() {
  // Scene
  state.scene = new THREE.Scene();
  state.scene.fog = new THREE.Fog(0x111111, 30, 80);

  // Camera
  state.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  state.camera.position.set(10, 8, 15);

  // Renderer
  const canvas = document.getElementById('canvas');
  state.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.shadowMap.enabled = false;

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  state.scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffeecc, 1.2);
  dirLight.position.set(15, 25, 10);
  state.scene.add(dirLight);

  // User objects group
  state.userObjects = new THREE.Group();
  state.scene.add(state.userObjects);

  // Grid
  const grid = new THREE.GridHelper(50, 50, 0xffcc00, 0x444444);
  grid.position.y = -0.01;
  state.scene.add(grid);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  state.scene.add(floor);

  // Axes
  const axes = new THREE.AxesHelper(5);
  state.scene.add(axes);

  // OrbitControls
  state.orbitControls = new OrbitControls(state.camera, state.renderer.domElement);
  state.orbitControls.enableDamping = true;
  state.orbitControls.dampingFactor = 0.12;
  state.orbitControls.minDistance = 5;
  state.orbitControls.maxDistance = 60;

  // TransformControls
  state.transformControls = new TransformControls(state.camera, state.renderer.domElement);
  let beforeTransform = null;
  let boneEditInfo = null; // tracks pivot-edit compensation

  // Multi-selection tracking
  let multiBeforeSnapshots = null; // Map<obj, {pos, rot, scale}>
  let proxyLastPos = null;
  let proxyLastRot = null;
  let proxyLastScale = null;

  state.transformControls.addEventListener('dragging-changed', (event) => {
    state.orbitControls.enabled = !event.value;
    const obj = state.transformControls.object;
    if (!obj) return;
    if (obj.userData?.isAnimFrameProxy) {
      beforeTransform = null;
      boneEditInfo = null;
      multiBeforeSnapshots = null;
      return;
    }

    const isMulti = obj.userData.isProxy && state.selectedMeshes.size > 1;

    if (event.value) {
      // Drag started
      if (isMulti) {
        // Multi-selection: snapshot all objects
        multiBeforeSnapshots = new Map();
        state.selectedMeshes.forEach((m) => {
          multiBeforeSnapshots.set(m, { pos: m.position.clone(), rot: m.rotation.clone(), scale: m.scale.clone() });
        });
        proxyLastPos = obj.position.clone();
        proxyLastRot = obj.rotation.clone();
        proxyLastScale = obj.scale.clone();
        boneEditInfo = null;
      } else {
        // Single selection
        beforeTransform = {
          obj,
          pos: obj.position.clone(),
          rot: obj.rotation.clone(),
          scale: obj.scale.clone(),
        };
        boneEditInfo = null;
        if (state.bonesVisible && obj.userData.isPivot && state.transformControls.mode === 'translate') {
          const childMesh = obj.children.find((c) => c.isMesh);
          if (childMesh) {
            boneEditInfo = {
              mesh: childMesh,
              origMeshPos: childMesh.position.clone(),
              origPivotPos: obj.position.clone(),
            };
          }
        }
        multiBeforeSnapshots = null;
      }
    } else {
      // Drag ended
      if (isMulti && multiBeforeSnapshots) {
        // Register undo for all objects
        const snapBefore = new Map();
        const snapAfter = new Map();
        state.selectedMeshes.forEach((m) => {
          const b = multiBeforeSnapshots.get(m);
          if (b) snapBefore.set(m, b);
          snapAfter.set(m, { pos: m.position.clone(), rot: m.rotation.clone(), scale: m.scale.clone() });
        });
        pushAction({
          type: 'Transformar grupo',
          undo: () => {
            snapBefore.forEach((snap, m) => { m.position.copy(snap.pos); m.rotation.copy(snap.rot); m.scale.copy(snap.scale); });
            emit('proxy:update-position');
            updateMultiSelectionPanel();
          },
          redo: () => {
            snapAfter.forEach((snap, m) => { m.position.copy(snap.pos); m.rotation.copy(snap.rot); m.scale.copy(snap.scale); });
            emit('proxy:update-position');
            updateMultiSelectionPanel();
          },
        });
        multiBeforeSnapshots = null;
        // Reposition proxy to new center
        updateProxyPosition();
      } else if (beforeTransform && beforeTransform.obj === obj) {
        const before = beforeTransform;
        const after = { pos: obj.position.clone(), rot: obj.rotation.clone(), scale: obj.scale.clone() };
        if (boneEditInfo) {
          const mesh = boneEditInfo.mesh;
          const meshBefore = boneEditInfo.origMeshPos.clone();
          const meshAfter = mesh.position.clone();
          pushAction({
            type: 'Mover pivote',
            undo: () => {
              obj.position.copy(before.pos); obj.rotation.copy(before.rot); obj.scale.copy(before.scale);
              mesh.position.copy(meshBefore);
              if (state.selectedMesh === obj) updatePropertiesPanel();
            },
            redo: () => {
              obj.position.copy(after.pos); obj.rotation.copy(after.rot); obj.scale.copy(after.scale);
              mesh.position.copy(meshAfter);
              if (state.selectedMesh === obj) updatePropertiesPanel();
            },
          });
          boneEditInfo = null;
        } else {
          pushAction({
            type: 'Transformar',
            undo: () => { obj.position.copy(before.pos); obj.rotation.copy(before.rot); obj.scale.copy(before.scale); if (state.selectedMesh === obj) updatePropertiesPanel(); },
            redo: () => { obj.position.copy(after.pos); obj.rotation.copy(after.rot); obj.scale.copy(after.scale); if (state.selectedMesh === obj) updatePropertiesPanel(); },
          });
        }
        beforeTransform = null;
      }
    }
  });

  state.transformControls.addEventListener('change', () => {
    const obj = state.transformControls.object;
    if (!obj) return;
    if (obj.userData?.isAnimFrameProxy) return;

    // Bone pivot edit: keep mesh visually in place while pivot moves
    if (boneEditInfo && state.transformControls.dragging) {
      const delta = obj.position.clone().sub(boneEditInfo.origPivotPos);
      boneEditInfo.mesh.position.copy(boneEditInfo.origMeshPos).sub(delta);
    }

    // Multi-selection: apply proxy delta to all selected objects
    if (obj.userData.isProxy && state.selectedMeshes.size > 1 && state.transformControls.dragging) {
      const mode = state.transformControls.mode;

      if (mode === 'translate' && proxyLastPos) {
        const delta = obj.position.clone().sub(proxyLastPos);
        state.selectedMeshes.forEach((m) => m.position.add(delta));
        proxyLastPos.copy(obj.position);
      }

      if (mode === 'rotate' && proxyLastRot) {
        // Compute rotation delta as quaternion
        const qBefore = new THREE.Quaternion().setFromEuler(proxyLastRot);
        const qAfter = new THREE.Quaternion().setFromEuler(obj.rotation);
        const qDelta = qAfter.clone().multiply(qBefore.invert());
        const proxyPos = obj.position;

        state.selectedMeshes.forEach((m) => {
          // Rotate position around proxy center
          const offset = m.position.clone().sub(proxyPos);
          offset.applyQuaternion(qDelta);
          m.position.copy(proxyPos).add(offset);
          // Apply rotation to the object itself
          const mQuat = new THREE.Quaternion().setFromEuler(m.rotation);
          mQuat.premultiply(qDelta);
          m.rotation.setFromQuaternion(mQuat);
        });
        proxyLastRot.copy(obj.rotation);
      }

      if (mode === 'scale' && proxyLastScale) {
        const sx = proxyLastScale.x !== 0 ? obj.scale.x / proxyLastScale.x : 1;
        const sy = proxyLastScale.y !== 0 ? obj.scale.y / proxyLastScale.y : 1;
        const sz = proxyLastScale.z !== 0 ? obj.scale.z / proxyLastScale.z : 1;
        const proxyPos = obj.position;

        state.selectedMeshes.forEach((m) => {
          m.scale.set(m.scale.x * sx, m.scale.y * sy, m.scale.z * sz);
          // Scale position offset from proxy center
          const offset = m.position.clone().sub(proxyPos);
          offset.set(offset.x * sx, offset.y * sy, offset.z * sz);
          m.position.copy(proxyPos).add(offset);
        });
        proxyLastScale.copy(obj.scale);
      }

      updateMultiSelectionPanel();
    }

    if (state.selectedMesh) updatePropertiesPanel();
  });
  state.scene.add(state.transformControls.getHelper());

  // Responsive resize
  onResize();
  on('viewport:resize', onResize);
  window.addEventListener('resize', onResize);

  // Render loop
  animate();
}

export function onResize() {
  if (state.lowResEnabled) {
    // In low-res mode, only update aspect ratio — don't resize canvas
    const container = document.getElementById('viewport');
    state.camera.aspect = container.clientWidth / container.clientHeight;
    state.camera.updateProjectionMatrix();
    return;
  }
  const container = document.getElementById('viewport');
  const w = container.clientWidth;
  const h = container.clientHeight;
  state.camera.aspect = w / h;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(w, h);
}

// ── Bones Visualization ─────────────────────────────────────────
let bonesGroup = null;
let boneHelpers = []; // { pivotGroup, sphere }
let boneLines = [];   // { line, parentPivot, childPivot }
let bonePivotCount = 0;

const BONE_SPHERE_GEO = new THREE.SphereGeometry(0.15, 6, 4);
const BONE_SPHERE_MAT = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, depthTest: false });
const BONE_LINE_MAT = new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false });
const BONE_ROOT_MAT = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, depthTest: false });

// Raycast against bone spheres — returns the PivotGroup if a bone was hit, null otherwise
export function raycastBones(raycaster) {
  if (!state.bonesVisible || !bonesGroup || boneHelpers.length === 0) return null;
  const spheres = boneHelpers.map((h) => h.sphere);
  const intersects = raycaster.intersectObjects(spheres);
  if (intersects.length === 0) return null;
  const hitSphere = intersects[0].object;
  const helper = boneHelpers.find((h) => h.sphere === hitSphere);
  return helper ? helper.pivotGroup : null;
}

export function toggleBones() {
  state.bonesVisible = !state.bonesVisible;
  if (state.bonesVisible) {
    buildBones();
  } else {
    clearBones();
  }
  return state.bonesVisible;
}

function buildBones() {
  clearBones();
  bonesGroup = new THREE.Group();
  bonesGroup.name = '__bones__';
  bonesGroup.renderOrder = 999;
  state.scene.add(bonesGroup);

  boneHelpers = [];
  boneLines = [];

  state.userObjects.traverse((child) => {
    if (!child.userData.isPivot) return;

    const sphere = new THREE.Mesh(BONE_SPHERE_GEO, BONE_SPHERE_MAT);
    sphere.renderOrder = 999;
    bonesGroup.add(sphere);
    boneHelpers.push({ pivotGroup: child, sphere });

    // Line to parent (PivotGroup or root group)
    const parentIsPivot = child.parent && child.parent.userData.isPivot;
    const parentIsRootGroup = child.parent && child.parent.isGroup && !child.parent.userData.isPivot && child.parent !== state.userObjects;
    if (parentIsPivot || parentIsRootGroup) {
      const points = [new THREE.Vector3(), new THREE.Vector3()];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, BONE_LINE_MAT);
      line.renderOrder = 999;
      bonesGroup.add(line);
      boneLines.push({ line, parentNode: child.parent, childPivot: child });
    }
  });

  // Add root group spheres (yellow) for groups that contain PivotGroups
  state.userObjects.children.forEach((child) => {
    if (!child.isGroup || child.userData.isPivot) return;
    const hasPivots = child.children.some((c) => c.userData.isPivot);
    if (hasPivots) {
      const sphere = new THREE.Mesh(BONE_SPHERE_GEO, BONE_ROOT_MAT);
      sphere.renderOrder = 999;
      bonesGroup.add(sphere);
      boneHelpers.push({ pivotGroup: child, sphere });
    }
  });

  bonePivotCount = boneHelpers.length;
  updateBones();
}

function clearBones() {
  if (bonesGroup) {
    // Dispose line geometries (not shared)
    boneLines.forEach(({ line }) => { if (line.geometry) line.geometry.dispose(); });
    state.scene.remove(bonesGroup);
    bonesGroup = null;
  }
  boneHelpers = [];
  boneLines = [];
  bonePivotCount = 0;
}

function updateBones() {
  if (!state.bonesVisible || !bonesGroup) return;

  // Check if scene changed — rebuild if pivot count differs
  let count = 0;
  state.userObjects.traverse((c) => { if (c.userData.isPivot) count++; });
  state.userObjects.children.forEach((c) => {
    if (c.isGroup && !c.userData.isPivot && c.children.some((ch) => ch.userData.isPivot)) count++;
  });
  if (count !== bonePivotCount) {
    buildBones();
    return;
  }

  const wp = new THREE.Vector3();

  boneHelpers.forEach(({ pivotGroup, sphere }) => {
    pivotGroup.getWorldPosition(wp);
    sphere.position.copy(wp);
  });

  boneLines.forEach(({ line, parentNode, childPivot }) => {
    const pos = line.geometry.attributes.position;
    parentNode.getWorldPosition(wp);
    pos.setXYZ(0, wp.x, wp.y, wp.z);
    childPivot.getWorldPosition(wp);
    pos.setXYZ(1, wp.x, wp.y, wp.z);
    pos.needsUpdate = true;
  });
}

const clock = new THREE.Timer();
if (typeof document !== 'undefined') {
  clock.connect(document);
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  clock.update(timestamp);
  const delta = clock.getDelta();
  state.orbitControls.update();
  updateAnimationMixer(delta);
  updateBones();
  retroRender();
}
