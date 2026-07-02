import * as THREE from 'three';
import { state } from '../shared/state.js';
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import { importAnimationDataToGroup } from './animation-import.js';
import { compileAnimation } from './animation.js';
import {
  buildSkinnedCaptureAnimationDefinition,
  createSkinnedCaptureCharacter,
  isSkinnedCaptureGroup,
  serializeSkinnedCaptureGroup,
} from './capture-skinned-character.js';
import {
  analyzeCaptureCoverage,
  resolveCaptureTrackOptions as resolveBaseCaptureTrackOptions,
} from './motion-ripper-capture-analysis.js';
import { createMotionRipperOverlayController } from './motion-ripper-overlay-interactions.js';
import {
  clearMotionRipperOverlay,
  drawMotionRipperOverlayView,
  resizeMotionRipperOverlayCanvas,
  setMotionRipperStatus,
} from './motion-ripper-overlay-view.js';
import { createMotionRipperLocalVideoControls } from './motion-ripper-local-video-controls.js';
import {
  cloneRecordedFrame,
  cloneSerializedPose,
  reindexRecordedFrames,
} from './motion-ripper-frame-utils.js';
import {
  remapLandmarksFromCaptureRegion,
} from './motion-ripper-video-source.js';
import {
  buildSkeletonWorldPositionMap,
} from './motion-ripper-skeleton-utils.js';
import {
  buildCapturedSkeletonDefinition,
  buildCaptureCharacterGroup,
} from './motion-ripper-capture-character.js';
import { buildCanonicalCaptureAnimationDefinition } from './motion-ripper-canonical-animation.js';
import {
  applyCapturedSkeletonToGroup,
  applyCapturedSkeletonToSerializedGroup,
  retimeAnimationDefinition,
  translateCapturedAnimationForGroup,
} from './motion-ripper-retargeting.js';
import {
  computePoseFromLandmarks,
  computeRootPositionFromLandmarks,
  getPoseConfidence,
  hasReliableTracking,
  isReliableLandmark,
  midpointLandmark,
  serializePose,
  smoothPoseState,
  vectorToArray,
} from './motion-ripper-pose-solver.js';
import {
  canCaptureGroup,
  findTargetNodeByName,
  getRootTargetName,
  isCaptureGeneratedGroup,
  resolveCaptureTargetConfig,
  resolveImportEligibility,
} from './motion-ripper-target-config.js';
import {
  cloneJsonValue,
  exportMotionRipperDebugJsons,
  sanitizeDebugFileStem,
} from './motion-ripper-debug-export.js';
import { getMotionRipperDetectionSource } from './motion-ripper-detection-source.js';
import {
  ensureAnimationName as ensureCaptureAnimationName,
  getRecordingElapsedSeconds as getCaptureRecordingElapsedSeconds,
  resetFreezeLowerBodyPreference as resetCaptureFreezeLowerBodyPreference,
  setGeneratedAnimationName as setGeneratedCaptureAnimationName,
  updateRecordingUi as updateCaptureRecordingUi,
  updateSmoothingLabel as updateCaptureSmoothingLabel,
  updateStatsUi,
  updateTrackingUi as updateCaptureTrackingUi,
} from './motion-ripper-capture-ui.js';
import {
  cancelMotionRipperFrameEdit,
  saveMotionRipperFrameEdit,
  startMotionRipperFrameEdit,
  stopMotionRipperFrameEdit,
} from './motion-ripper-frame-edit-controller.js';
import {
  getCanonicalCapturedFrames as getCanonicalFramesFromRecordedFrames,
  replaceRecordedFrameByKey as replaceRecordedFrameInListByKey,
  samplePoseIfRecording as sampleRecordedPoseIfRecording,
} from './motion-ripper-recorded-frames.js';
import {
  deleteCurrentPreviewFrame,
  repairCurrentPreviewFrame,
  seekNextPreviewFrame,
  seekPreviousPreviewFrame,
  togglePreviewPlayback,
} from './motion-ripper-preview-frame-commands.js';
import { createMotionRipperPreviewController } from './motion-ripper-preview-controller.js';
import { convertAnimationDefinitionToFastPoserAsset } from './animateur-animation-import.js';
import { refreshAnimationList, showTimelineForGroup } from './anim-mode-ui.js';
import { serializeGroupAsImportJSON } from '../viewport/persistence.js';
import { selectMesh, deselect } from '../viewport/selection.js';
import { pushAction } from '../shared/undo.js';
import { emit } from '../../event-bus.js';

import {
  CAPTURE_FACING_YAWS,
  LM,
  LOCAL_VIDEO_DEFAULT_SPEED,
  LOCAL_VIDEO_SPEEDS,
  MOTION_TIME_STEP,
  POSE_JOINTS,
  VISION_BUNDLE_URL,
  MEDIAPIPE_MODEL_PATH,
  MEDIAPIPE_WASM_ROOT,
} from './motion-ripper-constants.js';

const ui = {};
let poseLandmarker = null;
let visionModulePromise = null;
let mediaStream = null;
let localVideoObjectUrl = null;
let captureSourceKind = null;
let trackingFrameId = 0;
let lastProcessedVideoTime = -1;
let activeGroup = null;
let latestPosePacket = null;
let currentPoseState = null;
let rootBaseline = null;
let captureRestPose = null;
let isRecording = false;
let recordingStartedAt = 0;
let recordingVideoStartedAt = 0;
let lastSampledAt = -Infinity;
let recordedFrames = [];
const captureAnalysisState = {
  analysis: null,
  freezeLowerBodyTouched: false,
};
const previewState = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  model: null,
  mixer: null,
  action: null,
  rigRenderer: null,
  rigScene: null,
  rigCamera: null,
  rigControls: null,
  rigModel: null,
  rigMixer: null,
  rigAction: null,
  rigHelperGroup: null,
  rigJointMeshes: {},
  rigLines: [],
  capturedRenderer: null,
  capturedScene: null,
  capturedCamera: null,
  capturedControls: null,
  capturedHelperGroup: null,
  capturedJointMeshes: {},
  capturedLines: [],
  capturedFrames: [],
  resolvedFrames: [],
  targetMap: null,
  suppressedBones: null,
  rigNodeLookup: null,
  clip: null,
  frameTimes: [],
  currentFrameIndex: 0,
  totalFrameCount: 0,
  frameId: 0,
  lastRenderAt: 0,
  playing: false,
  needsRender: false,
  cameraAdjusted: false,
  suppressControlSync: false,
  syncReferenceTarget: null,
};
const captureCropState = {
  region: null,
  draftRegion: null,
  selecting: false,
  dragging: false,
  anchor: null,
  overlayBound: false,
  processingCanvas: null,
  processingContext: null,
};
const frameEditState = {
  active: false,
  frameIndex: -1,
  frameKey: null,
  originalFrame: null,
  workingFrame: null,
  draggingLandmarkIndex: -1,
};
let overlayController = null;
let localVideoController = null;
let previewController = null;

