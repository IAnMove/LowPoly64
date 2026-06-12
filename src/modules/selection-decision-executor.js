export function executeSelectionDecision(decision, handlers) {
  switch (decision.type) {
    case 'add-to-multi':
      handlers.addToMultiSelection(decision.mesh);
      handlers.updateSelectionUI();
      return true;
    case 'remove-from-multi':
      handlers.removeFromMultiSelection(decision.mesh);
      handlers.updateSelectionUI();
      return true;
    case 'attach-bone':
      handlers.attachBone?.(decision.pivot);
      return true;
    case 'select':
      handlers.deselectAll();
      handlers.selectMesh(decision.mesh);
      return true;
    case 'deselect':
      handlers.deselectAll();
      return true;
    case 'ignore':
    default:
      return false;
  }
}
