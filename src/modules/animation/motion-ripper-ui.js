import * as THREE from 'three';
import { state } from '../shared/state.js';
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import { importAnimationDataToGroup } from './animation-import.js';
import { getSkeletonById } from './skeleton-registry.js';
import { buildBoneToTargetMap, translateAnimForMesh } from './mesh-animation-translation.js';
import { refreshAnimationList, showTimelineForGroup } from './anim-mode-ui.js';

const VISION_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21-rc.20250105/vision_bundle.mjs';
const MEDIAPIPE_WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21-rc.20250105/wasm';
const MEDIAPIPE_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const HUMANOID_CAPTURE_SKELETON_ID = 'HUMANOID_DEFAULT';
const MOTION_TIME_STEP = 0.1;
const DOWN_AXIS = new THREE.Vector3(0, -1, 0);

const CAPTURE_JOINTS = Object.freeze([
  'ROOT',
  'SPINE',
  'HEAD',
  'ARM_L_UPPER',
  'ARM_L_LOWER',
  'ARM_R_UPPER',
  'ARM_R_LOWER',
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
]);

const JOINT_PARENTS = Object.freeze({
  ROOT: null,
  SPINE: 'ROOT',
  HEAD: 'SPINE',
  ARM_L_UPPER: 'SPINE',
  ARM_L_LOWER: 'ARM_L_UPPER',
  ARM_R_UPPER: 'SPINE',
  ARM_R_LOWER: 'ARM_R_UPPER',
  LEG_L_UPPER: 'ROOT',
  LEG_L_LOWER: 'LEG_L_UPPER',
  LEG_R_UPPER: 'ROOT',
  LEG_R_LOWER: 'LEG_R_UPPER',
});

const CONNECTIONS = Object.freeze([
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [0, 11],
  [0, 12],
]);

const LM = Object.freeze({
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
});

const ui = {};
let poseLandmarker = null;
let visionModulePromise = null;
let mediaStream = null;
let trackingFrameId = 0;
let lastProcessedVideoTime = -1;
let activeGroup = null;
let latestPosePacket = null;
let currentPoseState = null;
let rootBaseline = null;
let isRecording = false;
let recordingStartedAt = 0;
let lastSampledAt = -Infinity;
let recordedFrames = [];

function ensureUi() {
  ui.modal = document.getElementById('motion-ripper-modal');
  ui.video = document.getElementById('motion-ripper-video');
  ui.overlay = document.getElementById('motion-ripper-overlay');
  ui.shareBtn = document.getElementById('motion-ripper-share-btn');
  ui.stopShareBtn = document.getElementById('motion-ripper-stop-share-btn');
  ui.neutralBtn = document.getElementById('motion-ripper-neutral-btn');
  ui.recordBtn = document.getElementById('motion-ripper-record-btn');
  ui.clearBtn = document.getElementById('motion-ripper-clear-btn');
  ui.importBtn = document.getElementById('motion-ripper-import-btn');
  ui.nameInput = document.getElementById('motion-ripper-name');
  ui.sampleRate = document.getElementById('motion-ripper-sample-rate');
  ui.smoothing = document.getElementById('motion-ripper-smoothing');
  ui.smoothingValue = document.getElementById('motion-ripper-smoothing-value');
  ui.rootMotion = document.getElementById('motion-ripper-root-motion');
  ui.recordingBadge = document.getElementById('motion-ripper-recording-badge');
  ui.trackedState = document.getElementById('motion-ripper-tracked-state');
  ui.confidenceValue = document.getElementById('motion-ripper-confidence-value');
  ui.frameCount = document.getElementById('motion-ripper-frame-count');
  ui.durationValue = document.getElementById('motion-ripper-duration-value');
  ui.statusText = document.getElementById('motion-ripper-status-text');
  ui.targetLabel = document.getElementById('motion-ripper-target-label');
}

function getMotionGroup() {
  const group = state.animationMode ? state.animationModeObject : state.selectedMesh;
  return group?.isGroup ? group : null;
}

