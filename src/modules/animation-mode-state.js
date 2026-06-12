export function getAnimationGroup(animationState) {
  return animationState.animationMode ? animationState.animationModeObject : animationState.selectedMesh;
}

export function canEnterAnimationMode(object) {
  return Boolean(object?.isGroup);
}

export function enterAnimationModeState(animationState, object) {
  animationState.animationMode = true;
  animationState.animationModeObject = object;

  animationState.userObjects.children.forEach((child) => {
    if (child !== object) {
      child.visible = false;
    }
  });
}

export function exitAnimationModeState(animationState) {
  animationState.userObjects.children.forEach((child) => {
    child.visible = true;
  });

  const previousObject = animationState.animationModeObject;
  animationState.animationMode = false;
  animationState.animationModeObject = null;
  return previousObject;
}

export function hasAnimationClips(group) {
  return Boolean(group?.userData?.animationClips?.length);
}

export function hasAnimationClipAt(group, index) {
  return Boolean(group?.userData?.animationClips?.[index]);
}

export function deleteAnimationAt(group, index) {
  if (!group?.userData) return false;

  let deleted = false;
  if (Array.isArray(group.userData.animations) && index >= 0 && index < group.userData.animations.length) {
    group.userData.animations.splice(index, 1);
    deleted = true;
  }
  if (Array.isArray(group.userData.animationClips) && index >= 0 && index < group.userData.animationClips.length) {
    group.userData.animationClips.splice(index, 1);
    deleted = true;
  }

  return deleted;
}
