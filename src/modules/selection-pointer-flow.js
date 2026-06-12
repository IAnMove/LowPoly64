import {
  decideDoubleClickSelection,
  decideMouseSelection,
} from './selection-event-decision.js';
import { executeSelectionDecision } from './selection-decision-executor.js';
import {
  findRootSelectionTarget,
  pickSelectionTarget,
  updateRaycasterFromPointer,
} from './selection-raycast.js';

function isMultiSelectionEvent(event, selectionState) {
  return Boolean((event.ctrlKey || event.metaKey) && !selectionState.animationMode);
}

export function getBoneSelectionTarget({
  event,
  selectionState,
  raycaster,
  raycastBones = () => null,
}) {
  if (!selectionState.bonesVisible) return null;
  if (selectionState.animationMode) return null;
  if (isMultiSelectionEvent(event, selectionState)) return null;

  return raycastBones(raycaster);
}

export function getMouseSelectionDecision(event, {
  selectionState,
  raycaster,
  updatePointer = updateRaycasterFromPointer,
  pickTarget = pickSelectionTarget,
  raycastBones = () => null,
  decideSelection = decideMouseSelection,
} = {}) {
  if (selectionState.transformControls?.dragging) {
    return { type: 'ignore' };
  }

  updatePointer(raycaster, event, selectionState.camera, selectionState.renderer.domElement);
  const mesh = pickTarget(raycaster, selectionState.userObjects);
  const pivotFromBone = getBoneSelectionTarget({
    event,
    selectionState,
    raycaster,
    raycastBones,
  });

  return decideSelection({
    mesh,
    pivotFromBone,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    animationMode: selectionState.animationMode,
    bonesVisible: selectionState.bonesVisible,
    selectedMesh: selectionState.selectedMesh,
    selectedMeshes: selectionState.selectedMeshes,
  });
}

export function executeMouseSelectionEvent(event, {
  handlers,
  executeDecision = executeSelectionDecision,
  ...decisionOptions
} = {}) {
  return executeDecision(getMouseSelectionDecision(event, decisionOptions), handlers);
}

export function getDoubleClickSelectionDecision(event, {
  selectionState,
  raycaster,
  updatePointer = updateRaycasterFromPointer,
  pickTarget = pickSelectionTarget,
  findRootTarget = findRootSelectionTarget,
  decideSelection = decideDoubleClickSelection,
} = {}) {
  updatePointer(raycaster, event, selectionState.camera, selectionState.renderer.domElement);
  const mesh = pickTarget(raycaster, selectionState.userObjects);
  const rootTarget = findRootTarget(mesh, selectionState.userObjects);
  return decideSelection(rootTarget);
}

export function executeDoubleClickSelectionEvent(event, {
  handlers,
  executeDecision = executeSelectionDecision,
  ...decisionOptions
} = {}) {
  return executeDecision(getDoubleClickSelectionDecision(event, decisionOptions), handlers);
}
