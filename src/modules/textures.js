import * as THREE from 'three';
import { state } from './state.js';
import { showToast } from './ui.js';
import { pushAction } from './undo.js';

function configureTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.magFilter = state.pixelatedMode ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = state.pixelatedMode ? THREE.NearestFilter : THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
}

function loadTextureFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const texture = new THREE.Texture(img);
      configureTexture(texture);

      if (state.selectedMesh) {
        applyTexture(state.selectedMesh, texture);
        showToast('Textura aplicada');
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

  mesh.userData.texture = texture;
  mesh.userData.textureEnabled = true;
  mesh.userData.colorBeforeTexture = oldColor;
  mesh.material.map = texture;
  mesh.material.color.set(0xffffff); // White so texture colors show correctly
  mesh.material.needsUpdate = true;

  pushAction({
    type: 'Aplicar textura',
    undo: () => { mesh.material.map = oldMap; mesh.material.color.set(oldColor); mesh.userData.texture = oldTexData; mesh.userData.textureEnabled = oldEnabled; mesh.material.needsUpdate = true; },
    redo: () => { mesh.material.map = texture; mesh.material.color.set(0xffffff); mesh.userData.texture = texture; mesh.userData.textureEnabled = true; mesh.material.needsUpdate = true; },
  });
}

export function toggleTexture() {
  const mesh = state.selectedMesh;
  if (!mesh || !mesh.userData.texture) return;

  if (mesh.userData.textureEnabled) {
    mesh.material.map = null;
    mesh.userData.textureEnabled = false;
    // Restore original color
    if (mesh.userData.colorBeforeTexture !== undefined) {
      mesh.material.color.set(mesh.userData.colorBeforeTexture);
    }
  } else {
    mesh.material.map = mesh.userData.texture;
    mesh.userData.textureEnabled = true;
    // Store color and set to white
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