function ensureUi() {
  ui.modal = document.getElementById('motion-ripper-modal');
  ui.video = document.getElementById('motion-ripper-video');
  ui.overlay = document.getElementById('motion-ripper-overlay');
  ui.shareBtn = document.getElementById('motion-ripper-share-btn');
  ui.stopShareBtn = document.getElementById('motion-ripper-stop-share-btn');
  ui.localVideoInput = document.getElementById('motion-ripper-local-video-input');
  ui.clearLocalVideoBtn = document.getElementById('motion-ripper-clear-local-video-btn');
  ui.localVideoTime = document.getElementById('motion-ripper-local-video-time');
  ui.localVideoFps = document.getElementById('motion-ripper-local-video-fps');
  ui.localVideoSpeedButtons = Array.from(document.querySelectorAll('[data-motion-ripper-local-video-speed]'));
  ui.neutralBtn = document.getElementById('motion-ripper-neutral-btn');
  ui.selectAreaBtn = document.getElementById('motion-ripper-select-area-btn');
  ui.resetAreaBtn = document.getElementById('motion-ripper-reset-area-btn');
  ui.areaLabel = document.getElementById('motion-ripper-area-label');
  ui.editFrameBtn = document.getElementById('motion-ripper-edit-frame-btn');
  ui.editToolbar = document.getElementById('motion-ripper-edit-toolbar');
  ui.editCancelBtn = document.getElementById('motion-ripper-edit-cancel-btn');
  ui.editSaveBtn = document.getElementById('motion-ripper-edit-save-btn');
  ui.editStatus = document.getElementById('motion-ripper-edit-status');
  ui.recordBtn = document.getElementById('motion-ripper-record-btn');
  ui.clearBtn = document.getElementById('motion-ripper-clear-btn');
  ui.importBtn = document.getElementById('motion-ripper-import-btn');
  ui.createCharacterBtn = document.getElementById('motion-ripper-create-character-btn');
  ui.exportDebugBtn = document.getElementById('motion-ripper-export-debug-btn');
  ui.nameInput = document.getElementById('motion-ripper-name');
  ui.sampleRate = document.getElementById('motion-ripper-sample-rate');
  ui.smoothing = document.getElementById('motion-ripper-smoothing');
  ui.smoothingValue = document.getElementById('motion-ripper-smoothing-value');
  ui.rootMotion = document.getElementById('motion-ripper-root-motion');
  ui.captureFacing = document.getElementById('motion-ripper-capture-facing');
  ui.captureFacingHint = document.getElementById('motion-ripper-capture-facing-hint');
  ui.freezeLowerBody = document.getElementById('motion-ripper-freeze-lower-body');
  ui.freezeLowerBodyHint = document.getElementById('motion-ripper-freeze-lower-body-hint');
  ui.bodyModeBadge = document.getElementById('motion-ripper-body-mode-badge');
  ui.recordingBadge = document.getElementById('motion-ripper-recording-badge');
  ui.trackedState = document.getElementById('motion-ripper-tracked-state');
  ui.confidenceValue = document.getElementById('motion-ripper-confidence-value');
  ui.frameCount = document.getElementById('motion-ripper-frame-count');
  ui.durationValue = document.getElementById('motion-ripper-duration-value');
  ui.statusText = document.getElementById('motion-ripper-status-text');
  ui.targetLabel = document.getElementById('motion-ripper-target-label');
  ui.previewStage = document.getElementById('motion-ripper-preview-stage');
  ui.previewModelStage = document.getElementById('motion-ripper-preview-model-stage');
  ui.previewModelCanvas = document.getElementById('motion-ripper-preview-model-canvas');
  ui.previewRigStage = document.getElementById('motion-ripper-preview-rig-stage');
  ui.previewRigCanvas = document.getElementById('motion-ripper-preview-rig-canvas');
  ui.previewCapturedStage = document.getElementById('motion-ripper-preview-captured-stage');
  ui.previewCapturedCanvas = document.getElementById('motion-ripper-preview-captured-canvas');
  ui.previewEmpty = document.getElementById('motion-ripper-preview-empty');
  ui.previewStatus = document.getElementById('motion-ripper-preview-status');
  ui.previewToggleBtn = document.getElementById('motion-ripper-preview-toggle-btn');
  ui.previewFrameCurrent = document.getElementById('motion-ripper-preview-frame-current');
  ui.previewFrameTotal = document.getElementById('motion-ripper-preview-frame-total');
  ui.previewSpeed = document.getElementById('motion-ripper-preview-speed');
  ui.previewImportSpeed = document.getElementById('motion-ripper-preview-import-speed');
  ui.previewPrevFrameBtn = document.getElementById('motion-ripper-prev-frame-btn');
  ui.previewNextFrameBtn = document.getElementById('motion-ripper-next-frame-btn');
  ui.previewDeleteFrameBtn = document.getElementById('motion-ripper-delete-frame-btn');
  ui.previewRepairFrameBtn = document.getElementById('motion-ripper-repair-frame-btn');
  if (ui.freezeLowerBody && !ui.freezeLowerBody.dataset.bound) {
    ui.freezeLowerBody.addEventListener('change', () => {
      captureAnalysisState.freezeLowerBodyTouched = true;
      updateStats();
      refreshCapturePreview({ autoPlay: previewState.playing });
    });
    ui.freezeLowerBody.dataset.bound = 'true';
  }
  if (ui.captureFacing && !ui.captureFacing.dataset.bound) {
    ui.captureFacing.addEventListener('change', () => {
      refreshCapturePreview({ autoPlay: previewState.playing });
    });
    ui.captureFacing.dataset.bound = 'true';
  }
  bindOverlayInteractions();
  ensureLocalVideoBindings();
  updateCaptureAreaUi();
  updateLocalVideoUi();
  updateFrameEditUi();
}

