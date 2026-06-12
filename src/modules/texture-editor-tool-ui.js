import {
  createTextureEditorDomAdapter,
  getTextureColorSwatches,
  getTextureToolButton,
} from './texture-editor-dom.js';

export function updateTextureToolUI({
  brushColor,
  brushSize,
  brushSizes = [],
  eraserMode,
  getColorSwatches = getTextureColorSwatches,
  getToolButton = getTextureToolButton,
  uvMapMode,
}) {
  const isPaint = !eraserMode && !uvMapMode;
  toggleButtonState('tex-tool-brush', isPaint, { getToolButton });
  toggleButtonState('tex-tool-eraser', eraserMode, { getToolButton });
  toggleButtonState('tex-tool-uvmap', uvMapMode, { getToolButton });

  for (let i = 0; i < brushSizes.length; i++) {
    toggleButtonState(`tex-size-${i}`, i === brushSize, { getToolButton });
  }

  getColorSwatches?.()?.forEach((el) => {
    const isSelectedPaintColor = el.dataset?.color === brushColor && !eraserMode && !uvMapMode;
    el.classList?.toggle('ring-2', isSelectedPaintColor);
    el.classList?.toggle('ring-white', isSelectedPaintColor);
  });
}

function toggleButtonState(id, isActive, { getToolButton } = {}) {
  const button = getToolButton?.(id);
  if (!button) return;
  button.classList?.toggle('bg-[#ffcc00]', isActive);
  button.classList?.toggle('text-black', isActive);
}

export function createTextureToolUiAdapter({
  textureEditorDom = createTextureEditorDomAdapter(),
} = {}) {
  return {
    updateTextureToolUI: (options) => updateTextureToolUI({
      ...options,
      getColorSwatches: textureEditorDom.getTextureColorSwatches,
      getToolButton: textureEditorDom.getTextureToolButton,
    }),
  };
}
