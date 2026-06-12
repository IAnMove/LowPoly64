function getObjectName(object, fallbackName) {
  return object?.userData?.name || fallbackName;
}

export function runEnterAnimationMode({
  animationState,
  object = animationState?.selectedMesh,
  canEnterAnimationMode = () => false,
  stopAnimation = () => {},
  enterAnimationModeState = () => {},
  selectMesh = () => {},
  centerCameraOnSelected = () => {},
  showAnimationModeChrome = () => {},
  refreshAnimationList = () => {},
  showTimelineForGroup = () => {},
  showToast = () => {},
  messages = {},
} = {}) {
  if (!canEnterAnimationMode(object)) {
    showToast(messages.selectGroupForAnimMode);
    return false;
  }

  stopAnimation();
  enterAnimationModeState(animationState, object);

  selectMesh(object);
  centerCameraOnSelected();

  showAnimationModeChrome(getObjectName(object, messages.chromeFallbackName || 'Grupo'));
  refreshAnimationList();
  showTimelineForGroup(object);

  showToast(`${messages.animModeLabel || ''}${getObjectName(object, messages.toastFallbackName || 'Group')}`);
  return true;
}

export function runExitAnimationMode({
  animationState,
  stopAnimation = () => {},
  exitAnimationModeState = () => {},
  hideAnimationModeChrome = () => {},
  showTimelineForGroup = () => {},
  showToast = () => {},
  backToSceneMessage = '',
} = {}) {
  if (!animationState?.animationMode) return false;

  stopAnimation();
  exitAnimationModeState(animationState);

  hideAnimationModeChrome(Boolean(animationState.selectedMesh));
  if (animationState.selectedMesh) {
    showTimelineForGroup(animationState.selectedMesh);
  }

  showToast(backToSceneMessage);
  return true;
}

export function runDeleteAnimationClip({
  group,
  index,
  stopAnimation = () => {},
  deleteAnimationAt = () => false,
  refreshAnimationList = () => {},
  showTimelineForGroup = () => {},
  showToast = () => {},
  deletedMessage = '',
} = {}) {
  if (!group) return false;

  stopAnimation();
  const deleted = deleteAnimationAt(group, index);
  refreshAnimationList();
  showTimelineForGroup(group);
  showToast(deletedMessage);
  return deleted;
}
