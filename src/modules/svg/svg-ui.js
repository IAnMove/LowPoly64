import { state } from '../shared/state.js';
import { t } from '../shared/i18n.js';
import { showToast } from '../shared/ui-helpers.js';
import { pushAction } from '../shared/undo.js';
import { refreshObjectList, updateSelectedOverlay } from '../viewport/object-list.js';
import { selectMesh } from '../viewport/selection.js';
import { emit } from '../../event-bus.js';
import {
  SVG_SOURCE_MODE,
  cloneSvgImportSettings,
  createSvgSourceMetadata,
  getSvgImportSettings,
  getSvgSourceMetadata,
} from './svg-metadata.js';
import { SVG_SAMPLE_SOURCES } from './sample-sources.js';
import { clonePixelGrid, createEmptyPixelGrid, pixelsToSvg } from './pixel-svg.js';
import { DEFAULT_SVG_TEXT_FONT, getSvgTextFontCatalog, textToSvgMarkup } from './text-svg.js';
import { prepareSvgForExtrusion } from './svg-extrusion.js';
import {
  buildGroupWithSvgHead,
  canApplySvgHeadToGroup,
  getStoredHeadSlotSource,
} from './svg-head-integration.js';
import {
  applySvgGroupSnapshot,
  cloneSvgGroupSnapshot,
  createSvgGroupFromSource,
  findSvgMountTarget,
  insertSvgGroup,
  mountSvgGroupToTarget,
} from './svg-model.js';

const PIXEL_GRID_SIZE = 16;
const PIXEL_CANVAS_SIZE = 192;
const SOURCE_MODES = [
  SVG_SOURCE_MODE.CODE,
  SVG_SOURCE_MODE.FILE,
  SVG_SOURCE_MODE.PIXEL,
  SVG_SOURCE_MODE.TEXT,
];

const workbenchState = {
  initialized: false,
  open: false,
  targetGroup: null,
  headTargetGroup: null,
  sourceMode: SVG_SOURCE_MODE.CODE,
  markup: '',
  filename: '',
  pixelGridSize: PIXEL_GRID_SIZE,
  pixelGrid: createEmptyPixelGrid(PIXEL_GRID_SIZE),
  textValue: 'RETRO',
  fontName: DEFAULT_SVG_TEXT_FONT,
  settings: cloneSvgImportSettings(),
  previewToken: 0,
  previewTimer: null,
  previewUrl: null,
  previewSource: null,
  previewAnalysis: null,
  isBusy: false,
  dragValue: null,
  abortController: null,
};

function getElement(id) {
  return document.getElementById(id);
}

function resetPreviewUrl() {
  if (workbenchState.previewUrl) {
    URL.revokeObjectURL(workbenchState.previewUrl);
    workbenchState.previewUrl = null;
  }
}

function createDefaultState() {
  workbenchState.targetGroup = null;
  workbenchState.headTargetGroup = null;
  workbenchState.sourceMode = SVG_SOURCE_MODE.CODE;
  workbenchState.markup = '';
  workbenchState.filename = '';
  workbenchState.pixelGridSize = PIXEL_GRID_SIZE;
  workbenchState.pixelGrid = createEmptyPixelGrid(PIXEL_GRID_SIZE);
  workbenchState.textValue = 'RETRO';
  workbenchState.fontName = DEFAULT_SVG_TEXT_FONT;
  workbenchState.settings = cloneSvgImportSettings();
  workbenchState.previewSource = null;
  workbenchState.previewAnalysis = null;
  workbenchState.previewToken += 1;
  resetPreviewUrl();
}

function applyLoadedSource(source = null, settings = null, targetGroup = null, headTargetGroup = null) {
  createDefaultState();
  workbenchState.targetGroup = targetGroup || null;
  workbenchState.headTargetGroup = headTargetGroup || null;
  workbenchState.settings = cloneSvgImportSettings(settings || {});

  if (!source) return;

  workbenchState.sourceMode = SOURCE_MODES.includes(source.mode) ? source.mode : SVG_SOURCE_MODE.CODE;
  workbenchState.markup = typeof source.markup === 'string' ? source.markup : '';
  workbenchState.filename = typeof source.filename === 'string' ? source.filename : '';
  workbenchState.textValue = source.inputs?.text || 'RETRO';
  workbenchState.fontName = source.inputs?.fontName || DEFAULT_SVG_TEXT_FONT;

  const loadedGridSize = Number.isInteger(source.inputs?.gridSize) ? source.inputs.gridSize : PIXEL_GRID_SIZE;
  if (workbenchState.sourceMode === SVG_SOURCE_MODE.PIXEL) {
    workbenchState.pixelGridSize = loadedGridSize;
    workbenchState.pixelGrid = Array.isArray(source.inputs?.pixels)
      ? clonePixelGrid(source.inputs.pixels)
      : createEmptyPixelGrid(loadedGridSize);
  }
}