function getOverlayController() {
  if (!overlayController) {
    overlayController = createMotionRipperOverlayController({
      ui,
      captureCropState,
      frameEditState,
      getCanonicalCapturedFrames,
      getIsRecording: () => isRecording,
      getLatestLandmarks: () => latestPosePacket?.landmarks || null,
      drawOverlay,
      setStatus,
    });
  }
  return overlayController;
}

function bindOverlayInteractions() {
  getOverlayController().bindOverlayInteractions();
}

function updateCaptureAreaUi() {
  getOverlayController().updateCaptureAreaUi();
}

function updateFrameEditUi() {
  getOverlayController().updateFrameEditUi();
}

function getActiveCaptureRegion() {
  return getOverlayController().getActiveCaptureRegion();
}

function clearCaptureDraft() {
  getOverlayController().clearCaptureDraft();
}

function setCaptureRegion(region) {
  getOverlayController().setCaptureRegion(region);
}

function getWorkingEditLandmarks() {
  return getOverlayController().getWorkingEditLandmarks();
}

function getOriginalEditLandmarks() {
  return getOverlayController().getOriginalEditLandmarks();
}

function getLocalVideoController() {
  if (!localVideoController) {
    localVideoController = createMotionRipperLocalVideoControls({
      ui,
      getLocalVideoObjectUrl: () => localVideoObjectUrl,
      setLocalVideoObjectUrl: (nextUrl) => {
        localVideoObjectUrl = nextUrl;
      },
      getCaptureSourceKind: () => captureSourceKind,
      setCaptureSourceKind: (nextKind) => {
        captureSourceKind = nextKind;
      },
      getMediaStream: () => mediaStream,
      stopRecording,
      setStatus,
    });
  }
  return localVideoController;
}

function getLocalVideoSpeed() {
  return getLocalVideoController().getLocalVideoSpeed();
}

function getLocalVideoFrameStepSeconds() {
  return getLocalVideoController().getLocalVideoFrameStepSeconds();
}

function updateLocalVideoUi() {
  getLocalVideoController().updateLocalVideoUi();
}

function ensureLocalVideoBindings() {
  getLocalVideoController().ensureLocalVideoBindings();
}

function clearLocalVideoSource(options) {
  getLocalVideoController().clearLocalVideoSource(options);
}

function getMotionGroup() {
  const group = state.animationMode ? state.animationModeObject : state.selectedMesh;
  return group?.isGroup ? group : null;
}

function getCaptureRetargetingOptions() {
  return {
    captureFacingYaw: getCaptureFacingYaw(),
    findTargetNodeByName,
  };
}

function buildCaptureAnimationForTargetGroup(animDef, group, targetConfig = resolveCaptureTargetConfig(group)) {
  if (isSkinnedCaptureGroup(group)) {
    return buildSkinnedCaptureAnimationDefinition(animDef, group, {
      captureFacingYaw: getCaptureFacingYaw(),
    });
  }
  return translateCapturedAnimationForGroup(animDef, group, targetConfig, getCaptureRetargetingOptions());
}

export async function openMotionRipperModal() {
  ensureUi();

  const group = getMotionGroup();
  const eligibility = canCaptureGroup(group);
  if (!eligibility.ok) {
    showToast(eligibility.error);
    return;
  }

  activeGroup = group;
  captureRestPose = null;
  if (ui.targetLabel) {
    ui.targetLabel.textContent = group.userData?.name || group.name || 'GROUP';
  }
  setGeneratedAnimationName();
  updateSmoothingLabel();
  stopFrameEdit({ redraw: false });
  captureCropState.selecting = false;
  clearCaptureDraft();
  updateCaptureAreaUi();
  updateRecordingUi();
  updateStats();
  setStatus(t('motionRipperLoading'));
  ui.modal?.classList.remove('hidden');
  resizeOverlayCanvas();
  ensurePreviewRuntime();
  refreshCapturePreview();

  try {
    await warmupMediaPipe();
  } catch (error) {
    console.error(error);
  }
}

export function closeMotionRipperModal() {
  stopFrameEdit({ redraw: false });
  stopRecording();
  stopScreenShare({ keepStatus: true });
  clearLocalVideoSource({ clearInput: false, clearVideo: true });
  clearOverlay();
  activeGroup = null;
  latestPosePacket = null;
  currentPoseState = null;
  rootBaseline = null;
  captureRestPose = null;
  captureCropState.selecting = false;
  clearCaptureDraft();
  updateCaptureAreaUi();
  disposePreviewRuntime();
  ui.modal?.classList.add('hidden');
}

export async function motionRipperShareScreen() {
  ensureUi();
  try {
    stopFrameEdit({ redraw: false });
    clearLocalVideoSource({ clearInput: true, clearVideo: true });
    await warmupMediaPipe();
    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 30,
      },
      audio: false,
    });

    ui.video.srcObject = mediaStream;
    await ui.video.play();
    captureSourceKind = 'screen';
    resizeOverlayCanvas();
    startTrackingLoop();

    const [videoTrack] = mediaStream.getVideoTracks();
    if (videoTrack) {
      videoTrack.addEventListener('ended', () => {
        stopScreenShare();
      }, { once: true });
    }

    setStatus(t('motionRipperShareReady'), 'success');
  } catch (error) {
    console.error(error);
    setStatus(t('motionRipperShareError'), 'error');
  }
}

export function motionRipperStopShare() {
  stopFrameEdit({ redraw: false });
  stopScreenShare();
}