function getRootTargetName(group) {
  const rootName = String(group?.userData?.name || group?.name || 'GROUP').trim() || 'GROUP';
  if (!group.name) group.name = rootName;
  return rootName;
}

function getFallbackNamedTargets(group) {
  const map = {};
  group?.traverse((node) => {
    const nodeName = String(node?.userData?.name || node?.name || '').trim();
    if (!nodeName) return;
    if (!(nodeName in map)) {
      map[nodeName] = nodeName;
    }
  });
  return map;
}

function buildCaptureTargetMap(group) {
  const skeleton = getSkeletonById(HUMANOID_CAPTURE_SKELETON_ID);
  const slotMap = group.userData?.slotMap || {};
  const slotBindings = group.userData?.slotBindings || skeleton?.defaultBindings || {};
  const mapping = {
    ...buildBoneToTargetMap(group, slotMap, slotBindings),
    ...getFallbackNamedTargets(group),
    ROOT: getRootTargetName(group),
  };
  return mapping;
}

function canCaptureGroup(group) {
  if (!group?.isGroup) {
    return { ok: false, error: t('selectGroupForAnimMode') };
  }

  const skeletonId = group.userData?.skeletonId || null;
  const archetype = group.userData?.archetype || null;

  if (skeletonId && skeletonId !== HUMANOID_CAPTURE_SKELETON_ID) {
    return { ok: false, error: t('motionRipperOnlyHumanoid') };
  }
  if (archetype && archetype !== 'HUMANOID') {
    return { ok: false, error: t('motionRipperOnlyHumanoid') };
  }

  return { ok: true };
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
  if (ui.targetLabel) {
    ui.targetLabel.textContent = group.userData?.name || group.name || 'GROUP';
  }
  setGeneratedAnimationName();
  updateSmoothingLabel();
  updateRecordingUi();
  updateStats();
  setStatus(t('motionRipperLoading'));
  ui.modal?.classList.remove('hidden');
  resizeOverlayCanvas();

  try {
    await warmupMediaPipe();
  } catch (error) {
    console.error(error);
  }
}

export function closeMotionRipperModal() {
  stopRecording();
  stopScreenShare({ keepStatus: true });
  clearOverlay();
  activeGroup = null;
  latestPosePacket = null;
  currentPoseState = null;
  rootBaseline = null;
  ui.modal?.classList.add('hidden');
}

export async function motionRipperShareScreen() {
  ensureUi();
  try {
    await warmupMediaPipe();
    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 30,
      },
      audio: false,
    });

    ui.video.srcObject = mediaStream;
    await ui.video.play();
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
  stopScreenShare();
}

