import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  PREVIEW_RIG_CONNECTIONS,
  PREVIEW_RIG_JOINTS,
} from './motion-ripper-constants.js';

export function createPreviewScene({ withLights = true } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09090b);
  if (withLights) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.25);
    keyLight.position.set(14, 22, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x66d9ff, 0.35);
    fillLight.position.set(-10, 12, -8);
    scene.add(fillLight);
  }
  scene.add(new THREE.GridHelper(20, 20, 0x444444, 0x262626));
  return scene;
}

export function createPreviewRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  return renderer;
}

export function resizePreviewViewport(stage, canvas, renderer, camera) {
  if (!renderer || !camera || !stage || !canvas) return false;

  const width = Math.max(stage.clientWidth || 0, 1);
  const height = Math.max(stage.clientHeight || 0, 1);
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

export function framePreviewCamera(camera, controls, object3D) {
  if (!camera || !controls) return;

  const box = object3D ? new THREE.Box3().setFromObject(object3D) : null;
  if (!box || box.isEmpty()) {
    controls.target.set(0, 1.75, 0);
    camera.position.set(6, 5, 8);
    camera.lookAt(controls.target);
    controls.update();
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const fitHeight = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const fitWidth = fitHeight / Math.max(camera.aspect, 0.1);
  const distance = Math.max(fitHeight, fitWidth, 4) * 1.3;
  const offset = new THREE.Vector3(1.1, 0.78, 1.1).normalize().multiplyScalar(distance);

  controls.target.copy(center);
  camera.position.copy(center).add(offset);
  camera.lookAt(center);
  controls.update();
}

export function cloneGroupForPreview(group) {
  let hasSkinnedMesh = false;
  group?.traverse?.((node) => {
    if (node?.isSkinnedMesh) hasSkinnedMesh = true;
  });
  const clone = hasSkinnedMesh ? SkeletonUtils.clone(group) : group.clone(true);
  clone.traverse((node) => {
    if (!node?.isMesh) return;
    if (node.geometry?.clone) {
      node.geometry = node.geometry.clone();
    }
    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => material?.clone?.() || material);
    } else if (node.material?.clone) {
      node.material = node.material.clone();
    }
  });
  return clone;
}

export function buildNamedNodeLookup(root) {
  const lookup = {};
  root?.traverse((node) => {
    const userDataName = String(node?.userData?.name || '').trim();
    const nodeName = String(node?.name || '').trim();
    if (userDataName && !(userDataName in lookup)) {
      lookup[userDataName] = node;
    }
    if (nodeName && !(nodeName in lookup)) {
      lookup[nodeName] = node;
    }
  });
  return lookup;
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((entry) => disposeMaterial(entry));
    return;
  }
  material.dispose?.();
}

export function disposePreviewObject3D(object3D) {
  object3D?.traverse((node) => {
    if (!node?.isMesh && !node?.isLine) return;
    node.geometry?.dispose?.();
    disposeMaterial(node.material);
    node.material = null;
  });
}

export function createRigHelperGroup() {
  const group = new THREE.Group();
  const jointMeshes = {};
  const lines = [];

  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const isHead = jointName === 'HEAD';
    const isCore = jointName === 'PELVIS' || jointName === 'CHEST' || jointName === 'NECK';
    const isClavicle = jointName === 'CLAVICLE_L' || jointName === 'CLAVICLE_R';
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(isHead ? 0.16 : (isCore ? 0.13 : (isClavicle ? 0.11 : 0.12)), 8, 6),
      new THREE.MeshBasicMaterial({
        color: isHead ? 0xffcc00 : (isCore ? 0x7df9ff : (isClavicle ? 0x66ffcc : 0x00ffff)),
        wireframe: true,
        depthTest: false,
      })
    );
    sphere.visible = false;
    group.add(sphere);
    jointMeshes[jointName] = sphere;
  });

  PREVIEW_RIG_CONNECTIONS.forEach(([startJointName, endJointName]) => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({
        color: 0x00ffcc,
        depthTest: false,
      })
    );
    line.visible = false;
    group.add(line);
    lines.push({ startJointName, endJointName, line });
  });

  return { group, jointMeshes, lines };
}
