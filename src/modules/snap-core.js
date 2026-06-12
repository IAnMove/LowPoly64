export const DEFAULT_SNAP_SETTINGS = {
  translation: 0.5,
  rotation: Math.PI / 12,
  scale: 0.25,
};

export function getNextSnapState(enabled) {
  return !enabled;
}

export function applySnapSettings(transformControls, enabled, settings = DEFAULT_SNAP_SETTINGS) {
  transformControls.setTranslationSnap(enabled ? settings.translation : null);
  transformControls.setRotationSnap(enabled ? settings.rotation : null);
  transformControls.setScaleSnap(enabled ? settings.scale : null);
}
