import * as THREE from 'three';

export const FACE_COLORS = ['#ff4444', '#44aaff', '#44ff44', '#ffaa00', '#ff44ff', '#44ffff'];

export function createDefaultFaceUVData() {
  return Array.from({ length: 6 }, () => ({ ou: 0, ov: 0, su: 1, sv: 1, rot: 0 }));
}

export function cloneFaceUVData(faceUVs) {
  return faceUVs.map((d) => ({
    ou: d.ou || 0,
    ov: d.ov || 0,
    su: d.su || 1,
    sv: d.sv || 1,
    rot: d.rot || 0,
  }));
}

export function applyFaceUVDataToGeometry(geometry, face, faceUVData) {
  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  const data = faceUVData[face];
  if (!data) return;

  const base = face * 4;
  const rad = THREE.MathUtils.degToRad(data.rot || 0);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];

  corners.forEach((corner, index) => {
    const cx = corner[0] - 0.5;
    const cy = corner[1] - 0.5;
    const rx = cx * cos - cy * sin + 0.5;
    const ry = cx * sin + cy * cos + 0.5;
    uvAttr.setXY(base + index, data.ou + rx * data.su, data.ov + ry * data.sv);
  });

  uvAttr.needsUpdate = true;
}
