import * as THREE from 'three';
import { getActionContext } from './action-context.js';
import {
  centerCameraOnSelectedObject,
  resetSceneObjects,
} from './scene-action-flow.js';

export function centerCameraOnSelected() {
  const { getActionState } = getActionContext();
  return centerCameraOnSelectedObject({
    actionState: getActionState(),
    createVector3: () => new THREE.Vector3(),
  });
}

export function resetScene() {
  const { getActionState, deselectAll } = getActionContext();
  return resetSceneObjects({
    actionState: getActionState(),
    deselectAll,
  });
}
