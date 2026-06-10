import {
  cloneTextureProcessingSettings,
  createTextureProcessingPreset,
  createPsxifyTextureSettings,
  processTextureCanvas,
} from './texture-processing.js';

export function cloneCanvas(sourceCanvas, fallbackSize = 256) {
  if (!(sourceCanvas instanceof HTMLCanvasElement)) return null;
  const copy = document.createElement('canvas');
  copy.width = sourceCanvas.width || fallbackSize;
  copy.height = sourceCanvas.height || fallbackSize;
  const copyCtx = copy.getContext('2d');
  copyCtx.drawImage(sourceCanvas, 0, 0);
  return copy;
}

export function createTextureProcessingController({ fallbackSize = 256 } = {}) {
  let previewSettings = cloneTextureProcessingSettings();
  let appliedSettings = cloneTextureProcessingSettings();

  function renderUi() {
    const sizeSelect = document.getElementById('tex-fx-target-size');
    const downscale = document.getElementById('tex-fx-downscale');
    const palette15 = document.getElementById('tex-fx-palette15');
    const dithering = document.getElementById('tex-fx-dither');

    if (sizeSelect) sizeSelect.value = `${previewSettings.targetSize}`;
    if (downscale) downscale.checked = previewSettings.downscaleEnabled;
    if (palette15) palette15.checked = previewSettings.palette15Bit;
    if (dithering) dithering.checked = previewSettings.ditheringEnabled;
  }

  function buildTextureCanvasWithProcessing(sourceCanvas, settings, options = {}) {
    const processed = processTextureCanvas(sourceCanvas, settings, options);
    return processed?.canvas || cloneCanvas(sourceCanvas, fallbackSize);
  }

  return {
    syncFromMesh(mesh) {
      appliedSettings = cloneTextureProcessingSettings(mesh?.userData?.textureProcessing || {});
      previewSettings = cloneTextureProcessingSettings(appliedSettings);
      renderUi();
    },
    setValue(key, value) {
      previewSettings = cloneTextureProcessingSettings({
        ...previewSettings,
        [key]: key === 'targetSize' ? Number.parseInt(value, 10) : value,
      });
      renderUi();
    },
    commitPreviewSettings() {
      appliedSettings = cloneTextureProcessingSettings(previewSettings);
    },
    applyPsxify() {
      previewSettings = createPsxifyTextureSettings(previewSettings);
      renderUi();
    },
    applyPreset(presetId) {
      previewSettings = createTextureProcessingPreset(presetId, previewSettings);
      renderUi();
    },
    restoreSnapshot(snapshot = {}) {
      appliedSettings = cloneTextureProcessingSettings(snapshot.appliedSettings || {});
      previewSettings = cloneTextureProcessingSettings(snapshot.previewSettings || snapshot.appliedSettings || {});
      renderUi();
    },
    renderUi,
    getAppliedSettings: () => cloneTextureProcessingSettings(appliedSettings),
    getPreviewSettings: () => cloneTextureProcessingSettings(previewSettings),
    buildCommittedCanvas: (sourceCanvas, options = {}) => buildTextureCanvasWithProcessing(sourceCanvas, appliedSettings, options),
    buildPreviewCanvas: (sourceCanvas, options = {}) => buildTextureCanvasWithProcessing(sourceCanvas, previewSettings, options),
  };
}
