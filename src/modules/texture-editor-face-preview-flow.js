import {
  createFaceHighlight,
  disposeFaceHighlight,
  pickPreviewFaceIndex,
} from './texture-editor-face-preview.js';
import { selectTextureFaceFromIndex } from './texture-editor-face-selection-flow.js';

export function removeTextureFacePreviewClickListener(state, {
  onPreviewClick,
} = {}) {
  if (!state.previewClickElement) return false;

  if (onPreviewClick) {
    state.previewClickElement.removeEventListener('click', onPreviewClick);
  }
  state.previewClickElement = null;
  return true;
}

export function selectTextureFaceFromPreviewClick(state, event, {
  previewMesh,
  previewRenderer,
  previewCamera,
  pickPreviewFaceIndexCommand = pickPreviewFaceIndex,
  selectFaceFromIndex = selectTextureFaceFromIndex,
  handlers = {},
} = {}) {
  const faceIndex = pickPreviewFaceIndexCommand(event, {
    previewMesh,
    previewRenderer,
    previewCamera,
  });
  return selectFaceFromIndex(state, faceIndex, handlers);
}

export function removeTextureFaceHighlight(state, {
  disposeFaceHighlightCommand = disposeFaceHighlight,
} = {}) {
  state.faceHighlight = disposeFaceHighlightCommand(state.faceHighlight);
  return state.faceHighlight;
}

export function replaceTextureFaceHighlight(state, faceIndex, {
  previewMesh,
  createFaceHighlightCommand = createFaceHighlight,
  disposeFaceHighlightCommand = disposeFaceHighlight,
} = {}) {
  removeTextureFaceHighlight(state, { disposeFaceHighlightCommand });
  state.faceHighlight = createFaceHighlightCommand(previewMesh, faceIndex);
  return state.faceHighlight;
}
