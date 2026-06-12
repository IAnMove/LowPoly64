import { prepareExportGroup } from './export-prepare.js';
import { createExportSource, hasSceneObjects } from './export-targets.js';

export async function exportGLBFlow({
  exportState,
  GroupClass,
  MeshStandardMaterialClass,
  ColorClass,
  compileAnimation,
  cloneTexture,
  loadGLTFExporter,
  createBlob,
  downloadBlob,
  alertUser = () => {},
  logError = () => {},
  translate = (key) => key,
  filename = 'lowpoly64-scene.glb',
  hasSceneObjectsCommand = hasSceneObjects,
  createExportSourceCommand = createExportSource,
  prepareExportGroupCommand = prepareExportGroup,
} = {}) {
  if (!hasSceneObjectsCommand(exportState)) {
    alertUser(translate('noObjectsToExport'));
    return { success: false, reason: 'empty-scene' };
  }

  const exportGroup = createExportSourceCommand(exportState, { GroupClass });
  const clips = prepareExportGroupCommand(exportGroup, {
    MeshStandardMaterialClass,
    ColorClass,
    compileAnimation,
    cloneTexture,
  });
  const ExporterClass = await loadGLTFExporter();
  const exporter = new ExporterClass();
  const options = { binary: true };
  if (clips.length > 0) {
    options.animations = clips;
  }

  return new Promise((resolve) => {
    const onError = (error) => {
      logError('Export error:', error);
      alertUser(translate('exportError') + error.message);
      resolve({ success: false, error });
    };

    try {
      exporter.parse(
        exportGroup,
        (result) => {
          const blob = createBlob([result], { type: 'application/octet-stream' });
          downloadBlob(blob, filename);
          resolve({ success: true, exportGroup, clips, options, blob });
        },
        onError,
        options
      );
    } catch (error) {
      onError(error);
    }
  });
}
