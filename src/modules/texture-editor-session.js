import { createBrowserTextureEditorSession } from './texture-editor-session-browser-adapter.js';

const textureEditorSession = createBrowserTextureEditorSession();

export function resolveTextureEditorMesh() {
  return textureEditorSession.resolveTextureEditorMesh();
}

export function getSelectedEditableMesh() {
  return textureEditorSession.getSelectedEditableMesh();
}

export function showTextureEditorModal() {
  return textureEditorSession.showTextureEditorModal();
}

export function hideTextureEditorModal() {
  return textureEditorSession.hideTextureEditorModal();
}
