import { createBrowserPanelController } from './panel-browser-adapter.js';

const panelController = createBrowserPanelController();

export function toggleLeftPanel() {
  return panelController.toggleLeftPanel();
}

export function toggleRightPanel() {
  return panelController.toggleRightPanel();
}

export function applyResponsivePanelDefaults() {
  return panelController.applyResponsivePanelDefaults();
}
