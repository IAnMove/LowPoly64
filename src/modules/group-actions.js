import * as THREE from 'three';
import { getActionContext } from './action-context.js';
import {
  groupSelectedObjects,
  ungroupSelectedObject,
} from './group-action-flow.js';

export function groupSelected() {
  const { getActionState, selectMesh, deselectAll, pushAction, t } = getActionContext();
  return groupSelectedObjects({
    actionState: getActionState(),
    GroupClass: THREE.Group,
    selectMesh,
    deselectAll,
    pushAction,
    translate: t,
  });
}

export function ungroupSelected() {
  const { getActionState, selectMesh, deselectAll, pushAction, t } = getActionContext();
  return ungroupSelectedObject({
    actionState: getActionState(),
    selectMesh,
    deselectAll,
    pushAction,
    translate: t,
  });
}
