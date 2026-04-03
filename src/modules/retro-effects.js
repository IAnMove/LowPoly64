import * as THREE from 'three';
import { state } from './state.js';

// ── Low-res rendering ──────────────────────────────────────────────
const PSX_WIDTH = 320;
const PSX_HEIGHT = 240;

export function toggleLowRes() {
  state.lowResEnabled = !state.lowResEnabled;
  applyLowRes();
  return state.lowResEnabled;
}

export function applyLowRes() {
  const canvas = state.renderer.domElement;
  if (state.lowResEnabled) {
    state.renderer.setPixelRatio(1);
    state.renderer.setSize(PSX_WIDTH, PSX_HEIGHT, false);
    canvas.style.imageRendering = 'pixelated';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  } else {
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvas.style.imageRendering = '';
    canvas.style.width = '';
    canvas.style.height = '';
    // Trigger proper resize
    if (window._retroOnResize) window._retroOnResize();
  }
  state.camera.updateProjectionMatrix();
}

// ── Vertex jitter (PS1 vertex snapping) ────────────────────────────
// Modifies materials' vertex shader to snap vertices to a low-res grid
// in screen space, recreating the PS1's fixed-point math wobble.

const JITTER_SNIPPET = `
  // PS1 vertex jitter
  {
    float jitterRes = 160.0;
    vec4 snapped = gl_Position;
    snapped.xyz /= snapped.w;
    snapped.xy = floor(snapped.xy * jitterRes + 0.5) / jitterRes;
    snapped.xyz *= snapped.w;
    gl_Position = snapped;
  }
`;

export function toggleVertexJitter() {
  state.vertexJitterEnabled = !state.vertexJitterEnabled;
  refreshAllMaterials();
  return state.vertexJitterEnabled;
}

// ── Affine texture mapping (PS1-style) ─────────────────────────────
// PS1 had no perspective-correct texture mapping. We simulate this by
// scaling UVs by clip-space W in the vertex shader, then dividing back
// in the fragment shader, which breaks perspective correction.

const AFFINE_VERTEX_SNIPPET = `
  // PS1 affine texture: multiply vUv by W to break perspective correction
  #ifdef USE_MAP
  vMapUv *= gl_Position.w;
  #endif
`;

const AFFINE_FRAGMENT_SNIPPET_BEFORE = `
  // PS1 affine texture: we need gl_FragCoord.w to undo the W multiply
`;

export function toggleAffineTexture() {
  state.affineTextureEnabled = !state.affineTextureEnabled;
  refreshAllMaterials();
  return state.affineTextureEnabled;
}

// ── Dithering post-process ─────────────────────────────────────────
// Renders scene to a render target, then displays it with a Bayer
// ordered dither that reduces color depth (PS1-style banding).

let ditherQuad = null;
let ditherScene = null;
let ditherCamera = null;
let renderTarget = null;

const DITHER_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DITHER_FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
varying vec2 vUv;