export function motionRipperCaptureNeutral() {
  if (!latestPosePacket) {
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
  setStatus(t('motionRipperNeutralReady'), 'success');
}

export function motionRipperToggleRecording() {
  if (isRecording) {
    stopRecording();
    return;
  }

  if (!latestPosePacket || !currentPoseState) {
    setStatus(t('motionRipperNeedTrack'), 'error');
    return;
  }

  recordedFrames = [];
  isRecording = true;
  recordingStartedAt = performance.now();
  lastSampledAt = -Infinity;
  if (ui.rootMotion?.checked) {
    motionRipperCaptureNeutral();
  }
  samplePoseIfRecording(recordingStartedAt);
  updateRecordingUi();
  updateStats();
  setStatus(t('motionRipperRecording'), 'success');
}

export function motionRipperClearCapture() {
  stopRecording();
  recordedFrames = [];
  lastSampledAt = -Infinity;
  currentPoseState = null;
  rootBaseline = null;
  updateStats();
  setStatus(t('motionRipperCleared'));
}

export function motionRipperImportCapture() {
  const group = activeGroup || getMotionGroup();
  if (!group) {
    showToast(t('selectGroupForAnim'));
    return;
  }

  if (recordedFrames.length < 2) {
    setStatus(t('motionRipperNeedFrames'), 'error');
    return;
  }

  const canonical = buildCanonicalAnimationDefinition();
  const translated = translateCapturedAnimationForGroup(canonical, group);
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

export function motionRipperUpdateSmoothingLabel() {
  ensureUi();
  updateSmoothingLabel();
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

function stopScreenShare({ keepStatus = false } = {}) {
  cancelAnimationFrame(trackingFrameId);
  trackingFrameId = 0;
  lastProcessedVideoTime = -1;

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  if (ui.video) {
    ui.video.pause();
    ui.video.srcObject = null;
  }

  latestPosePacket = null;
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
    const result = poseLandmarker.detectForVideo(ui.video, nowMs);
    const landmarks = result?.landmarks?.[0];

    if (!landmarks || !hasReliableTracking(landmarks)) {
      latestPosePacket = null;
      updateTrackingUi(0);
      clearOverlay();
      return;
    }

    latestPosePacket = {
      landmarks,
      confidence: getPoseConfidence(landmarks),
    };

    const nextPose = computePoseFromLandmarks(landmarks);
    currentPoseState = smoothPoseState(currentPoseState, nextPose, Number.parseFloat(ui.smoothing?.value || '0.55'));

    updateTrackingUi(latestPosePacket.confidence);
    drawOverlay(landmarks);
    samplePoseIfRecording(nowMs);
  };

  tick();
}

function updateTrackingUi(confidence) {
  if (ui.trackedState) {
    ui.trackedState.textContent = confidence > 0.55 ? t('motionRipperTracked') : t('motionRipperSearching');
  }
  if (ui.confidenceValue) {
    ui.confidenceValue.textContent = `${Math.round(confidence * 100)}%`;
  }
}

function stopRecording() {
  if (!isRecording) {
    updateRecordingUi();
    return;
  }

  isRecording = false;
  updateRecordingUi();
  updateStats();
  setStatus(
    recordedFrames.length >= 2
      ? t('motionRipperStopped', { n: recordedFrames.length })
      : t('motionRipperNeedFrames'),
    recordedFrames.length >= 2 ? 'success' : 'error'
  );
}

function setGeneratedAnimationName() {
  if (!ui.nameInput || ui.nameInput.value.trim()) return;
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  ui.nameInput.value = `youtube-rip-${datePart}-${timePart}`;
}

function ensureAnimationName() {
  const value = ui.nameInput?.value?.trim();
  if (value) return value;
  setGeneratedAnimationName();
  return ui.nameInput?.value?.trim() || 'youtube-rip';
}

function updateSmoothingLabel() {
  if (ui.smoothingValue) {
    ui.smoothingValue.textContent = (Number.parseFloat(ui.smoothing?.value || '0.55') || 0).toFixed(2);
  }
}

function updateRecordingUi() {
  if (ui.recordBtn) {
    ui.recordBtn.textContent = isRecording ? t('motionRipperStopRecord') : t('motionRipperStartRecord');
  }
  if (ui.recordingBadge) {
    ui.recordingBadge.textContent = isRecording ? t('motionRipperRecordingBadge') : t('motionRipperIdleBadge');
  }
}

function updateStats() {
  if (ui.frameCount) {
    ui.frameCount.textContent = String(recordedFrames.length);
  }
  if (ui.durationValue) {
    const duration = recordedFrames.length > 0 ? recordedFrames[recordedFrames.length - 1].time : 0;
    ui.durationValue.textContent = `${duration.toFixed(1)}s`;
  }
}

function setStatus(message, tone = 'info') {
  if (!ui.statusText) return;
  ui.statusText.textContent = message;
  ui.statusText.className = tone === 'error'
    ? 'text-rose-300 text-[10px] leading-relaxed'
    : tone === 'success'
      ? 'text-emerald-300 text-[10px] leading-relaxed'
      : 'text-zinc-300 text-[10px] leading-relaxed';
}

function resizeOverlayCanvas() {
  if (!ui.overlay) return;
  const width = ui.overlay.clientWidth || 1;
  const height = ui.overlay.clientHeight || 1;
  if (ui.overlay.width !== width || ui.overlay.height !== height) {
    ui.overlay.width = width;
    ui.overlay.height = height;
  }
}

function clearOverlay() {
  if (!ui.overlay) return;
  resizeOverlayCanvas();
  const context = ui.overlay.getContext('2d');
  context.clearRect(0, 0, ui.overlay.width, ui.overlay.height);
}

function drawOverlay(landmarks) {
  if (!ui.overlay || !ui.video) return;
  resizeOverlayCanvas();

  const context = ui.overlay.getContext('2d');
  const width = ui.overlay.width;
  const height = ui.overlay.height;
  context.clearRect(0, 0, width, height);

  const rect = getContainedVideoRect(width, height, ui.video.videoWidth || 1, ui.video.videoHeight || 1);
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.strokeStyle = 'rgba(0, 255, 204, 0.95)';
  context.shadowBlur = 14;
  context.shadowColor = 'rgba(0, 255, 204, 0.38)';

  CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    if (!isReliableLandmark(start) || !isReliableLandmark(end)) return;
    const startPoint = projectLandmark(start, rect);
    const endPoint = projectLandmark(end, rect);
    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(endPoint.x, endPoint.y);
    context.stroke();
  });

  context.shadowBlur = 0;
  landmarks.forEach((landmark) => {
    if (!isReliableLandmark(landmark)) return;
    const point = projectLandmark(landmark, rect);
    context.beginPath();
    context.fillStyle = 'rgba(255, 204, 0, 0.95)';
    context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
    context.fill();
  });
}

