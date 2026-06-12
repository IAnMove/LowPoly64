export function bindCanvasSelectionEvents({
  renderer,
  onMouseDown,
  onDoubleClick,
  onAfterSelectionEvent = () => {},
} = {}) {
  const canvas = renderer?.domElement;
  if (!canvas) return () => {};

  const handleMouseDown = (event) => {
    onMouseDown(event);
    onAfterSelectionEvent(event);
  };
  const handleDoubleClick = (event) => {
    onDoubleClick(event);
    onAfterSelectionEvent(event);
  };

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('dblclick', handleDoubleClick);

  return () => {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('dblclick', handleDoubleClick);
  };
}

export function setupTemplateList({
  root = globalThis.document,
  onLangChange,
  renderTemplateList,
} = {}) {
  const templateList = root?.getElementById?.('template-list');
  if (!templateList) return false;

  renderTemplateList?.(templateList);
  onLangChange?.(() => renderTemplateList?.(templateList));
  return true;
}

export function setupTextureDropZone({
  root = globalThis.document,
  setupTextureDragDrop,
} = {}) {
  const texDropZone = root?.getElementById?.('texture-drop-zone');
  if (!texDropZone) return false;
  setupTextureDragDrop?.(texDropZone);
  return true;
}

export function setupPaletteColorInput({
  root = globalThis.document,
  hasSelectedMesh,
  updateColorFromPanel,
} = {}) {
  const palettePicker = root?.getElementById?.('palette-color-picker');
  if (!palettePicker) return () => {};

  const handleInput = (event) => {
    if (hasSelectedMesh?.()) {
      updateColorFromPanel?.(event.target.value);
    }
  };
  palettePicker.addEventListener('input', handleInput);

  return () => palettePicker.removeEventListener('input', handleInput);
}

export function getMultiColorValue(root = globalThis.document, fallback = '#ffcc00') {
  return root?.getElementById?.('multi-color-picker')?.value || fallback;
}

export function createAppDomSetupAdapter({
  root = globalThis.document,
  defaultColor = '#ffcc00',
} = {}) {
  return {
    getMultiColorValue: () => getMultiColorValue(root, defaultColor),
    setupPaletteColorInput: (options) => setupPaletteColorInput({ root, ...options }),
    setupTemplateList: (options) => setupTemplateList({ root, ...options }),
    setupTextureDropZone: (options) => setupTextureDropZone({ root, ...options }),
  };
}
