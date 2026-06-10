import {
  buildRepairedFrame,
  getFrameKey,
  reindexRecordedFrames,
} from './motion-ripper-frame-utils.js';

export function togglePreviewPlayback(context) {
  if (context.frameEditState.active) return;
  if (!context.previewState.action) return;
  context.setPreviewPlaybackState(!context.previewState.playing);
  if (context.previewState.playing) {
    context.setPreviewStatus('Previewing the captured take on the current model, the resolved rig and the captured rig.', 'success');
  } else {
    context.setPreviewStatus('Preview paused. Compare model, resolved rig and captured rig before importing.', 'info');
  }
}

export function seekPreviousPreviewFrame(context) {
  if (context.frameEditState.active) return;
  const frameContext = context.getCurrentCanonicalFrameContext();
  if (!frameContext) return;
  if (context.seekPreviewToFrame(frameContext.currentIndex - 1, { pause: true })) {
    context.setPreviewStatus('Preview paused on the previous frame.', 'info');
  }
}

export function seekNextPreviewFrame(context) {
  if (context.frameEditState.active) return;
  const frameContext = context.getCurrentCanonicalFrameContext();
  if (!frameContext) return;
  if (context.seekPreviewToFrame(frameContext.currentIndex + 1, { pause: true })) {
    context.setPreviewStatus('Preview paused on the next frame.', 'info');
  }
}

export function deleteCurrentPreviewFrame(context) {
  if (context.frameEditState.active) return;
  const frameContext = context.getCurrentCanonicalFrameContext();
  if (!frameContext) return;

  const frameKey = getFrameKey(frameContext.currentFrame.time);
  const recordedFrames = context.getRecordedFrames();
  const remainingFrames = recordedFrames.filter((frame) => getFrameKey(frame.time) !== frameKey);
  if (remainingFrames.length === recordedFrames.length) {
    context.setStatus('Could not remove the selected frame.', 'error');
    return;
  }

  context.setRecordedFrames(reindexRecordedFrames(remainingFrames));
  context.updateStats();
  context.refreshCapturePreview({ autoPlay: false });

  const nextCanonicalCount = context.getCanonicalCapturedFrames().length;
  if (nextCanonicalCount > 0) {
    context.seekPreviewToFrame(Math.min(frameContext.currentIndex, nextCanonicalCount - 1), { pause: true });
  }

  context.setStatus(`Removed frame ${frameContext.currentIndex + 1}.`, 'success');
  context.setPreviewStatus('Current frame removed from the take.', 'success');
}

export function repairCurrentPreviewFrame(context) {
  if (context.frameEditState.active) return;
  const frameContext = context.getCurrentCanonicalFrameContext();
  if (!frameContext) return;

  const previousFrame = frameContext.canonicalFrames[frameContext.currentIndex - 1] || null;
  const nextFrame = frameContext.canonicalFrames[frameContext.currentIndex + 1] || null;
  const repairedFrame = buildRepairedFrame(frameContext.currentFrame, previousFrame, nextFrame);
  if (!repairedFrame) {
    context.setStatus('Could not repair the selected frame.', 'error');
    return;
  }

  const frameKey = getFrameKey(frameContext.currentFrame.time);
  if (!context.replaceRecordedFrameByKey(frameKey, repairedFrame)) {
    context.setStatus('Could not replace the selected frame.', 'error');
    return;
  }

  context.refreshCapturePreview({ autoPlay: false });
  context.seekPreviewToFrame(frameContext.currentIndex, { pause: true });
  context.setStatus(`Repaired frame ${frameContext.currentIndex + 1} using adjacent pose data.`, 'success');
  context.setPreviewStatus('Current frame repaired. Review the result before importing.', 'success');
}
