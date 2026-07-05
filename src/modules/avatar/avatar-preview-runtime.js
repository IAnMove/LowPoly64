import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  computeBoundsForNames,
  HEAD_SLOT_ID,
  PREVIEW_FOCUS_FULL,
  PREVIEW_FOCUS_HEAD,
  resolveHeadPreviewFrontDirection,
  resolvePreviewFocusMode,
} from './avatar-preview-diagnostics.js';

export function createAvatarPreviewRuntime(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0d);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  renderer.setPixelRatio(1);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 3.2, 8.5);

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

  return {
    renderer,
    scene,
    camera,
    controls,
  };
}

export function resizeAvatarPreviewViewport(stage, renderer, camera, force = false) {
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

export function frameAvatarPreviewCamera(object3D, { camera, controls, focusMode = PREVIEW_FOCUS_FULL } = {}) {
  if (!camera || !controls) return;

  object3D?.updateWorldMatrix?.(true, true);
  const resolvedFocusMode = resolvePreviewFocusMode(focusMode);
  const focus = resolvePreviewFocus(object3D, resolvedFocusMode);
  const box = focus.box;
  if (!box || box.isEmpty()) {
    controls.target.set(0, 1.7, 0);
    camera.position.set(0, 3.2, 8.5);
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
  const distance = baseDistance * (resolvedFocusMode === PREVIEW_FOCUS_HEAD ? 1.36 : 1.45);
  if (resolvedFocusMode === PREVIEW_FOCUS_HEAD) {
    focusCenter.y += size.y * 0.03;
  }
  const offsetDirection = resolvedFocusMode === PREVIEW_FOCUS_HEAD
    ? resolveHeadPreviewFrontDirection(object3D)
    : resolveHeadPreviewFrontDirection(object3D);
  const offset = offsetDirection.normalize().multiplyScalar(distance);

  controls.target.copy(focusCenter);
  camera.position.copy(focusCenter).add(offset);
  camera.lookAt(focusCenter);
  const previousDamping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = previousDamping;
}
