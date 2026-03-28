import { showToast } from './ui.js';

const MAX_HISTORY = 50;
const undoStack = [];
const redoStack = [];

export function pushAction(action) {
  // action: { type: string, undo: () => void, redo: () => void }
  undoStack.push(action);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  // New action clears redo stack
  redoStack.length = 0;
}

export function undo() {
  if (undoStack.length === 0) return;
  const action = undoStack.pop();
  action.undo();
  redoStack.push(action);
  showToast(`Deshacer: ${action.type}`);
}

export function redo() {
  if (redoStack.length === 0) return;
  const action = redoStack.pop();
  action.redo();
  undoStack.push(action);
  showToast(`Rehacer: ${action.type}`);
}

export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
}
