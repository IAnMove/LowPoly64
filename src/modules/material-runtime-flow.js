import { createMeshMaterial } from './material-factory.js';
import {
  applyFlatShadingToObjects,
  applyWireframeToObjects,
  replaceMaterialType,
} from './material-commands.js';
import { applyQuickColor } from './material-quick-color-flow.js';

export function createMaterialFromSettings(materialState, type, options = {}, {
  createMaterial = createMeshMaterial,
} = {}) {
  return createMaterial(type || materialState.currentMaterialType, {
    color: options.color,
    flatShading: options.flatShading ?? materialState.flatShadingEnabled,
    wireframe: options.wireframe ?? materialState.wireframeEnabled,
    map: options.map,
  });
}

export function updateMaterialTypeForSelection(mesh, newType, {
  selectedMesh,
  createMaterial,
  replaceMaterial = replaceMaterialType,
} = {}) {
  return replaceMaterial(mesh, newType, {
    createMaterial,
    preserveEmissive: selectedMesh === mesh,
  });
}

export function toggleFlatShadingSetting(materialState, {
  userObjects = materialState.userObjects,
  applyToObjects = applyFlatShadingToObjects,
} = {}) {
  materialState.flatShadingEnabled = !materialState.flatShadingEnabled;
  applyToObjects(userObjects, materialState.flatShadingEnabled);
  return materialState.flatShadingEnabled;
}

export function toggleWireframeSetting(materialState, {
  userObjects = materialState.userObjects,
  applyToObjects = applyWireframeToObjects,
} = {}) {
  materialState.wireframeEnabled = !materialState.wireframeEnabled;
  applyToObjects(userObjects, materialState.wireframeEnabled);
  return materialState.wireframeEnabled;
}

export function applySelectedQuickColor({
  getSelectedMesh = () => null,
  hex,
  actionType,
  setColor,
  syncColorInputs,
  pushAction,
  applyColor = applyQuickColor,
} = {}) {
  return applyColor({
    selectedMesh: getSelectedMesh(),
    hex,
    actionType,
    setColor,
    syncColorInputs,
    pushAction,
  });
}