function updateSceneUi() {
  refreshObjectList();
  updateSelectedOverlay();
  emit('scene:objects-changed');
}

function setStatus(message, { error = false } = {}) {
  const statusEl = getElement('svg-status');
  if (!statusEl) return;
  statusEl.textContent = message || 'Idle.';
  statusEl.className = `bg-zinc-950 border rounded p-3 text-[8px] leading-relaxed min-h-[64px] ${
    error ? 'border-red-500/60 text-red-300' : 'border-zinc-700 text-zinc-400'
  }`;
}

function setAnalysisText(message, { riskLevel = 'ok' } = {}) {
  const analysisEl = getElement('svg-analysis');
  if (!analysisEl) return;
  const riskClass = riskLevel === 'danger'
    ? 'border-red-500/60 text-red-300'
    : riskLevel === 'warning'
      ? 'border-[#ff8800]/60 text-[#ffcc88]'
      : 'border-zinc-700 text-zinc-400';
  analysisEl.textContent = message;
  analysisEl.className = `bg-zinc-950 border rounded p-3 text-[8px] leading-relaxed min-h-[88px] ${riskClass}`;
}

function setPreviewMarkup(markup) {
  const img = getElement('svg-preview-image');
  const empty = getElement('svg-preview-empty');
  if (!img || !empty) return;

  resetPreviewUrl();
  if (!markup) {
    img.classList.add('hidden');
    img.removeAttribute('src');
    empty.classList.remove('hidden');
    return;
  }

  workbenchState.previewUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  img.src = workbenchState.previewUrl;
  img.classList.remove('hidden');
  empty.classList.add('hidden');
}

function sanitizeNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function syncSettingsFromForm() {
  workbenchState.settings = cloneSvgImportSettings({
    ...workbenchState.settings,
    name: getElement('svg-name-input')?.value?.trim() || 'SVG MODEL',
    depth: sanitizeNumber(getElement('svg-depth-input')?.value, 1, 0.1, 20),
    smoothness: sanitizeNumber(getElement('svg-smoothness-input')?.value, 0.2, 0, 1),
    targetSize: sanitizeNumber(getElement('svg-target-size-input')?.value, 4, 0.5, 50),
    renderMode: getElement('svg-render-mode-input')?.value || 'auto',
    color: getElement('svg-color-input')?.value || '#ffcc00',
    autoMount: !!getElement('svg-auto-mount-input')?.checked,
    forceRasterize: !!getElement('svg-force-rasterize-input')?.checked,
    rasterizeGridSize: sanitizeNumber(getElement('svg-grid-size-input')?.value, 64, 8, 256),
    bevelEnabled: !!getElement('svg-bevel-enabled-input')?.checked,
  });
}

function resolveSettingsForSource(source, settings = workbenchState.settings) {
  const preserveColors = source?.mode === SVG_SOURCE_MODE.CODE || source?.mode === SVG_SOURCE_MODE.FILE;
  return cloneSvgImportSettings({
    ...settings,
    preserveColors,
  });
}

function renderSettingsForm() {
  const settings = workbenchState.settings;
  if (getElement('svg-name-input')) getElement('svg-name-input').value = settings.name || 'SVG MODEL';
  if (getElement('svg-depth-input')) getElement('svg-depth-input').value = `${settings.depth ?? 1}`;
  if (getElement('svg-smoothness-input')) getElement('svg-smoothness-input').value = `${settings.smoothness ?? 0.2}`;
  if (getElement('svg-target-size-input')) getElement('svg-target-size-input').value = `${settings.targetSize ?? 4}`;
  if (getElement('svg-render-mode-input')) getElement('svg-render-mode-input').value = settings.renderMode || 'auto';
  if (getElement('svg-color-input')) getElement('svg-color-input').value = settings.color || '#ffcc00';
  if (getElement('svg-auto-mount-input')) getElement('svg-auto-mount-input').checked = settings.autoMount !== false;
  if (getElement('svg-force-rasterize-input')) getElement('svg-force-rasterize-input').checked = !!settings.forceRasterize;
  if (getElement('svg-grid-size-input')) getElement('svg-grid-size-input').value = `${settings.rasterizeGridSize ?? 64}`;
  if (getElement('svg-bevel-enabled-input')) getElement('svg-bevel-enabled-input').checked = settings.bevelEnabled !== false;
}

