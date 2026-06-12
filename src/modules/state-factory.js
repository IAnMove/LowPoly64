export const DEFAULT_RETRO_PALETTE = [
  '#ffcc00', '#ff0000', '#00ff00', '#0088ff',
  '#ff8800', '#aa00ff', '#555555', '#ffffff',
  '#8b4513', '#00b74a', '#e60012', '#ffcc66',
];

export function createEditorState(overrides = {}) {
  return {
    scene: null,
    camera: null,
    renderer: null,
    orbitControls: null,
    transformControls: null,
    userObjects: null,
    selectedMesh: null,
    selectedMeshes: new Set(),
    originalEmissive: new Map(),

    animationMixer: null,
    animationAction: null,
    animationPlaying: false,
    animationClipIndex: 0,

    animationMode: false,
    animationModeObject: null,

    wireframeEnabled: false,
    flatShadingEnabled: true,
    bonesVisible: false,
    snapEnabled: false,
    pixelatedMode: true,
    currentMaterialType: 'Lambert',

    retroPalette: [...DEFAULT_RETRO_PALETTE],
    ...overrides,
  };
}