export async function motionRipperLoadLocalVideo(event) {
  ensureUi();
  const file = event?.target?.files?.[0] || ui.localVideoInput?.files?.[0] || null;
  if (!file) {
    setStatus('Choose a local video file first.', 'error');
    return;
  }

  try {
    stopFrameEdit({ redraw: false });
    stopRecording();
    stopScreenShare({ keepStatus: true });
    await warmupMediaPipe();
    clearLocalVideoSource({ clearInput: false, clearVideo: true });

    localVideoObjectUrl = URL.createObjectURL(file);
    captureSourceKind = 'local-video';
    ui.video.srcObject = null;
    ui.video.src = localVideoObjectUrl;
    ui.video.muted = true;
    ui.video.loop = false;
    ui.video.playbackRate = LOCAL_VIDEO_DEFAULT_SPEED;
    ui.video.load();
    await ui.video.play();

    resizeOverlayCanvas();
    startTrackingLoop();
    updateLocalVideoUi();
    setStatus(`Local video loaded at ${LOCAL_VIDEO_DEFAULT_SPEED}x. Recording uses source video time, not slowed playback time.`, 'success');
  } catch (error) {
    console.error(error);
    setStatus('Could not load local video for capture.', 'error');
  }
}

export function motionRipperClearLocalVideo() {
  stopFrameEdit({ redraw: false });
  stopRecording();
  if (captureSourceKind === 'local-video') {
    cancelAnimationFrame(trackingFrameId);
    trackingFrameId = 0;
    latestPosePacket = null;
    currentPoseState = null;
    clearOverlay();
  }
  clearLocalVideoSource({ clearInput: true, clearVideo: true });
  setStatus('Local video cleared.');
}

export function motionRipperSetLocalVideoSpeed(speed) {
  ensureUi();
  const nextSpeed = LOCAL_VIDEO_SPEEDS.includes(Number.parseFloat(speed))
    ? Number.parseFloat(speed)
    : LOCAL_VIDEO_DEFAULT_SPEED;
  if (ui.video) {
    ui.video.playbackRate = nextSpeed;
  }
  updateLocalVideoUi();
  setStatus(`Local video speed set to ${nextSpeed}x.`, 'success');
}

function stepLocalVideo(direction) {
  ensureUi();
  if (!localVideoObjectUrl || !ui.video) {
    setStatus('Load a local video before stepping frame by frame.', 'error');
    return;
  }

  ui.video.pause();
  const duration = Number.isFinite(ui.video.duration) ? ui.video.duration : Number.POSITIVE_INFINITY;
  const nextTime = THREE.MathUtils.clamp(
    (ui.video.currentTime || 0) + (direction * getLocalVideoFrameStepSeconds()),
    0,
    duration
  );
  ui.video.currentTime = nextTime;
  updateLocalVideoUi();
  setStatus(`Stepped local video to ${nextTime.toFixed(2)}s.`, 'info');
}

export function motionRipperLocalVideoPrevFrame() {
  stepLocalVideo(-1);
}

export function motionRipperLocalVideoNextFrame() {
  stepLocalVideo(1);
}

export function motionRipperToggleAreaSelection() {
  ensureUi();
  if (frameEditState.active) {
    setStatus('Finish the current frame edit before changing the capture area.', 'error');
    return;
  }
  if (isRecording) {
    setStatus('Stop the recording before changing the capture area.', 'error');
    return;
  }
  captureCropState.selecting = !captureCropState.selecting;
  clearCaptureDraft();
  updateCaptureAreaUi();
  drawOverlay(latestPosePacket?.landmarks || null);
  setStatus(
    captureCropState.selecting
      ? 'Drag a rectangle on the video to isolate the performer you want to track.'
      : 'Capture area selection cancelled.',
    captureCropState.selecting ? 'info' : 'success'
  );
}

export function motionRipperResetArea() {
  ensureUi();
  if (frameEditState.active) {
    setStatus('Finish the current frame edit before resetting the capture area.', 'error');
    return;
  }
  if (isRecording) {
    setStatus('Stop the recording before resetting the capture area.', 'error');
    return;
  }
  captureCropState.selecting = false;
  clearCaptureDraft();
  setCaptureRegion(null);
  updateCaptureAreaUi();
  drawOverlay(latestPosePacket?.landmarks || null);
  setStatus('Capture area reset to the full shared frame.', 'success');
}

export function motionRipperCaptureNeutral() {
  if (!latestPosePacket || !currentPoseState) {
    setStatus(t('motionRipperNeedTrack'), 'error');
    return;
  }

  const { landmarks } = latestPosePacket;
  const hipCenter = midpointLandmark(landmarks[LM.LEFT_HIP], landmarks[LM.RIGHT_HIP]);
  const shoulderSpan = distance2D(landmarks[LM.LEFT_SHOULDER], landmarks[LM.RIGHT_SHOULDER]);
  rootBaseline = {
    x: hipCenter.x,
    y: hipCenter.y,
    shoulderSpan: shoulderSpan || 0.2,
  };
  captureRestPose = serializePose(currentPoseState);
  setStatus(t('motionRipperNeutralReady'), 'success');
}

export function motionRipperToggleRecording() {
  if (frameEditState.active) {
    setStatus('Finish the current frame edit before recording again.', 'error');
    return;
  }
  if (isRecording) {
    stopRecording();
    return;
  }

  if (!latestPosePacket || !currentPoseState) {
    setStatus(t('motionRipperNeedTrack'), 'error');
    return;
  }

  recordedFrames = [];
  resetFreezeLowerBodyPreference();
  isRecording = true;
  recordingStartedAt = performance.now();
  recordingVideoStartedAt = captureSourceKind === 'local-video' && ui.video ? (ui.video.currentTime || 0) : 0;
  lastSampledAt = -Infinity;
  if (ui.rootMotion?.checked) {
    motionRipperCaptureNeutral();
  } else if (!captureRestPose && currentPoseState) {
    captureRestPose = serializePose(currentPoseState);
  }
  samplePoseIfRecording(recordingStartedAt, latestPosePacket?.landmarks || null);
  updateRecordingUi();
  updateStats();
  refreshCapturePreview();
  setStatus(t('motionRipperRecording'), 'success');
}

export function motionRipperClearCapture() {
  stopFrameEdit({ redraw: false });
  stopRecording();
  recordedFrames = [];
  resetFreezeLowerBodyPreference();
  lastSampledAt = -Infinity;
  currentPoseState = null;
  rootBaseline = null;
  updateStats();
  refreshCapturePreview();
  setStatus(t('motionRipperCleared'));
}

