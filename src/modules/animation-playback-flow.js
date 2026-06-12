export function playSelectedAnimation({
  group,
  clipIndex,
  hasAnimationClips,
  stopAnimation,
  playAnimation,
}) {
  if (!hasAnimationClips(group)) return false;
  stopAnimation();
  playAnimation(group, clipIndex);
  return true;
}

export function restartAnimationIfPlaying({
  isPlaying,
  group,
  clipIndex,
  hasAnimationClips,
  stopAnimation,
  playAnimation,
}) {
  if (!isPlaying || !hasAnimationClips(group)) return false;
  stopAnimation();
  playAnimation(group, clipIndex);
  return true;
}

export function toggleAnimationPlayback({
  isPlaying,
  group,
  clipIndex,
  hasAnimationClips,
  stopAnimation,
  playAnimation,
}) {
  if (!hasAnimationClips(group)) return false;

  if (isPlaying) {
    stopAnimation();
  } else {
    playAnimation(group, clipIndex);
  }

  return true;
}

export function playAnimationClipAt({
  group,
  index,
  hasAnimationClipAt,
  setSelectedAnimationIndex,
  stopAnimation,
  playAnimation,
}) {
  if (!hasAnimationClipAt(group, index)) return false;

  setSelectedAnimationIndex(index);
  stopAnimation();
  playAnimation(group, index);
  return true;
}
