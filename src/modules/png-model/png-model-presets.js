import reefFishUrl from '../../assets/examples/reef-fish.png?url';

export const PNG_MODEL_PRESETS = Object.freeze({
  reefFish: Object.freeze({
    id: 'reef-fish',
    label: 'REEF FISH',
    filename: 'reef-fish.png',
    url: reefFishUrl,
    settings: Object.freeze({
      name: 'REEF FISH',
      targetSize: 5,
      density: 56,
      thickness: 1.5,
      bulge: 0.9,
      depthProfile: 'organic',
      smoothing: 2,
      manualStrength: 0.6,
      edgeDepth: 0.03,
      edgeFalloff: 0.18,
      coverageThreshold: 0.2,
      componentMode: 'largest',
      minComponentCells: 2,
      sideStyle: 'sampled',
      keepDepthRatio: true,
      sideColor: '#0b2f63',
    }),
    depthStrokes: Object.freeze([
      Object.freeze({ tool: 'inflate', u: 0.58, v: 0.50, radius: 20, strength: 0.9 }),
      Object.freeze({ tool: 'inflate', u: 0.74, v: 0.50, radius: 14, strength: 0.68 }),
      Object.freeze({ tool: 'inflate', u: 0.43, v: 0.50, radius: 14, strength: 0.48 }),
      Object.freeze({ tool: 'deflate', u: 0.14, v: 0.50, radius: 12, strength: 0.75 }),
      Object.freeze({ tool: 'deflate', u: 0.48, v: 0.13, radius: 9, strength: 0.55 }),
      Object.freeze({ tool: 'deflate', u: 0.48, v: 0.87, radius: 9, strength: 0.55 }),
      Object.freeze({ tool: 'smooth', u: 0.58, v: 0.50, radius: 25, strength: 0.7 }),
    ]),
  }),
});

export function getPngModelPreset(id) {
  return PNG_MODEL_PRESETS[id] || null;
}
