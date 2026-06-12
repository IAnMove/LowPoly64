export function createConfiguredTexture(image, {
  TextureClass,
  configureTexture,
  pixelated = true,
} = {}) {
  if (typeof TextureClass !== 'function') {
    throw new Error('createConfiguredTexture requires TextureClass');
  }

  const texture = new TextureClass(image);
  configureTexture(texture, { pixelated });
  return texture;
}

export function applyLoadedTextureToSelection({
  texture,
  dataUrl,
  selectedObject,
  getTargetMesh = (object) => object,
  applyTexture = () => false,
  showToast = () => {},
  successMessage = '',
  showPreview = () => {},
  showUvControls = () => {},
} = {}) {
  if (!selectedObject || !texture) return false;

  const target = getTargetMesh(selectedObject) || selectedObject;
  const applied = applyTexture(target, texture);
  if (!applied) return false;

  showToast(successMessage);
  showPreview(dataUrl);
  showUvControls();
  return true;
}

export async function loadTextureFileForSelection(file, {
  loadImageFile,
  TextureClass,
  configureTexture,
  pixelated = true,
  getSelectedObject = () => null,
  getTargetMesh,
  applyTexture,
  showToast = () => {},
  successMessage = '',
  errorPrefix = '',
  showPreview,
  showUvControls,
} = {}) {
  try {
    const { image, dataUrl } = await loadImageFile(file);
    const texture = createConfiguredTexture(image, {
      TextureClass,
      configureTexture,
      pixelated,
    });

    return applyLoadedTextureToSelection({
      texture,
      dataUrl,
      selectedObject: getSelectedObject(),
      getTargetMesh,
      applyTexture,
      showToast,
      successMessage,
      showPreview,
      showUvControls,
    });
  } catch (error) {
    showToast(errorPrefix + (error?.message || ''));
    return false;
  }
}

export function toggleSelectedTexture({
  selectedObject,
  getTargetMesh = (object) => object,
  toggleTexture = () => false,
} = {}) {
  const target = getTargetMesh(selectedObject) || selectedObject;
  return toggleTexture(target);
}

export function togglePixelatedSetting(textureState, {
  nearestFilter,
  linearFilter,
  userObjects = textureState.userObjects,
  applyFilterToObject = () => {},
} = {}) {
  textureState.pixelatedMode = !textureState.pixelatedMode;
  const filter = textureState.pixelatedMode ? nearestFilter : linearFilter;
  applyFilterToObject(userObjects, filter);
  return textureState.pixelatedMode;
}
