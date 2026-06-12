import {
  cloneFaceUVData,
  createDefaultFaceUVData,
} from './texture-editor-uv.js';
import {
  applyFaceUVsToMeshes,
  applyGlobalTextureUV,
  getTextureUvInputsForMesh,
} from './texture-editor-face-uv-flow.js';

export function initializeTextureFaceEditing(state, mesh, {
  getFaceSection = () => null,
  getPreviewRenderer = () => null,
  getPreviewMesh = () => null,
  onPreviewClick = () => {},
  writeGlobalUvInputs = () => {},
  cloneFaceUvs = cloneFaceUVData,
  createDefaultFaceUvs = createDefaultFaceUVData,
  applyGlobalTextureUVCommand = applyGlobalTextureUV,
  applyFaceUVsToMeshesCommand = applyFaceUVsToMeshes,
  getTextureUvInputs = getTextureUvInputsForMesh,
} = {}) {
  state.targetMesh = mesh;
  state.selectedFace = -1;
  state.faceHighlight = null;

  const isBox = mesh.userData.geometryType === 'cube';
  const section = getFaceSection();
  if (section) section.classList.toggle('hidden', !isBox);

  if (!isBox) {
    state.faceUVData = [];
    writeGlobalUvInputs(getTextureUvInputs(mesh));
    return false;
  }

  state.faceUVData = mesh.userData.faceUVs
    ? cloneFaceUvs(mesh.userData.faceUVs)
    : createDefaultFaceUvs();

  const previewRenderer = getPreviewRenderer();
  if (previewRenderer) {
    state.previewClickElement = previewRenderer.domElement;
    state.previewClickElement.style.cursor = 'pointer';
    state.previewClickElement.addEventListener('click', onPreviewClick);
  }

  if (mesh.material?.map) {
    applyGlobalTextureUVCommand({
      mesh,
      uvInputs: {
        ox: 0,
        oy: 0,
        rx: 1,
        ry: 1,
        rotDeg: 0,
      },
      rememberTransform: () => {},
    });
  }

  const firstFace = state.faceUVData[0];
  writeGlobalUvInputs({
    ox: firstFace.ou,
    oy: firstFace.ov,
    rx: firstFace.su,
    ry: firstFace.sv,
    rotDeg: firstFace.rot,
  });

  const previewMesh = getPreviewMesh();
  for (let face = 0; face < 6; face += 1) {
    applyFaceUVsToMeshesCommand({
      mesh,
      previewMesh,
      face,
      faceUVData: state.faceUVData,
    });
  }

  return true;
}
