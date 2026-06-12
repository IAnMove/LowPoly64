export const LEFT_PANEL = {
  panelId: 'left-panel',
  iconId: 'toggle-left-icon',
  collapsedIcon: '&#9654;',
  expandedIcon: '&#9664;',
};

export const RIGHT_PANEL = {
  panelId: 'right-panel',
  iconId: 'toggle-right-icon',
  collapsedIcon: '&#9664;',
  expandedIcon: '&#9654;',
};

export function createPanelController({
  leftPanel = LEFT_PANEL,
  rightPanel = RIGHT_PANEL,
  getPanelElements = () => ({}),
  isNarrowViewport = () => false,
  scheduleResize = (callback) => callback(),
  onResize = () => {},
  resizeDelay = 10,
} = {}) {
  function setPanelCollapsed(config, collapsed) {
    const { panel, icon } = getPanelElements(config);
    if (!panel || !icon) return false;

    panel.classList.toggle('panel-collapsed', collapsed);
    icon.innerHTML = collapsed ? config.collapsedIcon : config.expandedIcon;
    return true;
  }

  function keepViewportReadable(openPanelConfig, otherPanelConfig) {
    if (!isNarrowViewport()) return;
    const { panel } = getPanelElements(openPanelConfig);
    if (panel && !panel.classList.contains('panel-collapsed')) {
      setPanelCollapsed(otherPanelConfig, true);
    }
  }

  function requestResize() {
    scheduleResize(onResize, resizeDelay);
  }

  function togglePanel(config, otherConfig) {
    const { panel, icon } = getPanelElements(config);
    if (!panel || !icon) return false;

    panel.classList.toggle('panel-collapsed');
    icon.innerHTML = panel.classList.contains('panel-collapsed') ? config.collapsedIcon : config.expandedIcon;
    keepViewportReadable(config, otherConfig);
    requestResize();
    return true;
  }

  function toggleLeftPanel() {
    return togglePanel(leftPanel, rightPanel);
  }

  function toggleRightPanel() {
    return togglePanel(rightPanel, leftPanel);
  }

  function applyResponsivePanelDefaults() {
    if (!isNarrowViewport()) return false;
    const collapsedLeft = setPanelCollapsed(leftPanel, true);
    const collapsedRight = setPanelCollapsed(rightPanel, true);
    requestResize();
    return collapsedLeft || collapsedRight;
  }

  return {
    applyResponsivePanelDefaults,
    setPanelCollapsed,
    toggleLeftPanel,
    toggleRightPanel,
  };
}
