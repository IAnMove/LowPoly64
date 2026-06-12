import {
  getChildMesh,
  getMaterialColorHex,
  getMaterialTypeName,
  getSelectionActionVisibility,
} from './property-commands.js';

export function getUvTextureForObject(object) {
  return object?.isMesh && object.material?.map ? object.material.map : null;
}

export function renderSelectedObjectProperties(object, {
  userObjects,
  bonesVisible = false,
  radToDeg,
  showSingleSelectionFields,
  writeObjectProperties,
  setColorInput,
  syncColorPickers,
  setMaterialInput,
  writeUvControls,
  setActionButtonVisibility,
}) {
  if (!object) return false;

  showSingleSelectionFields();
  writeObjectProperties(object, radToDeg);

  const childMesh = getChildMesh(object);
  const materialHex = getMaterialColorHex(childMesh);
  if (materialHex) {
    setColorInput(materialHex);
    syncColorPickers(materialHex);
  }

  if (childMesh?.material) {
    setMaterialInput(getMaterialTypeName(childMesh));
  }

  writeUvControls(getUvTextureForObject(childMesh || object), radToDeg);
  setActionButtonVisibility(getSelectionActionVisibility(object, {
    userObjects,
    bonesVisible,
  }));

  return true;
}