// 4x4 Bayer matrix normalized to 0-1
float bayer4(vec2 pos) {
  vec2 p = floor(mod(pos, 4.0));
  float m[16];
  m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
  m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
  m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
  m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
  int idx = int(p.x) + int(p.y) * 4;
  // Loop to index (GLSL ES doesn't support dynamic indexing)
  float val = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i == idx) { val = m[i]; break; }
  }
  return val / 16.0;
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec2 pixelPos = vUv * resolution;
  float dither = bayer4(pixelPos) - 0.5;
  // Reduce to ~15-bit color (5 bits per channel, like PS1)
  float levels = 32.0;
  color.rgb = floor(color.rgb * levels + dither) / levels;
  color.rgb = clamp(color.rgb, 0.0, 1.0);
  gl_FragColor = color;
}
`;

function ensureDitherPass() {
  if (ditherQuad) return;

  renderTarget = new THREE.WebGLRenderTarget(PSX_WIDTH, PSX_HEIGHT, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      resolution: { value: new THREE.Vector2(PSX_WIDTH, PSX_HEIGHT) },
    },
    vertexShader: DITHER_VERTEX,
    fragmentShader: DITHER_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });

  ditherQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  ditherScene = new THREE.Scene();
  ditherScene.add(ditherQuad);
  ditherCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}

export function toggleDithering() {
  state.ditheringEnabled = !state.ditheringEnabled;
  if (state.ditheringEnabled) ensureDitherPass();
  return state.ditheringEnabled;
}

// ── PSX master toggle ──────────────────────────────────────────────

export function togglePSXMode() {
  state.psxMode = !state.psxMode;
  state.lowResEnabled = state.psxMode;
  state.vertexJitterEnabled = state.psxMode;
  state.ditheringEnabled = state.psxMode;
  state.affineTextureEnabled = state.psxMode;
  applyLowRes();
  refreshAllMaterials();
  if (state.ditheringEnabled) ensureDitherPass();
  return state.psxMode;
}

// ── Render integration ─────────────────────────────────────────────
// Called from the animate loop instead of direct renderer.render()

export function retroRender() {
  if (state.ditheringEnabled && renderTarget && ditherScene) {
    // Render scene to offscreen target
    const container = document.getElementById('viewport');
    const aspect = container ? container.clientWidth / container.clientHeight : 16 / 9;
    const h = PSX_HEIGHT;
    const w = Math.round(h * aspect);
    if (renderTarget.width !== w || renderTarget.height !== h) {
      renderTarget.setSize(w, h);
      ditherQuad.material.uniforms.resolution.value.set(w, h);
    }
    state.renderer.setRenderTarget(renderTarget);
    state.renderer.render(state.scene, state.camera);
    state.renderer.setRenderTarget(null);
    state.renderer.render(ditherScene, ditherCamera);
  } else {
    state.renderer.render(state.scene, state.camera);
  }
}

// ── Material shader injection ──────────────────────────────────────
// Call this on every material to add PS1 vertex jitter.
// Must be called BEFORE the material is first used, or after setting
// material.needsUpdate = true + changing customProgramCacheKey.

export function applyRetroShaderMods(material) {
  if (!material) return;

  const origKey = material.customProgramCacheKey
    ? material.customProgramCacheKey.bind(material)
    : () => '';

  material.customProgramCacheKey = function () {
    return origKey()
      + (state.vertexJitterEnabled ? '_psx_jitter' : '')
      + (state.affineTextureEnabled ? '_psx_affine' : '');
  };

  material.onBeforeCompile = (shader) => {
    if (state.vertexJitterEnabled) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n' + JITTER_SNIPPET
      );
    }
    if (state.affineTextureEnabled) {
      // Multiply UVs by W in vertex shader to break perspective correction
      shader.vertexShader = shader.vertexShader.replace(
        '#include <fog_vertex>',
        AFFINE_VERTEX_SNIPPET + '\n#include <fog_vertex>'
      );
    }
  };
}

function refreshAllMaterials() {
  if (!state.userObjects) return;
  state.userObjects.traverse((child) => {
    if (child.isMesh && child.material) {
      applyRetroShaderMods(child.material);
      child.material.needsUpdate = true;
    }
  });
}

// ── Face colors ────────────────────────────────────────────────────
// Applies per-face (per-triangle) solid colors to a geometry.
// The geometry is converted to non-indexed so each triangle can have
// its own color.

export function applyFaceColors(geometry, faceColorArray) {
  if (!geometry || !Array.isArray(faceColorArray) || faceColorArray.length === 0) return false;

  // Convert to non-indexed so each triangle has independent vertices
  let geo = geometry.index ? geometry.toNonIndexed() : geometry;

  const posCount = geo.attributes.position.count;
  const triCount = posCount / 3;
  const colors = new Float32Array(posCount * 3);
  const tmpColor = new THREE.Color();

  for (let tri = 0; tri < triCount; tri++) {
    // Map face color to triangle: distribute evenly if fewer colors than tris
    const colorIndex = Math.min(
      Math.floor(tri * faceColorArray.length / triCount),
      faceColorArray.length - 1
    );
    tmpColor.set(faceColorArray[colorIndex]);
    for (let v = 0; v < 3; v++) {
      const idx = tri * 3 + v;
      colors[idx * 3] = tmpColor.r;
      colors[idx * 3 + 1] = tmpColor.g;
      colors[idx * 3 + 2] = tmpColor.b;
    }
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  // Copy attributes back to original geometry if we created a new one
  if (geo !== geometry) {
    geometry.index = null;
    geometry.setAttribute('position', geo.attributes.position);
    geometry.setAttribute('normal', geo.attributes.normal);
    geometry.setAttribute('color', geo.attributes.color);
    if (geo.attributes.uv) geometry.setAttribute('uv', geo.attributes.uv);
  }

  return true;
}

export function serializeFaceColors(mesh) {
  if (!mesh || !mesh.userData.faceColorArray) return null;
  return [...mesh.userData.faceColorArray];
}

export function validateFaceColors(def, pieceIndex) {
  if (def === undefined || def === null) return null;
  if (!Array.isArray(def)) return `Piece ${pieceIndex + 1}: faceColors must be an array of hex colors.`;
  if (def.length > 2048) return `Piece ${pieceIndex + 1}: faceColors array too large (max 2048).`;
  const hexRe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  for (let i = 0; i < def.length; i++) {
    if (typeof def[i] !== 'string' || !hexRe.test(def[i])) {
      return `Piece ${pieceIndex + 1}: faceColors[${i}] must be a valid hex color.`;
    }
  }
  return null;
}