function projectLandmark(landmark, rect) {
  return {
    x: rect.x + landmark.x * rect.width,
    y: rect.y + landmark.y * rect.height,
  };
}

function getContainedVideoRect(canvasWidth, canvasHeight, videoWidth, videoHeight) {
  const canvasAspect = canvasWidth / canvasHeight;
  const videoAspect = videoWidth / videoHeight;

  if (!Number.isFinite(videoAspect) || videoAspect <= 0) {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }

  if (videoAspect > canvasAspect) {
    const width = canvasWidth;
    const height = width / videoAspect;
    return { x: 0, y: (canvasHeight - height) / 2, width, height };
  }

  const height = canvasHeight;
  const width = height * videoAspect;
  return { x: (canvasWidth - width) / 2, y: 0, width, height };
}

function hasReliableTracking(landmarks) {
  return hasReliablePair(landmarks, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER)
    && hasReliablePair(landmarks, LM.LEFT_HIP, LM.RIGHT_HIP);
}

function hasReliablePair(landmarks, firstIndex, secondIndex) {
  return isReliableLandmark(landmarks[firstIndex]) && isReliableLandmark(landmarks[secondIndex]);
}

function isReliableLandmark(landmark) {
  return !!landmark && (landmark.visibility ?? 1) >= 0.45;
}

function getPoseConfidence(landmarks) {
  const trackedIndices = [
    LM.LEFT_SHOULDER,
    LM.RIGHT_SHOULDER,
    LM.LEFT_ELBOW,
    LM.RIGHT_ELBOW,
    LM.LEFT_HIP,
    LM.RIGHT_HIP,
    LM.LEFT_KNEE,
    LM.RIGHT_KNEE,
  ];

  const scores = trackedIndices
    .map((index) => landmarks[index]?.visibility)
    .filter((score) => Number.isFinite(score));

  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function createEmptyPoseState() {
  const pose = {};
  CAPTURE_JOINTS.forEach((jointName) => {
    pose[jointName] = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
    };
  });
  return pose;
}

function clonePoseState(source) {
  const pose = {};
  CAPTURE_JOINTS.forEach((jointName) => {
    pose[jointName] = {
      position: source[jointName].position.clone(),
      quaternion: source[jointName].quaternion.clone(),
    };
  });
  return pose;
}

