function getElementById(id, root = globalThis.document) {
  return root?.getElementById?.(id) || null;
}

function createElement(tagName, root = globalThis.document) {
  return root?.createElement?.(tagName) || null;
}

export function getTextureEditorModal(root = globalThis.document) {
  return getElementById('texture-editor-modal', root);
}

export function showTextureEditorModal(root = globalThis.document) {
  getTextureEditorModal(root)?.classList.remove('hidden');
}

export function hideTextureEditorModal(root = globalThis.document) {
  getTextureEditorModal(root)?.classList.add('hidden');
}

export function getTexturePreviewContainer(root = globalThis.document) {
  return getElementById('tex-preview-3d', root);
}

export function getTexturePaintCanvas(root = globalThis.document) {
  return getElementById('tex-paint-canvas', root);
}

export function getTexturePaletteContainer(root = globalThis.document) {
  return getElementById('tex-palette', root);
}

export function getTextureToolButton(id, root = globalThis.document) {
  return getElementById(id, root);
}

export function getTextureColorSwatches(root = globalThis.document) {
  return root?.querySelectorAll?.('.tex-color-swatch') || [];
}

export function getTextureFaceSection(root = globalThis.document) {
  return getElementById('tex-face-section', root);
}

export function getTextureFaceSelect(root = globalThis.document) {
  return getElementById('tex-face-select', root);
}

export function getTextureFaceControls(root = globalThis.document) {
  return getElementById('tex-face-controls', root);
}

export function getTextureUVOverlay(root = globalThis.document) {
  return getElementById('tex-uv-overlay', root);
}

export function getTextureUVMapCanvas(root = globalThis.document) {
  return getElementById('tex-uvmap-canvas', root);
}

export function getTextureInput(id, root = globalThis.document) {
  return getElementById(id, root);
}

export function createTextureImageFileInput(root = globalThis.document) {
  const input = createElement('input', root);
  if (!input) return null;
  input.type = 'file';
  input.accept = 'image/*';
  return input;
}

export function createTexturePaletteSwatch(hex, root = globalThis.document) {
  const swatch = createElement('div', root);
  if (!swatch) return null;
  swatch.className = 'tex-color-swatch w-5 h-5 rounded cursor-pointer border border-zinc-600';
  if (swatch.style) swatch.style.background = hex;
  if (swatch.dataset) swatch.dataset.color = hex;
  return swatch;
}

export function createTextureCanvas(width, height, root = globalThis.document) {
  const canvas = createElement('canvas', root);
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function isTextureCanvas(value, CanvasElementClass = globalThis.HTMLCanvasElement) {
  return Boolean(CanvasElementClass && value instanceof CanvasElementClass);
}

export function createTextureEditorDomAdapter({
  root = globalThis.document,
  CanvasElementClass = globalThis.HTMLCanvasElement,
} = {}) {
  return {
    createTextureCanvas: (width, height) => createTextureCanvas(width, height, root),
    createTextureImageFileInput: () => createTextureImageFileInput(root),
    createTexturePaletteSwatch: (hex) => createTexturePaletteSwatch(hex, root),
    getTextureColorSwatches: () => getTextureColorSwatches(root),
    getTextureEditorModal: () => getTextureEditorModal(root),
    getTextureFaceControls: () => getTextureFaceControls(root),
    getTextureFaceSection: () => getTextureFaceSection(root),
    getTextureFaceSelect: () => getTextureFaceSelect(root),
    getTextureInput: (id) => getTextureInput(id, root),
    getTexturePaintCanvas: () => getTexturePaintCanvas(root),
    getTexturePaletteContainer: () => getTexturePaletteContainer(root),
    getTexturePreviewContainer: () => getTexturePreviewContainer(root),
    getTextureToolButton: (id) => getTextureToolButton(id, root),
    getTextureUVMapCanvas: () => getTextureUVMapCanvas(root),
    getTextureUVOverlay: () => getTextureUVOverlay(root),
    hideTextureEditorModal: () => hideTextureEditorModal(root),
    isTextureCanvas: (value) => isTextureCanvas(value, CanvasElementClass),
    showTextureEditorModal: () => showTextureEditorModal(root),
  };
}
