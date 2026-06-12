import {
  applyTextureTransform,
  getTextureTransform,
  rememberTextureTransform,
} from './texture-core.js';
import { applyFaceUVDataToGeometry } from './texture-editor-uv.js';

const IDENTITY_TEXTURE_TRANSFORM = {
  offset: [0, 0],
  repeat: [1, 1],
  rotation: 0,
  center: [0.5, 0.5],
};

export function getTextureUvInputsForMesh(mesh, {
  getTransform = getTextureTransform,
  radToDeg = radiansToDegrees,
} = {}) {
  const transform = mesh?.userData?.textureTransform || getTransform(mesh?.material?.map);
  return {
    ox: transform.offset?.[0] ?? 0,
    oy: transform.offset?.[1] ?? 0,
    rx: transform.repeat?.[0] ?? 1,
    ry: transform.repeat?.[1] ?? 1,
    rotDeg: radToDeg(transform.rotation ?? 0),
  };
}

export function applyFaceUVsToMeshes({
  mesh,
  previewMesh,
  face,
  faceUVData,
  applyFaceUVData = applyFaceUVDataToGeometry,
} = {}) {
  if (!mesh) return false;
  applyFaceUVData(mesh.geometry, face, faceUVData);
  if (previewMesh) applyFaceUVData(previewMesh.geometry, face, faceUVData);
  persistFaceUVData(mesh, faceUVData);
  return true;
}

export function applyAllCubeFaceUVs({
  mesh,
  previewMesh,
  faceUVData,
  uvInputs,
  applyFaceUVData = applyFaceUVDataToGeometry,
  applyTransform = applyTextureTransform,
  rememberTransform = rememberTextureTransform,
} = {}) {
  if (!mesh?.material?.map || faceUVData?.length !== 6) return false;

  for (let i = 0; i < 6; i++) {
    faceUVData[i] = {
      ou: uvInputs.ox,
      ov: uvInputs.oy,
      su: uvInputs.rx,
      sv: uvInputs.ry,
      rot: uvInputs.rotDeg,
    };
    applyFaceUVData(mesh.geometry, i, faceUVData);
    if (previewMesh) applyFaceUVData(previewMesh.geometry, i, faceUVData);
  }
  persistFaceUVData(mesh, faceUVData);

  const texture = mesh.material.map;
  applyTransform(texture, IDENTITY_TEXTURE_TRANSFORM);
  rememberTransform(mesh, texture);
  return true;
}

export function applyGlobalTextureUV({
  mesh,
  uvInputs,
  applyTransform = applyTextureTransform,
  rememberTransform = rememberTextureTransform,
  applyPreviewTransform = () => {},
  degToRad = degreesToRadians,
} = {}) {
  const texture = mesh?.material?.map;
  if (!texture) return null;

  const transform = createTextureTransformFromUvInputs(uvInputs, { degToRad });
  applyTransform(texture, transform);
  rememberTransform(mesh, texture);
  applyPreviewTransform(transform);
  return transform;
}

export function createTextureTransformFromUvInputs({
  ox,
  oy,
  rx,
  ry,
  rotDeg,
}, {
  degToRad = degreesToRadians,
} = {}) {
  return {
    offset: [ox, oy],
    repeat: [rx, ry],
    rotation: degToRad(rotDeg),
    center: [0.5, 0.5],
  };
}

function persistFaceUVData(mesh, faceUVData) {
  mesh.userData.faceUVs = faceUVData.map((data) => ({ ...data }));
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}
