import {
  applyAllCubeFaceUVs,
  applyFaceUVsToMeshes,
  applyGlobalTextureUV,
} from './texture-editor-face-uv-flow.js';

export function applyTextureFaceUVs(state, face, {
  previewMesh,
  applyFaceUVsToMeshesCommand = applyFaceUVsToMeshes,
} = {}) {
  return applyFaceUVsToMeshesCommand({
    mesh: state.targetMesh,
    previewMesh,
    face,
    faceUVData: state.faceUVData,
  });
}

export function updateTextureFaceUVField(state, field, value, {
  previewMesh,
  applyFaceUVs = applyTextureFaceUVs,
  updateOverlay = () => {},
  drawAllFaceOverlays = () => {},
} = {}) {
  if (state.selectedFace < 0 || !state.targetMesh) return false;

  const numericValue = Number.parseFloat(value);
  state.faceUVData[state.selectedFace][field] = Number.isFinite(numericValue) ? numericValue : 0;
  applyFaceUVs(state, state.selectedFace, { previewMesh });
  updateOverlay();
  drawAllFaceOverlays();
  return true;
}

export function updateTextureFaceUVFromInputs(state, {
  readTextureUvInputs = () => ({ ox: 0, oy: 0, rx: 1, ry: 1, rotDeg: 0 }),
  previewMesh,
  applyAllCubeFaceUVsCommand = applyAllCubeFaceUVs,
  applyGlobalTextureUVCommand = applyGlobalTextureUV,
  applyPreviewTransform,
  updateFaceUI = () => {},
  updateOverlay = () => {},
} = {}) {
  const mesh = state.targetMesh;
  if (!mesh?.material?.map) return false;

  const { ox, oy, rx, ry, rotDeg } = readTextureUvInputs();
  const uvInputs = { ox, oy, rx, ry, rotDeg };

  if (mesh.userData.geometryType === 'cube' && state.faceUVData.length === 6) {
    applyAllCubeFaceUVsCommand({
      mesh,
      previewMesh,
      faceUVData: state.faceUVData,
      uvInputs,
    });

    if (state.selectedFace >= 0) updateFaceUI();
    updateOverlay();
    return true;
  }

  applyGlobalTextureUVCommand({
    mesh,
    uvInputs,
    applyPreviewTransform,
  });
  return true;
}
