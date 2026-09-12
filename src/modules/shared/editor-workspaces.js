import './editor-workspaces.css';

/** Switch the editor's docked work area while keeping its shell and scene alive. */
export function showEditorWorkspace(mode) {
  const speech = mode === 'speech';
  document.body.dataset.workspace = speech ? 'speech' : 'scene';
  const scenePanel = document.getElementById('main-workspace');
  const speechPanel = document.getElementById('speech-workspace');
  if (scenePanel) scenePanel.hidden = speech;
  if (speechPanel) speechPanel.hidden = !speech;
  for (const [name, selected] of [['scene', !speech], ['speech', speech]]) {
    const tab = document.getElementById(`workspace-${name}-tab`);
    if (tab) { tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; }
  }
  // The viewport must be visible before measuring it; resizing a hidden canvas
  // would give the scene camera an invalid aspect ratio.
  if (!speech) window.dispatchEvent(new Event('resize'));
}

export function initEditorWorkspaces() {
  showEditorWorkspace('scene');
  const tabs = document.getElementById('workspace-tabs');
  tabs?.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const speech = event.key === 'End' || (event.key !== 'Home' && event.target.id === 'workspace-scene-tab');
    const target = document.getElementById(`workspace-${speech ? 'speech' : 'scene'}-tab`);
    target?.focus(); target?.click();
  });
}
