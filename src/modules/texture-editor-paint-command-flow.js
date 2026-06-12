import {
  fillPaintSurface,
  replacePaintSurfaceWithImage,
} from './texture-editor-paint-surface.js';
import { loadPaintImageFromFileInput } from './texture-editor-paint-file-flow.js';

const noop = () => {};

function resolveHooks(hooks = {}) {
  return {
    onCommitChange: hooks.onCommitChange || noop,
    onPreviewChange: hooks.onPreviewChange || noop,
  };
}

export function undoTexturePaintSurface({
  paintCtx,
  undoHistory,
  hooks,
} = {}) {
  const restored = undoHistory?.undo(paintCtx);
  if (!restored) return false;

  const resolvedHooks = resolveHooks(hooks);
  resolvedHooks.onPreviewChange();
  resolvedHooks.onCommitChange();
  return true;
}

export function clearTexturePaintSurface({
  paintCtx,
  canvasSize,
  hooks,
  fillPaintSurfaceCommand = fillPaintSurface,
  saveUndoSnapshot = noop,
} = {}) {
  fillPaintSurfaceCommand(paintCtx, { canvasSize });
  saveUndoSnapshot();

  const resolvedHooks = resolveHooks(hooks);
  resolvedHooks.onCommitChange();
  resolvedHooks.onPreviewChange();
  return true;
}

export function loadTexturePaintImage({
  paintCtx,
  canvasSize,
  createFileInput,
  loadImageFile,
  hooks,
  saveUndoSnapshot = noop,
  onError = noop,
  loadPaintImageFromFileInputCommand = loadPaintImageFromFileInput,
  replacePaintSurfaceWithImageCommand = replacePaintSurfaceWithImage,
} = {}) {
  const resolvedHooks = resolveHooks(hooks);
  return loadPaintImageFromFileInputCommand({
    createFileInput,
    loadImageFile,
    applyImage: (image) => replacePaintSurfaceWithImageCommand(paintCtx, image, { canvasSize }),
    saveSnapshot: saveUndoSnapshot,
    onCommitChange: resolvedHooks.onCommitChange,
    onPreviewChange: resolvedHooks.onPreviewChange,
    onError,
  });
}
