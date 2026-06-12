import { applySnapSettings, getNextSnapState } from './snap-core.js';

export function createSnapController({
  getSnapState = () => ({}),
  translate = (key) => key,
  getNextSnapStateCommand = getNextSnapState,
  applySnapSettingsCommand = applySnapSettings,
  updateSnapIndicatorCommand = () => {},
} = {}) {
  function toggleSnap() {
    const snapState = getSnapState();
    snapState.snapEnabled = getNextSnapStateCommand(snapState.snapEnabled);
    applySnapSettingsCommand(snapState.transformControls, snapState.snapEnabled);
    updateSnapIndicatorCommand(snapState.snapEnabled, translate);
    return snapState.snapEnabled;
  }

  return {
    toggleSnap,
  };
}
