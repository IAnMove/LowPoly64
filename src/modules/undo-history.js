export function createUndoHistory({
  maxHistory = 50,
} = {}) {
  const undoStack = [];
  const redoStack = [];

  function pushAction(action) {
    undoStack.push(action);
    if (undoStack.length > maxHistory) {
      undoStack.shift();
    }
    redoStack.length = 0;
    return action;
  }

  function undo() {
    if (undoStack.length === 0) return null;
    const action = undoStack.pop();
    action.undo();
    redoStack.push(action);
    return action;
  }

  function redo() {
    if (redoStack.length === 0) return null;
    const action = redoStack.pop();
    action.redo();
    undoStack.push(action);
    return action;
  }

  function clearHistory() {
    undoStack.length = 0;
    redoStack.length = 0;
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  return {
    canRedo,
    canUndo,
    clearHistory,
    pushAction,
    redo,
    undo,
  };
}
