import assert from 'node:assert/strict';
import * as THREE from 'three';

globalThis.localStorage = globalThis.localStorage || {
  getItem: () => null,
  setItem: () => {},
};

const {
  DEFAULT_RETRO_PALETTE,
  createEditorState,
} = await import('../src/modules/state-factory.js');
const { createPersistenceController } = await import('../src/modules/persistence-controller.js');
const { createBrowserPersistenceController } = await import('../src/modules/persistence-browser-adapter.js');
const { validateSerializedScene } = await import('../src/modules/persistence-validation.js');
const {
  createSceneStorage,
  loadSceneSnapshot,
  saveSceneSnapshot,
} = await import('../src/modules/scene-storage.js');
const {
  clearRuntimeUserObjects,
  deserializeRuntimeScene,
  exportRuntimeSceneJSON,
  importRuntimeSceneJSON,
  loadRuntimeScene,
  saveRuntimeScene,
  serializeRuntimeScene,
} = await import('../src/modules/persistence-runtime-flow.js');
const {
  deserializeObject,
  serializeGroupAsImportJSON,
  serializeObject,
} = await import('../src/modules/scene-serialization.js');
const {
  applyFaceUVDataToGeometry,
  cloneFaceUVData,
  createDefaultFaceUVData,
} = await import('../src/modules/texture-editor-uv.js');
const {
  createFaceHighlight,
  disposeFaceHighlight,
  pickPreviewFaceIndex,
} = await import('../src/modules/texture-editor-face-preview.js');
const {
  removeTextureFaceHighlight,
  removeTextureFacePreviewClickListener,
  replaceTextureFaceHighlight,
  selectTextureFaceFromPreviewClick,
} = await import('../src/modules/texture-editor-face-preview-flow.js');
const {
  applyAllCubeFaceUVs,
  applyFaceUVsToMeshes,
  applyGlobalTextureUV,
  createTextureTransformFromUvInputs,
  getTextureUvInputsForMesh,
} = await import('../src/modules/texture-editor-face-uv-flow.js');
const {
  calculateUvMapSelection,
  drawFaceUvMapCanvas,
  getCanvasUV: getTextureFaceCanvasUV,
  renderSelectedFaceOverlay,
} = await import('../src/modules/texture-editor-face-overlay.js');
const {
  readTextureUvInputs,
  renderFaceControls,
  writeGlobalUvInputs,
} = await import('../src/modules/texture-editor-face-ui.js');
const {
  getTextureFaceNames,
  renderAllTextureFaceOverlays,
  renderTextureFaceOverlay,
  renderTextureFaceUI,
} = await import('../src/modules/texture-editor-face-render-flow.js');
const {
  createTextureFaceEditingState,
  resetTextureFaceEditingState,
  resetTextureFaceUvMapDrag,
  setTextureFaceUvMapMode,
  toggleTextureFaceUvMapMode,
} = await import('../src/modules/texture-editor-face-state.js');
const { initializeTextureFaceEditing } = await import('../src/modules/texture-editor-face-init-flow.js');
const {
  deselectTextureFace,
  selectTextureFaceFromIndex,
  selectTextureFaceFromValue,
} = await import('../src/modules/texture-editor-face-selection-flow.js');
const {
  doTextureFaceUvMapDraw,
  endTextureFaceUvMapDraw,
  startTextureFaceUvMapDraw,
} = await import('../src/modules/texture-editor-face-uvmap-flow.js');
const {
  configureTextureFaceEditingServices,
  resetTextureFaceEditingServices,
  startUVMapDraw,
} = await import('../src/modules/texture-editor-face.js');
const {
  applyTextureFaceUVs,
  updateTextureFaceUVField,
  updateTextureFaceUVFromInputs,
} = await import('../src/modules/texture-editor-face-update-flow.js');
const {
  TEXTURE_BRUSH_SIZES,
  TEXTURE_DEFAULT_PALETTE,
  getBrushRadius,
  getBrushStrokePoints,
  getCanvasPointerPosition,
} = await import('../src/modules/texture-editor-paint-core.js');
const {
  drawBrushDot,
  drawBrushStroke,
} = await import('../src/modules/texture-editor-paint-commands.js');
const {
  createTexturePaintToolState,
  setTexturePaintBrushColor,
  setTexturePaintBrushSize,
  setTexturePaintEraserMode,
} = await import('../src/modules/texture-editor-paint-tool-state.js');
const {
  clearTexturePaintSurface,
  loadTexturePaintImage,
  undoTexturePaintSurface,
} = await import('../src/modules/texture-editor-paint-command-flow.js');
const { renderTexturePaintPalette } = await import('../src/modules/texture-editor-paint-palette-ui.js');
const { initializeTexturePaintCanvas } = await import('../src/modules/texture-editor-paint-init-flow.js');
const {
  createTexturePaintFlowState,
  endTexturePaintFlow,
  moveTexturePaintFlow,
  resetTexturePaintFlowState,
  startTexturePaintFlow,
} = await import('../src/modules/texture-editor-paint-flow.js');
const { createPaintUndoHistory } = await import('../src/modules/texture-editor-paint-history.js');
const {
  clearPaintSurface,
  clonePaintCanvas,
  drawSourceImageToPaintSurface,
  fillPaintSurface,
  replacePaintSurfaceWithImage,
} = await import('../src/modules/texture-editor-paint-surface.js');
const { bindPaintCanvasEvents } = await import('../src/modules/texture-editor-paint-events.js');
const {
  downloadPaintCanvas,
  loadPaintImageFromFileInput,
} = await import('../src/modules/texture-editor-paint-file-flow.js');
const {
  createBrowserDownloadLink,
  downloadBlob: downloadBrowserBlob,
  downloadDataURL: downloadBrowserDataURL,
} = await import('../src/modules/browser-download-adapter.js');
const {
  copyJSONExport,
  copyJSONToClipboard,
  copySceneJSONExport,
  createJSONExportPayload,
  downloadJSONExport,
} = await import('../src/modules/json-export-flow.js');
const { createBrowserJSONExporter } = await import('../src/modules/json-export-browser-adapter.js');
const { createTexturePreviewLoop } = await import('../src/modules/texture-editor-preview-loop.js');
const {
  createTexturePreviewRuntimeState,
  disposeTexturePreviewRuntime,
  initializeTexturePreviewRuntime,
} = await import('../src/modules/texture-editor-preview-runtime-flow.js');
const {
  bindTexturePreviewHover,
  createTexturePreviewRenderer,
  createTexturePreviewScene,
} = await import('../src/modules/texture-editor-preview-scene.js');
const {
  applyCanvasToPreviewTexture,
  applyTransformToPreviewTexture,
} = await import('../src/modules/texture-editor-preview-texture.js');
const { initTexturePreview } = await import('../src/modules/texture-editor-preview.js');
const { setTextureEditorTool } = await import('../src/modules/texture-editor-tool-flow.js');
const {
  createTextureToolUiAdapter,
  updateTextureToolUI,
} = await import('../src/modules/texture-editor-tool-ui.js');
const {
  commitTextureEditorCanvas,
  previewTextureEditorCanvas,
} = await import('../src/modules/texture-editor-canvas-flow.js');
const {
  closeTextureEditorLifecycle,
  openTextureEditorLifecycle,
} = await import('../src/modules/texture-editor-lifecycle-flow.js');
const { createTextureEditorSessionController } = await import('../src/modules/texture-editor-session-controller.js');
const { createBrowserTextureEditorSession } = await import('../src/modules/texture-editor-session-browser-adapter.js');
const {
  createTextureCanvas,
  createTextureEditorDomAdapter,
  createTextureImageFileInput,
  createTexturePaletteSwatch,
  getTextureColorSwatches,
  getTextureEditorModal,
  getTextureInput,
  hideTextureEditorModal,
  isTextureCanvas,
  showTextureEditorModal,
} = await import('../src/modules/texture-editor-dom.js');
const {
  cloneImageToCanvas,
  cloneTexture,
  configureTexture,
  createDetachedCanvasTexture,
  createLiveCanvasTexture,
  imageToDataURL,
  isTexturePixelated,
} = await import('../src/modules/texture-core.js');
const {
  cloneBrowserImageToCanvas,
  cloneBrowserTexture,
  createDetachedBrowserCanvasTexture,
  imageToBrowserDataURL,
} = await import('../src/modules/browser-canvas-adapter.js');
const {
  applyTextureToMesh,
  toggleMeshTexture,
} = await import('../src/modules/texture-commands.js');
const {
  createTextureController,
  createTextureRuntimeStateGetter,
} = await import('../src/modules/texture-controller.js');
const { createBrowserTextureController } = await import('../src/modules/texture-browser-adapter.js');
const {
  createTexturePanelDomAdapter,
  setupTextureDropZone,
  showTexturePanelPreview,
  showTextureUVControls,
} = await import('../src/modules/texture-panel-dom.js');
const {
  applyLoadedTextureToSelection,
  createConfiguredTexture,
  loadTextureFileForSelection,
  togglePixelatedSetting,
  toggleSelectedTexture,
} = await import('../src/modules/texture-runtime-flow.js');
const {
  configureActionContext,
  createActionContext,
  resetActionContext,
} = await import('../src/modules/action-context.js');
const { createUndoHistory } = await import('../src/modules/undo-history.js');
const {
  clearHistory: clearGlobalUndoHistory,
  configureUndoFeedback,
  pushAction: pushGlobalUndoAction,
  redo: redoGlobalUndoAction,
  resetUndoFeedback,
  undo: undoGlobalUndoAction,
} = await import('../src/modules/undo.js');
const { bindDeclarativeActions } = await import('../src/modules/app-action-bindings.js');
const {
  createAppActionMaps,
  createAppActionRuntimeStateGetter,
} = await import('../src/modules/app-action-map.js');
const { createAppChromeActions } = await import('../src/modules/app-chrome-actions.js');
const { configureAppCrossModuleHooks } = await import('../src/modules/app-cross-module-hooks.js');
const {
  bindAppDeclarativeActions,
  bootstrapAppRuntime,
  createCachedModuleLoader,
  initializeAppRuntime,
} = await import('../src/modules/app-bootstrap-flow.js');
const { createBrowserPanelController } = await import('../src/modules/panel-browser-adapter.js');
const { createPanelController } = await import('../src/modules/panel-controller.js');
const {
  bindCanvasSelectionEvents,
  createAppDomSetupAdapter,
  getMultiColorValue,
  setupPaletteColorInput,
  setupTemplateList: setupTemplateListDom,
  setupTextureDropZone: setupTextureDropZoneDom,
} = await import('../src/modules/app-dom-setup.js');
const {
  deleteSelected,
  duplicateSelected,
} = await import('../src/modules/object-actions.js');
const {
  deleteSelectedObject,
  duplicateSelectedObject,
} = await import('../src/modules/object-action-flow.js');
const {
  centerCameraOnSelectedObject,
  resetSceneObjects,
} = await import('../src/modules/scene-action-flow.js');
const { disposeSceneObject: disposeSceneActionObject } = await import('../src/modules/scene-disposal.js');
const {
  getSelectedGroupForUngroup,
  groupSelectedObjects,
  ungroupSelectedObject,
} = await import('../src/modules/group-action-flow.js');
const {
  attachSelectedBone,
  detachSelectedBone,
  getPivotDepth,
  isDescendantOf,
} = await import('../src/modules/bone-action-flow.js');
const {
  importAnimationDataToGroup,
  validateAnimationJSON,
} = await import('../src/modules/animation-import.js');
const {
  importAnimationDataToGroup: importAnimationDataToGroupCore,
  importAnimationToGroup: importAnimationToGroupCore,
  normalizeAnimationDefinition,
  validateAnimationJSON: validateAnimationJSONCore,
} = await import('../src/modules/animation-import-core.js');
const { createBrowserAnimationImporter } = await import('../src/modules/animation-import-browser-adapter.js');
const { validateObjectJSON } = await import('../src/modules/json-import-validation.js');
const {
  clearImportModal,
  createJSONImportDomAdapter,
  getImportText,
  hideImportModal,
  isImportModalOpen,
  setImportError,
  setImportText,
  showImportModal,
} = await import('../src/modules/json-import-dom.js');
const {
  handleJSONImportFile,
  handleJSONImportSubmit,
  handleParsedJSONImport,
  createJSONImportRuntimeStateGetter,
  importObjectDefinitionFromData,
  importObjectFromJSONString,
  parseJSONImportText,
} = await import('../src/modules/json-import-flow.js');
const { createBrowserJSONImporter } = await import('../src/modules/json-import-browser-adapter.js');
const {
  configureShortcutHooks,
  onKeyDown,
  resetShortcutHooks,
} = await import('../src/modules/shortcuts.js');
const { createShortcutController } = await import('../src/modules/shortcut-controller.js');
const {
  highlightSelection,
  unhighlightSelection,
} = await import('../src/modules/selection-highlight.js');
const {
  findRootSelectionTarget,
  getSelectionTargetFromIntersections,
} = await import('../src/modules/selection-raycast.js');
const {
  decideDoubleClickSelection,
  decideMouseSelection,
} = await import('../src/modules/selection-event-decision.js');
const { executeSelectionDecision } = await import('../src/modules/selection-decision-executor.js');
const {
  executeDoubleClickSelectionEvent,
  executeMouseSelectionEvent,
  getBoneSelectionTarget,
  getDoubleClickSelectionDecision,
  getMouseSelectionDecision,
} = await import('../src/modules/selection-pointer-flow.js');
const { createSelectionRuntimeController } = await import('../src/modules/selection-runtime-flow.js');
const {
  createSelectionDomAdapter,
  hideAnimationTimeline,
  showMultiSelectionHeader,
  showSingleSelectionHeader,
} = await import('../src/modules/selection-dom.js');
const {
  addMeshToMultiSelection,
  clearMultiSelection,
  clearSingleSelection,
  removeMeshFromMultiSelection,
  setSingleSelection,
} = await import('../src/modules/selection-state.js');
const {
  clearAllSelectionFeedback,
  clearSelectionFeedback,
  showSingleSelectionFeedback,
  syncMultiRemovalFeedback,
  syncMultiSelectionFeedback,
} = await import('../src/modules/selection-ui-flow.js');
const {
  createSelectionController,
  createSelectionRuntimeStateGetter,
} = await import('../src/modules/selection-controller.js');
const { createBrowserSelectionController } = await import('../src/modules/selection-browser-adapter.js');
const {
  getNextLanguage,
  translate,
} = await import('../src/modules/i18n-core.js');
const { createI18nController } = await import('../src/modules/i18n-controller.js');
const { createBrowserI18nController } = await import('../src/modules/i18n-browser-adapter.js');
const {
  loadStoredLanguage,
  saveStoredLanguage,
} = await import('../src/modules/i18n-storage.js');
const {
  applyTranslationsToDocument,
  createI18nDomAdapter,
} = await import('../src/modules/i18n-dom.js');
const {
  applySnapSettings,
  DEFAULT_SNAP_SETTINGS,
  getNextSnapState,
} = await import('../src/modules/snap-core.js');
const { createSnapController } = await import('../src/modules/snap-controller.js');
const { createBrowserSnapController } = await import('../src/modules/snap-browser-adapter.js');
const {
  createSnapDomAdapter,
  updateSnapIndicator,
} = await import('../src/modules/snap-dom.js');
const { createMeshMaterial } = await import('../src/modules/material-factory.js');
const {
  addPrimitiveToScene,
  createPrimitiveGeometry,
  createPrimitiveMesh,
} = await import('../src/modules/primitive-runtime-flow.js');
const { createPrimitiveController } = await import('../src/modules/primitive-controller.js');
const { createBrowserPrimitiveController } = await import('../src/modules/primitive-browser-adapter.js');
const {
  createMaterialController,
  createMaterialRuntimeStateGetter,
} = await import('../src/modules/material-controller.js');
const { createBrowserMaterialController } = await import('../src/modules/material-browser-adapter.js');
const {
  applyFlatShadingToObjects,
  applyWireframeToObjects,
  choosePaletteColor,
  replaceMaterialType,
  setMeshColor,
} = await import('../src/modules/material-commands.js');
const { applyQuickColor } = await import('../src/modules/material-quick-color-flow.js');
const {
  applySelectedQuickColor,
  createMaterialFromSettings,
  toggleFlatShadingSetting,
  toggleWireframeSetting,
  updateMaterialTypeForSelection,
} = await import('../src/modules/material-runtime-flow.js');
const {
  createMaterialDomAdapter,
  syncColorInputs,
} = await import('../src/modules/material-dom.js');
const {
  applyPosition,
  applyRotationDegrees,
  applyScale,
  applyTextureOffset,
  applyTextureRepeat,
  applyTextureRotation,
  getChildMesh: getPropertyChildMesh,
  getMaterialColorHex,
  getMaterialTypeName,
  getSelectionActionVisibility,
  getTextureMesh,
  renameObject,
} = await import('../src/modules/property-commands.js');
const {
  createColorChangeAction,
  createMaterialChangeAction,
} = await import('../src/modules/property-history-actions.js');
const {
  runSelectedColorUpdate,
  runSelectedMaterialUpdate,
  runSelectedNameUpdate,
  runSelectedPositionUpdate,
  runSelectedRotationUpdate,
  runSelectedScaleUpdate,
  runSelectedUvOffsetUpdate,
  runSelectedUvRepeatUpdate,
  runSelectedUvRotationUpdate,
} = await import('../src/modules/selected-property-flow.js');
const {
  getUvTextureForObject,
  renderSelectedObjectProperties,
} = await import('../src/modules/properties-panel-presenter.js');
const {
  clearSelectionPanel,
  createPropertiesPanelDomAdapter,
  readPositionInputs,
  readRotationDegreeInputs,
  readScaleInputs,
  readUvInputs,
  setActionButtonVisibility,
  showMultiSelectionFields,
  showSingleSelectionFields,
  writeObjectProperties,
  writeUvControls,
} = await import('../src/modules/properties-panel-dom.js');
const {
  createToastDomAdapter,
  showToastMessage,
} = await import('../src/modules/toast-dom.js');
const {
  createExportButtonDomAdapter,
  updateExportButtonLabel,
} = await import('../src/modules/export-button-dom.js');
const { hasExportableSelection } = await import('../src/modules/export-button-state.js');
const {
  createUIController,
  createUIRuntimeStateGetter,
} = await import('../src/modules/ui-controller.js');
const { createBrowserUIController } = await import('../src/modules/ui-browser-adapter.js');
const {
  createExportSource,
  hasSceneObjects,
} = await import('../src/modules/export-targets.js');
const {
  applyExportNodeName,
  collectAnimationClips,
  prepareExportGroup,
} = await import('../src/modules/export-prepare.js');
const { exportGLBFlow } = await import('../src/modules/glb-export-flow.js');
const { createBrowserGLBExporter } = await import('../src/modules/export-browser-adapter.js');
const { compileAnimation } = await import('../src/modules/animation-compiler.js');
const {
  createTemplateController,
  createTemplateRuntimeStateGetter,
} = await import('../src/modules/template-controller.js');
const { createBrowserTemplateController } = await import('../src/modules/template-browser-adapter.js');
const {
  createTemplateListDomAdapter,
  renderTemplateList,
} = await import('../src/modules/template-list-dom.js');
const {
  createTemplateGeometry,
  isSupportedTemplateGeometry,
} = await import('../src/modules/template-geometry.js');
const { buildTemplateGroupFromDefinition } = await import('../src/modules/template-group-builder.js');
const {
  insertTemplateGroup,
  isObjectInsideGroup,
} = await import('../src/modules/template-actions.js');
const {
  addTemplateFromRegistry,
  buildTemplateGroupForRuntime,
  findTemplateById,
  getTemplateCategoriesFromRegistry,
} = await import('../src/modules/template-runtime-flow.js');
const { findBoneTargets } = await import('../src/modules/bone-visualization.js');
const { createBoneVisualizationController } = await import('../src/modules/bone-visualization-controller.js');
const { createBrowserBoneVisualizationController } = await import('../src/modules/bone-visualization-browser-adapter.js');
const {
  createEditorCamera,
  resizeViewport,
} = await import('../src/modules/scene-setup.js');
const {
  bindResizeHandler,
  createSceneDomAdapter,
  getCanvasElement,
  getDevicePixelRatio,
  getViewportElement,
} = await import('../src/modules/scene-dom.js');
const {
  createObjectListDomAdapter,
  renderObjectList,
  renderObjectListToggle,
  renderSelectedOverlay,
} = await import('../src/modules/object-list-dom.js');
const {
  refreshObjectList,
  toggleObjectList,
  updateSelectedOverlay,
} = await import('../src/modules/object-list.js');
const { createObjectListController } = await import('../src/modules/object-list-controller.js');
const { createBrowserObjectListController } = await import('../src/modules/object-list-browser-adapter.js');
const {
  createSceneObjectListDomAdapter,
  renderSceneObjectList,
} = await import('../src/modules/scene-object-list-dom.js');
const { refreshSceneObjectList } = await import('../src/modules/scene-object-list.js');
const { createSceneObjectListController } = await import('../src/modules/scene-object-list-controller.js');
const { createBrowserSceneObjectListController } = await import('../src/modules/scene-object-list-browser-adapter.js');
const { createSceneRenderLoop } = await import('../src/modules/scene-render-loop.js');
const { createSceneController } = await import('../src/modules/scene-controller.js');
const { createBrowserSceneController } = await import('../src/modules/scene-browser-adapter.js');
const { createSceneRuntimeController } = await import('../src/modules/scene-runtime-flow.js');
const {
  applyBonePivotCompensation,
  createBoneEditInfo,
  createPivotTransformUndoAction,
  createTransformSnapshot,
  createTransformUndoAction,
} = await import('../src/modules/scene-transform-controls.js');
const {
  createAnimationTimelineDomAdapter,
  getSelectedAnimationIndex,
  renderAnimationTimeline,
  setSelectedAnimationIndex,
  updateAnimationTimelinePlayback,
} = await import('../src/modules/animation-timeline-dom.js');
const {
  createAnimationImportDomAdapter,
  clearModalAnimationImportText,
  clearModeAnimationImportText,
  getModalAnimationImportText,
  getModeAnimationImportText,
  setModalAnimationImportError,
  setModeAnimationImportError,
} = await import('../src/modules/animation-import-dom.js');
const {
  formatAnimationImportFeedback,
  runAnimationImportSubmit,
  submitAnimationImport,
} = await import('../src/modules/animation-import-flow.js');
const {
  playAnimationClipAt,
  playSelectedAnimation,
  restartAnimationIfPlaying,
  toggleAnimationPlayback,
} = await import('../src/modules/animation-playback-flow.js');
const { createAnimationController } = await import('../src/modules/animation-controller.js');
const { createBrowserAnimationController } = await import('../src/modules/animation-browser-adapter.js');
const {
  getAnimationProgressRuntime,
  pauseAnimationRuntime,
  playAnimationRuntime,
  resumeAnimationRuntime,
  stopAnimationRuntime,
  togglePlayPauseRuntime,
  updateAnimationMixerRuntime,
} = await import('../src/modules/animation-runtime.js');
const {
  playAnimationModeClip,
  refreshAnimationModeListForGroup,
  renderTimelineForGroup,
} = await import('../src/modules/animation-panel-flow.js');
const {
  createAnimationPanelTargets,
  getModalAnimationImportTarget,
  getModeAnimationImportTarget,
  getPanelAnimationGroup,
  getPanelSelectedAnimationIndex,
} = await import('../src/modules/animation-panel-targets.js');
const { createAnimationPanelController } = await import('../src/modules/animation-panel-runtime-flow.js');
const { createAnimationPanelFacadeController } = await import('../src/modules/animation-panel-controller.js');
const { createBrowserAnimationPanel } = await import('../src/modules/animation-panel-browser-adapter.js');
const {
  createAnimationModeDomAdapter,
  hideAnimationModeChrome,
  showAnimationModeChrome,
} = await import('../src/modules/animation-mode-dom.js');
const {
  canEnterAnimationMode,
  deleteAnimationAt,
  enterAnimationModeState,
  exitAnimationModeState,
  getAnimationGroup,
  hasAnimationClipAt,
  hasAnimationClips,
} = await import('../src/modules/animation-mode-state.js');
const {
  runDeleteAnimationClip,
  runEnterAnimationMode,
  runExitAnimationMode,
} = await import('../src/modules/animation-mode-flow.js');
const { createAnimationTimelineLoop } = await import('../src/modules/animation-timeline-loop.js');
const {
  createAnimationListDomAdapter,
  renderAnimationModeList,
} = await import('../src/modules/animation-list-dom.js');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('creates isolated editor state instances from default shape', () => {
  const first = createEditorState();
  const second = createEditorState({ currentMaterialType: 'Phong' });
  const mesh = { id: 'mesh' };

  first.selectedMeshes.add(mesh);
  first.originalEmissive.set(mesh, { color: '#ffffff' });
  first.retroPalette.push('#000000');

  assert.equal(first.scene, null);
  assert.equal(first.animationMode, false);
  assert.equal(first.flatShadingEnabled, true);
  assert.equal(first.currentMaterialType, 'Lambert');
  assert.equal(second.currentMaterialType, 'Phong');
  assert.equal(second.selectedMeshes.size, 0);
  assert.equal(second.originalEmissive.size, 0);
  assert.deepEqual(second.retroPalette, DEFAULT_RETRO_PALETTE);
  assert.notEqual(first.selectedMeshes, second.selectedMeshes);
  assert.notEqual(first.originalEmissive, second.originalEmissive);
  assert.notEqual(first.retroPalette, DEFAULT_RETRO_PALETTE);
});

test('validates serialized scene shape', () => {
  const scene = {
    version: 1,
    objects: [{
      type: 'mesh',
      name: 'Cube',
      geometryType: 'cube',
      materialType: 'Lambert',
      color: '#ffcc00',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    }],
  };

  assert.equal(validateSerializedScene(scene), true);
  assert.equal(validateSerializedScene({ version: 1, objects: [{ ...scene.objects[0], position: [Infinity, 0, 0] }] }), false);
  assert.equal(validateSerializedScene({ version: 1, objects: Array.from({ length: 401 }, () => scene.objects[0]) }), false);
});

test('persists scene snapshots through injected storage adapters', () => {
  const calls = [];
  const savedValues = new Map();
  const storage = {
    setItem: (key, value) => {
      calls.push(['set', key, value]);
      savedValues.set(key, value);
    },
    getItem: (key) => {
      calls.push(['get', key]);
      return savedValues.get(key) || null;
    },
  };
  const sceneStorage = createSceneStorage({
    storage,
    storageKey: 'scene-key',
  });
  const snapshot = { version: 1, objects: [{ name: 'Cube' }] };

  assert.equal(sceneStorage.saveSceneSnapshot(snapshot), snapshot);
  assert.deepEqual(sceneStorage.loadSceneSnapshot(), snapshot);
  assert.equal(createSceneStorage({ storage }).loadSceneSnapshot(), null);
  assert.throws(() => createSceneStorage({ storage: null }).saveSceneSnapshot(snapshot), /unavailable/);
  assert.throws(() => createSceneStorage({ storage: null }).loadSceneSnapshot(), /unavailable/);
  assert.deepEqual(calls, [
    ['set', 'scene-key', JSON.stringify(snapshot)],
    ['get', 'scene-key'],
    ['get', 'lowpoly64-scene'],
  ]);

  assert.equal(saveSceneSnapshot(snapshot, { storage, storageKey: 'scene-key-2' }), snapshot);
  assert.deepEqual(loadSceneSnapshot({ storage, storageKey: 'scene-key-2' }), snapshot);
});

test('runs persistence runtime flows through injected adapters', async () => {
  const userObjects = new THREE.Group();
  const existing = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  const serializedMesh = { id: 'serialized-mesh' };
  let geometryDisposed = false;
  let materialDisposed = false;
  existing.geometry.dispose = () => { geometryDisposed = true; };
  existing.material.dispose = () => { materialDisposed = true; };
  userObjects.add(existing);

  const serialized = serializeRuntimeScene(userObjects, {
    serializeObject: (object) => (object === existing ? serializedMesh : null),
  });
  assert.deepEqual(serialized, { version: 1, objects: [serializedMesh] });

  const rebuilt = new THREE.Group();
  const calls = [];
  assert.deepEqual(deserializeRuntimeScene({ version: 1, objects: [{ id: 'new' }] }, {
    userObjects,
    deselect: () => calls.push(['deselect']),
    validateSerializedScene: () => true,
    deserializeObject: (data, options) => {
      calls.push(['deserialize', data, options]);
      return rebuilt;
    },
    pixelated: false,
    invalidMessage: 'Invalid scene',
  }), [rebuilt]);
  assert.equal(geometryDisposed, true);
  assert.equal(materialDisposed, true);
  assert.deepEqual(userObjects.children, [rebuilt]);
  assert.deepEqual(calls, [
    ['deselect'],
    ['deserialize', { id: 'new' }, { pixelated: false }],
  ]);

  assert.throws(() => deserializeRuntimeScene({ bad: true }, {
    userObjects,
    deselect: () => calls.push(['deselect-invalid']),
    validateSerializedScene: () => false,
    deserializeObject: () => null,
    invalidMessage: 'Invalid scene',
  }), /Invalid scene/);
  assert.deepEqual(calls.at(-1), ['deselect-invalid']);

  const storageCalls = [];
  assert.equal(saveRuntimeScene({
    serializeScene: () => ({ version: 1, objects: [] }),
    saveSceneSnapshot: (snapshot) => storageCalls.push(['save', snapshot]),
    showToast: (message) => storageCalls.push(['toast', message]),
    messages: { saved: 'Saved', error: 'Save error: ' },
  }), true);
  assert.equal(saveRuntimeScene({
    serializeScene: () => ({ version: 1 }),
    saveSceneSnapshot: () => { throw new Error('full'); },
    showToast: (message) => storageCalls.push(['toast', message]),
    messages: { saved: 'Saved', error: 'Save error: ' },
  }), false);

  assert.equal(loadRuntimeScene({
    loadSceneSnapshot: () => null,
    confirmLoad: () => true,
    deserializeScene: () => storageCalls.push(['unexpected']),
    showToast: (message) => storageCalls.push(['toast', message]),
    messages: { noSaved: 'No saved', confirm: 'Load?', loaded: 'Loaded', error: 'Load error: ', invalid: 'Invalid' },
  }), false);
  assert.equal(loadRuntimeScene({
    loadSceneSnapshot: () => ({ version: 1 }),
    confirmLoad: (message) => {
      storageCalls.push(['confirm', message]);
      return true;
    },
    deserializeScene: (snapshot) => storageCalls.push(['load', snapshot]),
    showToast: (message) => storageCalls.push(['toast', message]),
    messages: { noSaved: 'No saved', confirm: 'Load?', loaded: 'Loaded', error: 'Load error: ', invalid: 'Invalid' },
  }), true);

  assert.equal(exportRuntimeSceneJSON({
    serializeScene: () => ({ version: 1 }),
    downloadJSON: (payload, filename) => storageCalls.push(['download', payload, filename]),
    filename: 'scene.json',
  }), true);
  assert.equal(await importRuntimeSceneJSON('file', {
    readFileAsJSON: async (file) => ({ file }),
    deserializeScene: (payload) => storageCalls.push(['import', payload]),
    showToast: (message) => storageCalls.push(['toast', message]),
    messages: { loaded: 'Imported', error: 'Import error: ', invalid: 'Invalid' },
  }), true);

  assert.deepEqual(storageCalls, [
    ['save', { version: 1, objects: [] }],
    ['toast', 'Saved'],
    ['toast', 'Save error: full'],
    ['toast', 'No saved'],
    ['confirm', 'Load?'],
    ['load', { version: 1 }],
    ['toast', 'Loaded'],
    ['download', { version: 1 }, 'scene.json'],
    ['import', { file: 'file' }],
    ['toast', 'Imported'],
  ]);

  clearRuntimeUserObjects(userObjects);
  assert.equal(userObjects.children.length, 0);
});

test('downloads data URLs and blobs through shared browser download adapters', () => {
  const createdLinks = [];
  const clicked = [];
  const revoked = [];
  const documentRef = {
    createElement: (tagName) => {
      const link = {
        tagName,
        click() {
          clicked.push(['click', this.download, this.href]);
        },
      };
      createdLinks.push(link);
      return link;
    },
  };

  const directLink = createBrowserDownloadLink('direct.txt', 'data:text/plain,direct', { documentRef });
  assert.equal(directLink.tagName, 'a');
  assert.equal(directLink.download, 'direct.txt');
  assert.equal(directLink.href, 'data:text/plain,direct');

  const dataLink = downloadBrowserDataURL('data:text/plain,hello', 'hello.txt', {
    createDownloadLink: (filename, href) => ({ filename, href }),
    triggerDownload: (link) => clicked.push(['data', link.filename, link.href]),
  });
  assert.deepEqual(dataLink, { filename: 'hello.txt', href: 'data:text/plain,hello' });

  const blob = { id: 'blob' };
  const blobLink = downloadBrowserBlob(blob, 'asset.bin', {
    urlApi: {
      createObjectURL: (targetBlob) => {
        assert.equal(targetBlob, blob);
        return 'blob:asset';
      },
      revokeObjectURL: (href) => revoked.push(href),
    },
    createDownloadLink: (filename, href) => ({ filename, href }),
    triggerDownload: (link) => clicked.push(['blob', link.filename, link.href]),
  });

  assert.deepEqual(blobLink, { filename: 'asset.bin', href: 'blob:asset' });
  assert.deepEqual(clicked, [
    ['data', 'hello.txt', 'data:text/plain,hello'],
    ['blob', 'asset.bin', 'blob:asset'],
  ]);
  assert.deepEqual(revoked, ['blob:asset']);
});

test('builds downloads and copies JSON export payloads through injected adapters', () => {
  const sceneChild = { id: 'scene-child' };
  const selected = { id: 'selected' };
  const modeObject = { id: 'mode-object' };
  const calls = [];
  const serializeGroup = (object) => {
    calls.push(['serialize', object]);
    if (object?.id === 'bad') return null;
    return {
      name: object.id === 'selected' ? 'Hero Ship' : object.id,
      objectId: object.id,
    };
  };
  const translate = (key) => `t:${key}`;

  const scenePayload = createJSONExportPayload({
    exportState: {
      animationMode: false,
      selectedMesh: null,
      userObjects: { children: [sceneChild] },
    },
    serializeGroup,
    translate,
  });
  assert.deepEqual(scenePayload.payload.data, {
    name: 'SCENE',
    objects: [{ name: 'scene-child', objectId: 'scene-child' }],
  });
  assert.equal(scenePayload.payload.filename, 'scene.json');
  assert.equal(scenePayload.payload.toast, 't:sceneExported');

  const objectPayload = createJSONExportPayload({
    exportState: {
      animationMode: false,
      selectedMesh: selected,
      userObjects: { children: [] },
    },
    serializeGroup,
    translate,
  });
  assert.equal(objectPayload.payload.filename, 'hero_ship.json');
  assert.equal(objectPayload.payload.toast, 't:objectExported');

  const modePayload = createJSONExportPayload({
    exportState: {
      animationMode: true,
      animationModeObject: modeObject,
      selectedMesh: selected,
      userObjects: { children: [] },
    },
    serializeGroup,
    translate,
  });
  assert.equal(modePayload.payload.filename, 'mode-object.json');

  assert.deepEqual(createJSONExportPayload({
    exportState: {
      animationMode: false,
      selectedMesh: null,
      userObjects: { children: [] },
    },
    requireSelection: true,
    serializeGroup,
    translate,
  }), { error: 't:selectObjectFirst' });

  assert.deepEqual(createJSONExportPayload({
    exportState: {
      animationMode: false,
      selectedMesh: { id: 'bad' },
      userObjects: { children: [] },
    },
    serializeGroup,
    translate,
  }), { error: 't:couldNotSerialize' });

  calls.length = 0;
  const downloaded = [];
  const toasts = [];
  const payload = downloadJSONExport({
    exportState: {
      animationMode: false,
      selectedMesh: selected,
      userObjects: { children: [] },
    },
    serializeGroup,
    downloadJSON: (data, filename) => downloaded.push([data, filename]),
    showToast: (message) => toasts.push(message),
    translate,
    showSuccessToast: true,
  });
  assert.equal(payload.filename, 'hero_ship.json');
  assert.deepEqual(downloaded, [[{ name: 'Hero Ship', objectId: 'selected' }, 'hero_ship.json']]);
  assert.deepEqual(toasts, ['t:objectExported']);

  assert.equal(downloadJSONExport({
    exportState: {
      animationMode: false,
      selectedMesh: null,
      userObjects: { children: [] },
    },
    requireSelection: true,
    serializeGroup,
    downloadJSON: () => calls.push(['download']),
    showToast: (message) => toasts.push(message),
    translate,
  }), null);
  assert.equal(toasts[toasts.length - 1], 't:selectObjectFirst');

  const copied = [];
  assert.equal(copyJSONExport({
    exportState: {
      animationMode: false,
      selectedMesh: selected,
      userObjects: { children: [] },
    },
    serializeGroup,
    copyJSON: (data) => {
      copied.push(data);
      return 'copy-result';
    },
    translate,
  }), 'copy-result');
  assert.deepEqual(copied, [{ name: 'Hero Ship', objectId: 'selected' }]);

  assert.equal(copySceneJSONExport({
    serializeScene: () => ({ scene: true }),
    copyJSON: (data) => {
      copied.push(data);
      return 'scene-copy';
    },
  }), 'scene-copy');
  assert.deepEqual(copied[copied.length - 1], { scene: true });
});

test('copies JSON to clipboard and falls back to prompt on failure', async () => {
  const data = { hello: 'world' };
  const writes = [];
  const toasts = [];
  const prompts = [];
  const translate = (key) => `t:${key}`;

  const success = await copyJSONToClipboard(data, {
    writeText: async (json) => writes.push(json),
    promptCopy: (message, json) => prompts.push([message, json]),
    showToast: (message) => toasts.push(message),
    translate,
  });
  assert.equal(success.copied, true);
  assert.equal(success.json, JSON.stringify(data, null, 2));
  assert.deepEqual(writes, [JSON.stringify(data, null, 2)]);
  assert.deepEqual(toasts, ['t:jsonCopied']);
  assert.deepEqual(prompts, []);

  const failure = await copyJSONToClipboard(data, {
    writeText: async () => {
      throw new Error('denied');
    },
    promptCopy: (message, json) => prompts.push([message, json]),
    showToast: (message) => toasts.push(message),
    translate,
  });
  assert.equal(failure.copied, false);
  assert.equal(failure.json, JSON.stringify(data, null, 2));
  assert.deepEqual(prompts, [['t:copyThisJson', JSON.stringify(data, null, 2)]]);
});

test('builds browser JSON export adapter through injected flow factories', () => {
  const exportState = { id: 'browser-json-export-state' };
  const serializedScene = { scene: true };
  const copiedPayload = { copied: true };
  const copyCalls = [];
  const calls = [];
  const serializeGroup = () => ({ group: true });
  const downloadJSONCommand = () => {};
  const showToastCommand = () => {};
  const translate = (key) => `t:${key}`;
  const writeText = () => {};
  const promptCopy = () => {};

  const exporter = createBrowserJSONExporter({
    exportState,
    serializeGroup,
    serializeSceneCommand: () => serializedScene,
    downloadJSONCommand,
    showToastCommand,
    translate,
    writeText,
    promptCopy,
    copyJSONToClipboardCommand: (data, options) => {
      copyCalls.push([data, options]);
      return 'copy-json-result';
    },
    downloadJSONExportCommand: (options) => {
      calls.push(['download', options]);
      return 'download-result';
    },
    copyJSONExportCommand: (options) => {
      calls.push(['copy-export', options]);
      return options.copyJSON(copiedPayload);
    },
    copySceneJSONExportCommand: (options) => {
      calls.push(['copy-scene', options.serializeScene()]);
      return options.copyJSON({ sceneCopy: true });
    },
  });

  assert.equal(exporter.exportObjectJSON(), 'download-result');
  assert.equal(exporter.downloadObjectJSON(), 'download-result');
  assert.equal(exporter.copyObjectJSON(), 'copy-json-result');
  assert.equal(exporter.copyExportJSON(), 'copy-json-result');
  assert.equal(exporter.copySceneJSON(), 'copy-json-result');

  assert.equal(calls[0][0], 'download');
  assert.equal(calls[0][1].exportState, exportState);
  assert.equal(calls[0][1].serializeGroup, serializeGroup);
  assert.equal(calls[0][1].downloadJSON, downloadJSONCommand);
  assert.equal(calls[0][1].showToast, showToastCommand);
  assert.equal(calls[0][1].translate, translate);
  assert.equal(calls[0][1].showSuccessToast, true);
  assert.equal(calls[1][1].requireSelection, true);
  assert.equal(calls[2][1].requireSelection, true);
  assert.equal(calls[3][1].requireSelection, undefined);
  assert.deepEqual(calls[4], ['copy-scene', serializedScene]);
  assert.deepEqual(copyCalls.map(([data]) => data), [
    copiedPayload,
    copiedPayload,
    { sceneCopy: true },
  ]);
  assert.equal(copyCalls[0][1].writeText, writeText);
  assert.equal(copyCalls[0][1].promptCopy, promptCopy);
  assert.equal(copyCalls[0][1].showToast, showToastCommand);
  assert.equal(copyCalls[0][1].translate, translate);
});

test('coordinates persistence controller through injected runtime getter browser and runtime adapters', async () => {
  const userObjects = { id: 'userObjects' };
  const persistenceState = {
    pixelatedMode: true,
    userObjects,
  };
  const calls = [];
  const serializedScene = { version: 1, objects: [{ id: 'scene' }] };
  const loadedSnapshot = { version: 1, objects: [{ id: 'loaded' }] };
  const importedSnapshot = { version: 1, objects: [{ id: 'imported' }] };
  const serializeObjectAdapter = (object) => ({ object });
  const deserializeObjectAdapter = (data) => ({ data });
  const validateSerializedSceneAdapter = () => true;
  const clearUserObjectsAdapter = () => calls.push(['clear-user-objects']);

  const controller = createPersistenceController({
    getPersistenceState: () => persistenceState,
    deselect: () => calls.push(['deselect']),
    showToast: (message) => calls.push(['toast', message]),
    translate: (key) => ({
      confirmLoadScene: 'LOAD?',
      noSavedScene: 'NO SAVED',
      sceneImportError: 'IMPORT ERROR: ',
      sceneInvalidData: 'INVALID SCENE',
      sceneLoadError: 'LOAD ERROR: ',
      sceneLoaded: 'SCENE LOADED',
      sceneSaveError: 'SAVE ERROR: ',
      sceneSaved: 'SCENE SAVED',
    })[key] || key,
    serializeObject: serializeObjectAdapter,
    deserializeObject: deserializeObjectAdapter,
    validateSerializedScene: validateSerializedSceneAdapter,
    saveSceneSnapshot: (snapshot) => calls.push(['save-snapshot', snapshot]),
    loadSceneSnapshot: () => {
      calls.push(['load-snapshot']);
      return loadedSnapshot;
    },
    downloadJSON: (payload, filename) => calls.push(['download', payload, filename]),
    readFileAsJSON: async (file) => {
      calls.push(['read-file', file]);
      return importedSnapshot;
    },
    confirmLoad: (message) => {
      calls.push(['confirm', message]);
      return true;
    },
    sceneJsonFilename: 'scene.json',
    clearUserObjects: clearUserObjectsAdapter,
    serializeRuntimeSceneCommand: (root, options) => {
      calls.push(['serialize-runtime', root, options.serializeObject]);
      return serializedScene;
    },
    deserializeRuntimeSceneCommand: (json, options) => {
      calls.push([
        'deserialize-runtime',
        json,
        options.userObjects,
        options.pixelated,
        options.invalidMessage,
        options.deserializeObject,
        options.validateSerializedScene,
        options.clearUserObjects,
      ]);
      options.deselect();
      return ['rebuilt'];
    },
    saveRuntimeSceneCommand: (options) => {
      calls.push(['save-runtime', options.messages]);
      options.saveSceneSnapshot(options.serializeScene());
      options.showToast(options.messages.saved);
      return 'save-result';
    },
    loadRuntimeSceneCommand: (options) => {
      calls.push(['load-runtime', options.messages]);
      const snapshot = options.loadSceneSnapshot();
      if (options.confirmLoad(options.messages.confirm)) {
        options.deserializeScene(snapshot);
      }
      options.showToast(options.messages.loaded);
      return 'load-result';
    },
    exportRuntimeSceneJSONCommand: (options) => {
      calls.push(['export-runtime', options.filename]);
      options.downloadJSON(options.serializeScene(), options.filename);
      return 'export-result';
    },
    importRuntimeSceneJSONCommand: async (file, options) => {
      calls.push(['import-runtime', file, options.messages]);
      const payload = await options.readFileAsJSON(file);
      options.deserializeScene(payload);
      options.showToast(options.messages.loaded);
      return 'import-result';
    },
  });

  assert.deepEqual(controller.serializeScene(), serializedScene);
  assert.deepEqual(calls.splice(0), [
    ['serialize-runtime', userObjects, serializeObjectAdapter],
  ]);

  assert.deepEqual(controller.deserializeScene({ version: 1 }), ['rebuilt']);
  assert.deepEqual(calls.splice(0), [
    [
      'deserialize-runtime',
      { version: 1 },
      userObjects,
      true,
      'INVALID SCENE',
      deserializeObjectAdapter,
      validateSerializedSceneAdapter,
      clearUserObjectsAdapter,
    ],
    ['deselect'],
  ]);

  assert.equal(controller.saveToLocalStorage(), 'save-result');
  assert.deepEqual(calls.splice(0), [
    ['save-runtime', { saved: 'SCENE SAVED', error: 'SAVE ERROR: ' }],
    ['serialize-runtime', userObjects, serializeObjectAdapter],
    ['save-snapshot', serializedScene],
    ['toast', 'SCENE SAVED'],
  ]);

  assert.equal(controller.loadFromLocalStorage(), 'load-result');
  assert.deepEqual(calls.splice(0), [
    ['load-runtime', {
      noSaved: 'NO SAVED',
      confirm: 'LOAD?',
      loaded: 'SCENE LOADED',
      error: 'LOAD ERROR: ',
      invalid: 'INVALID SCENE',
    }],
    ['load-snapshot'],
    ['confirm', 'LOAD?'],
    [
      'deserialize-runtime',
      loadedSnapshot,
      userObjects,
      true,
      'INVALID SCENE',
      deserializeObjectAdapter,
      validateSerializedSceneAdapter,
      clearUserObjectsAdapter,
    ],
    ['deselect'],
    ['toast', 'SCENE LOADED'],
  ]);

  assert.equal(controller.exportSceneJSON(), 'export-result');
  assert.deepEqual(calls.splice(0), [
    ['export-runtime', 'scene.json'],
    ['serialize-runtime', userObjects, serializeObjectAdapter],
    ['download', serializedScene, 'scene.json'],
  ]);

  assert.equal(await controller.importSceneJSON('file.json'), 'import-result');
  assert.deepEqual(calls.splice(0), [
    ['import-runtime', 'file.json', {
      loaded: 'SCENE LOADED',
      error: 'IMPORT ERROR: ',
      invalid: 'INVALID SCENE',
    }],
    ['read-file', 'file.json'],
    [
      'deserialize-runtime',
      importedSnapshot,
      userObjects,
      true,
      'INVALID SCENE',
      deserializeObjectAdapter,
      validateSerializedSceneAdapter,
      clearUserObjectsAdapter,
    ],
    ['deselect'],
    ['toast', 'SCENE LOADED'],
  ]);
});

test('builds browser persistence controller adapter through injected facade factory', () => {
  const persistenceState = { id: 'browser-persistence-state' };
  const sceneStorage = {
    saveSceneSnapshot: () => 'save-scene-snapshot',
    loadSceneSnapshot: () => 'load-scene-snapshot',
  };
  const facade = {
    deserializeScene: () => 'deserialize-result',
    exportSceneJSON: () => 'export-result',
    importSceneJSON: () => 'import-result',
    loadFromLocalStorage: () => 'load-result',
    saveToLocalStorage: () => 'save-result',
    serializeScene: () => 'serialize-result',
  };
  let facadeOptions = null;

  const result = createBrowserPersistenceController({
    getPersistenceState: () => persistenceState,
    sceneStorage,
    confirmLoad: (message) => `confirm:${message}`,
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getPersistenceState(), persistenceState);
  assert.equal(facadeOptions.confirmLoad('load scene'), 'confirm:load scene');
  assert.equal(typeof facadeOptions.deselect, 'function');
  assert.equal(typeof facadeOptions.showToast, 'function');
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.equal(typeof facadeOptions.serializeObject, 'function');
  assert.equal(typeof facadeOptions.deserializeObject, 'function');
  assert.equal(typeof facadeOptions.validateSerializedScene, 'function');
  assert.equal(facadeOptions.saveSceneSnapshot, sceneStorage.saveSceneSnapshot);
  assert.equal(facadeOptions.loadSceneSnapshot, sceneStorage.loadSceneSnapshot);
  assert.equal(typeof facadeOptions.downloadJSON, 'function');
  assert.equal(typeof facadeOptions.readFileAsJSON, 'function');
});

test('serializes and deserializes a mesh object', () => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 4),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  mesh.userData.name = 'TEST_CUBE';
  mesh.userData.geometryType = 'cube';
  mesh.position.set(1, 2, 3);

  const serialized = serializeObject(mesh);
  assert.equal(serialized.type, 'mesh');
  assert.equal(serialized.name, 'TEST_CUBE');
  assert.deepEqual(serialized.position, [1, 2, 3]);

  const restored = deserializeObject(serialized);
  assert.equal(restored.isMesh, true);
  assert.equal(restored.userData.name, 'TEST_CUBE');
  assert.deepEqual(restored.position.toArray(), [1, 2, 3]);
});

test('exports pivot hierarchy as import-compatible pieces', () => {
  const group = new THREE.Group();
  group.userData.name = 'GROUP';

  const body = new THREE.Group();
  body.userData.name = 'BODY';
  body.userData.isPivot = true;
  body.position.set(0, 1, 0);
  body.add(new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  ));

  const head = new THREE.Group();
  head.userData.name = 'HEAD';
  head.userData.isPivot = true;
  head.position.set(0, 1, 0);
  head.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 6),
    new THREE.MeshLambertMaterial({ color: '#ffffff' })
  ));

  body.add(head);
  group.add(body);

  const exported = serializeGroupAsImportJSON(group);
  assert.equal(exported.name, 'GROUP');
  assert.equal(exported.pieces.length, 2);
  assert.equal(exported.pieces[1].parent, 'BODY');
});

test('applies per-face UV data to box geometry', () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const uvData = createDefaultFaceUVData();
  uvData[0] = { ou: 0.25, ov: 0.25, su: 0.5, sv: 0.5, rot: 0 };

  applyFaceUVDataToGeometry(geometry, 0, uvData);

  const uv = geometry.attributes.uv;
  assert.equal(uv.getX(0), 0.25);
  assert.equal(uv.getY(0), 0.75);
  assert.deepEqual(cloneFaceUVData(uvData)[0], uvData[0]);
});

test('picks texture preview face index through injected raycast adapters', () => {
  const calls = [];
  const previewMesh = { id: 'mesh' };
  const previewCamera = { id: 'camera' };
  const previewRenderer = {
    domElement: {
      getBoundingClientRect: () => ({
        left: 10,
        top: 20,
        width: 100,
        height: 200,
      }),
    },
  };

  class FakeVector2 {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      calls.push(['vector', x, y]);
    }
  }

  class FakeRaycaster {
    setFromCamera(mouse, camera) {
      calls.push(['camera', mouse, camera]);
    }

    intersectObject(mesh) {
      calls.push(['intersect', mesh]);
      return [{ faceIndex: 7 }];
    }
  }

  assert.equal(pickPreviewFaceIndex({
    clientX: 60,
    clientY: 70,
  }, {
    previewRenderer,
    previewCamera,
    previewMesh,
    Vector2Class: FakeVector2,
    RaycasterClass: FakeRaycaster,
  }), 3);

  assert.equal(calls[0][0], 'vector');
  assert.equal(calls[0][1], 0);
  assert.equal(calls[0][2], 0.5);
  assert.equal(calls[1][0], 'camera');
  assert.equal(calls[1][1].x, 0);
  assert.equal(calls[1][1].y, 0.5);
  assert.equal(calls[1][2], previewCamera);
  assert.deepEqual(calls[2], ['intersect', previewMesh]);

  class EmptyRaycaster {
    setFromCamera() {}
    intersectObject() {
      return [];
    }
  }
  assert.equal(pickPreviewFaceIndex({ clientX: 0, clientY: 0 }, {
    previewRenderer,
    previewCamera,
    previewMesh,
    RaycasterClass: EmptyRaycaster,
  }), -1);

  class OutOfRangeRaycaster {
    setFromCamera() {}
    intersectObject() {
      return [{ faceIndex: 12 }];
    }
  }
  assert.equal(pickPreviewFaceIndex({ clientX: 0, clientY: 0 }, {
    previewRenderer,
    previewCamera,
    previewMesh,
    RaycasterClass: OutOfRangeRaycaster,
  }), -1);
  assert.equal(pickPreviewFaceIndex({ clientX: 0, clientY: 0 }, {
    previewRenderer,
    previewCamera,
  }), -1);
});

test('creates and disposes texture preview face highlight geometry', () => {
  const previewMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );

  const highlight = createFaceHighlight(previewMesh, 0);
  assert.equal(highlight.parent, previewMesh);
  assert.equal(highlight.renderOrder, 999);
  assert.equal(highlight.material.depthTest, false);
  assert.equal(highlight.geometry.attributes.position.count, 4);

  const disposed = [];
  highlight.geometry.addEventListener('dispose', () => disposed.push('geometry'));
  highlight.material.addEventListener('dispose', () => disposed.push('material'));
  assert.equal(disposeFaceHighlight(highlight), null);
  assert.equal(highlight.parent, null);
  assert.deepEqual(disposed, ['geometry', 'material']);
  assert.equal(createFaceHighlight({}, 0), null);
  assert.equal(disposeFaceHighlight(null), null);
});

test('runs texture face preview interaction flow through injected adapters', () => {
  const calls = [];
  const stateRef = createTextureFaceEditingState();
  const onPreviewClick = () => {};
  const previewClickElement = {
    removeEventListener: (...args) => calls.push(['removeListener', ...args]),
  };

  assert.equal(removeTextureFacePreviewClickListener(stateRef, { onPreviewClick }), false);
  stateRef.previewClickElement = previewClickElement;
  assert.equal(removeTextureFacePreviewClickListener(stateRef, { onPreviewClick }), true);
  assert.equal(stateRef.previewClickElement, null);
  assert.deepEqual(calls.splice(0), [['removeListener', 'click', onPreviewClick]]);

  const event = { id: 'preview-click' };
  const previewMesh = { id: 'preview-mesh' };
  const previewRenderer = { id: 'preview-renderer' };
  const previewCamera = { id: 'preview-camera' };
  const handlers = { id: 'handlers' };
  assert.equal(selectTextureFaceFromPreviewClick(stateRef, event, {
    previewMesh,
    previewRenderer,
    previewCamera,
    handlers,
    pickPreviewFaceIndexCommand: (pickedEvent, options) => {
      calls.push(['pick', pickedEvent, options]);
      return 4;
    },
    selectFaceFromIndex: (state, faceIndex, injectedHandlers) => {
      calls.push(['select', state, faceIndex, injectedHandlers]);
      state.selectedFace = faceIndex;
      return true;
    },
  }), true);
  assert.equal(stateRef.selectedFace, 4);
  assert.deepEqual(calls.splice(0), [
    ['pick', event, { previewMesh, previewRenderer, previewCamera }],
    ['select', stateRef, 4, handlers],
  ]);

  const oldHighlight = { id: 'old-highlight' };
  const newHighlight = { id: 'new-highlight' };
  stateRef.faceHighlight = oldHighlight;
  assert.equal(replaceTextureFaceHighlight(stateRef, 2, {
    previewMesh,
    disposeFaceHighlightCommand: (highlight) => {
      calls.push(['dispose', highlight]);
      return null;
    },
    createFaceHighlightCommand: (mesh, faceIndex) => {
      calls.push(['create', mesh, faceIndex]);
      return newHighlight;
    },
  }), newHighlight);
  assert.equal(stateRef.faceHighlight, newHighlight);
  assert.deepEqual(calls.splice(0), [
    ['dispose', oldHighlight],
    ['create', previewMesh, 2],
  ]);

  assert.equal(removeTextureFaceHighlight(stateRef, {
    disposeFaceHighlightCommand: (highlight) => {
      calls.push(['dispose', highlight]);
      return null;
    },
  }), null);
  assert.equal(stateRef.faceHighlight, null);
  assert.deepEqual(calls, [['dispose', newHighlight]]);
});

test('computes and renders texture face UV overlay adapters', () => {
  function createClassList() {
    const classes = new Set();
    return {
      classes,
      add: (className) => classes.add(className),
      remove: (className) => classes.delete(className),
      contains: (className) => classes.has(className),
    };
  }

  const paintCanvas = {
    clientWidth: 200,
    clientHeight: 100,
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      width: 100,
      height: 50,
    }),
  };

  assert.deepEqual(getTextureFaceCanvasUV({
    clientX: 60,
    clientY: 45,
  }, paintCanvas), {
    u: 0.5,
    v: 0.5,
  });
  assert.deepEqual(getTextureFaceCanvasUV({
    clientX: -10,
    clientY: 100,
  }, paintCanvas), {
    u: 0,
    v: 1,
  });
  assert.equal(getTextureFaceCanvasUV({ clientX: 0, clientY: 0 }, null), null);

  assert.deepEqual(calculateUvMapSelection({ u: 0.75, v: 0.25 }, { u: 0.25, v: 0.75 }), {
    ou: 0.25,
    ov: 0.25,
    su: 0.5,
    sv: 0.5,
  });

  const overlay = {
    classList: createClassList(),
    style: {},
  };
  const faceUVData = [
    { ou: 0.1, ov: 0.2, su: 0.3, sv: 0.4 },
  ];
  assert.equal(renderSelectedFaceOverlay({
    overlay,
    paintCanvas,
    selectedFace: 0,
    faceUVData,
    uvMapMode: false,
    colors: ['#abc'],
  }), true);
  assert.equal(overlay.classList.contains('hidden'), false);
  assert.deepEqual(overlay.style, {
    left: '20px',
    top: '20px',
    width: '60px',
    height: '40px',
    borderColor: '#abc',
  });

  assert.equal(renderSelectedFaceOverlay({
    overlay,
    paintCanvas,
    selectedFace: -1,
    faceUVData,
    uvMapMode: false,
  }), false);
  assert.equal(overlay.classList.contains('hidden'), true);
});

test('draws texture face UV map canvas overlay', () => {
  function createClassList() {
    const classes = new Set();
    return {
      classes,
      add: (className) => classes.add(className),
      remove: (className) => classes.delete(className),
      contains: (className) => classes.has(className),
    };
  }

  const calls = [];
  const ctx = {
    clearRect: (...args) => calls.push(['clear', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    strokeRect: (...args) => calls.push(['strokeRect', ...args]),
    fillText: (...args) => calls.push(['fillText', ...args]),
    set globalAlpha(value) {
      calls.push(['alpha', value]);
    },
    set fillStyle(value) {
      calls.push(['fillStyle', value]);
    },
    set strokeStyle(value) {
      calls.push(['strokeStyle', value]);
    },
    set lineWidth(value) {
      calls.push(['lineWidth', value]);
    },
    set font(value) {
      calls.push(['font', value]);
    },
  };
  const canvas = {
    classList: createClassList(),
    style: {},
    getContext: () => ctx,
  };
  const paintCanvas = {
    clientWidth: 100,
    clientHeight: 50,
  };

  assert.equal(drawFaceUvMapCanvas({
    canvas,
    paintCanvas,
    faceUVData: [
      { ou: 0.1, ov: 0.2, su: 0.3, sv: 0.4 },
      { ou: 0.5, ov: 0.6, su: 0.2, sv: 0.1 },
    ],
    selectedFace: 1,
    uvMapMode: true,
    faceNames: ['right', 'left'],
    colors: ['red', 'blue'],
  }), true);

  assert.equal(canvas.classList.contains('hidden'), false);
  assert.equal(canvas.width, 100);
  assert.equal(canvas.height, 50);
  assert.equal(canvas.style.width, '100px');
  assert.equal(canvas.style.height, '50px');
  assert.deepEqual(calls.slice(0, 10), [
    ['clear', 0, 0, 100, 50],
    ['alpha', 0.1],
    ['fillStyle', 'red'],
    ['fillRect', 10, 10, 30, 20],
    ['alpha', 1],
    ['strokeStyle', 'red'],
    ['lineWidth', 1],
    ['strokeRect', 10, 10, 30, 20],
    ['fillStyle', 'red'],
    ['font', 'bold 9px monospace'],
  ]);
  assert.deepEqual(calls[10], ['fillText', 'right', 13, 21]);
  assert.deepEqual(calls.slice(11), [
    ['alpha', 0.25],
    ['fillStyle', 'blue'],
    ['fillRect', 50, 30, 20, 5],
    ['alpha', 1],
    ['strokeStyle', 'blue'],
    ['lineWidth', 2.5],
    ['strokeRect', 50, 30, 20, 5],
    ['fillStyle', 'blue'],
    ['font', 'bold 9px monospace'],
    ['fillText', 'left', 53, 41],
  ]);

  assert.equal(drawFaceUvMapCanvas({
    canvas,
    paintCanvas,
    faceUVData: [],
    selectedFace: -1,
    uvMapMode: false,
    faceNames: [],
  }), false);
  assert.equal(canvas.classList.contains('hidden'), true);
});

test('maps texture face render flow through injected adapters', () => {
  const stateRef = createTextureFaceEditingState();
  stateRef.selectedFace = 2;
  stateRef.uvMapMode = true;
  stateRef.faceUVData = [
    { ou: 0.1, ov: 0.2, su: 0.3, sv: 0.4, rot: 0 },
    { ou: 0.5, ov: 0.6, su: 0.7, sv: 0.8, rot: 90 },
  ];

  assert.deepEqual(getTextureFaceNames((key) => `label:${key}`), [
    'label:faceRight',
    'label:faceLeft',
    'label:faceTop',
    'label:faceBottom',
    'label:faceFront',
    'label:faceBack',
  ]);

  let uiOptions;
  assert.equal(renderTextureFaceUI(stateRef, {
    renderFaceControlsCommand: (options) => {
      uiOptions = options;
      return 'ui-rendered';
    },
  }), 'ui-rendered');
  assert.deepEqual(uiOptions, {
    selectedFace: 2,
    faceUVData: stateRef.faceUVData,
  });

  const overlay = { id: 'overlay' };
  const paintCanvas = { id: 'paint-canvas' };
  let overlayOptions;
  assert.equal(renderTextureFaceOverlay(stateRef, {
    overlay,
    paintCanvas,
    renderSelectedFaceOverlayCommand: (options) => {
      overlayOptions = options;
      return 'overlay-rendered';
    },
  }), 'overlay-rendered');
  assert.deepEqual(overlayOptions, {
    overlay,
    paintCanvas,
    selectedFace: 2,
    faceUVData: stateRef.faceUVData,
    uvMapMode: true,
  });

  const canvas = { id: 'uv-map-canvas' };
  const faceNames = ['right', 'left'];
  let drawOptions;
  assert.equal(renderAllTextureFaceOverlays(stateRef, {
    canvas,
    paintCanvas,
    faceNames,
    drawFaceUvMapCanvasCommand: (options) => {
      drawOptions = options;
      return 'all-overlays-rendered';
    },
  }), 'all-overlays-rendered');
  assert.deepEqual(drawOptions, {
    canvas,
    paintCanvas,
    faceUVData: stateRef.faceUVData,
    selectedFace: 2,
    uvMapMode: true,
    faceNames,
  });
});

test('reads and renders texture face UV form controls through DOM adapters', () => {
  function createClassList() {
    const classes = new Set(['hidden']);
    return {
      classes,
      add: (className) => classes.add(className),
      remove: (className) => classes.delete(className),
      contains: (className) => classes.has(className),
    };
  }

  const values = new Map([
    ['tex-uv-ox', { value: '0.25' }],
    ['tex-uv-oy', { value: 'bad' }],
    ['tex-uv-rx', { value: '2.5' }],
    ['tex-uv-ry', { value: '' }],
    ['tex-uv-rot', { value: '45' }],
    ['tex-face-ou', { value: '' }],
    ['tex-face-ov', { value: '' }],
    ['tex-face-su', { value: '' }],
    ['tex-face-sv', { value: '' }],
    ['tex-face-rot', { value: '' }],
  ]);
  const getInput = (id) => values.get(id) || null;

  assert.deepEqual(readTextureUvInputs({ getInput }), {
    ox: 0.25,
    oy: 0,
    rx: 2.5,
    ry: 1,
    rotDeg: 45,
  });

  writeGlobalUvInputs({
    ox: 0.125,
    oy: 0.5,
    rx: 1.25,
    ry: 2,
    rotDeg: 33.7,
  }, { getInput });
  assert.equal(values.get('tex-uv-ox').value, '0.13');
  assert.equal(values.get('tex-uv-oy').value, '0.50');
  assert.equal(values.get('tex-uv-rx').value, '1.25');
  assert.equal(values.get('tex-uv-ry').value, '2.00');
  assert.equal(values.get('tex-uv-rot').value, '34');

  const select = { value: '' };
  const controls = { classList: createClassList() };
  assert.equal(renderFaceControls({
    selectedFace: 1,
    faceUVData: [
      { ou: 0, ov: 0, su: 1, sv: 1, rot: 0 },
      { ou: 0.2, ov: 0.3, su: 0.4, sv: 0.5, rot: 90 },
    ],
    getSelect: () => select,
    getControls: () => controls,
    getInput,
  }), true);
  assert.equal(select.value, 1);
  assert.equal(controls.classList.contains('hidden'), false);
  assert.equal(values.get('tex-face-ou').value, '0.20');
  assert.equal(values.get('tex-face-ov').value, '0.30');
  assert.equal(values.get('tex-face-su').value, '0.40');
  assert.equal(values.get('tex-face-sv').value, '0.50');
  assert.equal(values.get('tex-face-rot').value, 90);

  assert.equal(renderFaceControls({
    selectedFace: -1,
    faceUVData: [],
    getSelect: () => select,
    getControls: () => controls,
    getInput,
  }), false);
  assert.equal(select.value, -1);
  assert.equal(controls.classList.contains('hidden'), true);
});

test('manages texture face editing state transitions', () => {
  const stateRef = createTextureFaceEditingState();
  assert.deepEqual(stateRef, {
    selectedFace: -1,
    faceUVData: [],
    targetMesh: null,
    faceHighlight: null,
    uvMapMode: false,
    uvMapDragging: false,
    uvMapStartPos: null,
    previewClickElement: null,
  });

  stateRef.selectedFace = 2;
  stateRef.faceUVData = [{ ou: 0.1 }];
  stateRef.targetMesh = { name: 'mesh' };
  stateRef.faceHighlight = { name: 'highlight' };
  stateRef.previewClickElement = { name: 'canvas' };
  stateRef.uvMapDragging = true;
  stateRef.uvMapStartPos = { u: 0.2, v: 0.3 };
  setTextureFaceUvMapMode(stateRef, true);
  assert.equal(stateRef.uvMapMode, true);
  assert.equal(stateRef.uvMapDragging, true);
  assert.deepEqual(stateRef.uvMapStartPos, { u: 0.2, v: 0.3 });

  setTextureFaceUvMapMode(stateRef, false);
  assert.equal(stateRef.uvMapMode, false);
  assert.equal(stateRef.uvMapDragging, false);
  assert.equal(stateRef.uvMapStartPos, null);

  assert.equal(toggleTextureFaceUvMapMode(stateRef), true);
  stateRef.uvMapDragging = true;
  stateRef.uvMapStartPos = { u: 0.4, v: 0.5 };
  resetTextureFaceUvMapDrag(stateRef);
  assert.equal(stateRef.uvMapDragging, false);
  assert.equal(stateRef.uvMapStartPos, null);

  resetTextureFaceEditingState(stateRef);
  assert.deepEqual(stateRef, createTextureFaceEditingState());
});

test('initializes texture face editing through injected adapters', () => {
  const calls = [];
  const stateRef = createTextureFaceEditingState();
  const previewCanvas = {
    style: {},
    addEventListener: (eventName, handler) => calls.push(['listen', eventName, handler.name]),
  };
  const section = {
    classList: {
      toggle: (className, value) => calls.push(['toggle', className, value]),
    },
  };
  const mesh = {
    material: { map: { id: 'map' } },
    userData: {
      geometryType: 'cube',
      faceUVs: Array.from({ length: 6 }, (_unused, index) => ({
        ou: index / 10,
        ov: index / 20,
        su: 1 + index,
        sv: 2 + index,
        rot: index * 15,
      })),
    },
  };
  const previewMesh = { id: 'preview' };
  function handlePreviewClick() {}

  assert.equal(initializeTextureFaceEditing(stateRef, mesh, {
    getFaceSection: () => section,
    getPreviewRenderer: () => ({ domElement: previewCanvas }),
    getPreviewMesh: () => previewMesh,
    onPreviewClick: handlePreviewClick,
    writeGlobalUvInputs: (inputs) => calls.push(['write', inputs]),
    applyGlobalTextureUVCommand: (options) => calls.push(['global', options.mesh, options.uvInputs]),
    applyFaceUVsToMeshesCommand: (options) => calls.push(['face', options.face, options.mesh, options.previewMesh]),
  }), true);

  assert.equal(stateRef.targetMesh, mesh);
  assert.equal(stateRef.selectedFace, -1);
  assert.equal(stateRef.faceHighlight, null);
  assert.notEqual(stateRef.faceUVData, mesh.userData.faceUVs);
  assert.deepEqual(stateRef.faceUVData[5], mesh.userData.faceUVs[5]);
  assert.equal(stateRef.previewClickElement, previewCanvas);
  assert.equal(previewCanvas.style.cursor, 'pointer');
  assert.deepEqual(calls, [
    ['toggle', 'hidden', false],
    ['listen', 'click', 'handlePreviewClick'],
    ['global', mesh, { ox: 0, oy: 0, rx: 1, ry: 1, rotDeg: 0 }],
    ['write', { ox: 0, oy: 0, rx: 1, ry: 2, rotDeg: 0 }],
    ['face', 0, mesh, previewMesh],
    ['face', 1, mesh, previewMesh],
    ['face', 2, mesh, previewMesh],
    ['face', 3, mesh, previewMesh],
    ['face', 4, mesh, previewMesh],
    ['face', 5, mesh, previewMesh],
  ]);

  const nonCubeState = createTextureFaceEditingState();
  const nonCube = {
    material: {},
    userData: { geometryType: 'sphere' },
  };
  const nonCubeCalls = [];
  assert.equal(initializeTextureFaceEditing(nonCubeState, nonCube, {
    getFaceSection: () => section,
    writeGlobalUvInputs: (inputs) => nonCubeCalls.push(['write', inputs]),
    getTextureUvInputs: (target) => ({ target, ox: 0.25, oy: 0.5, rx: 2, ry: 3, rotDeg: 45 }),
  }), false);
  assert.equal(nonCubeState.targetMesh, nonCube);
  assert.deepEqual(nonCubeState.faceUVData, []);
  assert.deepEqual(nonCubeCalls, [
    ['write', { target: nonCube, ox: 0.25, oy: 0.5, rx: 2, ry: 3, rotDeg: 45 }],
  ]);
  assert.deepEqual(calls.slice(-1), [['toggle', 'hidden', true]]);
});

test('runs texture face selection flow through injected side effects', () => {
  const calls = [];
  const stateRef = createTextureFaceEditingState();
  const handlers = {
    setPreviewAutoRotate: (value) => calls.push(['autoRotate', value]),
    highlightFace: (face) => calls.push(['highlight', face]),
    removeFaceHighlight: () => calls.push(['removeHighlight']),
    updateFaceUI: () => calls.push(['ui']),
    updateOverlay: () => calls.push(['overlay']),
    drawAllFaceOverlays: () => calls.push(['draw']),
  };

  assert.equal(selectTextureFaceFromIndex(stateRef, -1, handlers), false);
  assert.equal(stateRef.selectedFace, -1);
  assert.deepEqual(calls, []);

  assert.equal(selectTextureFaceFromIndex(stateRef, 2, handlers), true);
  assert.equal(stateRef.selectedFace, 2);
  assert.deepEqual(calls.splice(0), [
    ['autoRotate', false],
    ['highlight', 2],
    ['ui'],
    ['overlay'],
  ]);

  assert.equal(selectTextureFaceFromValue(stateRef, '4', handlers), true);
  assert.equal(stateRef.selectedFace, 4);
  assert.deepEqual(calls.splice(0), [
    ['autoRotate', false],
    ['highlight', 4],
    ['ui'],
    ['overlay'],
    ['draw'],
  ]);

  assert.equal(selectTextureFaceFromValue(stateRef, 'bad', handlers), false);
  assert.equal(stateRef.selectedFace, -1);
  assert.deepEqual(calls.splice(0), [
    ['autoRotate', true],
    ['removeHighlight'],
    ['ui'],
    ['overlay'],
    ['draw'],
  ]);

  stateRef.selectedFace = 3;
  deselectTextureFace(stateRef, handlers);
  assert.equal(stateRef.selectedFace, -1);
  assert.deepEqual(calls, [
    ['autoRotate', true],
    ['removeHighlight'],
    ['ui'],
    ['overlay'],
    ['draw'],
  ]);
});

test('runs texture face UV-map draw flow through injected adapters', () => {
  const calls = [];
  const stateRef = createTextureFaceEditingState();
  const paintCanvas = { id: 'paint-canvas' };
  const getCanvasUv = (event, canvas) => {
    calls.push(['getCanvasUv', event.id, canvas.id]);
    return event.uv ?? null;
  };

  assert.equal(startTextureFaceUvMapDraw(stateRef, { id: 'no-face', uv: { u: 0, v: 0 } }, {
    paintCanvas,
    getCanvasUv,
    showSelectFaceFirst: () => calls.push(['selectFaceFirst']),
  }), false);
  assert.deepEqual(calls.splice(0), [['selectFaceFirst']]);

  stateRef.selectedFace = 1;
  stateRef.faceUVData = [
    { ou: 0, ov: 0, su: 1, sv: 1, rot: 0 },
    { ou: 0, ov: 0, su: 1, sv: 1, rot: 0 },
  ];
  assert.equal(startTextureFaceUvMapDraw(stateRef, { id: 'bad-start', uv: null }, {
    paintCanvas,
    getCanvasUv,
  }), false);
  assert.deepEqual(calls.splice(0), [['getCanvasUv', 'bad-start', 'paint-canvas']]);
  assert.equal(stateRef.uvMapDragging, false);

  assert.equal(startTextureFaceUvMapDraw(stateRef, { id: 'start', uv: { u: 0.1, v: 0.2 } }, {
    paintCanvas,
    getCanvasUv,
  }), true);
  assert.deepEqual(calls.splice(0), [['getCanvasUv', 'start', 'paint-canvas']]);
  assert.equal(stateRef.uvMapDragging, true);
  assert.deepEqual(stateRef.uvMapStartPos, { u: 0.1, v: 0.2 });

  assert.equal(doTextureFaceUvMapDraw(stateRef, { id: 'bad-current', uv: null }, {
    paintCanvas,
    getCanvasUv,
    applyFaceUVs: (face) => calls.push(['apply', face]),
  }), false);
  assert.deepEqual(calls.splice(0), [['getCanvasUv', 'bad-current', 'paint-canvas']]);

  assert.equal(doTextureFaceUvMapDraw(stateRef, { id: 'current', uv: { u: 0.4, v: 0.6 } }, {
    paintCanvas,
    getCanvasUv,
    calculateSelection: (start, current) => {
      calls.push(['calculate', start, current]);
      return { ou: 0.1, ov: 0.2, su: 0.3, sv: 0.4 };
    },
    applyFaceUVs: (face) => calls.push(['apply', face]),
    updateFaceUI: () => calls.push(['ui']),
    drawAllFaceOverlays: () => calls.push(['draw']),
  }), true);
  assert.deepEqual(stateRef.faceUVData[1], {
    ou: 0.1,
    ov: 0.2,
    su: 0.3,
    sv: 0.4,
    rot: 0,
  });
  assert.deepEqual(calls.splice(0), [
    ['getCanvasUv', 'current', 'paint-canvas'],
    ['calculate', { u: 0.1, v: 0.2 }, { u: 0.4, v: 0.6 }],
    ['apply', 1],
    ['ui'],
    ['draw'],
  ]);

  endTextureFaceUvMapDraw(stateRef);
  assert.equal(stateRef.uvMapDragging, false);
  assert.equal(stateRef.uvMapStartPos, null);
  assert.equal(doTextureFaceUvMapDraw(stateRef, { id: 'after-end', uv: { u: 1, v: 1 } }, {
    paintCanvas,
    getCanvasUv,
  }), false);
  assert.deepEqual(calls, []);
});

test('routes texture face facade feedback through injected services', () => {
  const calls = [];

  try {
    configureTextureFaceEditingServices({
      showToast: (message) => calls.push(['toast', message]),
      translate: (key) => `t:${key}`,
    });

    startUVMapDraw({ id: 'uv-start-without-face' });
    assert.deepEqual(calls, [['toast', 't:selectFaceFirst']]);
  } finally {
    resetTextureFaceEditingServices();
  }
});

test('runs texture face UV update flow through injected adapters', () => {
  const calls = [];
  const previewMesh = { id: 'preview' };
  const cubeMesh = {
    material: { map: { id: 'map' } },
    userData: { geometryType: 'cube' },
  };
  const stateRef = createTextureFaceEditingState();
  stateRef.targetMesh = cubeMesh;
  stateRef.selectedFace = 1;
  stateRef.faceUVData = Array.from({ length: 6 }, () => ({
    ou: 0,
    ov: 0,
    su: 1,
    sv: 1,
    rot: 0,
  }));

  assert.equal(updateTextureFaceUVField(createTextureFaceEditingState(), 'ou', '0.5'), false);
  assert.equal(updateTextureFaceUVField(stateRef, 'ou', '0.25', {
    previewMesh,
    applyFaceUVs: (state, face, options) => calls.push(['field', face, options.previewMesh]),
    updateOverlay: () => calls.push(['overlay']),
    drawAllFaceOverlays: () => calls.push(['draw']),
  }), true);
  assert.equal(stateRef.faceUVData[1].ou, 0.25);
  assert.deepEqual(calls.splice(0), [
    ['field', 1, previewMesh],
    ['overlay'],
    ['draw'],
  ]);

  assert.equal(updateTextureFaceUVField(stateRef, 'sv', 'bad', {
    previewMesh,
    applyFaceUVs: (state, face, options) => calls.push(['field', face, options.previewMesh]),
  }), true);
  assert.equal(stateRef.faceUVData[1].sv, 0);
  assert.deepEqual(calls.splice(0), [['field', 1, previewMesh]]);

  assert.equal(applyTextureFaceUVs(stateRef, 3, {
    previewMesh,
    applyFaceUVsToMeshesCommand: (options) => {
      calls.push(['applyFaceUVs', options.mesh, options.previewMesh, options.face, options.faceUVData]);
      return true;
    },
  }), true);
  assert.deepEqual(calls.splice(0), [[
    'applyFaceUVs',
    cubeMesh,
    previewMesh,
    3,
    stateRef.faceUVData,
  ]]);

  assert.equal(updateTextureFaceUVFromInputs(createTextureFaceEditingState(), {}), false);

  assert.equal(updateTextureFaceUVFromInputs(stateRef, {
    readTextureUvInputs: () => ({ ox: 0.1, oy: 0.2, rx: 2, ry: 3, rotDeg: 45 }),
    previewMesh,
    applyAllCubeFaceUVsCommand: (options) => calls.push([
      'cube',
      options.mesh,
      options.previewMesh,
      options.faceUVData,
      options.uvInputs,
    ]),
    updateFaceUI: () => calls.push(['ui']),
    updateOverlay: () => calls.push(['overlay']),
  }), true);
  assert.deepEqual(calls.splice(0), [[
    'cube',
    cubeMesh,
    previewMesh,
    stateRef.faceUVData,
    { ox: 0.1, oy: 0.2, rx: 2, ry: 3, rotDeg: 45 },
  ], ['ui'], ['overlay']]);

  const sphereMesh = {
    material: { map: { id: 'sphere-map' } },
    userData: { geometryType: 'sphere' },
  };
  const sphereState = createTextureFaceEditingState();
  sphereState.targetMesh = sphereMesh;
  assert.equal(updateTextureFaceUVFromInputs(sphereState, {
    readTextureUvInputs: () => ({ ox: 0.4, oy: 0.5, rx: 1.5, ry: 1.75, rotDeg: 90 }),
    previewMesh,
    applyPreviewTransform: (transform) => calls.push(['previewTransform', transform]),
    applyGlobalTextureUVCommand: (options) => {
      calls.push(['global', options.mesh, options.uvInputs]);
      options.applyPreviewTransform?.({ rotation: 'preview' });
    },
    updateFaceUI: () => calls.push(['unexpected-ui']),
    updateOverlay: () => calls.push(['unexpected-overlay']),
  }), true);
  assert.deepEqual(calls, [
    ['global', sphereMesh, { ox: 0.4, oy: 0.5, rx: 1.5, ry: 1.75, rotDeg: 90 }],
    ['previewTransform', { rotation: 'preview' }],
  ]);
});

test('runs texture face UV application flows through injected adapters', () => {
  const target = { geometry: 'target-geometry', userData: {} };
  const preview = { geometry: 'preview-geometry' };
  const faceUVData = [
    { ou: 0.1, ov: 0.2, su: 0.3, sv: 0.4, rot: 0 },
    { ou: 0.5, ov: 0.6, su: 0.7, sv: 0.8, rot: 90 },
  ];
  const calls = [];
  assert.equal(applyFaceUVsToMeshes({
    mesh: target,
    previewMesh: preview,
    face: 1,
    faceUVData,
    applyFaceUVData: (...args) => calls.push(['face', ...args]),
  }), true);
  assert.deepEqual(calls, [
    ['face', 'target-geometry', 1, faceUVData],
    ['face', 'preview-geometry', 1, faceUVData],
  ]);
  assert.deepEqual(target.userData.faceUVs, faceUVData);
  assert.notEqual(target.userData.faceUVs[0], faceUVData[0]);
  assert.equal(applyFaceUVsToMeshes({ mesh: null }), false);

  const cubeTexture = { id: 'texture' };
  const cube = {
    geometry: 'cube-geometry',
    material: { map: cubeTexture },
    userData: {},
  };
  const cubePreview = { geometry: 'cube-preview-geometry' };
  const cubeFaceUVData = Array.from({ length: 6 }, () => ({
    ou: 0,
    ov: 0,
    su: 1,
    sv: 1,
    rot: 0,
  }));
  const cubeCalls = [];
  assert.equal(applyAllCubeFaceUVs({
    mesh: cube,
    previewMesh: cubePreview,
    faceUVData: cubeFaceUVData,
    uvInputs: { ox: 0.25, oy: 0.5, rx: 2, ry: 3, rotDeg: 45 },
    applyFaceUVData: (...args) => cubeCalls.push(['face', ...args]),
    applyTransform: (texture, transform) => cubeCalls.push(['transform', texture, transform]),
    rememberTransform: (mesh, texture) => cubeCalls.push(['remember', mesh, texture]),
  }), true);
  assert.deepEqual(cubeFaceUVData[0], { ou: 0.25, ov: 0.5, su: 2, sv: 3, rot: 45 });
  assert.equal(cubeCalls.filter((call) => call[0] === 'face').length, 12);
  assert.deepEqual(cubeCalls.slice(-2), [
    ['transform', cubeTexture, {
      offset: [0, 0],
      repeat: [1, 1],
      rotation: 0,
      center: [0.5, 0.5],
    }],
    ['remember', cube, cubeTexture],
  ]);
  assert.deepEqual(cube.userData.faceUVs[5], { ou: 0.25, ov: 0.5, su: 2, sv: 3, rot: 45 });
  assert.equal(applyAllCubeFaceUVs({
    mesh: { material: { map: cubeTexture } },
    faceUVData: [],
    uvInputs: { ox: 0, oy: 0, rx: 1, ry: 1, rotDeg: 0 },
  }), false);

  const transformMesh = {
    material: { map: cubeTexture },
    userData: {},
  };
  const transformCalls = [];
  const transform = applyGlobalTextureUV({
    mesh: transformMesh,
    uvInputs: { ox: 0.1, oy: 0.2, rx: 1.5, ry: 2.5, rotDeg: 90 },
    applyTransform: (texture, targetTransform) => transformCalls.push(['transform', texture, targetTransform]),
    rememberTransform: (mesh, texture) => transformCalls.push(['remember', mesh, texture]),
    applyPreviewTransform: (targetTransform) => transformCalls.push(['preview', targetTransform]),
  });
  assert.deepEqual(transform, {
    offset: [0.1, 0.2],
    repeat: [1.5, 2.5],
    rotation: Math.PI / 2,
    center: [0.5, 0.5],
  });
  assert.deepEqual(transformCalls, [
    ['transform', cubeTexture, transform],
    ['remember', transformMesh, cubeTexture],
    ['preview', transform],
  ]);
  assert.equal(applyGlobalTextureUV({ mesh: { material: {} }, uvInputs: {} }), null);

  assert.deepEqual(createTextureTransformFromUvInputs({
    ox: 0,
    oy: 0.25,
    rx: 1,
    ry: 2,
    rotDeg: 180,
  }), {
    offset: [0, 0.25],
    repeat: [1, 2],
    rotation: Math.PI,
    center: [0.5, 0.5],
  });
  assert.deepEqual(getTextureUvInputsForMesh({
    userData: {
      textureTransform: {
        offset: [0.5, 0.25],
        repeat: [2, 3],
        rotation: Math.PI,
      },
    },
  }), {
    ox: 0.5,
    oy: 0.25,
    rx: 2,
    ry: 3,
    rotDeg: 180,
  });
});

test('computes texture paint brush positions palette and stroke points', () => {
  assert.deepEqual(TEXTURE_BRUSH_SIZES, [2, 5, 10, 18, 30]);
  assert.equal(TEXTURE_DEFAULT_PALETTE.length, 15);
  assert.equal(TEXTURE_DEFAULT_PALETTE.includes('#ffcc00'), true);
  assert.equal(getBrushRadius(2), 10);
  assert.equal(getBrushRadius(99), 2);

  const canvas = {
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      width: 128,
      height: 64,
    }),
  };
  assert.deepEqual(getCanvasPointerPosition({
    clientX: 74,
    clientY: 52,
  }, canvas, 256), {
    x: 128,
    y: 128,
  });

  assert.deepEqual(getBrushStrokePoints({ x: 0, y: 0 }, { x: 10, y: 0 }, 10), [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 10, y: 0 },
  ]);
  assert.deepEqual(getBrushStrokePoints({ x: 4, y: 4 }, { x: 4, y: 4 }, 10), [
    { x: 4, y: 4 },
    { x: 4, y: 4 },
  ]);
});

test('manages texture paint tool state transitions', () => {
  const stateRef = createTexturePaintToolState();
  assert.deepEqual(stateRef, {
    brushColor: '#ff0000',
    brushSize: 2,
    eraserMode: false,
  });

  assert.equal(setTexturePaintBrushSize(stateRef, 4), 4);
  assert.equal(stateRef.brushSize, 4);
  assert.equal(setTexturePaintEraserMode(stateRef, true), true);
  assert.equal(stateRef.eraserMode, true);
  assert.equal(setTexturePaintBrushColor(stateRef, '#00ffcc'), '#00ffcc');
  assert.deepEqual(stateRef, {
    brushColor: '#00ffcc',
    brushSize: 4,
    eraserMode: false,
  });

  const customState = createTexturePaintToolState({
    brushColor: '#111111',
    brushSize: 7,
    eraserMode: true,
  });
  assert.deepEqual(customState, {
    brushColor: '#111111',
    brushSize: 7,
    eraserMode: true,
  });
});

test('renders texture paint palette through injected DOM adapters', () => {
  const calls = [];
  const swatches = [];
  const container = {
    replaceChildren: () => calls.push(['replace']),
    appendChild: (swatch) => calls.push(['append', swatch.hex]),
  };

  assert.equal(renderTexturePaintPalette({
    container: null,
    createSwatch: () => {
      throw new Error('should not create swatches without a container');
    },
  }), false);

  assert.equal(renderTexturePaintPalette({
    container,
    palette: ['#111111', '#222222'],
    createSwatch: (hex) => {
      const swatch = {
        hex,
        listeners: new Map(),
        addEventListener(eventName, handler) {
          calls.push(['listen', hex, eventName]);
          this.listeners.set(eventName, handler);
        },
      };
      swatches.push(swatch);
      return swatch;
    },
    onColorSelect: (hex) => calls.push(['select', hex]),
  }), true);

  assert.deepEqual(calls.splice(0), [
    ['replace'],
    ['listen', '#111111', 'click'],
    ['append', '#111111'],
    ['listen', '#222222', 'click'],
    ['append', '#222222'],
  ]);
  swatches[1].listeners.get('click')();
  assert.deepEqual(calls, [['select', '#222222']]);
});

test('draws texture paint brush commands through injected canvas context', () => {
  function createContext() {
    const calls = [];
    return {
      calls,
      beginPath: () => calls.push(['begin']),
      arc: (...args) => calls.push(['arc', ...args]),
      fill: () => calls.push(['fill']),
      set fillStyle(value) {
        calls.push(['fillStyle', value]);
      },
      set globalCompositeOperation(value) {
        calls.push(['composite', value]);
      },
    };
  }

  const normalContext = createContext();
  drawBrushDot(normalContext, {
    x: 4,
    y: 5,
    radius: 6,
    color: '#123456',
  });
  assert.deepEqual(normalContext.calls, [
    ['begin'],
    ['fillStyle', '#123456'],
    ['arc', 4, 5, 6, 0, Math.PI * 2],
    ['fill'],
  ]);

  const eraserContext = createContext();
  drawBrushDot(eraserContext, {
    x: 8,
    y: 9,
    radius: 3,
    color: '#123456',
    eraserMode: true,
    backgroundColor: '#abcdef',
  });
  assert.deepEqual(eraserContext.calls, [
    ['begin'],
    ['composite', 'destination-out'],
    ['arc', 8, 9, 3, 0, Math.PI * 2],
    ['fill'],
    ['composite', 'source-over'],
    ['fillStyle', '#abcdef'],
    ['begin'],
    ['arc', 8, 9, 3, 0, Math.PI * 2],
    ['fill'],
  ]);

  const strokeContext = createContext();
  const points = drawBrushStroke(strokeContext, {
    start: { x: 0, y: 0 },
    end: { x: 10, y: 0 },
    radius: 5,
    color: '#ffcc00',
    getStrokePoints: () => [{ x: 1, y: 2 }, { x: 3, y: 4 }],
  });
  assert.deepEqual(points, [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
  assert.deepEqual(strokeContext.calls, [
    ['begin'],
    ['fillStyle', '#ffcc00'],
    ['arc', 1, 2, 5, 0, Math.PI * 2],
    ['fill'],
    ['begin'],
    ['fillStyle', '#ffcc00'],
    ['arc', 3, 4, 5, 0, Math.PI * 2],
    ['fill'],
  ]);
});

test('manages texture paint undo history with injected image data context', () => {
  const calls = [];
  const snapshots = ['a', 'b', 'c', 'd'];
  const context = {
    getImageData: (...args) => {
      calls.push(['get', ...args]);
      return snapshots.shift();
    },
    putImageData: (...args) => calls.push(['put', ...args]),
  };
  const history = createPaintUndoHistory({ canvasSize: 8, maxSnapshots: 3 });

  assert.equal(history.canUndo(), false);
  assert.equal(history.saveSnapshot(context), 1);
  assert.equal(history.saveSnapshot(context), 2);
  assert.equal(history.saveSnapshot(context), 3);
  assert.equal(history.saveSnapshot(context), 3);
  assert.equal(history.size(), 3);
  assert.equal(history.canUndo(), true);
  assert.deepEqual(calls, [
    ['get', 0, 0, 8, 8],
    ['get', 0, 0, 8, 8],
    ['get', 0, 0, 8, 8],
    ['get', 0, 0, 8, 8],
  ]);

  assert.equal(history.undo(context), 'c');
  assert.deepEqual(calls.at(-1), ['put', 'c', 0, 0]);
  assert.equal(history.size(), 2);
  assert.equal(history.undo(context), 'b');
  assert.deepEqual(calls.at(-1), ['put', 'b', 0, 0]);
  assert.equal(history.undo(context), null);
  assert.equal(history.size(), 1);
  history.clear();
  assert.equal(history.size(), 0);
  assert.equal(history.canUndo(), false);
});

test('runs texture paint surface command flow through injected adapters', () => {
  const calls = [];
  const paintCtx = { id: 'paint-context' };
  const hooks = {
    onCommitChange: () => calls.push(['commit']),
    onPreviewChange: () => calls.push(['preview']),
  };

  assert.equal(undoTexturePaintSurface({
    paintCtx,
    undoHistory: { undo: () => null },
    hooks,
  }), false);
  assert.deepEqual(calls, []);

  assert.equal(undoTexturePaintSurface({
    paintCtx,
    undoHistory: {
      undo: (context) => {
        calls.push(['undo', context]);
        return 'snapshot';
      },
    },
    hooks,
  }), true);
  assert.deepEqual(calls.splice(0), [
    ['undo', paintCtx],
    ['preview'],
    ['commit'],
  ]);

  assert.equal(clearTexturePaintSurface({
    paintCtx,
    canvasSize: 32,
    hooks,
    fillPaintSurfaceCommand: (context, options) => calls.push(['fill', context, options]),
    saveUndoSnapshot: () => calls.push(['snapshot']),
  }), true);
  assert.deepEqual(calls.splice(0), [
    ['fill', paintCtx, { canvasSize: 32 }],
    ['snapshot'],
    ['commit'],
    ['preview'],
  ]);

  const input = { id: 'file-input' };
  const createFileInput = () => input;
  const loadImageFile = (file) => calls.push(['loadFile', file]);
  const onError = (error) => calls.push(['error', error.message]);
  assert.equal(loadTexturePaintImage({
    paintCtx,
    canvasSize: 64,
    createFileInput,
    loadImageFile,
    hooks,
    saveUndoSnapshot: () => calls.push(['snapshot']),
    onError,
    loadPaintImageFromFileInputCommand: (options) => {
      calls.push([
        'loadFlow',
        options.createFileInput(),
        options.loadImageFile,
        options.onCommitChange,
        options.onPreviewChange,
        options.onError,
      ]);
      options.applyImage({ id: 'image' });
      options.saveSnapshot();
      options.onCommitChange();
      options.onPreviewChange();
      options.onError(new Error('bad image'));
      return input;
    },
    replacePaintSurfaceWithImageCommand: (context, image, options) => calls.push([
      'replace',
      context,
      image,
      options,
    ]),
  }), input);
  assert.deepEqual(calls, [
    ['loadFlow', input, loadImageFile, hooks.onCommitChange, hooks.onPreviewChange, onError],
    ['replace', paintCtx, { id: 'image' }, { canvasSize: 64 }],
    ['snapshot'],
    ['commit'],
    ['preview'],
    ['error', 'bad image'],
  ]);
});

test('runs texture paint surface commands with injected canvas adapters', () => {
  function createContext(label) {
    const calls = [];
    return {
      label,
      calls,
      clearRect: (...args) => calls.push(['clear', ...args]),
      drawImage: (...args) => calls.push(['draw', ...args]),
      fillRect: (...args) => calls.push(['fillRect', ...args]),
      set fillStyle(value) {
        calls.push(['fillStyle', value]);
      },
    };
  }

  const context = createContext('main');
  clearPaintSurface(context, { canvasSize: 16 });
  fillPaintSurface(context, { canvasSize: 16, color: '#123456' });
  const image = { id: 'image' };
  replacePaintSurfaceWithImage(context, image, { canvasSize: 16 });
  assert.deepEqual(context.calls, [
    ['clear', 0, 0, 16, 16],
    ['fillStyle', '#123456'],
    ['fillRect', 0, 0, 16, 16],
    ['clear', 0, 0, 16, 16],
    ['draw', image, 0, 0, 16, 16],
  ]);

  const sourceCanvas = { id: 'source', width: 32, height: 24 };
  const clonedContexts = [];
  const copy = clonePaintCanvas(sourceCanvas, {
    canvasSize: 16,
    isCanvas: (candidate) => candidate === sourceCanvas,
    createCanvas: (width, height) => ({
      id: 'copy',
      width,
      height,
      getContext: () => {
        const copyContext = createContext('copy');
        clonedContexts.push(copyContext);
        return copyContext;
      },
    }),
  });
  assert.equal(copy.width, 32);
  assert.equal(copy.height, 24);
  assert.deepEqual(clonedContexts[0].calls, [
    ['draw', sourceCanvas, 0, 0],
  ]);

  const targetContext = createContext('target');
  const createdCopies = [];
  assert.equal(drawSourceImageToPaintSurface(targetContext, sourceCanvas, sourceCanvas, {
    canvasSize: 16,
    isCanvas: (candidate) => candidate === sourceCanvas,
    createCanvas: (width, height) => {
      const created = {
        id: `copy-${width}-${height}`,
        getContext: () => createContext('copy'),
      };
      createdCopies.push(created);
      return created;
    },
  }), true);
  assert.deepEqual(targetContext.calls, [
    ['draw', createdCopies[0], 0, 0, 16, 16],
  ]);

  const fallbackContext = createContext('fallback');
  assert.equal(drawSourceImageToPaintSurface(fallbackContext, sourceCanvas, sourceCanvas, {
    canvasSize: 16,
    fallbackColor: '#eeeeee',
    isCanvas: () => false,
    createCanvas: () => {
      throw new Error('should not create non-canvas copy');
    },
  }), false);
  assert.deepEqual(fallbackContext.calls, [
    ['fillStyle', '#eeeeee'],
    ['fillRect', 0, 0, 16, 16],
  ]);
});

test('initializes texture paint canvas through injected adapters', () => {
  const previousCleanup = () => {};
  assert.deepEqual(initializeTexturePaintCanvas(null, {
    paintCanvas: null,
    cleanupPaintCanvasListeners: previousCleanup,
  }), {
    initialized: false,
    paintCtx: null,
    cleanupPaintCanvasListeners: previousCleanup,
    loadedSourceImage: false,
  });

  const calls = [];
  const paintCtx = { id: 'paint-context' };
  const paintCanvas = {
    width: 0,
    height: 0,
    id: 'paint-canvas',
    getContext: (...args) => {
      calls.push(['getContext', ...args]);
      return paintCtx;
    },
  };
  const sourceImage = { id: 'source-image' };
  const mesh = { material: { map: { image: sourceImage } } };
  const cleanupPaintCanvasListeners = () => calls.push(['cleanup']);
  const nextCleanup = () => {};
  const undoHistory = { clear: () => calls.push(['undoClear']) };
  const eventHandlers = { onStart: () => {}, onMove: () => {}, onEnd: () => {} };
  const createCanvas = () => ({ id: 'copy' });
  const isCanvas = () => true;

  const initResult = initializeTexturePaintCanvas(mesh, {
    paintCanvas,
    canvasSize: 32,
    resetPaintFlowState: () => calls.push(['reset']),
    undoHistory,
    saveUndoSnapshot: () => calls.push(['snapshot']),
    cleanupPaintCanvasListeners,
    bindPaintCanvasEventsCommand: (canvas, handlers) => {
      calls.push(['bind', canvas, handlers]);
      return nextCleanup;
    },
    clearPaintSurfaceCommand: (context, options) => calls.push(['clear', context, options]),
    drawSourceImageToPaintSurfaceCommand: (context, canvas, image, options) => {
      calls.push(['drawSource', context, canvas, image, options]);
      return true;
    },
    fillPaintSurfaceCommand: (context, options) => calls.push(['fill', context, options]),
    createCanvas,
    isCanvas,
    eventHandlers,
  });

  assert.deepEqual(initResult, {
    initialized: true,
    paintCtx,
    cleanupPaintCanvasListeners: nextCleanup,
    loadedSourceImage: true,
  });
  assert.equal(paintCanvas.width, 32);
  assert.equal(paintCanvas.height, 32);
  assert.deepEqual(calls, [
    ['getContext', '2d', { willReadFrequently: true }],
    ['reset'],
    ['undoClear'],
    ['clear', paintCtx, { canvasSize: 32 }],
    ['drawSource', paintCtx, paintCanvas, sourceImage, { canvasSize: 32, createCanvas, isCanvas }],
    ['snapshot'],
    ['cleanup'],
    ['bind', paintCanvas, eventHandlers],
  ]);

  calls.length = 0;
  const emptyCanvas = {
    width: 0,
    height: 0,
    getContext: () => paintCtx,
  };
  const emptyInitResult = initializeTexturePaintCanvas({ material: { map: null } }, {
    paintCanvas: emptyCanvas,
    canvasSize: 16,
    resetPaintFlowState: () => calls.push(['reset']),
    undoHistory,
    saveUndoSnapshot: () => calls.push(['snapshot']),
    bindPaintCanvasEventsCommand: () => {
      calls.push(['bind']);
      return null;
    },
    clearPaintSurfaceCommand: (context, options) => calls.push(['clear', context, options]),
    drawSourceImageToPaintSurfaceCommand: () => calls.push(['unexpectedDrawSource']),
    fillPaintSurfaceCommand: (context, options) => calls.push(['fill', context, options]),
  });

  assert.equal(emptyInitResult.initialized, true);
  assert.equal(emptyInitResult.loadedSourceImage, false);
  assert.equal(emptyCanvas.width, 16);
  assert.equal(emptyCanvas.height, 16);
  assert.deepEqual(calls, [
    ['reset'],
    ['undoClear'],
    ['clear', paintCtx, { canvasSize: 16 }],
    ['fill', paintCtx, { canvasSize: 16 }],
    ['snapshot'],
    ['bind'],
  ]);
});

test('runs texture paint stroke flow through injected adapters', () => {
  const calls = [];
  const stateRef = createTexturePaintFlowState();
  const paintCanvas = { id: 'paint-canvas' };
  const normalHooks = {
    isAlternateMode: () => false,
    onPreviewChange: () => calls.push(['preview']),
    onCommitChange: () => calls.push(['commit']),
    onAfterCommit: () => calls.push(['afterCommit']),
  };
  const getPos = (event, canvas, canvasSize) => {
    calls.push(['position', event.id, canvas.id, canvasSize]);
    return event.pos;
  };

  assert.equal(moveTexturePaintFlow(stateRef, { id: 'ignored', pos: { x: 1, y: 2 } }, {
    hooks: normalHooks,
    paintCanvas,
    canvasSize: 64,
    getCanvasPointerPositionCommand: getPos,
    drawLine: (...args) => calls.push(['line', ...args]),
  }), false);
  assert.deepEqual(calls, []);

  assert.equal(startTexturePaintFlow(stateRef, { id: 'start', pos: { x: 2, y: 3 } }, {
    hooks: normalHooks,
    paintCanvas,
    canvasSize: 64,
    getCanvasPointerPositionCommand: getPos,
    drawDot: (...args) => calls.push(['dot', ...args]),
  }), 'paint');
  assert.equal(stateRef.painting, true);
  assert.deepEqual(stateRef.lastPos, { x: 2, y: 3 });
  assert.deepEqual(calls.splice(0), [
    ['position', 'start', 'paint-canvas', 64],
    ['dot', 2, 3],
  ]);

  assert.equal(moveTexturePaintFlow(stateRef, { id: 'move', pos: { x: 5, y: 7 } }, {
    hooks: normalHooks,
    paintCanvas,
    canvasSize: 64,
    getCanvasPointerPositionCommand: getPos,
    drawLine: (...args) => calls.push(['line', ...args]),
  }), 'paint');
  assert.deepEqual(stateRef.lastPos, { x: 5, y: 7 });
  assert.deepEqual(calls.splice(0), [
    ['position', 'move', 'paint-canvas', 64],
    ['line', 2, 3, 5, 7],
    ['preview'],
  ]);

  assert.equal(endTexturePaintFlow(stateRef, {
    hooks: normalHooks,
    saveUndoSnapshot: () => calls.push(['snapshot']),
  }), 'paint');
  assert.equal(stateRef.painting, false);
  assert.equal(stateRef.lastPos, null);
  assert.deepEqual(calls.splice(0), [
    ['snapshot'],
    ['commit'],
    ['afterCommit'],
  ]);

  resetTexturePaintFlowState(stateRef);
  stateRef.painting = true;
  stateRef.lastPos = { x: 9, y: 9 };
  const alternateHooks = {
    isAlternateMode: () => true,
    onAlternateStart: (event) => calls.push(['altStart', event.id]),
    onAlternateMove: (event) => calls.push(['altMove', event.id]),
    onAlternateEnd: () => calls.push(['altEnd']),
  };

  assert.equal(startTexturePaintFlow(stateRef, { id: 'alt-start' }, {
    hooks: alternateHooks,
    paintCanvas,
    canvasSize: 64,
  }), 'alternate');
  assert.equal(moveTexturePaintFlow(stateRef, { id: 'alt-move' }, {
    hooks: alternateHooks,
    paintCanvas,
    canvasSize: 64,
  }), 'alternate');
  assert.equal(endTexturePaintFlow(stateRef, { hooks: alternateHooks }), 'alternate');
  assert.deepEqual(calls, [
    ['altStart', 'alt-start'],
    ['altMove', 'alt-move'],
    ['altEnd'],
  ]);
  assert.equal(stateRef.painting, true);
  assert.deepEqual(stateRef.lastPos, { x: 9, y: 9 });
});

test('binds and unbinds texture paint canvas pointer events', () => {
  const calls = [];
  const handlers = {
    onStart: () => calls.push('start'),
    onMove: () => calls.push('move'),
    onEnd: () => calls.push('end'),
  };
  const canvas = {
    listeners: new Map(),
    addEventListener(eventName, handler) {
      this.listeners.set(eventName, handler);
      calls.push(['add', eventName, handler]);
    },
    removeEventListener(eventName, handler) {
      calls.push(['remove', eventName, handler, this.listeners.get(eventName) === handler]);
      this.listeners.delete(eventName);
    },
  };

  const cleanup = bindPaintCanvasEvents(canvas, handlers);
  assert.deepEqual(calls.splice(0), [
    ['add', 'mousedown', handlers.onStart],
    ['add', 'mousemove', handlers.onMove],
    ['add', 'mouseup', handlers.onEnd],
    ['add', 'mouseleave', handlers.onEnd],
  ]);

  canvas.listeners.get('mousedown')();
  canvas.listeners.get('mousemove')();
  canvas.listeners.get('mouseup')();
  canvas.listeners.get('mouseleave')();
  assert.deepEqual(calls.splice(0), ['start', 'move', 'end', 'end']);

  cleanup();
  assert.deepEqual(calls, [
    ['remove', 'mousedown', handlers.onStart, true],
    ['remove', 'mousemove', handlers.onMove, true],
    ['remove', 'mouseup', handlers.onEnd, true],
    ['remove', 'mouseleave', handlers.onEnd, true],
  ]);
  assert.equal(canvas.listeners.size, 0);
});

test('runs texture paint image file load and download flows with injected adapters', async () => {
  function createInput() {
    return {
      handler: null,
      options: null,
      addEventListener(eventName, handler, options) {
        this.handler = handler;
        this.options = { eventName, options };
      },
      click() {
        calls.push(['click-input']);
      },
    };
  }

  const calls = [];
  const file = { id: 'file' };
  const image = { id: 'image' };
  const input = loadPaintImageFromFileInput({
    createFileInput: createInput,
    loadImageFile: async (targetFile) => {
      calls.push(['load', targetFile]);
      return { image };
    },
    applyImage: (targetImage) => calls.push(['apply', targetImage]),
    saveSnapshot: () => calls.push(['snapshot']),
    onCommitChange: () => calls.push(['commit']),
    onPreviewChange: () => calls.push(['preview']),
    onError: (error) => calls.push(['error', error.message]),
  });
  assert.deepEqual(input.options, { eventName: 'change', options: { once: true } });
  assert.deepEqual(calls.splice(0), [['click-input']]);

  await input.handler({ target: { files: [file] } });
  assert.deepEqual(calls.splice(0), [
    ['load', file],
    ['apply', image],
    ['snapshot'],
    ['commit'],
    ['preview'],
  ]);

  await input.handler({ target: { files: [] } });
  assert.deepEqual(calls.splice(0), []);

  const errorInput = loadPaintImageFromFileInput({
    createFileInput: createInput,
    loadImageFile: async () => {
      throw new Error('bad-file');
    },
    applyImage: (targetImage) => calls.push(['apply-error', targetImage]),
    saveSnapshot: () => calls.push(['snapshot-error']),
    onError: (error) => calls.push(['error', error.message]),
  });
  calls.splice(0);
  await errorInput.handler({ target: { files: [file] } });
  assert.deepEqual(calls, [['error', 'bad-file']]);

  const canvas = {
    toDataURL: (mimeType) => {
      calls.push(['data-url', mimeType]);
      return 'data:image/png;base64,abc';
    },
  };
  const link = downloadPaintCanvas(canvas, {
    filename: 'custom.png',
    mimeType: 'image/custom',
    downloadDataURL: (dataUrl, filename) => {
      calls.push(['download-data-url', filename, dataUrl]);
      return { filename, dataUrl };
    },
  });
  assert.equal(link.filename, 'custom.png');
  assert.deepEqual(calls.slice(-2), [
    ['data-url', 'image/custom'],
    ['download-data-url', 'custom.png', 'data:image/png;base64,abc'],
  ]);
});

test('runs texture preview loop through injected frame dependencies', () => {
  const calls = [];
  const scheduledFrames = [];
  const canceledFrames = [];
  let rotate = true;
  const loop = createTexturePreviewLoop({
    requestFrame: (callback) => {
      scheduledFrames.push(callback);
      return scheduledFrames.length;
    },
    cancelFrame: (frameId) => canceledFrames.push(frameId),
    shouldRotate: () => rotate,
    rotatePreview: () => calls.push('rotate'),
    renderFrame: () => calls.push('render'),
  });

  assert.equal(loop.isRunning(), false);
  assert.equal(loop.start(), 1);
  assert.equal(loop.isRunning(), true);
  assert.deepEqual(calls, ['rotate', 'render']);
  assert.equal(scheduledFrames.length, 1);

  assert.equal(loop.start(), 1);
  assert.equal(scheduledFrames.length, 1);

  rotate = false;
  scheduledFrames[0]();
  assert.equal(scheduledFrames.length, 2);
  assert.deepEqual(calls, ['rotate', 'render', 'render']);

  loop.stop();
  assert.equal(loop.isRunning(), false);
  assert.deepEqual(canceledFrames, [2]);

  scheduledFrames[1]();
  assert.equal(scheduledFrames.length, 2);
  assert.deepEqual(calls, ['rotate', 'render', 'render']);
});

test('initializes texture preview through injected DOM container adapter', () => {
  const runtimeState = { id: 'preview-runtime' };
  const sourceMesh = { id: 'source-mesh' };
  const container = { id: 'preview-container' };
  const shouldResumeAutoRotate = () => true;
  const calls = [];

  initTexturePreview(sourceMesh, {
    runtimeState,
    getTexturePreviewContainer: () => container,
    initializePreviewRuntime: (stateArg, meshArg, optionsArg) => {
      calls.push([stateArg, meshArg, optionsArg]);
      return true;
    },
    shouldResumeAutoRotate,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], runtimeState);
  assert.equal(calls[0][1], sourceMesh);
  assert.equal(calls[0][2].container, container);
  assert.equal(calls[0][2].shouldResumeAutoRotate, shouldResumeAutoRotate);
});

test('runs texture preview runtime through injected adapters', () => {
  const calls = [];
  const stateRef = createTexturePreviewRuntimeState();
  const previousRenderer = {
    dispose: () => calls.push(['disposePreviousRenderer']),
  };
  const previousLoop = {
    stop: () => calls.push(['stopPreviousLoop']),
  };
  const previousCleanupHover = () => calls.push(['cleanupPreviousHover']);
  stateRef.renderer = previousRenderer;
  stateRef.previewLoop = previousLoop;
  stateRef.cleanupPreviewHover = previousCleanupHover;

  const sourceMesh = { id: 'source-mesh' };
  const container = {
    id: 'container',
    replaceChildren: () => calls.push(['replaceChildren']),
  };
  const scene = { id: 'scene' };
  const camera = { id: 'camera' };
  const mesh = { rotation: { y: 1 } };
  const renderer = {
    domElement: { id: 'dom-element' },
    render: (...args) => calls.push(['render', ...args]),
    dispose: () => calls.push(['disposeRenderer']),
  };
  let hoverHandlers;
  let loopOptions;
  const previewLoop = {
    start: () => calls.push(['startLoop']),
    stop: () => calls.push(['stopLoop']),
  };

  assert.equal(initializeTexturePreviewRuntime(stateRef, sourceMesh, {
    container: null,
    disposeRuntime: () => calls.push(['unexpectedDispose']),
  }), false);
  assert.deepEqual(calls, []);

  assert.equal(initializeTexturePreviewRuntime(stateRef, sourceMesh, {
    container,
    shouldResumeAutoRotate: () => false,
    createPreviewScene: (meshArg) => {
      calls.push(['createScene', meshArg]);
      return { scene, camera, mesh };
    },
    createPreviewRenderer: (containerArg) => {
      calls.push(['createRenderer', containerArg]);
      return renderer;
    },
    bindPreviewHover: (domElement, handlers) => {
      calls.push(['bindHover', domElement]);
      hoverHandlers = handlers;
      return () => calls.push(['cleanupHover']);
    },
    createPreviewLoop: (options) => {
      calls.push(['createLoop']);
      loopOptions = options;
      return previewLoop;
    },
  }), true);

  assert.equal(stateRef.scene, scene);
  assert.equal(stateRef.camera, camera);
  assert.equal(stateRef.mesh, mesh);
  assert.equal(stateRef.renderer, renderer);
  assert.equal(stateRef.previewLoop, previewLoop);
  assert.equal(stateRef.autoRotate, true);
  assert.deepEqual(calls.splice(0), [
    ['stopPreviousLoop'],
    ['cleanupPreviousHover'],
    ['disposePreviousRenderer'],
    ['replaceChildren'],
    ['createScene', sourceMesh],
    ['createRenderer', container],
    ['bindHover', renderer.domElement],
    ['createLoop'],
    ['startLoop'],
  ]);

  assert.equal(loopOptions.shouldRotate(), true);
  loopOptions.rotatePreview();
  assert.equal(mesh.rotation.y, 1.01);
  loopOptions.renderFrame();
  assert.deepEqual(calls.splice(0), [['render', scene, camera]]);

  hoverHandlers.pauseAutoRotate();
  assert.equal(stateRef.autoRotate, false);
  assert.equal(loopOptions.shouldRotate(), false);
  hoverHandlers.resumeAutoRotate();
  assert.equal(stateRef.autoRotate, false);
  stateRef.shouldResumeAutoRotate = () => true;
  hoverHandlers.resumeAutoRotate();
  assert.equal(stateRef.autoRotate, true);

  disposeTexturePreviewRuntime(stateRef);
  assert.equal(stateRef.renderer, null);
  assert.equal(stateRef.scene, null);
  assert.equal(stateRef.camera, null);
  assert.equal(stateRef.mesh, null);
  assert.equal(stateRef.previewLoop, null);
  assert.equal(stateRef.cleanupPreviewHover, null);
  assert.deepEqual(calls, [
    ['stopLoop'],
    ['cleanupHover'],
    ['disposeRenderer'],
  ]);
});

test('builds texture preview scene from a cloned and centered source mesh', () => {
  const sourceImage = { id: 'source-image' };
  const sourceTexture = new THREE.Texture(sourceImage);
  const sourceMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 4, 6),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  const textureTransform = { offsetX: 0.25 };
  const detachedTexture = new THREE.Texture({ id: 'detached-image' });
  const calls = [];
  sourceMesh.material.map = sourceTexture;
  sourceMesh.userData.textureTransform = textureTransform;
  sourceMesh.position.set(9, 8, 7);

  const preview = createTexturePreviewScene(sourceMesh, {
    createDetachedTexture: (image, transform, options) => {
      calls.push(['texture', image, transform, options]);
      return detachedTexture;
    },
    getTransform: () => ({ unused: true }),
    isPixelated: () => true,
  });

  assert.equal(preview.scene.background.getHex(), 0x1a1a1a);
  assert.equal(preview.scene.children.length, 3);
  assert.equal(preview.scene.children[2], preview.mesh);
  assert.notEqual(preview.mesh, sourceMesh);
  assert.notEqual(preview.mesh.geometry, sourceMesh.geometry);
  assert.notEqual(preview.mesh.material, sourceMesh.material);
  assert.equal(preview.mesh.material.map, detachedTexture);
  assert.deepEqual(calls, [
    ['texture', sourceImage, textureTransform, { pixelated: true }],
  ]);
  assert.equal(preview.camera.position.z, 15);

  const center = preview.mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
  assert.equal(Math.abs(center.x) < 1e-9, true);
  assert.equal(Math.abs(center.y) < 1e-9, true);
  assert.equal(Math.abs(center.z) < 1e-9, true);
});

test('creates texture preview renderer and hover bindings with injected browser adapters', () => {
  const calls = [];
  function createDomElement() {
    return {
      listeners: {},
      addEventListener(eventName, handler) {
        this.listeners[eventName] = handler;
      },
      removeEventListener(eventName, handler) {
        if (this.listeners[eventName] === handler) delete this.listeners[eventName];
      },
    };
  }

  class FakeRenderer {
    constructor(options) {
      this.options = options;
      this.domElement = createDomElement();
      calls.push(['renderer', options]);
    }

    setSize(width, height) {
      calls.push(['size', width, height]);
    }

    setPixelRatio(pixelRatio) {
      calls.push(['pixel-ratio', pixelRatio]);
    }
  }

  const container = {
    child: null,
    appendChild(child) {
      this.child = child;
      calls.push(['append', child]);
    },
  };
  const renderer = createTexturePreviewRenderer(container, {
    RendererClass: FakeRenderer,
    rendererOptions: { alpha: false },
    size: 128,
    pixelRatio: 2,
  });

  assert.equal(renderer.options.alpha, false);
  assert.equal(container.child, renderer.domElement);
  assert.deepEqual(calls, [
    ['renderer', { alpha: false }],
    ['size', 128, 128],
    ['pixel-ratio', 2],
    ['append', renderer.domElement],
  ]);

  const hoverCalls = [];
  const cleanup = bindTexturePreviewHover(renderer.domElement, {
    pauseAutoRotate: () => hoverCalls.push('pause'),
    resumeAutoRotate: () => hoverCalls.push('resume'),
  });
  renderer.domElement.listeners.mouseenter();
  renderer.domElement.listeners.mouseleave();
  assert.deepEqual(hoverCalls, ['pause', 'resume']);

  cleanup();
  assert.deepEqual(renderer.domElement.listeners, {});
});

test('applies canvas and transform updates to texture preview material', () => {
  const canvas = { id: 'canvas' };
  const previousMap = {
    image: canvas,
    isCanvasTexture: true,
    disposed: false,
    dispose() {
      this.disposed = true;
    },
  };
  const mesh = {
    material: {
      map: previousMap,
      needsUpdate: false,
    },
  };
  const transform = { offsetX: 0.5 };
  const calls = [];

  const texture = applyCanvasToPreviewTexture(mesh, canvas, transform, {
    createLiveTexture: (targetCanvas, targetTransform, options) => {
      calls.push(['live-texture', targetCanvas, targetTransform, options]);
      return {
        image: targetCanvas,
        transform: targetTransform,
        pixelated: options.pixelated,
      };
    },
    getTransform: () => ({ fallback: true }),
    isPixelated: (targetTexture) => targetTexture === previousMap,
  });

  assert.equal(texture.image, canvas);
  assert.equal(texture.pixelated, true);
  assert.equal(texture.transform, transform);
  assert.equal(mesh.material.map, texture);
  assert.equal(mesh.material.needsUpdate, true);
  assert.equal(previousMap.disposed, true);
  assert.deepEqual(calls, [
    ['live-texture', canvas, transform, { pixelated: true }],
  ]);

  const fallbackMap = { image: { id: 'other-canvas' }, isCanvasTexture: true };
  const fallbackMesh = { material: { map: fallbackMap } };
  const fallbackTransform = { fallback: true };
  const fallbackTexture = applyCanvasToPreviewTexture(fallbackMesh, canvas, null, {
    createLiveTexture: (targetCanvas, targetTransform, options) => ({
      image: targetCanvas,
      transform: targetTransform,
      pixelated: options.pixelated,
    }),
    getTransform: () => fallbackTransform,
    isPixelated: () => false,
  });
  assert.equal(fallbackTexture.transform, fallbackTransform);
  assert.equal(fallbackTexture.pixelated, false);
  assert.equal(fallbackMap.disposed, undefined);
  assert.equal(applyCanvasToPreviewTexture(null, canvas), null);

  const map = {};
  const transformCalls = [];
  assert.equal(applyTransformToPreviewTexture({ material: { map } }, transform, {
    applyTransform: (targetMap, targetTransform) => transformCalls.push([targetMap, targetTransform]),
  }), true);
  assert.deepEqual(transformCalls, [[map, transform]]);
  assert.equal(applyTransformToPreviewTexture({ material: {} }, transform, {
    applyTransform: () => transformCalls.push(['unexpected']),
  }), false);
});

test('runs texture editor tool selection flow through injected adapters', () => {
  const calls = [];
  const deps = {
    toggleUVMapMode: () => {
      calls.push(['toggleUV']);
      return true;
    },
    setUVMapMode: (value) => calls.push(['setUV', value]),
    setEraserMode: (value) => calls.push(['eraser', value]),
    setPaintCanvasCursor: (value) => calls.push(['cursor', value]),
    updateToolUI: () => calls.push(['ui']),
    drawAllFaceOverlays: () => calls.push(['draw']),
  };

  assert.deepEqual(setTextureEditorTool('uvmap', deps), {
    tool: 'uvmap',
    uvMapMode: true,
    eraserMode: false,
  });
  assert.deepEqual(calls.splice(0), [
    ['toggleUV'],
    ['eraser', false],
    ['cursor', 'crosshair'],
    ['ui'],
    ['draw'],
  ]);

  assert.deepEqual(setTextureEditorTool('eraser', deps), {
    tool: 'eraser',
    uvMapMode: false,
    eraserMode: true,
  });
  assert.deepEqual(calls.splice(0), [
    ['setUV', false],
    ['eraser', true],
    ['cursor', ''],
    ['ui'],
    ['draw'],
  ]);

  assert.deepEqual(setTextureEditorTool('brush', deps), {
    tool: 'brush',
    uvMapMode: false,
    eraserMode: false,
  });
  assert.deepEqual(calls, [
    ['setUV', false],
    ['eraser', false],
    ['cursor', ''],
    ['ui'],
    ['draw'],
  ]);
});

test('renders texture editor tool UI through injected DOM adapters', () => {
  function createClassList() {
    const classes = new Set();
    return {
      contains: (name) => classes.has(name),
      toggle: (name, value) => {
        if (value) classes.add(name);
        else classes.delete(name);
      },
    };
  }

  const buttons = new Map([
    ['tex-tool-brush', { classList: createClassList() }],
    ['tex-tool-eraser', { classList: createClassList() }],
    ['tex-tool-uvmap', { classList: createClassList() }],
    ['tex-size-0', { classList: createClassList() }],
    ['tex-size-1', { classList: createClassList() }],
  ]);
  const swatches = [
    { dataset: { color: '#111111' }, classList: createClassList() },
    { dataset: { color: '#222222' }, classList: createClassList() },
  ];

  updateTextureToolUI({
    brushColor: '#222222',
    brushSize: 1,
    brushSizes: [1, 2],
    eraserMode: false,
    getColorSwatches: () => swatches,
    getToolButton: (id) => buttons.get(id),
    uvMapMode: false,
  });

  assert.equal(buttons.get('tex-tool-brush').classList.contains('bg-[#ffcc00]'), true);
  assert.equal(buttons.get('tex-tool-eraser').classList.contains('bg-[#ffcc00]'), false);
  assert.equal(buttons.get('tex-size-1').classList.contains('text-black'), true);
  assert.equal(swatches[0].classList.contains('ring-2'), false);
  assert.equal(swatches[1].classList.contains('ring-white'), true);

  const adapter = createTextureToolUiAdapter({
    textureEditorDom: {
      getTextureColorSwatches: () => swatches,
      getTextureToolButton: (id) => buttons.get(id),
    },
  });
  adapter.updateTextureToolUI({
    brushColor: '#222222',
    brushSize: 0,
    brushSizes: [1, 2],
    eraserMode: true,
    uvMapMode: false,
  });

  assert.equal(buttons.get('tex-tool-brush').classList.contains('bg-[#ffcc00]'), false);
  assert.equal(buttons.get('tex-tool-eraser').classList.contains('bg-[#ffcc00]'), true);
  assert.equal(swatches[1].classList.contains('ring-2'), false);
  assert.doesNotThrow(() => updateTextureToolUI({}));
});

test('runs texture editor canvas commit and preview flow through injected adapters', () => {
  const calls = [];
  const paintCanvas = { id: 'paint-canvas' };
  const editedMesh = { id: 'edited', userData: { textureTransform: { offset: [0.25, 0.5] } } };
  const selectedMesh = { id: 'selected' };

  assert.equal(commitTextureEditorCanvas({
    getEditedMesh: () => editedMesh,
    getSelectedEditableMesh: () => {
      calls.push(['unexpectedSelected']);
      return selectedMesh;
    },
    getPaintCanvas: () => paintCanvas,
    commitCanvasTextureToMeshCommand: (mesh, canvas) => {
      calls.push(['commit', mesh, canvas]);
      return true;
    },
  }), true);
  assert.deepEqual(calls.splice(0), [['commit', editedMesh, paintCanvas]]);

  assert.equal(commitTextureEditorCanvas({
    getEditedMesh: () => null,
    getSelectedEditableMesh: () => selectedMesh,
    getPaintCanvas: () => paintCanvas,
    commitCanvasTextureToMeshCommand: (mesh, canvas) => {
      calls.push(['commit', mesh, canvas]);
      return 'fallback';
    },
  }), 'fallback');
  assert.deepEqual(calls.splice(0), [['commit', selectedMesh, paintCanvas]]);

  assert.equal(previewTextureEditorCanvas({
    getEditedMesh: () => editedMesh,
    getPaintCanvas: () => paintCanvas,
    applyCanvasToTexturePreviewCommand: (canvas, transform) => {
      calls.push(['preview', canvas, transform]);
      return true;
    },
  }), true);
  assert.deepEqual(calls.splice(0), [
    ['preview', paintCanvas, editedMesh.userData.textureTransform],
  ]);

  assert.equal(previewTextureEditorCanvas({
    getEditedMesh: () => null,
    getPaintCanvas: () => paintCanvas,
    applyCanvasToTexturePreviewCommand: (canvas, transform) => {
      calls.push(['preview', canvas, transform]);
      return false;
    },
  }), false);
  assert.deepEqual(calls, [['preview', paintCanvas, undefined]]);
});

test('runs texture editor lifecycle flow through injected adapters', () => {
  const calls = [];
  assert.equal(openTextureEditorLifecycle({
    resolveTextureEditorMesh: () => null,
    showTextureEditorModal: () => calls.push(['unexpectedShow']),
  }), false);
  assert.deepEqual(calls, []);

  const mesh = { id: 'mesh' };
  assert.equal(openTextureEditorLifecycle({
    resolveTextureEditorMesh: () => {
      calls.push(['resolve']);
      return mesh;
    },
    showTextureEditorModal: () => calls.push(['show']),
    initPaintCanvas: (targetMesh) => calls.push(['paint', targetMesh]),
    initPreview: (targetMesh) => calls.push(['preview', targetMesh]),
    initFaceEditing: (targetMesh) => calls.push(['face', targetMesh]),
    updateToolUI: () => calls.push(['ui']),
  }), true);
  assert.deepEqual(calls.splice(0), [
    ['resolve'],
    ['show'],
    ['paint', mesh],
    ['preview', mesh],
    ['face', mesh],
    ['ui'],
  ]);

  assert.equal(closeTextureEditorLifecycle({
    hideTextureEditorModal: () => calls.push(['hide']),
    cleanupFaceEditing: () => calls.push(['cleanupFace']),
    disposeTexturePreview: () => calls.push(['disposePreview']),
  }), true);
  assert.deepEqual(calls, [
    ['hide'],
    ['cleanupFace'],
    ['disposePreview'],
  ]);
});

test('resolves texture editor DOM through injected root adapters', () => {
  class FakeCanvas {}
  const classes = new Set(['hidden']);
  const modal = {
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
  };
  const elements = new Map([
    ['texture-editor-modal', modal],
    ['tex-face-ou', { value: '0.5' }],
    ['custom-tool', { id: 'tool' }],
  ]);
  const swatches = [{ id: 'swatch-a' }, { id: 'swatch-b' }];
  const created = [];
  const root = {
    createElement: (tagName) => {
      const element = tagName === 'canvas'
        ? new FakeCanvas()
        : { dataset: {}, style: {} };
      element.tagName = tagName;
      element.className = '';
      element.width = 0;
      element.height = 0;
      created.push(element);
      return element;
    },
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: (selector) => (selector === '.tex-color-swatch' ? swatches : []),
  };

  assert.equal(getTextureEditorModal(root), modal);
  showTextureEditorModal(root);
  assert.equal(modal.classList.contains('hidden'), false);
  hideTextureEditorModal(root);
  assert.equal(modal.classList.contains('hidden'), true);
  assert.equal(getTextureInput('tex-face-ou', root).value, '0.5');
  assert.deepEqual([...getTextureColorSwatches(root)], swatches);

  const fileInput = createTextureImageFileInput(root);
  assert.equal(fileInput.type, 'file');
  assert.equal(fileInput.accept, 'image/*');
  const swatch = createTexturePaletteSwatch('#abcdef', root);
  assert.equal(swatch.dataset.color, '#abcdef');
  assert.equal(swatch.style.background, '#abcdef');
  const canvas = createTextureCanvas(32, 64, root);
  assert.equal(canvas.width, 32);
  assert.equal(canvas.height, 64);
  assert.equal(isTextureCanvas(canvas, FakeCanvas), true);
  assert.equal(isTextureCanvas({}, FakeCanvas), false);

  const textureEditorDom = createTextureEditorDomAdapter({
    root,
    CanvasElementClass: FakeCanvas,
  });
  assert.equal(textureEditorDom.getTextureToolButton('custom-tool'), elements.get('custom-tool'));
  assert.equal(textureEditorDom.getTextureEditorModal(), modal);
  assert.equal(textureEditorDom.isTextureCanvas(canvas), true);
  assert.equal(textureEditorDom.createTextureCanvas(8, 9).width, 8);
  assert.equal(created.length >= 4, true);

  assert.equal(getTextureEditorModal(null), null);
  assert.equal(createTextureImageFileInput(null), null);
  assert.equal(createTexturePaletteSwatch('#fff', null), null);
  assert.equal(createTextureCanvas(1, 1, null), null);
  assert.equal(isTextureCanvas({}), false);
});

test('resolves texture editor session mesh through injected state UI and modal adapters', () => {
  const calls = [];
  const childMesh = { id: 'child', isMesh: true };
  const selectedGroup = { id: 'group', isMesh: false };
  const selectedMesh = { id: 'mesh', isMesh: true };
  const sessionState = { selectedMesh: null };
  const controller = createTextureEditorSessionController({
    getTextureEditorState: () => sessionState,
    getChildMesh: (target) => (target === selectedGroup ? childMesh : null),
    showToast: (message) => calls.push(['toast', message]),
    translate: (key) => `t:${key}`,
    showTextureEditorModalCommand: () => calls.push(['show']),
    hideTextureEditorModalCommand: () => calls.push(['hide']),
  });

  assert.equal(controller.resolveTextureEditorMesh(), null);
  sessionState.selectedMesh = selectedGroup;
  assert.equal(controller.getSelectedEditableMesh(), childMesh);
  assert.equal(controller.resolveTextureEditorMesh(), childMesh);
  sessionState.selectedMesh = selectedMesh;
  assert.equal(controller.resolveTextureEditorMesh(), selectedMesh);
  sessionState.selectedMesh = { id: 'empty-group', isMesh: false };
  assert.equal(controller.resolveTextureEditorMesh(), null);
  controller.showTextureEditorModal();
  controller.hideTextureEditorModal();

  assert.deepEqual(calls, [
    ['toast', 't:selectObjectFirst'],
    ['toast', 't:selectPieceNotGroup'],
    ['show'],
    ['hide'],
  ]);
});

test('builds browser texture editor session adapter through injected facade factory', () => {
  const textureEditorState = { id: 'texture-editor-state' };
  const root = { id: 'texture-editor-root' };
  const domRoots = [];
  const facade = {
    getSelectedEditableMesh: () => 'mesh-result',
    hideTextureEditorModal: () => 'hide-result',
    resolveTextureEditorMesh: () => 'resolve-result',
    showTextureEditorModal: () => 'show-result',
  };
  let facadeOptions = null;

  const result = createBrowserTextureEditorSession({
    root,
    getTextureEditorState: () => textureEditorState,
    createTextureEditorDom: ({ root: domRoot }) => {
      domRoots.push(domRoot);
      return {
        hideTextureEditorModal: () => 'dom-hide-result',
        showTextureEditorModal: () => 'dom-show-result',
      };
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getTextureEditorState(), textureEditorState);
  assert.deepEqual(domRoots, [root]);
  assert.equal(facadeOptions.showTextureEditorModalCommand(), 'dom-show-result');
  assert.equal(facadeOptions.hideTextureEditorModalCommand(), 'dom-hide-result');
  assert.equal(typeof facadeOptions.getChildMesh, 'function');
  assert.equal(typeof facadeOptions.showToast, 'function');
  assert.equal(typeof facadeOptions.translate, 'function');
});

test('configures texture filters from explicit pixelated option', () => {
  const texture = new THREE.Texture();
  configureTexture(texture, { pixelated: false });
  assert.equal(texture.magFilter, THREE.LinearFilter);
  assert.equal(texture.minFilter, THREE.LinearFilter);
  assert.equal(isTexturePixelated(texture), false);

  configureTexture(texture, { pixelated: true });
  assert.equal(texture.magFilter, THREE.NearestFilter);
  assert.equal(texture.minFilter, THREE.NearestFilter);
  assert.equal(isTexturePixelated(texture), true);
});

test('clones texture images through injected canvas factories', () => {
  const calls = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: (contextType) => {
      calls.push(['context', contextType]);
      return {
        drawImage: (image, x, y, width, height) => calls.push(['draw', image.id, x, y, width, height]),
      };
    },
  };
  const image = { id: 'image', width: 12, height: 8 };

  assert.equal(cloneImageToCanvas(image), null);
  assert.equal(cloneImageToCanvas(image, {
    createCanvas: () => canvas,
  }), canvas);
  assert.equal(canvas.width, 12);
  assert.equal(canvas.height, 8);

  class FakeCanvasTexture {
    constructor(sourceCanvas) {
      this.image = sourceCanvas;
      this.offset = { set: (...args) => calls.push(['offset', ...args]) };
      this.repeat = { set: (...args) => calls.push(['repeat', ...args]) };
      this.center = { set: (...args) => calls.push(['center', ...args]) };
    }
  }
  const texture = createDetachedCanvasTexture(image, { rotation: 0.25 }, {
    createCanvas: () => canvas,
    CanvasTextureClass: FakeCanvasTexture,
    configure: (targetTexture, options) => calls.push(['configure', targetTexture.image, options.pixelated]),
    applyTransform: (targetTexture, transform) => calls.push(['transform', targetTexture.image, transform]),
    pixelated: false,
  });
  assert.equal(texture.image, canvas);
  assert.equal(createDetachedCanvasTexture(image, null), null);

  const sourceTexture = {
    image,
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
    offset: { x: 0, y: 0 },
    repeat: { x: 1, y: 1 },
    center: { x: 0.5, y: 0.5 },
    rotation: 0,
    clone: () => ({ fallback: true }),
  };
  const cloned = cloneTexture(sourceTexture, {
    createCanvas: () => canvas,
    CanvasTextureClass: FakeCanvasTexture,
    configure: (targetTexture, options) => calls.push(['configure-clone', targetTexture.image, options.pixelated]),
    applyTransform: (targetTexture, transform) => calls.push(['transform-clone', targetTexture.image, transform]),
  });
  assert.equal(cloned.image, canvas);
  assert.deepEqual(calls, [
    ['context', '2d'],
    ['draw', 'image', 0, 0, 12, 8],
    ['context', '2d'],
    ['draw', 'image', 0, 0, 12, 8],
    ['configure', canvas, false],
    ['transform', canvas, { rotation: 0.25 }],
    ['context', '2d'],
    ['draw', 'image', 0, 0, 12, 8],
    ['configure-clone', canvas, true],
    ['transform-clone', canvas, { offset: [0, 0], repeat: [1, 1], rotation: 0, center: [0.5, 0.5] }],
  ]);
});

test('builds browser canvas texture adapters with injected root', () => {
  const calls = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (image, x, y, width, height) => calls.push(['draw', image.id, x, y, width, height]),
    }),
    toDataURL: (mimeType) => `data:${mimeType}:${canvas.width}x${canvas.height}`,
  };
  const root = {
    createElement: (tagName) => {
      calls.push(['create', tagName]);
      return canvas;
    },
  };
  const image = { id: 'image', width: 4, height: 6 };

  assert.equal(cloneBrowserImageToCanvas(image, { root }), canvas);
  assert.equal(imageToBrowserDataURL(image, {
    root,
    mimeType: 'image/custom',
    CanvasElementClass: class NeverMatches {},
  }), 'data:image/custom:4x6');

  class FakeCanvasTexture {
    constructor(sourceCanvas) {
      this.image = sourceCanvas;
    }
  }
  const detached = createDetachedBrowserCanvasTexture(image, null, {
    root,
    CanvasTextureClass: FakeCanvasTexture,
    configure: (targetTexture) => calls.push(['configure', targetTexture.image]),
    applyTransform: (targetTexture, transform) => calls.push(['transform', targetTexture.image, transform]),
  });
  assert.equal(detached.image, canvas);

  const sourceTexture = {
    image,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    offset: { x: 0, y: 0 },
    repeat: { x: 1, y: 1 },
    center: { x: 0.5, y: 0.5 },
    rotation: 0,
    clone: () => ({ fallback: true }),
  };
  const browserClone = cloneBrowserTexture(sourceTexture, {
    root,
    CanvasTextureClass: FakeCanvasTexture,
    configure: (targetTexture, options) => calls.push(['configure-clone', targetTexture.image, options.pixelated]),
    applyTransform: (targetTexture) => calls.push(['transform-clone', targetTexture.image]),
  });
  assert.equal(browserClone.image, canvas);
  assert.deepEqual(calls.map((call) => call[0]), [
    'create',
    'draw',
    'create',
    'draw',
    'create',
    'draw',
    'configure',
    'transform',
    'create',
    'draw',
    'configure-clone',
    'transform-clone',
  ]);
});

test('creates live canvas textures through injected texture adapters', () => {
  const canvas = { id: 'paint-canvas' };
  const transform = { offset: [0.25, 0.5] };
  const calls = [];

  class FakeCanvasTexture {
    constructor(image) {
      this.image = image;
      calls.push(['texture', image]);
    }
  }

  const texture = createLiveCanvasTexture(canvas, transform, {
    pixelated: false,
    CanvasTextureClass: FakeCanvasTexture,
    configure: (targetTexture, options) => {
      calls.push(['configure', targetTexture.image, options]);
      targetTexture.pixelated = options.pixelated;
    },
    applyTransform: (targetTexture, targetTransform) => {
      calls.push(['transform', targetTexture.image, targetTransform]);
      targetTexture.transform = targetTransform;
    },
  });

  assert.equal(texture.image, canvas);
  assert.equal(texture.pixelated, false);
  assert.equal(texture.transform, transform);
  assert.deepEqual(calls, [
    ['texture', canvas],
    ['configure', canvas, { pixelated: false }],
    ['transform', canvas, transform],
  ]);
  assert.equal(createLiveCanvasTexture(null), null);
});

test('converts texture images to data URLs through injected canvas adapters', () => {
  const directCanvas = {
    toDataURL: (mimeType) => `direct:${mimeType}`,
  };
  assert.equal(imageToDataURL(directCanvas, {
    mimeType: 'image/custom',
    isCanvas: (value) => value === directCanvas,
  }), 'direct:image/custom');

  const calls = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: (contextType) => {
      calls.push(['context', contextType]);
      return {
        drawImage: (image, x, y, width, height) => {
          calls.push(['draw', image, x, y, width, height]);
        },
      };
    },
    toDataURL: (mimeType) => {
      calls.push(['data-url', mimeType, canvas.width, canvas.height]);
      return 'data:image/custom;base64,abc';
    },
  };
  const image = { width: 64, height: 32 };

  assert.equal(imageToDataURL(image, {
    mimeType: 'image/custom',
    createCanvas: () => canvas,
    isCanvas: () => false,
  }), 'data:image/custom;base64,abc');
  assert.deepEqual(calls, [
    ['context', '2d'],
    ['draw', image, 0, 0, 64, 32],
    ['data-url', 'image/custom', 64, 32],
  ]);

  assert.equal(imageToDataURL({ naturalWidth: 0, naturalHeight: 0 }, {
    createCanvas: () => ({ getContext: () => null }),
    isCanvas: () => false,
  }), null);
  assert.equal(imageToDataURL(null), null);
});

test('applies and toggles mesh texture state', () => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  const texture = new THREE.Texture();
  const actions = [];

  assert.equal(applyTextureToMesh(mesh, texture, {
    actionType: 'Apply texture',
    pushAction: (action) => actions.push(action),
  }), true);
  assert.equal(mesh.material.map, texture);
  assert.equal(mesh.userData.texture, texture);
  assert.equal(mesh.userData.textureEnabled, true);
  assert.equal(actions.length, 1);

  actions[0].undo();
  assert.equal(mesh.material.map, null);
  assert.equal(mesh.userData.texture, undefined);
  assert.equal(mesh.userData.textureEnabled, undefined);

  actions[0].redo();
  assert.equal(mesh.material.map, texture);
  assert.equal(mesh.userData.textureEnabled, true);

  assert.equal(toggleMeshTexture(mesh), true);
  assert.equal(mesh.material.map, null);
  assert.equal(mesh.userData.textureEnabled, false);

  assert.equal(toggleMeshTexture(mesh), true);
  assert.equal(mesh.material.map, texture);
  assert.equal(mesh.userData.textureEnabled, true);
});

test('runs texture runtime flows through injected browser and state adapters', async () => {
  const calls = [];
  class FakeTexture {
    constructor(image) {
      this.image = image;
    }
  }
  const image = { width: 16, height: 16 };
  const selected = { name: 'selected' };
  const childMesh = { name: 'child' };

  const configured = createConfiguredTexture(image, {
    TextureClass: FakeTexture,
    pixelated: false,
    configureTexture: (texture, options) => {
      calls.push(['configure', texture.image, options.pixelated]);
      texture.configured = options.pixelated;
    },
  });
  assert.equal(configured.image, image);
  assert.equal(configured.configured, false);

  assert.equal(applyLoadedTextureToSelection({
    texture: configured,
    dataUrl: 'data:image/png;base64,ok',
    selectedObject: selected,
    getTargetMesh: (object) => {
      calls.push(['target', object]);
      return childMesh;
    },
    applyTexture: (target, texture) => {
      calls.push(['apply', target, texture]);
      return true;
    },
    showToast: (message) => calls.push(['toast', message]),
    successMessage: 'applied',
    showPreview: (src) => calls.push(['preview', src]),
    showUvControls: () => calls.push(['uv']),
  }), true);

  assert.equal(applyLoadedTextureToSelection({
    texture: configured,
    selectedObject: null,
    applyTexture: () => calls.push(['unexpected']),
  }), false);

  assert.equal(await loadTextureFileForSelection('file.png', {
    loadImageFile: async (file) => {
      calls.push(['load', file]);
      return { image, dataUrl: 'data:image/png;base64,loaded' };
    },
    TextureClass: FakeTexture,
    configureTexture: (texture, options) => calls.push(['configure-loaded', texture.image, options.pixelated]),
    pixelated: true,
    getSelectedObject: () => selected,
    getTargetMesh: () => childMesh,
    applyTexture: () => true,
    showToast: (message) => calls.push(['toast-loaded', message]),
    successMessage: 'loaded',
    errorPrefix: 'error: ',
    showPreview: (src) => calls.push(['preview-loaded', src]),
    showUvControls: () => calls.push(['uv-loaded']),
  }), true);

  assert.equal(await loadTextureFileForSelection('bad.png', {
    loadImageFile: async () => { throw new Error('bad file'); },
    TextureClass: FakeTexture,
    configureTexture: () => {},
    showToast: (message) => calls.push(['toast-error', message]),
    errorPrefix: 'error: ',
  }), false);

  assert.equal(toggleSelectedTexture({
    selectedObject: selected,
    getTargetMesh: () => childMesh,
    toggleTexture: (target) => {
      calls.push(['toggle', target]);
      return true;
    },
  }), true);

  const textureState = {
    pixelatedMode: false,
    userObjects: { name: 'root' },
  };
  assert.equal(togglePixelatedSetting(textureState, {
    nearestFilter: 'nearest',
    linearFilter: 'linear',
    applyFilterToObject: (root, filter) => calls.push(['filter', root, filter]),
  }), true);

  assert.deepEqual(calls, [
    ['configure', image, false],
    ['target', selected],
    ['apply', childMesh, configured],
    ['toast', 'applied'],
    ['preview', 'data:image/png;base64,ok'],
    ['uv'],
    ['load', 'file.png'],
    ['configure-loaded', image, true],
    ['toast-loaded', 'loaded'],
    ['preview-loaded', 'data:image/png;base64,loaded'],
    ['uv-loaded'],
    ['toast-error', 'error: bad file'],
    ['toggle', childMesh],
    ['filter', textureState.userObjects, 'nearest'],
  ]);
});

test('coordinates texture controller through injected runtime getters browser and command adapters', async () => {
  const calls = [];
  const selected = { id: 'selected' };
  const target = { id: 'target' };
  const textureState = {
    selectedMesh: selected,
    pixelatedMode: false,
    userObjects: { id: 'root' },
  };
  class FakeTexture {
    constructor(image) {
      this.image = image;
    }
  }

  const controller = createTextureController({
    getTextureState: () => textureState,
    TextureClass: FakeTexture,
    nearestFilter: 'nearest',
    linearFilter: 'linear',
    loadImageFile: async (file) => {
      calls.push(['load-file', file]);
      return { image: { id: 'image' }, dataUrl: 'data:image/png;base64,abc' };
    },
    configureTexture: (texture, options) => calls.push(['configure', texture.image, options.pixelated]),
    getTargetMesh: (object) => {
      calls.push(['target', object]);
      return target;
    },
    showToast: (message) => calls.push(['toast', message]),
    pushAction: (action) => calls.push(['action', action.type]),
    translate: (key) => `t:${key}`,
    bindTextureDropZone: (dropZone, loader) => {
      calls.push(['bind-drop', dropZone]);
      return loader('drop-file');
    },
    showPreview: (src) => calls.push(['preview', src]),
    showUvControls: () => calls.push(['uv']),
    applyTextureToMeshCommand: (mesh, texture, options) => {
      calls.push(['apply', mesh, texture.image, options.actionType]);
      options.pushAction({ type: options.actionType });
      return true;
    },
    toggleMeshTextureCommand: (mesh) => {
      calls.push(['toggle', mesh]);
      return true;
    },
    applyTextureFilterToObjectCommand: (root, filter) => calls.push(['filter', root, filter]),
  });

  const uploaded = await controller.handleTextureUpload({ target: { files: ['upload-file'] } });
  assert.equal(uploaded, true);
  assert.equal(controller.handleTextureUpload({ target: { files: [] } }), false);
  await controller.setupTextureDragDrop('drop-zone');
  assert.equal(controller.applyTexture(target, { image: { id: 'manual' } }), true);
  assert.equal(controller.toggleTexture(), true);
  assert.equal(controller.togglePixelated(), true);
  assert.equal(textureState.pixelatedMode, true);

  assert.deepEqual(calls, [
    ['load-file', 'upload-file'],
    ['configure', { id: 'image' }, false],
    ['target', selected],
    ['apply', target, { id: 'image' }, 't:actionApplyTexture'],
    ['action', 't:actionApplyTexture'],
    ['toast', 't:textureApplied'],
    ['preview', 'data:image/png;base64,abc'],
    ['uv'],
    ['bind-drop', 'drop-zone'],
    ['load-file', 'drop-file'],
    ['configure', { id: 'image' }, false],
    ['target', selected],
    ['apply', target, { id: 'image' }, 't:actionApplyTexture'],
    ['action', 't:actionApplyTexture'],
    ['toast', 't:textureApplied'],
    ['preview', 'data:image/png;base64,abc'],
    ['uv'],
    ['apply', target, { id: 'manual' }, 't:actionApplyTexture'],
    ['action', 't:actionApplyTexture'],
    ['target', selected],
    ['toggle', target],
    ['filter', textureState.userObjects, 'nearest'],
  ]);

  const explicitStateGetter = createTextureRuntimeStateGetter({
    getTextureState: () => ({
      selectedObject: null,
      selectedMesh: 'selected-mesh-alias',
    }),
    getSelectedObject: () => 'legacy-selected',
  });
  assert.deepEqual(explicitStateGetter(), {
    textureState: {
      selectedObject: null,
      selectedMesh: 'selected-mesh-alias',
    },
    selectedObject: null,
  });

  const aliasStateGetter = createTextureRuntimeStateGetter({
    getTextureState: () => ({ selectedMesh: 'selected-mesh-alias' }),
  });
  assert.equal(aliasStateGetter().selectedObject, 'selected-mesh-alias');

  const legacyStateGetter = createTextureRuntimeStateGetter({
    getTextureState: () => ({ pixelatedMode: true }),
    getSelectedObject: () => 'legacy-selected',
  });
  assert.deepEqual(legacyStateGetter(), {
    textureState: { pixelatedMode: true },
    selectedObject: 'legacy-selected',
  });
});

test('renders texture panel DOM through injected root adapters', () => {
  const createElement = () => {
    const classes = new Set(['hidden']);
    return {
      classList: {
        add: (className) => classes.add(className),
        remove: (className) => classes.delete(className),
        contains: (className) => classes.has(className),
      },
      src: '',
    };
  };
  const preview = createElement();
  const uvControls = createElement();
  const root = {
    getElementById: (id) => ({
      'texture-preview': preview,
      'uv-controls': uvControls,
    }[id] || null),
  };
  const dropZoneClasses = new Set();
  const listeners = new Map();
  const dropZone = {
    classList: {
      add: (className) => dropZoneClasses.add(className),
      remove: (className) => dropZoneClasses.delete(className),
      contains: (className) => dropZoneClasses.has(className),
    },
    addEventListener: (eventName, handler) => listeners.set(eventName, handler),
  };
  const files = [];
  let prevented = 0;

  showTexturePanelPreview('data:image/png;base64,panel', root);
  showTextureUVControls(root);
  assert.equal(preview.src, 'data:image/png;base64,panel');
  assert.equal(preview.classList.contains('hidden'), false);
  assert.equal(uvControls.classList.contains('hidden'), false);

  const adapter = createTexturePanelDomAdapter({ root });
  adapter.showPreview('data:image/png;base64,adapter');
  adapter.showUvControls();
  assert.equal(preview.src, 'data:image/png;base64,adapter');

  setupTextureDropZone(dropZone, (file) => files.push(file));
  listeners.get('dragover')({ preventDefault: () => { prevented += 1; } });
  assert.equal(dropZone.classList.contains('border-white'), true);
  listeners.get('dragleave')();
  assert.equal(dropZone.classList.contains('border-white'), false);

  const imageFile = { type: 'image/png' };
  listeners.get('drop')({
    preventDefault: () => { prevented += 1; },
    dataTransfer: { files: [imageFile] },
  });
  assert.equal(dropZone.classList.contains('border-white'), false);
  assert.deepEqual(files, [imageFile]);

  listeners.get('drop')({
    preventDefault: () => { prevented += 1; },
    dataTransfer: { files: [{ type: 'text/plain' }] },
  });
  assert.deepEqual(files, [imageFile]);
  assert.equal(prevented, 3);
});

test('builds browser texture controller adapter through injected facade factory', () => {
  const textureState = { id: 'browser-texture-state' };
  const facade = {
    applyTexture: () => 'apply-result',
    handleTextureUpload: () => 'upload-result',
    loadTextureFromFile: () => 'load-result',
    setupTextureDragDrop: () => 'drop-result',
    togglePixelated: () => 'pixelated-result',
    toggleTexture: () => 'toggle-result',
  };
  let facadeOptions = null;
  let panelRoot = null;
  const root = { id: 'texture-root' };
  const texturePanelDom = {
    bindTextureDropZone: () => 'bind-drop-zone',
    showPreview: () => 'show-preview',
    showUvControls: () => 'show-uv-controls',
  };

  const result = createBrowserTextureController({
    root,
    getTextureState: () => textureState,
    createTexturePanelDom: (options) => {
      panelRoot = options.root;
      return texturePanelDom;
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getTextureState(), textureState);
  assert.equal(typeof facadeOptions.TextureClass, 'function');
  assert.equal(typeof facadeOptions.nearestFilter, 'number');
  assert.equal(typeof facadeOptions.linearFilter, 'number');
  assert.equal(typeof facadeOptions.loadImageFile, 'function');
  assert.equal(typeof facadeOptions.configureTexture, 'function');
  assert.equal(typeof facadeOptions.getTargetMesh, 'function');
  assert.equal(typeof facadeOptions.showToast, 'function');
  assert.equal(typeof facadeOptions.pushAction, 'function');
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.equal(panelRoot, root);
  assert.equal(facadeOptions.bindTextureDropZone(), 'bind-drop-zone');
  assert.equal(facadeOptions.showPreview(), 'show-preview');
  assert.equal(facadeOptions.showUvControls(), 'show-uv-controls');
});

test('rejects invalid object hierarchy cycles', () => {
  const objectDefinition = {
    name: 'BAD_HIERARCHY',
    pieces: [
      {
        name: 'A',
        parent: 'B',
        geometry: { type: 'cube', params: { width: 1, height: 1, depth: 1 } },
      },
      {
        name: 'B',
        parent: 'A',
        geometry: { type: 'cube', params: { width: 1, height: 1, depth: 1 } },
      },
    ],
  };

  const translate = (key, params = {}) => `${key}:${params.name}:${params.max}`;

  assert.equal(validateObjectJSON(objectDefinition, { translate }), 'pieceParentCycle:A:8');
});

test('validates object JSON through injected translation dependencies', () => {
  const calls = [];
  const translate = (key, params = {}) => {
    calls.push([key, params]);
    return `translated:${key}:${params.n ?? ''}:${params.type ?? ''}`;
  };

  assert.equal(validateObjectJSON(null, { translate }), 'translated:jsonMustBeObject::');
  assert.equal(validateObjectJSON({
    pieces: [{
      name: 'Piece',
      geometry: { type: 'pyramid' },
    }],
  }, { translate }), 'translated:pieceUnsupportedType:1:pyramid');
  assert.equal(validateObjectJSON({
    pieces: [{
      name: 'Piece',
      geometry: { type: 'cube' },
    }],
  }), null);
  assert.deepEqual(calls, [
    ['jsonMustBeObject', {}],
    ['pieceUnsupportedType', { n: 1, type: 'pyramid', types: 'cube, sphere, cylinder, cone, plane, capsule, torus' }],
  ]);
});

test('imports object JSON through injected construction selection undo and animation adapters', () => {
  const definition = { pieces: [{ name: 'Piece' }] };
  const normalized = {
    name: 'Imported Hero',
    pieces: [{ name: 'Piece' }],
    animations: [{ name: 'walk' }, { name: 'bad' }],
  };
  const child = { id: 'child' };
  const group = { id: 'group', children: [child] };
  const calls = [];
  const importState = { selectedMesh: null };
  let undoAction = null;
  const translate = (key) => `t:${key}`;

  const result = importObjectDefinitionFromData(definition, {
    validateObject: (data) => {
      calls.push(['validate', data]);
      return null;
    },
    normalizeObject: (data) => {
      calls.push(['normalize', data]);
      return normalized;
    },
    buildObjectGroup: (data) => {
      calls.push(['build', data]);
      return group;
    },
    importAnimationData: (animation, targetGroup) => {
      calls.push(['animation', animation.name, targetGroup]);
      return animation.name === 'bad'
        ? { success: false, error: 'Bad animation' }
        : { success: true };
    },
    addGroup: (targetGroup) => calls.push(['add', targetGroup]),
    removeGroup: (targetGroup) => calls.push(['remove', targetGroup]),
    getImportState: () => importState,
    selectGroup: (targetGroup) => {
      importState.selectedMesh = targetGroup;
      calls.push(['select', targetGroup]);
    },
    deselect: () => {
      importState.selectedMesh = null;
      calls.push(['deselect']);
    },
    pushAction: (action) => {
      undoAction = action;
      calls.push(['action', action.type]);
    },
    showToast: (message) => calls.push(['toast', message]),
    translate,
  });

  assert.equal(result.success, true);
  assert.equal(result.group, group);
  assert.deepEqual(calls, [
    ['validate', definition],
    ['normalize', definition],
    ['build', normalized],
    ['animation', 'walk', group],
    ['animation', 'bad', group],
    ['toast', 'Bad animation'],
    ['add', group],
    ['select', group],
    ['action', 't:actionImportObject'],
    ['toast', 't:objectImportedImported Hero'],
  ]);

  importState.selectedMesh = child;
  undoAction.undo();
  undoAction.redo();
  assert.deepEqual(calls.slice(-4), [
    ['deselect'],
    ['remove', group],
    ['add', group],
    ['select', group],
  ]);

  const explicitStateGetter = createJSONImportRuntimeStateGetter({
    getImportState: () => ({
      selectedMesh: null,
      selectedGroup: 'group-from-state',
    }),
    getSelectedMesh: () => 'legacy-selected',
    getSelectedGroup: () => 'legacy-group',
  });
  assert.deepEqual(explicitStateGetter(), {
    importState: {
      selectedMesh: null,
      selectedGroup: 'group-from-state',
    },
    selectedMesh: null,
    selectedGroup: 'group-from-state',
  });

  const aliasStateGetter = createJSONImportRuntimeStateGetter({
    getImportState: () => ({ selectedMesh: 'selected-group-alias' }),
  });
  assert.deepEqual(aliasStateGetter(), {
    importState: { selectedMesh: 'selected-group-alias' },
    selectedMesh: 'selected-group-alias',
    selectedGroup: 'selected-group-alias',
  });

  const legacyStateGetter = createJSONImportRuntimeStateGetter({
    getSelectedMesh: () => 'legacy-selected',
    getSelectedGroup: () => 'legacy-group',
  });
  assert.deepEqual(legacyStateGetter(), {
    importState: {},
    selectedMesh: 'legacy-selected',
    selectedGroup: 'legacy-group',
  });
});

test('routes parsed JSON imports between object animation and error flows', () => {
  const calls = [];
  const selectedGroup = { id: 'selected-group', isGroup: true };
  const translate = (key) => `t:${key}`;

  const objectResult = handleParsedJSONImport({ pieces: [{ name: 'Piece' }] }, '{"pieces":[]}', {
    validateObject: () => null,
    normalizeObject: () => ({ name: 'Object', pieces: [] }),
    buildObjectGroup: () => ({ id: 'object-group', children: [] }),
    addGroup: (group) => calls.push(['add', group.id]),
    selectGroup: (group) => calls.push(['select', group.id]),
    pushAction: (action) => calls.push(['action', action.type]),
    closeImportModal: () => calls.push(['close']),
    showToast: (message) => calls.push(['toast', message]),
    translate,
  });
  assert.equal(objectResult.success, true);

  const animationResult = handleParsedJSONImport({ tracks: [] }, '{"tracks":[]}', {
    getImportState: () => ({ selectedMesh: selectedGroup }),
    importAnimationToGroup: (jsonText, group) => {
      calls.push(['animation', jsonText, group]);
      return { success: true };
    },
    showTimelineForGroup: (group) => calls.push(['timeline', group]),
    closeImportModal: () => calls.push(['close']),
    setImportError: (message) => calls.push(['error', message]),
    translate,
  });
  assert.equal(animationResult.success, true);

  const missingSelection = handleParsedJSONImport({ animations: [] }, '{"animations":[]}', {
    getImportState: () => ({ selectedMesh: null }),
    importAnimationToGroup: () => ({ success: true }),
    setImportError: (message) => calls.push(['error', message]),
    translate,
  });
  assert.deepEqual(missingSelection, { success: false, error: 't:selectGroupForAnim' });

  const unrecognized = handleParsedJSONImport(null, 'null', {
    setImportError: (message) => calls.push(['error', message]),
    translate,
  });
  assert.deepEqual(unrecognized, { success: false, error: 't:jsonNotRecognized' });
  assert.deepEqual(calls, [
    ['add', 'object-group'],
    ['select', 'object-group'],
    ['action', 't:actionImportObject'],
    ['toast', 't:objectImportedObject'],
    ['close'],
    ['animation', '{"tracks":[]}', selectedGroup],
    ['timeline', selectedGroup],
    ['close'],
    ['error', 't:selectGroupForAnim'],
    ['error', 't:jsonNotRecognized'],
  ]);
});

test('handles JSON import text parsing submit and file flows through injected adapters', async () => {
  const calls = [];
  const translate = (key) => ({
    jsonFileReadError: 'Read failed',
    jsonInvalid: 'Invalid JSON: ',
    jsonNotRecognized: 'Not recognized',
    objectImported: 'Imported ',
    pasteJsonFirst: 'Paste JSON first',
  })[key] || key;
  const objectData = { pieces: [{ name: 'Piece' }] };
  const normalized = { name: 'File Object', pieces: [] };

  assert.deepEqual(parseJSONImportText('{"ok":true}', { translate }), { data: { ok: true } });
  assert.match(parseJSONImportText('{', { translate }).error, /^Invalid JSON: /);
  assert.match(importObjectFromJSONString('{', { translate }).error, /^Invalid JSON: /);

  assert.deepEqual(handleJSONImportSubmit({
    getImportText: () => '',
    setImportError: (message) => calls.push(['error', message]),
    translate,
  }), { success: false, error: 'Paste JSON first' });

  assert.match(handleJSONImportSubmit({
    getImportText: () => '{',
    setImportError: (message) => calls.push(['error', message]),
    translate,
  }).error, /^Invalid JSON: /);

  const success = await handleJSONImportFile('file.json', {
    readFileAsJSON: async (file) => {
      calls.push(['read', file]);
      return objectData;
    },
    setImportText: (text) => calls.push(['text', text]),
    validateObject: () => null,
    normalizeObject: () => normalized,
    buildObjectGroup: () => ({ id: 'file-group', children: [] }),
    addGroup: (group) => calls.push(['add', group.id]),
    selectGroup: (group) => calls.push(['select', group.id]),
    pushAction: (action) => calls.push(['action', action.type]),
    closeImportModal: () => calls.push(['close']),
    showToast: (message) => calls.push(['toast', message]),
    translate,
  });
  assert.equal(success.success, true);
  assert.deepEqual(calls.slice(-6), [
    ['text', JSON.stringify(objectData, null, 2)],
    ['add', 'file-group'],
    ['select', 'file-group'],
    ['action', 'actionImportObject'],
    ['toast', 'Imported File Object'],
    ['close'],
  ]);

  const syntaxError = await handleJSONImportFile('bad.json', {
    readFileAsJSON: async () => {
      throw new SyntaxError('bad');
    },
    setImportError: (message) => calls.push(['error', message]),
    translate,
  });
  assert.deepEqual(syntaxError, { success: false, error: 'Invalid JSON: bad' });

  const readError = await handleJSONImportFile('missing.json', {
    readFileAsJSON: async () => {
      throw new Error('missing');
    },
    setImportError: (message) => calls.push(['error', message]),
    translate,
  });
  assert.deepEqual(readError, { success: false, error: 'Read failed' });
  assert.equal(await handleJSONImportFile(null), undefined);
});

test('builds browser JSON import adapter through injected flow factories', async () => {
  const calls = [];
  const importState = { id: 'browser-json-import-state' };
  const validateObject = () => null;
  const normalizeObject = () => ({ name: 'Normalized' });
  const importAnimationData = () => ({ success: true });
  const importAnimationToGroupCommand = () => ({ success: true });
  const readFileAsJSONCommand = async () => ({ pieces: [] });
  const translate = (key) => `t:${key}`;
  const getImportTextCommand = () => '{"pieces":[]}';
  const setImportTextCommand = () => {};
  const setImportErrorCommand = () => {};
  let importDependencies = null;
  let fileDependencies = null;
  let submitDependencies = null;

  const importer = createBrowserJSONImporter({
    importHooks: { showTimelineForGroup: null },
    getImportState: () => importState,
    validateObject,
    normalizeObject,
    buildGroupFromDefinitionCommand: (definition, options) => {
      calls.push(['build', definition, options]);
      return { id: 'built-group' };
    },
    importAnimationData,
    addGroup: (group) => calls.push(['add', group]),
    removeGroup: (group) => calls.push(['remove', group]),
    selectGroup: (group) => calls.push(['select', group]),
    deselectCommand: () => calls.push(['deselect']),
    pushActionCommand: (action) => calls.push(['action', action.type]),
    showToastCommand: (message) => calls.push(['toast', message]),
    translate,
    getImportTextCommand,
    setImportTextCommand,
    setImportErrorCommand,
    showImportModalCommand: () => calls.push(['show-modal']),
    hideImportModalCommand: () => calls.push(['hide-modal']),
    clearImportModalCommand: () => calls.push(['clear-modal']),
    importAnimationToGroupCommand,
    readFileAsJSONCommand,
    importObjectFromJSONStringCommand: (jsonString, dependencies) => {
      importDependencies = dependencies;
      return ['import-object', jsonString];
    },
    handleJSONImportSubmitCommand: (dependencies) => {
      submitDependencies = dependencies;
      dependencies.showTimelineForGroup('timeline-group');
      dependencies.closeImportModal();
      return 'submit-result';
    },
    handleJSONImportFileCommand: async (file, dependencies) => {
      fileDependencies = dependencies;
      return ['file-result', file];
    },
  });

  importer.configureImportHooks({
    showTimelineForGroup: (group) => calls.push(['timeline', group]),
  });

  assert.deepEqual(importer.importObjectFromJSON('{"pieces":[]}'), ['import-object', '{"pieces":[]}']);
  assert.equal(importDependencies.getImportState(), importState);
  assert.equal(importDependencies.validateObject, validateObject);
  assert.equal(importDependencies.normalizeObject, normalizeObject);
  assert.equal(importDependencies.importAnimationData, importAnimationData);
  assert.equal(importDependencies.translate, translate);
  assert.equal(importDependencies.getImportText, getImportTextCommand);
  assert.equal(importDependencies.setImportText, setImportTextCommand);
  assert.equal(importDependencies.setImportError, setImportErrorCommand);
  assert.equal(importDependencies.importAnimationToGroup, importAnimationToGroupCommand);
  assert.equal(importDependencies.readFileAsJSON, readFileAsJSONCommand);
  assert.deepEqual(importDependencies.buildObjectGroup({ id: 'definition' }), { id: 'built-group' });

  importer.openImportModal();
  importer.closeImportModal();
  assert.equal(importer.handleImportSubmit(), 'submit-result');
  assert.deepEqual(await importer.handleImportFile({ target: { files: ['object.json'] } }), [
    'file-result',
    'object.json',
  ]);

  assert.equal(submitDependencies.getImportState(), importState);
  assert.equal(fileDependencies.readFileAsJSON, readFileAsJSONCommand);
  assert.deepEqual(calls, [
    ['build', { id: 'definition' }, { compileAnimations: false }],
    ['show-modal'],
    ['clear-modal'],
    ['hide-modal'],
    ['timeline', 'timeline-group'],
    ['hide-modal'],
  ]);
});

test('builds browser JSON import DOM commands from injected root adapter', () => {
  const calls = [];
  const root = { id: 'json-import-root' };

  const importer = createBrowserJSONImporter({
    root,
    createImportDom: (options) => {
      calls.push(['root', options.root]);
      return {
        showImportModal: () => calls.push(['show']),
        hideImportModal: () => calls.push(['hide']),
        clearImportModal: () => calls.push(['clear']),
        getImportText: () => '{"pieces":[]}',
        setImportText: (text) => calls.push(['text', text]),
        setImportError: (message) => calls.push(['error', message]),
      };
    },
  });

  importer.openImportModal();
  importer.closeImportModal();

  assert.deepEqual(calls, [
    ['root', root],
    ['show'],
    ['clear'],
    ['hide'],
  ]);
});

test('builds browser JSON import validation with translated core errors', () => {
  const importer = createBrowserJSONImporter({
    translate: (key, params = {}) => `t:${key}:${params.n ?? ''}`,
  });

  assert.equal(importer.validateObjectJSON({ pieces: [{}] }), 't:pieceMissingGeometry:1');
});

test('manages import modal DOM state', () => {
  const elements = new Map();
  const createElement = () => {
    const classes = new Set(['hidden']);
    return {
      value: '',
      textContent: '',
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name),
      },
    };
  };

  elements.set('import-modal', createElement());
  elements.set('import-json-textarea', createElement());
  elements.set('import-error', createElement());

  const root = {
    getElementById: (id) => elements.get(id) || null,
  };
  const adapter = createJSONImportDomAdapter({ root });

  showImportModal(root);
  assert.equal(elements.get('import-modal').classList.contains('hidden'), false);
  assert.equal(isImportModalOpen(root), true);

  setImportText('  { "pieces": [] }  ', root);
  setImportError('Invalid', root);
  assert.equal(getImportText(root), '{ "pieces": [] }');

  clearImportModal(root);
  assert.equal(elements.get('import-json-textarea').value, '');
  assert.equal(elements.get('import-error').textContent, '');

  adapter.showImportModal();
  assert.equal(adapter.isImportModalOpen(), true);
  adapter.setImportText('  adapter text  ');
  adapter.setImportError('Adapter invalid');
  assert.equal(adapter.getImportText(), 'adapter text');
  adapter.clearImportError();
  assert.equal(elements.get('import-error').textContent, '');
  adapter.hideImportModal();
  assert.equal(elements.get('import-modal').classList.contains('hidden'), true);
});

test('manages shared undo history without UI dependencies', () => {
  const calls = [];
  const history = createUndoHistory({ maxHistory: 2 });
  const createAction = (type) => ({
    type,
    undo: () => calls.push(['undo', type]),
    redo: () => calls.push(['redo', type]),
  });
  const first = createAction('first');
  const second = createAction('second');
  const third = createAction('third');

  assert.equal(history.undo(), null);
  assert.equal(history.redo(), null);
  history.pushAction(first);
  history.pushAction(second);
  history.pushAction(third);
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), false);
  assert.equal(history.undo(), third);
  assert.equal(history.undo(), second);
  assert.equal(history.undo(), null);
  assert.equal(history.redo(), second);
  assert.deepEqual(calls, [
    ['undo', 'third'],
    ['undo', 'second'],
    ['redo', 'second'],
  ]);
  history.clearHistory();
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), false);
});

test('routes undo facade feedback through injected toast dependency', () => {
  const calls = [];

  try {
    clearGlobalUndoHistory();
    configureUndoFeedback({
      showToast: (message) => calls.push(['toast', message]),
      undoMessage: (action) => `undo:${action.type}`,
      redoMessage: (action) => `redo:${action.type}`,
    });
    pushGlobalUndoAction({
      type: 'Move',
      undo: () => calls.push(['undo']),
      redo: () => calls.push(['redo']),
    });

    assert.equal(undoGlobalUndoAction()?.type, 'Move');
    assert.equal(redoGlobalUndoAction()?.type, 'Move');
    assert.deepEqual(calls, [
      ['undo'],
      ['toast', 'undo:Move'],
      ['redo'],
      ['toast', 'redo:Move'],
    ]);
  } finally {
    clearGlobalUndoHistory();
    resetUndoFeedback();
  }
});

test('binds declarative app actions through injected DOM root', async () => {
  const listeners = new Map();
  const root = {
    addEventListener: (eventName, handler) => listeners.set(eventName, handler),
    removeEventListener: (eventName, handler) => {
      if (listeners.get(eventName) === handler) listeners.delete(eventName);
    },
  };
  const calls = [];
  const errors = [];
  const createTarget = (selector, dataset) => ({
    dataset,
    closest: (targetSelector) => (targetSelector === selector ? { dataset } : null),
  });

  const cleanup = bindDeclarativeActions(root, {
    clickActions: {
      save: (element, event) => calls.push(['click', element.dataset.action, event.type]),
      fail: async () => {
        throw new Error('bad-action');
      },
    },
    changeActions: {
      load: (element, event) => calls.push(['change', element.dataset.changeAction, event.type]),
    },
    inputActions: {
      rename: (element, event) => calls.push(['input', element.dataset.inputAction, event.type]),
    },
    onError: (error) => errors.push(error.message),
  });

  listeners.get('click')({
    type: 'click',
    target: createTarget('[data-action]', { action: 'save' }),
  });
  listeners.get('change')({
    type: 'change',
    target: createTarget('[data-change-action]', { changeAction: 'load' }),
  });
  listeners.get('input')({
    type: 'input',
    target: createTarget('[data-input-action]', { inputAction: 'rename' }),
  });
  assert.deepEqual(calls, [
    ['click', 'save', 'click'],
    ['change', 'load', 'change'],
    ['input', 'rename', 'input'],
  ]);

  listeners.get('click')({
    type: 'click',
    target: createTarget('[data-action]', { action: 'missing' }),
  });
  assert.equal(calls.length, 3);

  listeners.get('click')({
    type: 'click',
    target: createTarget('[data-action]', { action: 'fail' }),
  });
  await Promise.resolve();
  assert.deepEqual(errors, ['bad-action']);

  cleanup();
  assert.equal(listeners.size, 0);
});

test('coordinates responsive side panels through injected DOM and viewport adapters', () => {
  const calls = [];
  const createPanel = () => {
    const classes = new Set();
    return {
      classList: {
        contains: (name) => classes.has(name),
        toggle: (name, force) => {
          const shouldAdd = force === undefined ? !classes.has(name) : force;
          if (shouldAdd) classes.add(name);
          else classes.delete(name);
        },
      },
    };
  };
  const elements = new Map([
    ['left-panel', createPanel()],
    ['toggle-left-icon', { innerHTML: '' }],
    ['right-panel', createPanel()],
    ['toggle-right-icon', { innerHTML: '' }],
  ]);
  const controller = createPanelController({
    getPanelElements: (config) => ({
      panel: elements.get(config.panelId),
      icon: elements.get(config.iconId),
    }),
    isNarrowViewport: () => true,
    scheduleResize: (callback, delay) => calls.push(['schedule', delay, callback]),
    onResize: () => calls.push(['resize']),
  });

  assert.equal(controller.applyResponsivePanelDefaults(), true);
  assert.equal(elements.get('left-panel').classList.contains('panel-collapsed'), true);
  assert.equal(elements.get('right-panel').classList.contains('panel-collapsed'), true);
  assert.equal(elements.get('toggle-left-icon').innerHTML, '&#9654;');
  assert.equal(elements.get('toggle-right-icon').innerHTML, '&#9664;');
  assert.equal(calls[0][0], 'schedule');
  calls[0][2]();
  assert.deepEqual(calls.map((call) => call[0]), ['schedule', 'resize']);
  calls.length = 0;

  assert.equal(controller.toggleLeftPanel(), true);
  assert.equal(elements.get('left-panel').classList.contains('panel-collapsed'), false);
  assert.equal(elements.get('right-panel').classList.contains('panel-collapsed'), true);
  assert.equal(elements.get('toggle-left-icon').innerHTML, '&#9664;');
  assert.deepEqual(calls.map((call) => call.slice(0, 2)), [['schedule', 10]]);
});

test('builds browser panel controller through injected root viewport and scheduler', () => {
  const calls = [];
  const panel = { id: 'panel' };
  const icon = { id: 'icon' };
  let controllerOptions = null;
  const facade = { toggleLeftPanel: () => 'left' };
  const controller = createBrowserPanelController({
    root: {
      getElementById: (id) => ({ 'left-panel': panel, 'toggle-left-icon': icon }[id] || null),
    },
    viewport: {
      matchMedia: (query) => {
        calls.push(['media', query]);
        return { matches: true };
      },
    },
    onResizeCommand: () => calls.push(['resize']),
    schedule: (callback, delay) => calls.push(['schedule', callback, delay]),
    createController: (options) => {
      controllerOptions = options;
      return facade;
    },
  });

  assert.equal(controller, facade);
  assert.deepEqual(controllerOptions.getPanelElements({ panelId: 'left-panel', iconId: 'toggle-left-icon' }), {
    panel,
    icon,
  });
  assert.equal(controllerOptions.isNarrowViewport(), true);
  controllerOptions.scheduleResize(controllerOptions.onResize, 10);
  assert.deepEqual(calls, [
    ['media', '(max-width: 700px)'],
    ['schedule', controllerOptions.onResize, 10],
  ]);
});

test('caches lazy app modules and binds declarative action maps through app bootstrap helpers', async () => {
  let loadCount = 0;
  const moduleRef = { id: 'module' };
  const loadModule = createCachedModuleLoader(async () => {
    loadCount += 1;
    return moduleRef;
  });

  assert.equal(await loadModule(), moduleRef);
  assert.equal(await loadModule(), moduleRef);
  assert.equal(loadCount, 1);

  const calls = [];
  const appDocument = { id: 'document' };
  const actionMaps = { clickActions: {} };
  assert.equal(bindAppDeclarativeActions({
    appDocument,
    actionMapOptions: { id: 'actions' },
    createAppActionMaps: (options) => {
      calls.push(['maps', options]);
      return actionMaps;
    },
    bindDeclarativeActions: (root, maps) => {
      calls.push(['bind', root, maps]);
      return 'cleanup';
    },
  }), 'cleanup');
  assert.deepEqual(calls, [
    ['maps', { id: 'actions' }],
    ['bind', appDocument, actionMaps],
  ]);
});

test('initializes and bootstraps app runtime through injected browser services', () => {
  const calls = [];
  const listeners = new Map();
  const appState = {
    renderer: { id: 'renderer' },
    selectedMesh: { id: 'selected' },
  };
  const propColor = { value: '#123456' };
  const appDocument = {
    readyState: 'loading',
    getElementById: (id) => (id === 'prop-color' ? propColor : null),
    addEventListener: (eventName, handler) => listeners.set(eventName, handler),
  };
  const appWindow = {
    addEventListener: (eventName, handler) => calls.push(['window', eventName, handler.name || 'anonymous']),
  };
  const onKeyDown = function onKeyDownHandler() {};
  const responsive = function responsivePanels() {
    calls.push(['responsive']);
  };
  const actionMapOptions = { id: 'action-options' };

  initializeAppRuntime({
    appDocument,
    appWindow,
    appState,
    initScene: () => calls.push(['scene']),
    initI18n: () => calls.push(['i18n']),
    configureAppCrossModuleHooks: (hooks) => calls.push(['hooks', hooks]),
    crossModuleHooks: { id: 'hooks' },
    applyResponsivePanelDefaults: responsive,
    bindCanvasSelectionEvents: (options) => calls.push(['canvas', options]),
    canvasSelectionOptions: { onMouseDown: 'mouse', onDoubleClick: 'double' },
    onKeyDown,
    setupTemplateListDom: (options) => calls.push(['templates', options]),
    templateListOptions: { id: 'templates' },
    setupTextureDropZoneDom: (options) => calls.push(['drop', options]),
    textureDropZoneOptions: { id: 'drop' },
    setupPaletteColorInput: (options) => {
      calls.push(['palette', options.hasSelectedMesh(), options.updateColorFromPanel]);
    },
    paletteColorInputOptions: { updateColorFromPanel: 'update-color' },
    bindDeclarativeActions: (root, maps) => calls.push(['bind', root, maps]),
    createAppActionMaps: (options) => {
      calls.push(['maps', options]);
      return { id: 'maps' };
    },
    actionMapOptions,
    startAnimationTimelineLoop: () => calls.push(['timeline']),
    syncColorPickers: (value) => calls.push(['sync', value]),
  });

  assert.deepEqual(calls, [
    ['scene'],
    ['i18n'],
    ['hooks', { id: 'hooks' }],
    ['responsive'],
    ['canvas', { renderer: appState.renderer, onMouseDown: 'mouse', onDoubleClick: 'double' }],
    ['window', 'keydown', 'onKeyDownHandler'],
    ['window', 'resize', 'responsivePanels'],
    ['templates', { id: 'templates' }],
    ['drop', { id: 'drop' }],
    ['palette', appState.selectedMesh, 'update-color'],
    ['maps', actionMapOptions],
    ['bind', appDocument, { id: 'maps' }],
    ['timeline'],
    ['sync', '#123456'],
  ]);

  let initialized = 0;
  bootstrapAppRuntime({
    appDocument,
    initializeApp: () => {
      initialized += 1;
    },
  });
  assert.equal(initialized, 0);
  listeners.get('DOMContentLoaded')();
  assert.equal(initialized, 1);

  const readyDocument = { readyState: 'complete', addEventListener: () => {} };
  bootstrapAppRuntime({
    appDocument: readyDocument,
    initializeApp: () => {
      initialized += 1;
    },
  });
  assert.equal(initialized, 2);
});

test('creates app action maps with injected commands and lazy feature loaders', async () => {
  const calls = [];
  const appActionState = { selectedMesh: null };
  const selectedMeshRef = { name: 'selected-mesh' };
  const textureEditor = Object.fromEntries([
    'buildPaletteUI',
    'openTextureEditor',
    'setTool',
    'setBrushSize',
    'setBrushColor',
    'selectFace',
    'setFaceUV',
    'texUpdateUV',
  ].map((methodName) => [
    methodName,
    (...args) => calls.push(['texture', methodName, ...args]),
  ]));
  const deps = new Proxy({
    loadTextureEditorModule: async () => textureEditor,
    loadExportModule: async () => ({
      exportGLB: async () => calls.push(['exportGLB']),
    }),
    getAppActionState: () => appActionState,
    setColor: (mesh, color) => calls.push(['setColor', mesh, color]),
    getRandomRetroColor: () => '#123456',
    getMultiColorValue: () => '#abcdef',
  }, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      return (...args) => calls.push([String(prop), ...args]);
    },
  });

  const {
    clickActions,
    changeActions,
    inputActions,
  } = createAppActionMaps(deps);

  clickActions.addPrimitive({ dataset: { primitive: 'cube' } });
  clickActions.quickColor({ dataset: { color: '#ffcc00' } });
  clickActions.randomRetroColor();
  appActionState.selectedMesh = selectedMeshRef;
  clickActions.randomRetroColor();
  clickActions.applyColorToAll();
  changeActions.importSceneJSON(null, { type: 'change' });
  changeActions.updateColor({ value: '#111111' });
  inputActions.updateName({ value: 'Hero' });

  await clickActions.openTextureEditor();
  await clickActions.exportGLB();
  await clickActions.texSetTool({ dataset: { tool: 'brush' } });
  await clickActions.texSetSize({ dataset: { size: '8' } });
  await changeActions.texSetColor({ value: '#222222' });
  await changeActions.texSelectFace({ value: 'front' });
  await inputActions.texSetFaceUV({ dataset: { field: 'u' }, value: '0.25' });
  await inputActions.texUpdateUV();

  assert.deepEqual(calls, [
    ['addPrimitiveAndRefresh', 'cube'],
    ['quickColor', '#ffcc00'],
    ['setColor', selectedMeshRef, '#123456'],
    ['applyColorToAll', '#abcdef'],
    ['importSceneJSON', { type: 'change' }],
    ['updateColorFromPanel', '#111111'],
    ['updateNameAndRefresh', 'Hero'],
    ['texture', 'buildPaletteUI'],
    ['texture', 'openTextureEditor'],
    ['exportGLB'],
    ['texture', 'setTool', 'brush'],
    ['texture', 'setBrushSize', 8],
    ['texture', 'setBrushColor', '#222222'],
    ['texture', 'selectFace', 'front'],
    ['texture', 'setFaceUV', 'u', '0.25'],
    ['texture', 'texUpdateUV'],
  ]);

  const explicitStateGetter = createAppActionRuntimeStateGetter({
    getAppActionState: () => ({ selectedMesh: null }),
    getSelectedMesh: () => 'legacy-selected',
  });
  assert.deepEqual(explicitStateGetter(), {
    appActionState: { selectedMesh: null },
    selectedMesh: null,
  });

  const legacyStateGetter = createAppActionRuntimeStateGetter({
    getSelectedMesh: () => 'legacy-selected',
  });
  assert.deepEqual(legacyStateGetter(), {
    appActionState: {},
    selectedMesh: 'legacy-selected',
  });
});

test('coordinates app chrome refresh actions with injected dependencies', async () => {
  const calls = [];
  const deferred = [];
  const actions = createAppChromeActions({
    defer: (callback, delay) => deferred.push([callback, delay]),
    refreshObjectList: () => calls.push(['refreshObjectList']),
    refreshSceneObjectList: () => calls.push(['refreshSceneObjectList']),
    updateExportButtonText: () => calls.push(['updateExportButtonText']),
    updateSelectedOverlay: () => calls.push(['updateSelectedOverlay']),
    addPrimitive: (...args) => calls.push(['addPrimitive', ...args]),
    addTemplate: (...args) => calls.push(['addTemplate', ...args]),
    loadFromLocalStorage: () => calls.push(['loadFromLocalStorage']),
    importSceneJSONFile: (file) => calls.push(['importSceneJSONFile', file.name]),
    handleImportSubmit: () => calls.push(['handleImportSubmit']),
    handleImportFile: async (event) => calls.push(['handleImportFile', event.type]),
    updateName: (value) => calls.push(['updateName', value]),
    duplicateSelected: () => calls.push(['duplicateSelected']),
    deleteSelected: () => calls.push(['deleteSelected']),
    resetScene: () => calls.push(['resetScene']),
    groupSelected: () => calls.push(['groupSelected']),
    ungroupSelected: () => calls.push(['ungroupSelected']),
  });

  actions.refreshSceneChrome();
  actions.refreshSelectionChrome();
  assert.deepEqual(calls.splice(0), [
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['updateExportButtonText'],
    ['updateSelectedOverlay'],
    ['refreshObjectList'],
  ]);

  actions.refreshAfterSelectionEvent();
  actions.loadSceneAndRefresh();
  actions.importSceneJSON({ target: { files: [] } });
  actions.importSceneJSON({ target: { files: [{ name: 'scene.json' }] } });
  assert.deepEqual(calls.splice(0), [
    ['loadFromLocalStorage'],
    ['importSceneJSONFile', 'scene.json'],
  ]);
  assert.equal(deferred.length, 3);
  assert.equal(deferred[0][1], 0);
  assert.equal(deferred[1][1], 0);
  assert.equal(deferred[2][1], 100);
  deferred.splice(0).forEach(([callback]) => callback());
  assert.deepEqual(calls.splice(0), [
    ['updateExportButtonText'],
    ['updateSelectedOverlay'],
    ['refreshObjectList'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
  ]);

  actions.addPrimitiveAndRefresh('cube');
  actions.addTemplateAndRefresh('robot');
  actions.handleImportSubmitAndRefresh();
  await actions.handleImportFileAndRefresh({ type: 'change' });
  actions.updateNameAndRefresh('Hero');
  actions.duplicateSelectedAndRefresh();
  actions.deleteSelectedAndRefresh();
  actions.resetSceneAndRefresh();
  actions.groupSelectedAndRefresh();
  actions.ungroupSelectedAndRefresh();

  assert.deepEqual(calls, [
    ['addPrimitive', 'cube'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['addTemplate', 'robot'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['handleImportSubmit'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['handleImportFile', 'change'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['updateName', 'Hero'],
    ['updateSelectedOverlay'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['duplicateSelected'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['deleteSelected'],
    ['refreshObjectList'],
    ['updateSelectedOverlay'],
    ['refreshSceneObjectList'],
    ['resetScene'],
    ['refreshObjectList'],
    ['updateSelectedOverlay'],
    ['refreshSceneObjectList'],
    ['groupSelected'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
    ['ungroupSelected'],
    ['refreshObjectList'],
    ['refreshSceneObjectList'],
  ]);
});

test('configures app cross-module hooks with injected browser adapters', () => {
  const calls = [];
  const root = { activeElement: { id: 'first-input' } };
  const stateRef = {
    animationMode: false,
    transformControls: {
      setMode: (mode) => calls.push(['setMode', mode]),
    },
  };
  const selectMeshRef = () => {};
  const deselectRef = () => {};
  const deselectAllRef = () => {};
  const pushActionRef = () => {};
  const showToastRef = () => {};
  const cloneTextureRef = () => {};
  const configureUndoFeedbackRef = (options) => {
    undoFeedback = options;
  };
  const translateRef = () => {};
  const attachBoneRef = () => {};
  const showTimelineForGroupRef = () => {};
  const isImportModalOpenRef = () => false;
  const undoRef = () => {};
  const redoRef = () => {};
  const duplicateSelectedRef = () => {};
  const deleteSelectedRef = () => {};
  const groupSelectedRef = () => {};
  const ungroupSelectedRef = () => {};
  const toggleAnimPlayPauseRef = () => {};
  const exitAnimationModeRef = () => {};
  const closeImportModalRef = () => {};
  const refreshSceneObjectListRef = () => {};
  let actionContext = null;
  let selectionHooks = null;
  let shortcutHooks = null;
  let importHooks = null;
  let uiHooks = null;
  let undoFeedback = null;

  configureAppCrossModuleHooks({
    root,
    state: stateRef,
    configureActionContext: (context) => {
      actionContext = context;
    },
    configureSelectionHooks: (hooks) => {
      selectionHooks = hooks;
    },
    configureShortcutHooks: (hooks) => {
      shortcutHooks = hooks;
    },
    configureImportHooks: (hooks) => {
      importHooks = hooks;
    },
    configureUIHooks: (hooks) => {
      uiHooks = hooks;
    },
    selectMesh: selectMeshRef,
    deselect: deselectRef,
    deselectAll: deselectAllRef,
    pushAction: pushActionRef,
    showToast: showToastRef,
    cloneTexture: cloneTextureRef,
    configureUndoFeedback: configureUndoFeedbackRef,
    t: translateRef,
    attachBone: attachBoneRef,
    showTimelineForGroup: showTimelineForGroupRef,
    isImportModalOpen: isImportModalOpenRef,
    undo: undoRef,
    redo: redoRef,
    duplicateSelected: duplicateSelectedRef,
    deleteSelected: deleteSelectedRef,
    groupSelected: groupSelectedRef,
    ungroupSelected: ungroupSelectedRef,
    toggleAnimPlayPause: toggleAnimPlayPauseRef,
    exitAnimationMode: exitAnimationModeRef,
    closeImportModal: closeImportModalRef,
    refreshSceneObjectList: refreshSceneObjectListRef,
  });

  assert.equal(actionContext.state, stateRef);
  assert.equal(actionContext.getActionState(), stateRef);
  assert.equal(actionContext.selectMesh, selectMeshRef);
  assert.equal(actionContext.deselect, deselectRef);
  assert.equal(actionContext.deselectAll, deselectAllRef);
  assert.equal(actionContext.pushAction, pushActionRef);
  assert.equal(actionContext.showToast, showToastRef);
  assert.equal(actionContext.cloneTexture, cloneTextureRef);
  assert.equal(actionContext.t, translateRef);
  assert.deepEqual(undoFeedback, {
    showToast: showToastRef,
  });
  assert.deepEqual(selectionHooks, {
    attachBone: attachBoneRef,
    showTimelineForGroup: showTimelineForGroupRef,
  });
  assert.equal(shortcutHooks.getActiveElement(), root.activeElement);
  root.activeElement = { id: 'second-input' };
  assert.equal(shortcutHooks.getActiveElement(), root.activeElement);
  assert.equal(shortcutHooks.isAnimationMode(), false);
  stateRef.animationMode = true;
  assert.equal(shortcutHooks.isAnimationMode(), true);
  assert.equal(shortcutHooks.isImportModalOpen, isImportModalOpenRef);
  assert.equal(shortcutHooks.undo, undoRef);
  assert.equal(shortcutHooks.redo, redoRef);
  assert.equal(shortcutHooks.duplicateSelected, duplicateSelectedRef);
  assert.equal(shortcutHooks.deleteSelected, deleteSelectedRef);
  assert.equal(shortcutHooks.groupSelected, groupSelectedRef);
  assert.equal(shortcutHooks.ungroupSelected, ungroupSelectedRef);
  assert.equal(shortcutHooks.toggleAnimPlayPause, toggleAnimPlayPauseRef);
  assert.equal(shortcutHooks.exitAnimationMode, exitAnimationModeRef);
  assert.equal(shortcutHooks.closeImportModal, closeImportModalRef);
  shortcutHooks.setTransformMode('rotate');
  stateRef.transformControls = null;
  shortcutHooks.setTransformMode('scale');
  assert.deepEqual(calls, [['setMode', 'rotate']]);
  assert.deepEqual(importHooks, {
    showTimelineForGroup: showTimelineForGroupRef,
  });
  assert.deepEqual(uiHooks, {
    refreshSceneObjectList: refreshSceneObjectListRef,
  });
});

test('sets up app DOM adapters for canvas template texture and color inputs', () => {
  function createElement() {
    const listeners = new Map();
    return {
      listeners,
      addEventListener: (eventName, handler) => listeners.set(eventName, handler),
      removeEventListener: (eventName, handler) => {
        if (listeners.get(eventName) === handler) listeners.delete(eventName);
      },
    };
  }

  const canvas = createElement();
  const calls = [];
  const cleanupCanvas = bindCanvasSelectionEvents({
    renderer: { domElement: canvas },
    onMouseDown: (event) => calls.push(['down', event.type]),
    onDoubleClick: (event) => calls.push(['double', event.type]),
    onAfterSelectionEvent: (event) => calls.push(['after', event.type]),
  });
  canvas.listeners.get('mousedown')({ type: 'mousedown' });
  canvas.listeners.get('dblclick')({ type: 'dblclick' });
  assert.deepEqual(calls.splice(0), [
    ['down', 'mousedown'],
    ['after', 'mousedown'],
    ['double', 'dblclick'],
    ['after', 'dblclick'],
  ]);
  cleanupCanvas();
  assert.equal(canvas.listeners.size, 0);
  assert.equal(bindCanvasSelectionEvents({ renderer: null })(), undefined);

  const templateList = {};
  const texDropZone = {};
  const palettePicker = createElement();
  const multiColorPicker = { value: '#123456' };
  const root = {
    getElementById: (id) => ({
      'template-list': templateList,
      'texture-drop-zone': texDropZone,
      'palette-color-picker': palettePicker,
      'multi-color-picker': multiColorPicker,
    }[id] || null),
  };
  let langCallback = null;
  assert.equal(setupTemplateListDom({
    root,
    onLangChange: (callback) => {
      langCallback = callback;
    },
    renderTemplateList: (target) => calls.push(['template', target]),
  }), true);
  langCallback();
  assert.deepEqual(calls.splice(0), [
    ['template', templateList],
    ['template', templateList],
  ]);
  assert.equal(setupTemplateListDom({
    root: { getElementById: () => null },
    onLangChange: () => calls.push(['unexpected-lang']),
    renderTemplateList: () => calls.push(['unexpected-render']),
  }), false);
  assert.equal(setupTemplateListDom({
    root: null,
    onLangChange: () => calls.push(['unexpected-null-lang']),
    renderTemplateList: () => calls.push(['unexpected-null-render']),
  }), false);

  assert.equal(setupTextureDropZoneDom({
    root,
    setupTextureDragDrop: (target) => calls.push(['dropzone', target]),
  }), true);
  assert.deepEqual(calls.splice(0), [['dropzone', texDropZone]]);
  assert.equal(setupTextureDropZoneDom({
    root: { getElementById: () => null },
    setupTextureDragDrop: () => calls.push(['unexpected-dropzone']),
  }), false);
  assert.equal(setupTextureDropZoneDom({ root: null }), false);

  let selected = false;
  const cleanupPalette = setupPaletteColorInput({
    root,
    hasSelectedMesh: () => selected,
    updateColorFromPanel: (value) => calls.push(['color', value]),
  });
  palettePicker.listeners.get('input')({ target: { value: '#111111' } });
  selected = true;
  palettePicker.listeners.get('input')({ target: { value: '#222222' } });
  assert.deepEqual(calls.splice(0), [['color', '#222222']]);
  cleanupPalette();
  assert.equal(palettePicker.listeners.size, 0);
  assert.equal(setupPaletteColorInput({
    root: { getElementById: () => null },
    hasSelectedMesh: () => true,
    updateColorFromPanel: () => calls.push(['unexpected-color']),
  })(), undefined);
  assert.equal(setupPaletteColorInput({ root: null })(), undefined);

  assert.equal(getMultiColorValue(root), '#123456');
  assert.equal(getMultiColorValue({ getElementById: () => null }, '#abcdef'), '#abcdef');
  assert.equal(getMultiColorValue(null, '#fedcba'), '#fedcba');

  const appDomSetup = createAppDomSetupAdapter({ root, defaultColor: '#999999' });
  assert.equal(appDomSetup.getMultiColorValue(), '#123456');
  assert.equal(appDomSetup.setupTemplateList({
    onLangChange: (callback) => {
      langCallback = callback;
    },
    renderTemplateList: (target) => calls.push(['adapter-template', target]),
  }), true);
  assert.equal(appDomSetup.setupTextureDropZone({
    setupTextureDragDrop: (target) => calls.push(['adapter-dropzone', target]),
  }), true);
  const adapterCleanupPalette = appDomSetup.setupPaletteColorInput({
    hasSelectedMesh: () => true,
    updateColorFromPanel: (value) => calls.push(['adapter-color', value]),
  });
  palettePicker.listeners.get('input')({ target: { value: '#333333' } });
  adapterCleanupPalette();
  assert.deepEqual(calls.splice(0), [
    ['adapter-template', templateList],
    ['adapter-dropzone', texDropZone],
    ['adapter-color', '#333333'],
  ]);
});

test('routes keyboard shortcuts through injected context', () => {
  const calls = [];
  const createEvent = (key, options = {}) => {
    let prevented = false;
    return {
      key,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      ...options,
      preventDefault: () => { prevented = true; },
      get defaultPrevented() { return prevented; },
    };
  };

  configureShortcutHooks({
    getActiveElement: () => null,
    undo: () => calls.push('undo'),
    redo: () => calls.push('redo'),
    duplicateSelected: () => calls.push('duplicate'),
    deleteSelected: () => calls.push('delete'),
    groupSelected: () => calls.push('group'),
    ungroupSelected: () => calls.push('ungroup'),
    setTransformMode: (mode) => calls.push(`mode:${mode}`),
    toggleAnimPlayPause: () => calls.push('togglePlay'),
    isAnimationMode: () => false,
    isImportModalOpen: () => true,
    closeImportModal: () => calls.push('closeModal'),
  });

  try {
    const undoEvent = createEvent('z', { ctrlKey: true });
    onKeyDown(undoEvent);
    assert.equal(undoEvent.defaultPrevented, true);
    assert.equal(calls.pop(), 'undo');

    onKeyDown(createEvent('z', { ctrlKey: true, shiftKey: true }));
    assert.equal(calls.pop(), 'redo');

    onKeyDown(createEvent('w'));
    assert.equal(calls.pop(), 'mode:translate');

    onKeyDown(createEvent('Delete'));
    assert.equal(calls.pop(), 'delete');

    const playEvent = createEvent(' ');
    onKeyDown(playEvent);
    assert.equal(playEvent.defaultPrevented, true);
    assert.equal(calls.pop(), 'togglePlay');

    onKeyDown(createEvent('Escape'));
    assert.equal(calls.pop(), 'closeModal');

    configureShortcutHooks({
      getActiveElement: () => ({ tagName: 'INPUT' }),
    });
    onKeyDown(createEvent('d', { ctrlKey: true }));
    assert.equal(calls.includes('duplicate'), false);
  } finally {
    resetShortcutHooks();
  }
});

test('shortcut controller does not depend on browser document defaults', () => {
  const calls = [];
  const createEvent = (key, options = {}) => {
    let prevented = false;
    return {
      key,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      ...options,
      preventDefault: () => { prevented = true; },
      get defaultPrevented() { return prevented; },
    };
  };
  const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    get() {
      throw new Error('shortcut controller should not read document');
    },
  });

  try {
    const controller = createShortcutController({
      initialHooks: {
        duplicateSelected: () => calls.push('duplicate'),
      },
    });

    const duplicateEvent = createEvent('d', { ctrlKey: true });
    controller.onKeyDown(duplicateEvent);
    assert.equal(duplicateEvent.defaultPrevented, true);
    assert.deepEqual(calls, ['duplicate']);

    controller.configureShortcutHooks({
      getActiveElement: () => ({ tagName: 'textarea' }),
    });
    const blockedEvent = createEvent('d', { ctrlKey: true });
    controller.onKeyDown(blockedEvent);
    assert.equal(blockedEvent.defaultPrevented, false);
    assert.deepEqual(calls, ['duplicate']);
  } finally {
    if (originalDocumentDescriptor) {
      Object.defineProperty(globalThis, 'document', originalDocumentDescriptor);
    } else {
      delete globalThis.document;
    }
  }
});

test('highlights and restores selected mesh emissive color', () => {
  const originalEmissive = new Map();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00', emissive: '#112233' })
  );

  highlightSelection(mesh, originalEmissive);
  assert.equal(originalEmissive.has(mesh.uuid), true);
  assert.equal(mesh.material.emissive.getHex(), 0x4488ff);
  assert.equal(mesh.material.emissiveIntensity, 0.4);

  unhighlightSelection(mesh, originalEmissive);
  assert.equal(originalEmissive.has(mesh.uuid), false);
  assert.equal(mesh.material.emissive.getHex(), 0x112233);
  assert.equal(mesh.material.emissiveIntensity, 0);
});

test('resolves selection raycast targets across pivots and root groups', () => {
  const root = new THREE.Group();
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );

  pivot.userData.isPivot = true;
  pivot.add(mesh);
  group.add(pivot);
  root.add(group);

  assert.equal(getSelectionTargetFromIntersections([{ object: mesh }]), pivot);
  assert.equal(findRootSelectionTarget(pivot, root), group);
  assert.equal(findRootSelectionTarget(group, root), null);
});

test('decides mouse selection actions without mutating editor state', () => {
  const mesh = { userData: {} };
  const pivot = { userData: { isPivot: true } };
  const otherPivot = { userData: { isPivot: true } };

  assert.deepEqual(decideMouseSelection({
    mesh,
    ctrlKey: true,
    selectedMeshes: new Set(),
  }), { type: 'add-to-multi', mesh });

  assert.deepEqual(decideMouseSelection({
    mesh,
    metaKey: true,
    selectedMeshes: new Set([mesh]),
  }), { type: 'remove-from-multi', mesh });

  assert.deepEqual(decideMouseSelection({
    mesh,
    ctrlKey: true,
    animationMode: true,
  }), { type: 'ignore' });

  assert.deepEqual(decideMouseSelection({
    pivotFromBone: otherPivot,
    shiftKey: true,
    bonesVisible: true,
    selectedMesh: pivot,
  }), { type: 'attach-bone', pivot: otherPivot });

  assert.deepEqual(decideMouseSelection({
    pivotFromBone: pivot,
    bonesVisible: true,
    selectedMesh: pivot,
  }), { type: 'select', mesh: pivot });

  assert.deepEqual(decideMouseSelection({ mesh }), { type: 'select', mesh });
  assert.deepEqual(decideMouseSelection({}), { type: 'deselect' });
  assert.deepEqual(decideMouseSelection({ isDragging: true, mesh }), { type: 'ignore' });
});

test('decides double-click selection from root targets', () => {
  const rootTarget = { userData: { name: 'ROOT' } };
  assert.deepEqual(decideDoubleClickSelection(rootTarget), { type: 'select', mesh: rootTarget });
  assert.deepEqual(decideDoubleClickSelection(null), { type: 'ignore' });
});

test('coordinates mouse selection pointer flow with bone gating', () => {
  const mesh = { userData: { name: 'MESH' } };
  const selectedPivot = { userData: { isPivot: true } };
  const bonePivot = { userData: { isPivot: true } };
  const raycaster = {};
  const event = {
    clientX: 10,
    clientY: 20,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
  };
  const selectionState = {
    transformControls: { dragging: false },
    camera: 'camera',
    renderer: { domElement: 'canvas' },
    userObjects: 'objects',
    animationMode: false,
    bonesVisible: true,
    selectedMesh: selectedPivot,
    selectedMeshes: new Set(),
  };
  const calls = [];
  const dependencies = {
    selectionState,
    raycaster,
    updatePointer: (targetRaycaster, targetEvent, camera, domElement) => {
      calls.push(['update-pointer', targetRaycaster, targetEvent, camera, domElement]);
    },
    pickTarget: () => mesh,
    raycastBones: () => {
      calls.push(['raycast-bones']);
      return bonePivot;
    },
  };

  assert.deepEqual(getMouseSelectionDecision(event, dependencies), { type: 'add-to-multi', mesh });
  assert.deepEqual(calls, [['update-pointer', raycaster, event, 'camera', 'canvas']]);
  assert.equal(getBoneSelectionTarget({
    event,
    selectionState,
    raycaster,
    raycastBones: () => bonePivot,
  }), null);

  const boneEvent = { ...event, ctrlKey: false, shiftKey: true };
  assert.deepEqual(getMouseSelectionDecision(boneEvent, dependencies), { type: 'attach-bone', pivot: bonePivot });
  assert.deepEqual(calls.slice(1), [
    ['update-pointer', raycaster, boneEvent, 'camera', 'canvas'],
    ['raycast-bones'],
  ]);

  const handlers = { attachBone: () => {} };
  assert.equal(executeMouseSelectionEvent(boneEvent, {
    ...dependencies,
    handlers,
    executeDecision: (decision, targetHandlers) => {
      calls.push(['execute-mouse', decision, targetHandlers === handlers]);
      return true;
    },
  }), true);

  assert.deepEqual(getMouseSelectionDecision(boneEvent, {
    ...dependencies,
    selectionState: { ...selectionState, transformControls: { dragging: true } },
  }), { type: 'ignore' });

  assert.deepEqual(calls.slice(3), [
    ['update-pointer', raycaster, boneEvent, 'camera', 'canvas'],
    ['raycast-bones'],
    ['execute-mouse', { type: 'attach-bone', pivot: bonePivot }, true],
  ]);
});

test('coordinates double-click selection pointer flow and execution', () => {
  const mesh = { userData: { name: 'CHILD' } };
  const rootTarget = { userData: { name: 'ROOT' } };
  const event = { clientX: 1, clientY: 2 };
  const selectionState = {
    camera: 'camera',
    renderer: { domElement: 'canvas' },
    userObjects: 'objects',
  };
  const calls = [];
  const handlers = { selectMesh: () => {} };
  const options = {
    selectionState,
    raycaster: 'raycaster',
    updatePointer: (...args) => calls.push(['update-pointer', ...args]),
    pickTarget: () => mesh,
    findRootTarget: (target, root) => {
      calls.push(['find-root', target, root]);
      return rootTarget;
    },
  };

  assert.deepEqual(getDoubleClickSelectionDecision(event, options), { type: 'select', mesh: rootTarget });
  assert.equal(executeDoubleClickSelectionEvent(event, {
    ...options,
    handlers,
    executeDecision: (decision, targetHandlers) => {
      calls.push(['execute', decision, targetHandlers === handlers]);
      return true;
    },
  }), true);
  assert.deepEqual(calls, [
    ['update-pointer', 'raycaster', event, 'camera', 'canvas'],
    ['find-root', mesh, 'objects'],
    ['update-pointer', 'raycaster', event, 'camera', 'canvas'],
    ['find-root', mesh, 'objects'],
    ['execute', { type: 'select', mesh: rootTarget }, true],
  ]);
});

test('executes selection decisions through injected handlers', () => {
  const mesh = { userData: { name: 'MESH' } };
  const pivot = { userData: { name: 'PIVOT' } };
  const calls = [];
  const handlers = {
    addToMultiSelection: (target) => calls.push(['add', target]),
    removeFromMultiSelection: (target) => calls.push(['remove', target]),
    updateSelectionUI: () => calls.push(['update-ui']),
    attachBone: (target) => calls.push(['attach-bone', target]),
    deselectAll: () => calls.push(['deselect-all']),
    selectMesh: (target) => calls.push(['select', target]),
  };

  assert.equal(executeSelectionDecision({ type: 'add-to-multi', mesh }, handlers), true);
  assert.equal(executeSelectionDecision({ type: 'remove-from-multi', mesh }, handlers), true);
  assert.equal(executeSelectionDecision({ type: 'attach-bone', pivot }, handlers), true);
  assert.equal(executeSelectionDecision({ type: 'select', mesh }, handlers), true);
  assert.equal(executeSelectionDecision({ type: 'deselect' }, handlers), true);
  assert.equal(executeSelectionDecision({ type: 'ignore' }, handlers), false);

  assert.deepEqual(calls, [
    ['add', mesh],
    ['update-ui'],
    ['remove', mesh],
    ['update-ui'],
    ['attach-bone', pivot],
    ['deselect-all'],
    ['select', mesh],
    ['deselect-all'],
  ]);
});

test('updates selection DOM header state', () => {
  const elements = new Map();
  const createElement = (classes = []) => {
    const classSet = new Set(classes);
    return {
      textContent: '',
      classList: {
        add: (name) => classSet.add(name),
        remove: (name) => classSet.delete(name),
        contains: (name) => classSet.has(name),
      },
    };
  };

  elements.set('scene-info-view', createElement());
  elements.set('properties-panel', createElement(['hidden']));
  elements.set('selected-name', createElement());
  elements.set('animation-timeline', createElement());

  const root = {
    getElementById: (id) => elements.get(id) || null,
  };
  const adapter = createSelectionDomAdapter({ root });

  showSingleSelectionHeader('BODY', root);
  assert.equal(elements.get('scene-info-view').classList.contains('hidden'), true);
  assert.equal(elements.get('properties-panel').classList.contains('hidden'), false);
  assert.equal(elements.get('selected-name').textContent, 'BODY');

  showMultiSelectionHeader('3 objects', root);
  assert.equal(elements.get('selected-name').textContent, '3 objects');

  hideAnimationTimeline(root);
  assert.equal(elements.get('animation-timeline').classList.contains('hidden'), true);

  adapter.showSingleSelectionHeader('');
  assert.equal(elements.get('selected-name').textContent, 'Mesh');
  adapter.showMultiSelectionHeader('adapter multi');
  assert.equal(elements.get('selected-name').textContent, 'adapter multi');
});

test('mutates single selection state through adapters', () => {
  const mesh = new THREE.Group();
  const stateLike = {
    selectedMesh: null,
    selectedMeshes: new Set(),
    originalEmissive: new Map(),
  };
  const calls = [];
  const adapters = {
    attachTransformControls: (selected) => calls.push(['attach', selected]),
    detachTransformControls: () => calls.push(['detach']),
    highlightSelection: (selected, originalEmissive) => calls.push(['highlight', selected, originalEmissive]),
    unhighlightSelection: (selected, originalEmissive) => calls.push(['unhighlight', selected, originalEmissive]),
  };

  setSingleSelection(stateLike, mesh, adapters);
  assert.equal(stateLike.selectedMesh, mesh);
  assert.deepEqual(calls.slice(0, 2), [
    ['attach', mesh],
    ['highlight', mesh, stateLike.originalEmissive],
  ]);

  const cleared = clearSingleSelection(stateLike, adapters);
  assert.equal(cleared, mesh);
  assert.equal(stateLike.selectedMesh, null);
  assert.deepEqual(calls.slice(2), [
    ['unhighlight', mesh, stateLike.originalEmissive],
    ['detach'],
  ]);
});

test('promotes and clears multi-selection state through adapters', () => {
  const first = new THREE.Group();
  const second = new THREE.Group();
  const third = new THREE.Group();
  const stateLike = {
    selectedMesh: first,
    selectedMeshes: new Set(),
    originalEmissive: new Map(),
  };
  const calls = [];
  const adapters = {
    detachTransformControls: () => calls.push(['detach']),
    highlightSelection: (selected) => calls.push(['highlight', selected]),
    unhighlightSelection: (selected) => calls.push(['unhighlight', selected]),
  };

  assert.equal(addMeshToMultiSelection(stateLike, second, adapters), 2);
  assert.equal(stateLike.selectedMesh, null);
  assert.deepEqual([...stateLike.selectedMeshes], [first, second]);
  assert.deepEqual(calls, [['detach'], ['highlight', second]]);

  stateLike.selectedMeshes.add(third);
  const removal = removeMeshFromMultiSelection(stateLike, second, adapters);
  assert.equal(removal.removed, true);
  assert.equal(removal.size, 2);
  assert.equal(removal.remaining, null);

  const cleared = clearMultiSelection(stateLike, adapters);
  assert.deepEqual(cleared, [first, third]);
  assert.equal(stateLike.selectedMeshes.size, 0);
  assert.deepEqual(calls.slice(2), [
    ['unhighlight', second],
    ['unhighlight', first],
    ['unhighlight', third],
  ]);
});

test('coordinates selection UI feedback through injected adapters', () => {
  const mesh = new THREE.Group();
  mesh.userData.name = 'BODY';
  const calls = [];

  assert.equal(showSingleSelectionFeedback(mesh, {
    showSingleSelectionHeader: (name) => calls.push(['single-header', name]),
    updatePropertiesPanel: () => calls.push(['properties']),
    updateExportButtonText: () => calls.push(['export']),
    showTimelineForGroup: (target) => calls.push(['timeline', target]),
  }), true);

  assert.equal(clearSelectionFeedback({
    clearPropertiesPanel: () => calls.push(['clear-properties']),
  }), true);

  assert.equal(clearAllSelectionFeedback({
    animationMode: false,
    clearPropertiesPanel: () => calls.push(['clear-all-properties']),
    updateExportButtonText: () => calls.push(['export-clear']),
    hideAnimationTimeline: () => calls.push(['hide-timeline']),
  }), true);

  assert.equal(clearAllSelectionFeedback({
    animationMode: true,
    clearPropertiesPanel: () => calls.push(['clear-animation-mode']),
    updateExportButtonText: () => calls.push(['export-animation-mode']),
    hideAnimationTimeline: () => calls.push(['should-not-hide']),
  }), true);

  assert.deepEqual(calls, [
    ['single-header', 'BODY'],
    ['properties'],
    ['export'],
    ['timeline', mesh],
    ['clear-properties'],
    ['clear-all-properties'],
    ['export-clear'],
    ['hide-timeline'],
    ['clear-animation-mode'],
    ['export-animation-mode'],
  ]);
});

test('coordinates multi-selection feedback and promotion', () => {
  const first = new THREE.Group();
  const second = new THREE.Group();
  const stateLike = {
    selectedMeshes: new Set([first, second]),
  };
  const calls = [];

  assert.deepEqual(syncMultiSelectionFeedback(stateLike, {
    translate: (_key, params) => `${params.n} selected`,
    showMultiSelectionHeader: (label) => calls.push(['multi-header', label]),
    showMultiSelectionPanel: () => calls.push(['multi-panel']),
    selectMesh: (mesh) => calls.push(['select', mesh]),
  }), { type: 'multi', count: 2 });

  stateLike.selectedMeshes = new Set([first]);
  assert.deepEqual(syncMultiSelectionFeedback(stateLike, {
    selectMesh: (mesh) => calls.push(['select', mesh]),
  }), { type: 'single', mesh: first });
  assert.equal(stateLike.selectedMeshes.size, 0);

  assert.deepEqual(syncMultiRemovalFeedback({ remaining: second, size: 1 }, stateLike, {
    selectMesh: (mesh) => calls.push(['select-after-remove', mesh]),
  }), { type: 'single', mesh: second });
  assert.equal(stateLike.selectedMeshes.size, 0);

  assert.deepEqual(syncMultiRemovalFeedback({ remaining: null, size: 0 }, stateLike, {
    clearPropertiesPanel: () => calls.push(['clear-properties']),
  }), { type: 'empty' });

  assert.deepEqual(calls, [
    ['multi-header', '2 selected'],
    ['multi-panel'],
    ['select', first],
    ['select-after-remove', second],
    ['clear-properties'],
  ]);
});

test('coordinates selection runtime controller through injected events and UI services', () => {
  const first = new THREE.Group();
  const second = new THREE.Group();
  const bonePivot = { id: 'bone' };
  first.userData.name = 'FIRST';
  second.userData.name = 'SECOND';

  const stateLike = {
    selectedMesh: null,
    selectedMeshes: new Set(),
    originalEmissive: new Map(),
    animationMode: false,
  };
  const calls = [];
  const hooks = {
    attachBone: (pivot) => calls.push(['bone', pivot]),
    showTimelineForGroup: (mesh) => calls.push(['timeline', mesh]),
  };

  const controller = createSelectionRuntimeController({
    selectionState: stateLike,
    raycaster: 'raycaster',
    raycastBones: 'raycast-bones',
    attachTransformControls: (mesh) => calls.push(['attach', mesh]),
    detachTransformControls: () => calls.push(['detach']),
    highlightSelection: (mesh, originalEmissive) => calls.push(['highlight', mesh, originalEmissive]),
    unhighlightSelection: (mesh, originalEmissive) => calls.push(['unhighlight', mesh, originalEmissive]),
    translate: (_key, params) => `${params.n} selected`,
    hideAnimationTimeline: () => calls.push(['hide-timeline']),
    showMultiSelectionHeader: (label) => calls.push(['multi-header', label]),
    showSingleSelectionHeader: (name) => calls.push(['single-header', name]),
    updatePropertiesPanel: () => calls.push(['properties']),
    clearPropertiesPanel: () => calls.push(['clear-properties']),
    showMultiSelectionPanel: () => calls.push(['multi-panel']),
    updateExportButtonText: () => calls.push(['export']),
    getHooks: () => hooks,
    executeMouseSelection: (event, options) => {
      calls.push(['mouse', event, options.raycaster, options.raycastBones]);
      options.handlers.addToMultiSelection(second);
      options.handlers.updateSelectionUI();
      options.handlers.attachBone(bonePivot);
      return true;
    },
    executeDoubleClickSelection: (event, options) => {
      calls.push(['double', event, options.raycaster]);
      options.handlers.deselectAll();
      return true;
    },
  });

  controller.selectMesh(first);
  assert.equal(stateLike.selectedMesh, first);
  assert.deepEqual(calls.slice(0, 7), [
    ['clear-properties'],
    ['attach', first],
    ['highlight', first, stateLike.originalEmissive],
    ['single-header', 'FIRST'],
    ['properties'],
    ['export'],
    ['timeline', first],
  ]);

  assert.equal(controller.onMouseDown('mouse-event'), true);
  assert.equal(stateLike.selectedMesh, null);
  assert.deepEqual([...stateLike.selectedMeshes], [first, second]);
  assert.deepEqual(calls.slice(7), [
    ['mouse', 'mouse-event', 'raycaster', 'raycast-bones'],
    ['detach'],
    ['highlight', second, stateLike.originalEmissive],
    ['multi-header', '2 selected'],
    ['multi-panel'],
    ['bone', bonePivot],
  ]);

  assert.equal(controller.onDoubleClick('double-event'), true);
  assert.equal(stateLike.selectedMesh, null);
  assert.equal(stateLike.selectedMeshes.size, 0);
  assert.deepEqual(calls.slice(13), [
    ['double', 'double-event', 'raycaster'],
    ['unhighlight', first, stateLike.originalEmissive],
    ['unhighlight', second, stateLike.originalEmissive],
    ['clear-properties'],
    ['export'],
    ['hide-timeline'],
  ]);
});

test('coordinates selection controller hooks runtime getters raycaster and runtime facade', () => {
  const raycaster = { id: 'raycaster' };
  const raycastBones = () => {};
  const calls = [];
  const transformControls = {
    attach: (mesh) => calls.push(['attach-transform', mesh]),
    detach: () => calls.push(['detach-transform']),
  };
  const selectionState = { id: 'selection-state', transformControls };
  const dependencies = {
    highlightSelection: () => {},
    unhighlightSelection: () => {},
    translate: (key) => key,
    hideAnimationTimeline: () => {},
    showMultiSelectionHeader: () => {},
    showSingleSelectionHeader: () => {},
    updatePropertiesPanel: () => {},
    clearPropertiesPanel: () => {},
    showMultiSelectionPanel: () => {},
    updateExportButtonText: () => {},
  };
  let runtimeOptions = null;
  const runtime = {
    onMouseDown: (event) => {
      calls.push(['mouse', event, runtimeOptions.getHooks()]);
      return 'mouse-result';
    },
    onDoubleClick: (event) => {
      calls.push(['double', event, runtimeOptions.getHooks()]);
      return 'double-result';
    },
    selectMesh: (mesh) => {
      calls.push(['select', mesh, runtimeOptions.getHooks()]);
      return 'select-result';
    },
    deselect: () => {
      calls.push(['deselect', runtimeOptions.getHooks()]);
      return 'deselect-result';
    },
    deselectAll: () => {
      calls.push(['deselect-all', runtimeOptions.getHooks()]);
      return 'deselect-all-result';
    },
  };

  const controller = createSelectionController({
    getSelectionState: () => selectionState,
    raycastBones,
    ...dependencies,
    createRaycaster: () => {
      calls.push(['raycaster']);
      return raycaster;
    },
    createSelectionRuntime: (options) => {
      runtimeOptions = options;
      calls.push(['runtime', options.selectionState, options.raycaster, options.raycastBones]);
      return runtime;
    },
  });

  assert.deepEqual(calls.splice(0), [
    ['raycaster'],
    ['runtime', selectionState, raycaster, raycastBones],
  ]);
  assert.equal(runtimeOptions.attachTransformControls('mesh'), undefined);
  assert.equal(runtimeOptions.detachTransformControls(), undefined);
  assert.deepEqual(calls.splice(0), [
    ['attach-transform', 'mesh'],
    ['detach-transform'],
  ]);
  assert.equal(runtimeOptions.highlightSelection, dependencies.highlightSelection);
  assert.equal(runtimeOptions.unhighlightSelection, dependencies.unhighlightSelection);
  assert.equal(runtimeOptions.translate, dependencies.translate);
  assert.equal(runtimeOptions.hideAnimationTimeline, dependencies.hideAnimationTimeline);
  assert.equal(runtimeOptions.showMultiSelectionHeader, dependencies.showMultiSelectionHeader);
  assert.equal(runtimeOptions.showSingleSelectionHeader, dependencies.showSingleSelectionHeader);
  assert.equal(runtimeOptions.updatePropertiesPanel, dependencies.updatePropertiesPanel);
  assert.equal(runtimeOptions.clearPropertiesPanel, dependencies.clearPropertiesPanel);
  assert.equal(runtimeOptions.showMultiSelectionPanel, dependencies.showMultiSelectionPanel);
  assert.equal(runtimeOptions.updateExportButtonText, dependencies.updateExportButtonText);

  const explicitStateGetter = createSelectionRuntimeStateGetter({
    getSelectionState: () => ({
      id: 'explicit-state',
      transformControls: null,
    }),
    getTransformControls: () => 'legacy-transform-controls',
  });
  assert.deepEqual(explicitStateGetter(), {
    selectionState: {
      id: 'explicit-state',
      transformControls: null,
    },
    transformControls: null,
  });

  const legacyStateGetter = createSelectionRuntimeStateGetter({
    getSelectionState: () => ({ id: 'legacy-state' }),
    getTransformControls: () => 'legacy-transform-controls',
  });
  assert.deepEqual(legacyStateGetter(), {
    selectionState: { id: 'legacy-state' },
    transformControls: 'legacy-transform-controls',
  });

  const firstHooks = {
    attachBone: () => 'first-bone',
    showTimelineForGroup: () => 'first-timeline',
  };
  const nextHooks = {
    showTimelineForGroup: () => 'next-timeline',
  };
  assert.equal(controller.configureSelectionHooks(firstHooks), undefined);
  assert.equal(controller.onMouseDown('mouse-event'), 'mouse-result');
  assert.deepEqual(calls.shift(), ['mouse', 'mouse-event', {
    attachBone: firstHooks.attachBone,
    showTimelineForGroup: firstHooks.showTimelineForGroup,
  }]);

  controller.configureSelectionHooks(nextHooks);
  assert.equal(controller.onDoubleClick('double-event'), 'double-result');
  assert.deepEqual(calls.shift(), ['double', 'double-event', {
    attachBone: firstHooks.attachBone,
    showTimelineForGroup: nextHooks.showTimelineForGroup,
  }]);
  assert.equal(controller.selectMesh('mesh'), 'select-result');
  assert.deepEqual(calls.shift(), ['select', 'mesh', {
    attachBone: firstHooks.attachBone,
    showTimelineForGroup: nextHooks.showTimelineForGroup,
  }]);
  assert.equal(controller.deselect(), 'deselect-result');
  assert.deepEqual(calls.shift(), ['deselect', {
    attachBone: firstHooks.attachBone,
    showTimelineForGroup: nextHooks.showTimelineForGroup,
  }]);
  assert.equal(controller.deselectAll(), 'deselect-all-result');
  assert.deepEqual(calls.shift(), ['deselect-all', {
    attachBone: firstHooks.attachBone,
    showTimelineForGroup: nextHooks.showTimelineForGroup,
  }]);
  assert.equal(calls.length, 0);
});

test('builds browser selection controller adapter through injected facade factory', () => {
  const selectionState = { id: 'browser-selection-state' };
  const facade = {
    configureSelectionHooks: () => 'hooks-result',
    deselect: () => 'deselect-result',
    deselectAll: () => 'deselect-all-result',
    onDoubleClick: () => 'double-result',
    onMouseDown: () => 'mouse-result',
    selectMesh: () => 'select-result',
  };
  let facadeOptions = null;
  let domRoot = null;
  const root = { id: 'selection-root' };
  const selectionDom = {
    hideAnimationTimeline: () => 'hide-timeline',
    showMultiSelectionHeader: () => 'show-multi',
    showSingleSelectionHeader: () => 'show-single',
  };

  const result = createBrowserSelectionController({
    root,
    getSelectionState: () => selectionState,
    createSelectionDom: (options) => {
      domRoot = options.root;
      return selectionDom;
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getSelectionState(), selectionState);
  assert.equal(typeof facadeOptions.raycastBones, 'function');
  assert.equal(typeof facadeOptions.highlightSelection, 'function');
  assert.equal(typeof facadeOptions.unhighlightSelection, 'function');
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.equal(domRoot, root);
  assert.equal(facadeOptions.hideAnimationTimeline(), 'hide-timeline');
  assert.equal(facadeOptions.showMultiSelectionHeader(), 'show-multi');
  assert.equal(facadeOptions.showSingleSelectionHeader(), 'show-single');
  assert.equal(typeof facadeOptions.updatePropertiesPanel, 'function');
  assert.equal(typeof facadeOptions.clearPropertiesPanel, 'function');
  assert.equal(typeof facadeOptions.showMultiSelectionPanel, 'function');
  assert.equal(typeof facadeOptions.updateExportButtonText, 'function');
});

test('translates labels and stores language through adapters', () => {
  const dictionary = {
    greeting: { en: 'Hello {name}', es: 'Hola {name}' },
    fallback: { en: 'Fallback' },
  };
  const saved = new Map();
  const fakeStorage = {
    getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
  };

  assert.equal(translate(dictionary, 'es', 'greeting', { name: 'Ina' }), 'Hola Ina');
  assert.equal(translate(dictionary, 'es', 'fallback'), 'Fallback');
  assert.equal(translate(dictionary, 'en', 'missing'), 'missing');
  assert.equal(getNextLanguage('en'), 'es');
  assert.equal(getNextLanguage('es'), 'en');

  assert.equal(loadStoredLanguage('en', fakeStorage), 'en');
  saveStoredLanguage('es', fakeStorage);
  assert.equal(loadStoredLanguage('en', fakeStorage), 'es');
});

test('coordinates i18n controller state storage DOM application and callbacks', () => {
  const dictionary = {
    greeting: { en: 'Hello {name}', es: 'Hola {name}' },
    save: { en: 'Save', es: 'Guardar' },
  };
  const saved = [];
  const applied = [];
  const callbacks = [];

  const controller = createI18nController({
    translations: dictionary,
    defaultLang: 'en',
    loadLanguage: (fallback) => {
      saved.push(['load', fallback]);
      return 'es';
    },
    saveLanguage: (lang) => saved.push(['save', lang]),
    applyTranslationsToDocumentCommand: (translateFn, lang) => {
      applied.push([lang, translateFn('save'), translateFn('greeting', { name: 'Ina' })]);
    },
  });

  assert.deepEqual(saved, [['load', 'en']]);
  assert.equal(controller.getLang(), 'es');
  assert.equal(controller.t('greeting', { name: 'Ina' }), 'Hola Ina');

  controller.onLangChange((lang) => callbacks.push(lang));
  assert.equal(controller.initI18n(), undefined);
  assert.deepEqual(applied.splice(0), [['es', 'Guardar', 'Hola Ina']]);
  assert.deepEqual(callbacks.splice(0), ['es']);

  assert.equal(controller.toggleLang(), undefined);
  assert.equal(controller.getLang(), 'en');
  assert.deepEqual(saved.slice(1), [['save', 'en']]);
  assert.deepEqual(applied.splice(0), [['en', 'Save', 'Hello Ina']]);
  assert.deepEqual(callbacks.splice(0), ['en']);

  controller.setLang('es');
  assert.equal(controller.getLang(), 'es');
  assert.deepEqual(saved.slice(1), [['save', 'en'], ['save', 'es']]);
  assert.deepEqual(applied.splice(0), [['es', 'Guardar', 'Hola Ina']]);
  assert.deepEqual(callbacks.splice(0), ['es']);
});

test('builds browser i18n controller adapter through injected facade factory', () => {
  const dictionary = { save: { en: 'Save', es: 'Guardar' } };
  const root = { id: 'i18n-root' };
  const facade = {
    getLang: () => 'es',
    initI18n: () => {},
    onLangChange: () => {},
    setLang: () => {},
    t: () => 'Guardar',
    toggleLang: () => {},
  };
  const loadLanguage = () => 'es';
  const saveLanguage = () => {};
  const applyTranslationsToDocumentCommand = () => {};
  let facadeOptions = null;
  const domRoots = [];

  const result = createBrowserI18nController({
    root,
    translations: dictionary,
    defaultLang: 'es',
    initialLang: 'en',
    loadLanguage,
    saveLanguage,
    applyTranslationsToDocumentCommand,
    createI18nDom: ({ root: domRoot }) => {
      domRoots.push(domRoot);
      return { applyTranslationsToDocument: () => 'unused-dom-command' };
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.translations, dictionary);
  assert.equal(facadeOptions.defaultLang, 'es');
  assert.equal(facadeOptions.initialLang, 'en');
  assert.equal(facadeOptions.loadLanguage, loadLanguage);
  assert.equal(facadeOptions.saveLanguage, saveLanguage);
  assert.equal(facadeOptions.applyTranslationsToDocumentCommand, applyTranslationsToDocumentCommand);
  assert.deepEqual(domRoots, []);

  const defaultDomResult = createBrowserI18nController({
    root,
    createI18nDom: ({ root: domRoot }) => {
      domRoots.push(domRoot);
      return { applyTranslationsToDocument: () => 'dom-command-result' };
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });
  assert.equal(defaultDomResult, facade);
  assert.deepEqual(domRoots, [root]);
  assert.equal(facadeOptions.applyTranslationsToDocumentCommand(), 'dom-command-result');
});

test('applies i18n text, placeholders, titles, and language flag to DOM adapter', () => {
  const createElement = (key, target = null) => ({
    textContent: '',
    placeholder: '',
    title: '',
    getAttribute: (name) => {
      if (name === 'data-i18n') return key;
      if (name === 'data-i18n-attr') return target;
      return null;
    },
  });
  const textElement = createElement('title');
  const placeholderElement = createElement('hint', 'placeholder');
  const titleElement = createElement('buttonTitle', 'title');
  const flag = { textContent: '' };
  const root = {
    querySelectorAll: () => [textElement, placeholderElement, titleElement],
    getElementById: (id) => (id === 'lang-toggle' ? flag : null),
  };

  applyTranslationsToDocument((key) => `translated:${key}`, 'es', root);

  assert.equal(textElement.textContent, 'translated:title');
  assert.equal(placeholderElement.placeholder, 'translated:hint');
  assert.equal(titleElement.title, 'translated:buttonTitle');
  assert.equal(flag.textContent, 'ES');

  const i18nDom = createI18nDomAdapter({ root });
  i18nDom.applyTranslationsToDocument((key) => `again:${key}`, 'en');
  assert.equal(textElement.textContent, 'again:title');
  assert.equal(flag.textContent, 'EN');
  assert.doesNotThrow(() => applyTranslationsToDocument((key) => key, 'es', null));
});

test('applies transform snap settings and updates snap indicator', () => {
  const calls = [];
  const transformControls = {
    setTranslationSnap: (value) => calls.push(['translation', value]),
    setRotationSnap: (value) => calls.push(['rotation', value]),
    setScaleSnap: (value) => calls.push(['scale', value]),
  };

  assert.equal(getNextSnapState(false), true);
  assert.equal(getNextSnapState(true), false);

  applySnapSettings(transformControls, true);
  assert.deepEqual(calls, [
    ['translation', DEFAULT_SNAP_SETTINGS.translation],
    ['rotation', DEFAULT_SNAP_SETTINGS.rotation],
    ['scale', DEFAULT_SNAP_SETTINGS.scale],
  ]);

  calls.length = 0;
  applySnapSettings(transformControls, false);
  assert.deepEqual(calls, [
    ['translation', null],
    ['rotation', null],
    ['scale', null],
  ]);

  const indicator = { textContent: '' };
  assert.equal(updateSnapIndicator(true, (key) => key, { getElementById: () => indicator }), true);
  assert.equal(indicator.textContent, 'snapOn');
  assert.equal(updateSnapIndicator(false, (key) => key, { getElementById: () => indicator }), true);
  assert.equal(indicator.textContent, 'snapOff');
  assert.equal(updateSnapIndicator(true, (key) => key, null), false);

  const snapDom = createSnapDomAdapter({ root: { getElementById: () => indicator } });
  assert.equal(snapDom.updateSnapIndicator(true, (key) => `t:${key}`), true);
  assert.equal(indicator.textContent, 't:snapOn');
});

test('coordinates snap controller through injected runtime getter core and DOM adapters', () => {
  const transformControls = { id: 'transform-controls' };
  const snapState = {
    snapEnabled: false,
    transformControls,
  };
  const calls = [];
  const controller = createSnapController({
    getSnapState: () => snapState,
    translate: (key) => `t:${key}`,
    getNextSnapStateCommand: (enabled) => {
      calls.push(['next', enabled]);
      return !enabled;
    },
    applySnapSettingsCommand: (controls, enabled) => calls.push(['apply', controls, enabled]),
    updateSnapIndicatorCommand: (enabled, translate) => calls.push(['indicator', enabled, translate('snapOn')]),
  });

  assert.equal(controller.toggleSnap(), true);
  assert.equal(snapState.snapEnabled, true);
  assert.equal(controller.toggleSnap(), false);
  assert.equal(snapState.snapEnabled, false);
  assert.deepEqual(calls, [
    ['next', false],
    ['apply', transformControls, true],
    ['indicator', true, 't:snapOn'],
    ['next', true],
    ['apply', transformControls, false],
    ['indicator', false, 't:snapOn'],
  ]);
});

test('builds browser snap controller adapter through injected facade factory', () => {
  const snapState = { id: 'browser-snap-state' };
  const root = { id: 'snap-root' };
  const domRoots = [];
  const facade = {
    toggleSnap: () => 'toggle-result',
  };
  let facadeOptions = null;

  const result = createBrowserSnapController({
    root,
    getSnapState: () => snapState,
    createSnapDom: ({ root: domRoot }) => {
      domRoots.push(domRoot);
      return { updateSnapIndicator: () => 'snap-dom-result' };
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getSnapState(), snapState);
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.deepEqual(domRoots, [root]);
  assert.equal(facadeOptions.updateSnapIndicatorCommand(), 'snap-dom-result');
});

test('creates primitive geometry and mesh through injected constructors', () => {
  const geometryClass = (name) => class {
    constructor(...args) {
      this.name = name;
      this.args = args;
    }
  };
  const geometryClasses = {
    BoxGeometryClass: geometryClass('box'),
    CapsuleGeometryClass: geometryClass('capsule'),
    ConeGeometryClass: geometryClass('cone'),
    CylinderGeometryClass: geometryClass('cylinder'),
    PlaneGeometryClass: geometryClass('plane'),
    SphereGeometryClass: geometryClass('sphere'),
    TorusGeometryClass: geometryClass('torus'),
  };
  class MeshClass {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
      this.userData = {};
      this.position = {
        set: (...coords) => {
          this.position.coords = coords;
        },
      };
      this.rotation = {};
    }
  }

  assert.deepEqual(createPrimitiveGeometry('cube', geometryClasses).args, [2, 2, 2]);
  assert.deepEqual(createPrimitiveGeometry('sphere', geometryClasses).args, [1.5, 8, 6]);
  assert.equal(createPrimitiveGeometry('unknown', geometryClasses), null);

  const plane = createPrimitiveMesh('plane', {
    geometryClasses,
    MeshClass,
    createMaterial: (materialType) => ({ materialType }),
    materialType: 'Phong',
  });

  assert.equal(plane.geometry.name, 'plane');
  assert.deepEqual(plane.material, { materialType: 'Phong' });
  assert.deepEqual(plane.position.coords, [0, 1, 0]);
  assert.equal(plane.rotation.x, -Math.PI / 2);
  assert.deepEqual(plane.userData, { name: 'PLANE', geometryType: 'plane' });
});

test('adds primitives through injected scene selection and history dependencies', () => {
  const calls = [];
  const primitiveState = {
    currentMaterialType: 'Lambert',
    selectedMesh: null,
    userObjects: {
      add: (mesh) => calls.push(['add', mesh.id]),
      remove: (mesh) => calls.push(['remove', mesh.id]),
    },
  };
  const mesh = { id: 'cube-mesh' };
  let undoAction = null;

  assert.equal(addPrimitiveToScene('cube', {
    primitiveState,
    createPrimitiveMeshCommand: (type, options) => {
      calls.push(['create', type, options.materialType]);
      return mesh;
    },
    selectMesh: (target) => calls.push(['select', target.id]),
    deselect: () => calls.push(['deselect']),
    pushAction: (action) => {
      undoAction = action;
      calls.push(['action', action.type]);
    },
    translate: (key) => `t:${key}`,
  }), mesh);

  primitiveState.selectedMesh = mesh;
  undoAction.undo();
  undoAction.redo();

  assert.deepEqual(calls, [
    ['create', 'cube', 'Lambert'],
    ['add', 'cube-mesh'],
    ['select', 'cube-mesh'],
    ['action', 't:actionCreatePrimitive'],
    ['deselect'],
    ['remove', 'cube-mesh'],
    ['add', 'cube-mesh'],
    ['select', 'cube-mesh'],
  ]);
  assert.equal(addPrimitiveToScene('unknown', {
    primitiveState,
    createPrimitiveMeshCommand: () => null,
  }), null);
});

test('coordinates primitive controller and browser adapter through injected dependencies', () => {
  const primitiveState = { id: 'primitive-state' };
  const calls = [];
  const controller = createPrimitiveController({
    getPrimitiveState: () => primitiveState,
    geometryClasses: { id: 'geometry-classes' },
    MeshClass: class {},
    createMaterial: () => {},
    selectMesh: () => {},
    deselect: () => {},
    pushAction: () => {},
    translate: (key) => key,
    addPrimitiveToSceneCommand: (type, options) => {
      calls.push([type, options.primitiveState, options.geometryClasses]);
      return 'primitive-result';
    },
  });

  assert.equal(controller.addPrimitive('cube'), 'primitive-result');
  assert.deepEqual(calls, [['cube', primitiveState, { id: 'geometry-classes' }]]);

  const facade = { addPrimitive: () => 'facade-result' };
  let facadeOptions = null;
  const result = createBrowserPrimitiveController({
    getPrimitiveState: () => primitiveState,
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getPrimitiveState(), primitiveState);
  assert.equal(typeof facadeOptions.MeshClass, 'function');
  assert.equal(typeof facadeOptions.geometryClasses.BoxGeometryClass, 'function');
  assert.equal(typeof facadeOptions.createMaterial, 'function');
  assert.equal(typeof facadeOptions.selectMesh, 'function');
  assert.equal(typeof facadeOptions.translate, 'function');
});

test('creates mesh materials without global state and syncs color inputs', () => {
  const material = createMeshMaterial('Phong', {
    color: '#123456',
    flatShading: true,
    wireframe: true,
  });

  assert.equal(material.type, 'MeshPhongMaterial');
  assert.equal(material.color.getHex(), 0x123456);
  assert.equal(material.flatShading, true);
  assert.equal(material.wireframe, true);

  const values = new Map([
    ['palette-color-picker', { value: '' }],
    ['prop-color', { value: '' }],
  ]);
  syncColorInputs('#abcdef', { getElementById: (id) => values.get(id) || null });

  assert.equal(values.get('palette-color-picker').value, '#abcdef');
  assert.equal(values.get('prop-color').value, '#abcdef');

  const materialDom = createMaterialDomAdapter({
    root: { getElementById: (id) => values.get(id) || null },
  });
  materialDom.syncColorInputs('#fedcba');
  assert.equal(values.get('palette-color-picker').value, '#fedcba');
  assert.equal(values.get('prop-color').value, '#fedcba');

  material.dispose();
});

test('applies material commands without global state', () => {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#123456', flatShading: false, wireframe: false })
  );
  const oldMaterial = mesh.material;
  root.add(mesh);

  assert.equal(replaceMaterialType(mesh, 'Phong', {
    createMaterial: (type, options) => createMeshMaterial(type, options),
    preserveEmissive: false,
  }), true);
  assert.notEqual(mesh.material, oldMaterial);
  assert.equal(mesh.material.type, 'MeshPhongMaterial');
  assert.equal(mesh.material.color.getHex(), 0x123456);

  applyFlatShadingToObjects(root, true);
  assert.equal(mesh.material.flatShading, true);

  applyWireframeToObjects(root, true);
  assert.equal(mesh.material.wireframe, true);

  assert.equal(setMeshColor(mesh, '#abcdef'), true);
  assert.equal(mesh.material.color.getHex(), 0xabcdef);
  assert.equal(setMeshColor(null, '#ffffff'), false);

  assert.equal(choosePaletteColor(['a', 'b', 'c'], () => 0.5), 'b');
  assert.equal(choosePaletteColor([], () => 0), null);
});

test('runs material runtime settings and selected quick color flows without global state', () => {
  const materialState = {
    currentMaterialType: 'Lambert',
    flatShadingEnabled: true,
    wireframeEnabled: false,
    userObjects: { name: 'root' },
  };
  const calls = [];

  const material = createMaterialFromSettings(materialState, null, { color: '#123456' }, {
    createMaterial: (type, options) => {
      calls.push(['create', type, options]);
      return { type, options };
    },
  });
  assert.deepEqual(material, {
    type: 'Lambert',
    options: {
      color: '#123456',
      flatShading: true,
      wireframe: false,
      map: undefined,
    },
  });

  assert.equal(toggleFlatShadingSetting(materialState, {
    applyToObjects: (root, enabled) => calls.push(['flat', root, enabled]),
  }), false);
  assert.equal(materialState.flatShadingEnabled, false);

  assert.equal(toggleWireframeSetting(materialState, {
    applyToObjects: (root, enabled) => calls.push(['wire', root, enabled]),
  }), true);
  assert.equal(materialState.wireframeEnabled, true);

  const mesh = { material: { emissive: true } };
  assert.equal(updateMaterialTypeForSelection(mesh, 'Phong', {
    selectedMesh: mesh,
    createMaterial: () => ({}),
    replaceMaterial: (target, type, options) => {
      calls.push(['replace', target, type, options.preserveEmissive]);
      return true;
    },
  }), true);

  assert.equal(applySelectedQuickColor({
    getSelectedMesh: () => mesh,
    hex: '#abcdef',
    actionType: 'Color',
    setColor: () => {},
    syncColorInputs: () => {},
    pushAction: () => {},
    applyColor: ({ selectedMesh, hex }) => {
      calls.push(['quick', selectedMesh, hex]);
      return Boolean(selectedMesh);
    },
  }), true);

  assert.equal(applySelectedQuickColor({
    getSelectedMesh: () => null,
    applyColor: ({ selectedMesh }) => Boolean(selectedMesh),
  }), false);

  assert.deepEqual(calls, [
    ['create', 'Lambert', {
      color: '#123456',
      flatShading: true,
      wireframe: false,
      map: undefined,
    }],
    ['flat', materialState.userObjects, false],
    ['wire', materialState.userObjects, true],
    ['replace', mesh, 'Phong', true],
    ['quick', mesh, '#abcdef'],
  ]);
});

test('coordinates material controller through injected runtime getters and commands', () => {
  const selectedMesh = { id: 'selected' };
  const materialState = {
    currentMaterialType: 'Lambert',
    flatShadingEnabled: false,
    retroPalette: ['#111111', '#222222'],
    selectedMesh,
    userObjects: { id: 'root' },
    wireframeEnabled: true,
  };
  const calls = [];

  const controller = createMaterialController({
    getMaterialState: () => materialState,
    translate: (key) => ({ actionChangeColor: 'CHANGE COLOR' })[key] || key,
    syncColorInputs: (hex) => calls.push(['sync', hex]),
    pushAction: (action) => calls.push(['push', action]),
    createMaterialFromSettingsCommand: (stateArg, type, options) => {
      calls.push(['create', stateArg, type, options]);
      return { type: type || stateArg.currentMaterialType, options };
    },
    updateMaterialTypeForSelectionCommand: (mesh, newType, options) => {
      calls.push(['update-type', mesh, newType, options.selectedMesh]);
      return options.createMaterial(newType, { color: '#abcdef' });
    },
    toggleFlatShadingSettingCommand: (stateArg) => {
      stateArg.flatShadingEnabled = !stateArg.flatShadingEnabled;
      calls.push(['flat', stateArg.flatShadingEnabled]);
      return stateArg.flatShadingEnabled;
    },
    toggleWireframeSettingCommand: (stateArg) => {
      stateArg.wireframeEnabled = !stateArg.wireframeEnabled;
      calls.push(['wire', stateArg.wireframeEnabled]);
      return stateArg.wireframeEnabled;
    },
    setMeshColorCommand: (mesh, hex) => {
      calls.push(['set-color', mesh, hex]);
      return true;
    },
    choosePaletteColorCommand: (palette) => {
      calls.push(['palette', palette]);
      return palette[1];
    },
    applySelectedQuickColorCommand: (options) => {
      calls.push(['quick', options.getSelectedMesh(), options.hex, options.actionType]);
      options.setColor(options.getSelectedMesh(), options.hex);
      options.syncColorInputs(options.hex);
      options.pushAction({ type: options.actionType });
      return true;
    },
  });

  assert.deepEqual(controller.createMaterial(null, { color: '#123456' }), {
    type: 'Lambert',
    options: { color: '#123456' },
  });
  assert.deepEqual(calls.shift(), ['create', materialState, null, { color: '#123456' }]);

  assert.deepEqual(controller.updateMaterialType(selectedMesh, 'Phong'), {
    type: 'Phong',
    options: { color: '#abcdef' },
  });
  assert.deepEqual(calls.shift(), ['update-type', selectedMesh, 'Phong', selectedMesh]);
  assert.deepEqual(calls.shift(), ['create', materialState, 'Phong', { color: '#abcdef' }]);

  assert.equal(controller.toggleFlatShading(), true);
  assert.deepEqual(calls.shift(), ['flat', true]);
  assert.equal(controller.toggleWireframe(), false);
  assert.deepEqual(calls.shift(), ['wire', false]);
  assert.equal(controller.setColor(selectedMesh, '#ffffff'), true);
  assert.deepEqual(calls.shift(), ['set-color', selectedMesh, '#ffffff']);
  assert.equal(controller.randomRetroColor(), '#222222');
  assert.deepEqual(calls.shift(), ['palette', ['#111111', '#222222']]);

  const nextSelectedMesh = { id: 'next-selected' };
  materialState.selectedMesh = nextSelectedMesh;
  assert.equal(controller.quickColor('#333333'), true);
  assert.deepEqual(calls.shift(), ['quick', nextSelectedMesh, '#333333', 'CHANGE COLOR']);
  assert.deepEqual(calls.shift(), ['set-color', nextSelectedMesh, '#333333']);
  assert.deepEqual(calls.shift(), ['sync', '#333333']);
  assert.deepEqual(calls.shift(), ['push', { type: 'CHANGE COLOR' }]);
  assert.equal(calls.length, 0);

  const explicitStateGetter = createMaterialRuntimeStateGetter({
    getMaterialState: () => ({
      selectedMesh: null,
      retroPalette: null,
    }),
    getSelectedMesh: () => 'legacy-selected',
    getRetroPalette: () => 'legacy-palette',
  });
  assert.deepEqual(explicitStateGetter(), {
    materialState: {
      selectedMesh: null,
      retroPalette: null,
    },
    selectedMesh: null,
    retroPalette: null,
  });

  const legacyStateGetter = createMaterialRuntimeStateGetter({
    getMaterialState: () => ({ currentMaterialType: 'Basic' }),
    getSelectedMesh: () => 'legacy-selected',
    getRetroPalette: () => 'legacy-palette',
  });
  assert.deepEqual(legacyStateGetter(), {
    materialState: { currentMaterialType: 'Basic' },
    selectedMesh: 'legacy-selected',
    retroPalette: 'legacy-palette',
  });
});

test('builds browser material controller adapter through injected facade factory', () => {
  const materialState = { id: 'browser-material-state' };
  const root = { id: 'material-root' };
  const facade = {
    createMaterial: () => 'create-result',
    quickColor: () => 'quick-result',
    randomRetroColor: () => 'palette-result',
    setColor: () => 'set-color-result',
    toggleFlatShading: () => 'flat-result',
    toggleWireframe: () => 'wire-result',
    updateMaterialType: () => 'type-result',
  };
  let facadeOptions = null;
  let domRoot = null;
  const materialDom = {
    syncColorInputs: () => 'sync-result',
  };

  const result = createBrowserMaterialController({
    root,
    getMaterialState: () => materialState,
    createMaterialDom: (options) => {
      domRoot = options.root;
      return materialDom;
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getMaterialState(), materialState);
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.equal(domRoot, root);
  assert.equal(facadeOptions.syncColorInputs(), 'sync-result');
  assert.equal(typeof facadeOptions.pushAction, 'function');
});

test('applies quick color flow with injected history dependencies', () => {
  const calls = [];
  assert.equal(applyQuickColor({
    selectedMesh: null,
    hex: '#ffffff',
    actionType: 'Color',
    setColor: () => calls.push(['unexpected']),
    syncColorInputs: () => calls.push(['unexpected']),
    pushAction: () => calls.push(['unexpected']),
  }), false);
  assert.deepEqual(calls, []);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#111111' })
  );
  const actions = [];
  const setColorForTest = (target, hex) => {
    calls.push(['setColor', hex]);
    target.material.color.set(hex);
  };
  const syncForTest = (hex) => calls.push(['sync', hex]);

  assert.equal(applyQuickColor({
    selectedMesh: mesh,
    hex: '#222222',
    actionType: 'Color',
    setColor: setColorForTest,
    syncColorInputs: syncForTest,
    pushAction: (action) => actions.push(action),
  }), true);

  assert.equal(mesh.material.color.getHex(), 0x222222);
  assert.deepEqual(calls.splice(0), [['setColor', '#222222'], ['sync', '#222222']]);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'Color');

  actions[0].undo();
  actions[0].redo();
  assert.deepEqual(calls, [
    ['setColor', '#111111'],
    ['sync', '#111111'],
    ['setColor', '#222222'],
    ['sync', '#222222'],
  ]);
});

test('resolves property targets and action visibility without UI state', () => {
  const userObjects = new THREE.Group();
  const pivot = new THREE.Group();
  const childMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhongMaterial({ color: '#123456' })
  );
  pivot.userData.isPivot = true;
  pivot.add(childMesh);
  userObjects.add(pivot);

  const nestedParent = new THREE.Group();
  nestedParent.userData.isPivot = true;
  nestedParent.add(pivot);

  assert.equal(getPropertyChildMesh(pivot), childMesh);
  assert.equal(getPropertyChildMesh(childMesh), childMesh);
  assert.equal(getMaterialTypeName(childMesh), 'Phong');
  assert.equal(getMaterialColorHex(childMesh), '#123456');

  const visibility = getSelectionActionVisibility(pivot, {
    userObjects,
    bonesVisible: true,
  });
  assert.deepEqual(visibility, {
    isGroup: true,
    isInGroup: true,
    showBone: true,
    hasParentPivot: true,
  });
});

test('applies transform and texture property commands', () => {
  const object = new THREE.Group();
  applyPosition(object, { x: 1, y: 2, z: 3 });
  applyRotationDegrees(object, { x: 90, y: 180, z: 270 });
  applyScale(object, { x: 2, y: 3, z: 4 });
  renameObject(object, 'RENAMED');

  assert.deepEqual(object.position.toArray(), [1, 2, 3]);
  assert.equal(object.rotation.x, Math.PI / 2);
  assert.equal(object.rotation.y, Math.PI);
  assert.equal(object.rotation.z, Math.PI * 1.5);
  assert.deepEqual(object.scale.toArray(), [2, 3, 4]);
  assert.equal(object.userData.name, 'RENAMED');

  const texture = new THREE.Texture();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00', map: texture })
  );
  const remembered = [];
  const remember = (target, tex) => remembered.push([target, tex]);
  const initialVersion = texture.version;

  assert.equal(getTextureMesh(mesh), mesh);

  applyTextureOffset(mesh, { offsetX: 0.25, offsetY: 0.5 }, remember);
  applyTextureRepeat(mesh, { repeatX: 2, repeatY: 3 }, remember);
  applyTextureRotation(mesh, { rotationDeg: 45 }, remember);

  assert.equal(texture.offset.x, 0.25);
  assert.equal(texture.offset.y, 0.5);
  assert.equal(texture.repeat.x, 2);
  assert.equal(texture.repeat.y, 3);
  assert.equal(texture.wrapS, THREE.RepeatWrapping);
  assert.equal(texture.wrapT, THREE.RepeatWrapping);
  assert.equal(texture.rotation, Math.PI / 4);
  assert.equal(texture.center.x, 0.5);
  assert.equal(texture.center.y, 0.5);
  assert.equal(texture.version, initialVersion + 3);
  assert.deepEqual(remembered, [[mesh, texture], [mesh, texture], [mesh, texture]]);
});

test('creates property history actions with injected side effects', () => {
  const target = { id: 'target' };
  const calls = [];
  const colorAction = createColorChangeAction({
    target,
    oldColor: '#111111',
    newColor: '#222222',
    type: 'Color',
    setColor: (object, color) => calls.push(['color', object, color]),
    syncColorPickers: (color) => calls.push(['sync', color]),
    shouldRefresh: () => true,
    updatePropertiesPanel: () => calls.push(['refresh']),
  });

  colorAction.undo();
  colorAction.redo();
  assert.deepEqual(calls.splice(0), [
    ['color', target, '#111111'],
    ['sync', '#111111'],
    ['refresh'],
    ['color', target, '#222222'],
    ['sync', '#222222'],
    ['refresh'],
  ]);

  const materialAction = createMaterialChangeAction({
    target,
    oldType: 'Lambert',
    newType: 'Phong',
    type: 'Material',
    updateMaterialType: (object, materialType) => calls.push(['material', object, materialType]),
    shouldRefresh: () => false,
    updatePropertiesPanel: () => calls.push(['refresh']),
  });

  materialAction.undo();
  materialAction.redo();
  assert.deepEqual(calls, [
    ['material', target, 'Lambert'],
    ['material', target, 'Phong'],
  ]);
});

test('runs selected property flows with injected state and side effects', () => {
  const texture = new THREE.Texture();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#111111', map: texture })
  );
  const actions = [];
  const calls = [];

  assert.equal(runSelectedPositionUpdate({
    selectedObject: mesh,
    readPositionInputs: () => ({ x: 1, y: 2, z: 3 }),
  }), true);
  assert.deepEqual(mesh.position.toArray(), [1, 2, 3]);

  assert.equal(runSelectedRotationUpdate({
    selectedObject: mesh,
    readRotationDegreeInputs: () => ({ x: 90, y: 0, z: 45 }),
  }), true);
  assert.equal(mesh.rotation.x, Math.PI / 2);
  assert.equal(mesh.rotation.z, Math.PI / 4);

  assert.equal(runSelectedScaleUpdate({
    selectedObject: mesh,
    readScaleInputs: () => ({ x: 2, y: 3, z: 4 }),
  }), true);
  assert.deepEqual(mesh.scale.toArray(), [2, 3, 4]);

  assert.equal(runSelectedNameUpdate({
    selectedObject: mesh,
    value: 'BODY',
    setSelectedName: (value) => calls.push(['name-input', value]),
  }), true);
  assert.equal(mesh.userData.name, 'BODY');

  assert.equal(runSelectedColorUpdate({
    selectedObject: mesh,
    hex: '#222222',
    actionType: 'Color',
    setColor: (target, color) => {
      target.material.color.set(color);
      calls.push(['color', color]);
    },
    syncColorPickers: (color) => calls.push(['sync', color]),
    pushAction: (action) => actions.push(action),
    shouldRefresh: () => true,
    updatePropertiesPanel: () => calls.push(['refresh']),
  }), true);
  assert.equal(mesh.material.color.getHex(), 0x222222);
  assert.equal(actions[0].type, 'Color');

  assert.equal(runSelectedMaterialUpdate({
    selectedObject: mesh,
    actionType: 'Material',
    getMaterialInput: () => 'Phong',
    updateMaterialType: (target, type) => {
      target.userData.materialType = type;
      calls.push(['material', type]);
    },
    pushAction: (action) => actions.push(action),
  }), true);
  assert.equal(mesh.userData.materialType, 'Phong');
  assert.equal(actions[1].type, 'Material');

  const remembered = [];
  const rememberTextureTransform = (target, tex) => remembered.push([target, tex]);
  assert.equal(runSelectedUvOffsetUpdate({
    selectedObject: mesh,
    readUvInputs: () => ({ offsetX: 0.25, offsetY: 0.5 }),
    rememberTextureTransform,
  }), true);
  assert.equal(runSelectedUvRepeatUpdate({
    selectedObject: mesh,
    readUvInputs: () => ({ repeatX: 2, repeatY: 3 }),
    rememberTextureTransform,
  }), true);
  assert.equal(runSelectedUvRotationUpdate({
    selectedObject: mesh,
    readUvInputs: () => ({ rotationDeg: 45 }),
    rememberTextureTransform,
  }), true);
  assert.equal(texture.offset.x, 0.25);
  assert.equal(texture.offset.y, 0.5);
  assert.equal(texture.repeat.x, 2);
  assert.equal(texture.repeat.y, 3);
  assert.equal(texture.rotation, Math.PI / 4);
  assert.deepEqual(remembered, [[mesh, texture], [mesh, texture], [mesh, texture]]);

  assert.equal(runSelectedPositionUpdate({
    selectedObject: null,
    readPositionInputs: () => ({ x: 9, y: 9, z: 9 }),
  }), false);
  assert.deepEqual(calls.slice(0, 5), [
    ['name-input', 'BODY'],
    ['color', '#222222'],
    ['sync', '#222222'],
    ['material', 'Phong'],
  ]);
});

test('routes UI controller operations through injected runtime getters and adapters', () => {
  const selectedMesh = { id: 'selected', isMesh: true, material: {}, userData: {} };
  const meshWithoutMaterial = { id: 'no-material', isMesh: true, material: null };
  const nonMesh = { id: 'non-mesh', isMesh: false, material: {} };
  const selectedMeshes = new Set([selectedMesh, meshWithoutMaterial, nonMesh]);
  const userObjects = { id: 'root' };
  let selectedObject = selectedMesh;
  let bonesVisible = true;
  const calls = [];
  const translate = (key) => ({
    actionChangeColor: 'CHANGE COLOR',
    actionChangeMaterial: 'CHANGE MATERIAL',
    exportGlb: 'EXPORT GLB',
    exportSelection: 'EXPORT SELECTION',
    noObject: 'NO OBJECT',
  })[key] || key;
  const radToDeg = (value) => value * 10;
  const showSingleSelectionFieldsAdapter = () => calls.push(['show-single']);
  const writeObjectPropertiesAdapter = () => calls.push(['write-object']);
  const setColorInputAdapter = () => calls.push(['set-color-input']);
  const setMaterialInputAdapter = () => calls.push(['set-material-input']);
  const writeUvControlsAdapter = () => calls.push(['write-uv']);
  const setActionButtonVisibilityAdapter = () => calls.push(['set-action-visibility']);

  const controller = createUIController({
    getUIState: () => ({
      selectedMesh: selectedObject,
      selectedMeshes,
      userObjects,
      bonesVisible,
    }),
    getHooks: () => ({
      refreshSceneObjectList: () => calls.push(['refresh-list']),
    }),
    translate,
    radToDeg,
    setColor: (object, color) => calls.push(['set-color', object, color]),
    updateMaterialType: (object, type) => calls.push(['material-type', object, type]),
    syncColorInputs: (color) => {
      calls.push(['sync-inputs', color]);
      return 'synced';
    },
    pushAction: (action) => calls.push(['push-action', action]),
    rememberTextureTransform: (object, texture) => calls.push(['remember-texture', object, texture]),
    renderSelectedObjectPropertiesCommand: (object, options) => {
      calls.push(['render', object, options]);
      return 'rendered';
    },
    clearSelectionPanel: (label) => calls.push(['clear', label]),
    getMaterialInput: () => 'Phong',
    readPositionInputs: () => ({ x: 1, y: 2, z: 3 }),
    readRotationDegreeInputs: () => ({ x: 10, y: 20, z: 30 }),
    readScaleInputs: () => ({ x: 2, y: 3, z: 4 }),
    readUvInputs: () => ({ offsetX: 0.25, offsetY: 0.5, repeatX: 2, repeatY: 3, rotationDeg: 45 }),
    setActionButtonVisibility: setActionButtonVisibilityAdapter,
    setColorInput: setColorInputAdapter,
    setMaterialInput: setMaterialInputAdapter,
    setSelectedName: (value) => calls.push(['set-name-input', value]),
    showMultiSelectionFields: () => {
      calls.push(['multi']);
      return 'multi-result';
    },
    showSingleSelectionFields: showSingleSelectionFieldsAdapter,
    writeObjectProperties: writeObjectPropertiesAdapter,
    writeUvControls: writeUvControlsAdapter,
    showToastMessage: (message, duration) => {
      calls.push(['toast', message, duration]);
      return 'toast-result';
    },
    updateExportButtonLabel: (hasExportableItems, labels) => {
      calls.push(['export-label', hasExportableItems, labels]);
      return 'export-label-result';
    },
    hasExportableSelectionCommand: (selectedObject, multiSelection) => {
      calls.push(['has-export', selectedObject, multiSelection]);
      return true;
    },
    runSelectedPositionUpdateCommand: ({ selectedObject, readPositionInputs: readInputs }) => {
      calls.push(['position', selectedObject, readInputs()]);
      return 'position-result';
    },
    runSelectedRotationUpdateCommand: ({ selectedObject, readRotationDegreeInputs: readInputs }) => {
      calls.push(['rotation', selectedObject, readInputs()]);
      return 'rotation-result';
    },
    runSelectedScaleUpdateCommand: ({ selectedObject, readScaleInputs: readInputs }) => {
      calls.push(['scale', selectedObject, readInputs()]);
      return 'scale-result';
    },
    runSelectedNameUpdateCommand: ({ selectedObject, value, setSelectedName }) => {
      setSelectedName(value);
      calls.push(['name', selectedObject, value]);
      return 'name-result';
    },
    runSelectedColorUpdateCommand: ({ selectedObject, hex, actionType, syncColorPickers, updatePropertiesPanel }) => {
      calls.push(['color-update', selectedObject, hex, actionType]);
      syncColorPickers(hex);
      updatePropertiesPanel();
      return 'color-result';
    },
    runSelectedMaterialUpdateCommand: ({ selectedObject, actionType, getMaterialInput }) => {
      calls.push(['material-update', selectedObject, actionType, getMaterialInput()]);
      return 'material-result';
    },
    runSelectedUvOffsetUpdateCommand: ({ selectedObject, readUvInputs }) => {
      calls.push(['uv-offset', selectedObject, readUvInputs()]);
      return 'uv-offset-result';
    },
    runSelectedUvRepeatUpdateCommand: ({ selectedObject, readUvInputs }) => {
      calls.push(['uv-repeat', selectedObject, readUvInputs()]);
      return 'uv-repeat-result';
    },
    runSelectedUvRotationUpdateCommand: ({ selectedObject, readUvInputs }) => {
      calls.push(['uv-rotation', selectedObject, readUvInputs()]);
      return 'uv-rotation-result';
    },
  });

  assert.equal(controller.updatePropertiesPanel(), 'rendered');
  let call = calls.shift();
  assert.equal(call[0], 'render');
  assert.equal(call[1], selectedMesh);
  assert.equal(call[2].userObjects, userObjects);
  assert.equal(call[2].bonesVisible, true);
  assert.equal(call[2].radToDeg, radToDeg);
  assert.equal(call[2].showSingleSelectionFields, showSingleSelectionFieldsAdapter);
  assert.equal(call[2].writeObjectProperties, writeObjectPropertiesAdapter);
  assert.equal(call[2].setColorInput, setColorInputAdapter);
  assert.equal(call[2].setMaterialInput, setMaterialInputAdapter);
  assert.equal(call[2].writeUvControls, writeUvControlsAdapter);
  assert.equal(call[2].setActionButtonVisibility, setActionButtonVisibilityAdapter);
  assert.equal(controller.showMultiSelectionPanel(), 'multi-result');
  assert.deepEqual(calls.shift(), ['multi']);

  assert.equal(controller.clearPropertiesPanel(), true);
  assert.deepEqual(calls.splice(0, 2), [
    ['clear', 'NO OBJECT'],
    ['refresh-list'],
  ]);

  assert.equal(controller.updatePosition(), 'position-result');
  assert.deepEqual(calls.shift(), ['position', selectedMesh, { x: 1, y: 2, z: 3 }]);
  assert.equal(controller.updateRotation(), 'rotation-result');
  assert.deepEqual(calls.shift(), ['rotation', selectedMesh, { x: 10, y: 20, z: 30 }]);
  assert.equal(controller.updateScale(), 'scale-result');
  assert.deepEqual(calls.shift(), ['scale', selectedMesh, { x: 2, y: 3, z: 4 }]);
  assert.equal(controller.updateName('BODY'), 'name-result');
  assert.deepEqual(calls.splice(0, 2), [
    ['set-name-input', 'BODY'],
    ['name', selectedMesh, 'BODY'],
  ]);

  assert.equal(controller.updateColorFromPanel('#abcdef'), 'color-result');
  assert.equal(calls.shift()[0], 'color-update');
  assert.deepEqual(calls.shift(), ['sync-inputs', '#abcdef']);
  call = calls.shift();
  assert.equal(call[0], 'render');
  assert.equal(call[1], selectedMesh);
  assert.equal(controller.updateMaterialFromPanel(), 'material-result');
  assert.deepEqual(calls.shift(), ['material-update', selectedMesh, 'CHANGE MATERIAL', 'Phong']);

  assert.equal(controller.updateUVOffset(), 'uv-offset-result');
  assert.deepEqual(calls.shift(), ['uv-offset', selectedMesh, {
    offsetX: 0.25,
    offsetY: 0.5,
    repeatX: 2,
    repeatY: 3,
    rotationDeg: 45,
  }]);
  assert.equal(controller.updateUVRepeat(), 'uv-repeat-result');
  assert.deepEqual(calls.shift(), ['uv-repeat', selectedMesh, {
    offsetX: 0.25,
    offsetY: 0.5,
    repeatX: 2,
    repeatY: 3,
    rotationDeg: 45,
  }]);
  assert.equal(controller.updateUVRotation(), 'uv-rotation-result');
  assert.deepEqual(calls.shift(), ['uv-rotation', selectedMesh, {
    offsetX: 0.25,
    offsetY: 0.5,
    repeatX: 2,
    repeatY: 3,
    rotationDeg: 45,
  }]);

  assert.equal(controller.showToast('Saved'), 'toast-result');
  assert.deepEqual(calls.shift(), ['toast', 'Saved', 2000]);
  controller.applyColorToAll('#ffffff');
  assert.deepEqual(calls.shift(), ['set-color', selectedMesh, '#ffffff']);
  assert.equal(controller.syncColorPickers('#123456'), 'synced');
  assert.deepEqual(calls.shift(), ['sync-inputs', '#123456']);

  assert.equal(controller.updateExportButtonText(), 'export-label-result');
  call = calls.shift();
  assert.equal(call[0], 'has-export');
  assert.equal(call[1], selectedMesh);
  assert.equal(call[2], selectedMeshes);
  assert.deepEqual(calls.shift(), ['export-label', true, {
    selection: 'EXPORT SELECTION',
    default: 'EXPORT GLB',
  }]);
  assert.equal(calls.length, 0);

  bonesVisible = false;
  selectedObject = null;
  assert.equal(controller.updatePropertiesPanel(), 'rendered');
  call = calls.shift();
  assert.equal(call[0], 'render');
  assert.equal(call[1], null);
  assert.equal(call[2].bonesVisible, false);
  assert.equal(calls.length, 0);

  const explicitStateGetter = createUIRuntimeStateGetter({
    getUIState: () => ({
      selectedObject: null,
      selectedMeshes: 'selected-from-state',
      userObjects: null,
      bonesVisible: false,
    }),
    getSelectedObject: () => 'legacy-selected',
    getSelectedMeshes: () => 'legacy-selection-set',
    getUserObjects: () => 'legacy-objects',
    getBonesVisible: () => true,
  });
  assert.deepEqual(explicitStateGetter(), {
    selectedObject: null,
    selectedMeshes: 'selected-from-state',
    userObjects: null,
    bonesVisible: false,
  });

  const aliasStateGetter = createUIRuntimeStateGetter({
    getUIState: () => ({ selectedMesh: 'selected-mesh-alias' }),
  });
  assert.equal(aliasStateGetter().selectedObject, 'selected-mesh-alias');

  const legacyStateGetter = createUIRuntimeStateGetter({
    getSelectedObject: () => 'legacy-selected',
    getSelectedMeshes: () => 'legacy-selection-set',
    getUserObjects: () => 'legacy-objects',
    getBonesVisible: () => true,
  });
  assert.deepEqual(legacyStateGetter(), {
    selectedObject: 'legacy-selected',
    selectedMeshes: 'legacy-selection-set',
    userObjects: 'legacy-objects',
    bonesVisible: true,
  });
});

test('builds browser UI controller adapter through injected facade factory', () => {
  const uiState = { id: 'browser-ui-state' };
  const root = { id: 'ui-root' };
  const domRoots = [];
  const initialRefresh = () => 'initial-refresh';
  const nextRefresh = () => 'next-refresh';
  const extraHook = () => 'extra-hook';
  const materialDom = {
    syncColorInputs: () => 'sync-result',
  };
  const propertiesPanelDom = {
    clearSelectionPanel: () => 'clear-panel',
    getMaterialInput: () => 'material-input',
    readPositionInputs: () => 'position-inputs',
    readRotationDegreeInputs: () => 'rotation-inputs',
    readScaleInputs: () => 'scale-inputs',
    readUvInputs: () => 'uv-inputs',
    setActionButtonVisibility: () => 'action-visibility',
    setColorInput: () => 'color-input',
    setMaterialInput: () => 'material-set',
    setSelectedName: () => 'selected-name',
    showMultiSelectionFields: () => 'multi-fields',
    showSingleSelectionFields: () => 'single-fields',
    writeObjectProperties: () => 'object-properties',
    writeUvControls: () => 'uv-controls',
  };
  const toastDom = {
    showToastMessage: () => 'toast-message',
  };
  const exportButtonDom = {
    updateExportButtonLabel: () => 'export-label',
  };
  const facade = {
    applyColorToAll: () => 'apply-result',
    clearPropertiesPanel: () => 'clear-result',
    showMultiSelectionPanel: () => 'multi-result',
    showToast: () => 'toast-result',
    syncColorPickers: () => 'sync-result',
    updateColorFromPanel: () => 'color-result',
    updateExportButtonText: () => 'export-result',
    updateMaterialFromPanel: () => 'material-result',
    updateName: () => 'name-result',
    updatePosition: () => 'position-result',
    updatePropertiesPanel: () => 'properties-result',
    updateRotation: () => 'rotation-result',
    updateScale: () => 'scale-result',
    updateUVOffset: () => 'uv-offset-result',
    updateUVRepeat: () => 'uv-repeat-result',
    updateUVRotation: () => 'uv-rotation-result',
  };
  let facadeOptions = null;

  const result = createBrowserUIController({
    root,
    getUIState: () => uiState,
    initialHooks: { refreshSceneObjectList: initialRefresh },
    createMaterialDom: (options) => {
      domRoots.push(['material', options.root]);
      return materialDom;
    },
    createPropertiesPanelDom: (options) => {
      domRoots.push(['properties', options.root]);
      return propertiesPanelDom;
    },
    createToastDom: (options) => {
      domRoots.push(['toast', options.root]);
      return toastDom;
    },
    createExportButtonDom: (options) => {
      domRoots.push(['export', options.root]);
      return exportButtonDom;
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result.updatePropertiesPanel(), 'properties-result');
  assert.equal(typeof result.configureUIHooks, 'function');
  assert.equal(facadeOptions.getUIState(), uiState);
  assert.equal(facadeOptions.getHooks().refreshSceneObjectList, initialRefresh);
  assert.equal(result.configureUIHooks({
    refreshSceneObjectList: nextRefresh,
    extraHook,
  }), undefined);
  assert.equal(facadeOptions.getHooks().refreshSceneObjectList, nextRefresh);
  assert.equal(facadeOptions.getHooks().extraHook, extraHook);
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.equal(typeof facadeOptions.radToDeg, 'function');
  assert.equal(typeof facadeOptions.setColor, 'function');
  assert.equal(typeof facadeOptions.updateMaterialType, 'function');
  assert.deepEqual(domRoots, [
    ['material', root],
    ['properties', root],
    ['toast', root],
    ['export', root],
  ]);
  assert.equal(facadeOptions.syncColorInputs(), 'sync-result');
  assert.equal(typeof facadeOptions.pushAction, 'function');
  assert.equal(typeof facadeOptions.rememberTextureTransform, 'function');
  assert.equal(typeof facadeOptions.renderSelectedObjectPropertiesCommand, 'function');
  assert.equal(facadeOptions.clearSelectionPanel(), 'clear-panel');
  assert.equal(facadeOptions.getMaterialInput(), 'material-input');
  assert.equal(facadeOptions.readPositionInputs(), 'position-inputs');
  assert.equal(facadeOptions.readRotationDegreeInputs(), 'rotation-inputs');
  assert.equal(facadeOptions.readScaleInputs(), 'scale-inputs');
  assert.equal(facadeOptions.readUvInputs(), 'uv-inputs');
  assert.equal(facadeOptions.setActionButtonVisibility(), 'action-visibility');
  assert.equal(facadeOptions.setColorInput(), 'color-input');
  assert.equal(facadeOptions.setMaterialInput(), 'material-set');
  assert.equal(facadeOptions.setSelectedName(), 'selected-name');
  assert.equal(facadeOptions.showMultiSelectionFields(), 'multi-fields');
  assert.equal(facadeOptions.showSingleSelectionFields(), 'single-fields');
  assert.equal(facadeOptions.writeObjectProperties(), 'object-properties');
  assert.equal(facadeOptions.writeUvControls(), 'uv-controls');
  assert.equal(facadeOptions.showToastMessage(), 'toast-message');
  assert.equal(facadeOptions.updateExportButtonLabel(), 'export-label');
  assert.equal(typeof facadeOptions.hasExportableSelectionCommand, 'function');
});

test('presents selected object properties through injected DOM adapters', () => {
  const userObjects = new THREE.Group();
  const pivot = new THREE.Group();
  const texture = new THREE.Texture();
  const childMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhongMaterial({ color: '#123456', map: texture })
  );
  pivot.userData.name = 'BODY';
  pivot.userData.isPivot = true;
  pivot.add(childMesh);
  userObjects.add(pivot);

  const calls = [];
  const rendered = renderSelectedObjectProperties(pivot, {
    userObjects,
    bonesVisible: true,
    radToDeg: THREE.MathUtils.radToDeg,
    showSingleSelectionFields: () => calls.push(['show-single']),
    writeObjectProperties: (object, converter) => calls.push(['write-object', object, converter]),
    setColorInput: (hex) => calls.push(['set-color', hex]),
    syncColorPickers: (hex) => calls.push(['sync-color', hex]),
    setMaterialInput: (type) => calls.push(['set-material', type]),
    writeUvControls: (tex, converter) => calls.push(['write-uv', tex, converter]),
    setActionButtonVisibility: (visibility) => calls.push(['visibility', visibility]),
  });

  assert.equal(rendered, true);
  assert.deepEqual(calls, [
    ['show-single'],
    ['write-object', pivot, THREE.MathUtils.radToDeg],
    ['set-color', '#123456'],
    ['sync-color', '#123456'],
    ['set-material', 'Phong'],
    ['write-uv', texture, THREE.MathUtils.radToDeg],
    ['visibility', {
      isGroup: true,
      isInGroup: false,
      showBone: true,
      hasParentPivot: false,
    }],
  ]);
  assert.equal(getUvTextureForObject(childMesh), texture);
  assert.equal(renderSelectedObjectProperties(null, {
    showSingleSelectionFields: () => calls.push(['unexpected']),
  }), false);
});

test('manages properties panel DOM fields and visibility', () => {
  const createClassList = (initial = []) => {
    const classes = new Set(initial);
    return {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    };
  };
  const createElement = (classes = []) => ({
    value: '',
    textContent: '',
    src: '',
    classList: createClassList(classes),
  });
  const ids = [
    'scene-info-view', 'properties-panel', 'single-selection-fields', 'multi-selection-fields',
    'selected-overlay', 'selected-name', 'prop-name',
    'prop-posx', 'prop-posy', 'prop-posz', 'prop-rotx', 'prop-roty', 'prop-rotz',
    'prop-scalex', 'prop-scaley', 'prop-scalez',
    'btn-ungroup', 'bone-controls', 'btn-detach-bone', 'btn-anim-mode', 'btn-copy-json-group',
    'uv-controls', 'texture-preview', 'uv-offset-x', 'uv-offset-y', 'uv-repeat-x', 'uv-repeat-y', 'uv-rotation',
  ];
  const elements = new Map(ids.map((id) => [id, createElement(['hidden'])]));
  const root = { getElementById: (id) => elements.get(id) || null };
  const object = {
    userData: { name: 'BODY' },
    position: { x: 1, y: 2, z: 3 },
    rotation: { x: Math.PI / 2, y: 0, z: Math.PI },
    scale: { x: 1, y: 1.5, z: 2 },
  };

  showSingleSelectionFields(root);
  assert.equal(elements.get('single-selection-fields').classList.contains('hidden'), false);
  assert.equal(elements.get('multi-selection-fields').classList.contains('hidden'), true);

  writeObjectProperties(object, THREE.MathUtils.radToDeg, root);
  assert.equal(elements.get('prop-name').value, 'BODY');
  assert.equal(elements.get('selected-name').textContent, 'BODY');
  assert.equal(elements.get('prop-posx').value, '1.00');
  assert.equal(elements.get('prop-rotx').value, '90.0');
  assert.equal(elements.get('prop-scalez').value, '2.00');

  elements.get('prop-posx').value = '5';
  elements.get('prop-roty').value = '45';
  elements.get('prop-scaley').value = '3';
  assert.deepEqual(readPositionInputs(root), { x: 5, y: 2, z: 3 });
  assert.equal(readRotationDegreeInputs(root).y, 45);
  assert.equal(readScaleInputs(root).y, 3);

  setActionButtonVisibility({ isGroup: true, isInGroup: false, showBone: true, hasParentPivot: false }, root);
  assert.equal(elements.get('btn-ungroup').classList.contains('hidden'), false);
  assert.equal(elements.get('bone-controls').classList.contains('hidden'), false);
  assert.equal(elements.get('btn-detach-bone').classList.contains('hidden'), true);

  showMultiSelectionFields(root);
  assert.equal(elements.get('multi-selection-fields').classList.contains('hidden'), false);

  clearSelectionPanel('NO OBJECT', root);
  assert.equal(elements.get('properties-panel').classList.contains('hidden'), true);
  assert.equal(elements.get('scene-info-view').classList.contains('hidden'), false);
  assert.equal(elements.get('selected-name').textContent, 'NO OBJECT');

  const propertiesDom = createPropertiesPanelDomAdapter({ root });
  propertiesDom.showSingleSelectionFields();
  assert.equal(elements.get('single-selection-fields').classList.contains('hidden'), false);
  propertiesDom.setSelectedName('ADAPTER');
  assert.equal(elements.get('selected-name').textContent, 'ADAPTER');
  propertiesDom.setActionButtonVisibility({
    isGroup: false,
    isInGroup: false,
    showBone: false,
    hasParentPivot: true,
  });
  assert.equal(elements.get('btn-detach-bone').classList.contains('hidden'), false);
});

test('writes and reads UV controls through properties panel DOM adapter', () => {
  const createClassList = (initial = []) => {
    const classes = new Set(initial);
    return {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    };
  };
  const elements = new Map([
    ['uv-controls', { classList: createClassList(['hidden']) }],
    ['texture-preview', { classList: createClassList(['hidden']), src: '' }],
    ['uv-offset-x', { value: '' }],
    ['uv-offset-y', { value: '' }],
    ['uv-repeat-x', { value: '' }],
    ['uv-repeat-y', { value: '' }],
    ['uv-rotation', { value: '' }],
  ]);
  const root = { getElementById: (id) => elements.get(id) || null };
  const texture = {
    offset: { x: 0.25, y: 0.5 },
    repeat: { x: 2, y: 3 },
    rotation: Math.PI / 2,
    image: { src: 'data:image/png;base64,abc' },
  };

  writeUvControls(texture, THREE.MathUtils.radToDeg, root);
  assert.equal(elements.get('uv-controls').classList.contains('hidden'), false);
  assert.equal(elements.get('uv-offset-x').value, '0.25');
  assert.equal(elements.get('uv-repeat-y').value, '3.00');
  assert.equal(elements.get('uv-rotation').value, '90.0');
  assert.equal(elements.get('texture-preview').src, 'data:image/png;base64,abc');

  elements.get('uv-offset-x').value = '0.75';
  assert.equal(readUvInputs(root).offsetX, 0.75);

  const propertiesDom = createPropertiesPanelDomAdapter({ root });
  assert.equal(propertiesDom.readUvInputs().offsetX, 0.75);
  propertiesDom.writeUvControls(texture, THREE.MathUtils.radToDeg);
  assert.equal(elements.get('uv-repeat-x').value, '2.00');

  writeUvControls(null, THREE.MathUtils.radToDeg, root);
  assert.equal(elements.get('uv-controls').classList.contains('hidden'), true);
  assert.equal(elements.get('texture-preview').src, '');
});

test('renders toast DOM and export button label adapters', () => {
  const created = [];
  const container = {
    children: [],
    appendChild: (child) => container.children.push(child),
  };
  const root = {
    body: container,
    createElement: () => {
      const element = {
        className: '',
        textContent: '',
        style: {},
        removed: false,
        remove: () => { element.removed = true; },
      };
      created.push(element);
      return element;
    },
    getElementById: (id) => (id === 'toast-container' ? container : null),
  };
  const scheduled = [];

  const toast = showToastMessage('Saved', 123, root, (callback, duration) => scheduled.push({ callback, duration }));
  assert.equal(toast.textContent, 'Saved');
  assert.equal(container.children.length, 1);
  assert.equal(scheduled[0].duration, 123);
  scheduled[0].callback();
  assert.equal(toast.removed, true);

  const toastDom = createToastDomAdapter({
    root,
    schedule: (callback, duration) => scheduled.push({ callback, duration }),
  });
  assert.equal(toastDom.showToastMessage('Adapter', 456).textContent, 'Adapter');
  assert.equal(scheduled[1].duration, 456);

  const exportButton = { textContent: '' };
  const exportRoot = {
    getElementById: (id) => (id === 'btn-export' ? exportButton : null),
  };

  assert.equal(updateExportButtonLabel(true, { selection: 'EXPORT SELECTION', default: 'EXPORT GLB' }, exportRoot), true);
  assert.equal(exportButton.textContent, 'EXPORT SELECTION');
  updateExportButtonLabel(false, { selection: 'EXPORT SELECTION', default: 'EXPORT GLB' }, exportRoot);
  assert.equal(exportButton.textContent, 'EXPORT GLB');
  const exportButtonDom = createExportButtonDomAdapter({ root: exportRoot });
  exportButtonDom.updateExportButtonLabel(true, { selection: 'ADAPTER EXPORT', default: 'EXPORT GLB' });
  assert.equal(exportButton.textContent, 'ADAPTER EXPORT');

  assert.equal(hasExportableSelection(null, new Set()), false);
  assert.equal(hasExportableSelection({ id: 'mesh' }, new Set()), true);
  assert.equal(hasExportableSelection(null, new Set([{ id: 'a' }])), true);
});

test('selects GLB export sources by animation and selection priority', () => {
  const makeObject = (name) => {
    const object = new THREE.Group();
    object.userData.name = name;
    return object;
  };
  const root = new THREE.Group();
  const first = makeObject('FIRST');
  const second = makeObject('SECOND');
  const selected = makeObject('SELECTED');
  const modeObject = makeObject('MODE');
  root.add(first, second);

  assert.equal(hasSceneObjects({ userObjects: new THREE.Group() }), false);
  assert.equal(hasSceneObjects({ userObjects: root }), true);

  const allSource = createExportSource({
    userObjects: root,
    selectedMeshes: new Set(),
    selectedMesh: null,
    animationMode: false,
    animationModeObject: null,
  }, { GroupClass: THREE.Group });
  assert.equal(allSource.children.length, 2);
  assert.notEqual(allSource.children[0], first);
  assert.equal(allSource.children[0].userData.name, 'FIRST');

  const singleSource = createExportSource({
    userObjects: root,
    selectedMeshes: new Set(),
    selectedMesh: selected,
    animationMode: false,
    animationModeObject: null,
  }, { GroupClass: THREE.Group });
  assert.equal(singleSource.children.length, 1);
  assert.equal(singleSource.children[0].userData.name, 'SELECTED');

  const multiSource = createExportSource({
    userObjects: root,
    selectedMeshes: new Set([first, second]),
    selectedMesh: selected,
    animationMode: false,
    animationModeObject: null,
  }, { GroupClass: THREE.Group });
  assert.deepEqual(multiSource.children.map((child) => child.userData.name), ['FIRST', 'SECOND']);

  const modeSource = createExportSource({
    userObjects: root,
    selectedMeshes: new Set([first, second]),
    selectedMesh: selected,
    animationMode: true,
    animationModeObject: modeObject,
  }, { GroupClass: THREE.Group });
  assert.deepEqual(modeSource.children.map((child) => child.userData.name), ['MODE']);
});

test('prepares GLB export graph materials names textures and clips', () => {
  const exportGroup = new THREE.Group();
  exportGroup.userData.name = 'ROOT';
  exportGroup.userData.animations = [{ name: 'idle' }];

  const pivot = new THREE.Group();
  pivot.userData.name = 'BODY';
  pivot.userData.isPivot = true;

  const texture = new THREE.Texture();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({
      color: '#123456',
      emissive: '#999999',
      map: texture,
    })
  );
  mesh.userData.name = 'BODY_MESH';
  pivot.add(mesh);
  exportGroup.add(pivot);

  const clonedTextures = [];
  const clips = prepareExportGroup(exportGroup, {
    MeshStandardMaterialClass: THREE.MeshStandardMaterial,
    ColorClass: THREE.Color,
    cloneTexture: (source) => {
      const clone = source.clone();
      clonedTextures.push(source);
      return clone;
    },
    compileAnimation: (animationDefinition, target) => ({
      name: `${target.userData.name}:${animationDefinition.name}`,
    }),
  });

  assert.equal(exportGroup.name, 'ROOT');
  assert.equal(pivot.name, 'BODY');
  assert.equal(mesh.name, '');
  assert.equal(mesh.material.isMeshStandardMaterial, true);
  assert.equal(mesh.material.color.getHex(), 0x123456);
  assert.equal(mesh.material.wireframe, false);
  assert.equal(mesh.material.roughness, 0.8);
  assert.equal(mesh.material.metalness, 0.1);
  assert.equal(mesh.material.emissive.getHex(), 0x000000);
  assert.equal(mesh.material.emissiveIntensity, 0);
  assert.notEqual(mesh.material.map, texture);
  assert.equal(clonedTextures.length, 2);
  assert.deepEqual(clips, [{ name: 'ROOT:idle' }]);

  const named = new THREE.Group();
  named.userData.name = 'NAMED';
  assert.equal(applyExportNodeName(named), true);
  assert.equal(named.name, 'NAMED');
  assert.deepEqual(collectAnimationClips({ userData: {} }, { clips: [] }), []);
});

test('runs GLB export flow through injected exporter browser and graph adapters', async () => {
  const alerts = [];
  const translate = (key) => `t:${key}`;

  assert.deepEqual(await exportGLBFlow({
    exportState: { userObjects: { children: [] } },
    hasSceneObjectsCommand: () => false,
    alertUser: (message) => alerts.push(message),
    translate,
  }), { success: false, reason: 'empty-scene' });
  assert.deepEqual(alerts, ['t:noObjectsToExport']);

  const calls = [];
  const exportState = { id: 'state' };
  const exportGroup = { id: 'export-group' };
  const clips = [{ name: 'idle' }];
  const blob = { id: 'blob' };
  class GroupClass {}
  class MeshStandardMaterialClass {}
  class ColorClass {}
  class SuccessfulExporter {
    parse(group, onDone, onError, options) {
      calls.push(['parse', group, options]);
      onDone('binary-result');
    }
  }

  const success = await exportGLBFlow({
    exportState,
    GroupClass,
    MeshStandardMaterialClass,
    ColorClass,
    compileAnimation,
    cloneTexture: (texture) => texture,
    hasSceneObjectsCommand: (stateRef) => {
      calls.push(['has-objects', stateRef]);
      return true;
    },
    createExportSourceCommand: (stateRef, options) => {
      assert.equal(stateRef, exportState);
      assert.equal(options.GroupClass, GroupClass);
      calls.push(['source']);
      return exportGroup;
    },
    prepareExportGroupCommand: (group, options) => {
      assert.equal(group, exportGroup);
      assert.equal(options.MeshStandardMaterialClass, MeshStandardMaterialClass);
      assert.equal(options.ColorClass, ColorClass);
      assert.equal(options.compileAnimation, compileAnimation);
      calls.push(['prepare']);
      return clips;
    },
    loadGLTFExporter: async () => {
      calls.push(['load-exporter']);
      return SuccessfulExporter;
    },
    createBlob: (parts, options) => {
      calls.push(['blob', parts, options]);
      return blob;
    },
    downloadBlob: (targetBlob, filename) => calls.push(['download', targetBlob, filename]),
    translate,
  });
  assert.equal(success.success, true);
  assert.equal(success.exportGroup, exportGroup);
  assert.deepEqual(success.clips, clips);
  assert.deepEqual(success.options, { binary: true, animations: clips });
  assert.equal(success.blob, blob);
  assert.deepEqual(calls, [
    ['has-objects', exportState],
    ['source'],
    ['prepare'],
    ['load-exporter'],
    ['parse', exportGroup, { binary: true, animations: clips }],
    ['blob', ['binary-result'], { type: 'application/octet-stream' }],
    ['download', blob, 'lowpoly64-scene.glb'],
  ]);

  const errorCalls = [];
  const exportError = new Error('boom');
  class FailingExporter {
    parse(group, onDone, onError) {
      onError(exportError);
    }
  }
  const failure = await exportGLBFlow({
    exportState,
    GroupClass,
    hasSceneObjectsCommand: () => true,
    createExportSourceCommand: () => exportGroup,
    prepareExportGroupCommand: () => [],
    loadGLTFExporter: async () => FailingExporter,
    createBlob: () => blob,
    downloadBlob: () => errorCalls.push(['unexpected-download']),
    alertUser: (message) => errorCalls.push(['alert', message]),
    logError: (label, error) => errorCalls.push(['log', label, error.message]),
    translate,
  });
  assert.equal(failure.success, false);
  assert.equal(failure.error, exportError);
  assert.deepEqual(errorCalls, [
    ['log', 'Export error:', 'boom'],
    ['alert', 't:exportErrorboom'],
  ]);
});

test('builds browser GLB exporter adapter through injected flow factory', async () => {
  const exportState = { id: 'browser-export-state' };
  const blob = { id: 'blob' };
  class GroupClass {}
  class MeshStandardMaterialClass {}
  class ColorClass {}
  const compileAnimationCommand = () => {};
  const cloneTextureCommand = () => {};
  const loadGLTFExporter = async () => {};
  const createBlob = () => blob;
  const downloadBlobCommand = () => {};
  const alertUser = () => {};
  const logError = () => {};
  const translate = (key) => `t:${key}`;
  let flowOptions = null;

  const exporter = createBrowserGLBExporter({
    exportState,
    GroupClass,
    MeshStandardMaterialClass,
    ColorClass,
    compileAnimationCommand,
    cloneTextureCommand,
    loadGLTFExporter,
    createBlob,
    downloadBlobCommand,
    alertUser,
    logError,
    translate,
    exportGLBCommand: async (options) => {
      flowOptions = options;
      return 'export-result';
    },
  });

  assert.equal(await exporter.exportGLB(), 'export-result');
  assert.equal(flowOptions.exportState, exportState);
  assert.equal(flowOptions.GroupClass, GroupClass);
  assert.equal(flowOptions.MeshStandardMaterialClass, MeshStandardMaterialClass);
  assert.equal(flowOptions.ColorClass, ColorClass);
  assert.equal(flowOptions.compileAnimation, compileAnimationCommand);
  assert.equal(flowOptions.cloneTexture, cloneTextureCommand);
  assert.equal(flowOptions.loadGLTFExporter, loadGLTFExporter);
  assert.equal(flowOptions.createBlob, createBlob);
  assert.equal(flowOptions.downloadBlob, downloadBlobCommand);
  assert.equal(flowOptions.alertUser, alertUser);
  assert.equal(flowOptions.logError, logError);
  assert.equal(flowOptions.translate, translate);
});

test('compiles animation clips without runtime animation state', () => {
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.userData.name = 'BODY';
  group.add(body);

  const clip = compileAnimation({
    name: 'jump',
    duration: 1,
    loop: false,
    tracks: [
      {
        target: 'BODY',
        property: 'position',
        keyframes: [
          { time: 0, value: [0, 0, 0] },
          { time: 1, value: [0, 1, 0] },
        ],
      },
      {
        target: 'BODY',
        property: 'visible',
        keyframes: [
          { time: 0, value: [1] },
          { time: 1, value: [0] },
        ],
      },
    ],
  }, group);

  assert.equal(clip.name, 'jump');
  assert.equal(clip.duration, 1);
  assert.equal(clip.userData.loop, false);
  assert.equal(clip.tracks.length, 2);
  assert.equal(body.name, 'BODY');
});

test('renders template list DOM with translated labels and callbacks', () => {
  const createClassList = () => {
    const classes = new Set();
    return {
      toggle: (name) => {
        if (classes.has(name)) classes.delete(name);
        else classes.add(name);
      },
      contains: (name) => classes.has(name),
    };
  };
  const createElement = (tagName = 'div') => {
    const children = [];
    const listeners = new Map();
    return {
      tagName,
      className: '',
      textContent: '',
      innerHTML: '',
      classList: createClassList(),
      addEventListener: (event, callback) => listeners.set(event, callback),
      click: () => listeners.get('click')?.(),
      append: (...items) => children.push(...items),
      appendChild: (child) => children.push(child),
      replaceChildren: () => { children.length = 0; },
      get children() { return children; },
    };
  };
  const container = createElement();
  const root = { createElement };
  const categories = new Map([
    ['Mobiliario', [{ id: 'chair', name: 'Chair' }]],
    ['Custom', [{ id: 'custom_asset', name: 'Custom Asset' }]],
  ]);
  const selected = [];

  const rendered = renderTemplateList(container, categories, {
    onTemplateSelected: (id) => selected.push(id),
    translate: (key) => `t:${key}`,
  }, root);

  assert.equal(rendered, true);
  assert.equal(container.children.length, 2);
  const firstSection = container.children[0];
  const firstHeader = firstSection.children[0];
  const firstList = firstSection.children[1];
  assert.equal(firstHeader.children[0].textContent, 'T:CATMOBILIARIO');
  assert.equal(firstList.children[0].children[0].textContent, 't:tplSilla');

  firstList.children[0].click();
  assert.deepEqual(selected, ['chair']);

  firstHeader.click();
  assert.equal(firstList.classList.contains('hidden'), true);
  assert.equal(firstHeader.children[1].innerHTML, '&#9654;');

  const customSection = container.children[1];
  assert.equal(customSection.children[0].children[0].textContent, 'CUSTOM');
  assert.equal(customSection.children[1].children[0].children[0].textContent, 'Custom Asset');

  const adapterContainer = createElement();
  const templateListDom = createTemplateListDomAdapter({ root });
  templateListDom.renderTemplateList(adapterContainer, categories, {
    translate: (key) => `dom:${key}`,
  });
  assert.equal(adapterContainer.children.length, 2);
  assert.equal(adapterContainer.children[0].children[0].children[0].textContent, 'DOM:CATMOBILIARIO');

  assert.equal(renderTemplateList(createElement(), categories), false);
});

test('coordinates template controller through injected runtime getters and render adapters', () => {
  const registry = [
    { id: 'chair', category: 'Props', name: 'Chair' },
    { id: 'hero', category: 'Characters', name: 'Hero' },
  ];
  const userObjects = { id: 'user-objects' };
  const selectedMesh = { id: 'selected' };
  let currentMaterialType = 'Lambert';
  const group = { id: 'group' };
  const categories = new Map([['Props', [registry[0]]]]);
  const calls = [];
  const createMaterialAdapter = () => {};
  const compileAnimationAdapter = () => {};

  const controller = createTemplateController({
    registry,
    createMaterial: createMaterialAdapter,
    getTemplateState: () => ({
      currentMaterialType,
      selectedMesh,
      userObjects,
    }),
    selectMesh: (mesh) => calls.push(['select', mesh]),
    deselect: () => calls.push(['deselect']),
    pushAction: (action) => calls.push(['action', action]),
    compileAnimation: compileAnimationAdapter,
    translate: (key) => ({ actionCreateTemplate: 'CREATE TEMPLATE' })[key] || key,
    onMissingTemplate: (id) => calls.push(['missing', id]),
    buildTemplateGroupForRuntimeCommand: (definition, options) => {
      calls.push([
        'build-runtime',
        definition.id,
        options.compileAnimations,
        options.getMaterialType(),
        options.createMaterial,
        options.compileAnimation,
      ]);
      return group;
    },
    addTemplateFromRegistryCommand: (id, options) => {
      calls.push([
        'add-runtime',
        id,
        options.registry,
        options.userObjects,
        options.getSelectedMesh(),
        options.actionType,
      ]);
      const builtGroup = options.buildGroup(registry[1]);
      options.onMissingTemplate('missing-template');
      return builtGroup;
    },
    getTemplateCategoriesFromRegistryCommand: (items) => {
      calls.push(['categories', items]);
      return categories;
    },
    renderTemplateListCommand: (container, renderedCategories, handlers) => {
      calls.push(['render-list', container, renderedCategories, handlers.translate('actionCreateTemplate')]);
      handlers.onTemplateSelected('hero');
      return 'rendered-list';
    },
  });

  assert.equal(controller.buildGroupFromDefinition(registry[0], { compileAnimations: false }), group);
  assert.deepEqual(calls.shift(), [
    'build-runtime',
    'chair',
    false,
    'Lambert',
    createMaterialAdapter,
    compileAnimationAdapter,
  ]);

  currentMaterialType = 'Standard';
  assert.equal(controller.addTemplate('hero'), group);
  assert.deepEqual(calls.shift(), [
    'add-runtime',
    'hero',
    registry,
    userObjects,
    selectedMesh,
    'CREATE TEMPLATE',
  ]);
  assert.deepEqual(calls.shift(), [
    'build-runtime',
    'hero',
    true,
    'Standard',
    createMaterialAdapter,
    compileAnimationAdapter,
  ]);
  assert.deepEqual(calls.shift(), ['missing', 'missing-template']);

  assert.equal(controller.getCategories(), categories);
  assert.deepEqual(calls.shift(), ['categories', registry]);

  const container = { id: 'container' };
  assert.equal(controller.generateTemplateListUI(container), 'rendered-list');
  assert.deepEqual(calls.shift(), ['categories', registry]);
  assert.deepEqual(calls.shift(), ['render-list', container, categories, 'CREATE TEMPLATE']);
  assert.deepEqual(calls.shift(), [
    'add-runtime',
    'hero',
    registry,
    userObjects,
    selectedMesh,
    'CREATE TEMPLATE',
  ]);
  assert.deepEqual(calls.shift(), [
    'build-runtime',
    'hero',
    true,
    'Standard',
    createMaterialAdapter,
    compileAnimationAdapter,
  ]);
  assert.deepEqual(calls.shift(), ['missing', 'missing-template']);
  assert.equal(calls.length, 0);

  const explicitStateGetter = createTemplateRuntimeStateGetter({
    getTemplateState: () => ({
      materialType: 'Physical',
      selectedMesh: 'selected-from-state',
      userObjects: 'objects-from-state',
    }),
    getMaterialType: () => 'legacy-material',
    getSelectedMesh: () => 'legacy-selected',
    getUserObjects: () => 'legacy-objects',
  });
  assert.deepEqual(explicitStateGetter(), {
    currentMaterialType: 'Physical',
    selectedMesh: 'selected-from-state',
    userObjects: 'objects-from-state',
  });

  const legacyStateGetter = createTemplateRuntimeStateGetter({
    getMaterialType: () => 'legacy-material',
    getSelectedMesh: () => 'legacy-selected',
    getUserObjects: () => 'legacy-objects',
  });
  assert.deepEqual(legacyStateGetter(), {
    currentMaterialType: 'legacy-material',
    selectedMesh: 'legacy-selected',
    userObjects: 'legacy-objects',
  });
});

test('builds browser template controller adapter through injected facade factory', () => {
  const templateState = { id: 'browser-template-state' };
  const registry = [{ id: 'browser-template', name: 'Browser Template' }];
  const missingCalls = [];
  const root = { id: 'template-root' };
  const domRoots = [];
  const facade = {
    addTemplate: () => 'add-result',
    buildGroupFromDefinition: () => 'build-result',
    generateTemplateListUI: () => 'list-result',
    getCategories: () => 'categories-result',
  };
  let facadeOptions = null;

  const result = createBrowserTemplateController({
    registry,
    root,
    getTemplateState: () => templateState,
    onMissingTemplate: (id) => missingCalls.push(id),
    createTemplateListDom: ({ root: domRoot }) => {
      domRoots.push(domRoot);
      return { renderTemplateList: () => 'render-template-list-result' };
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.registry, registry);
  assert.equal(facadeOptions.getTemplateState(), templateState);
  assert.deepEqual(domRoots, [root]);
  assert.equal(facadeOptions.renderTemplateListCommand(), 'render-template-list-result');
  assert.equal(typeof facadeOptions.createMaterial, 'function');
  assert.equal(typeof facadeOptions.selectMesh, 'function');
  assert.equal(typeof facadeOptions.deselect, 'function');
  assert.equal(typeof facadeOptions.pushAction, 'function');
  assert.equal(typeof facadeOptions.compileAnimation, 'function');
  assert.equal(typeof facadeOptions.translate, 'function');
  facadeOptions.onMissingTemplate('missing-template');
  assert.deepEqual(missingCalls, ['missing-template']);
});

test('runs template registry and runtime insertion flow with injected dependencies', () => {
  const registry = [
    { id: 'chair', category: 'Props', name: 'Chair' },
    { id: 'table', category: 'Props', name: 'Table' },
    { id: 'hero', category: 'Characters', name: 'Hero' },
  ];
  const categories = getTemplateCategoriesFromRegistry(registry);
  const calls = [];
  const userObjects = { id: 'userObjects' };
  const group = { id: 'group' };

  assert.equal(findTemplateById(registry, 'table'), registry[1]);
  assert.equal(findTemplateById(registry, 'missing'), null);
  assert.deepEqual([...categories.keys()], ['Props', 'Characters']);
  assert.deepEqual(categories.get('Props'), [registry[0], registry[1]]);

  const built = buildTemplateGroupForRuntime(registry[0], {
    compileAnimations: false,
    compileAnimation: (animation) => animation,
    createMaterial: (type) => type,
    getMaterialType: () => 'Phong',
    buildTemplateGroup: (definition, options) => ({ definition, options }),
  });

  assert.equal(built.definition, registry[0]);
  assert.equal(built.options.compileAnimations, false);
  assert.equal(built.options.materialType, 'Phong');

  const inserted = addTemplateFromRegistry('hero', {
    registry,
    buildGroup: (definition) => {
      calls.push(['build', definition.id]);
      return group;
    },
    insertTemplate: (insertedGroup, options) => {
      calls.push(['insert', insertedGroup, options.userObjects, options.actionType]);
      return insertedGroup;
    },
    userObjects,
    getSelectedMesh: () => null,
    selectMesh: () => calls.push(['select']),
    deselect: () => calls.push(['deselect']),
    pushAction: () => calls.push(['push']),
    actionType: 'Create template',
    onMissingTemplate: (id) => calls.push(['missing', id]),
  });

  assert.equal(inserted, group);
  assert.equal(addTemplateFromRegistry('missing', {
    registry,
    buildGroup: () => group,
    onMissingTemplate: (id) => calls.push(['missing', id]),
  }), null);
  assert.deepEqual(calls, [
    ['build', 'hero'],
    ['insert', group, userObjects, 'Create template'],
    ['missing', 'missing'],
  ]);
});

test('builds template groups with injected material and animation compiler', () => {
  const materials = [];
  const animationCalls = [];
  const animation = { name: 'idle', duration: 1, tracks: [] };
  const definition = {
    name: 'BOT',
    pieces: [
      {
        name: 'BODY',
        geometry: { type: 'cube', params: { width: 2, height: 3, depth: 4 } },
        position: [0, 1, 0],
        pivot: [0, 0, 0],
        color: '#111111',
      },
      {
        name: 'HEAD',
        parent: 'BODY',
        geometry: { type: 'sphere', params: { radius: 1, widthSegments: 8, heightSegments: 6 } },
        position: [0, 3, 0],
        pivot: [0, 2, 0],
        color: '#222222',
      },
    ],
    animations: [animation],
  };

  const group = buildTemplateGroupFromDefinition(definition, {
    materialType: 'Phong',
    createMaterial: (type, options) => {
      materials.push({ type, color: options.color });
      return new THREE.MeshLambertMaterial({ color: options.color });
    },
    compileAnimation: (animationDefinition, target) => {
      animationCalls.push({ animationDefinition, target });
      return { name: `${animationDefinition.name}-clip` };
    },
  });

  assert.equal(group.userData.name, 'BOT');
  assert.equal(group.children.length, 1);

  const body = group.children[0];
  const bodyMesh = body.children.find((child) => child.isMesh);
  const head = body.children.find((child) => child.userData?.isPivot);
  const headMesh = head.children.find((child) => child.isMesh);

  assert.equal(body.userData.name, 'BODY');
  assert.equal(head.userData.name, 'HEAD');
  assert.deepEqual(head.position.toArray(), [0, 2, 0]);
  assert.deepEqual(bodyMesh.position.toArray(), [0, 1, 0]);
  assert.deepEqual(headMesh.position.toArray(), [0, 1, 0]);
  assert.deepEqual(materials, [
    { type: 'Phong', color: '#111111' },
    { type: 'Phong', color: '#222222' },
  ]);

  assert.deepEqual(group.userData.animations, [animation]);
  assert.notEqual(group.userData.animations[0], animation);
  assert.deepEqual(group.userData.animationClips, [{ name: 'idle-clip' }]);
  assert.equal(animationCalls.length, 1);
  assert.equal(animationCalls[0].target, group);
  assert.equal(animationCalls[0].animationDefinition, group.userData.animations[0]);
});

test('inserts template groups with undoable selection behavior', () => {
  const userObjects = new THREE.Group();
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  const nestedPivot = new THREE.Group();
  const actions = [];
  let selectedMesh = null;

  pivot.userData.isPivot = true;
  nestedPivot.userData.isPivot = true;
  pivot.add(nestedPivot);
  group.add(pivot);

  insertTemplateGroup(group, {
    userObjects,
    getSelectedMesh: () => selectedMesh,
    selectMesh: (mesh) => { selectedMesh = mesh; },
    deselect: () => { selectedMesh = null; },
    pushAction: (action) => actions.push(action),
    actionType: 'Create template',
  });

  assert.equal(userObjects.children.includes(group), true);
  assert.equal(selectedMesh, pivot);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'Create template');
  assert.equal(isObjectInsideGroup(group, nestedPivot), true);

  selectedMesh = nestedPivot;
  actions[0].undo();
  assert.equal(userObjects.children.includes(group), false);
  assert.equal(selectedMesh, null);

  actions[0].redo();
  assert.equal(userObjects.children.includes(group), true);
  assert.equal(selectedMesh, pivot);
});

test('creates template geometries through shared geometry helper', () => {
  const cube = createTemplateGeometry('cube', { width: 2, height: 3, depth: 4 });
  assert.equal(cube.type, 'BoxGeometry');
  assert.equal(isSupportedTemplateGeometry('cube'), true);
  assert.equal(isSupportedTemplateGeometry('missing'), false);
  assert.equal(createTemplateGeometry('missing'), null);
  cube.dispose();
});

test('finds bone visualization targets from pivot hierarchies', () => {
  const userObjects = new THREE.Group();
  const character = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const looseGroup = new THREE.Group();

  body.userData.isPivot = true;
  head.userData.isPivot = true;

  body.add(head);
  character.add(body);
  userObjects.add(character);
  userObjects.add(looseGroup);

  const targets = findBoneTargets(userObjects);

  assert.deepEqual(targets.pivots, [body, head]);
  assert.deepEqual(targets.rootGroups, [character]);
  assert.equal(targets.count, 3);
});

test('coordinates bone visualization controller through injected scene state and Three classes', () => {
  const scene = new THREE.Scene();
  const userObjects = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.userData.isPivot = true;
  userObjects.add(pivot);
  const boneState = {
    bonesVisible: false,
    scene,
    userObjects,
  };

  const controller = createBoneVisualizationController({
    getBoneState: () => boneState,
    GroupClass: THREE.Group,
    MeshClass: THREE.Mesh,
    SphereGeometryClass: THREE.SphereGeometry,
    MeshBasicMaterialClass: THREE.MeshBasicMaterial,
    LineBasicMaterialClass: THREE.LineBasicMaterial,
    Vector3Class: THREE.Vector3,
    BufferGeometryClass: THREE.BufferGeometry,
    LineClass: THREE.Line,
  });

  assert.equal(controller.raycastBones({ intersectObjects: () => [] }), null);
  assert.equal(controller.toggleBones(), true);
  const bonesGroup = scene.children.find((child) => child.name === '__bones__');
  assert.ok(bonesGroup);
  controller.updateBones();
  assert.equal(controller.raycastBones({
    intersectObjects: (spheres) => [{ object: spheres[0] }],
  }), pivot);
  assert.equal(controller.toggleBones(), false);
  assert.equal(scene.children.includes(bonesGroup), false);
});

test('builds browser bone visualization adapter through injected facade factory', () => {
  const boneState = { id: 'browser-bone-state' };
  const facade = {
    raycastBones: () => 'raycast-result',
    toggleBones: () => 'toggle-result',
    updateBones: () => 'update-result',
  };
  let facadeOptions = null;

  const result = createBrowserBoneVisualizationController({
    getBoneState: () => boneState,
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getBoneState(), boneState);
  assert.equal(typeof facadeOptions.GroupClass, 'function');
  assert.equal(typeof facadeOptions.MeshClass, 'function');
  assert.equal(typeof facadeOptions.Vector3Class, 'function');
});

test('renders expandable object list DOM and selected overlay through injected elements', () => {
  const createClassList = (initial = []) => {
    const classes = new Set(initial);
    return {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    };
  };
  const createElement = (tagName = 'div') => {
    const children = [];
    const listeners = new Map();
    let html = '';
    return {
      tagName,
      className: '',
      textContent: '',
      style: {},
      classList: createClassList(),
      set innerHTML(value) {
        html = value;
        if (value === '') children.length = 0;
      },
      get innerHTML() {
        return html;
      },
      addEventListener: (event, callback) => listeners.set(event, callback),
      emit: (event, payload = {}) => listeners.get(event)?.(payload),
      appendChild: (child) => children.push(child),
      get children() { return children; },
    };
  };
  const root = { id: 'root', children: [] };
  const group = { isGroup: true, userData: { name: 'GROUP' }, children: [], _listExpanded: true, parent: root };
  const pivot = { isGroup: true, userData: { name: 'PIVOT', isPivot: true }, children: [], _listExpanded: true, parent: group };
  const pivotMesh = { isGroup: false, userData: { name: 'PIVOT_MESH' }, parent: pivot };
  const nestedGroup = { isGroup: true, userData: { name: 'NESTED' }, children: [], parent: pivot };
  const mesh = { isGroup: false, userData: { name: 'MESH' }, parent: root };
  pivot.children = [pivotMesh, nestedGroup];
  group.children = [pivot];
  root.children = [group, mesh];
  const content = createElement();
  const countElement = createElement('span');
  const selected = [];
  const rootSelected = [];
  const toggled = [];
  let stopped = false;

  assert.equal(renderObjectList({
    content,
    countElement,
    objects: root.children,
    isOpen: true,
    rootObject: root,
    selectedObjects: new Set([mesh]),
    translate: (key) => `t:${key}`,
    createElement,
    onSelect: (obj) => selected.push(obj),
    onSelectRoot: (obj) => rootSelected.push(obj),
    onToggleExpanded: (obj) => toggled.push(obj),
  }), true);

  assert.equal(countElement.textContent, '(2)');
  assert.equal(content.children.length, 4);
  assert.equal(content.children[0].children[1].textContent, '\u25A1');
  assert.equal(content.children[1].children[1].textContent, '\u25C7');
  assert.equal(content.children[2].children[2].textContent, 'NESTED');
  assert.equal(content.children[3].className.includes('bg-[#4488ff]/25'), true);

  content.children[3].emit('click');
  content.children[0].children[0].emit('click', { stopPropagation: () => { stopped = true; } });
  content.children[2].emit('dblclick', { stopPropagation: () => {} });
  assert.deepEqual(selected, [mesh]);
  assert.deepEqual(toggled, [group]);
  assert.equal(stopped, true);
  assert.deepEqual(rootSelected, [group]);

  assert.equal(renderObjectList({
    content,
    countElement,
    objects: [],
    isOpen: true,
    translate: (key) => `t:${key}`,
    createElement,
  }), true);
  assert.equal(content.children.length, 1);
  assert.equal(content.children[0].textContent, 't:emptyScene');

  const objectListDom = createObjectListDomAdapter({
    root: { createElement },
  });
  assert.equal(objectListDom.renderList({
    content,
    countElement,
    objects: [],
    isOpen: true,
    translate: (key) => `adapter:${key}`,
  }), true);
  assert.equal(content.children[0].textContent, 'adapter:emptyScene');

  const overlay = createElement();
  assert.equal(objectListDom.renderOverlay({ userData: { name: 'Selected' } }, { overlay }), true);
  assert.equal(overlay.textContent, 'Selected');
  assert.equal(overlay.classList.contains('hidden'), false);
  assert.equal(renderSelectedOverlay(null, { overlay }), true);
  assert.equal(overlay.classList.contains('hidden'), true);
});

test('coordinates object list controller state selection and toggle flow', () => {
  const object = { id: 'object', _listExpanded: false };
  const root = { children: [object] };
  const countElement = { id: 'count' };
  const content = { id: 'content' };
  const arrow = { id: 'arrow' };
  const overlay = { id: 'overlay' };
  const calls = [];
  let lastRenderOptions = null;

  const controller = createObjectListController({
    getObjectListState: () => ({
      userObjects: root,
      selectedMesh: object,
      selectedMeshes: new Set([object]),
    }),
    getCountElement: () => countElement,
    getContent: () => content,
    getArrow: () => arrow,
    getOverlay: () => overlay,
    translate: (key) => `t:${key}`,
    renderList: (options) => {
      lastRenderOptions = options;
      calls.push([
        'render',
        options.objects,
        options.content,
        options.countElement,
        options.isOpen,
        options.selectedObject,
        options.translate('emptyScene'),
      ]);
      return 'render-result';
    },
    renderToggle: (isOpen, options) => {
      calls.push(['toggle', isOpen, options.content, options.arrow]);
      return 'toggle-result';
    },
    renderOverlay: (selectedObject, options) => {
      calls.push(['overlay', selectedObject, options.overlay]);
      return 'overlay-result';
    },
    deselectAllCommand: () => calls.push(['deselect-all']),
    selectMeshCommand: (selectedObject) => calls.push(['select-mesh', selectedObject]),
  });

  assert.equal(controller.refreshObjectList(), 'render-result');
  assert.deepEqual(calls.shift(), ['render', [object], content, countElement, false, object, 't:emptyScene']);
  lastRenderOptions.onToggleExpanded(object);
  assert.equal(object._listExpanded, true);
  assert.deepEqual(calls.shift(), ['render', [object], content, countElement, false, object, 't:emptyScene']);

  lastRenderOptions.onSelect(object);
  assert.deepEqual(calls.splice(0, 4), [
    ['deselect-all'],
    ['select-mesh', object],
    ['overlay', object, overlay],
    ['render', [object], content, countElement, false, object, 't:emptyScene'],
  ]);

  assert.equal(controller.toggleObjectList(), 'toggle-result');
  assert.deepEqual(calls.splice(0, 2), [
    ['toggle', true, content, arrow],
    ['render', [object], content, countElement, true, object, 't:emptyScene'],
  ]);
  assert.equal(controller.toggleObjectList(), 'toggle-result');
  assert.deepEqual(calls.splice(0), [
    ['toggle', false, content, arrow],
  ]);

  assert.equal(controller.updateSelectedOverlay(), 'overlay-result');
  assert.deepEqual(calls.splice(0), [
    ['overlay', object, overlay],
  ]);
});

test('builds browser object list controller adapter through injected facade factory', () => {
  const objectListState = { id: 'browser-object-list-state' };
  const elements = new Map([
    ['object-list-content', { id: 'content' }],
    ['object-list-count', { id: 'count' }],
    ['object-list-arrow', { id: 'arrow' }],
    ['selected-overlay', { id: 'overlay' }],
  ]);
  const root = {
    id: 'object-list-root',
    createElement: (tagName) => ({ tagName }),
    getElementById: (id) => elements.get(id),
  };
  const facade = {
    refreshObjectList: () => 'refresh-result',
    toggleObjectList: () => 'toggle-result',
    updateSelectedOverlay: () => 'overlay-result',
  };
  let facadeOptions = null;
  let domRoot = null;
  const objectListDom = {
    renderList: () => 'render-list',
    renderToggle: () => 'render-toggle',
    renderOverlay: () => 'render-overlay',
  };

  const result = createBrowserObjectListController({
    getObjectListState: () => objectListState,
    getRoot: () => root,
    createObjectListDom: (options) => {
      domRoot = options.root;
      return objectListDom;
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getObjectListState(), objectListState);
  assert.equal(facadeOptions.getContent(), elements.get('object-list-content'));
  assert.equal(facadeOptions.getCountElement(), elements.get('object-list-count'));
  assert.equal(facadeOptions.getArrow(), elements.get('object-list-arrow'));
  assert.equal(facadeOptions.getOverlay(), elements.get('selected-overlay'));
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.equal(domRoot, root);
  assert.equal(facadeOptions.renderList(), 'render-list');
  assert.equal(facadeOptions.renderToggle(), 'render-toggle');
  assert.equal(facadeOptions.renderOverlay(), 'render-overlay');
  assert.equal(typeof facadeOptions.deselectAllCommand, 'function');
  assert.equal(typeof facadeOptions.selectMeshCommand, 'function');
});

test('coordinates object list facade through injected state DOM renderers and selection adapters', () => {
  const object = { id: 'object', _listExpanded: false };
  const root = { children: [object] };
  const countElement = { id: 'count' };
  const content = { id: 'content' };
  const overlay = { id: 'overlay' };
  const calls = [];

  assert.equal(refreshObjectList({
    getObjectListState: () => ({
      userObjects: root,
      selectedMesh: object,
      selectedMeshes: new Set(),
    }),
    getCountElement: () => countElement,
    getContent: () => content,
    isOpen: true,
    translate: (key) => `t:${key}`,
    renderList: (options) => {
      calls.push([
        'render',
        options.objects,
        options.content,
        options.countElement,
        options.isOpen,
        options.rootObject,
        options.selectedObject,
        options.translate('emptyScene'),
      ]);
      options.onToggleExpanded(object);
      options.onSelect(object);
      options.onSelectRoot(root);
      return 'render-result';
    },
    selectObject: (selectedObject) => calls.push(['select', selectedObject]),
    refreshList: () => calls.push(['refresh']),
  }), 'render-result');

  assert.equal(object._listExpanded, true);
  assert.deepEqual(calls, [
    ['render', [object], content, countElement, true, root, object, 't:emptyScene'],
    ['refresh'],
    ['select', object],
    ['select', root],
  ]);

  assert.equal(updateSelectedOverlay({
    getObjectListState: () => ({ selectedMesh: object }),
    getOverlay: () => overlay,
    renderOverlay: (selectedObject, options) => {
      calls.push(['overlay', selectedObject, options.overlay]);
      return 'overlay-result';
    },
  }), 'overlay-result');
  assert.deepEqual(calls.pop(), ['overlay', object, overlay]);

  assert.equal(toggleObjectList({
    getContent: () => content,
    getArrow: () => ({ id: 'arrow' }),
    renderToggle: (isOpen, options) => {
      calls.push(['toggle', isOpen, options.content]);
      return 'toggle-result';
    },
    refreshList: () => calls.push(['refresh-after-toggle']),
  }), 'toggle-result');
  assert.deepEqual(calls.slice(-2), [
    ['toggle', true, content],
    ['refresh-after-toggle'],
  ]);

  assert.equal(toggleObjectList({
    getContent: () => content,
    getArrow: () => ({ id: 'arrow' }),
    renderToggle: (isOpen, options) => {
      calls.push(['toggle', isOpen, options.content]);
      return 'toggle-result';
    },
    refreshList: () => calls.push(['unexpected-refresh']),
  }), 'toggle-result');
  assert.deepEqual(calls.slice(-1), [
    ['toggle', false, content],
  ]);
});

test('renders scene object list DOM with injected elements and select callback', () => {
  const createElement = (tagName = 'div') => {
    const children = [];
    const listeners = new Map();
    return {
      tagName,
      className: '',
      textContent: '',
      addEventListener: (event, callback) => listeners.set(event, callback),
      click: () => listeners.get('click')?.(),
      appendChild: (child) => children.push(child),
      replaceChildren: () => { children.length = 0; },
      get children() { return children; },
    };
  };
  const container = createElement();
  const group = { isGroup: true, userData: { name: 'GROUP' } };
  const mesh = { isGroup: false, userData: { name: 'MESH' } };
  const selected = [];

  assert.equal(renderSceneObjectList([group, mesh], {
    container,
    createElement,
    translate: (key) => `t:${key}`,
    onSelect: (obj) => selected.push(obj),
  }), true);

  assert.equal(container.children.length, 2);
  assert.equal(container.children[0].children[0].textContent, '\u25A1');
  assert.equal(container.children[0].children[1].textContent, 'GROUP');
  assert.equal(container.children[1].children[0].textContent, '\u25A0');
  assert.equal(container.children[1].children[1].textContent, 'MESH');

  container.children[1].click();
  assert.deepEqual(selected, [mesh]);

  assert.equal(renderSceneObjectList([], {
    container,
    createElement,
    translate: (key) => `t:${key}`,
  }), true);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].textContent, 't:emptyScene');

  const sceneListDom = createSceneObjectListDomAdapter({
    root: { createElement },
  });
  assert.equal(sceneListDom.renderList([], {
    container,
    translate: (key) => `adapter:${key}`,
  }), true);
  assert.equal(container.children[0].textContent, 'adapter:emptyScene');
});

test('coordinates scene object list controller through injected state DOM and selection adapters', () => {
  const sceneObject = { id: 'object', isGroup: false, userData: { name: 'Object' } };
  const container = { id: 'container' };
  const calls = [];

  const controller = createSceneObjectListController({
    getSceneState: () => ({ userObjects: { children: [sceneObject] } }),
    getContainer: () => container,
    translate: (key) => `t:${key}`,
    renderList: (objects, options) => {
      calls.push(['render', objects, options.container, options.translate('emptyScene')]);
      options.onSelect(sceneObject);
      return 'render-result';
    },
    deselectAllCommand: () => calls.push(['deselect-all']),
    selectMeshCommand: (obj) => calls.push(['select-mesh', obj]),
    updateSelectedOverlayCommand: () => calls.push(['overlay']),
    refreshObjectListCommand: () => calls.push(['refresh-object-list']),
  });

  assert.equal(controller.refreshSceneObjectList(), 'render-result');
  assert.deepEqual(calls, [
    ['render', [sceneObject], container, 't:emptyScene'],
    ['deselect-all'],
    ['select-mesh', sceneObject],
    ['overlay'],
    ['refresh-object-list'],
  ]);
});

test('builds browser scene object list controller adapter through injected facade factory', () => {
  const sceneState = { id: 'browser-scene-list-state' };
  const container = { id: 'scene-object-list' };
  const root = {
    id: 'scene-object-list-root',
    createElement: (tagName) => ({ tagName }),
    getElementById: (id) => (id === 'scene-object-list' ? container : null),
  };
  const facade = {
    refreshSceneObjectList: () => 'refresh-result',
  };
  let facadeOptions = null;
  let domRoot = null;
  const sceneObjectListDom = {
    renderList: () => 'render-scene-list',
  };

  const result = createBrowserSceneObjectListController({
    getSceneState: () => sceneState,
    getRoot: () => root,
    createSceneObjectListDom: (options) => {
      domRoot = options.root;
      return sceneObjectListDom;
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getSceneState(), sceneState);
  assert.equal(facadeOptions.getContainer(), container);
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.equal(domRoot, root);
  assert.equal(facadeOptions.renderList(), 'render-scene-list');
  assert.equal(typeof facadeOptions.deselectAllCommand, 'function');
  assert.equal(typeof facadeOptions.selectMeshCommand, 'function');
  assert.equal(typeof facadeOptions.updateSelectedOverlayCommand, 'function');
  assert.equal(typeof facadeOptions.refreshObjectListCommand, 'function');
});

test('coordinates scene object list facade through injected state DOM and selection adapters', () => {
  const sceneObject = { id: 'object', isGroup: false, userData: { name: 'Object' } };
  const container = { id: 'container' };
  const calls = [];

  assert.equal(refreshSceneObjectList({
    getSceneState: () => ({ userObjects: { children: [sceneObject] } }),
    getContainer: () => container,
    translate: (key) => `t:${key}`,
    renderList: (objects, options) => {
      calls.push(['render', objects, options.container, options.translate('emptyScene')]);
      options.onSelect(sceneObject);
      return 'render-result';
    },
    onSelect: (obj) => calls.push(['select', obj]),
  }), 'render-result');

  assert.deepEqual(calls, [
    ['render', [sceneObject], container, 't:emptyScene'],
    ['select', sceneObject],
  ]);
});

test('configures scene camera and viewport resize helpers', () => {
  const camera = createEditorCamera();
  assert.equal(camera.fov, 60);
  assert.deepEqual(camera.position.toArray(), [10, 8, 15]);

  let projectionUpdated = false;
  let size = null;
  const fakeCamera = {
    aspect: 0,
    updateProjectionMatrix: () => { projectionUpdated = true; },
  };
  const fakeRenderer = {
    setSize: (width, height) => { size = { width, height }; },
  };
  const result = resizeViewport(fakeCamera, fakeRenderer, {
    clientWidth: 1280,
    clientHeight: 720,
  });

  assert.equal(fakeCamera.aspect, 1280 / 720);
  assert.equal(projectionUpdated, true);
  assert.deepEqual(size, { width: 1280, height: 720 });
  assert.deepEqual(result, { width: 1280, height: 720 });
});

test('reads scene DOM adapters through injected browser roots', () => {
  const canvas = {};
  const viewport = {};
  const root = {
    getElementById: (id) => ({ canvas, viewport })[id] || null,
  };
  const target = {
    devicePixelRatio: 1.75,
    added: null,
    removed: null,
    addEventListener(event, handler) {
      this.added = { event, handler };
    },
    removeEventListener(event, handler) {
      this.removed = { event, handler };
    },
  };
  const handler = () => {};

  assert.equal(getCanvasElement(root), canvas);
  assert.equal(getViewportElement(root), viewport);
  assert.equal(getDevicePixelRatio(target), 1.75);

  const unbind = bindResizeHandler(handler, target);
  assert.deepEqual(target.added, { event: 'resize', handler });
  unbind();
  assert.deepEqual(target.removed, { event: 'resize', handler });

  const sceneDom = createSceneDomAdapter({ root, viewport: target });
  assert.equal(sceneDom.getCanvasElement(), canvas);
  assert.equal(sceneDom.getViewportElement(), viewport);
  assert.equal(sceneDom.getDevicePixelRatio(), 1.75);
  const unbindFromAdapter = sceneDom.bindResizeHandler(handler);
  assert.deepEqual(target.added, { event: 'resize', handler });
  unbindFromAdapter();
  assert.deepEqual(target.removed, { event: 'resize', handler });

  assert.equal(getCanvasElement(null), null);
  assert.equal(getViewportElement(null), null);
  assert.equal(getDevicePixelRatio(null), 1);
  assert.doesNotThrow(() => bindResizeHandler(handler, null)());
});

test('runs scene render loop through injected frame dependencies', () => {
  const scheduledFrames = [];
  const calls = [];
  const loop = createSceneRenderLoop({
    clock: { getDelta: () => 0.016 },
    requestFrame: (callback) => {
      scheduledFrames.push(callback);
      return scheduledFrames.length;
    },
    updateOrbitControls: (delta) => calls.push(['orbit', delta]),
    updateAnimationMixer: (delta) => calls.push(['animation', delta]),
    updateBones: (delta) => calls.push(['bones', delta]),
    renderFrame: (delta) => calls.push(['render', delta]),
  });

  assert.equal(loop.isRunning(), false);
  loop.start();
  assert.equal(loop.isRunning(), true);
  assert.equal(scheduledFrames.length, 1);
  assert.deepEqual(calls, [
    ['orbit', 0.016],
    ['animation', 0.016],
    ['bones', 0.016],
    ['render', 0.016],
  ]);

  loop.start();
  assert.equal(scheduledFrames.length, 1);

  scheduledFrames[0]();
  assert.equal(scheduledFrames.length, 2);
  assert.equal(calls.length, 8);

  loop.stop();
  scheduledFrames[1]();
  assert.equal(loop.isRunning(), false);
  assert.equal(scheduledFrames.length, 2);
  assert.equal(calls.length, 8);
});

test('coordinates scene controller runtime getter creation and public commands', () => {
  const sceneState = { id: 'scene-state' };
  const calls = [];
  let runtimeOptions = null;
  const dependencies = {
    createScene: () => {},
    createCamera: () => {},
    createRenderer: () => {},
    addDefaultSceneObjects: () => {},
    createUserObjectsGroup: () => {},
    createOrbitControls: () => {},
    createTransformControls: () => {},
    getCanvasElement: () => {},
    getDevicePixelRatio: () => {},
    getViewportElement: () => {},
    resizeViewport: () => {},
    bindResizeHandler: () => {},
    createRenderLoop: () => {},
    updateAnimationMixer: () => {},
    updateBones: () => {},
    pushAction: () => {},
    updatePropertiesPanel: () => {},
  };
  const runtime = {
    initScene: () => {
      calls.push(['init']);
      return 'init-result';
    },
    onResize: () => {
      calls.push(['resize']);
      return 'resize-result';
    },
    stop: () => {
      calls.push(['stop']);
      return 'stop-result';
    },
  };

  const controller = createSceneController({
    getSceneState: () => sceneState,
    ...dependencies,
    createRuntimeController: (options) => {
      runtimeOptions = options;
      calls.push(['runtime', options.sceneState]);
      return runtime;
    },
  });

  assert.deepEqual(calls.splice(0), [['runtime', sceneState]]);
  assert.equal(runtimeOptions.sceneState, sceneState);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(runtimeOptions[key], value);
  }

  assert.equal(controller.initScene(), 'init-result');
  assert.equal(controller.onResize(), 'resize-result');
  assert.equal(controller.stop(), 'stop-result');
  assert.deepEqual(calls, [
    ['init'],
    ['resize'],
    ['stop'],
  ]);
});

test('builds browser scene controller adapter through injected facade factory', () => {
  const sceneState = { id: 'browser-scene-state' };
  const root = { id: 'scene-root' };
  const viewport = { id: 'scene-window' };
  const domCalls = [];
  let facadeOptions = null;
  const facade = {
    initScene: () => 'init-result',
    onResize: () => 'resize-result',
  };

  const result = createBrowserSceneController({
    root,
    viewport,
    getSceneState: () => sceneState,
    createSceneDom: ({ root: domRoot, viewport: domViewport }) => {
      domCalls.push(['dom', domRoot, domViewport]);
      return {
        bindResizeHandler: () => 'bind-result',
        getCanvasElement: () => 'canvas-result',
        getDevicePixelRatio: () => 'ratio-result',
        getViewportElement: () => 'viewport-result',
      };
    },
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getSceneState(), sceneState);
  assert.deepEqual(domCalls, [['dom', root, viewport]]);
  assert.equal(facadeOptions.getCanvasElement(), 'canvas-result');
  assert.equal(facadeOptions.getDevicePixelRatio(), 'ratio-result');
  assert.equal(facadeOptions.getViewportElement(), 'viewport-result');
  assert.equal(facadeOptions.bindResizeHandler(), 'bind-result');
  assert.equal(typeof facadeOptions.createScene, 'function');
  assert.equal(typeof facadeOptions.createCamera, 'function');
  assert.equal(typeof facadeOptions.createRenderer, 'function');
  assert.equal(typeof facadeOptions.addDefaultSceneObjects, 'function');
  assert.equal(typeof facadeOptions.createUserObjectsGroup, 'function');
  assert.equal(typeof facadeOptions.createOrbitControls, 'function');
  assert.equal(typeof facadeOptions.createTransformControls, 'function');
  assert.equal(typeof facadeOptions.resizeViewport, 'function');
  assert.equal(typeof facadeOptions.createRenderLoop, 'function');
  assert.equal(typeof facadeOptions.updateAnimationMixer, 'function');
  assert.equal(typeof facadeOptions.updateBones, 'function');
  assert.equal(typeof facadeOptions.pushAction, 'function');
  assert.equal(typeof facadeOptions.updatePropertiesPanel, 'function');
});

test('initializes scene runtime through injected services and cleans previous lifecycle', () => {
  const calls = [];
  const sceneState = {};
  const canvas = { id: 'canvas' };
  const viewport = { id: 'viewport' };
  let sceneCount = 0;
  let loopCount = 0;
  let unbindCount = 0;
  let stoppedCount = 0;

  const controller = createSceneRuntimeController({
    sceneState,
    createScene: () => ({ id: `scene-${++sceneCount}` }),
    createCamera: () => ({ id: `camera-${sceneCount}` }),
    createRenderer: (targetCanvas, pixelRatio) => ({
      id: `renderer-${sceneCount}`,
      domElement: { id: `dom-${sceneCount}` },
      render: (scene, camera) => calls.push(['render', scene.id, camera.id]),
      canvas: targetCanvas,
      pixelRatio,
    }),
    addDefaultSceneObjects: (scene) => calls.push(['defaults', scene.id]),
    createUserObjectsGroup: (scene) => {
      calls.push(['user-objects', scene.id]);
      return { id: `user-${scene.id}` };
    },
    createOrbitControls: (camera, domElement) => ({
      id: `orbit-${camera.id}`,
      update: () => calls.push(['orbit-update', camera.id, domElement.id]),
    }),
    createTransformControls: (options) => {
      calls.push(['transform', options.scene.id, options.domElement.id, options.getState()]);
      return { id: `transform-${options.scene.id}` };
    },
    getCanvasElement: () => canvas,
    getDevicePixelRatio: () => 1.5,
    getViewportElement: () => viewport,
    resizeViewport: (camera, renderer, container) => {
      calls.push(['resize', camera.id, renderer.id, container.id]);
      return { width: 100, height: 50 };
    },
    bindResizeHandler: (handler) => {
      calls.push(['bind', handler]);
      return () => {
        unbindCount++;
        calls.push(['unbind']);
      };
    },
    createRenderLoop: (handlers) => {
      const id = ++loopCount;
      calls.push(['loop', id]);
      return {
        start: () => {
          calls.push(['start', id]);
          handlers.updateOrbitControls();
          handlers.updateAnimationMixer(0.016);
          handlers.updateBones(0.016);
          handlers.renderFrame();
        },
        stop: () => {
          stoppedCount++;
          calls.push(['stop', id]);
        },
      };
    },
    updateAnimationMixer: (delta) => calls.push(['animation', delta]),
    updateBones: (delta) => calls.push(['bones', delta]),
    pushAction: (action) => calls.push(['push', action]),
    updatePropertiesPanel: () => calls.push(['properties']),
  });

  assert.equal(controller.onResize(), null);

  const firstRuntime = controller.initScene();
  assert.equal(sceneState.scene.id, 'scene-1');
  assert.equal(sceneState.camera.id, 'camera-1');
  assert.equal(sceneState.renderer.canvas, canvas);
  assert.equal(sceneState.renderer.pixelRatio, 1.5);
  assert.equal(sceneState.userObjects.id, 'user-scene-1');
  assert.equal(firstRuntime.renderLoop !== null, true);
  assert.equal(calls.filter((call) => call[0] === 'resize').length, 1);
  assert.equal(calls.filter((call) => call[0] === 'start').length, 1);

  controller.initScene();
  assert.equal(stoppedCount, 1);
  assert.equal(unbindCount, 1);
  assert.equal(sceneState.scene.id, 'scene-2');
  assert.equal(calls.filter((call) => call[0] === 'resize').length, 2);
  assert.equal(calls.filter((call) => call[0] === 'start').length, 2);

  controller.stop();
  assert.equal(stoppedCount, 2);
  assert.equal(unbindCount, 2);
});

test('creates transform snapshots and undo actions without scene runtime', () => {
  const object = new THREE.Group();
  object.position.set(1, 2, 3);
  object.rotation.set(0.1, 0.2, 0.3);
  object.scale.set(1, 2, 3);

  const before = createTransformSnapshot(object);
  object.position.set(4, 5, 6);
  object.rotation.set(0.4, 0.5, 0.6);
  object.scale.set(2, 3, 4);
  const after = createTransformSnapshot(object);

  let panelUpdates = 0;
  const action = createTransformUndoAction({
    object,
    before,
    after,
    isSelected: (target) => target === object,
    updatePropertiesPanel: () => { panelUpdates++; },
  });

  assert.equal(action.type, 'Transformar');
  action.undo();
  assert.deepEqual(object.position.toArray(), [1, 2, 3]);
  assert.deepEqual(object.scale.toArray(), [1, 2, 3]);

  action.redo();
  assert.deepEqual(object.position.toArray(), [4, 5, 6]);
  assert.deepEqual(object.scale.toArray(), [2, 3, 4]);
  assert.equal(panelUpdates, 2);
});

test('compensates pivot translation and records mesh-aware undo actions', () => {
  const pivot = new THREE.Group();
  pivot.userData.isPivot = true;
  pivot.position.set(1, 0, 1);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  mesh.position.set(5, 5, 5);
  pivot.add(mesh);

  const before = createTransformSnapshot(pivot);
  const boneEditInfo = createBoneEditInfo(pivot, {
    bonesVisible: true,
    mode: 'translate',
  });

  pivot.position.set(3, 0, 4);
  applyBonePivotCompensation(pivot, boneEditInfo);
  assert.deepEqual(mesh.position.toArray(), [3, 5, 2]);

  const after = createTransformSnapshot(pivot);
  const action = createPivotTransformUndoAction({
    object: pivot,
    before,
    after,
    boneEditInfo,
  });

  assert.equal(action.type, 'Mover pivote');
  action.undo();
  assert.deepEqual(pivot.position.toArray(), [1, 0, 1]);
  assert.deepEqual(mesh.position.toArray(), [5, 5, 5]);

  action.redo();
  assert.deepEqual(pivot.position.toArray(), [3, 0, 4]);
  assert.deepEqual(mesh.position.toArray(), [3, 5, 2]);
});

test('renders and updates animation timeline DOM adapter', () => {
  const createClassList = (initial = []) => {
    const classes = new Set(initial);
    return {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    };
  };
  const createElement = (tagName = 'div') => {
    const children = [];
    return {
      tagName,
      value: '',
      textContent: '',
      style: {},
      classList: createClassList(),
      appendChild: (child) => children.push(child),
      replaceChildren: () => { children.length = 0; },
      get children() { return children; },
    };
  };

  const elements = new Map([
    ['animation-timeline', { ...createElement(), classList: createClassList(['hidden']) }],
    ['anim-select', createElement('select')],
    ['anim-progress', createElement()],
    ['anim-time', createElement()],
    ['btn-play', createElement('button')],
    ['btn-stop', createElement('button')],
  ]);
  const root = {
    createElement,
    getElementById: (id) => elements.get(id) || null,
  };
  const group = {
    userData: {
      animations: [{ name: 'idle' }, { name: 'run' }],
      animationClips: [{ name: 'clipA' }, { name: 'clipB' }],
    },
  };

  assert.equal(renderAnimationTimeline(group, root), true);
  assert.equal(elements.get('animation-timeline').classList.contains('hidden'), false);
  assert.equal(elements.get('anim-select').children.length, 2);
  assert.equal(elements.get('anim-select').children[0].textContent, 'idle');

  setSelectedAnimationIndex(1, root);
  assert.equal(getSelectedAnimationIndex(root), 1);

  assert.equal(updateAnimationTimelinePlayback({ time: 1, duration: 4 }, true, root), true);
  assert.equal(elements.get('anim-progress').style.width, '25%');
  assert.equal(elements.get('anim-time').textContent, '1.0 / 4.0');
  assert.equal(elements.get('btn-play').classList.contains('bg-green-600'), true);

  const adapter = createAnimationTimelineDomAdapter({ root });
  adapter.setSelectedAnimationIndex(0);
  assert.equal(adapter.getSelectedAnimationIndex(), 0);
  assert.equal(adapter.updateAnimationTimelinePlayback({ time: 2, duration: 4 }, false), true);
  assert.equal(elements.get('anim-progress').style.width, '50%');

  renderAnimationTimeline(null, root);
  assert.equal(elements.get('animation-timeline').classList.contains('hidden'), true);
});

test('manages animation import form DOM adapters', () => {
  const elements = new Map([
    ['import-anim-textarea', { value: '  {"name":"idle"}  ' }],
    ['import-anim-error', { textContent: '' }],
    ['anim-mode-textarea', { value: '  {"name":"run"}  ' }],
    ['anim-mode-import-error', { textContent: '' }],
  ]);
  const root = {
    getElementById: (id) => elements.get(id) || null,
  };

  assert.equal(getModalAnimationImportText(root), '{"name":"idle"}');
  setModalAnimationImportError('modal error', root);
  assert.equal(elements.get('import-anim-error').textContent, 'modal error');
  clearModalAnimationImportText(root);
  assert.equal(elements.get('import-anim-textarea').value, '');

  assert.equal(getModeAnimationImportText(root), '{"name":"run"}');
  setModeAnimationImportError('mode error', root);
  assert.equal(elements.get('anim-mode-import-error').textContent, 'mode error');
  clearModeAnimationImportText(root);
  assert.equal(elements.get('anim-mode-textarea').value, '');

  elements.get('import-anim-textarea').value = '  {"name":"adapter"}  ';
  const adapter = createAnimationImportDomAdapter({ root });
  assert.equal(adapter.getModalAnimationImportText(), '{"name":"adapter"}');
  adapter.setModalAnimationImportError('adapter modal error');
  assert.equal(elements.get('import-anim-error').textContent, 'adapter modal error');
  adapter.clearModalAnimationImportText();
  assert.equal(elements.get('import-anim-textarea').value, '');
});

test('submits animation imports through shared validation flow', () => {
  const group = new THREE.Group();
  const messages = {
    missingText: 'missing text',
    missingTarget: 'missing target',
  };
  const calls = [];
  const importer = (text, target) => {
    calls.push([text, target]);
    return {
      success: true,
      warnings: ['slow track', 'missing optional frame'],
    };
  };

  assert.deepEqual(submitAnimationImport({
    text: '',
    group,
    messages,
    importAnimationToGroup: importer,
  }), { success: false, error: 'missing text' });

  assert.deepEqual(submitAnimationImport({
    text: '{}',
    group: null,
    messages,
    importAnimationToGroup: importer,
  }), { success: false, error: 'missing target' });

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  assert.deepEqual(submitAnimationImport({
    text: '{}',
    group: mesh,
    requireGroup: true,
    messages,
    importAnimationToGroup: importer,
  }), { success: false, error: 'missing target' });

  const failed = submitAnimationImport({
    text: '{}',
    group,
    messages,
    importAnimationToGroup: () => ({ success: false, error: 'bad json' }),
  });
  assert.deepEqual(failed, { success: false, error: 'bad json' });

  const submitted = submitAnimationImport({
    text: '{"name":"idle"}',
    group,
    messages,
    importAnimationToGroup: importer,
  });
  assert.equal(submitted.success, true);
  assert.equal(submitted.feedback, 'slow track | missing optional frame');
  assert.deepEqual(calls, [['{"name":"idle"}', group]]);
  assert.equal(formatAnimationImportFeedback({}), '');
});

test('runs animation import submit flow with injected UI side effects', () => {
  const group = new THREE.Group();
  const calls = [];
  const messages = {
    missingText: 'missing text',
    missingTarget: 'missing target',
  };

  assert.equal(runAnimationImportSubmit({
    getText: () => '',
    getGroup: () => group,
    messages,
    importAnimationToGroup: () => ({ success: true }),
    setError: (message) => calls.push(['error', message]),
    clearText: () => calls.push(['clear']),
    refreshAnimationList: () => calls.push(['refresh']),
    showTimelineForGroup: (target) => calls.push(['timeline', target]),
  }), false);

  assert.deepEqual(calls.splice(0), [['error', 'missing text']]);

  assert.equal(runAnimationImportSubmit({
    getText: () => '{"name":"idle"}',
    getGroup: () => group,
    messages,
    importAnimationToGroup: (text, target) => {
      calls.push(['import', text, target]);
      return { success: true, warnings: ['slow'] };
    },
    clearText: () => calls.push(['clear']),
    setError: (message) => calls.push(['error', message]),
    refreshAnimationList: () => calls.push(['refresh']),
    showTimelineForGroup: (target) => calls.push(['timeline', target]),
  }), true);

  assert.deepEqual(calls, [
    ['import', '{"name":"idle"}', group],
    ['clear'],
    ['error', 'slow'],
    ['refresh'],
    ['timeline', group],
  ]);
});

test('runs animation playback decisions through shared flow helpers', () => {
  const group = { userData: { animationClips: [{ name: 'idle' }, { name: 'run' }] } };
  const calls = [];
  const hasClips = (candidate) => Boolean(candidate?.userData?.animationClips?.length);
  const hasClipAt = (candidate, index) => Boolean(candidate?.userData?.animationClips?.[index]);
  const stop = () => calls.push(['stop']);
  const play = (target, index) => calls.push(['play', target, index]);
  const setIndex = (index) => calls.push(['setIndex', index]);

  assert.equal(playSelectedAnimation({
    group,
    clipIndex: 1,
    hasAnimationClips: hasClips,
    stopAnimation: stop,
    playAnimation: play,
  }), true);
  assert.deepEqual(calls.splice(0), [['stop'], ['play', group, 1]]);

  assert.equal(restartAnimationIfPlaying({
    isPlaying: false,
    group,
    clipIndex: 0,
    hasAnimationClips: hasClips,
    stopAnimation: stop,
    playAnimation: play,
  }), false);
  assert.deepEqual(calls, []);

  assert.equal(toggleAnimationPlayback({
    isPlaying: true,
    group,
    clipIndex: 0,
    hasAnimationClips: hasClips,
    stopAnimation: stop,
    playAnimation: play,
  }), true);
  assert.deepEqual(calls.splice(0), [['stop']]);

  assert.equal(toggleAnimationPlayback({
    isPlaying: false,
    group,
    clipIndex: 0,
    hasAnimationClips: hasClips,
    stopAnimation: stop,
    playAnimation: play,
  }), true);
  assert.deepEqual(calls.splice(0), [['play', group, 0]]);

  assert.equal(playAnimationClipAt({
    group,
    index: 1,
    hasAnimationClipAt: hasClipAt,
    setSelectedAnimationIndex: setIndex,
    stopAnimation: stop,
    playAnimation: play,
  }), true);
  assert.deepEqual(calls.splice(0), [['setIndex', 1], ['stop'], ['play', group, 1]]);

  assert.equal(playAnimationClipAt({
    group,
    index: 5,
    hasAnimationClipAt: hasClipAt,
    setSelectedAnimationIndex: setIndex,
    stopAnimation: stop,
    playAnimation: play,
  }), false);
  assert.deepEqual(calls, []);
});

test('manages animation runtime playback state without global state', () => {
  const clip = { duration: 2.5, userData: { loop: false } };
  const group = { userData: { animationClips: [clip] } };
  const mixers = [];
  class FakeAnimationMixer {
    constructor(target) {
      this.target = target;
      this.updated = [];
      this.stopped = false;
      mixers.push(this);
    }

    clipAction(targetClip) {
      return {
        clip: targetClip,
        clampWhenFinished: false,
        loopMode: null,
        paused: false,
        time: 1.25,
        setLoop(mode) { this.loopMode = mode; },
        play() { this.played = true; },
        getClip() { return this.clip; },
      };
    }

    stopAllAction() {
      this.stopped = true;
    }

    update(delta) {
      this.updated.push(delta);
    }
  }
  const runtimeState = {
    animationMixer: null,
    animationAction: null,
    animationPlaying: false,
    animationClipIndex: 0,
  };

  assert.equal(playAnimationRuntime(runtimeState, group, 0, {
    AnimationMixerClass: FakeAnimationMixer,
    loopRepeat: 'repeat',
    loopOnce: 'once',
  }), true);
  assert.equal(mixers[0].target, group);
  assert.equal(runtimeState.animationAction.loopMode, 'once');
  assert.equal(runtimeState.animationAction.clampWhenFinished, true);
  assert.equal(runtimeState.animationAction.played, true);
  assert.equal(runtimeState.animationPlaying, true);
  assert.equal(runtimeState.animationClipIndex, 0);
  assert.deepEqual(getAnimationProgressRuntime(runtimeState), { time: 1.25, duration: 2.5 });

  assert.equal(updateAnimationMixerRuntime(runtimeState, 0.2), true);
  assert.deepEqual(mixers[0].updated, [0.2]);

  assert.equal(pauseAnimationRuntime(runtimeState), true);
  assert.equal(runtimeState.animationAction.paused, true);
  assert.equal(runtimeState.animationPlaying, false);
  assert.equal(updateAnimationMixerRuntime(runtimeState, 0.2), false);

  assert.equal(resumeAnimationRuntime(runtimeState), true);
  assert.equal(runtimeState.animationAction.paused, false);
  assert.equal(runtimeState.animationPlaying, true);

  assert.equal(togglePlayPauseRuntime(runtimeState, group, 0), true);
  assert.equal(runtimeState.animationPlaying, false);

  assert.equal(togglePlayPauseRuntime(runtimeState, group, 0), true);
  assert.equal(runtimeState.animationPlaying, true);

  assert.equal(stopAnimationRuntime(runtimeState), true);
  assert.equal(mixers[0].stopped, true);
  assert.equal(runtimeState.animationMixer, null);
  assert.equal(runtimeState.animationAction, null);
  assert.equal(runtimeState.animationPlaying, false);
  assert.deepEqual(getAnimationProgressRuntime(runtimeState), { time: 0, duration: 0 });
  assert.equal(playAnimationRuntime(runtimeState, { userData: { animationClips: [] } }), false);
});

test('coordinates animation controller through injected runtime getter and commands', () => {
  const animationState = { id: 'animation-state' };
  const group = { id: 'group' };
  const calls = [];
  const controller = createAnimationController({
    getAnimationState: () => animationState,
    playAnimationCommand: (stateArg, target, clipIndex) => {
      calls.push(['play', stateArg, target, clipIndex]);
      return 'play-result';
    },
    pauseAnimationCommand: (stateArg) => {
      calls.push(['pause', stateArg]);
      return 'pause-result';
    },
    resumeAnimationCommand: (stateArg) => {
      calls.push(['resume', stateArg]);
      return 'resume-result';
    },
    stopAnimationCommand: (stateArg) => {
      calls.push(['stop', stateArg]);
      return 'stop-result';
    },
    togglePlayPauseCommand: (stateArg, target, clipIndex) => {
      calls.push(['toggle', stateArg, target, clipIndex]);
      return 'toggle-result';
    },
    getAnimationProgressCommand: (stateArg) => {
      calls.push(['progress', stateArg]);
      return { time: 1, duration: 2 };
    },
    updateAnimationMixerCommand: (stateArg, delta) => {
      calls.push(['update', stateArg, delta]);
      return 'update-result';
    },
  });

  assert.equal(controller.playAnimation(group), 'play-result');
  assert.equal(controller.playAnimation(group, 3), 'play-result');
  assert.equal(controller.pauseAnimation(), 'pause-result');
  assert.equal(controller.resumeAnimation(), 'resume-result');
  assert.equal(controller.stopAnimation(), 'stop-result');
  assert.equal(controller.togglePlayPause(group), 'toggle-result');
  assert.equal(controller.togglePlayPause(group, 4), 'toggle-result');
  assert.deepEqual(controller.getAnimationProgress(), { time: 1, duration: 2 });
  assert.equal(controller.updateAnimationMixer(0.25), 'update-result');

  assert.deepEqual(calls, [
    ['play', animationState, group, 0],
    ['play', animationState, group, 3],
    ['pause', animationState],
    ['resume', animationState],
    ['stop', animationState],
    ['toggle', animationState, group, 0],
    ['toggle', animationState, group, 4],
    ['progress', animationState],
    ['update', animationState, 0.25],
  ]);
});

test('builds browser animation controller adapter through injected facade factory', () => {
  const animationState = { id: 'browser-animation-state' };
  const facade = {
    getAnimationProgress: () => 'progress-result',
    pauseAnimation: () => 'pause-result',
    playAnimation: () => 'play-result',
    resumeAnimation: () => 'resume-result',
    stopAnimation: () => 'stop-result',
    togglePlayPause: () => 'toggle-result',
    updateAnimationMixer: () => 'update-result',
  };
  let facadeOptions = null;

  const result = createBrowserAnimationController({
    getAnimationState: () => animationState,
    createFacadeController: (options) => {
      facadeOptions = options;
      return facade;
    },
  });

  assert.equal(result, facade);
  assert.equal(facadeOptions.getAnimationState(), animationState);
});

test('resolves animation panel targets through injected selectors', () => {
  const selected = { id: 'selected' };
  const modeObject = { id: 'mode' };
  const stateLike = {
    animationMode: false,
    selectedMesh: selected,
    animationModeObject: modeObject,
  };

  assert.equal(getPanelAnimationGroup(stateLike), selected);
  stateLike.animationMode = true;
  assert.equal(getPanelAnimationGroup(stateLike), modeObject);
  assert.equal(getPanelSelectedAnimationIndex(() => 2), 2);
  assert.equal(getModalAnimationImportTarget(stateLike), selected);
  assert.equal(getModeAnimationImportTarget(stateLike), modeObject);

  const targets = createAnimationPanelTargets(stateLike, {
    readSelectedAnimationIndex: () => 3,
  });

  assert.equal(targets.getAnimationGroup(), modeObject);
  assert.equal(targets.getSelectedAnimationIndex(), 3);
  assert.equal(targets.getModalImportTarget(), selected);
  assert.equal(targets.getModeImportTarget(), modeObject);
});

test('coordinates animation panel facade controller runtime getter targets and public commands', () => {
  const animationState = { id: 'animation-state' };
  const panelTargets = { id: 'panel-targets' };
  const calls = [];
  let runtimeOptions = null;
  const dependencies = {
    translate: (key) => key,
    getAnimationProgress: () => {},
    playAnimation: () => {},
    stopAnimation: () => {},
    importAnimationToGroup: () => {},
    renderAnimationTimeline: () => {},
    updateAnimationTimelinePlayback: () => {},
    renderAnimationModeList: () => {},
    getModalAnimationImportText: () => {},
    clearModalAnimationImportText: () => {},
    setModalAnimationImportError: () => {},
    getModeAnimationImportText: () => {},
    clearModeAnimationImportText: () => {},
    setModeAnimationImportError: () => {},
    hideAnimationModeChrome: () => {},
    showAnimationModeChrome: () => {},
    selectMesh: () => {},
    centerCameraOnSelected: () => {},
    showToast: () => {},
    setSelectedAnimationIndex: () => {},
    canEnterAnimationMode: () => {},
    enterAnimationModeState: () => {},
    exitAnimationModeState: () => {},
    hasAnimationClipAt: () => {},
    hasAnimationClips: () => {},
    deleteAnimationAt: () => {},
    playAnimationClipAtCommand: () => {},
  };
  const runtime = {
    playAnim: () => {
      calls.push(['playAnim']);
      return 'play-result';
    },
    stopAnim: () => {
      calls.push(['stopAnim']);
      return 'stop-result';
    },
    onAnimSelectChange: () => {
      calls.push(['onAnimSelectChange']);
      return 'select-change-result';
    },
    toggleAnimPlayPause: () => {
      calls.push(['toggleAnimPlayPause']);
      return 'toggle-result';
    },
    handleAnimImportSubmit: () => {
      calls.push(['handleAnimImportSubmit']);
      return 'import-result';
    },
    showTimelineForGroup: (group) => {
      calls.push(['showTimelineForGroup', group]);
      return 'timeline-result';
    },
    startAnimationTimelineLoop: () => {
      calls.push(['startAnimationTimelineLoop']);
      return 'loop-result';
    },
    enterAnimationMode: () => {
      calls.push(['enterAnimationMode']);
      return 'enter-result';
    },
    exitAnimationMode: () => {
      calls.push(['exitAnimationMode']);
      return 'exit-result';
    },
    refreshAnimationList: () => {
      calls.push(['refreshAnimationList']);
      return 'refresh-result';
    },
    animModePlayClip: (index) => {
      calls.push(['animModePlayClip', index]);
      return 'mode-play-result';
    },
    animModeDeleteClip: (index) => {
      calls.push(['animModeDeleteClip', index]);
      return 'mode-delete-result';
    },
    animModeImportAnim: () => {
      calls.push(['animModeImportAnim']);
      return 'mode-import-result';
    },
  };

  const controller = createAnimationPanelFacadeController({
    getAnimationState: () => animationState,
    ...dependencies,
    createPanelTargets: (stateArg) => {
      calls.push(['targets', stateArg]);
      return panelTargets;
    },
    createRuntimeController: (options) => {
      runtimeOptions = options;
      calls.push(['runtime', options.animationState, options.panelTargets]);
      return runtime;
    },
  });

  assert.deepEqual(calls.splice(0), [
    ['targets', animationState],
    ['runtime', animationState, panelTargets],
  ]);
  assert.equal(runtimeOptions.animationState, animationState);
  assert.equal(runtimeOptions.panelTargets, panelTargets);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(runtimeOptions[key], value);
  }

  const group = { id: 'group' };
  assert.equal(controller.playAnim(), 'play-result');
  assert.equal(controller.stopAnim(), 'stop-result');
  assert.equal(controller.onAnimSelectChange(), 'select-change-result');
  assert.equal(controller.toggleAnimPlayPause(), 'toggle-result');
  assert.equal(controller.handleAnimImportSubmit(), 'import-result');
  assert.equal(controller.showTimelineForGroup(group), 'timeline-result');
  assert.equal(controller.startAnimationTimelineLoop(), 'loop-result');
  assert.equal(controller.enterAnimationMode(), 'enter-result');
  assert.equal(controller.exitAnimationMode(), 'exit-result');
  assert.equal(controller.refreshAnimationList(), 'refresh-result');
  assert.equal(controller.animModePlayClip(2), 'mode-play-result');
  assert.equal(controller.animModeDeleteClip(3), 'mode-delete-result');
  assert.equal(controller.animModeImportAnim(), 'mode-import-result');
  assert.deepEqual(calls, [
    ['playAnim'],
    ['stopAnim'],
    ['onAnimSelectChange'],
    ['toggleAnimPlayPause'],
    ['handleAnimImportSubmit'],
    ['showTimelineForGroup', group],
    ['startAnimationTimelineLoop'],
    ['enterAnimationMode'],
    ['exitAnimationMode'],
    ['refreshAnimationList'],
    ['animModePlayClip', 2],
    ['animModeDeleteClip', 3],
    ['animModeImportAnim'],
  ]);
});

test('builds browser animation panel adapter through injected facade factory', () => {
  const animationState = { id: 'browser-animation-state' };
  let facadeOptions = null;
  const root = { id: 'animation-root' };
  const domRoots = [];
  const timelineDom = {
    getSelectedAnimationIndex: () => 4,
    setSelectedAnimationIndex: () => 'set-selected-index',
    renderAnimationTimeline: () => 'render-timeline',
    updateAnimationTimelinePlayback: () => 'update-timeline',
  };
  const listDom = {
    renderAnimationModeList: () => 'render-list',
  };
  const importDom = {
    getModalAnimationImportText: () => 'modal-text',
    clearModalAnimationImportText: () => 'clear-modal',
    setModalAnimationImportError: () => 'modal-error',
    getModeAnimationImportText: () => 'mode-text',
    clearModeAnimationImportText: () => 'clear-mode',
    setModeAnimationImportError: () => 'mode-error',
  };
  const modeDom = {
    hideAnimationModeChrome: () => 'hide-mode',
    showAnimationModeChrome: () => 'show-mode',
  };
  const panel = { playAnim: () => 'play-result' };

  const result = createBrowserAnimationPanel({
    root,
    getAnimationState: () => animationState,
    createTimelineDom: (options) => {
      domRoots.push(['timeline', options.root]);
      return timelineDom;
    },
    createListDom: (options) => {
      domRoots.push(['list', options.root]);
      return listDom;
    },
    createImportDom: (options) => {
      domRoots.push(['import', options.root]);
      return importDom;
    },
    createModeDom: (options) => {
      domRoots.push(['mode', options.root]);
      return modeDom;
    },
    createPanelTargets: (stateLike, options) => ({
      stateLike,
      selectedIndex: options.readSelectedAnimationIndex(),
    }),
    createFacadeController: (options) => {
      facadeOptions = options;
      return panel;
    },
  });

  assert.equal(result, panel);
  assert.equal(facadeOptions.getAnimationState(), animationState);
  assert.equal(typeof facadeOptions.translate, 'function');
  assert.equal(typeof facadeOptions.getAnimationProgress, 'function');
  assert.equal(typeof facadeOptions.playAnimation, 'function');
  assert.equal(typeof facadeOptions.stopAnimation, 'function');
  assert.equal(typeof facadeOptions.importAnimationToGroup, 'function');
  assert.deepEqual(domRoots, [
    ['timeline', root],
    ['list', root],
    ['import', root],
    ['mode', root],
  ]);
  assert.equal(facadeOptions.renderAnimationTimeline(), 'render-timeline');
  assert.equal(facadeOptions.updateAnimationTimelinePlayback(), 'update-timeline');
  assert.equal(facadeOptions.renderAnimationModeList(), 'render-list');
  assert.equal(facadeOptions.getModalAnimationImportText(), 'modal-text');
  assert.equal(facadeOptions.clearModalAnimationImportText(), 'clear-modal');
  assert.equal(facadeOptions.setModalAnimationImportError(), 'modal-error');
  assert.equal(facadeOptions.getModeAnimationImportText(), 'mode-text');
  assert.equal(facadeOptions.clearModeAnimationImportText(), 'clear-mode');
  assert.equal(facadeOptions.setModeAnimationImportError(), 'mode-error');
  assert.equal(facadeOptions.hideAnimationModeChrome(), 'hide-mode');
  assert.equal(facadeOptions.showAnimationModeChrome(), 'show-mode');
  assert.equal(typeof facadeOptions.selectMesh, 'function');
  assert.equal(typeof facadeOptions.centerCameraOnSelected, 'function');
  assert.equal(typeof facadeOptions.showToast, 'function');
  assert.equal(facadeOptions.setSelectedAnimationIndex(), 'set-selected-index');
  assert.deepEqual(facadeOptions.createPanelTargets(animationState), {
    stateLike: animationState,
    selectedIndex: 4,
  });
  assert.equal(typeof facadeOptions.canEnterAnimationMode, 'function');
  assert.equal(typeof facadeOptions.enterAnimationModeState, 'function');
  assert.equal(typeof facadeOptions.exitAnimationModeState, 'function');
  assert.equal(typeof facadeOptions.hasAnimationClipAt, 'function');
  assert.equal(typeof facadeOptions.hasAnimationClips, 'function');
  assert.equal(typeof facadeOptions.deleteAnimationAt, 'function');
  assert.equal(typeof facadeOptions.playAnimationClipAtCommand, 'function');
});

test('coordinates animation panel controller playback import and timeline loop', () => {
  const group = { id: 'group' };
  const modeGroup = { id: 'mode-group' };
  const stateLike = { animationPlaying: true };
  const calls = [];
  let loopCreates = 0;
  const controller = createAnimationPanelController({
    animationState: stateLike,
    panelTargets: {
      getAnimationGroup: () => group,
      getSelectedAnimationIndex: () => 2,
      getModalImportTarget: () => group,
      getModeImportTarget: () => modeGroup,
    },
    translate: (key) => `t:${key}`,
    getAnimationProgress: () => ({ time: 1, duration: 4 }),
    playAnimation: (target, index) => calls.push(['play-animation', target, index]),
    stopAnimation: () => calls.push(['stop-animation']),
    importAnimationToGroup: (text, target) => ({ success: true, text, target }),
    renderAnimationTimeline: (target) => calls.push(['render-timeline', target]),
    updateAnimationTimelinePlayback: (progress) => calls.push(['timeline-playback', progress]),
    getModalAnimationImportText: () => 'modal-json',
    clearModalAnimationImportText: () => calls.push(['clear-modal']),
    setModalAnimationImportError: (message) => calls.push(['modal-error', message]),
    playSelectedAnimationCommand: (options) => calls.push(['play-selected', options.group, options.clipIndex]),
    restartAnimationIfPlayingCommand: (options) => calls.push(['restart', options.isPlaying, options.group, options.clipIndex]),
    toggleAnimationPlaybackCommand: (options) => calls.push(['toggle', options.isPlaying, options.group, options.clipIndex]),
    runAnimationImportSubmitCommand: (options) => {
      calls.push(['import-submit', options.getText(), options.getGroup(), options.requireGroup, options.messages]);
      options.clearText();
      options.setError('feedback');
      options.showTimelineForGroup(options.getGroup());
      return true;
    },
    renderTimelineForGroupCommand: (target, options) => {
      calls.push(['timeline-flow', target]);
      options.renderAnimationTimeline(target);
      return true;
    },
    createAnimationTimelineLoopCommand: (options) => {
      loopCreates++;
      return {
        start: () => calls.push(['loop-start', options.isAnimationPlaying(), options.getAnimationProgress()]),
      };
    },
  });

  controller.playAnim();
  controller.onAnimSelectChange();
  controller.toggleAnimPlayPause();
  assert.equal(controller.handleAnimImportSubmit(), true);
  controller.showTimelineForGroup(group);
  controller.startAnimationTimelineLoop();
  controller.startAnimationTimelineLoop();

  assert.equal(loopCreates, 1);
  assert.deepEqual(calls, [
    ['play-selected', group, 2],
    ['restart', true, group, 2],
    ['toggle', true, group, 2],
    ['import-submit', 'modal-json', group, true, {
      missingText: 't:pasteAnimJson',
      missingTarget: 't:selectGroupFirst',
    }],
    ['clear-modal'],
    ['modal-error', 'feedback'],
    ['timeline-flow', group],
    ['render-timeline', group],
    ['timeline-flow', group],
    ['render-timeline', group],
    ['loop-start', true, { time: 1, duration: 4 }],
    ['loop-start', true, { time: 1, duration: 4 }],
  ]);
});

test('coordinates animation panel controller animation-mode actions', () => {
  const modeGroup = { id: 'mode-group' };
  const stateLike = { animationMode: true, animationPlaying: false };
  const calls = [];
  const controller = createAnimationPanelController({
    animationState: stateLike,
    panelTargets: {
      getAnimationGroup: () => modeGroup,
      getSelectedAnimationIndex: () => 0,
      getModalImportTarget: () => modeGroup,
      getModeImportTarget: () => modeGroup,
    },
    translate: (key) => `t:${key}`,
    renderAnimationModeList: (animations, handlers) => calls.push(['render-list', animations, handlers.translate('empty')]),
    getModeAnimationImportText: () => 'mode-json',
    clearModeAnimationImportText: () => calls.push(['clear-mode']),
    setModeAnimationImportError: (message) => calls.push(['mode-error', message]),
    importAnimationToGroup: () => ({ success: true }),
    showToast: (message) => calls.push(['toast', message]),
    stopAnimation: () => calls.push(['stop']),
    playAnimation: (target, index) => calls.push(['play', target, index]),
    setSelectedAnimationIndex: (index) => calls.push(['set-index', index]),
    canEnterAnimationMode: () => true,
    enterAnimationModeState: () => calls.push(['enter-state']),
    exitAnimationModeState: () => calls.push(['exit-state']),
    hasAnimationClipAt: () => true,
    deleteAnimationAt: (target, index) => {
      calls.push(['delete-at', target, index]);
      return true;
    },
    runEnterAnimationModeCommand: (options) => {
      calls.push(['enter', options.messages.animModeLabel]);
      options.refreshAnimationList();
      options.showTimelineForGroup(modeGroup);
      return true;
    },
    runExitAnimationModeCommand: (options) => {
      calls.push(['exit', options.backToSceneMessage]);
      return true;
    },
    refreshAnimationModeListForGroupCommand: (target, options) => {
      calls.push(['refresh', target, options.translate('noAnimations')]);
      options.onPlay(4);
      options.onDelete(5);
      return true;
    },
    playAnimationModeClipCommand: (target, index, options) => {
      calls.push(['mode-play', target, index]);
      options.setSelectedAnimationIndex(index);
      return true;
    },
    runDeleteAnimationClipCommand: (options) => {
      calls.push(['mode-delete', options.group, options.index, options.deletedMessage]);
      return true;
    },
    runAnimationImportSubmitCommand: (options) => {
      calls.push(['mode-import', options.getText(), options.getGroup(), options.messages]);
      options.clearText();
      options.setError('');
      options.refreshAnimationList();
      return true;
    },
    renderTimelineForGroupCommand: (target) => {
      calls.push(['timeline', target]);
      return true;
    },
  });

  assert.equal(controller.enterAnimationMode(), true);
  assert.equal(controller.exitAnimationMode(), true);
  assert.equal(controller.refreshAnimationList(), true);
  assert.equal(controller.animModePlayClip(1), true);
  assert.equal(controller.animModeDeleteClip(2), true);
  assert.equal(controller.animModeImportAnim(), true);

  assert.deepEqual(calls, [
    ['enter', 't:animModeLabel'],
    ['refresh', modeGroup, 't:noAnimations'],
    ['mode-play', modeGroup, 4],
    ['set-index', 4],
    ['mode-delete', modeGroup, 5, 't:animDeleted'],
    ['timeline', modeGroup],
    ['exit', 't:backToScene'],
    ['refresh', modeGroup, 't:noAnimations'],
    ['mode-play', modeGroup, 4],
    ['set-index', 4],
    ['mode-delete', modeGroup, 5, 't:animDeleted'],
    ['mode-play', modeGroup, 1],
    ['set-index', 1],
    ['mode-delete', modeGroup, 2, 't:animDeleted'],
    ['mode-import', 'mode-json', modeGroup, {
      missingText: 't:pasteAnimJson',
      missingTarget: 't:noActiveObject',
    }],
    ['clear-mode'],
    ['mode-error', ''],
    ['refresh', modeGroup, 't:noAnimations'],
    ['mode-play', modeGroup, 4],
    ['set-index', 4],
    ['mode-delete', modeGroup, 5, 't:animDeleted'],
  ]);
});

test('coordinates animation panel timeline, list, and clip playback adapters', () => {
  const group = new THREE.Group();
  group.userData.animations = [{ name: 'idle' }];
  const calls = [];

  assert.equal(renderTimelineForGroup(group, {
    renderAnimationTimeline: (target) => {
      calls.push(['timeline', target]);
      return true;
    },
  }), true);

  assert.equal(refreshAnimationModeListForGroup(group, {
    renderAnimationModeList: (animations, handlers) => {
      calls.push(['list', animations, handlers.translate('noAnimations')]);
      handlers.onPlay(0);
      handlers.onDelete(1);
      return true;
    },
    onPlay: (index) => calls.push(['play-click', index]),
    onDelete: (index) => calls.push(['delete-click', index]),
    translate: (key) => `t:${key}`,
  }), true);

  assert.equal(playAnimationModeClip(group, 0, {
    playAnimationClipAt: ({ group: target, index }) => {
      calls.push(['play-clip', target, index]);
      return true;
    },
  }), true);

  assert.equal(refreshAnimationModeListForGroup(null), false);
  assert.equal(playAnimationModeClip(group, 0), false);
  assert.deepEqual(calls, [
    ['timeline', group],
    ['list', group.userData.animations, 't:noAnimations'],
    ['play-click', 0],
    ['delete-click', 1],
    ['play-clip', group, 0],
  ]);
});

test('manages animation mode state and object visibility', () => {
  const selected = new THREE.Group();
  const sibling = new THREE.Group();
  const other = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  const userObjects = new THREE.Group();
  userObjects.add(selected);
  userObjects.add(sibling);
  userObjects.add(other);

  const stateLike = {
    animationMode: false,
    animationModeObject: null,
    selectedMesh: selected,
    userObjects,
  };

  assert.equal(canEnterAnimationMode(selected), true);
  assert.equal(canEnterAnimationMode(other), false);
  assert.equal(getAnimationGroup(stateLike), selected);

  enterAnimationModeState(stateLike, selected);
  assert.equal(stateLike.animationMode, true);
  assert.equal(stateLike.animationModeObject, selected);
  assert.equal(getAnimationGroup(stateLike), selected);
  assert.equal(selected.visible, true);
  assert.equal(sibling.visible, false);
  assert.equal(other.visible, false);

  const previous = exitAnimationModeState(stateLike);
  assert.equal(previous, selected);
  assert.equal(stateLike.animationMode, false);
  assert.equal(stateLike.animationModeObject, null);
  assert.equal(sibling.visible, true);
  assert.equal(other.visible, true);
});

test('runs animation mode enter and exit flows through injected side effects', () => {
  const selected = new THREE.Group();
  selected.userData.name = 'WALKER';
  const sibling = new THREE.Group();
  const userObjects = new THREE.Group();
  userObjects.add(selected);
  userObjects.add(sibling);

  const stateLike = {
    animationMode: false,
    animationModeObject: null,
    selectedMesh: selected,
    userObjects,
  };
  const calls = [];

  assert.equal(runEnterAnimationMode({
    animationState: stateLike,
    canEnterAnimationMode,
    stopAnimation: () => calls.push(['stop']),
    enterAnimationModeState,
    selectMesh: (object) => calls.push(['select', object]),
    centerCameraOnSelected: () => calls.push(['center']),
    showAnimationModeChrome: (name) => calls.push(['showChrome', name]),
    refreshAnimationList: () => calls.push(['refreshList']),
    showTimelineForGroup: (group) => calls.push(['timeline', group]),
    showToast: (message) => calls.push(['toast', message]),
    messages: {
      selectGroupForAnimMode: 'select group',
      animModeLabel: 'Mode: ',
    },
  }), true);

  assert.equal(stateLike.animationMode, true);
  assert.equal(stateLike.animationModeObject, selected);
  assert.equal(sibling.visible, false);
  assert.deepEqual(calls, [
    ['stop'],
    ['select', selected],
    ['center'],
    ['showChrome', 'WALKER'],
    ['refreshList'],
    ['timeline', selected],
    ['toast', 'Mode: WALKER'],
  ]);

  calls.length = 0;
  assert.equal(runExitAnimationMode({
    animationState: stateLike,
    stopAnimation: () => calls.push(['stop']),
    exitAnimationModeState,
    hideAnimationModeChrome: (hasSelection) => calls.push(['hideChrome', hasSelection]),
    showTimelineForGroup: (group) => calls.push(['timeline', group]),
    showToast: (message) => calls.push(['toast', message]),
    backToSceneMessage: 'back',
  }), true);

  assert.equal(stateLike.animationMode, false);
  assert.equal(stateLike.animationModeObject, null);
  assert.equal(sibling.visible, true);
  assert.deepEqual(calls, [
    ['stop'],
    ['hideChrome', true],
    ['timeline', selected],
    ['toast', 'back'],
  ]);
});

test('rejects invalid animation mode entry through injected flow', () => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  const calls = [];

  assert.equal(runEnterAnimationMode({
    object: mesh,
    canEnterAnimationMode,
    stopAnimation: () => calls.push(['stop']),
    showToast: (message) => calls.push(['toast', message]),
    messages: { selectGroupForAnimMode: 'select group' },
  }), false);
  assert.deepEqual(calls, [['toast', 'select group']]);
});

test('keeps animation metadata and clips aligned when deleting', () => {
  const group = new THREE.Group();
  group.userData.animations = [{ name: 'idle' }, { name: 'run' }, { name: 'jump' }];
  group.userData.animationClips = [{ name: 'idleClip' }, { name: 'runClip' }, { name: 'jumpClip' }];

  assert.equal(hasAnimationClips(group), true);
  assert.equal(hasAnimationClipAt(group, 1), true);
  assert.equal(deleteAnimationAt(group, 1), true);
  assert.deepEqual(group.userData.animations.map((animation) => animation.name), ['idle', 'jump']);
  assert.deepEqual(group.userData.animationClips.map((clip) => clip.name), ['idleClip', 'jumpClip']);

  assert.equal(deleteAnimationAt(group, 10), false);
  assert.equal(deleteAnimationAt(null, 0), false);
});

test('runs animation mode delete flow with injected refresh side effects', () => {
  const group = new THREE.Group();
  group.userData.animations = [{ name: 'idle' }, { name: 'run' }];
  group.userData.animationClips = [{ name: 'idleClip' }, { name: 'runClip' }];
  const calls = [];

  assert.equal(runDeleteAnimationClip({
    group,
    index: 0,
    stopAnimation: () => calls.push(['stop']),
    deleteAnimationAt,
    refreshAnimationList: () => calls.push(['refreshList']),
    showTimelineForGroup: (target) => calls.push(['timeline', target]),
    showToast: (message) => calls.push(['toast', message]),
    deletedMessage: 'deleted',
  }), true);

  assert.deepEqual(group.userData.animations.map((animation) => animation.name), ['run']);
  assert.deepEqual(group.userData.animationClips.map((clip) => clip.name), ['runClip']);
  assert.deepEqual(calls, [
    ['stop'],
    ['refreshList'],
    ['timeline', group],
    ['toast', 'deleted'],
  ]);
  assert.equal(runDeleteAnimationClip({ group: null }), false);
});

test('runs animation timeline loop through injected frame dependencies', () => {
  const scheduledFrames = [];
  const calls = [];
  let playing = false;
  const loop = createAnimationTimelineLoop({
    requestFrame: (callback) => {
      scheduledFrames.push(callback);
      return scheduledFrames.length;
    },
    getAnimationProgress: () => ({ time: calls.length, duration: 10 }),
    isAnimationPlaying: () => playing,
    updateAnimationTimelinePlayback: (progress, isPlaying) => calls.push({ progress, isPlaying }),
  });

  assert.equal(loop.isRunning(), false);
  loop.start();
  assert.equal(loop.isRunning(), true);
  assert.equal(scheduledFrames.length, 1);
  assert.deepEqual(calls[0], { progress: { time: 0, duration: 10 }, isPlaying: false });

  loop.start();
  assert.equal(scheduledFrames.length, 1);

  playing = true;
  scheduledFrames[0]();
  assert.equal(scheduledFrames.length, 2);
  assert.deepEqual(calls[1], { progress: { time: 1, duration: 10 }, isPlaying: true });

  loop.stop();
  scheduledFrames[1]();
  assert.equal(calls.length, 2);
});

test('toggles animation mode chrome DOM adapter', () => {
  const createClassList = (initial = []) => {
    const classes = new Set(initial);
    return {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    };
  };
  const createElement = (classes = []) => ({
    textContent: '',
    classList: createClassList(classes),
  });
  const elements = new Map([
    ['left-panel', createElement()],
    ['properties-panel', createElement()],
    ['anim-mode-panel', createElement(['hidden'])],
    ['anim-mode-banner', createElement(['hidden'])],
    ['anim-mode-obj-name', createElement()],
    ['anim-mode-banner-name', createElement()],
  ]);
  const root = {
    getElementById: (id) => elements.get(id) || null,
  };

  showAnimationModeChrome('WALKER', root);
  assert.equal(elements.get('left-panel').classList.contains('hidden'), true);
  assert.equal(elements.get('properties-panel').classList.contains('hidden'), true);
  assert.equal(elements.get('anim-mode-panel').classList.contains('hidden'), false);
  assert.equal(elements.get('anim-mode-banner-name').textContent, 'WALKER');

  const adapter = createAnimationModeDomAdapter({ root });
  adapter.showAnimationModeChrome('ADAPTER');
  assert.equal(elements.get('anim-mode-obj-name').textContent, 'ADAPTER');

  hideAnimationModeChrome(true, root);
  assert.equal(elements.get('left-panel').classList.contains('hidden'), false);
  assert.equal(elements.get('properties-panel').classList.contains('hidden'), false);
  assert.equal(elements.get('anim-mode-panel').classList.contains('hidden'), true);
  assert.equal(elements.get('anim-mode-banner').classList.contains('hidden'), true);
});

test('renders animation mode list rows with callbacks', () => {
  const createElement = (tagName = 'div') => {
    const children = [];
    const listeners = new Map();
    return {
      tagName,
      className: '',
      textContent: '',
      addEventListener: (event, callback) => listeners.set(event, callback),
      click: () => listeners.get('click')?.(),
      append: (...items) => children.push(...items),
      appendChild: (child) => children.push(child),
      replaceChildren: () => { children.length = 0; },
      get children() { return children; },
    };
  };
  const list = createElement();
  const root = {
    createElement,
    getElementById: (id) => (id === 'anim-mode-list' ? list : null),
  };
  const calls = [];

  assert.equal(renderAnimationModeList([], { translate: (key) => key }, root), true);
  assert.equal(list.children.length, 1);
  assert.equal(list.children[0].textContent, 'noAnimations');

  renderAnimationModeList([
    { name: 'idle', duration: 1.5, tracks: [{}, {}] },
  ], {
    onPlay: (index) => calls.push(['play', index]),
    onDelete: (index) => calls.push(['delete', index]),
    translate: (key) => key,
  }, root);

  const row = list.children[0];
  assert.equal(row.children[0].textContent, 'idle');
  assert.equal(row.children[1].textContent, '1.5s');
  assert.equal(row.children[2].textContent, '2t');

  row.children[3].click();
  row.children[4].click();
  assert.deepEqual(calls, [['play', 0], ['delete', 0]]);

  const adapter = createAnimationListDomAdapter({ root });
  assert.equal(adapter.renderAnimationModeList(null, { translate: () => 'empty' }), true);
  assert.equal(list.children[0].textContent, 'empty');
});

test('validates and imports animation data to a group', () => {
  const group = new THREE.Group();
  group.userData.name = 'ANIM_GROUP';

  const pivot = new THREE.Group();
  pivot.userData.name = 'BODY';
  pivot.name = 'BODY';
  group.add(pivot);

  const animation = {
    name: 'idle',
    duration: 1,
    tracks: [{
      target: 'BODY',
      property: 'position',
      keyframes: [
        { time: 0, value: [0, 0, 0] },
        { time: 1, value: [0, 1, 0] },
      ],
    }],
  };

  assert.equal(validateAnimationJSON(animation), null);
  const result = importAnimationDataToGroup(animation, group);
  assert.equal(result.success, true);
  assert.equal(group.userData.animations.length, 1);
  assert.equal(group.userData.animationClips.length, 1);
});

test('imports animation JSON through pure injected core dependencies', () => {
  const group = { userData: {} };
  const animation = {
    name: ' idle  pose ',
    duration: 1,
    tracks: [{
      target: ' BODY ',
      property: 'position',
      keyframes: [{ time: 0, value: [0, 0, 0] }],
    }],
  };
  const toasts = [];
  const translate = (key, params = {}) => `${key}${params.n ? `:${params.n}` : ''}`;
  const compileAnimationCommand = (definition, target) => ({
    name: definition.name,
    target,
  });

  assert.equal(validateAnimationJSONCore(animation, { translate }), null);
  const normalized = normalizeAnimationDefinition(animation);
  assert.equal(normalized.name, 'idle pose');
  assert.equal(normalized.tracks[0].target, 'BODY');

  const single = importAnimationDataToGroupCore(animation, group, {
    compileAnimation: compileAnimationCommand,
    translate,
  });
  assert.deepEqual(single, { success: true, count: 1 });
  assert.equal(group.userData.animations.length, 1);
  assert.equal(group.userData.animationClips[0].name, 'idle pose');

  const multiple = importAnimationToGroupCore(JSON.stringify({
    animations: [
      animation,
      { ...animation, name: '', tracks: [] },
    ],
  }), group, {
    compileAnimation: compileAnimationCommand,
    showToast: (message) => toasts.push(message),
    translate,
  });
  assert.equal(multiple.success, true);
  assert.equal(multiple.count, 1);
  assert.equal(multiple.warnings.length, 1);
  assert.deepEqual(toasts, ['nAnimsImported:1']);

  assert.match(importAnimationToGroupCore('{', group, { translate }).error, /^jsonInvalid/);
  assert.equal(importAnimationToGroupCore(JSON.stringify({ animations: [] }), group, {
    translate,
  }).error, 'animArrayEmpty');
});

test('builds browser animation importer adapter through injected facade dependencies', () => {
  const group = { userData: {} };
  const translate = (key) => `t:${key}`;
  const compileAnimationCommand = () => ({ name: 'clip' });
  const calls = [];

  const importer = createBrowserAnimationImporter({
    compileAnimationCommand,
    showToastCommand: (message) => calls.push(['toast', message]),
    translate,
  });

  assert.equal(importer.validateAnimationJSON({}), 't:animMissingName');
  assert.equal(importer.normalizeAnimationDefinition({ name: '  walk  ', tracks: [] }).name, 'walk');
  const result = importer.importAnimationToGroup(JSON.stringify({
    name: 'idle',
    duration: 1,
    tracks: [{
      target: 'BODY',
      property: 'position',
      keyframes: [{ time: 0, value: [0, 0, 0] }],
    }],
  }), group);
  assert.equal(result.success, true);
  assert.equal(group.userData.animationClips.length, 1);
});

test('runs object action flow with injected state selection history and texture adapters', () => {
  const userObjects = new THREE.Group();
  const texture = { id: 'map' };
  const userTexture = { id: 'user-texture' };
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  mesh.material.map = texture;
  mesh.userData = {
    name: 'ORIGINAL',
    texture: userTexture,
    textureTransform: { offset: [0.25, 0.5] },
    faceUVs: [{ u: 0, v: 0, w: 1, h: 1 }],
    animationClips: [{ name: 'runtime-only' }],
  };
  userObjects.add(mesh);

  const actionState = {
    animationMode: false,
    selectedMesh: mesh,
    userObjects,
  };
  const actions = [];
  const calls = [];
  const selectMeshRef = (selected) => {
    actionState.selectedMesh = selected;
    calls.push(['select', selected.userData.name]);
  };
  const deselectRef = () => {
    actionState.selectedMesh = null;
    calls.push(['deselect']);
  };

  const duplicated = duplicateSelectedObject({
    actionState,
    selectMesh: selectMeshRef,
    deselect: deselectRef,
    pushAction: (action) => actions.push(action),
    translate: (key) => key,
    cloneTextureCommand: (source) => ({ clonedFrom: source.id }),
    getTextureTransformCommand: () => ({ offset: [0, 0] }),
  });

  assert.equal(duplicated.success, true);
  assert.equal(userObjects.children.length, 2);
  assert.equal(actionState.selectedMesh, duplicated.clone);
  assert.equal(duplicated.clone.position.x, mesh.position.x + 1);
  assert.notEqual(duplicated.clone.material, mesh.material);
  assert.deepEqual(duplicated.clone.material.map, { clonedFrom: 'map' });
  assert.deepEqual(duplicated.clone.userData.texture, { clonedFrom: 'user-texture' });
  assert.deepEqual(duplicated.clone.userData.textureTransform, { offset: [0.25, 0.5] });
  assert.deepEqual(duplicated.clone.userData.faceUVs, [{ u: 0, v: 0, w: 1, h: 1 }]);
  assert.equal(duplicated.clone.userData.animationClips, undefined);
  assert.equal(actions[0].type, 'actionDuplicate');

  actions[0].undo();
  assert.equal(userObjects.children.length, 1);
  assert.equal(actionState.selectedMesh, null);
  actions[0].redo();
  assert.equal(userObjects.children.length, 2);
  assert.equal(actionState.selectedMesh, duplicated.clone);

  const deleted = deleteSelectedObject({
    actionState,
    selectMesh: selectMeshRef,
    deselect: deselectRef,
    pushAction: (action) => actions.push(action),
    translate: (key) => key,
  });
  assert.equal(deleted.success, true);
  assert.equal(userObjects.children.includes(duplicated.clone), false);
  assert.equal(actionState.selectedMesh, null);
  assert.equal(actions[1].type, 'actionDelete');

  actions[1].undo();
  assert.equal(userObjects.children.includes(duplicated.clone), true);
  assert.equal(actionState.selectedMesh, duplicated.clone);
  actions[1].redo();
  assert.equal(userObjects.children.includes(duplicated.clone), false);
  assert.deepEqual(calls, [
    ['select', 'ORIGINAL'],
    ['deselect'],
    ['select', 'ORIGINAL'],
    ['deselect'],
    ['select', 'ORIGINAL'],
    ['deselect'],
  ]);

  actionState.animationMode = true;
  actionState.selectedMesh = mesh;
  assert.equal(deleteSelectedObject({ actionState }), null);
  actionState.selectedMesh = null;
  assert.equal(duplicateSelectedObject({ actionState }), null);
});

test('runs scene action flow with injected state camera and disposal adapters', () => {
  const copiedPositions = [];
  const selected = {
    getWorldPosition: (position) => {
      position.set(3, 4, 5);
    },
  };
  const actionState = {
    selectedMesh: selected,
    orbitControls: {
      target: {
        copy: (position) => copiedPositions.push(position.toArray()),
      },
    },
  };

  const centered = centerCameraOnSelectedObject({
    actionState,
    createVector3: () => new THREE.Vector3(),
  });
  assert.equal(centered.success, true);
  assert.deepEqual(copiedPositions, [[3, 4, 5]]);
  assert.equal(centerCameraOnSelectedObject({ actionState: { selectedMesh: null } }), null);

  const userObjects = new THREE.Group();
  const disposed = [];
  const materialA = { dispose: () => disposed.push('materialA') };
  const materialB = { dispose: () => disposed.push('materialB') };
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  mesh.geometry.dispose = () => disposed.push('geometry');
  mesh.material = [materialA, materialB];
  const group = new THREE.Group();
  group.add(mesh);
  userObjects.add(group);

  const reset = resetSceneObjects({
    actionState: { userObjects },
    deselectAll: () => disposed.push('deselect'),
  });
  assert.equal(reset.success, true);
  assert.deepEqual(reset.removed, [group]);
  assert.equal(userObjects.children.length, 0);
  assert.deepEqual(disposed, ['deselect', 'geometry', 'materialA', 'materialB']);
  assert.equal(resetSceneObjects({ actionState: {} }), null);

  const singleMaterialDisposals = [];
  const singleMaterialMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#00ff00' })
  );
  singleMaterialMesh.geometry.dispose = () => singleMaterialDisposals.push('geometry');
  singleMaterialMesh.material.dispose = () => singleMaterialDisposals.push('material');
  disposeSceneActionObject(singleMaterialMesh);
  assert.deepEqual(singleMaterialDisposals, ['geometry', 'material']);
});

test('runs group action flow with injected state selection and history adapters', () => {
  const userObjects = new THREE.Group();
  const first = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ff0000' })
  );
  const second = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#00ff00' })
  );
  first.userData.name = 'FIRST';
  second.userData.name = 'SECOND';
  first.position.set(1, 0, 0);
  second.position.set(2, 0, 0);
  userObjects.add(first, second);

  const actionState = {
    selectedMesh: first,
    selectedMeshes: new Set([first, second]),
    userObjects,
  };
  const actions = [];
  const calls = [];
  const selectMeshRef = (target) => {
    actionState.selectedMesh = target;
    calls.push(['select', target.userData.name]);
  };
  const deselectAllRef = () => {
    actionState.selectedMesh = null;
    calls.push(['deselectAll']);
  };

  assert.equal(groupSelectedObjects({ actionState: { selectedMeshes: new Set([first]) } }), null);

  const grouped = groupSelectedObjects({
    actionState,
    GroupClass: THREE.Group,
    selectMesh: selectMeshRef,
    deselectAll: deselectAllRef,
    pushAction: (action) => actions.push(action),
    translate: (key) => key,
  });
  assert.equal(grouped.success, true);
  assert.equal(grouped.group.userData.name, 'CUSTOM GROUP');
  assert.deepEqual(userObjects.children, [grouped.group]);
  assert.deepEqual(grouped.group.children, [first, second]);
  assert.equal(actionState.selectedMesh, grouped.group);
  assert.equal(actions[0].type, 'actionGroup');

  actions[0].undo();
  assert.deepEqual(userObjects.children, [first, second]);
  actions[0].redo();
  assert.deepEqual(userObjects.children, [grouped.group]);
  assert.deepEqual(grouped.group.children, [first, second]);

  actionState.selectedMesh = grouped.group;
  assert.equal(getSelectedGroupForUngroup(actionState), grouped.group);
  actionState.selectedMesh = first;
  assert.equal(getSelectedGroupForUngroup(actionState), grouped.group);
  actionState.selectedMesh = null;
  assert.equal(getSelectedGroupForUngroup(actionState), null);

  actionState.selectedMesh = grouped.group;
  const ungrouped = ungroupSelectedObject({
    actionState,
    selectMesh: selectMeshRef,
    deselectAll: deselectAllRef,
    pushAction: (action) => actions.push(action),
    translate: (key) => key,
  });
  assert.equal(ungrouped.success, true);
  assert.deepEqual(userObjects.children, [first, second]);
  assert.equal(actionState.selectedMesh, first);
  assert.equal(actions[1].type, 'actionUngroup');

  actions[1].undo();
  assert.deepEqual(userObjects.children, [grouped.group]);
  assert.deepEqual(grouped.group.children, [first, second]);
  actions[1].redo();
  assert.deepEqual(userObjects.children, [first, second]);
  assert.deepEqual(calls.map((entry) => entry[0]), [
    'deselectAll',
    'select',
    'deselectAll',
    'deselectAll',
    'select',
    'deselectAll',
    'select',
    'deselectAll',
    'select',
    'deselectAll',
  ]);
});

test('runs bone action flow with injected state selection toast and history adapters', () => {
  const userObjects = new THREE.Group();
  const rootGroup = new THREE.Group();
  rootGroup.userData.name = 'ROOT';
  const oldParent = new THREE.Group();
  oldParent.userData.isPivot = true;
  oldParent.userData.name = 'SPINE';
  const pivot = new THREE.Group();
  pivot.userData.isPivot = true;
  pivot.userData.name = 'HAND';
  oldParent.position.set(1, 0, 0);
  pivot.position.set(2, 0, 0);
  userObjects.add(rootGroup);
  rootGroup.add(oldParent);
  oldParent.add(pivot);

  const actionState = { selectedMesh: pivot, userObjects };
  const actions = [];
  const calls = [];
  const selectMeshRef = (target) => {
    actionState.selectedMesh = target;
    calls.push(['select', target.userData.name]);
  };
  const showToastRef = (message) => calls.push(['toast', message]);
  const translate = (key) => key;

  assert.equal(detachSelectedBone({ actionState: { selectedMesh: rootGroup, userObjects } }), null);
  const noParentPivot = new THREE.Group();
  noParentPivot.userData.isPivot = true;
  rootGroup.add(noParentPivot);
  const noParent = detachSelectedBone({
    actionState: { selectedMesh: noParentPivot, userObjects },
    showToast: showToastRef,
    translate,
  });
  assert.deepEqual(noParent, { success: false, reason: 'no-parent' });

  const detached = detachSelectedBone({
    actionState,
    selectMesh: selectMeshRef,
    pushAction: (action) => actions.push(action),
    showToast: showToastRef,
    translate,
  });
  assert.equal(detached.success, true);
  assert.equal(pivot.parent, rootGroup);
  assert.equal(actions[0].type, 'actionDetachBone');
  actions[0].undo();
  assert.equal(pivot.parent, oldParent);
  actions[0].redo();
  assert.equal(pivot.parent, rootGroup);

  const targetParent = new THREE.Group();
  targetParent.userData.isPivot = true;
  targetParent.userData.name = 'ARM';
  rootGroup.add(targetParent);
  assert.equal(isDescendantOf(targetParent, pivot), false);
  assert.equal(getPivotDepth(targetParent), 1);

  const attached = attachSelectedBone(targetParent, {
    actionState,
    selectMesh: selectMeshRef,
    pushAction: (action) => actions.push(action),
    showToast: showToastRef,
    translate,
  });
  assert.equal(attached.success, true);
  assert.equal(pivot.parent, targetParent);
  assert.equal(actions[1].type, 'actionAttachBone');
  actions[1].undo();
  assert.equal(pivot.parent, rootGroup);
  actions[1].redo();
  assert.equal(pivot.parent, targetParent);

  const descendant = new THREE.Group();
  descendant.userData.isPivot = true;
  pivot.add(descendant);
  const descendantResult = attachSelectedBone(descendant, {
    actionState,
    showToast: showToastRef,
    translate,
  });
  assert.deepEqual(descendantResult, { success: false, reason: 'descendant' });
  assert.equal(isDescendantOf(descendant, pivot), true);

  const depthA = new THREE.Group();
  const depthB = new THREE.Group();
  const depthC = new THREE.Group();
  const depthD = new THREE.Group();
  [depthA, depthB, depthC, depthD].forEach((node) => { node.userData.isPivot = true; });
  rootGroup.add(depthA);
  depthA.add(depthB);
  depthB.add(depthC);
  depthC.add(depthD);
  const depthResult = attachSelectedBone(depthD, {
    actionState,
    showToast: showToastRef,
    translate,
  });
  assert.deepEqual(depthResult, { success: false, reason: 'max-depth' });
  assert.equal(getPivotDepth(depthD), 4);

  assert.deepEqual(calls.filter(([type]) => type === 'toast'), [
    ['toast', 'boneNoParent'],
    ['toast', 'boneDetached'],
    ['toast', 'boneAttachedToARM'],
    ['toast', 'cannotAttachDescendant'],
    ['toast', 'maxNesting'],
  ]);
});

test('creates action contexts with explicit state getters and legacy state compatibility', () => {
  const legacyState = { id: 'legacy-state' };
  const legacyContext = createActionContext({
    state: legacyState,
    selectMesh: () => {},
  });
  assert.equal(legacyContext.state, legacyState);
  assert.equal(legacyContext.getActionState(), legacyState);

  const currentState = { id: 'current-state' };
  const explicitContext = createActionContext({
    state: legacyState,
    getActionState: () => currentState,
  });
  assert.equal(explicitContext.state, legacyState);
  assert.equal(explicitContext.getActionState(), currentState);
});

test('runs object actions with injected action context', () => {
  const userObjects = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#ffcc00' })
  );
  mesh.userData.name = 'ORIGINAL';
  userObjects.add(mesh);

  const fakeState = {
    animationMode: false,
    selectedMesh: mesh,
    selectedMeshes: new Set(),
    userObjects,
  };
  const actions = [];

  configureActionContext({
    getActionState: () => fakeState,
    selectMesh: (selected) => { fakeState.selectedMesh = selected; },
    deselect: () => { fakeState.selectedMesh = null; },
    pushAction: (action) => actions.push(action),
    t: (key) => key,
  });

  try {
    duplicateSelected();
    assert.equal(userObjects.children.length, 2);
    assert.equal(fakeState.selectedMesh, userObjects.children[1]);
    assert.equal(actions[0].type, 'actionDuplicate');

    deleteSelected();
    assert.equal(userObjects.children.length, 1);
    assert.equal(fakeState.selectedMesh, null);
    assert.equal(actions[1].type, 'actionDelete');
  } finally {
    resetActionContext();
  }
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures++;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`${tests.length} unit tests passed.`);
