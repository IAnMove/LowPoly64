// ── Main entry point (slim shell) ────────────────────────────────
// All window.xxx bindings are in bindings.js.
// Domain logic lives in modules/viewport/, modules/texture/, modules/animation/.

import { initScene } from './modules/viewport/scene.js';
import { onMouseDown, onDoubleClick } from './modules/viewport/selection.js';
import { onKeyDown } from './modules/viewport/shortcuts.js';
import { setupTextureDragDrop } from './modules/shared/textures.js';
import { updateColorFromPanel, updateExportButtonText } from './modules/viewport/ui.js';
import { getAnimationProgress } from './modules/animation/animation.js';
import { state } from './modules/shared/state.js';
import { initI18n, onLangChange } from './modules/shared/i18n.js';
import { refreshObjectList, updateSelectedOverlay } from './modules/viewport/object-list.js';
import { injectAnimationHTML } from './modules/animation/animation-html.js';
import { injectTextureHTML } from './modules/texture/texture-html.js';
import { injectSvgHTML } from './modules/svg/svg-html.js';
import { injectAvatarHTML } from './modules/avatar/avatar-html.js';

// Load all window.xxx bindings and event bus listeners
import './bindings.js';

async function renderTemplateList(templateList) {
  const { generateTemplateListUI } = await import('./modules/viewport/templates.js');
  generateTemplateListUI(templateList);
}

window.__LOWPOLY64_READY__ = false;
window.__LOWPOLY64_STATE__ = state;

document.addEventListener('DOMContentLoaded', () => {
  // Inject domain HTML before anything references it
  injectAnimationHTML();
  injectTextureHTML();
  injectSvgHTML();
  injectAvatarHTML();

  initScene();
  window.__LOWPOLY64_STATE__ = state;
  window.__LOWPOLY64_READY__ = true;
  window.dispatchEvent(new CustomEvent('lowpoly64:ready'));
  initI18n();

  // Canvas events
  state.renderer.domElement.addEventListener('mousedown', (e) => {
    onMouseDown(e);
    setTimeout(() => { updateExportButtonText(); updateSelectedOverlay(); refreshObjectList(); }, 0);
  });
  state.renderer.domElement.addEventListener('dblclick', (e) => {
    onDoubleClick(e);
    setTimeout(() => { updateExportButtonText(); updateSelectedOverlay(); refreshObjectList(); }, 0);
  });

  // Keyboard
  window.addEventListener('keydown', onKeyDown);

  // Generate template list dynamically
  const templateList = document.getElementById('template-list');
  if (templateList) {
    void renderTemplateList(templateList);
    onLangChange(() => { void renderTemplateList(templateList); });
  }

  // Setup texture drag-drop zone
  const texDropZone = document.getElementById('texture-drop-zone');
  if (texDropZone) setupTextureDragDrop(texDropZone);

  // Palette color picker — apply color on change
  const palettePicker = document.getElementById('palette-color-picker');
  if (palettePicker) {
    palettePicker.addEventListener('input', (e) => {
      if (state.selectedMesh) updateColorFromPanel(e.target.value);
    });
  }

  // Properties panel color input
  const propColor = document.getElementById('prop-color');
  if (propColor) {
    propColor.removeAttribute('onchange');
    propColor.addEventListener('change', (e) => updateColorFromPanel(e.target.value));
  }

  // Animation timeline update loop
  function updateTimelineUI() {
    requestAnimationFrame(updateTimelineUI);
    const timeline = document.getElementById('animation-timeline');
    if (!timeline || timeline.classList.contains('hidden')) return;

    const progress = getAnimationProgress();
    const bar = document.getElementById('anim-progress');
    const timeEl = document.getElementById('anim-time');
    const btnPlay = document.getElementById('btn-play');
    const btnStop = document.getElementById('btn-stop');

    if (bar && progress.duration > 0) {
      bar.style.width = `${(progress.time / progress.duration) * 100}%`;
    }
    if (timeEl) {
      timeEl.textContent = `${progress.time.toFixed(1)} / ${progress.duration.toFixed(1)}`;
    }
    if (btnPlay) {
      const playing = state.animationPlaying;
      btnPlay.classList.toggle('bg-[#ffcc00]', !playing);
      btnPlay.classList.toggle('text-black', !playing);
      btnPlay.classList.toggle('bg-green-600', playing);
      btnPlay.classList.toggle('text-white', playing);
    }
    if (btnStop) {
      const stopped = !state.animationPlaying;
      btnStop.classList.toggle('bg-zinc-800', !stopped || state.animationPlaying);
      btnStop.classList.toggle('text-[#ffcc00]', !stopped || state.animationPlaying);
    }
  }
  updateTimelineUI();
});
