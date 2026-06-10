import * as THREE from 'three';
import {
  cloneLandmarks,
  cloneRecordedFrame,
  getFrameKey,
  roundTime,
} from './motion-ripper-frame-utils.js';
import {
  buildCapturedPreviewRigFromLandmarks,
  serializePose,
} from './motion-ripper-pose-solver.js';

function buildEditedFrameFromLandmarks(baseFrame, editedLandmarks, computeCurrentPoseFromLandmarks) {
  if (!baseFrame || !Array.isArray(editedLandmarks) || editedLandmarks.length === 0) return null;

  const poseState = computeCurrentPoseFromLandmarks(editedLandmarks);
  const serializedPose = serializePose(poseState);
  if (baseFrame.pose?.PELVIS?.position) {
    serializedPose.PELVIS.position = [...baseFrame.pose.PELVIS.position];
  }
  const rootPosition = new THREE.Vector3(
    serializedPose.PELVIS?.position?.[0] ?? 0,
    serializedPose.PELVIS?.position?.[1] ?? 0,
    serializedPose.PELVIS?.position?.[2] ?? 0
  );

  return {
    time: roundTime(baseFrame.time || 0),
    pose: serializedPose,
    capturedRig: buildCapturedPreviewRigFromLandmarks(editedLandmarks, rootPosition),
    landmarks: cloneLandmarks(editedLandmarks),
  };
}

export function stopMotionRipperFrameEdit(context, { redraw = true } = {}) {
  const { frameEditState } = context;
  frameEditState.active = false;
  frameEditState.frameIndex = -1;
  frameEditState.frameKey = null;
  frameEditState.originalFrame = null;
  frameEditState.workingFrame = null;
  frameEditState.draggingLandmarkIndex = -1;
  context.updateFrameEditUi();
  context.updatePreviewUi();
  if (redraw) {
    context.drawOverlay(context.getLatestLandmarks());
  }
}

export function startMotionRipperFrameEdit(context) {
  const {
    frameEditState,
    captureCropState,
    isRecording,
    getCurrentCanonicalFrameContext,
    setStatus,
    setPreviewStatus,
  } = context;

  if (isRecording()) {
    setStatus('Stop the recording before editing a frame.', 'error');
    return;
  }

  const frameContext = getCurrentCanonicalFrameContext();
  if (!frameContext) {
    setStatus('Capture a take before editing a frame.', 'error');
    return;
  }
  if (!Array.isArray(frameContext.currentFrame.landmarks) || frameContext.currentFrame.landmarks.length === 0) {
    setStatus('This take has no editable landmarks stored. Record it again to edit joints manually.', 'error');
    return;
  }

  captureCropState.selecting = false;
  context.clearCaptureDraft();
  context.seekPreviewToFrame(frameContext.currentIndex, { pause: true });
  frameEditState.active = true;
  frameEditState.frameIndex = frameContext.currentIndex;
  frameEditState.frameKey = getFrameKey(frameContext.currentFrame.time);
  frameEditState.originalFrame = cloneRecordedFrame(frameContext.currentFrame);
  frameEditState.workingFrame = cloneRecordedFrame(frameContext.currentFrame);
  context.updateCaptureAreaUi();
  context.updateFrameEditUi();
  context.updatePreviewUi();
  context.drawOverlay();
  setStatus(`Editing frame ${frameContext.currentIndex + 1}. Drag joints above, then SAVE or CANCEL.`, 'success');
  setPreviewStatus('Edit mode active. The preview below is frozen as your before-edit reference.', 'info');
}

export function cancelMotionRipperFrameEdit(context) {
  if (!context.frameEditState.active) return;
  stopMotionRipperFrameEdit(context);
  context.setStatus('Frame edit cancelled. No changes were saved.', 'success');
  context.setPreviewStatus('Preview ready. Compare the model, the resolved rig and the captured rig before deciding to import.', 'success');
}

export function saveMotionRipperFrameEdit(context) {
  const { frameEditState } = context;
  if (!frameEditState.active || !frameEditState.workingFrame) return;

  const updatedFrame = buildEditedFrameFromLandmarks(
    frameEditState.originalFrame,
    frameEditState.workingFrame.landmarks,
    context.computeCurrentPoseFromLandmarks
  );
  if (!updatedFrame) {
    context.setStatus('Could not rebuild the edited frame.', 'error');
    return;
  }

  if (!context.replaceRecordedFrameByKey(frameEditState.frameKey, updatedFrame)) {
    context.setStatus('Could not save the edited frame.', 'error');
    return;
  }

  const savedFrameIndex = frameEditState.frameIndex;
  stopMotionRipperFrameEdit(context, { redraw: false });
  context.refreshCapturePreview({ autoPlay: false });
  context.seekPreviewToFrame(savedFrameIndex, { pause: true });
  context.drawOverlay(context.getLatestLandmarks());
  context.setStatus(`Saved edits for frame ${savedFrameIndex + 1}.`, 'success');
  context.setPreviewStatus('Edited frame saved. Review the updated model, resolved rig and captured rig before importing.', 'success');
}
