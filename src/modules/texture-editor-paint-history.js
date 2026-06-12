import { TEXTURE_CANVAS_SIZE } from './texture-editor-paint-core.js';

export function createPaintUndoHistory({
  canvasSize = TEXTURE_CANVAS_SIZE,
  maxSnapshots = 50,
} = {}) {
  let snapshots = [];

  function clear() {
    snapshots = [];
  }

  function saveSnapshot(context) {
    snapshots.push(context.getImageData(0, 0, canvasSize, canvasSize));
    if (snapshots.length > maxSnapshots) snapshots.shift();
    return snapshots.length;
  }

  function canUndo() {
    return snapshots.length > 1;
  }

  function undo(context) {
    if (!canUndo()) return null;
    snapshots.pop();
    const previous = snapshots[snapshots.length - 1];
    context.putImageData(previous, 0, 0);
    return previous;
  }

  function size() {
    return snapshots.length;
  }

  return {
    canUndo,
    clear,
    saveSnapshot,
    size,
    undo,
  };
}
