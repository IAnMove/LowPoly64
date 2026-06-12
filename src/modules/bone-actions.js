import { getActionContext } from './action-context.js';
import {
  attachSelectedBone,
  detachSelectedBone,
} from './bone-action-flow.js';

export function detachBone() {
  const { getActionState, selectMesh, pushAction, showToast, t } = getActionContext();
  return detachSelectedBone({
    actionState: getActionState(),
    selectMesh,
    pushAction,
    showToast,
    translate: t,
  });
}

export function attachBone(targetParent) {
  const { getActionState, selectMesh, pushAction, showToast, t } = getActionContext();
  return attachSelectedBone(targetParent, {
    actionState: getActionState(),
    selectMesh,
    pushAction,
    showToast,
    translate: t,
  });
}
