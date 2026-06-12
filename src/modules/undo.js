import { createUndoHistory } from './undo-history.js';

const history = createUndoHistory();
const defaultUndoMessage = (action) => `Deshacer: ${action.type}`;
const defaultRedoMessage = (action) => `Rehacer: ${action.type}`;

let showToastCommand = () => {};
let formatUndoMessage = defaultUndoMessage;
let formatRedoMessage = defaultRedoMessage;

export function configureUndoFeedback({
  showToast = () => {},
  undoMessage = defaultUndoMessage,
  redoMessage = defaultRedoMessage,
} = {}) {
  showToastCommand = showToast;
  formatUndoMessage = undoMessage;
  formatRedoMessage = redoMessage;
}

export function resetUndoFeedback() {
  configureUndoFeedback();
}

export function pushAction(action) {
  return history.pushAction(action);
}

export function undo() {
  const action = history.undo();
  if (action) {
    showToastCommand(formatUndoMessage(action));
  }
  return action;
}

export function redo() {
  const action = history.redo();
  if (action) {
    showToastCommand(formatRedoMessage(action));
  }
  return action;
}

export function clearHistory() {
  history.clearHistory();
}