function computePoseFromLandmarks(landmarks) {
  const pose = createEmptyPoseState();
  const worldQuaternionMap = {};

  const world = landmarks.map((landmark) => toWorldVector(landmark));
  const shouldersCenter = midpointVector(world[LM.LEFT_SHOULDER], world[LM.RIGHT_SHOULDER]);
  const hipsCenter = midpointVector(world[LM.LEFT_HIP], world[LM.RIGHT_HIP]);

  const torsoUp = averageDirection([
    directionBetween(hipsCenter, shouldersCenter),
    directionBetween(world[LM.LEFT_HIP], world[LM.LEFT_SHOULDER]),
    directionBetween(world[LM.RIGHT_HIP], world[LM.RIGHT_SHOULDER]),
  ]);

  const bodyLeft = averageDirection([
    directionBetween(world[LM.RIGHT_SHOULDER], world[LM.LEFT_SHOULDER]),
    directionBetween(world[LM.RIGHT_HIP], world[LM.LEFT_HIP]),
  ]);

  if (torsoUp && bodyLeft) {
    const rootWorldQuaternion = quaternionFromBasis(bodyLeft, torsoUp);
    setWorldQuaternionOnPose(pose, worldQuaternionMap, 'ROOT', rootWorldQuaternion);
    setWorldQuaternionOnPose(pose, worldQuaternionMap, 'SPINE', rootWorldQuaternion);
  }

  const headLeft = averageDirection([
    directionBetween(world[LM.RIGHT_EAR], world[LM.LEFT_EAR]),
    directionBetween(world[LM.RIGHT_SHOULDER], world[LM.LEFT_SHOULDER]),
  ]);
  const headUp = averageDirection([
    directionBetween(shouldersCenter, world[LM.NOSE]),
    torsoUp,
  ]);
  if (headLeft && headUp) {
    const headWorldQuaternion = quaternionFromBasis(headLeft, headUp);
    setWorldQuaternionOnPose(pose, worldQuaternionMap, 'HEAD', headWorldQuaternion);
  }

  applyLimbDirection(pose, worldQuaternionMap, 'ARM_L_UPPER', directionBetween(world[LM.LEFT_SHOULDER], world[LM.LEFT_ELBOW]));
  applyLimbDirection(pose, worldQuaternionMap, 'ARM_L_LOWER', directionBetween(world[LM.LEFT_ELBOW], world[LM.LEFT_WRIST]));
  applyLimbDirection(pose, worldQuaternionMap, 'ARM_R_UPPER', directionBetween(world[LM.RIGHT_SHOULDER], world[LM.RIGHT_ELBOW]));
  applyLimbDirection(pose, worldQuaternionMap, 'ARM_R_LOWER', directionBetween(world[LM.RIGHT_ELBOW], world[LM.RIGHT_WRIST]));
  applyLimbDirection(pose, worldQuaternionMap, 'LEG_L_UPPER', directionBetween(world[LM.LEFT_HIP], world[LM.LEFT_KNEE]));
  applyLimbDirection(pose, worldQuaternionMap, 'LEG_L_LOWER', directionBetween(world[LM.LEFT_KNEE], world[LM.LEFT_ANKLE]));
  applyLimbDirection(pose, worldQuaternionMap, 'LEG_R_UPPER', directionBetween(world[LM.RIGHT_HIP], world[LM.RIGHT_KNEE]));
  applyLimbDirection(pose, worldQuaternionMap, 'LEG_R_LOWER', directionBetween(world[LM.RIGHT_KNEE], world[LM.RIGHT_ANKLE]));

  pose.ROOT.position.copy(computeRootPosition(landmarks));
  return pose;
}

