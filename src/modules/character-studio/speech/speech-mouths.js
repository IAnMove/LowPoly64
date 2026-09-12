import * as THREE from 'three';
import { SPEECH_VISEMES, sampleSpeechFrame } from './speech-core.js';

const MIN_SCALE = 0.0001;
const DEFAULTS = Object.freeze({
  mode: 'cutout',
  width: 0.45,
  height: 0.22,
  depth: 0.12,
  skin: '#e9b58e',
});
const MODES = new Set(['svg', 'cutout', 'jaw']);
let mouthSequence = 0;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value, fallback) {
  const number = finite(value, fallback);
  return number > 0 ? number : fallback;
}

function safeColor(value, fallback) {
  try {
    const color = new THREE.Color(value ?? fallback);
    return `#${color.getHexString()}`;
  } catch {
    return fallback;
  }
}

function makeMaterial(color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: safeColor(color, '#ffffff'),
    roughness: 1,
    metalness: 0,
    flatShading: !!options.flatShading,
    transparent: !!options.transparent,
    opacity: options.opacity === undefined ? 1 : options.opacity,
    depthWrite: options.depthWrite !== false,
    side: options.side || THREE.FrontSide,
  });
  material.userData = { ...(material.userData || {}), speechMaterial: true };
  return material;
}

function derivedColors(skin) {
  const base = new THREE.Color(safeColor(skin, DEFAULTS.skin));
  const lip = base.clone().multiplyScalar(0.52);
  const cavity = new THREE.Color('#24151b');
  const tongue = new THREE.Color('#d45463');
  return {
    skin: `#${base.getHexString()}`,
    lip: `#${lip.getHexString()}`,
    cavity: `#${cavity.getHexString()}`,
    tongue: `#${tongue.getHexString()}`,
    teeth: '#fff4dc',
  };
}

function normalizeFrame(frame = {}) {
  const open = clamp(finite(frame.open));
  const wide = clamp(finite(frame.wide));
  const round = clamp(finite(frame.round));
  const rawViseme = String(frame.viseme ?? '').trim().toUpperCase();
  let viseme = rawViseme === 'REST' ? 'rest' : rawViseme;
  if (!SPEECH_VISEMES.includes(viseme)) {
    if (open <= 0.04) viseme = 'rest';
    else if (round >= 0.7 && wide < 0.55) viseme = round > 0.84 ? 'O' : 'U';
    else if (wide >= 0.8) viseme = open < 0.5 ? 'I' : 'E';
    else viseme = 'A';
  }
  return {
    time: Math.max(0, finite(frame.time)),
    open,
    wide,
    round,
    viseme,
  };
}

function sourceFrames(track) {
  if (Array.isArray(track)) return track;
  if (Array.isArray(track?.frames)) return track.frames;
  return [];
}

function normalizedTrackFrames(track) {
  const frames = sourceFrames(track).map((frame) => normalizeFrame(frame));
  if (frames.length > 0) return frames;
  return [normalizeFrame({ time: 0 })];
}

function trackDuration(track, frames) {
  const explicit = finite(track?.duration, NaN);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  return Math.max(0, finite(frames[frames.length - 1]?.time));
}

