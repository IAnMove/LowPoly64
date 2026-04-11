// AI Texture Generation UI — modals, config, prompt expand, pending results
import { showToast } from '../shared/ui-helpers.js';
import {
  generateTexture, getTexGenConfig, saveTexGenConfig,
  fetchOllamaModels, enhancePromptWithOllama, editTile,
} from './texture-generator.js';
import {
  approveToStrip, applyBase64ToCanvas,
  getSelectedStripIdx, getStripTileB64,
} from './texture-editor.js';

// ── Model indicator ──────────────────────────────────────────────
export function buildModelIndicator(cfg) {
  const isOpenAI = cfg.method === 'openai';
  const color = isOpenAI ? '#ffcc00' : '#00ff88';
  const label = isOpenAI
    ? `OPENAI · ${cfg.model || 'gpt-image-1-mini'}`
    : `LOCAL SD · ${(cfg.sdUrl || 'http://127.0.0.1:7860').replace(/^https?:\/\//, '')}`;
  return `<span style="color:${color}">●</span> <span style="color:${color}">${label}</span>`;
}

// ── AI Gen Modal ─────────────────────────────────────────────────
export function openAIGenModal() {
  const cfg = getTexGenConfig();
  const html = buildModelIndicator(cfg);
  const indicator = document.getElementById('ai-gen-model-indicator');
  if (indicator) indicator.innerHTML = html;
  const small = document.getElementById('tex-ai-model-small');
  if (small) small.innerHTML = html;
  document.getElementById('ai-gen-modal').classList.remove('hidden');
}

export function closeAIGenModal() {
  document.getElementById('ai-gen-modal').classList.add('hidden');
}

// ── Config Modal ─────────────────────────────────────────────────
export function openConfigModal() {
  const cfg = getTexGenConfig();

  document.getElementById('cfg-method-openai').classList.toggle('bg-[#ffcc00]', cfg.method === 'openai');
  document.getElementById('cfg-method-openai').classList.toggle('text-black', cfg.method === 'openai');
  document.getElementById('cfg-method-sd').classList.toggle('bg-[#ffcc00]', cfg.method === 'stable-diffusion');
  document.getElementById('cfg-method-sd').classList.toggle('text-black', cfg.method === 'stable-diffusion');
  document.getElementById('cfg-method-select').value = cfg.method;

  document.getElementById('cfg-openai-key').value = '';
  document.getElementById('cfg-openai-key').placeholder = cfg.openaiKey ? '••••••••••••••••••••' : 'sk-...';
  document.getElementById('cfg-openai-model').value = cfg.model;
  document.getElementById('cfg-openai-size').value = cfg.size;
  document.getElementById('cfg-openai-quality').value = cfg.quality;

  document.getElementById('cfg-sd-url').value = cfg.sdUrl;
  document.getElementById('cfg-sd-width').value = cfg.sdWidth;
  document.getElementById('cfg-sd-height').value = cfg.sdHeight;
  document.getElementById('cfg-sd-steps').value = cfg.sdSteps;

  document.getElementById('cfg-ollama-url').value = cfg.ollamaUrl;
  _refreshOllamaModelSelect(cfg.ollamaModel, []);

  _updateConfigSections(cfg.method);
  document.getElementById('config-modal').classList.remove('hidden');
}

export function closeConfigModal() {
  document.getElementById('config-modal').classList.add('hidden');
}

export function onConfigMethodChange(method) {
  document.getElementById('cfg-method-select').value = method;
  document.getElementById('cfg-method-openai').classList.toggle('bg-[#ffcc00]', method === 'openai');
  document.getElementById('cfg-method-openai').classList.toggle('text-black', method === 'openai');
  document.getElementById('cfg-method-sd').classList.toggle('bg-[#ffcc00]', method === 'stable-diffusion');
  document.getElementById('cfg-method-sd').classList.toggle('text-black', method === 'stable-diffusion');
  _updateConfigSections(method);
}

function _updateConfigSections(method) {
  document.getElementById('cfg-section-openai').classList.toggle('hidden', method !== 'openai');
  document.getElementById('cfg-section-sd').classList.toggle('hidden', method !== 'stable-diffusion');
}

export async function loadOllamaModels() {
  const url = document.getElementById('cfg-ollama-url').value.trim();
  const btn = document.getElementById('cfg-ollama-load-btn');
  btn.disabled = true;
  btn.textContent = 'LOADING...';
  try {
    const models = await fetchOllamaModels(url);
    const saved = getTexGenConfig().ollamaModel;
    _refreshOllamaModelSelect(saved, models);
    showToast(`Found ${models.length} Ollama model(s)`);
  } catch (err) {
    showToast('Ollama: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'LOAD MODELS';
  }
}

function _refreshOllamaModelSelect(selectedModel, models) {
  const sel = document.getElementById('cfg-ollama-model-select');
  if (!sel) return;
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = models.length ? '— select model —' : '— click Load Models —';
  sel.appendChild(placeholder);
  models.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === selectedModel) opt.selected = true;
    sel.appendChild(opt);
  });
  if (selectedModel && !models.includes(selectedModel)) {
    const opt = document.createElement('option');
    opt.value = selectedModel;
    opt.textContent = selectedModel + ' (saved)';
    opt.selected = true;
    sel.appendChild(opt);
  }
}

