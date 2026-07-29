import { showToast } from './ui-helpers.js';

const MAX_HISTORY = 50;
const undoStack = [];
const redoStack = [];

function disposeAction(action) {
  try {
    action?.dispose?.();
  } catch (error) {
    console.warn('Could not dispose discarded undo state.', error);
  }
}

function disposeStack(stack) {
  stack.splice(0).forEach(disposeAction);
}

export function pushAction(action) {
  // action: { type: string, undo: () => void, redo: () => void, dispose?: () => void }
  undoStack.push(action);
  if (undoStack.length > MAX_HISTORY) {
    disposeAction(undoStack.shift());
  }
  // New action clears redo stack
  disposeStack(redoStack);
}

export function undo() {
  if (undoStack.length === 0) return null;
  const action = undoStack.pop();
  action.undo();
  redoStack.push(action);
  showToast(`Deshacer: ${action.type}`);
  return action.type;
}

export function redo() {
  if (redoStack.length === 0) return null;
  const action = redoStack.pop();
  action.redo();
  undoStack.push(action);
  showToast(`Rehacer: ${action.type}`);
  return action.type;
}

export function clearHistory() {
  disposeStack(undoStack);
  disposeStack(redoStack);
}

export function getHistoryStatus() {
  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoDepth: undoStack.length,
    redoDepth: redoStack.length,
  };
}
