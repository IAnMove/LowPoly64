import * as THREE from 'three';
import { state } from './state.js';
import { showToast, getChildMesh } from './ui.js';
import { pushAction } from './undo.js';
import { t } from './i18n.js';

export function configureTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.magFilter = state.pixelatedMode ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = state.pixelatedMode ? THREE.NearestFilter : THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
}

export function cloneImageToCanvas(image, fallbackSize = 256) {
  if (!image) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.width || image.naturalWidth || fallbackSize;
  canvas.height = image.height || image.naturalHeight || fallbackSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function createDetachedCanvasTexture(sourceImage, transform) {
  const canvas = cloneImageToCanvas(sourceImage);
  if (!canvas) return null;
  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  applyTextureTransform(texture, transform);
  return texture;
}

export function cloneTexture(texture) {
  if (!texture) return null;
  const cloned = createDetachedCanvasTexture(texture.image, getTextureTransform(texture));
  if (!cloned) return texture.clone();
  return cloned;
}

export function getTextureTransform(texture) {
  if (!texture) {
    return { offset: [0, 0], repeat: [1, 1], rotation: 0, center: [0.5, 0.5] };
  }
  return {
    offset: [texture.offset.x, texture.offset.y],
    repeat: [texture.repeat.x, texture.repeat.y],
    rotation: texture.rotation || 0,
    center: [texture.center.x, texture.center.y],
  };
}

export function applyTextureTransform(texture, transform) {
  if (!texture || !transform) return;
  const offset = transform.offset || [0, 0];
  const repeat = transform.repeat || [1, 1];
  const center = transform.center || [0.5, 0.5];
  texture.offset.set(offset[0] ?? 0, offset[1] ?? 0);
  texture.repeat.set(repeat[0] ?? 1, repeat[1] ?? 1);
  texture.center.set(center[0] ?? 0.5, center[1] ?? 0.5);
  texture.rotation = transform.rotation ?? 0;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
}

export function rememberTextureTransform(mesh, texture = mesh?.material?.map) {
  if (!mesh) return;
  mesh.userData.textureTransform = getTextureTransform(texture);
}

function loadTextureFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const texture = new THREE.Texture(img);
      configureTexture(texture);

      if (state.selectedMesh) {
        const target = getChildMesh(state.selectedMesh) || state.selectedMesh;
        applyTexture(target, texture);
        showToast(t('textureApplied'));
        // Update preview
        const preview = document.getElementById('texture-preview');
        if (preview) {
          preview.src = img.src;
          preview.classList.remove('hidden');
        }
        const uvSection = document.getElementById('uv-controls');
        if (uvSection) uvSection.classList.remove('hidden');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function handleTextureUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  loadTextureFromFile(file);
}

export function setupTextureDragDrop(dropZone) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-white');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-white');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-white');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadTextureFromFile(file);
    }
  });
}

export function applyTexture(mesh, texture) {
  if (!mesh || !mesh.material) return;
  const oldMap = mesh.material.map;
  const oldTexData = mesh.userData.texture;
  const oldEnabled = mesh.userData.textureEnabled;
  const oldColor = mesh.material.color ? mesh.material.color.getHex() : 0xffffff;
  const previousTransform = mesh.userData.textureTransform || getTextureTransform(oldMap);

  applyTextureTransform(texture, previousTransform);
  mesh.userData.texture = texture;
  mesh.userData.textureEnabled = true;
  mesh.userData.colorBeforeTexture = oldColor;
  rememberTextureTransform(mesh, texture);
  mesh.material.map = texture;
  mesh.material.color.set(0xffffff); // White so texture colors show correctly
  mesh.material.needsUpdate = true;

  pushAction({
    type: t('actionApplyTexture'),
    undo: () => { mesh.material.map = oldMap; mesh.material.color.set(oldColor); mesh.userData.texture = oldTexData; mesh.userData.textureEnabled = oldEnabled; mesh.material.needsUpdate = true; },
    redo: () => { mesh.material.map = texture; mesh.material.color.set(0xffffff); mesh.userData.texture = texture; mesh.userData.textureEnabled = true; mesh.material.needsUpdate = true; },
  });
}

export function toggleTexture() {
  const mesh = getChildMesh(state.selectedMesh) || state.selectedMesh;
  if (!mesh || !mesh.userData.texture) return;

  if (mesh.userData.textureEnabled) {
    mesh.material.map = null;
    mesh.userData.textureEnabled = false;
    if (mesh.userData.colorBeforeTexture !== undefined) {
      mesh.material.color.set(mesh.userData.colorBeforeTexture);
    }
  } else {
    mesh.material.map = mesh.userData.texture;
    mesh.userData.textureEnabled = true;
    mesh.userData.colorBeforeTexture = mesh.material.color.getHex();
    mesh.material.color.set(0xffffff);
  }
  mesh.material.needsUpdate = true;
}

export function togglePixelated() {
  state.pixelatedMode = !state.pixelatedMode;
  const filter = state.pixelatedMode ? THREE.NearestFilter : THREE.LinearFilter;

  state.userObjects.traverse((child) => {
    if (child.isMesh && child.material && child.material.map) {
      child.material.map.magFilter = filter;
      child.material.map.minFilter = filter;
      child.material.map.needsUpdate = true;
      child.material.needsUpdate = true;
    }
  });

  state.userObjects.traverse((child) => {
    if (child.isMesh && child.userData.texture) {
      child.userData.texture.magFilter = filter;
      child.userData.texture.minFilter = filter;
      child.userData.texture.needsUpdate = true;
    }
  });

  return state.pixelatedMode;
}
