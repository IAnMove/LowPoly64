import * as THREE from 'three';
import { state } from './state.js';
import { setColor, updateMaterialType } from './materials.js';
import { createMaterialDomAdapter } from './material-dom.js';
import { createPropertiesPanelDomAdapter } from './properties-panel-dom.js';
import { renderSelectedObjectProperties } from './properties-panel-presenter.js';
import { rememberTextureTransform } from './texture-core.js';
import { createUIController } from './ui-controller.js';
import { pushAction } from './undo.js';
import { t } from './i18n.js';
import { createToastDomAdapter } from './toast-dom.js';
import { createExportButtonDomAdapter } from './export-button-dom.js';
import { hasExportableSelection } from './export-button-state.js';

export function createBrowserUIController({
  getUIState = () => state,
  createFacadeController = createUIController,
  initialHooks = {},
  root = globalThis.document,
  createMaterialDom = createMaterialDomAdapter,
  createPropertiesPanelDom = createPropertiesPanelDomAdapter,
  createToastDom = createToastDomAdapter,
  createExportButtonDom = createExportButtonDomAdapter,
} = {}) {
  const uiHooks = {
    refreshSceneObjectList: null,
    ...initialHooks,
  };
  const materialDom = createMaterialDom({ root });
  const propertiesPanelDom = createPropertiesPanelDom({ root });
  const toastDom = createToastDom({ root });
  const exportButtonDom = createExportButtonDom({ root });

  const controller = createFacadeController({
    getUIState,
    getHooks: () => uiHooks,
    translate: t,
    radToDeg: THREE.MathUtils.radToDeg,
    setColor,
    updateMaterialType,
    syncColorInputs: materialDom.syncColorInputs,
    pushAction,
    rememberTextureTransform,
    renderSelectedObjectPropertiesCommand: renderSelectedObjectProperties,
    clearSelectionPanel: propertiesPanelDom.clearSelectionPanel,
    getMaterialInput: propertiesPanelDom.getMaterialInput,
    readPositionInputs: propertiesPanelDom.readPositionInputs,
    readRotationDegreeInputs: propertiesPanelDom.readRotationDegreeInputs,
    readScaleInputs: propertiesPanelDom.readScaleInputs,
    readUvInputs: propertiesPanelDom.readUvInputs,
    setActionButtonVisibility: propertiesPanelDom.setActionButtonVisibility,
    setColorInput: propertiesPanelDom.setColorInput,
    setMaterialInput: propertiesPanelDom.setMaterialInput,
    setSelectedName: propertiesPanelDom.setSelectedName,
    showMultiSelectionFields: propertiesPanelDom.showMultiSelectionFields,
    showSingleSelectionFields: propertiesPanelDom.showSingleSelectionFields,
    writeObjectProperties: propertiesPanelDom.writeObjectProperties,
    writeUvControls: propertiesPanelDom.writeUvControls,
    showToastMessage: toastDom.showToastMessage,
    updateExportButtonLabel: exportButtonDom.updateExportButtonLabel,
    hasExportableSelectionCommand: hasExportableSelection,
  });

  function configureUIHooks(hooks = {}) {
    Object.assign(uiHooks, hooks);
  }

  return {
    ...controller,
    configureUIHooks,
  };
}
