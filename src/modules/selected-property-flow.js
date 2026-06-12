import {
  applyPosition,
  applyRotationDegrees,
  applyScale,
  applyTextureOffset,
  applyTextureRepeat,
  applyTextureRotation,
  getChildMesh,
  getMaterialTypeName,
  getTextureMesh,
  renameObject,
} from './property-commands.js';
import {
  createColorChangeAction,
  createMaterialChangeAction,
} from './property-history-actions.js';

export function runSelectedPositionUpdate({
  selectedObject,
  readPositionInputs,
  applyPositionCommand = applyPosition,
}) {
  if (!selectedObject) return false;
  applyPositionCommand(selectedObject, readPositionInputs());
  return true;
}

export function runSelectedRotationUpdate({
  selectedObject,
  readRotationDegreeInputs,
  applyRotationDegreesCommand = applyRotationDegrees,
}) {
  if (!selectedObject) return false;
  applyRotationDegreesCommand(selectedObject, readRotationDegreeInputs());
  return true;
}

export function runSelectedScaleUpdate({
  selectedObject,
  readScaleInputs,
  applyScaleCommand = applyScale,
}) {
  if (!selectedObject) return false;
  applyScaleCommand(selectedObject, readScaleInputs());
  return true;
}

export function runSelectedNameUpdate({
  selectedObject,
  value,
  renameObjectCommand = renameObject,
  setSelectedName = () => {},
}) {
  if (!selectedObject) return false;
  renameObjectCommand(selectedObject, value);
  setSelectedName(value);
  return true;
}

export function runSelectedColorUpdate({
  selectedObject,
  hex,
  actionType,
  getMaterialTarget = getChildMesh,
  setColor,
  syncColorPickers = () => {},
  pushAction = () => {},
  createAction = createColorChangeAction,
  shouldRefresh = () => false,
  updatePropertiesPanel = () => {},
}) {
  if (!selectedObject) return false;

  const target = getMaterialTarget(selectedObject) || selectedObject;
  if (!target.material?.color) return false;

  const oldColor = `#${target.material.color.getHexString()}`;
  setColor(target, hex);
  syncColorPickers(hex);
  pushAction(createAction({
    target,
    oldColor,
    newColor: hex,
    type: actionType,
    setColor,
    syncColorPickers,
    shouldRefresh,
    updatePropertiesPanel,
  }));
  return true;
}

export function runSelectedMaterialUpdate({
  selectedObject,
  actionType,
  getMaterialTarget = getChildMesh,
  getMaterialInput,
  getMaterialTypeNameCommand = getMaterialTypeName,
  updateMaterialType,
  pushAction = () => {},
  createAction = createMaterialChangeAction,
  shouldRefresh = () => false,
  updatePropertiesPanel = () => {},
}) {
  if (!selectedObject) return false;

  const target = getMaterialTarget(selectedObject) || selectedObject;
  if (!target.material) return false;

  const oldType = getMaterialTypeNameCommand(target);
  const newType = getMaterialInput();
  updateMaterialType(target, newType);
  pushAction(createAction({
    target,
    oldType,
    newType,
    type: actionType,
    updateMaterialType,
    shouldRefresh,
    updatePropertiesPanel,
  }));
  return true;
}

export function runSelectedUvOffsetUpdate({
  selectedObject,
  readUvInputs,
  getTextureTarget = getTextureMesh,
  applyTextureOffsetCommand = applyTextureOffset,
  rememberTextureTransform,
}) {
  const mesh = getTextureTarget(selectedObject);
  if (!mesh) return false;
  applyTextureOffsetCommand(mesh, readUvInputs(), rememberTextureTransform);
  return true;
}

export function runSelectedUvRepeatUpdate({
  selectedObject,
  readUvInputs,
  getTextureTarget = getTextureMesh,
  applyTextureRepeatCommand = applyTextureRepeat,
  rememberTextureTransform,
}) {
  const mesh = getTextureTarget(selectedObject);
  if (!mesh) return false;
  applyTextureRepeatCommand(mesh, readUvInputs(), rememberTextureTransform);
  return true;
}

export function runSelectedUvRotationUpdate({
  selectedObject,
  readUvInputs,
  getTextureTarget = getTextureMesh,
  applyTextureRotationCommand = applyTextureRotation,
  rememberTextureTransform,
}) {
  const mesh = getTextureTarget(selectedObject);
  if (!mesh) return false;
  applyTextureRotationCommand(mesh, readUvInputs(), rememberTextureTransform);
  return true;
}