export function motionRipperImportCapture() {
  if (frameEditState.active) {
    setStatus('Save or cancel the current frame edit before importing.', 'error');
    return;
  }
  const group = activeGroup || getMotionGroup();
  if (!group) {
    showToast(t('selectGroupForAnim'));
    return;
  }

  const importEligibility = resolveImportEligibility(group);
  if (!importEligibility.ok) {
    setStatus(importEligibility.error, 'error');
    showToast(importEligibility.error);
    return;
  }

  if (recordedFrames.length < 2) {
    setStatus(t('motionRipperNeedFrames'), 'error');
    return;
  }

  const canonical = buildCanonicalAnimationDefinition();
  const speedMultiplier = getPreviewSpeedMultiplier();
  const animationForImport = ui.previewImportSpeed?.checked
    ? retimeAnimationDefinition(canonical, speedMultiplier)
    : canonical;
  const targetConfig = resolveCaptureTargetConfig(group);
  if (!isCaptureGeneratedGroup(group)) {
    applyCapturedSkeletonToGroup(group, animationForImport.sourceSkeleton, targetConfig, getCaptureRetargetingOptions());
  }
  const translated = buildCaptureAnimationForTargetGroup(animationForImport, group, targetConfig);
  if (!translated) {
    setStatus(t('motionRipperImportError'), 'error');
    return;
  }

  const result = importAnimationDataToGroup(translated, group);
  if (!result.success) {
    setStatus(result.error || t('motionRipperImportError'), 'error');
    return;
  }

  refreshAnimationList();
  showTimelineForGroup(group);
  setStatus(t('motionRipperImported', { name: translated.name }), 'success');
  showToast(t('motionRipperImportedToast'));
}

export function motionRipperCreateCaptureCharacter() {
  if (frameEditState.active) {
    setStatus('Save or cancel the current frame edit before creating a capture character.', 'error');
    return;
  }

  if (recordedFrames.length < 2) {
    setStatus(t('motionRipperNeedFrames'), 'error');
    return;
  }

  const canonicalFrames = getCanonicalCapturedFrames();
  const captureTrackOptions = resolveCaptureTrackOptions(canonicalFrames);
  const canonical = buildCanonicalAnimationDefinition(canonicalFrames, captureTrackOptions);
  const speedMultiplier = getPreviewSpeedMultiplier();
  const animationForImport = ui.previewImportSpeed?.checked
    ? retimeAnimationDefinition(canonical, speedMultiplier)
    : canonical;
  const sourceSkeleton = animationForImport.sourceSkeleton || canonical.sourceSkeleton;
  const previousActiveGroup = activeGroup || getMotionGroup();
  const animationName = ensureAnimationName();
  const safeName = sanitizeDebugFileStem(animationName).replace(/-/g, '_');
  const group = createSkinnedCaptureCharacter(sourceSkeleton, {
    name: `${animationName || 'Capture'} Skinned Human`,
    templateId: `motion_ripper_skinned_${safeName}`,
  });
  group.position.copy(getCaptureCharacterSpawnPosition(previousActiveGroup));
  group.updateMatrixWorld(true);
  const targetConfig = resolveCaptureTargetConfig(group);
  const translated = buildCaptureAnimationForTargetGroup(animationForImport, group, targetConfig);

  if (!translated) {
    setStatus('Could not build animation tracks for the generated capture character.', 'error');
    return;
  }

  const result = importAnimationDataToGroup(translated, group);
  if (!result.success) {
    setStatus(result.error || 'Could not import the capture take onto the generated character.', 'error');
    return;
  }

  state.userObjects.add(group);
  selectMesh(group);
  activeGroup = group;
  if (ui.targetLabel) {
    ui.targetLabel.textContent = group.userData?.name || group.name || 'CAPTURE CHARACTER';
  }

  pushAction({
    type: 'Create capture character',
    undo: () => {
      if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect();
      state.userObjects.remove(group);
      emit('scene:objects-changed');
    },
    redo: () => {
      state.userObjects.add(group);
      selectMesh(group);
      emit('scene:objects-changed');
    },
  });

  emit('scene:objects-changed');
  refreshAnimationList();
  showTimelineForGroup(group);
  refreshCapturePreview({ autoPlay: true });
  setStatus(`Created "${group.userData.name}" as a skinned capture rig and imported "${translated.name}".`, 'success');
  showToast('Capture character created');
}

export function motionRipperUpdateSmoothingLabel() {
  ensureUi();
  updateSmoothingLabel();
}

export function motionRipperUpdatePreviewSpeed() {
  ensureUi();
  updatePreviewUi();
}

function getPreviewFrameCommandContext() {
  return {
    frameEditState,
    previewState,
    getRecordedFrames: () => recordedFrames,
    setRecordedFrames: (nextFrames) => {
      recordedFrames = nextFrames;
    },
    getCurrentCanonicalFrameContext,
    getCanonicalCapturedFrames,
    replaceRecordedFrameByKey,
    setPreviewPlaybackState,
    seekPreviewToFrame,
    refreshCapturePreview,
    updateStats,
    setStatus,
    setPreviewStatus,
  };
}

export function motionRipperTogglePreviewPlayback() {
  togglePreviewPlayback(getPreviewFrameCommandContext());
}

export function motionRipperPreviewPrevFrame() {
  seekPreviousPreviewFrame(getPreviewFrameCommandContext());
}

export function motionRipperPreviewNextFrame() {
  seekNextPreviewFrame(getPreviewFrameCommandContext());
}

export function motionRipperDeleteCurrentFrame() {
  deleteCurrentPreviewFrame(getPreviewFrameCommandContext());
}

export function motionRipperRepairCurrentFrame() {
  repairCurrentPreviewFrame(getPreviewFrameCommandContext());
}

function getFrameEditContext() {
  return {
    frameEditState,
    captureCropState,
    isRecording: () => isRecording,
    getLatestLandmarks: () => latestPosePacket?.landmarks || null,
    getCurrentCanonicalFrameContext,
    computeCurrentPoseFromLandmarks,
    replaceRecordedFrameByKey,
    clearCaptureDraft,
    seekPreviewToFrame,
    updateCaptureAreaUi,
    updateFrameEditUi,
    updatePreviewUi,
    refreshCapturePreview,
    drawOverlay,
    setStatus,
    setPreviewStatus,
  };
}

