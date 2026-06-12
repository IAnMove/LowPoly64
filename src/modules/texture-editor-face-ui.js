import {
  getTextureFaceControls,
  getTextureFaceSelect,
  getTextureInput,
} from './texture-editor-dom.js';

export function readTextureUvInputs({
  getInput = getTextureInput,
} = {}) {
  return {
    ox: readNumberInput('tex-uv-ox', 0, getInput),
    oy: readNumberInput('tex-uv-oy', 0, getInput),
    rx: readNumberInput('tex-uv-rx', 1, getInput),
    ry: readNumberInput('tex-uv-ry', 1, getInput),
    rotDeg: readNumberInput('tex-uv-rot', 0, getInput),
  };
}

export function writeGlobalUvInputs({
  ox,
  oy,
  rx,
  ry,
  rotDeg,
}, {
  getInput = getTextureInput,
} = {}) {
  setInputValue('tex-uv-ox', ox.toFixed(2), getInput);
  setInputValue('tex-uv-oy', oy.toFixed(2), getInput);
  setInputValue('tex-uv-rx', rx.toFixed(2), getInput);
  setInputValue('tex-uv-ry', ry.toFixed(2), getInput);
  setInputValue('tex-uv-rot', rotDeg.toFixed(0), getInput);
}

export function renderFaceControls({
  selectedFace,
  faceUVData,
  getSelect = getTextureFaceSelect,
  getControls = getTextureFaceControls,
  getInput = getTextureInput,
} = {}) {
  const selectEl = getSelect();
  const controlsEl = getControls();

  if (selectEl) selectEl.value = selectedFace;

  const data = faceUVData?.[selectedFace];
  if (selectedFace < 0 || !data) {
    controlsEl?.classList.add('hidden');
    return false;
  }

  controlsEl?.classList.remove('hidden');
  const fields = {
    'tex-face-ou': data.ou,
    'tex-face-ov': data.ov,
    'tex-face-su': data.su,
    'tex-face-sv': data.sv,
    'tex-face-rot': data.rot || 0,
  };
  for (const [id, value] of Object.entries(fields)) {
    setInputValue(id, formatFaceInputValue(id, value), getInput);
  }
  return true;
}

function readNumberInput(id, fallback, getInput) {
  const value = Number.parseFloat(getInput(id)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function setInputValue(id, value, getInput) {
  const el = getInput(id);
  if (el) el.value = value;
}

function formatFaceInputValue(id, value) {
  return typeof value === 'number' && id !== 'tex-face-rot'
    ? value.toFixed(2)
    : Math.round(value);
}