function applyLimbDirection(pose, worldQuaternionMap, jointName, direction) {
  if (!direction) return;
  const worldQuaternion = new THREE.Quaternion().setFromUnitVectors(DOWN_AXIS, direction);
  setWorldQuaternionOnPose(pose, worldQuaternionMap, jointName, worldQuaternion);
}

function computeRootPosition(landmarks) {
  const rootPosition = new THREE.Vector3(0, 0, 0);
  if (!ui.rootMotion?.checked) {
    return rootPosition;
  }

  const leftHip = landmarks[LM.LEFT_HIP];
  const rightHip = landmarks[LM.RIGHT_HIP];
  const leftShoulder = landmarks[LM.LEFT_SHOULDER];
  const rightShoulder = landmarks[LM.RIGHT_SHOULDER];
  if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) {
    return rootPosition;
  }

  const hipCenter = midpointLandmark(leftHip, rightHip);
  const shoulderSpan = distance2D(leftShoulder, rightShoulder);
  if (!rootBaseline) {
    rootBaseline = {
      x: hipCenter.x,
      y: hipCenter.y,
      shoulderSpan: shoulderSpan || 0.2,
    };
  }

  const deltaX = (hipCenter.x - rootBaseline.x) * 8;
  const deltaY = (rootBaseline.y - hipCenter.y) * 2.5;
  const depthDelta = (shoulderSpan - rootBaseline.shoulderSpan) * 8;

  rootPosition.x = THREE.MathUtils.clamp(deltaX, -4.5, 4.5);
  rootPosition.y = THREE.MathUtils.clamp(deltaY, -0.9, 1.5);
  rootPosition.z = THREE.MathUtils.clamp(depthDelta, -3.25, 3.25);

  return rootPosition;
}

function smoothPoseState(previousPose, nextPose, smoothing) {
  if (!previousPose) {
    return clonePoseState(nextPose);
  }

  const alpha = THREE.MathUtils.clamp(1 - smoothing, 0.05, 1);
  const pose = clonePoseState(previousPose);
  CAPTURE_JOINTS.forEach((jointName) => {
    pose[jointName].position.lerp(nextPose[jointName].position, alpha);
    pose[jointName].quaternion.slerp(nextPose[jointName].quaternion, alpha).normalize();
  });
  return pose;
}

function setWorldQuaternionOnPose(pose, worldQuaternionMap, jointName, worldQuaternion) {
  const parentName = JOINT_PARENTS[jointName];
  if (parentName) {
    pose[jointName].quaternion.copy(
      worldQuaternionMap[parentName].clone().invert().multiply(worldQuaternion)
    ).normalize();
  } else {
    pose[jointName].quaternion.copy(worldQuaternion).normalize();
  }
  worldQuaternionMap[jointName] = worldQuaternion.clone();
}

