export function getFirstTemplateSelectionTarget(group) {
  return group?.children?.find((child) => child.isMesh || child.userData?.isPivot) || null;
}

export function isObjectInsideGroup(group, object) {
  let current = object;
  while (current) {
    if (current === group) return true;
    current = current.parent;
  }
  return false;
}

export function createTemplateInsertionAction(group, {
  userObjects,
  getSelectedMesh,
  selectMesh,
  deselect,
  actionType,
}) {
  return {
    type: actionType,
    undo: () => {
      if (isObjectInsideGroup(group, getSelectedMesh?.())) {
        deselect?.();
      }
      userObjects.remove(group);
    },
    redo: () => {
      userObjects.add(group);
      const selectionTarget = getFirstTemplateSelectionTarget(group);
      if (selectionTarget) selectMesh?.(selectionTarget);
    },
  };
}

export function insertTemplateGroup(group, {
  userObjects,
  getSelectedMesh,
  selectMesh,
  deselect,
  pushAction,
  actionType,
}) {
  userObjects.add(group);

  const selectionTarget = getFirstTemplateSelectionTarget(group);
  if (selectionTarget) selectMesh?.(selectionTarget);

  pushAction?.(createTemplateInsertionAction(group, {
    userObjects,
    getSelectedMesh,
    selectMesh,
    deselect,
    actionType,
  }));

  return group;
}
