export function cloneJsonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function sanitizeDebugFileStem(name) {
  return String(name || 'motion-ripper')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'motion-ripper';
}

function downloadJsonFile(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function animationIdentityKey(animDef) {
  return [
    animDef?.name || '',
    animDef?.source || '',
    animDef?.sourceAuthor || '',
    animDef?.sourceSkeletonId || '',
  ].join('|');
}

function appendOrReplaceAnimation(existingAnimations, translatedAnimation) {
  const existing = Array.isArray(existingAnimations) ? existingAnimations : [];
  if (!translatedAnimation) return existing;
  const nextAnimation = cloneJsonValue(translatedAnimation);
  const nextKey = animationIdentityKey(nextAnimation);
  const filtered = existing.filter((animDef) => animationIdentityKey(animDef) !== nextKey);
  return [...filtered, nextAnimation];
}

function buildDebugAnimationExports(group, context) {
  const canonicalFrames = context.getCanonicalCapturedFrames();
  if (canonicalFrames.length < 2) {
    return null;
  }

  const captureTrackOptions = context.resolveCaptureTrackOptions(canonicalFrames);
  const canonicalAnimation = context.buildCanonicalAnimationDefinition(canonicalFrames, captureTrackOptions);
  const speedMultiplier = context.getPreviewSpeedMultiplier();
  const animationForImport = context.ui.previewImportSpeed?.checked
    ? context.retimeAnimationDefinition(canonicalAnimation, speedMultiplier)
    : canonicalAnimation;
  const targetConfig = context.resolveCaptureTargetConfig(group);
  const translatedAnimation = context.buildCaptureAnimationForTargetGroup(animationForImport, group, targetConfig);
  const fastPoserExport = translatedAnimation
    ? context.convertAnimationDefinitionToFastPoserAsset(translatedAnimation, group)
    : null;
  const fastPoserAnimation = fastPoserExport?.success ? fastPoserExport.data : null;
  const frameDump = canonicalFrames.map((frame) => ({
    time: frame.time,
    pose: cloneJsonValue(frame.pose),
    capturedRig: cloneJsonValue(frame.capturedRig),
    landmarks: cloneJsonValue(frame.landmarks),
  }));

  return {
    canonicalAnimation,
    animationForImport,
    translatedAnimation,
    fastPoserAnimation,
    targetConfig,
    captureTrackOptions,
    frameDump,
  };
}

export function exportMotionRipperDebugJsons(context) {
  const {
    ui,
    frameEditState,
    getMotionGroup,
    getActiveGroup,
    setStatus,
    showToast,
    t,
  } = context;

  if (frameEditState.active) {
    setStatus('Save or cancel the current frame edit before exporting debug JSONs.', 'error');
    return;
  }

  const group = getActiveGroup() || getMotionGroup();
  if (!group) {
    showToast(t('selectGroupForAnim'));
    return;
  }

  const debugExport = buildDebugAnimationExports(group, context);
  if (!debugExport) {
    setStatus(t('motionRipperNeedFrames'), 'error');
    return;
  }

  const {
    canonicalAnimation,
    animationForImport,
    translatedAnimation,
    fastPoserAnimation,
    targetConfig,
    captureTrackOptions,
    frameDump,
  } = debugExport;

  const fileStem = sanitizeDebugFileStem(context.ensureAnimationName());
  const captureDebugJson = {
    ...cloneJsonValue(canonicalAnimation),
    debug: {
      exportKind: 'motion-ripper-capture',
      groupName: group.userData?.name || group.name || 'GROUP',
      templateId: group.userData?.templateId || null,
      sampleRate: Number.parseInt(ui.sampleRate?.value || '10', 10) || 10,
      smoothing: Number.parseFloat(ui.smoothing?.value || '0.55') || 0.55,
      rootMotion: !!ui.rootMotion?.checked,
      previewSpeed: context.getPreviewSpeedMultiplier(),
      importUsesPreviewSpeed: !!ui.previewImportSpeed?.checked,
      captureArea: cloneJsonValue(context.getActiveCaptureRegion()),
      captureFacing: context.getCaptureFacingMode(),
      captureFacingYaw: context.getCaptureFacingYaw(),
      translatedAnimation: cloneJsonValue(translatedAnimation),
      fastPoserAnimation: cloneJsonValue(fastPoserAnimation),
      targetConfig: cloneJsonValue(targetConfig),
      captureAnalysis: cloneJsonValue(captureTrackOptions.analysis),
      suppressedCaptureJoints: Array.from(captureTrackOptions.suppressedCaptureJoints),
      freezeLowerBody: !!ui.freezeLowerBody?.checked,
      frames: frameDump,
      animationUsedForImport: cloneJsonValue(animationForImport),
    },
  };

  const serializedGroup = cloneJsonValue(
    context.isSkinnedCaptureGroup(group)
      ? context.serializeSkinnedCaptureGroup(group)
      : context.serializeGroupAsImportJSON(group)
  );
  if (!serializedGroup) {
    setStatus('Could not serialize the current model for debug export.', 'error');
    return;
  }
  if (!context.isCaptureGeneratedGroup(group)) {
    context.applyCapturedSkeletonToSerializedGroup(serializedGroup, animationForImport.sourceSkeleton, targetConfig);
  }

  const existingAnimations = Array.isArray(serializedGroup.animations) ? serializedGroup.animations : [];
  serializedGroup.animations = appendOrReplaceAnimation(existingAnimations, translatedAnimation);
  serializedGroup.motionRipperDebug = {
    exportKind: 'motion-ripper-translated-model',
    sourceAnimationName: canonicalAnimation.name,
    translatedAnimationName: translatedAnimation?.name || null,
    targetConfig: cloneJsonValue(targetConfig),
    appliedSourceSkeletonId: animationForImport.sourceSkeleton?.id || null,
  };

  downloadJsonFile(captureDebugJson, `${fileStem}-captured-debug.json`);
  downloadJsonFile(serializedGroup, `${fileStem}-translated-model.json`);
  setStatus('Debug JSONs exported: captured rig + translated model.', 'success');
  showToast('Debug JSONs exported');
}
