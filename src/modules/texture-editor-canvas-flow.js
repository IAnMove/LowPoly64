import { commitCanvasTextureToMesh } from './texture-editor-commit.js';
import { applyCanvasToTexturePreview } from './texture-editor-preview.js';

export function commitTextureEditorCanvas({
  getEditedMesh = () => null,
  getSelectedEditableMesh = () => null,
  getPaintCanvas = () => null,
  commitCanvasTextureToMeshCommand = commitCanvasTextureToMesh,
} = {}) {
  const mesh = getEditedMesh() || getSelectedEditableMesh();
  return commitCanvasTextureToMeshCommand(mesh, getPaintCanvas());
}

export function previewTextureEditorCanvas({
  getEditedMesh = () => null,
  getPaintCanvas = () => null,
  applyCanvasToTexturePreviewCommand = applyCanvasToTexturePreview,
} = {}) {
  const mesh = getEditedMesh();
  return applyCanvasToTexturePreviewCommand(
    getPaintCanvas(),
    mesh?.userData?.textureTransform
  );
}
