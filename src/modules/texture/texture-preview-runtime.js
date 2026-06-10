import * as THREE from 'three';
import {
  applyTextureTransform,
  configureTexture,
  createDetachedCanvasTexture,
  getTextureTransform,
} from '../shared/textures.js';

function normalizePreviewMaterialAppearance(material) {
  if (!material) return material;
  if (Array.isArray(material)) {
    material.forEach((entry) => normalizePreviewMaterialAppearance(entry));
    return material;
  }
  if (material.emissive) {
    material.emissive.set(0x000000);
    material.emissiveIntensity = 0;
  }
  return material;
}

export function createTexturePreviewRuntime({
  buildPreviewTextureCanvas,
  getTargetMesh,
  getPaintCanvas,
}) {
  let renderer = null;
  let scene = null;
  let camera = null;
  let mesh = null;
  let animationFrameId = null;
  let autoRotate = true;
  let targetRotation = null;

  function dispose() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    renderer?.dispose?.();
    renderer = null;
    scene = null;
    camera = null;
    mesh = null;
    autoRotate = true;
    targetRotation = null;
  }

  function animatePreview() {
    animationFrameId = requestAnimationFrame(animatePreview);
    if (mesh) {
      if (targetRotation) {
        mesh.rotation.x += (targetRotation.x - mesh.rotation.x) * 0.12;
        mesh.rotation.y += (targetRotation.y - mesh.rotation.y) * 0.12;
        const doneX = Math.abs(targetRotation.x - mesh.rotation.x) < 0.001;
        const doneY = Math.abs(targetRotation.y - mesh.rotation.y) < 0.001;
        if (doneX && doneY) {
          mesh.rotation.x = targetRotation.x;
          mesh.rotation.y = targetRotation.y;
          targetRotation = null;
        }
      } else if (autoRotate) {
        mesh.rotation.y += 0.01;
      }
    }
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function init(meshSource, { onClick, isFaceSelected } = {}) {
    const container = document.getElementById('tex-preview-3d');
    if (!container) return;
    dispose();
    container.innerHTML = '';
    autoRotate = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 4);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 3, 4);
    scene.add(dir);

    mesh = meshSource.clone();
    mesh.geometry = meshSource.geometry.clone();
    mesh.material = normalizePreviewMaterialAppearance(meshSource.material.clone());
    if (meshSource.material?.map) {
      mesh.material.map = createDetachedCanvasTexture(
        meshSource.material.map.image,
        meshSource.userData.textureTransform || getTextureTransform(meshSource.material.map)
      );
    }
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const center = box.getCenter(new THREE.Vector3());
    mesh.geometry.translate(-center.x, -center.y, -center.z);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.z = maxDim * 2.5;
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(200, 200);
    renderer.setPixelRatio(1);
    container.appendChild(renderer.domElement);

    renderer.domElement.addEventListener('mouseenter', () => { autoRotate = false; });
    renderer.domElement.addEventListener('mouseleave', () => {
      if (!isFaceSelected?.()) autoRotate = true;
    });
    if (onClick) renderer.domElement.addEventListener('click', onClick);

    animatePreview();
  }

  function applyCanvasToPreview() {
    if (!mesh || !mesh.material) return;
    const previousMap = mesh.material.map;
    const previewCanvas = buildPreviewTextureCanvas(getPaintCanvas());
    const tex = new THREE.CanvasTexture(previewCanvas);
    configureTexture(tex);
    applyTextureTransform(tex, getTargetMesh()?.userData?.textureTransform || getTextureTransform(previousMap));
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;

    if (isEditorCanvasTexture(previousMap)) {
      previousMap.dispose();
    }
  }

  function isEditorCanvasTexture(texture) {
    return !!(texture && texture.isCanvasTexture && texture.image === getPaintCanvas());
  }

  return {
    init,
    dispose,
    applyCanvasToPreview,
    isEditorCanvasTexture,
    getRenderer: () => renderer,
    getCamera: () => camera,
    getMesh: () => mesh,
    setAutoRotate: (nextValue) => {
      autoRotate = !!nextValue;
    },
    setTargetRotation: (rotation) => {
      targetRotation = rotation ? { ...rotation } : null;
    },
  };
}
