import { initScene, toggleBones } from './scene.js';
import { addPrimitive } from './primitives.js';
import { addTemplate, generateTemplateListUI } from './templates.js';
import {
  configureSelectionHooks,
  deselect,
  deselectAll,
  onDoubleClick,
  onMouseDown,
  selectMesh,
} from './selection.js';
import { configureShortcutHooks, onKeyDown } from './shortcuts.js';
import {
  quickColor,
  randomRetroColor as getRandomRetroColor,
  setColor,
  toggleFlatShading,
  toggleWireframe,
} from './materials.js';
import {
  handleTextureUpload,
  setupTextureDragDrop,
  togglePixelated,
  toggleTexture,
} from './textures.js';
import {
  applyColorToAll,
  configureUIHooks,
  showToast,
  syncColorPickers,
  updateColorFromPanel,
  updateExportButtonText,
  updateMaterialFromPanel,
  updateName,
  updatePosition,
  updateRotation,
  updateScale,
  updateUVOffset,
  updateUVRepeat,
  updateUVRotation,
} from './ui.js';
import {
  attachBone,
  centerCameraOnSelected,
  deleteSelected,
  detachBone,
  duplicateSelected,
  groupSelected,
  resetScene,
  ungroupSelected,
} from './actions.js';
import {
  exportSceneJSON,
  importSceneJSON as importSceneJSONFile,
  loadFromLocalStorage,
  saveToLocalStorage,
} from './persistence.js';
import { cloneBrowserTexture } from './browser-canvas-adapter.js';
import { toggleSnap } from './snap.js';
import {
  closeImportModal,
  configureImportHooks,
  handleImportFile,
  handleImportSubmit,
  openImportModal,
} from './json-import.js';
import { state } from './state.js';
import { initI18n, onLangChange, t, toggleLang } from './i18n.js';
import {
  refreshObjectList,
  toggleObjectList,
  updateSelectedOverlay,
} from './object-list.js';
import {
  applyResponsivePanelDefaults,
  toggleLeftPanel,
  toggleRightPanel,
} from './panels.js';
import { refreshSceneObjectList } from './scene-object-list.js';
import {
  animModeImportAnim,
  enterAnimationMode,
  exitAnimationMode,
  handleAnimImportSubmit,
  onAnimSelectChange,
  playAnim,
  showTimelineForGroup,
  startAnimationTimelineLoop,
  stopAnim,
  toggleAnimPlayPause,
} from './animation-panel.js';
import {
  copyExportJSON,
  copyObjectJSON,
  copySceneJSON,
  downloadObjectJSON,
  exportObjectJSON,
} from './json-export-actions.js';
import { configureActionContext } from './action-context.js';
import { configureUndoFeedback, pushAction, redo, undo } from './undo.js';
import { isImportModalOpen } from './json-import-dom.js';
import { bindDeclarativeActions } from './app-action-bindings.js';
import { createAppActionMaps } from './app-action-map.js';
import { createAppChromeActions } from './app-chrome-actions.js';
import { configureAppCrossModuleHooks } from './app-cross-module-hooks.js';
import {
  bootstrapAppRuntime,
  createCachedModuleLoader,
  initializeAppRuntime,
} from './app-bootstrap-flow.js';
import {
  bindCanvasSelectionEvents,
  createAppDomSetupAdapter,
} from './app-dom-setup.js';

const loadTextureEditorModule = createCachedModuleLoader(() => import('./texture-editor.js'));
const loadExportModule = createCachedModuleLoader(() => import('./export.js'));

const {
  refreshAfterSelectionEvent,
  addPrimitiveAndRefresh,
  addTemplateAndRefresh,
  loadSceneAndRefresh,
  importSceneJSON,
  handleImportSubmitAndRefresh,
  handleImportFileAndRefresh,
  updateNameAndRefresh,
  duplicateSelectedAndRefresh,
  deleteSelectedAndRefresh,
  resetSceneAndRefresh,
  groupSelectedAndRefresh,
  ungroupSelectedAndRefresh,
} = createAppChromeActions({
  refreshObjectList,
  refreshSceneObjectList,
  updateExportButtonText,
  updateSelectedOverlay,
  addPrimitive,
  addTemplate,
  loadFromLocalStorage,
  importSceneJSONFile,
  handleImportSubmit,
  handleImportFile,
  updateName,
  duplicateSelected,
  deleteSelected,
  resetScene,
  groupSelected,
  ungroupSelected,
});

