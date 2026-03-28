import * as THREE from 'three';

export const state = {
  scene: null,
  camera: null,
  renderer: null,
  orbitControls: null,
  transformControls: null,
  userObjects: null,
  selectedMesh: null,
  selectedMeshes: new Set(),
  originalEmissive: new Map(),

  wireframeEnabled: false,
  flatShadingEnabled: true,
  snapEnabled: false,
  pixelatedMode: true,
  currentMaterialType: 'Lambert',

  retroPalette: [
    '#ffcc00', '#ff0000', '#00ff00', '#0088ff',
    '#ff8800', '#aa00ff', '#555555', '#ffffff',
    '#8b4513', '#00b74a', '#e60012', '#ffcc66',
  ],
};