function stopFrameEdit(options) {
  stopMotionRipperFrameEdit(getFrameEditContext(), options);
}

export function motionRipperStartFrameEdit() {
  ensureUi();
  startMotionRipperFrameEdit(getFrameEditContext());
}

export function motionRipperCancelFrameEdit() {
  ensureUi();
  cancelMotionRipperFrameEdit(getFrameEditContext());
}

export function motionRipperSaveFrameEdit() {
  ensureUi();
  saveMotionRipperFrameEdit(getFrameEditContext());
}

async function warmupMediaPipe() {
  if (poseLandmarker) {
    setStatus(t('motionRipperReady'), 'success');
    return poseLandmarker;
  }

  if (!visionModulePromise) {
    visionModulePromise = import(/* @vite-ignore */ VISION_BUNDLE_URL);
  }

  setStatus(t('motionRipperLoading'));
  const { FilesetResolver, PoseLandmarker } = await visionModulePromise;

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);

  try {
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MEDIAPIPE_MODEL_PATH,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    });
  } catch (gpuError) {
    console.warn('Motion Ripper GPU init failed, retrying on CPU.', gpuError);
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MEDIAPIPE_MODEL_PATH,
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    });
  }

  setStatus(t('motionRipperReady'), 'success');
  return poseLandmarker;
}

function getDetectionSource() {
  return getMotionRipperDetectionSource(ui, captureCropState);
}

function stopScreenShare({ keepStatus = false } = {}) {
  cancelAnimationFrame(trackingFrameId);
  trackingFrameId = 0;
  lastProcessedVideoTime = -1;

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    if (captureSourceKind === 'screen') {
      captureSourceKind = null;
    }
  }

  if (ui.video) {
    ui.video.pause();
    ui.video.srcObject = null;
  }

  latestPosePacket = null;
  captureCropState.selecting = false;
  clearCaptureDraft();
  updateCaptureAreaUi();
  clearOverlay();
  if (!keepStatus) {
    setStatus(t('motionRipperShareStopped'));
  }
}

function startTrackingLoop() {
  cancelAnimationFrame(trackingFrameId);

  const tick = () => {
    trackingFrameId = requestAnimationFrame(tick);

    if (!poseLandmarker || !ui.video || ui.video.readyState < 2) {
      return;
    }

    if (ui.video.currentTime === lastProcessedVideoTime) {
      return;
    }

    lastProcessedVideoTime = ui.video.currentTime;
    const nowMs = performance.now();
    const { source, region } = getDetectionSource();
    const result = poseLandmarker.detectForVideo(source, nowMs);
    const rawLandmarks = result?.landmarks?.[0];
    const landmarks = region ? remapLandmarksFromCaptureRegion(rawLandmarks, region) : rawLandmarks;

    if (!landmarks || !hasReliableTracking(landmarks)) {
      latestPosePacket = null;
      updateTrackingUi(0);
      drawOverlay();
      return;
    }

    latestPosePacket = {
      landmarks,
      confidence: getPoseConfidence(landmarks),
    };

      const nextPose = computeCurrentPoseFromLandmarks(landmarks);
    currentPoseState = smoothPoseState(currentPoseState, nextPose, Number.parseFloat(ui.smoothing?.value || '0.55'));

    updateTrackingUi(latestPosePacket.confidence);
    drawOverlay(landmarks);
    samplePoseIfRecording(nowMs, landmarks);
  };

  tick();
}

function updateTrackingUi(confidence) {
  updateCaptureTrackingUi(ui, t, confidence);
}

function stopRecording() {
  if (!isRecording) {
    updateRecordingUi();
    refreshCapturePreview();
    return;
  }

  isRecording = false;
  updateRecordingUi();
  updateStats();
  refreshCapturePreview({ autoPlay: recordedFrames.length >= 2 });
  setStatus(
    recordedFrames.length >= 2
      ? t('motionRipperStopped', { n: recordedFrames.length })
      : t('motionRipperNeedFrames'),
    recordedFrames.length >= 2 ? 'success' : 'error'
  );
}

function setGeneratedAnimationName() {
  setGeneratedCaptureAnimationName(ui);
}

function ensureAnimationName() {
  return ensureCaptureAnimationName(ui);
}

function updateSmoothingLabel() {
  updateCaptureSmoothingLabel(ui);
}

function updateRecordingUi() {
  updateCaptureRecordingUi(ui, t, isRecording);
  updateImportButtonState();
}

function updateImportButtonState() {
  if (!ui.importBtn) return;
  const group = activeGroup || getMotionGroup();
  const eligibility = group ? resolveImportEligibility(group) : { ok: false, error: t('selectGroupForAnim') };
  ui.importBtn.disabled = !eligibility.ok;
  ui.importBtn.classList.toggle('opacity-40', !eligibility.ok);
  ui.importBtn.classList.toggle('cursor-not-allowed', !eligibility.ok);
  ui.importBtn.title = eligibility.ok ? '' : (eligibility.error || '');
}

function getRecordingElapsedSeconds(nowMs) {
  if (captureSourceKind === 'local-video' && ui.video) {
    return Math.max(0, (ui.video.currentTime || 0) - recordingVideoStartedAt);
  }
  return getCaptureRecordingElapsedSeconds({
    captureSourceKind,
    video: ui.video,
    recordingVideoStartedAt,
    recordingStartedAt,
    nowMs,
  });
}

function resetFreezeLowerBodyPreference() {
  resetCaptureFreezeLowerBodyPreference(captureAnalysisState, ui);
}

function updateStats() {
  const hasFrames = recordedFrames.length >= 2;
  const analysis = analyzeCaptureCoverage(getCanonicalCapturedFrames());
  captureAnalysisState.analysis = analysis;
  updateStatsUi({
    ui,
    t,
    recordedFrames,
    hasFrames,
    frameEditActive: frameEditState.active,
    analysis,
    captureAnalysisState,
  });
}

function resolveCaptureTrackOptions(frames = []) {
  return resolveBaseCaptureTrackOptions(frames, {
    freezeLowerBody: !!ui.freezeLowerBody?.checked,
  });
}

