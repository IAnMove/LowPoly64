import * as THREE from 'three';
import { createDetachedBrowserCanvasTexture } from './browser-canvas-adapter.js';
import {
  getTextureTransform,
  isTexturePixelated,
} from './texture-core.js';

const DEFAULT_PREVIEW_SIZE = 200;

export function createTexturePreviewScene(sourceMesh, {
  three = THREE,
  createDetachedTexture = createDetachedBrowserCanvasTexture,
  getTransform = getTextureTransform,
  isPixelated = isTexturePixelated,
  cameraDistanceScale = 2.5,
} = {}) {
  const scene = new three.Scene();
  scene.background = new three.Color(0x1a1a1a);

  const camera = new three.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 4);

  const ambient = new three.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const directional = new three.DirectionalLight(0xffffff, 0.8);
  directional.position.set(2, 3, 4);
  scene.add(directional);

  const mesh = clonePreviewMesh(sourceMesh, {
    createDetachedTexture,
    getTransform,
    isPixelated,
  });
  centerPreviewMesh(mesh, camera, { three, cameraDistanceScale });
  scene.add(mesh);

  return {
    scene,
    camera,
    mesh,
  };
}

export function createTexturePreviewRenderer(container, {
  RendererClass = THREE.WebGLRenderer,
  rendererOptions = { antialias: false, alpha: true },
  size = DEFAULT_PREVIEW_SIZE,
  pixelRatio = 1,
} = {}) {
  const renderer = new RendererClass(rendererOptions);
  renderer.setSize(size, size);
  renderer.setPixelRatio(pixelRatio);
  container.appendChild(renderer.domElement);
  return renderer;
}

export function bindTexturePreviewHover(domElement, {
  pauseAutoRotate = () => {},
  resumeAutoRotate = () => {},
} = {}) {
  domElement.addEventListener('mouseenter', pauseAutoRotate);
  domElement.addEventListener('mouseleave', resumeAutoRotate);

  return () => {
    domElement.removeEventListener('mouseenter', pauseAutoRotate);
    domElement.removeEventListener('mouseleave', resumeAutoRotate);
  };
}

function clonePreviewMesh(sourceMesh, {
  createDetachedTexture,
  getTransform,
  isPixelated,
}) {
  const mesh = sourceMesh.clone();
  mesh.geometry = sourceMesh.geometry.clone();
  mesh.material = sourceMesh.material.clone();

  if (sourceMesh.material?.map) {
    mesh.material.map = createDetachedTexture(
      sourceMesh.material.map.image,
      sourceMesh.userData.textureTransform || getTransform(sourceMesh.material.map),
      { pixelated: isPixelated(sourceMesh.material.map) }
    );
  }

  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  return mesh;
}

function centerPreviewMesh(mesh, camera, {
  three,
  cameraDistanceScale,
}) {
  mesh.geometry.computeBoundingBox();

  const box = mesh.geometry.boundingBox;
  const center = box.getCenter(new three.Vector3());
  mesh.geometry.translate(-center.x, -center.y, -center.z);
  const size = box.getSize(new three.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.z = maxDim * cameraDistanceScale;
}
