import { createColorChangeAction } from './property-history-actions.js';

export function applyQuickColor({
  selectedMesh,
  hex,
  actionType,
  setColor,
  syncColorInputs,
  pushAction,
  createAction = createColorChangeAction,
}) {
  if (!selectedMesh) return false;

  const oldColor = `#${selectedMesh.material.color.getHexString()}`;
  setColor(selectedMesh, hex);
  syncColorInputs(hex);
  pushAction(createAction({
    target: selectedMesh,
    oldColor,
    newColor: hex,
    type: actionType,
    setColor,
    syncColorPickers: syncColorInputs,
  }));

  return true;
}