export function motionRipperExportDebugJsons() {
  exportMotionRipperDebugJsons({
    ui,
    frameEditState,
    getMotionGroup,
    getActiveGroup: () => activeGroup,
    setStatus,
    showToast,
    t,
    getCanonicalCapturedFrames,
    resolveCaptureTrackOptions,
    buildCanonicalAnimationDefinition,
    getPreviewSpeedMultiplier,
    retimeAnimationDefinition,
    resolveCaptureTargetConfig,
    buildCaptureAnimationForTargetGroup,
    convertAnimationDefinitionToFastPoserAsset,
    ensureAnimationName,
    getActiveCaptureRegion,
    getCaptureFacingMode,
    getCaptureFacingYaw,
    isSkinnedCaptureGroup,
    serializeSkinnedCaptureGroup,
    serializeGroupAsImportJSON,
    isCaptureGeneratedGroup,
    applyCapturedSkeletonToSerializedGroup,
  });
}

function getPreviewController() {
  if (!previewController) {
    previewController = createMotionRipperPreviewController({
      ui,
      previewState,
      frameEditState,
      ensureUi,
      updateFrameEditUi,
      getMotionGroup,
      getActiveGroup: () => activeGroup,
      getIsRecording: () => isRecording,
      getCanonicalCapturedFrames,
      resolveCaptureTrackOptions,
      buildCanonicalAnimationDefinition,
      getCaptureRetargetingOptions,
      buildCaptureAnimationForTargetGroup,
    });
  }
  return previewController;
}

function ensurePreviewRuntime() {
  getPreviewController().ensureRuntime();
}

function disposePreviewRuntime() {
  getPreviewController().disposeRuntime();
}

function updatePreviewUi() {
  getPreviewController().updateUi();
}

function getPreviewSpeedMultiplier() {
  return getPreviewController().getSpeedMultiplier();
}

function setPreviewPlaybackState(playing) {
  getPreviewController().setPlaybackState(playing);
}

function seekPreviewToFrame(frameIndex, options = {}) {
  return getPreviewController().seekToFrame(frameIndex, options);
}

function getCurrentCanonicalFrameContext() {
  return getPreviewController().getCurrentCanonicalFrameContext();
}

function refreshCapturePreview(options = {}) {
  getPreviewController().refresh(options);
}
function getCanonicalCapturedFrames() {
  return getCanonicalFramesFromRecordedFrames(recordedFrames);
}

function replaceRecordedFrameByKey(frameKey, nextFrame) {
  const result = replaceRecordedFrameInListByKey(recordedFrames, frameKey, nextFrame);
  recordedFrames = result.frames;
  return result.replaced;
}

function setStatus(message, tone = 'info') {
  setMotionRipperStatus(ui, message, tone);
}

function resizeOverlayCanvas() {
  resizeMotionRipperOverlayCanvas(ui);
}

function clearOverlay() {
  clearMotionRipperOverlay(ui);
}

function drawOverlay(landmarks = null) {
  drawMotionRipperOverlayView({
    ui,
    landmarks,
    frameEditState,
    captureCropState,
    originalLandmarks: getOriginalEditLandmarks(),
    workingLandmarks: getWorkingEditLandmarks(),
    isReliableLandmark,
  });
}

function computeCurrentPoseFromLandmarks(landmarks) {
  const rootResult = computeRootPositionFromLandmarks(landmarks, {
    rootMotionEnabled: !!ui.rootMotion?.checked,
    rootBaseline,
  });
  rootBaseline = rootResult.rootBaseline;
  return computePoseFromLandmarks(landmarks, { rootPosition: rootResult.rootPosition });
}

function samplePoseIfRecording(nowMs, landmarks = latestPosePacket?.landmarks || null) {
  sampleRecordedPoseIfRecording({
    ui,
    isRecording: () => isRecording,
    getCurrentPoseState: () => currentPoseState,
    getLatestLandmarks: () => latestPosePacket?.landmarks || null,
    getRecordingElapsedSeconds,
    getLastSampledAt: () => lastSampledAt,
    setLastSampledAt: (nextValue) => {
      lastSampledAt = nextValue;
    },
    getRecordedFrames: () => recordedFrames,
    updateStats,
  }, nowMs, landmarks);
}

function getSanitizedCaptureFacingMode(value) {
  const mode = String(value || '').toLowerCase();
  return mode in CAPTURE_FACING_YAWS ? mode : 'front';
}

function getCaptureFacingMode() {
  return getSanitizedCaptureFacingMode(ui.captureFacing?.value || 'front');
}

function getCaptureFacingYaw() {
  return CAPTURE_FACING_YAWS[getCaptureFacingMode()] || 0;
}

function buildCanonicalAnimationDefinition(frames = getCanonicalCapturedFrames(), captureTrackOptions = resolveCaptureTrackOptions(frames)) {
  return buildCanonicalCaptureAnimationDefinition({
    frames,
    name: ensureAnimationName(),
    captureTrackOptions,
    captureFacingMode: getCaptureFacingMode(),
    captureRestPose,
  });
}

export function __motionRipperHydrateCaptureForTests({
  frames = [],
  freezeLowerBody = null,
  markFreezeAsManual = false,
  captureFacing = null,
  restPose = null,
} = {}) {
  ensureUi();
  recordedFrames = reindexRecordedFrames((frames || []).map((frame) => cloneRecordedFrame(frame)));
  captureRestPose = restPose
    ? cloneSerializedPose(restPose)
    : (recordedFrames[0]?.pose ? cloneSerializedPose(recordedFrames[0].pose) : null);
  lastSampledAt = recordedFrames.length > 0 ? recordedFrames[recordedFrames.length - 1].time : -Infinity;
  latestPosePacket = null;
  currentPoseState = null;
  rootBaseline = null;
  if (ui.captureFacing) {
    ui.captureFacing.value = typeof captureFacing === 'string' ? getSanitizedCaptureFacingMode(captureFacing) : 'front';
  }
  if (typeof freezeLowerBody === 'boolean' && ui.freezeLowerBody) {
    ui.freezeLowerBody.checked = freezeLowerBody;
    captureAnalysisState.freezeLowerBodyTouched = !!markFreezeAsManual;
  } else {
    resetFreezeLowerBodyPreference();
  }
  updateStats();
}