function renderSubtitle() {
  const subtitle = getElement('svg-workbench-subtitle');
  const confirm = getElement('svg-confirm-btn');
  const applyHeadBtn = getElement('svg-apply-head-btn');
  if (!subtitle || !confirm) return;

  if (workbenchState.targetGroup) {
    subtitle.textContent = `Editing SVG source for ${workbenchState.targetGroup.userData?.name || 'selected object'}`;
    confirm.textContent = 'UPDATE SVG OBJECT';
    if (applyHeadBtn) applyHeadBtn.classList.add('hidden');
  } else if (workbenchState.headTargetGroup) {
    subtitle.textContent = `Preparing a reusable SVG head for ${workbenchState.headTargetGroup.userData?.name || 'selected humanoid'}`;
    confirm.textContent = 'IMPORT SVG';
    if (applyHeadBtn) applyHeadBtn.classList.remove('hidden');
  } else {
    subtitle.textContent = 'Import or generate an SVG-derived model';
    confirm.textContent = 'IMPORT SVG';
    if (applyHeadBtn) applyHeadBtn.classList.add('hidden');
  }
}

function buildSampleLibraryMarkup() {
  const libraries = [
    { id: 'general', label: 'GENERAL' },
    { id: 'head', label: 'HEAD LIBRARY' },
  ];

  return libraries.map((library) => {
    const sectionMap = new Map();

    Object.entries(SVG_SAMPLE_SOURCES).forEach(([sampleKey, sample]) => {
      if ((sample.library || 'general') !== library.id) return;
      const section = sample.section || 'Samples';
      const entries = sectionMap.get(section) || [];
      entries.push({ sampleKey, sample });
      sectionMap.set(section, entries);
    });

    if (sectionMap.size === 0) return '';

    const sectionsMarkup = [...sectionMap.entries()].map(([section, entries]) => {
      const buttons = entries.map(({ sampleKey, sample }) => `
        <button type="button" data-svg-sample-key="${sampleKey}" class="text-[8px] px-2 py-1 border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-[#00d0ff] hover:text-[#00d0ff]">
          ${sample.buttonLabel || sample.name || sampleKey}
        </button>
      `).join('');

      return `
        <div class="space-y-2">
          <div class="text-zinc-600 text-[7px] tracking-[0.14em] uppercase">${section}</div>
          <div class="flex flex-wrap gap-2">${buttons}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="space-y-2">
        <div class="text-[8px] text-[#00d0ff] tracking-[0.2em] uppercase">${library.label}</div>
        ${sectionsMarkup}
      </div>
    `;
  }).join('');
}

function renderSampleLibrary() {
  const container = getElement('svg-sample-groups');
  if (!container) return;
  container.innerHTML = buildSampleLibraryMarkup();
}

function renderHeadTargetPanel() {
  const panel = getElement('svg-head-target-panel');
  const text = getElement('svg-head-target-text');
  const applyHeadBtn = getElement('svg-apply-head-btn');
  if (!panel || !text || !applyHeadBtn) return;

  if (!workbenchState.headTargetGroup) {
    panel.classList.add('hidden');
    text.textContent = 'No humanoid target selected.';
    applyHeadBtn.classList.add('hidden');
    return;
  }

  const storedHead = getStoredHeadSlotSource(workbenchState.headTargetGroup);
  panel.classList.remove('hidden');
  text.textContent = storedHead
    ? `Target: ${workbenchState.headTargetGroup.userData?.name || 'HUMANOID'} / HEAD. Existing SVG head source loaded.`
    : `Target: ${workbenchState.headTargetGroup.userData?.name || 'HUMANOID'} / HEAD. This will replace the current head slot.`;
  applyHeadBtn.classList.remove('hidden');
}

function renderModeButtons() {
  SOURCE_MODES.forEach((mode) => {
    const button = getElement(`svg-mode-${mode}`);
    if (!button) return;
    const active = workbenchState.sourceMode === mode;
    button.classList.toggle('bg-[#ffcc00]', active);
    button.classList.toggle('text-black', active);
    button.classList.toggle('bg-zinc-800', !active);
    button.classList.toggle('text-[#00d0ff]', !active);
  });
}

function renderSourcePanels() {
  const sections = {
    [SVG_SOURCE_MODE.CODE]: getElement('svg-source-code'),
    [SVG_SOURCE_MODE.FILE]: getElement('svg-source-file'),
    [SVG_SOURCE_MODE.PIXEL]: getElement('svg-source-pixel'),
    [SVG_SOURCE_MODE.TEXT]: getElement('svg-source-text'),
  };

  Object.entries(sections).forEach(([mode, element]) => {
    if (!element) return;
    element.classList.toggle('hidden', workbenchState.sourceMode !== mode);
  });

  if (getElement('svg-code-textarea')) getElement('svg-code-textarea').value = workbenchState.markup;
  if (getElement('svg-file-textarea')) getElement('svg-file-textarea').value = workbenchState.markup;
  if (getElement('svg-file-label')) getElement('svg-file-label').textContent = workbenchState.filename || 'No file loaded';
  if (getElement('svg-text-input')) getElement('svg-text-input').value = workbenchState.textValue;
  if (getElement('svg-font-select')) getElement('svg-font-select').value = workbenchState.fontName;
}

function renderPixelGrid() {
  const gridEl = getElement('svg-pixel-grid');
  if (!gridEl) return;

  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${workbenchState.pixelGridSize}, minmax(0, 1fr))`;
  gridEl.style.gridTemplateRows = `repeat(${workbenchState.pixelGridSize}, minmax(0, 1fr))`;
  gridEl.style.width = `${PIXEL_CANVAS_SIZE}px`;
  gridEl.style.height = `${PIXEL_CANVAS_SIZE}px`;

  for (let y = 0; y < workbenchState.pixelGridSize; y++) {
    for (let x = 0; x < workbenchState.pixelGridSize; x++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.dataset.x = `${x}`;
      cell.dataset.y = `${y}`;
      cell.className = workbenchState.pixelGrid[y]?.[x]
        ? 'bg-[#ffcc00] border border-[#ffcc00]/40'
        : 'bg-zinc-800 border border-zinc-900';
      cell.style.width = '100%';
      cell.style.height = '100%';
      gridEl.appendChild(cell);
    }
  }
}

function renderWorkbench() {
  renderSubtitle();
  renderSampleLibrary();
  renderHeadTargetPanel();
  renderSettingsForm();
  renderModeButtons();
  renderSourcePanels();
  renderPixelGrid();
}

function schedulePreview(delay = 180) {
  if (!workbenchState.open) return;
  if (workbenchState.previewTimer) {
    clearTimeout(workbenchState.previewTimer);
  }
  workbenchState.previewTimer = setTimeout(() => {
    workbenchState.previewTimer = null;
    refreshPreview();
  }, delay);
}

async function buildSourceFromState() {
  switch (workbenchState.sourceMode) {
    case SVG_SOURCE_MODE.FILE:
      return createSvgSourceMetadata({
        mode: SVG_SOURCE_MODE.FILE,
        markup: workbenchState.markup,
        filename: workbenchState.filename,
      });
    case SVG_SOURCE_MODE.PIXEL:
      return createSvgSourceMetadata({
        mode: SVG_SOURCE_MODE.PIXEL,
        markup: pixelsToSvg(workbenchState.pixelGrid, workbenchState.pixelGridSize, { canvasSize: PIXEL_CANVAS_SIZE }),
        inputs: {
          gridSize: workbenchState.pixelGridSize,
          pixels: clonePixelGrid(workbenchState.pixelGrid),
        },
      });
    case SVG_SOURCE_MODE.TEXT:
      return createSvgSourceMetadata({
        mode: SVG_SOURCE_MODE.TEXT,
        markup: await textToSvgMarkup(workbenchState.textValue, workbenchState.fontName, { size: 220 }),
        inputs: {
          text: workbenchState.textValue,
          fontName: workbenchState.fontName,
        },
      });
    case SVG_SOURCE_MODE.CODE:
    default:
      return createSvgSourceMetadata({
        mode: SVG_SOURCE_MODE.CODE,
        markup: workbenchState.markup,
      });
  }
}

function buildAnalysisMessage(source, analysis, rasterized) {
  if (!source?.markup) return 'No SVG analyzed yet.';
  return [
    `Mode: ${source.mode.toUpperCase()}`,
    `Render: ${(analysis.renderMode || 'solid').toUpperCase()}`,
    analysis.importMode ? `Hint: ${analysis.importMode}` : 'Hint: none',
    `Layers: ${analysis.layerCount ?? analysis.partCount ?? 1}`,
    `Shapes: ${analysis.shapeCount}`,
    `Outline points: ${analysis.pointCount}`,
    analysis.mountTarget ? `Mount: ${analysis.mountTarget}` : 'Mount: none',
    `Risk: ${analysis.riskLevel.toUpperCase()}`,
    rasterized ? 'Fallback: rasterized fill conversion applied' : 'Fallback: direct vector extrusion',
  ].join('\n');
}

function setBusy(busy) {
  workbenchState.isBusy = busy;
  const stopBtn = getElement('svg-stop-btn');
  const confirmBtn = getElement('svg-confirm-btn');
  const applyHeadBtn = getElement('svg-apply-head-btn');
  const closeBtn = getElement('svg-close-btn');
  const refreshBtn = getElement('svg-refresh-btn');
  if (stopBtn) stopBtn.classList.toggle('hidden', !busy);
  if (confirmBtn) confirmBtn.disabled = busy;
  if (applyHeadBtn) applyHeadBtn.disabled = busy;
  if (closeBtn) closeBtn.disabled = busy;
  if (refreshBtn) refreshBtn.disabled = busy;
}

async function refreshPreview() {
  if (!workbenchState.open || workbenchState.isBusy) return;
  syncSettingsFromForm();
  const token = ++workbenchState.previewToken;
  setStatus('Preparing SVG preview...');

  let source;
  try {
    source = await buildSourceFromState();
  } catch (error) {
    if (token !== workbenchState.previewToken) return;
    workbenchState.previewSource = null;
    workbenchState.previewAnalysis = null;
    setPreviewMarkup('');
    setAnalysisText('Unable to build the SVG source from the current mode.', { riskLevel: 'danger' });
    setStatus(error?.message || 'Source generation failed.', { error: true });
    return;
  }

  if (token !== workbenchState.previewToken) return;
  if (!source.markup.trim()) {
    workbenchState.previewSource = source;
    workbenchState.previewAnalysis = null;
    setPreviewMarkup('');
    setAnalysisText('No SVG analyzed yet.');
    setStatus('Paste or generate an SVG source to continue.');
    return;
  }

  setPreviewMarkup(source.markup);

  try {
    const prepared = await prepareSvgForExtrusion(
      source.markup,
      resolveSettingsForSource(source, workbenchState.settings)
    );
    if (token !== workbenchState.previewToken) return;

    workbenchState.previewSource = createSvgSourceMetadata({
      ...source,
      resolvedMarkup: prepared.resolvedSvg,
      rasterized: prepared.rasterized,
    });
    workbenchState.previewAnalysis = prepared.analysis;

    setAnalysisText(buildAnalysisMessage(source, prepared.analysis, prepared.rasterized), {
      riskLevel: prepared.analysis.riskLevel,
    });

    const riskText = prepared.analysis.riskLevel === 'danger'
      ? 'Complex SVG. Import may generate heavy geometry.'
      : prepared.analysis.riskLevel === 'warning'
        ? 'Moderate SVG complexity. Import should still be manageable.'
        : 'SVG looks safe to import.';
    const rasterText = prepared.rasterized ? 'Rasterized fallback is active.' : 'Direct vector extrusion is active.';
    setStatus(`${riskText}\n${rasterText}`);
  } catch (error) {
    if (token !== workbenchState.previewToken) return;
    workbenchState.previewSource = source;
    workbenchState.previewAnalysis = null;
    setAnalysisText('The current SVG could not be prepared for extrusion.', { riskLevel: 'danger' });
    setStatus(error?.message || 'SVG preparation failed.', { error: true });
  }
}

function handleModeChange(mode) {
  if (workbenchState.isBusy || !SOURCE_MODES.includes(mode)) return;
  workbenchState.sourceMode = mode;
  renderWorkbench();
  schedulePreview(40);
}

async function handleSvgFileInput(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    workbenchState.filename = file.name;
    workbenchState.markup = text;
    renderWorkbench();
    schedulePreview(40);
  } catch (error) {
    showToast(error?.message || t('jsonFileReadError'));
  } finally {
    event.target.value = '';
  }
}

function applyPixelAt(x, y, value) {
  if (x < 0 || x >= workbenchState.pixelGridSize || y < 0 || y >= workbenchState.pixelGridSize) return;
  workbenchState.pixelGrid[y][x] = value;
  renderPixelGrid();
}

function handlePixelPointer(event) {
  const cell = event.target.closest('[data-x][data-y]');
  if (!cell || workbenchState.isBusy) return;

  const x = Number(cell.dataset.x);
  const y = Number(cell.dataset.y);
  const isErase = event.type === 'contextmenu' || event.button === 2;
  const nextValue = isErase ? false : !workbenchState.pixelGrid[y]?.[x];
  workbenchState.dragValue = nextValue;
  applyPixelAt(x, y, nextValue);
  schedulePreview(40);
  event.preventDefault();
}

function handlePixelDrag(event) {
  if (workbenchState.dragValue === null) return;
  const cell = event.target.closest('[data-x][data-y]');
  if (!cell) return;
  const x = Number(cell.dataset.x);
  const y = Number(cell.dataset.y);
  applyPixelAt(x, y, workbenchState.dragValue);
  schedulePreview(40);
}

function stopPixelDrag() {
  workbenchState.dragValue = null;
}

function loadSample(sampleKey) {
  const sample = SVG_SAMPLE_SOURCES[sampleKey];
  if (!sample) return;
  const sampleSettings = cloneSvgImportSettings({
    ...workbenchState.settings,
    ...(sample.settings || {}),
    name: sample.settings?.name || sample.name?.toUpperCase() || 'SVG MODEL',
  });
  applyLoadedSource(
    sample,
    sampleSettings,
    workbenchState.targetGroup,
    workbenchState.headTargetGroup,
  );
  renderWorkbench();
  schedulePreview(40);
}

function cancelActiveTask() {
  if (workbenchState.abortController) {
    workbenchState.abortController.abort();
  }
}

async function confirmImport() {
  if (workbenchState.isBusy) return;
  syncSettingsFromForm();

  let source;
  try {
    source = await buildSourceFromState();
  } catch (error) {
    setStatus(error?.message || 'Source generation failed.', { error: true });
    showToast(t('svgInvalidSource'));
    return;
  }

  if (!source.markup.trim()) {
    setStatus('SVG source is empty.', { error: true });
    showToast(t('svgInvalidSource'));
    return;
  }

  if (workbenchState.previewAnalysis?.riskLevel === 'danger' && !confirm(t('svgComplexConfirm'))) {
    return;
  }

  const controller = new AbortController();
  workbenchState.abortController = controller;
  setBusy(true);
  setStatus('Generating SVG geometry...');

  try {
    const nextGroup = await createSvgGroupFromSource(source, resolveSettingsForSource(source, workbenchState.settings), {
      signal: controller.signal,
      onProgress: (progress) => {
        const percent = progress?.percent ?? 0;
        const note = progress?.note ? `\n${progress.note}` : '';
        setStatus(`Stage: ${progress.stage || 'working'}\nProgress: ${percent}%${note}`);
      },
    });

    if (workbenchState.targetGroup) {
      nextGroup.position.copy(workbenchState.targetGroup.position);
      nextGroup.rotation.copy(workbenchState.targetGroup.rotation);
      nextGroup.scale.copy(workbenchState.targetGroup.scale);

      const before = cloneSvgGroupSnapshot(workbenchState.targetGroup);
      const after = cloneSvgGroupSnapshot(nextGroup);
      applySvgGroupSnapshot(workbenchState.targetGroup, after);
      selectMesh(workbenchState.targetGroup);

      pushAction({
        type: t('actionUpdateSvg'),
        undo: () => {
          applySvgGroupSnapshot(workbenchState.targetGroup, before);
          selectMesh(workbenchState.targetGroup);
          updateSceneUi();
        },
        redo: () => {
          applySvgGroupSnapshot(workbenchState.targetGroup, after);
          selectMesh(workbenchState.targetGroup);
          updateSceneUi();
        },
      });

      updateSceneUi();
      showToast(t('svgUpdated'));
    } else {
      const selectionBeforeInsert = state.selectedMesh;
      const mountTarget = findSvgMountTarget(selectionBeforeInsert, nextGroup);
      if (mountTarget) {
        mountSvgGroupToTarget(nextGroup, mountTarget, nextGroup.userData?.svgImportSettings || {});
      }
      insertSvgGroup(nextGroup, {
        actionType: t('actionImportSvg'),
        parent: mountTarget || undefined,
        toast: false,
      });
      updateSceneUi();
      showToast(mountTarget
        ? `${t('svgImported')} (${mountTarget.userData?.name || mountTarget.name || 'mounted'})`
        : t('svgImported'));
    }

    closeSvgWorkbenchInternal();
  } catch (error) {
    const cancelled = controller.signal.aborted || /cancel/i.test(error?.message || '');
    setStatus(cancelled ? 'SVG import cancelled.' : (error?.message || 'SVG import failed.'), { error: !cancelled });
    showToast(cancelled ? t('svgImportCancelled') : t('svgImportFailed'));
  } finally {
    workbenchState.abortController = null;
    setBusy(false);
  }
}

async function confirmApplyHead() {
  if (workbenchState.isBusy) return;
  syncSettingsFromForm();

  if (!canApplySvgHeadToGroup(workbenchState.headTargetGroup)) {
    setStatus('Select a humanoid target before applying an SVG head.', { error: true });
    showToast(t('selectHumanoidHeadTarget') || 'Select a humanoid target first.');
    return;
  }

  let source;
  try {
    source = await buildSourceFromState();
  } catch (error) {
    setStatus(error?.message || 'Source generation failed.', { error: true });
    showToast(t('svgInvalidSource'));
    return;
  }

  if (!source.markup.trim()) {
    setStatus('SVG source is empty.', { error: true });
    showToast(t('svgInvalidSource'));
    return;
  }

  if (workbenchState.previewAnalysis?.riskLevel === 'danger' && !confirm(t('svgComplexConfirm'))) {
    return;
  }

  const controller = new AbortController();
  workbenchState.abortController = controller;
  setBusy(true);
  setStatus('Generating and fitting the SVG head...');

  try {
    const nextGroup = await buildGroupWithSvgHead(
      workbenchState.headTargetGroup,
      source,
      resolveSettingsForSource(source, workbenchState.settings),
      {
        signal: controller.signal,
        onProgress: (progress) => {
          const percent = progress?.percent ?? 0;
          const note = progress?.note ? `\n${progress.note}` : '';
          setStatus(`Stage: ${progress.stage || 'working'}\nProgress: ${percent}%${note}`);
        },
      }
    );

    const before = cloneSvgGroupSnapshot(workbenchState.headTargetGroup);
    const after = cloneSvgGroupSnapshot(nextGroup);
    applySvgGroupSnapshot(workbenchState.headTargetGroup, after);
    selectMesh(workbenchState.headTargetGroup);

    pushAction({
      type: t('actionApplySvgHead') || 'Apply SVG head',
      undo: () => {
        applySvgGroupSnapshot(workbenchState.headTargetGroup, before);
        selectMesh(workbenchState.headTargetGroup);
        updateSceneUi();
      },
      redo: () => {
        applySvgGroupSnapshot(workbenchState.headTargetGroup, after);
        selectMesh(workbenchState.headTargetGroup);
        updateSceneUi();
      },
    });

    updateSceneUi();
    showToast(t('svgHeadApplied') || 'SVG head applied');
    closeSvgWorkbenchInternal();
  } catch (error) {
    const cancelled = controller.signal.aborted || /cancel/i.test(error?.message || '');
    setStatus(cancelled ? 'SVG head apply cancelled.' : (error?.message || 'SVG head apply failed.'), { error: !cancelled });
    showToast(cancelled ? t('svgImportCancelled') : (t('svgHeadApplyFailed') || 'SVG head apply failed.'));
  } finally {
    workbenchState.abortController = null;
    setBusy(false);
  }
}

function closeSvgWorkbenchInternal() {
  workbenchState.open = false;
  if (workbenchState.previewTimer) {
    clearTimeout(workbenchState.previewTimer);
    workbenchState.previewTimer = null;
  }
  getElement('svg-workbench-modal')?.classList.add('hidden');
}

function fillFontOptions() {
  const select = getElement('svg-font-select');
  if (!select || select.options.length > 0) return;

  getSvgTextFontCatalog().forEach((font) => {
    const option = document.createElement('option');
    option.value = font.name;
    option.textContent = font.name;
    select.appendChild(option);
  });
}

function bindFieldListeners() {
  getElement('svg-mode-code')?.addEventListener('click', () => handleModeChange(SVG_SOURCE_MODE.CODE));
  getElement('svg-mode-file')?.addEventListener('click', () => handleModeChange(SVG_SOURCE_MODE.FILE));
  getElement('svg-mode-pixel')?.addEventListener('click', () => handleModeChange(SVG_SOURCE_MODE.PIXEL));
  getElement('svg-mode-text')?.addEventListener('click', () => handleModeChange(SVG_SOURCE_MODE.TEXT));

  getElement('svg-code-textarea')?.addEventListener('input', (event) => {
    workbenchState.markup = event.target.value;
    schedulePreview();
  });
  getElement('svg-file-textarea')?.addEventListener('input', (event) => {
    workbenchState.markup = event.target.value;
    schedulePreview();
  });
  getElement('svg-file-input')?.addEventListener('change', handleSvgFileInput);
  getElement('svg-text-input')?.addEventListener('input', (event) => {
    workbenchState.textValue = event.target.value;
    schedulePreview();
  });
  getElement('svg-font-select')?.addEventListener('change', (event) => {
    workbenchState.fontName = event.target.value;
    schedulePreview();
  });

  ['svg-name-input', 'svg-depth-input', 'svg-smoothness-input', 'svg-target-size-input', 'svg-color-input', 'svg-force-rasterize-input', 'svg-grid-size-input', 'svg-bevel-enabled-input']
    .forEach((id) => {
      getElement(id)?.addEventListener('input', () => schedulePreview());
      getElement(id)?.addEventListener('change', () => schedulePreview());
    });
  ['svg-render-mode-input', 'svg-auto-mount-input'].forEach((id) => {
    getElement(id)?.addEventListener('input', () => schedulePreview());
    getElement(id)?.addEventListener('change', () => schedulePreview());
  });

  getElement('svg-pixel-grid')?.addEventListener('mousedown', handlePixelPointer);
  getElement('svg-pixel-grid')?.addEventListener('mouseover', handlePixelDrag);
  getElement('svg-pixel-grid')?.addEventListener('contextmenu', handlePixelPointer);
  getElement('svg-pixel-clear')?.addEventListener('click', () => {
    workbenchState.pixelGrid = createEmptyPixelGrid(workbenchState.pixelGridSize);
    renderPixelGrid();
    schedulePreview(40);
  });

  document.addEventListener('mouseup', stopPixelDrag);
  document.addEventListener('mouseleave', stopPixelDrag);

  getElement('svg-sample-groups')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-svg-sample-key]');
    if (!button) return;
    loadSample(button.dataset.svgSampleKey);
  });

  getElement('svg-refresh-btn')?.addEventListener('click', () => refreshPreview());
  getElement('svg-close-btn')?.addEventListener('click', () => closeSvgWorkbench());
  getElement('svg-stop-btn')?.addEventListener('click', () => cancelActiveTask());
  getElement('svg-apply-head-btn')?.addEventListener('click', () => confirmApplyHead());
  getElement('svg-confirm-btn')?.addEventListener('click', () => confirmImport());
}

export function initSvgWorkbench() {
  if (workbenchState.initialized) return;
  fillFontOptions();
  bindFieldListeners();
  createDefaultState();
  renderWorkbench();
  setAnalysisText('No SVG analyzed yet.');
  setStatus('Idle.');
  workbenchState.initialized = true;
}

export function openSvgWorkbench() {
  if (!workbenchState.initialized) initSvgWorkbench();
  applyLoadedSource(null, cloneSvgImportSettings(), null, null);
  workbenchState.open = true;
  renderWorkbench();
  setPreviewMarkup('');
  setAnalysisText('No SVG analyzed yet.');
  setStatus('Paste or generate an SVG source to continue.');
  getElement('svg-workbench-modal')?.classList.remove('hidden');
}

export function openSvgWorkbenchForSelection() {
  if (!state.selectedMesh?.isGroup || !state.selectedMesh.userData?.svgSource?.markup) {
    showToast(t('selectSvgObjectFirst'));
    return;
  }

  if (!workbenchState.initialized) initSvgWorkbench();
  applyLoadedSource(
    getSvgSourceMetadata(state.selectedMesh),
    getSvgImportSettings(state.selectedMesh),
    state.selectedMesh,
    null,
  );
  workbenchState.open = true;
  renderWorkbench();
  getElement('svg-workbench-modal')?.classList.remove('hidden');
  schedulePreview(20);
}

export function openSvgHeadWorkbenchForSelection() {
  if (!canApplySvgHeadToGroup(state.selectedMesh)) {
    showToast(t('selectHumanoidHeadTarget') || 'Select a humanoid target first.');
    return;
  }

  if (!workbenchState.initialized) initSvgWorkbench();

  const storedHead = getStoredHeadSlotSource(state.selectedMesh);
  const source = storedHead?.svgSource || SVG_SAMPLE_SOURCES.headHeroRound;
  const settings = cloneSvgImportSettings({
    ...(SVG_SAMPLE_SOURCES.headHeroRound?.settings || {}),
    ...(storedHead?.svgImportSettings || {}),
  });

  applyLoadedSource(source, settings, null, state.selectedMesh);
  workbenchState.open = true;
  renderWorkbench();
  setPreviewMarkup(source?.markup || '');
  getElement('svg-workbench-modal')?.classList.remove('hidden');
  schedulePreview(20);
}

export function closeSvgWorkbench() {
  if (workbenchState.isBusy) {
    cancelActiveTask();
    return;
  }
  closeSvgWorkbenchInternal();
}
