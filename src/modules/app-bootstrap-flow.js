export function createCachedModuleLoader(loadModule) {
  let modulePromise = null;
  return function loadCachedModule() {
    if (!modulePromise) {
      modulePromise = loadModule();
    }
    return modulePromise;
  };
}

export function bindAppDeclarativeActions({
  appDocument,
  bindDeclarativeActions,
  createAppActionMaps,
  actionMapOptions,
} = {}) {
  return bindDeclarativeActions(appDocument, createAppActionMaps(actionMapOptions));
}

export function initializeAppRuntime({
  appDocument,
  appWindow,
  appState,
  initScene,
  initI18n,
  configureAppCrossModuleHooks,
  crossModuleHooks,
  applyResponsivePanelDefaults,
  bindCanvasSelectionEvents,
  canvasSelectionOptions,
  onKeyDown,
  setupTemplateListDom,
  templateListOptions,
  setupTextureDropZoneDom,
  textureDropZoneOptions,
  setupPaletteColorInput,
  paletteColorInputOptions,
  bindDeclarativeActions,
  createAppActionMaps,
  actionMapOptions,
  startAnimationTimelineLoop,
  syncColorPickers,
  defaultColor = '#ffcc00',
} = {}) {
  initScene();
  initI18n();
  configureAppCrossModuleHooks(crossModuleHooks);
  applyResponsivePanelDefaults();

  bindCanvasSelectionEvents({
    renderer: appState.renderer,
    ...canvasSelectionOptions,
  });
  appWindow.addEventListener('keydown', onKeyDown);
  appWindow.addEventListener('resize', applyResponsivePanelDefaults);

  setupTemplateListDom(templateListOptions);
  setupTextureDropZoneDom(textureDropZoneOptions);
  setupPaletteColorInput({
    hasSelectedMesh: () => appState.selectedMesh,
    ...paletteColorInputOptions,
  });

  bindAppDeclarativeActions({
    appDocument,
    bindDeclarativeActions,
    createAppActionMaps,
    actionMapOptions,
  });
  startAnimationTimelineLoop();

  syncColorPickers(appDocument.getElementById('prop-color')?.value || defaultColor);
}

export function bootstrapAppRuntime({
  appDocument,
  initializeApp,
} = {}) {
  if (appDocument.readyState === 'loading') {
    appDocument.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}