export function saveConfigModal() {
  const method = document.getElementById('cfg-method-select').value;
  saveTexGenConfig({
    method,
    openaiKey:   document.getElementById('cfg-openai-key').value.trim(),
    model:       document.getElementById('cfg-openai-model').value.trim() || 'gpt-image-1-mini',
    size:        document.getElementById('cfg-openai-size').value,
    quality:     document.getElementById('cfg-openai-quality').value,
    sdUrl:       document.getElementById('cfg-sd-url').value.trim(),
    sdWidth:     document.getElementById('cfg-sd-width').value,
    sdHeight:    document.getElementById('cfg-sd-height').value,
    sdSteps:     document.getElementById('cfg-sd-steps').value,
    ollamaUrl:   document.getElementById('cfg-ollama-url').value.trim(),
    ollamaModel: document.getElementById('cfg-ollama-model-select').value,
  });
  closeConfigModal();
  const html = buildModelIndicator(getTexGenConfig());
  ['ai-gen-model-indicator', 'tex-ai-model-small', 'prompt-modal-model-indicator'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
  showToast('Config saved');
}

// ── Prompt expand modal ──────────────────────────────────────────
export function openPromptExpandModal() {
  const small = document.getElementById('tex-gen-prompt');
  const large = document.getElementById('tex-gen-prompt-full');
  if (large && small) large.value = small.value;

  const cfg = getTexGenConfig();
  const enhanceBtn = document.getElementById('prompt-enhance-btn');
  if (enhanceBtn) enhanceBtn.classList.toggle('hidden', !cfg.ollamaModel);

  const html = buildModelIndicator(cfg);
  const promptIndicator = document.getElementById('prompt-modal-model-indicator');
  if (promptIndicator) promptIndicator.innerHTML = html;

  document.getElementById('prompt-expand-modal').classList.remove('hidden');
  if (large) large.focus();
}

export function closePromptExpandModal() {
  const large = document.getElementById('tex-gen-prompt-full');
  const small = document.getElementById('tex-gen-prompt');
  if (large && small) small.value = large.value;
  document.getElementById('prompt-expand-modal').classList.add('hidden');
}

export function applyPromptTemplate(selectEl) {
  const val = selectEl.value;
  if (!val) return;
  const large = document.getElementById('tex-gen-prompt-full');
  if (large) large.value = val;
  selectEl.value = '';
}

// ── Pending result ───────────────────────────────────────────────
let _pendingB64 = null;
let _pendingMode = 'canvas';

export function texApplyGenerated() {
  if (!_pendingB64) return;
  if (_pendingMode === 'strip') {
    approveToStrip(_pendingB64);
    showToast('Added to strip!');
  } else {
    applyBase64ToCanvas(_pendingB64);
    showToast('Applied to canvas');
  }
  clearPending();
}

export function texDiscardGenerated() {
  clearPending();
  showToast('Discarded');
}

export function clearPending() {
  _pendingB64 = null;
  _pendingMode = 'canvas';
  const section = document.getElementById('tex-gen-pending');
  if (section) section.classList.add('hidden');
}

function _showPendingResult(b64, mode) {
  _pendingB64 = b64;
  _pendingMode = mode;

  const img = document.getElementById('tex-gen-preview-img');
  const section = document.getElementById('tex-gen-pending');
  const label = document.getElementById('tex-gen-pending-label');

  if (img) img.src = 'data:image/png;base64,' + b64;
  if (label) label.textContent = mode === 'strip' ? '→ NEW STRIP TILE' : '→ CANVAS';
  if (section) section.classList.remove('hidden');
}

// ── Generate ─────────────────────────────────────────────────────
export async function texGenerate() {
  const promptEl = document.getElementById('tex-gen-prompt');
  const btn = document.getElementById('tex-gen-btn');
  const prompt = promptEl ? promptEl.value.trim() : '';
  if (!prompt) { showToast('Enter a prompt first'); return; }
  await _runGenerate(prompt, btn);
}

export async function texGenerateFromModal() {
  const large = document.getElementById('tex-gen-prompt-full');
  const small = document.getElementById('tex-gen-prompt');
  const btn = document.getElementById('prompt-generate-btn');
  const prompt = large ? large.value.trim() : '';
  if (!prompt) { showToast('Enter a prompt first'); return; }
  if (small) small.value = prompt;
  await _runGenerate(prompt, btn);
  closePromptExpandModal();
}

async function _runGenerate(prompt, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'GENERATING...'; }

  const singleSubject = document.getElementById('tex-single-subject')?.checked;
  const finalPrompt = singleSubject
    ? prompt + ', single subject, centered, fills entire frame, no tiling, no repetition, no sprite sheet'
    : prompt;

  try {
    const b64 = await generateTexture(finalPrompt);
    _showPendingResult(b64, 'canvas');
  } catch (err) {
    showToast('Error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'GENERATE'; }
  }
}

// img2img variation from a strip tile
export async function texGenerateVariation() {
  const idx = getSelectedStripIdx();
  if (idx < 0) { showToast('Select a strip tile first'); return; }
  const srcB64 = getStripTileB64(idx);
  if (!srcB64) return;

  const promptEl = document.getElementById('tex-strip-var-prompt');
  const btn = document.getElementById('tex-strip-var-btn');
  const prompt = promptEl?.value.trim();
  if (!prompt) { showToast('Enter a variation prompt'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'GENERATING...'; }
  try {
    const b64 = await editTile(srcB64, prompt + ', single subject, fills entire frame, same art style');
    _showPendingResult(b64, 'strip');
  } catch (err) {
    showToast('Error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'GENERATE VARIATION'; }
  }
}

// ── Enhance prompt with Ollama ───────────────────────────────────
export async function enhancePrompt() {
  const large = document.getElementById('tex-gen-prompt-full');
  const btn = document.getElementById('prompt-enhance-btn');
  const prompt = large ? large.value.trim() : '';
  if (!prompt) { showToast('Enter a prompt first'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'ENHANCING...'; }
  try {
    const enhanced = await enhancePromptWithOllama(prompt);
    if (large) large.value = enhanced;
    showToast('Prompt enhanced!');
  } catch (err) {
    showToast('Ollama: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'ENHANCE'; }
  }
}