function svgMarkup(viseme, colors) {
  const dark = colors.cavity;
  const lip = colors.lip;
  const teeth = colors.teeth;
  const tongue = colors.tongue;
  const shapes = {
    rest: `<path d="M28 32 Q64 23 100 32 Q64 38 28 32Z" fill="${lip}"/>`,
    M: `<path d="M27 31 Q64 26 101 31 Q64 36 27 31Z" fill="${lip}"/>`,
    F: `<path d="M24 31 Q64 24 104 31 Q64 39 24 31Z" fill="${dark}"/><path d="M30 30 Q64 25 98 30" stroke="${teeth}" stroke-width="4" fill="none"/>`,
    A: `<path d="M22 29 Q64 10 106 29 Q64 55 22 29Z" fill="${dark}"/><path d="M33 27 Q64 17 95 27 L90 34 Q64 28 38 34Z" fill="${teeth}"/><path d="M43 36 Q64 42 85 36 Q80 47 64 48 Q48 47 43 36Z" fill="${tongue}"/>`,
    E: `<path d="M15 29 Q64 8 113 29 Q64 51 15 29Z" fill="${dark}"/><path d="M24 27 Q64 14 104 27 L99 34 Q64 27 29 34Z" fill="${teeth}"/>`,
    I: `<path d="M20 30 Q64 14 108 30 Q64 47 20 30Z" fill="${dark}"/><path d="M33 27 Q64 18 95 27 L90 33 Q64 29 38 33Z" fill="${tongue}"/>`,
    O: `<ellipse cx="64" cy="32" rx="25" ry="22" fill="${dark}"/><ellipse cx="64" cy="34" rx="14" ry="14" fill="${tongue}"/>`,
    U: `<ellipse cx="64" cy="31" rx="34" ry="18" fill="${dark}"/><path d="M42 33 Q64 50 86 33 Q81 49 64 51 Q47 49 42 33Z" fill="${tongue}"/>`,
  };
  const drawing = shapes[viseme] || shapes.rest;
  const contour = drawing.match(/^<[^>]+\/>/)[0];
  // Clip teeth and tongue to the opening, including the narrow E/I shapes.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" viewBox="0 0 128 64"><defs><clipPath id="opening">${contour}</clipPath></defs><g clip-path="url(#opening)">${drawing}</g></svg>`;
}

function fallbackTexture() {
  const data = new Uint8Array([0, 0, 0, 0]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.userData = { ...(texture.userData || {}), speechTextureFallback: true };
  return texture;
}

function loadSvgTexture(markup) {
  // Node-based unit tests have no Image/document. A transparent fallback keeps
  // the object graph constructible while browser callers receive the real SVG.
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    const texture = fallbackTexture();
    texture.userData.speechSvgMarkup = markup;
    return { texture, ready: Promise.resolve(texture) };
  }
  const fallback = fallbackTexture();
  fallback.userData.speechSvgMarkup = markup;
  const texture = new THREE.Texture();
  texture.userData = { ...(texture.userData || {}), speechSvgMarkup: markup };
  const ready = new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    loader.load(uri, (loaded) => {
      loaded.userData = { ...(loaded.userData || {}), speechSvgMarkup: markup };
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.needsUpdate = true;
      resolve(loaded);
    }, undefined, () => resolve(fallback));
  });
  return { texture, ready };
}

function makePlane(prefix, name, width, height, material, z, geometryFactory = null) {
  const geometry = geometryFactory ? geometryFactory() : new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `${prefix}_${name}`;
  mesh.userData = { speechPart: name, speechNode: true };
  mesh.position.z = z;
  return mesh;
}