function renderTemplateList(templateList) {
  generateTemplateListUI(templateList, addTemplateAndRefresh);
}

function initializeApp() {
  const appDomSetup = createAppDomSetupAdapter({ root: document });

  initializeAppRuntime({
    appDocument: document,
    appWindow: window,
    appState: state,
    initScene,
    initI18n,
    configureAppCrossModuleHooks,
    crossModuleHooks: {
      root: document,
      state,
      configureActionContext,
      configureSelectionHooks,
      configureShortcutHooks,
      configureImportHooks,
      configureUIHooks,
      selectMesh,
      deselect,
      deselectAll,
      pushAction,
      showToast,
      configureUndoFeedback,
      cloneTexture: cloneBrowserTexture,
      t,
      attachBone,
      showTimelineForGroup,
      isImportModalOpen,
      undo,
      redo,
      duplicateSelected,
      deleteSelected,
      groupSelected,
      ungroupSelected,
      toggleAnimPlayPause,
      exitAnimationMode,
      closeImportModal,
      refreshSceneObjectList,
    },
    applyResponsivePanelDefaults,
    bindCanvasSelectionEvents,
    canvasSelectionOptions: {
      onMouseDown,
      onDoubleClick,
      onAfterSelectionEvent: refreshAfterSelectionEvent,
    },
    onKeyDown,
    setupTemplateListDom: appDomSetup.setupTemplateList,
    templateListOptions: { onLangChange, renderTemplateList },
    setupTextureDropZoneDom: appDomSetup.setupTextureDropZone,
    textureDropZoneOptions: { setupTextureDragDrop },
    setupPaletteColorInput: appDomSetup.setupPaletteColorInput,
    paletteColorInputOptions: { updateColorFromPanel },
    bindDeclarativeActions,
    createAppActionMaps,
    actionMapOptions: {
      loadTextureEditorModule,
      loadExportModule,
      toggleWireframe,
      toggleFlatShading,
      toggleBones,
      resetSceneAndRefresh,
      saveToLocalStorage,
      loadSceneAndRefresh,
      toggleLang,
      toggleLeftPanel,
      toggleRightPanel,
      addPrimitiveAndRefresh,
      openImportModal,
      exportObjectJSON,
      copyExportJSON,
      toggleSnap,
      toggleObjectList,
      quickColor,
      playAnim,
      stopAnim,
      exportSceneJSON,
      copySceneJSON,
      getAppActionState: () => state,
      setColor,
      getRandomRetroColor,
      toggleTexture,
      togglePixelated,
      duplicateSelectedAndRefresh,
      deleteSelectedAndRefresh,
      centerCameraOnSelected,
      ungroupSelectedAndRefresh,
      detachBone,
      enterAnimationMode,
      copyObjectJSON,
      downloadObjectJSON,
      groupSelectedAndRefresh,
      getMultiColorValue: appDomSetup.getMultiColorValue,
      applyColorToAll,
      exitAnimationMode,
      animModeImportAnim,
      handleImportSubmitAndRefresh,
      closeImportModal,
      handleAnimImportSubmit,
      onAnimSelectChange,
      importSceneJSON,
      updateColorFromPanel,
      updateMaterialFromPanel,
      handleTextureUpload,
      handleImportFileAndRefresh,
      updateNameAndRefresh,
      updatePosition,
      updateRotation,
      updateScale,
      updateUVOffset,
      updateUVRepeat,
      updateUVRotation,
    },
    startAnimationTimelineLoop,
    syncColorPickers,
  });
}

export function bootstrapApp() {
  bootstrapAppRuntime({ appDocument: document, initializeApp });
}
