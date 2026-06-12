import { getActionContext } from './action-context.js';
import {
  deleteSelectedObject,
  duplicateSelectedObject,
} from './object-action-flow.js';

export function duplicateSelected() {
  const { getActionState, selectMesh, deselect, pushAction, t, cloneTexture } = getActionContext();
  return duplicateSelectedObject({
    actionState: getActionState(),
    selectMesh,
    deselect,
    pushAction,
    translate: t,
    cloneTextureCommand: cloneTexture,
  });
}

export function deleteSelected() {
  const { getActionState, selectMesh, deselect, pushAction, t } = getActionContext();
  return deleteSelectedObject({
    actionState: getActionState(),
    selectMesh,
    deselect,
    pushAction,
    translate: t,
  });
}