function makePolygonGeometry(width, height, segments = 10) {
  const shape = new THREE.Shape();
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const x = Math.cos(angle) * width * 0.5;
    const y = Math.sin(angle) * height * 0.5;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function addNode(group, node) {
  group.add(node);
  return node;
}

function svgScaleFor(frame, viseme) {
  if (frame.viseme !== viseme) return [MIN_SCALE, MIN_SCALE, 1];
  return [0.68 + frame.wide * 0.32, Math.max(0.055, 0.18 + frame.open * 0.82), 1];
}

function cutoutScaleFor(frame, part) {
  if (part === 'opening') return [0.68 + frame.wide * 0.32, Math.max(0.04, 0.1 + frame.open * 0.9), 1];
  if (part === 'teeth') return [Math.max(MIN_SCALE, 0.4 + frame.wide * 0.6), Math.max(MIN_SCALE, frame.open * 0.22), 1];
  if (part === 'tongue') return [Math.max(MIN_SCALE, 0.28 + frame.wide * 0.72), Math.max(MIN_SCALE, frame.open * (0.34 + frame.round * 0.35)), 1];
  if (part === 'lipTop' || part === 'lipBottom') return [0.76 + frame.wide * 0.24, 0.68 + frame.open * 0.32, 1];
  return [1, 1, 1];
}

function jawScaleFor(frame, part) {
  if (part === 'cavity') return [0.74 + frame.wide * 0.26, Math.max(0.08, 0.16 + frame.open * 0.84), 1];
  if (part === 'teeth') return [Math.max(MIN_SCALE, 0.36 + frame.wide * 0.64), Math.max(MIN_SCALE, frame.open * 0.25), 1];
  if (part === 'tongue') return [Math.max(MIN_SCALE, 0.3 + frame.wide * 0.7), Math.max(MIN_SCALE, frame.open * (0.42 + frame.round * 0.3)), 1];
  if (part === 'lips') return [0.78 + frame.wide * 0.22, 0.7 + frame.open * 0.3, 1];
  if (part === 'jaw') return [0.82 + frame.wide * 0.18, 0.78 + frame.open * 0.22, 1];
  return [1, 1, 1];
}

function setScale(node, values) {
  node.scale.set(values[0], values[1], values[2]);
}

function addScaleTrack(tracks, node, frames, scaleFor) {
  const times = frames.map((frame) => frame.time);
  const values = frames.flatMap((frame) => scaleFor(frame));
  tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.scale`, times, values));
}

function buildClip(root, track, name, frames, registerTracks) {
  const tracks = [];
  registerTracks(tracks, frames);
  const clip = new THREE.AnimationClip(name || 'speech', trackDuration(track, frames), tracks);
  clip.userData = { ...(clip.userData || {}), speech: true, loop: true, mouthPrefix: root.userData.speechPrefix };
  return clip;
}

function makeCommonApi(root, prefix, mode, trackBuilder, ready, disposeExtra = null) {
  root.userData = {
    ...(root.userData || {}),
    speechMouth: true,
    speechMode: mode,
    speechPrefix: prefix,
  };
  let currentFrame = normalizeFrame({});
  let disposed = false;

  const api = {
    object: root,
    ready,
    update(frame = {}) {
      if (disposed) return { ...currentFrame };
      currentFrame = normalizeFrame(frame);
      root.userData.speechFrame = { ...currentFrame };
      api._applyFrame?.(currentFrame);
      return { ...currentFrame };
    },
    createClip(track, name = 'speech') {
      const frames = normalizedTrackFrames(track);
      return buildClip(root, track, name, frames, trackBuilder);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      root.traverse((node) => {
        if (node.geometry) geometries.add(node.geometry);
        const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
        nodeMaterials.filter(Boolean).forEach((material) => {
          materials.add(material);
          if (material.map) textures.add(material.map);
          if (material.alphaMap) textures.add(material.alphaMap);
        });
      });
      disposeExtra?.();
      textures.forEach((texture) => texture.dispose?.());
      materials.forEach((material) => material.dispose?.());
      geometries.forEach((geometry) => geometry.dispose?.());
      root.clear();
    },
    _applyFrame: null,
  };
  return api;
}

function createSvgMouth({ prefix, width, height, depth, colors }) {
  const root = new THREE.Group();
  root.name = `${prefix}_ROOT`;
  const parts = new Map();
  const materialByViseme = new Map();
  const loadPromises = [];
  SPEECH_VISEMES.forEach((viseme, index) => {
    const markup = svgMarkup(viseme, colors);
    const loaded = loadSvgTexture(markup);
    loadPromises.push(loaded.ready.then((texture) => {
      materialByViseme.get(viseme).map = texture;
      materialByViseme.get(viseme).needsUpdate = true;
      return texture;
    }));
    const material = makeMaterial('#ffffff', { transparent: true, depthWrite: false, side: THREE.DoubleSide });
    material.userData.speechViseme = viseme;
    const materialByVisemeEntry = material;
    const plane = makePlane(prefix, `SVG_${viseme}`, width, height, materialByVisemeEntry, depth * 0.5 + index * 0.0005);
    parts.set(viseme, plane);
    // Declared after the loop for browser loading callbacks; populated before
    // any callback can fire in normal TextureLoader operation.
    materialByViseme.set(viseme, materialByVisemeEntry);
    addNode(root, plane);
  });

  function applyFrame(frame) {
    parts.forEach((plane, viseme) => setScale(plane, svgScaleFor(frame, viseme)));
  }

  const api = makeCommonApi(
    root,
    prefix,
    'svg',
    (tracks, frames) => parts.forEach((plane, viseme) => addScaleTrack(tracks, plane, frames, (frame) => svgScaleFor(frame, viseme))),
    Promise.all(loadPromises),
  );
  api._applyFrame = applyFrame;
  api.update({});
  return api;
}

function createCutoutMouth({ prefix, width, height, depth, colors }) {
  const root = new THREE.Group();
  root.name = `${prefix}_ROOT`;
  const opening = addNode(root, makePlane(prefix, 'CUTOUT_OPENING', width * 0.94, height * 0.82, makeMaterial(colors.cavity, { side: THREE.DoubleSide }), depth * 0.5, () => makePolygonGeometry(width * 0.94, height * 0.82, 12)));
  const teeth = addNode(root, makePlane(prefix, 'CUTOUT_TEETH', width * 0.72, height * 0.2, makeMaterial(colors.teeth, { side: THREE.DoubleSide }), depth * 0.5 + 0.002, () => makePolygonGeometry(width * 0.72, height * 0.2, 8)));
  const tongue = addNode(root, makePlane(prefix, 'CUTOUT_TONGUE', width * 0.62, height * 0.3, makeMaterial(colors.tongue, { side: THREE.DoubleSide }), depth * 0.5 + 0.003, () => makePolygonGeometry(width * 0.62, height * 0.3, 8)));
  const lipTop = addNode(root, makePlane(prefix, 'CUTOUT_LIP_TOP', width * 1.02, height * 0.08, makeMaterial(colors.lip, { side: THREE.DoubleSide }), depth * 0.5 + 0.004, () => makePolygonGeometry(width * 1.02, height * 0.08, 8)));
  const lipBottom = addNode(root, makePlane(prefix, 'CUTOUT_LIP_BOTTOM', width * 1.02, height * 0.08, makeMaterial(colors.lip, { side: THREE.DoubleSide }), depth * 0.5 + 0.004, () => makePolygonGeometry(width * 1.02, height * 0.08, 8)));
  lipTop.position.y = height * 0.12;
  lipBottom.position.y = -height * 0.12;
  const parts = { opening, teeth, tongue, lipTop, lipBottom };

  function applyFrame(frame) {
    Object.entries(parts).forEach(([part, node]) => setScale(node, cutoutScaleFor(frame, part)));
    const lipEdge = height * (0.12 + frame.open * 0.24);
    lipTop.position.y = lipEdge;
    lipBottom.position.y = -lipEdge;
    tongue.position.y = -height * (0.04 + frame.open * 0.12);
    teeth.position.y = height * (0.04 + frame.open * 0.18);
  }

  const api = makeCommonApi(
    root,
    prefix,
    'cutout',
    (tracks, frames) => {
      addScaleTrack(tracks, opening, frames, (frame) => cutoutScaleFor(frame, 'opening'));
      addScaleTrack(tracks, teeth, frames, (frame) => cutoutScaleFor(frame, 'teeth'));
      addScaleTrack(tracks, tongue, frames, (frame) => cutoutScaleFor(frame, 'tongue'));
      addScaleTrack(tracks, lipTop, frames, (frame) => cutoutScaleFor(frame, 'lipTop'));
      addScaleTrack(tracks, lipBottom, frames, (frame) => cutoutScaleFor(frame, 'lipBottom'));
      tracks.push(new THREE.VectorKeyframeTrack(`${tongue.name}.position`, frames.map((frame) => frame.time), frames.flatMap((frame) => [0, -height * (0.04 + frame.open * 0.12), depth * 0.5 + 0.003])));
      tracks.push(new THREE.VectorKeyframeTrack(`${teeth.name}.position`, frames.map((frame) => frame.time), frames.flatMap((frame) => [0, height * (0.04 + frame.open * 0.18), depth * 0.5 + 0.002])));
      tracks.push(new THREE.VectorKeyframeTrack(`${lipTop.name}.position`, frames.map((frame) => frame.time), frames.flatMap((frame) => [0, height * (0.12 + frame.open * 0.24), depth * 0.5 + 0.004])));
      tracks.push(new THREE.VectorKeyframeTrack(`${lipBottom.name}.position`, frames.map((frame) => frame.time), frames.flatMap((frame) => [0, -height * (0.12 + frame.open * 0.24), depth * 0.5 + 0.004])));
    },
    Promise.resolve(),
  );
  api._applyFrame = applyFrame;
  api.update({});
  return api;
}

function createJawMouth({ prefix, width, height, depth, colors }) {
  const root = new THREE.Group();
  root.name = `${prefix}_ROOT`;
  const cavity = addNode(root, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), makeMaterial(colors.cavity, { flatShading: true })));
  cavity.name = `${prefix}_JAW_CAVITY`;
  cavity.userData = { speechPart: 'cavity', speechNode: true };
  cavity.position.z = depth * 0.1;
  cavity.scale.set(width * 0.46, height * 0.33, depth * 0.36);
  const cavityBaseScale = cavity.scale.clone();
  const teeth = addNode(root, new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), makeMaterial(colors.teeth, { flatShading: true })));
  teeth.name = `${prefix}_JAW_TEETH`;
  teeth.userData = { speechPart: 'teeth', speechNode: true };
  teeth.position.set(0, height * 0.05, depth * 0.48);
  teeth.scale.set(width * 0.34, height * 0.06, depth * 0.09);
  const teethBaseScale = teeth.scale.clone();
  const tongue = addNode(root, new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), makeMaterial(colors.tongue, { flatShading: true })));
  tongue.name = `${prefix}_JAW_TONGUE`;
  tongue.userData = { speechPart: 'tongue', speechNode: true };
  tongue.position.set(0, -height * 0.04, depth * 0.42);
  tongue.scale.set(width * 0.28, height * 0.09, depth * 0.12);
  const tongueBaseScale = tongue.scale.clone();
  const lips = addNode(root, new THREE.Group());
  lips.name = `${prefix}_JAW_LIPS`;
  lips.userData = { speechPart: 'lips', speechNode: true };
  lips.position.z = depth * 0.52;
  const upperLip = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), makeMaterial(colors.lip, { flatShading: true }));
  upperLip.name = `${prefix}_JAW_LIP_UPPER`;
  upperLip.userData = { speechPart: 'upperLip', speechNode: true };
  upperLip.position.y = height * 0.12;
  upperLip.scale.set(width * 0.47, height * 0.055, depth * 0.1);
  const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), makeMaterial(colors.lip, { flatShading: true }));
  lowerLip.name = `${prefix}_JAW_LIP_LOWER`;
  lowerLip.userData = { speechPart: 'lowerLip', speechNode: true };
  lowerLip.position.y = -height * 0.12;
  lowerLip.scale.set(width * 0.47, height * 0.055, depth * 0.1);
  lips.add(upperLip, lowerLip);
  const lipsBaseScale = lips.scale.clone();
  const jawPivot = addNode(root, new THREE.Group());
  jawPivot.name = `${prefix}_JAW_MANDIBLE`;
  jawPivot.userData = { speechPart: 'jaw', speechNode: true };
  jawPivot.position.set(0, -height * 0.25, 0);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 4).scale(width * 0.44, height * 0.12, depth * 0.39), makeMaterial(colors.skin, { flatShading: true }));
  jaw.name = `${prefix}_JAW_BONE`;
  jaw.userData = { speechPart: 'jawBone', speechNode: true };
  jaw.position.set(0, -height * 0.1, 0);
  jawPivot.add(jaw);
  const parts = { cavity, teeth, tongue, lips, jawPivot, jaw };

  function applyFrame(frame) {
    const cavityFrameScale = jawScaleFor(frame, 'cavity');
    cavity.scale.set(
      cavityBaseScale.x * cavityFrameScale[0],
      cavityBaseScale.y * cavityFrameScale[1],
      cavityBaseScale.z * cavityFrameScale[2],
    );
    const teethFrameScale = jawScaleFor(frame, 'teeth');
    teeth.scale.set(
      teethBaseScale.x * teethFrameScale[0],
      teethBaseScale.y * teethFrameScale[1],
      teethBaseScale.z * teethFrameScale[2],
    );
    const tongueFrameScale = jawScaleFor(frame, 'tongue');
    tongue.scale.set(
      tongueBaseScale.x * tongueFrameScale[0],
      tongueBaseScale.y * tongueFrameScale[1],
      tongueBaseScale.z * tongueFrameScale[2],
    );
    const lipsFrameScale = jawScaleFor(frame, 'lips');
    lips.scale.set(
      lipsBaseScale.x * lipsFrameScale[0],
      lipsBaseScale.y * lipsFrameScale[1],
      lipsBaseScale.z * lipsFrameScale[2],
    );
    const lipEdge = height * (0.12 + frame.open * 0.14);
    upperLip.position.y = lipEdge;
    lowerLip.position.y = -lipEdge;
    setScale(jaw, jawScaleFor(frame, 'jaw'));
    jawPivot.rotation.x = -frame.open * (0.15 + frame.round * 0.1);
    jawPivot.position.y = -height * (0.25 + frame.open * 0.07);
  }

  const api = makeCommonApi(
    root,
    prefix,
    'jaw',
    (tracks, frames) => {
      addScaleTrack(tracks, cavity, frames, (frame) => {
        const scale = jawScaleFor(frame, 'cavity');
        return [cavityBaseScale.x * scale[0], cavityBaseScale.y * scale[1], cavityBaseScale.z * scale[2]];
      });
      addScaleTrack(tracks, teeth, frames, (frame) => {
        const scale = jawScaleFor(frame, 'teeth');
        return [teethBaseScale.x * scale[0], teethBaseScale.y * scale[1], teethBaseScale.z * scale[2]];
      });
      addScaleTrack(tracks, tongue, frames, (frame) => {
        const scale = jawScaleFor(frame, 'tongue');
        return [tongueBaseScale.x * scale[0], tongueBaseScale.y * scale[1], tongueBaseScale.z * scale[2]];
      });
      addScaleTrack(tracks, lips, frames, (frame) => {
        const scale = jawScaleFor(frame, 'lips');
        return [lipsBaseScale.x * scale[0], lipsBaseScale.y * scale[1], lipsBaseScale.z * scale[2]];
      });
      addScaleTrack(tracks, jaw, frames, (frame) => jawScaleFor(frame, 'jaw'));
      const jawQuaternions = frames.flatMap((frame) => {
        const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
          -frame.open * (0.15 + frame.round * 0.1),
          0,
          0,
        ));
        return quaternion.toArray();
      });
      tracks.push(new THREE.VectorKeyframeTrack(`${upperLip.name}.position`, frames.map((frame) => frame.time), frames.flatMap((frame) => [0, height * (0.12 + frame.open * 0.14), 0])));
      tracks.push(new THREE.VectorKeyframeTrack(`${lowerLip.name}.position`, frames.map((frame) => frame.time), frames.flatMap((frame) => [0, -height * (0.12 + frame.open * 0.14), 0])));
      tracks.push(new THREE.QuaternionKeyframeTrack(`${jawPivot.name}.quaternion`, frames.map((frame) => frame.time), jawQuaternions));
      tracks.push(new THREE.VectorKeyframeTrack(`${jawPivot.name}.position`, frames.map((frame) => frame.time), frames.flatMap((frame) => [0, -height * (0.25 + frame.open * 0.07), 0])));
    },
    Promise.resolve(),
  );
  api._applyFrame = applyFrame;
  api.update({});
  return api;
}

/**
 * Create an animatable mouth centered at the origin and facing +Z.
 *
 * `ready` resolves after SVG drawings have loaded. All animation is expressed
 * through node transforms so the returned clips remain GLB-compatible.
 */
export function createSpeechMouth(options = {}) {
  const mode = String(options.mode ?? DEFAULTS.mode).trim().toLowerCase();
  if (!MODES.has(mode)) throw new RangeError(`Unknown speech mouth mode: ${mode}`);
  const width = positive(options.width, DEFAULTS.width);
  const height = positive(options.height, DEFAULTS.height);
  const depth = positive(options.depth, DEFAULTS.depth);
  const skin = safeColor(options.skin, DEFAULTS.skin);
  const colors = derivedColors(skin);
  const prefix = `SPEECH_MOUTH_${++mouthSequence}`;
  if (mode === 'svg') return createSvgMouth({ prefix, width, height, depth, colors });
  if (mode === 'jaw') return createJawMouth({ prefix, width, height, depth, colors });
  return createCutoutMouth({ prefix, width, height, depth, colors });
}

// Kept public for consumers that need a stable, JSON-safe sample before
// attaching a mouth. It intentionally delegates to the pure interpolator.
export function sampleSpeechMouthFrame(track, time = 0) {
  return normalizeFrame(sampleSpeechFrame(track, time));
}






