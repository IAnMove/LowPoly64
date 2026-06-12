import { getCanvasPointerPosition } from './texture-editor-paint-core.js';

const noop = () => {};

function resolveHooks(hooks = {}) {
  return {
    isAlternateMode: hooks.isAlternateMode || (() => false),
    onAlternateStart: hooks.onAlternateStart || noop,
    onAlternateMove: hooks.onAlternateMove || noop,
    onAlternateEnd: hooks.onAlternateEnd || noop,
    onPreviewChange: hooks.onPreviewChange || noop,
    onCommitChange: hooks.onCommitChange || noop,
    onAfterCommit: hooks.onAfterCommit || noop,
  };
}

export function createTexturePaintFlowState() {
  return {
    painting: false,
    lastPos: null,
  };
}

export function resetTexturePaintFlowState(state) {
  state.painting = false;
  state.lastPos = null;
}

export function startTexturePaintFlow(state, event, {
  hooks,
  paintCanvas,
  canvasSize,
  getCanvasPointerPositionCommand = getCanvasPointerPosition,
  drawDot = noop,
} = {}) {
  const resolvedHooks = resolveHooks(hooks);
  if (resolvedHooks.isAlternateMode()) {
    resolvedHooks.onAlternateStart(event);
    return 'alternate';
  }

  state.painting = true;
  const pos = getCanvasPointerPositionCommand(event, paintCanvas, canvasSize);
  drawDot(pos.x, pos.y);
  state.lastPos = pos;
  return 'paint';
}

export function moveTexturePaintFlow(state, event, {
  hooks,
  paintCanvas,
  canvasSize,
  getCanvasPointerPositionCommand = getCanvasPointerPosition,
  drawLine = noop,
} = {}) {
  const resolvedHooks = resolveHooks(hooks);
  if (resolvedHooks.isAlternateMode()) {
    resolvedHooks.onAlternateMove(event);
    return 'alternate';
  }

  if (!state.painting) return false;
  const pos = getCanvasPointerPositionCommand(event, paintCanvas, canvasSize);
  const last = state.lastPos || pos;
  drawLine(last.x, last.y, pos.x, pos.y);
  state.lastPos = pos;
  resolvedHooks.onPreviewChange();
  return 'paint';
}

export function endTexturePaintFlow(state, {
  hooks,
  saveUndoSnapshot = noop,
} = {}) {
  const resolvedHooks = resolveHooks(hooks);
  if (resolvedHooks.isAlternateMode()) {
    resolvedHooks.onAlternateEnd();
    return 'alternate';
  }

  if (!state.painting) return false;
  state.painting = false;
  state.lastPos = null;
  saveUndoSnapshot();
  resolvedHooks.onCommitChange();
  resolvedHooks.onAfterCommit();
  return 'paint';
}
