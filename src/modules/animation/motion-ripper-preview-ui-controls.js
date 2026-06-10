export function updateMotionRipperPreviewUi({
  ui,
  previewState,
  frameEditState,
  frameCount,
  syncPreviewFrameCounter,
  updateFrameEditUi,
}) {
  const hasClip = !!previewState.clip;
  const canStep = hasClip && frameCount > 0 && !frameEditState.active;
  const hasPreviousFrame = canStep && (previewState.currentFrameIndex || 0) > 0;
  const hasNextFrame = canStep && (previewState.currentFrameIndex || 0) < frameCount - 1;
  const canMutateFrames = frameCount > 0 && !frameEditState.active;
  const hasVisualPreview = !!previewState.model || !!previewState.rigHelperGroup || !!previewState.capturedHelperGroup;
  if (ui.previewEmpty) {
    ui.previewEmpty.classList.toggle('hidden', hasVisualPreview);
  }
  if (ui.previewToggleBtn) {
    ui.previewToggleBtn.disabled = !hasClip || frameEditState.active;
    ui.previewToggleBtn.textContent = hasClip
      ? (previewState.playing ? 'PAUSE PREVIEW' : 'RESUME PREVIEW')
      : 'NO PREVIEW YET';
    ui.previewToggleBtn.className = hasClip && !frameEditState.active
      ? `retro-button ${previewState.playing ? 'bg-[#00ff88] text-black border-2 border-[#00ff88]' : 'bg-zinc-800 text-zinc-300 border border-zinc-600'} py-2 px-3 text-[8px]`
      : 'retro-button bg-zinc-900 text-zinc-600 py-2 px-3 text-[8px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.previewPrevFrameBtn) {
    ui.previewPrevFrameBtn.disabled = !hasPreviousFrame;
    ui.previewPrevFrameBtn.className = hasPreviousFrame
      ? 'retro-button bg-zinc-800 text-zinc-300 py-2 px-3 text-[8px] border border-zinc-600'
      : 'retro-button bg-zinc-900 text-zinc-600 py-2 px-3 text-[8px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.previewNextFrameBtn) {
    ui.previewNextFrameBtn.disabled = !hasNextFrame;
    ui.previewNextFrameBtn.className = hasNextFrame
      ? 'retro-button bg-zinc-800 text-zinc-300 py-2 px-3 text-[8px] border border-zinc-600'
      : 'retro-button bg-zinc-900 text-zinc-600 py-2 px-3 text-[8px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.previewDeleteFrameBtn) {
    ui.previewDeleteFrameBtn.disabled = !canMutateFrames;
    ui.previewDeleteFrameBtn.className = canMutateFrames
      ? 'retro-button bg-zinc-800 text-rose-300 py-2 px-3 text-[8px] border border-rose-400/60'
      : 'retro-button bg-zinc-900 text-zinc-600 py-2 px-3 text-[8px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.previewRepairFrameBtn) {
    ui.previewRepairFrameBtn.disabled = !canMutateFrames;
    ui.previewRepairFrameBtn.className = canMutateFrames
      ? 'retro-button bg-zinc-800 text-[#00d0ff] py-2 px-3 text-[8px] border border-[#00d0ff]/60'
      : 'retro-button bg-zinc-900 text-zinc-600 py-2 px-3 text-[8px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  syncPreviewFrameCounter();
  updateFrameEditUi();
}
