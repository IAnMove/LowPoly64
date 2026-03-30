import { state } from './state.js';
import { t } from './i18n.js';

export function toggleSnap() {
  state.snapEnabled = !state.snapEnabled;

  if (state.snapEnabled) {
    state.transformControls.setTranslationSnap(0.5);
    state.transformControls.setRotationSnap(Math.PI / 12);
    state.transformControls.setScaleSnap(0.25);
  } else {
    state.transformControls.setTranslationSnap(null);
    state.transformControls.setRotationSnap(null);
    state.transformControls.setScaleSnap(null);
  }

  const indicator = document.getElementById('snap-status');
  if (indicator) {
    indicator.textContent = state.snapEnabled ? t('snapOn') : t('snapOff');
  }

  return state.snapEnabled;
}