function quaternionFromBasis(leftAxis, upAxis) {
  const yAxis = upAxis.clone().normalize();
  let xAxis = leftAxis.clone();
  xAxis.sub(yAxis.clone().multiplyScalar(xAxis.dot(yAxis)));

  if (xAxis.lengthSq() < 1e-8) {
    xAxis = Math.abs(yAxis.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    xAxis.sub(yAxis.clone().multiplyScalar(xAxis.dot(yAxis)));
  }

  if (xAxis.lengthSq() < 1e-8) {
    return new THREE.Quaternion();
  }

  xAxis.normalize();
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  const correctedXAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  const matrix = new THREE.Matrix4().makeBasis(correctedXAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

function samplePoseIfRecording(nowMs) {
  if (!isRecording || !currentPoseState) return;

  const interval = 1 / (Number.parseInt(ui.sampleRate?.value || '10', 10) || 10);
  const elapsedSeconds = (nowMs - recordingStartedAt) / 1000;
  if (elapsedSeconds + 1e-6 < lastSampledAt + interval) {
    return;
  }

  const roundedTime = roundTime(elapsedSeconds);
  const serializedPose = serializePose(currentPoseState);
  const lastFrame = recordedFrames[recordedFrames.length - 1];

  if (lastFrame && Math.abs(lastFrame.time - roundedTime) < 1e-6) {
    lastFrame.pose = serializedPose;
  } else {
    recordedFrames.push({
      time: roundedTime,
      pose: serializedPose,
    });
  }

  lastSampledAt = roundedTime;
  updateStats();
}

function serializePose(pose) {
  const serialized = {};
  CAPTURE_JOINTS.forEach((jointName) => {
    const transform = pose[jointName];
    serialized[jointName] = {
      position: [transform.position.x, transform.position.y, transform.position.z],
      quaternion: [
        transform.quaternion.x,
        transform.quaternion.y,
        transform.quaternion.z,
        transform.quaternion.w,
      ],
    };
  });
  return serialized;
}

function buildCanonicalAnimationDefinition() {
  const name = ensureAnimationName();
  const uniqueFrames = new Map();
  recordedFrames.forEach((frame) => {
    uniqueFrames.set(frame.time.toFixed(1), {
      time: roundTime(frame.time),
      pose: frame.pose,
    });
  });
  const frames = Array.from(uniqueFrames.values()).sort((a, b) => a.time - b.time);
  const duration = frames[frames.length - 1]?.time || 0.1;
  const tracks = [];

  const rotationTargets = CAPTURE_JOINTS;
  rotationTargets.forEach((jointName) => {
    tracks.push({
      target: jointName,
      property: 'rotation',
      interpolation: 'linear',
      keyframes: frames.map((frame) => {
        const quaternion = frame.pose[jointName]?.quaternion || [0, 0, 0, 1];
        const euler = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]),
          'XYZ'
        );
        return {
          time: frame.time,
          value: [euler.x, euler.y, euler.z],
        };
      }),
    });
  });

  tracks.push({
    target: 'ROOT',
    property: 'position',
    interpolation: 'linear',
    keyframes: frames.map((frame) => ({
      time: frame.time,
      value: frame.pose.ROOT?.position || [0, 0, 0],
    })),
  });

  return {
    name,
    duration,
    loop: true,
    source: 'motion-ripper',
    sourceSkeletonId: HUMANOID_CAPTURE_SKELETON_ID,
    tracks,
  };
}

function translateCapturedAnimationForGroup(animDef, group) {
  const boneToTarget = buildCaptureTargetMap(group);
  const translated = translateAnimForMesh(animDef, group, boneToTarget);
  if (!translated) return null;
  return {
    ...translated,
    name: animDef.name,
    duration: animDef.duration,
    loop: animDef.loop,
    source: animDef.source,
    sourceSkeletonId: animDef.sourceSkeletonId,
    sourceAuthor: 'ilatroce',
  };
}

function toWorldVector(landmark) {
  if (!landmark) return null;
  return new THREE.Vector3(landmark.x, -landmark.y, -landmark.z);
}

function midpointVector(a, b) {
  if (!a || !b) return null;
  return a.clone().add(b).multiplyScalar(0.5);
}

function midpointLandmark(a, b) {
  return {
    x: ((a?.x ?? 0) + (b?.x ?? 0)) * 0.5,
    y: ((a?.y ?? 0) + (b?.y ?? 0)) * 0.5,
  };
}

function directionBetween(start, end) {
  if (!start || !end) return null;
  const direction = end.clone().sub(start);
  if (direction.lengthSq() < 1e-8) return null;
  return direction.normalize();
}

function averageDirection(vectors) {
  const sum = new THREE.Vector3();
  let count = 0;
  vectors.forEach((vector) => {
    if (!vector || vector.lengthSq() < 1e-8) return;
    sum.add(vector);
    count += 1;
  });
  if (count === 0 || sum.lengthSq() < 1e-8) return null;
  return sum.normalize();
}

function distance2D(a, b) {
  if (!a || !b) return 0;
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
}

function roundTime(value) {
  return Math.round((value + Number.EPSILON) / MOTION_TIME_STEP) * MOTION_TIME_STEP;
}
