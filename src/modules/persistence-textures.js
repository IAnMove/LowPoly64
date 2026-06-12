import * as THREE from 'three';
import { imageToBrowserDataURL } from './browser-canvas-adapter.js';
import { loadImageDataURL } from './browser-image-adapter.js';
import {
  applyTextureTransform,
  configureTexture,
  getTextureTransform,
  rememberTextureTransform,
} from './texture-core.js';

function extractTextureDataURL(mesh, {
  imageToDataURLCommand = imageToBrowserDataURL,
} = {}) {
  const tex = mesh.userData.texture || mesh.material.map;
  if (!tex || !tex.image) return null;
  return imageToDataURLCommand(tex.image, { mimeType: 'image/png' });
}

export function serializeTextureData(mesh, dependencies = {}) {
  if (!mesh.userData.textureEnabled) return null;
  const dataURL = extractTextureDataURL(mesh, dependencies);
  if (!dataURL) return null;

  const data = {
    dataURL,
    colorBeforeTexture: mesh.userData.colorBeforeTexture !== undefined
      ? '#' + new THREE.Color(mesh.userData.colorBeforeTexture).getHexString()
      : null,
    transform: mesh.userData.textureTransform || getTextureTransform(mesh.userData.texture || mesh.material.map),
  };

  if (mesh.userData.faceUVs) {
    data.faceUVs = mesh.userData.faceUVs.map((d) => ({ ...d }));
  }

  return data;
}

function restoreCubeFaceUVs(mesh, faceUVs) {
  mesh.userData.faceUVs = faceUVs.map((d) => ({ ...d }));
  const uvAttr = mesh.geometry.attributes.uv;
  if (!uvAttr) return;

  for (let face = 0; face < 6; face++) {
    const d = faceUVs[face];
    if (!d) continue;
    const base = face * 4;
    const rad = THREE.MathUtils.degToRad(d.rot || 0);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];

    corners.forEach((c, i) => {
      const cx = c[0] - 0.5;
      const cy = c[1] - 0.5;
      const rx = cx * cos - cy * sin + 0.5;
      const ry = cx * sin + cy * cos + 0.5;
      uvAttr.setXY(base + i, d.ou + rx * d.su, d.ov + ry * d.sv);
    });
  }

  uvAttr.needsUpdate = true;
}

export function restoreTexture(mesh, texData, { pixelated = true } = {}) {
  if (!texData || !texData.dataURL) return;

  loadImageDataURL(texData.dataURL).then(({ image }) => {
    const texture = new THREE.Texture(image);
    configureTexture(texture, { pixelated });
    if (texData.transform) {
      applyTextureTransform(texture, texData.transform);
    }

    mesh.userData.texture = texture;
    mesh.userData.textureEnabled = true;
    rememberTextureTransform(mesh, texture);
    if (texData.colorBeforeTexture) {
      mesh.userData.colorBeforeTexture = new THREE.Color(texData.colorBeforeTexture).getHex();
    }

    mesh.material.map = texture;
    mesh.material.color.set(0xffffff);
    mesh.material.needsUpdate = true;

    if (texData.faceUVs && mesh.userData.geometryType === 'cube') {
      restoreCubeFaceUVs(mesh, texData.faceUVs);
    }
  }).catch((error) => {
    console.error(error);
  });
}
