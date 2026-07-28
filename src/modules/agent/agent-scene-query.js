import * as THREE from 'three';
import { state } from '../shared/state.js';
import { getHistoryStatus } from '../shared/undo.js';
import {
  ensureAgentId,
  getAddressableObjects,
  normalizeAgentIds,
} from './agent-object-ids.js';
import { sanitizeUntrustedText } from './tool-validation.js';

function rounded(value, precision = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function vectorToArray(vector) {
  return [rounded(vector.x), rounded(vector.y), rounded(vector.z)];
}

function materialType(material) {
  if (material?.isMeshBasicMaterial) return 'Basic';
  if (material?.isMeshPhongMaterial) return 'Phong';
  if (material?.isMeshStandardMaterial) return 'Standard';
  return 'Lambert';
}

function firstEditableMaterial(object) {
  let found = null;
  object?.traverse?.((child) => {
    if (!found && child.isMesh && child.material) found = child.material;
  });
  if (!found && object?.isMesh) found = object.material;
  return found;
}

function countDescendants(object) {
  let meshCount = 0;
  let groupCount = 0;
  object?.traverse?.((child) => {
    if (child === object) return;
    if (child.isMesh) meshCount += 1;
    if (child.isGroup) groupCount += 1;
  });
  return { meshCount, groupCount };
}

export function getSelectedObjects() {
  if (state.selectedMeshes?.size > 0) return [...state.selectedMeshes];
  return state.selectedMesh ? [state.selectedMesh] : [];
}

export function getSelectedAgentIds() {
  normalizeAgentIds(state.userObjects);
  return getSelectedObjects()
    .filter((object) => object && !object.userData?.isProxy)
    .map((object) => ensureAgentId(object));
}

export function summarizeObject(object, detail = 'compact') {
  const id = ensureAgentId(object);
  const parentId = object.parent?.userData?.agentId || null;
  const result = {
    id,
    parentId,
    name: sanitizeUntrustedText(object.userData?.name || object.name || 'Object', 120),
    kind: object.userData?.isPivot ? 'pivot' : object.isGroup ? 'group' : 'mesh',
    selected: object === state.selectedMesh || state.selectedMeshes?.has(object) || false,
    transform: {
      position: vectorToArray(object.position),
      rotation_degrees: [
        rounded(THREE.MathUtils.radToDeg(object.rotation.x)),
        rounded(THREE.MathUtils.radToDeg(object.rotation.y)),
        rounded(THREE.MathUtils.radToDeg(object.rotation.z)),
      ],
      scale: vectorToArray(object.scale),
    },
  };

  if (detail !== 'full') return result;

  const descendants = countDescendants(object);
  const material = firstEditableMaterial(object);
  const box = new THREE.Box3().setFromObject(object);
  result.children = {
    direct: object.children?.length || 0,
    meshes: object.isMesh ? 1 : descendants.meshCount,
    groups: descendants.groupCount,
  };
  result.appearance = material ? {
    material: materialType(material),
    color: material.color ? `#${material.color.getHexString()}` : null,
    opacity: rounded(material.opacity ?? 1),
    transparent: Boolean(material.transparent),
  } : null;
  result.geometry = object.isMesh ? {
    type: sanitizeUntrustedText(object.userData?.geometryType || object.geometry?.type || 'unknown', 80),
    vertexCount: object.geometry?.attributes?.position?.count || 0,
  } : null;
  result.bounds = box.isEmpty() ? null : {
    min: vectorToArray(box.min),
    max: vectorToArray(box.max),
    size: vectorToArray(box.getSize(new THREE.Vector3())),
  };
  return result;
}

export function getSceneSummary({ includeBounds = true } = {}) {
  const objects = getAddressableObjects(state.userObjects);
  let meshCount = 0;
  let groupCount = 0;
  state.userObjects?.traverse?.((object) => {
    if (object.isMesh) meshCount += 1;
    if (object.isGroup && object !== state.userObjects) groupCount += 1;
  });

  const result = {
    objectCount: objects.length,
    topLevelCount: state.userObjects?.children?.length || 0,
    meshCount,
    groupCount,
    selectedIds: getSelectedAgentIds(),
    editorMode: state.animationMode ? 'animation' : 'scene',
    history: getHistoryStatus(),
  };
  if (includeBounds) {
    const box = new THREE.Box3().setFromObject(state.userObjects);
    result.bounds = box.isEmpty() ? null : {
      min: vectorToArray(box.min),
      max: vectorToArray(box.max),
      size: vectorToArray(box.getSize(new THREE.Vector3())),
    };
  }
  return result;
}

export function getApplicationStatus() {
  return {
    ready: Boolean(state.scene && state.camera && state.renderer && state.userObjects),
    application: 'Retrovisor',
    editorVersion: document.querySelector('meta[name="app-version"]')?.content || null,
    active: document.visibilityState !== 'hidden',
    visibility: document.visibilityState,
    scene: getSceneSummary({ includeBounds: false }),
  };
}
