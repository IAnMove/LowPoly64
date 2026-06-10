import * as THREE from 'three';
import {
  applyTextureTransform,
  configureTexture,
  createDetachedCanvasTexture,
  getTextureTransform,
  rememberTextureTransform,
} from '../shared/textures.js';
import { cloneTextureProcessingSettings } from './texture-processing.js';

export function createTextureSpriteStripController({
  canvasSize,
  getPaintCanvas,
  getTargetMesh,
  getPreviewMesh,
  getAppliedTextureProcessingSettings,
  buildCommittedTextureCanvas,
  isEditorCanvasTexture,
  execAutoSave,
  showToast,
}) {
  let spriteStrip = [];
  let selectedStripIdx = -1;

  function getCanvasBase64() {
    const paintCanvas = getPaintCanvas();
    return paintCanvas ? paintCanvas.toDataURL('image/png').split(',')[1] : null;
  }

  function renderStripNav() {
    const nav = document.getElementById('tex-strip-nav');
    if (!nav) return;
    nav.innerHTML = '';

    if (spriteStrip.length === 0) {
      nav.innerHTML = '<span class="text-zinc-600 text-[8px] self-center px-1">Generate or paint a base sprite, then add variations</span>';
      return;
    }

    spriteStrip.forEach((b64, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'flex flex-col items-center gap-0.5 cursor-pointer shrink-0';

      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + b64;
      const sel = i === selectedStripIdx;
      img.style.cssText = `width:44px;height:44px;image-rendering:pixelated;display:block;border:2px solid ${sel ? '#ffcc00' : '#3f3f46'};`;

      const lbl = document.createElement('span');
      lbl.className = 'text-[7px] ' + (sel ? 'text-[#ffcc00]' : 'text-zinc-500');
      lbl.textContent = i === 0 ? 'BASE' : `VAR ${i}`;

      wrap.appendChild(img);
      wrap.appendChild(lbl);
      wrap.onclick = () => selectStripTile(i);
      if (i > 0) {
        wrap.oncontextmenu = (event) => {
          event.preventDefault();
          removeStripTile(i);
          showToast?.('Tile removed');
        };
      }

      nav.appendChild(wrap);
    });
  }

  function updateStripActionsUi() {
    const section = document.getElementById('tex-strip-var-section');
    if (!section) return;
    const hasSel = selectedStripIdx >= 0 && selectedStripIdx < spriteStrip.length;
    section.classList.toggle('hidden', !hasSel);
    if (hasSel) {
      const lbl = document.getElementById('tex-strip-src-label');
      if (lbl) lbl.textContent = selectedStripIdx === 0 ? 'BASE' : `VAR ${selectedStripIdx}`;
    }
    const applyBtn = document.getElementById('tex-strip-apply-btn');
    if (applyBtn) applyBtn.classList.toggle('hidden', spriteStrip.length === 0);
    const removeBtn = document.getElementById('tex-strip-remove-btn');
    if (removeBtn) {
      const canRemove = selectedStripIdx > 0 && selectedStripIdx < spriteStrip.length;
      removeBtn.classList.toggle('hidden', !canRemove);
    }
    const exportBtn = document.getElementById('tex-strip-export-btn');
    if (exportBtn) exportBtn.classList.toggle('hidden', spriteStrip.length === 0);
  }

  function syncBaseTileFromCanvas() {
    const base64 = getCanvasBase64();
    if (!base64) return false;
    let changed = false;
    if (spriteStrip.length === 0) {
      spriteStrip = [base64];
      selectedStripIdx = 0;
      changed = true;
    } else if (spriteStrip[0] !== base64) {
      spriteStrip[0] = base64;
      if (selectedStripIdx < 0) selectedStripIdx = 0;
      changed = true;
    }
    if (changed) {
      renderStripNav();
      updateStripActionsUi();
    }
    return changed;
  }

  function restoreSpriteStrip(savedDataUrl, savedStrip) {
    const savedBase64 = typeof savedDataUrl === 'string' && savedDataUrl.includes(',')
      ? savedDataUrl.split(',')[1]
      : null;
    if (!Array.isArray(savedStrip) || savedStrip.length === 0) {
      spriteStrip = savedBase64 ? [savedBase64] : [];
    } else if (savedBase64 && savedStrip[0] !== savedBase64) {
      spriteStrip = [savedBase64, ...savedStrip];
    } else {
      spriteStrip = savedStrip.slice();
    }
    selectedStripIdx = spriteStrip.length > 0 ? 0 : -1;
    renderStripNav();
    updateStripActionsUi();
  }

  function loadStripTile(base64, index) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ img, index });
      img.onerror = reject;
      img.src = 'data:image/png;base64,' + base64;
    });
  }

  async function buildStripCanvas() {
    if (spriteStrip.length === 0) return null;
    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = canvasSize * spriteStrip.length;
    stripCanvas.height = canvasSize;
    const ctx = stripCanvas.getContext('2d');
    const tiles = await Promise.all(spriteStrip.map((b64, index) => loadStripTile(b64, index)));
    tiles.forEach(({ img, index }) => {
      ctx.drawImage(img, 0, 0, img.width, img.height, index * canvasSize, 0, canvasSize, canvasSize);
    });
    return stripCanvas;
  }

  function commitStripCanvas(stripCanvas) {
    const targetMesh = getTargetMesh();
    if (!targetMesh?.material) return;
    const previousMap = targetMesh.material.map;
    const committedCanvas = buildCommittedTextureCanvas(stripCanvas, { tileCount: spriteStrip.length });
    const tex = createDetachedCanvasTexture(committedCanvas, targetMesh.userData.textureTransform);
    if (!targetMesh.userData.textureEnabled) {
      targetMesh.userData.colorBeforeTexture = targetMesh.material.color.getHex();
      targetMesh.material.color.set(0xffffff);
    }
    targetMesh.material.map = tex;
    targetMesh.userData.texture = tex;
    targetMesh.userData.textureEnabled = true;
    targetMesh.userData.textureProcessing = cloneTextureProcessingSettings(getAppliedTextureProcessingSettings());
    rememberTextureTransform(targetMesh, tex);
    targetMesh.material.needsUpdate = true;
    if (previousMap && previousMap !== tex) previousMap.dispose();

    const previewMesh = getPreviewMesh();
    if (previewMesh?.material) {
      const prevTex = previewMesh.material.map;
      const tex2 = new THREE.CanvasTexture(committedCanvas);
      configureTexture(tex2);
      applyTextureTransform(tex2, targetMesh.userData.textureTransform || getTextureTransform(prevTex));
      previewMesh.material.map = tex2;
      previewMesh.material.needsUpdate = true;
      if (isEditorCanvasTexture(prevTex)) prevTex.dispose();
    }
  }

  function applyStripToMesh() {
    if (!getTargetMesh()) return;
    buildStripCanvas()
      .then((stripCanvas) => {
        if (stripCanvas) commitStripCanvas(stripCanvas);
      })
      .catch((error) => {
        showToast?.('Strip error: ' + error.message);
      });
  }

  function saveTileToStrip() {
    const paintCanvas = getPaintCanvas();
    if (!paintCanvas) return;
    const b64 = paintCanvas.toDataURL('image/png').split(',')[1];
    spriteStrip.push(b64);
    selectedStripIdx = spriteStrip.length - 1;
    renderStripNav();
    updateStripActionsUi();
    execAutoSave?.(getTargetMesh());
  }

  function selectStripTile(idx) {
    selectedStripIdx = idx === selectedStripIdx ? -1 : idx;
    renderStripNav();
    updateStripActionsUi();
  }

  function approveToStrip(b64) {
    syncBaseTileFromCanvas();
    spriteStrip.push(b64);
    selectedStripIdx = spriteStrip.length - 1;
    renderStripNav();
    updateStripActionsUi();
    applyStripToMesh();
    execAutoSave?.(getTargetMesh());
  }

  function removeStripTile(idx) {
    if (idx <= 0 || idx >= spriteStrip.length) return;
    spriteStrip.splice(idx, 1);
    if (selectedStripIdx === idx) selectedStripIdx = Math.max(0, idx - 1);
    else if (selectedStripIdx >= spriteStrip.length) selectedStripIdx = spriteStrip.length - 1;
    renderStripNav();
    updateStripActionsUi();
    if (spriteStrip.length > 0) {
      applyStripToMesh();
      execAutoSave?.(getTargetMesh());
    }
  }

  function clearStrip() {
    spriteStrip = [];
    selectedStripIdx = -1;
    renderStripNav();
    updateStripActionsUi();
  }

  async function downloadStripImage() {
    syncBaseTileFromCanvas();
    if (spriteStrip.length === 0) return false;
    const stripCanvas = await buildStripCanvas();
    if (!stripCanvas) return false;
    const committedCanvas = buildCommittedTextureCanvas(stripCanvas, { tileCount: spriteStrip.length });
    const link = document.createElement('a');
    link.download = `sprite_strip_${spriteStrip.length}x1.png`;
    link.href = (committedCanvas || stripCanvas).toDataURL('image/png');
    link.click();
    return true;
  }

  return {
    saveTileToStrip,
    selectStripTile,
    getSelectedStripIdx: () => selectedStripIdx,
    getStripTileB64: (idx) => spriteStrip[idx] ?? null,
    approveToStrip,
    applyStripToMesh: () => {
      syncBaseTileFromCanvas();
      applyStripToMesh();
    },
    removeStripTile,
    clearStrip,
    removeSelectedStripVariation: () => {
      if (selectedStripIdx <= 0 || selectedStripIdx >= spriteStrip.length) return false;
      removeStripTile(selectedStripIdx);
      return true;
    },
    downloadStripImage,
    syncBaseTileFromCanvas,
    restoreSpriteStrip,
    getSpriteStripSnapshot: () => spriteStrip.slice(),
    renderStripNav,
    updateStripActionsUi,
  };
}
