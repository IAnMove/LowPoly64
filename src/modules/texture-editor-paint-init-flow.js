import { TEXTURE_CANVAS_SIZE } from './texture-editor-paint-core.js';
import { bindPaintCanvasEvents } from './texture-editor-paint-events.js';
import {
  clearPaintSurface,
  drawSourceImageToPaintSurface,
  fillPaintSurface,
} from './texture-editor-paint-surface.js';

export function initializeTexturePaintCanvas(mesh, {
  paintCanvas,
  canvasSize = TEXTURE_CANVAS_SIZE,
  resetPaintFlowState = () => {},
  undoHistory,
  saveUndoSnapshot = () => {},
  cleanupPaintCanvasListeners,
  bindPaintCanvasEventsCommand = bindPaintCanvasEvents,
  clearPaintSurfaceCommand = clearPaintSurface,
  drawSourceImageToPaintSurfaceCommand = drawSourceImageToPaintSurface,
  fillPaintSurfaceCommand = fillPaintSurface,
  createCanvas,
  isCanvas,
  eventHandlers = {},
} = {}) {
  if (!paintCanvas) {
    return {
      initialized: false,
      paintCtx: null,
      cleanupPaintCanvasListeners,
      loadedSourceImage: false,
    };
  }

  const paintCtx = paintCanvas.getContext('2d', { willReadFrequently: true });
  paintCanvas.width = canvasSize;
  paintCanvas.height = canvasSize;
  resetPaintFlowState();
  undoHistory?.clear();
  clearPaintSurfaceCommand(paintCtx, { canvasSize });

  const sourceImage = mesh?.material?.map?.image;
  const loadedSourceImage = Boolean(sourceImage) && drawSourceImageToPaintSurfaceCommand(
    paintCtx,
    paintCanvas,
    sourceImage,
    {
      canvasSize,
      createCanvas,
      isCanvas,
    }
  );
  if (!sourceImage) {
    fillPaintSurfaceCommand(paintCtx, { canvasSize });
  }

  saveUndoSnapshot();
  cleanupPaintCanvasListeners?.();
  const nextCleanupPaintCanvasListeners = bindPaintCanvasEventsCommand(paintCanvas, eventHandlers);

  return {
    initialized: true,
    paintCtx,
    cleanupPaintCanvasListeners: nextCleanupPaintCanvasListeners,
    loadedSourceImage,
  };
}
