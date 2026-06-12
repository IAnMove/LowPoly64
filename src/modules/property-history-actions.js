export function createColorChangeAction({
  target,
  oldColor,
  newColor,
  type,
  setColor,
  syncColorPickers,
  shouldRefresh = () => false,
  updatePropertiesPanel = () => {},
}) {
  return {
    type,
    undo: () => {
      setColor(target, oldColor);
      syncColorPickers(oldColor);
      if (shouldRefresh()) updatePropertiesPanel();
    },
    redo: () => {
      setColor(target, newColor);
      syncColorPickers(newColor);
      if (shouldRefresh()) updatePropertiesPanel();
    },
  };
}

export function createMaterialChangeAction({
  target,
  oldType,
  newType,
  type,
  updateMaterialType,
  shouldRefresh = () => false,
  updatePropertiesPanel = () => {},
}) {
  return {
    type,
    undo: () => {
      updateMaterialType(target, oldType);
      if (shouldRefresh()) updatePropertiesPanel();
    },
    redo: () => {
      updateMaterialType(target, newType);
      if (shouldRefresh()) updatePropertiesPanel();
    },
  };
}