function findGroupByTemplateId(templateId) {
  const id = String(templateId || '').trim();
  if (!id) return null;
  return state.userObjects?.children?.find((child) => child?.userData?.templateId === id) || null;
}

function getTrackSamples(animDef, predicate) {
  const track = (animDef?.tracks || []).find(predicate);
  return (track?.keyframes || []).map((keyframe) => Array.isArray(keyframe?.value) ? [...keyframe.value] : keyframe?.value);
}

export function __motionRipperInspectCaptureForTests({ targetTemplateId = null, rotationTarget = 'CHEST' } = {}) {
  ensureUi();
  const frames = getCanonicalCapturedFrames();
  const captureTrackOptions = resolveCaptureTrackOptions(frames);
  const canonicalAnimation = frames.length >= 2
    ? buildCanonicalAnimationDefinition(frames, captureTrackOptions)
    : null;
  const group = findGroupByTemplateId(targetTemplateId) || activeGroup || getMotionGroup();
  const translatedAnimation = canonicalAnimation && group
    ? buildCaptureAnimationForTargetGroup(canonicalAnimation, group)
    : null;
  const rootTargetName = group ? getRootTargetName(group) : null;
  return {
    analysis: captureTrackOptions.analysis,
    captureFacing: getCaptureFacingMode(),
    captureFacingYaw: getCaptureFacingYaw(),
    freezeLowerBodyChecked: !!ui.freezeLowerBody?.checked,
    freezeLowerBodyDisabled: !!ui.freezeLowerBody?.disabled,
    badgeVisible: !!ui.bodyModeBadge && !ui.bodyModeBadge.classList.contains('hidden'),
    badgeText: ui.bodyModeBadge?.textContent || '',
    hintText: ui.freezeLowerBodyHint?.textContent || '',
    suppressedCaptureJoints: Array.from(captureTrackOptions.suppressedCaptureJoints),
    canonicalTrackTargets: canonicalAnimation?.tracks?.map((track) => track.target) || [],
    canonicalRootValues: getTrackSamples(canonicalAnimation, (track) => (track.target === 'PELVIS' || track.target === 'ROOT') && track.property === 'position'),
    canonicalRotationValues: getTrackSamples(canonicalAnimation, (track) => track.target === rotationTarget && track.property === 'rotation'),
    translatedTrackTargets: translatedAnimation?.tracks?.map((track) => track.target) || [],
    translatedRootValues: getTrackSamples(translatedAnimation, (track) => track.target === rootTargetName && track.property === 'position'),
  };
}

export function __motionRipperBuildSkinnedCaptureCharacterForTests({
  frames = [],
  freezeLowerBody = null,
  markFreezeAsManual = false,
  captureFacing = 'front',
  restPose = null,
} = {}) {
  __motionRipperHydrateCaptureForTests({
    frames,
    freezeLowerBody,
    markFreezeAsManual,
    captureFacing,
    restPose,
  });

  const canonicalFrames = getCanonicalCapturedFrames();
  const captureTrackOptions = resolveCaptureTrackOptions(canonicalFrames);
  const sourceSkeleton = buildCapturedSkeletonDefinition(canonicalFrames, {
    captureFacingMode: getCaptureFacingMode(),
  });
  const canonicalAnimation = canonicalFrames.length >= 2
    ? buildCanonicalAnimationDefinition(canonicalFrames, captureTrackOptions)
    : null;
  const group = createSkinnedCaptureCharacter(sourceSkeleton, {
    name: 'Test Skinned Human',
    templateId: 'motion_ripper_skinned_test',
  });
  const sourceSkeletonWorldPositions = Object.fromEntries(
    Array.from(buildSkeletonWorldPositionMap(sourceSkeleton).entries()).map(([boneName, vector]) => [
      boneName,
      vectorToArray(vector),
    ])
  );
  const translatedAnimation = canonicalAnimation
    ? buildCaptureAnimationForTargetGroup(canonicalAnimation, group)
    : null;

  if (translatedAnimation) {
    group.userData.animations = [translatedAnimation];
    group.userData.animationClips = [compileAnimation(translatedAnimation, group)].filter(Boolean);
  }

  let mesh = null;
  group.traverse((node) => {
    if (!mesh && node?.isSkinnedMesh) {
      mesh = node;
    }
  });

  return {
    skeletonId: group.userData?.skeletonId || null,
    humanoidRigMode: group.userData?.humanoidRigMode || null,
    generatedFrom: group.userData?.motionRipperGenerated?.generatedFrom || null,
    hasSkinnedMesh: !!mesh,
    skinnedMeshName: mesh?.name || null,
    boneNames: mesh?.skeleton?.bones?.map((bone) => bone.name) || [],
    boneWorldPositions: cloneJsonValue(group.userData?.captureSkinned?.boneWorldPositions || {}),
    sourceSkeletonWorldPositions: cloneJsonValue(sourceSkeletonWorldPositions),
    skinIndexItemSize: mesh?.geometry?.getAttribute?.('skinIndex')?.itemSize || null,
    skinWeightItemSize: mesh?.geometry?.getAttribute?.('skinWeight')?.itemSize || null,
    vertexCount: mesh?.geometry?.getAttribute?.('position')?.count || 0,
    trackTargets: translatedAnimation?.tracks?.map((track) => track.target) || [],
    rootValues: getTrackSamples(translatedAnimation, (track) => (track.target === 'PELVIS' || track.target === 'ROOT') && track.property === 'position'),
    canonicalRootValues: getTrackSamples(canonicalAnimation, (track) => (track.target === 'PELVIS' || track.target === 'ROOT') && track.property === 'position'),
    constraints: cloneJsonValue(translatedAnimation?.constraints || canonicalAnimation?.constraints || null),
    legUpperRotationValues: getTrackSamples(translatedAnimation, (track) => track.target === 'LEG_R_UPPER' && track.property === 'rotation'),
    armUpperRotationValues: getTrackSamples(translatedAnimation, (track) => track.target === 'ARM_R_UPPER' && track.property === 'rotation'),
    footRotationValues: getTrackSamples(translatedAnimation, (track) => track.target === 'FOOT_R' && track.property === 'rotation'),
    clipCount: group.userData?.animationClips?.length || 0,
    serializedType: serializeSkinnedCaptureGroup(group)?.type || null,
  };
}
