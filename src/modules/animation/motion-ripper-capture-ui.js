export function setGeneratedAnimationName(ui) {
  if (!ui.nameInput || ui.nameInput.value.trim()) return;
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  ui.nameInput.value = `youtube-rip-${datePart}-${timePart}`;
}

export function ensureAnimationName(ui) {
  const value = ui.nameInput?.value?.trim();
  if (value) return value;
  setGeneratedAnimationName(ui);
  return ui.nameInput?.value?.trim() || 'youtube-rip';
}

export function updateSmoothingLabel(ui) {
  if (ui.smoothingValue) {
    ui.smoothingValue.textContent = (Number.parseFloat(ui.smoothing?.value || '0.55') || 0).toFixed(2);
  }
}

export function updateTrackingUi(ui, t, confidence) {
  if (ui.trackedState) {
    ui.trackedState.textContent = confidence > 0.55 ? t('motionRipperTracked') : t('motionRipperSearching');
  }
  if (ui.confidenceValue) {
    ui.confidenceValue.textContent = `${Math.round(confidence * 100)}%`;
  }
}

export function updateRecordingUi(ui, t, isRecording) {
  if (ui.recordBtn) {
    ui.recordBtn.textContent = isRecording ? t('motionRipperStopRecord') : t('motionRipperStartRecord');
  }
  if (ui.recordingBadge) {
    ui.recordingBadge.textContent = isRecording ? t('motionRipperRecordingBadge') : t('motionRipperIdleBadge');
  }
}

export function getRecordingElapsedSeconds({
  captureSourceKind,
  video,
  recordingVideoStartedAt,
  recordingStartedAt,
  nowMs,
}) {
  if (captureSourceKind === 'local-video' && video) {
    return Math.max(0, (video.currentTime || 0) - recordingVideoStartedAt);
  }
  return (nowMs - recordingStartedAt) / 1000;
}

export function resetFreezeLowerBodyPreference(captureAnalysisState, ui) {
  captureAnalysisState.freezeLowerBodyTouched = false;
  if (ui.freezeLowerBody) {
    ui.freezeLowerBody.checked = false;
  }
}

export function updateHalfBodyUi(captureAnalysisState, ui, t, analysis, hasFrames) {
  if (!captureAnalysisState.freezeLowerBodyTouched && ui.freezeLowerBody) {
    ui.freezeLowerBody.checked = hasFrames && analysis.isHalfBodyDetected;
  }

  if (ui.freezeLowerBody) {
    ui.freezeLowerBody.disabled = !hasFrames;
  }

  if (ui.bodyModeBadge) {
    ui.bodyModeBadge.textContent = t('motionRipperHalfBodyBadge');
    ui.bodyModeBadge.className = analysis.isHalfBodyDetected
      ? 'text-[8px] text-amber-200 border border-amber-400/60 px-2 py-1 bg-amber-500/10'
      : 'hidden text-[8px] text-amber-200 border border-amber-400/60 px-2 py-1 bg-amber-500/10';
  }

  if (ui.freezeLowerBodyHint) {
    ui.freezeLowerBodyHint.textContent = analysis.isHalfBodyDetected
      ? t('motionRipperFreezeLowerBodyHintDetected')
      : t('motionRipperFreezeLowerBodyHintIdle');
    ui.freezeLowerBodyHint.className = analysis.isHalfBodyDetected
      ? 'text-[8px] leading-relaxed text-amber-200 mt-1'
      : 'text-[8px] leading-relaxed text-zinc-500 mt-1';
  }
}

export function updateStatsUi({ ui, t, recordedFrames, hasFrames, frameEditActive, analysis, captureAnalysisState }) {
  if (ui.frameCount) {
    ui.frameCount.textContent = String(recordedFrames.length);
  }
  if (ui.durationValue) {
    const duration = recordedFrames.length > 0 ? recordedFrames[recordedFrames.length - 1].time : 0;
    ui.durationValue.textContent = `${duration.toFixed(1)}s`;
  }
  if (ui.importBtn) {
    ui.importBtn.disabled = !hasFrames || frameEditActive;
    ui.importBtn.className = hasFrames && !frameEditActive
      ? 'col-span-2 retro-button bg-[#ffcc00] text-black py-2 text-[9px] font-bold border-2 border-[#ffcc00]'
      : 'col-span-2 retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.createCharacterBtn) {
    ui.createCharacterBtn.disabled = !hasFrames || frameEditActive;
    ui.createCharacterBtn.className = hasFrames && !frameEditActive
      ? 'col-span-2 retro-button bg-[#00d0ff] text-black py-2 text-[9px] font-bold border-2 border-[#00d0ff]'
      : 'col-span-2 retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.exportDebugBtn) {
    ui.exportDebugBtn.disabled = !hasFrames || frameEditActive;
    ui.exportDebugBtn.className = hasFrames && !frameEditActive
      ? 'col-span-2 retro-button bg-zinc-800 text-[#00d0ff] py-2 text-[9px] border border-[#00d0ff]/60'
      : 'col-span-2 retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  updateHalfBodyUi(captureAnalysisState, ui, t, analysis, hasFrames && !frameEditActive);
}
