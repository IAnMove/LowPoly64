export function renderTimelineForGroup(group, {
  renderAnimationTimeline = () => false,
} = {}) {
  return renderAnimationTimeline(group);
}

export function refreshAnimationModeListForGroup(group, {
  renderAnimationModeList = () => false,
  onPlay = () => {},
  onDelete = () => {},
  translate = (key) => key,
} = {}) {
  if (!group) return false;

  return renderAnimationModeList(group?.userData?.animations || [], {
    onPlay,
    onDelete,
    translate,
  });
}

export function playAnimationModeClip(group, index, {
  playAnimationClipAt,
  hasAnimationClipAt,
  setSelectedAnimationIndex,
  stopAnimation,
  playAnimation,
} = {}) {
  if (typeof playAnimationClipAt !== 'function') return false;

  return playAnimationClipAt({
    group,
    index,
    hasAnimationClipAt,
    setSelectedAnimationIndex,
    stopAnimation,
    playAnimation,
  });
}
