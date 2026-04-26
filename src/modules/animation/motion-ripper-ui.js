import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { state } from '../shared/state.js';
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import { importAnimationDataToGroup } from './animation-import.js';
import { compileAnimation } from './animation.js';
import { getSkeletonById } from './skeleton-registry.js';
import { buildBoneToTargetMap } from './mesh-animation-translation.js';
import {
  buildSkinnedCaptureAnimationDefinition,
  createSkinnedCaptureCharacter,
  isSkinnedCaptureGroup,
  serializeSkinnedCaptureGroup,
} from './capture-skinned-character.js';
import { convertAnimationDefinitionToFastPoserAsset } from './animateur-animation-import.js';
import { refreshAnimationList, showTimelineForGroup } from './anim-mode-ui.js';
import { serializeGroupAsImportJSON } from '../viewport/persistence.js';
import { buildGroupFromDefinition } from '../viewport/templates.js';
import { selectMesh, deselect } from '../viewport/selection.js';
import { pushAction } from '../shared/undo.js';
import { emit } from '../../event-bus.js';

const VISION_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21-rc.20250105/vision_bundle.mjs';
const MEDIAPIPE_WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21-rc.20250105/wasm';
const MEDIAPIPE_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const HUMANOID_CAPTURE_SKELETON_ID = 'HUMANOID_CAPTURE';
const HUMANOID_CAPTURE_COMPATIBLE_SKELETON_IDS = new Set([
  HUMANOID_CAPTURE_SKELETON_ID,
  'HUMANOID_DEFAULT',
  'HUMANOID_STANDARD',
]);
const MOTION_TIME_STEP = 0.1;
const TORSO_DEPTH_SCALE = 0.12;
const LIMB_DEPTH_SCALE = 0.18;
const CAPTURED_RIG_DEPTH_SCALE = 0.12;
const CAPTURE_CHARACTER_REFERENCE_HEIGHT = 4.18;
const CAPTURE_CHARACTER_TARGET_HEIGHT = CAPTURE_CHARACTER_REFERENCE_HEIGHT;
const CAPTURE_CHARACTER_FLOOR_Y = 0.08;
const CAPTURE_CHARACTER_MIN_SCALE = 0.25;
const CAPTURE_CHARACTER_MAX_SCALE = 32;
const DOWN_AXIS = new THREE.Vector3(0, -1, 0);
const LEFT_AXIS = new THREE.Vector3(-1, 0, 0);
const RIGHT_AXIS = new THREE.Vector3(1, 0, 0);
const FOOT_AXIS = new THREE.Vector3(0, -1, 0.1).normalize();
const CAPTURE_JOINTS = Object.freeze([
  'PELVIS',
  'CHEST',
  'NECK',
  'HEAD',
  'CLAVICLE_L',
  'ARM_L_UPPER',
  'ARM_L_LOWER',
  'HAND_L',
  'CLAVICLE_R',
  'ARM_R_UPPER',
  'ARM_R_LOWER',
  'HAND_R',
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'FOOT_L',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
  'FOOT_R',
]);
const LOWER_BODY_CAPTURE_JOINTS = Object.freeze([
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'FOOT_L',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
  'FOOT_R',
]);
const UPPER_BODY_CAPTURE_JOINTS = Object.freeze(CAPTURE_JOINTS.filter((jointName) => !LOWER_BODY_CAPTURE_JOINTS.includes(jointName)));
const HALF_BODY_MIN_FRAME_COUNT = 4;
const HALF_BODY_UPPER_RELIABLE_JOINT_COUNT = 4;
const HALF_BODY_LOWER_RELIABLE_JOINT_COUNT = 2;
const HALF_BODY_UPPER_RELIABLE_FRAME_RATIO = 0.6;
const HALF_BODY_LOWER_RELIABLE_FRAME_RATIO = 0.4;
const HALF_BODY_RELIABILITY_GAP = 0.25;
const HALF_BODY_CONFIDENCE_GAP = 0.12;
const CAPTURE_FACING_YAWS = Object.freeze({
  front: 0,
  back: Math.PI,
  left: Math.PI * 0.5,
  right: -Math.PI * 0.5,
});
const LOCAL_VIDEO_SPEEDS = Object.freeze([0.25, 0.5, 1]);
const LOCAL_VIDEO_DEFAULT_SPEED = 0.25;

const POSE_JOINTS = Object.freeze([...CAPTURE_JOINTS]);

const PREVIEW_RIG_JOINTS = Object.freeze([
  'PELVIS',
  'CHEST',
  'NECK',
  'HEAD',
  'CLAVICLE_L',
  'ARM_L_UPPER',
  'ARM_L_LOWER',
  'HAND_L',
  'CLAVICLE_R',
  'ARM_R_UPPER',
  'ARM_R_LOWER',
  'HAND_R',
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'FOOT_L',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
  'FOOT_R',
]);

const PREVIEW_RIG_CONNECTIONS = Object.freeze([
  ['PELVIS', 'CHEST'],
  ['CHEST', 'NECK'],
  ['NECK', 'HEAD'],
  ['CHEST', 'CLAVICLE_L'],
  ['CLAVICLE_L', 'ARM_L_UPPER'],
  ['ARM_L_UPPER', 'ARM_L_LOWER'],
  ['ARM_L_LOWER', 'HAND_L'],
  ['CHEST', 'CLAVICLE_R'],
  ['CLAVICLE_R', 'ARM_R_UPPER'],
  ['ARM_R_UPPER', 'ARM_R_LOWER'],
  ['ARM_R_LOWER', 'HAND_R'],
  ['PELVIS', 'LEG_L_UPPER'],
  ['LEG_L_UPPER', 'LEG_L_LOWER'],
  ['LEG_L_LOWER', 'FOOT_L'],
  ['PELVIS', 'LEG_R_UPPER'],
  ['LEG_R_UPPER', 'LEG_R_LOWER'],
  ['LEG_R_LOWER', 'FOOT_R'],
]);

const JOINT_PARENTS = Object.freeze({
  ROOT: null,
  PELVIS: null,
  CHEST: 'PELVIS',
  NECK: 'CHEST',
  HEAD: 'NECK',
  CLAVICLE_L: 'CHEST',
  ARM_L_UPPER: 'CLAVICLE_L',
  ARM_L_LOWER: 'ARM_L_UPPER',
  HAND_L: 'ARM_L_LOWER',
  CLAVICLE_R: 'CHEST',
  ARM_R_UPPER: 'CLAVICLE_R',
  ARM_R_LOWER: 'ARM_R_UPPER',
  HAND_R: 'ARM_R_LOWER',
  LEG_L_UPPER: 'PELVIS',
  LEG_L_LOWER: 'LEG_L_UPPER',
  FOOT_L: 'LEG_L_LOWER',
  LEG_R_UPPER: 'PELVIS',
  LEG_R_LOWER: 'LEG_R_UPPER',
  FOOT_R: 'LEG_R_LOWER',
});

const CAPTURE_MIRROR_JOINTS = Object.freeze({
  CLAVICLE_L: 'CLAVICLE_R',
  ARM_L_UPPER: 'ARM_R_UPPER',
  ARM_L_LOWER: 'ARM_R_LOWER',
  HAND_L: 'HAND_R',
  LEG_L_UPPER: 'LEG_R_UPPER',
  LEG_L_LOWER: 'LEG_R_LOWER',
  FOOT_L: 'FOOT_R',
  CLAVICLE_R: 'CLAVICLE_L',
  ARM_R_UPPER: 'ARM_L_UPPER',
  ARM_R_LOWER: 'ARM_L_LOWER',
  HAND_R: 'HAND_L',
  LEG_R_UPPER: 'LEG_L_UPPER',
  LEG_R_LOWER: 'LEG_L_LOWER',
  FOOT_R: 'FOOT_L',
});

const LATERAL_RUNNER_ROTATION_LIMITS = Object.freeze({
  CHEST: Object.freeze([[-0.65, 0.65], [-0.45, 0.45], [-0.45, 0.45]]),
  NECK: Object.freeze([[-0.55, 0.55], [-0.45, 0.45], [-0.45, 0.45]]),
  HEAD: Object.freeze([[-0.75, 0.75], [-0.65, 0.65], [-0.65, 0.65]]),
  CLAVICLE: Object.freeze([[-0.95, 0.95], [-0.5, 0.5], [-0.7, 0.7]]),
  ARM_UPPER: Object.freeze([[-2.45, 2.45], [-0.95, 0.95], [-1.1, 1.1]]),
  ARM_LOWER: Object.freeze([[-2.7, 2.7], [-0.58, 0.58], [-0.76, 0.76]]),
  HAND: Object.freeze([[-1.45, 1.45], [-0.72, 0.72], [-0.86, 0.86]]),
  LEG_UPPER: Object.freeze([[-2.25, 2.25], [-0.58, 0.58], [-0.58, 0.58]]),
  LEG_LOWER: Object.freeze([[-2.75, 2.75], [-0.36, 0.36], [-0.48, 0.48]]),
  FOOT: Object.freeze([[-1.2, 1.2], [-0.5, 0.5], [-0.62, 0.62]]),
});
const LATERAL_RUNNER_MAX_ROTATION_STEP = 0.72;
const LATERAL_RUNNER_ROTATION_SMOOTHING = 0.28;
const LATERAL_RUNNER_FOOT_LOCK_BLEND = 0.72;
const LATERAL_RUNNER_FOOT_RELEASE_BLEND = 0.24;
const LATERAL_RUNNER_ROOT_VERTICAL_RATIO = 0.1;
const LATERAL_RUNNER_ROOT_DEPTH_RATIO = 0.08;
const LATERAL_RUNNER_ROOT_MAX_STEP_RATIO = 0.045;
const LATERAL_RUNNER_ROOT_SMOOTHING = 0.34;
const LATERAL_RUNNER_FLATNESS_RATIO = 0.14;

const CAPTURE_SEGMENT_CHILDREN = Object.freeze({
  ARM_L_UPPER: 'ARM_L_LOWER',
  ARM_L_LOWER: 'HAND_L',
  ARM_R_UPPER: 'ARM_R_LOWER',
  ARM_R_LOWER: 'HAND_R',
  LEG_L_UPPER: 'LEG_L_LOWER',
  LEG_L_LOWER: 'FOOT_L',
  LEG_R_UPPER: 'LEG_R_LOWER',
  LEG_R_LOWER: 'FOOT_R',
});

const CAPTURE_TARGET_ALIASES = Object.freeze({
  PELVIS: Object.freeze(['Hips']),
  CHEST: Object.freeze(['Spine', 'Chest']),
  NECK: Object.freeze(['Neck']),
  HEAD: Object.freeze(['Head']),
  CLAVICLE_L: Object.freeze(['Left_Shoulder', 'Left_Clavicle']),
  ARM_L_UPPER: Object.freeze(['Left_Upper_Arm']),
  ARM_L_LOWER: Object.freeze(['Left_Lower_Arm']),
  HAND_L: Object.freeze(['Left_Hand']),
  CLAVICLE_R: Object.freeze(['Right_Shoulder', 'Right_Clavicle']),
  ARM_R_UPPER: Object.freeze(['Right_Upper_Arm']),
  ARM_R_LOWER: Object.freeze(['Right_Lower_Arm']),
  HAND_R: Object.freeze(['Right_Hand']),
  LEG_L_UPPER: Object.freeze(['Left_Upper_Leg']),
  LEG_L_LOWER: Object.freeze(['Left_Lower_Leg']),
  FOOT_L: Object.freeze(['Left_Foot']),
  LEG_R_UPPER: Object.freeze(['Right_Upper_Leg']),
  LEG_R_LOWER: Object.freeze(['Right_Lower_Leg']),
  FOOT_R: Object.freeze(['Right_Foot']),
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
  [15, 17],
  [15, 19],
  [15, 21],
  [16, 18],
  [16, 20],
  [16, 22],
  [27, 29],
  [29, 31],
  [27, 31],
  [28, 30],
  [30, 32],
  [28, 32],
  [0, 11],
  [0, 12],
]);

const EDITABLE_LANDMARK_INDICES = Object.freeze(Array.from(new Set(CONNECTIONS.flat())).sort((a, b) => a - b));

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
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
});

const JOINT_SMOOTHING_FACTORS = Object.freeze({
  ROOT: 0.9,
  PELVIS: 0.92,
  CHEST: 0.94,
  NECK: 0.76,
  HEAD: 0.8,
  CLAVICLE_L: 0.4,
  ARM_L_UPPER: 0.8,
  ARM_L_LOWER: 0.82,
  HAND_L: 0.55,
  CLAVICLE_R: 0.4,
  ARM_R_UPPER: 0.8,
  ARM_R_LOWER: 0.82,
  HAND_R: 0.55,
  LEG_L_UPPER: 0.88,
  LEG_L_LOWER: 0.84,
  FOOT_L: 0.32,
  LEG_R_UPPER: 0.88,
  LEG_R_LOWER: 0.84,
  FOOT_R: 0.32,
});

const JOINT_CONFIDENCE_THRESHOLDS = Object.freeze({
  ROOT: 0.45,
  PELVIS: 0.45,
  CHEST: 0.45,
  NECK: 0.48,
  HEAD: 0.45,
  CLAVICLE_L: 0.58,
  ARM_L_UPPER: 0.48,
  ARM_L_LOWER: 0.48,
  HAND_L: 0.58,
  CLAVICLE_R: 0.58,
  ARM_R_UPPER: 0.48,
  ARM_R_LOWER: 0.48,
  HAND_R: 0.58,
  LEG_L_UPPER: 0.48,
  LEG_L_LOWER: 0.48,
  FOOT_L: 0.6,
  LEG_R_UPPER: 0.48,
  LEG_R_LOWER: 0.48,
  FOOT_R: 0.6,
});

const JOINT_CONFIDENCE_SOURCES = Object.freeze({
  ROOT: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP],
  PELVIS: [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  CHEST: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP],
  NECK: [LM.NOSE, LM.LEFT_EAR, LM.RIGHT_EAR, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  HEAD: [LM.NOSE, LM.LEFT_EAR, LM.RIGHT_EAR, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  CLAVICLE_L: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP],
  ARM_L_UPPER: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  ARM_L_LOWER: [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  HAND_L: [LM.LEFT_WRIST, LM.LEFT_INDEX, LM.LEFT_PINKY, LM.LEFT_THUMB],
  CLAVICLE_R: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP],
  ARM_R_UPPER: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  ARM_R_LOWER: [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  HAND_R: [LM.RIGHT_WRIST, LM.RIGHT_INDEX, LM.RIGHT_PINKY, LM.RIGHT_THUMB],
  LEG_L_UPPER: [LM.LEFT_HIP, LM.LEFT_KNEE],
  LEG_L_LOWER: [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  FOOT_L: [LM.LEFT_ANKLE, LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX],
  LEG_R_UPPER: [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  LEG_R_LOWER: [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  FOOT_R: [LM.RIGHT_ANKLE, LM.RIGHT_HEEL, LM.RIGHT_FOOT_INDEX],
});

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

function createEmptyCaptureAnalysis(frameCount = 0) {
  return {
    frameCount,
    upperReliableFrameRatio: 0,
    lowerReliableFrameRatio: 0,
    upperAverageConfidence: 0,
    lowerAverageConfidence: 0,
    reliabilityGap: 0,
    isHalfBodyDetected: false,
  };
}

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

function bindOverlayInteractions() {
  if (captureCropState.overlayBound || !ui.overlay) return;
  ui.overlay.addEventListener('pointerdown', onOverlayPointerDown);
  ui.overlay.addEventListener('pointermove', onOverlayPointerMove);
  window.addEventListener('pointerup', onOverlayPointerUp);
  window.addEventListener('pointercancel', onOverlayPointerUp);
  captureCropState.overlayBound = true;
}

function updateCaptureAreaUi() {
  const hasCustomRegion = !!captureCropState.region;
  const canEditArea = !frameEditState.active;
  if (ui.selectAreaBtn) {
    ui.selectAreaBtn.disabled = !canEditArea;
    ui.selectAreaBtn.textContent = captureCropState.selecting ? 'DRAW AREA...' : 'SELECT AREA';
    ui.selectAreaBtn.className = captureCropState.selecting && canEditArea
      ? 'retro-button bg-[#00d0ff] text-black py-2 text-[9px] font-bold border-2 border-[#00d0ff]'
      : canEditArea
        ? 'retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600'
        : 'retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.resetAreaBtn) {
    ui.resetAreaBtn.disabled = !hasCustomRegion || !canEditArea;
    ui.resetAreaBtn.className = hasCustomRegion && canEditArea
      ? 'retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600'
      : 'retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.areaLabel) {
    if (captureCropState.selecting) {
      ui.areaLabel.textContent = 'Capture area: drag on the video to isolate the dancer you want.';
      ui.areaLabel.className = 'text-[8px] leading-relaxed text-[#00d0ff]';
    } else if (hasCustomRegion) {
      const { width, height } = captureCropState.region;
      ui.areaLabel.textContent = `Capture area: custom ${(width * 100).toFixed(0)}% x ${(height * 100).toFixed(0)}%.`;
      ui.areaLabel.className = 'text-[8px] leading-relaxed text-[#ffcc00]';
    } else {
      ui.areaLabel.textContent = 'Capture area: full frame.';
      ui.areaLabel.className = 'text-[8px] leading-relaxed text-zinc-500';
    }
  }
  updateOverlayInteractionUi();
}

function getLocalVideoSpeed() {
  const playbackRate = Number.parseFloat(ui.video?.playbackRate);
  return LOCAL_VIDEO_SPEEDS.includes(playbackRate) ? playbackRate : LOCAL_VIDEO_DEFAULT_SPEED;
}

function getLocalVideoFrameStepSeconds() {
  const fps = Number.parseFloat(ui.localVideoFps?.value || '30');
  return 1 / THREE.MathUtils.clamp(Number.isFinite(fps) && fps > 0 ? fps : 30, 1, 120);
}

function formatVideoTime(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function updateLocalVideoUi() {
  const hasLocalSource = !!localVideoObjectUrl;
  const currentTime = ui.video?.currentTime || 0;
  const duration = ui.video?.duration || 0;

  if (ui.localVideoTime) {
    ui.localVideoTime.textContent = `${formatVideoTime(currentTime)} / ${formatVideoTime(duration)}`;
  }
  if (ui.clearLocalVideoBtn) {
    ui.clearLocalVideoBtn.disabled = !hasLocalSource;
    ui.clearLocalVideoBtn.className = hasLocalSource
      ? 'retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600'
      : 'retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }

  const activeSpeed = getLocalVideoSpeed();
  (ui.localVideoSpeedButtons || []).forEach((button) => {
    const speed = Number.parseFloat(button.dataset.motionRipperLocalVideoSpeed || '1');
    const isActive = Math.abs(speed - activeSpeed) < 1e-6;
    button.className = isActive
      ? 'retro-button bg-[#ff77aa] text-black px-2 py-1 text-[8px] border border-[#ff77aa]'
      : 'retro-button bg-zinc-800 text-[#ff77aa] px-2 py-1 text-[8px] border border-[#ff77aa]/70';
  });
}

function ensureLocalVideoBindings() {
  if (!ui.video || ui.video.dataset.motionRipperLocalVideoBound) return;
  ui.video.addEventListener('loadedmetadata', updateLocalVideoUi);
  ui.video.addEventListener('durationchange', updateLocalVideoUi);
  ui.video.addEventListener('timeupdate', updateLocalVideoUi);
  ui.video.addEventListener('play', updateLocalVideoUi);
  ui.video.addEventListener('pause', updateLocalVideoUi);
  ui.video.addEventListener('ended', () => {
    stopRecording();
    updateLocalVideoUi();
    if (captureSourceKind === 'local-video') {
      setStatus('Local video ended. Review the preview or record another take.', 'info');
    }
  });
  ui.video.dataset.motionRipperLocalVideoBound = 'true';
}

function revokeLocalVideoObjectUrl() {
  if (!localVideoObjectUrl) return;
  URL.revokeObjectURL(localVideoObjectUrl);
  localVideoObjectUrl = null;
}

function clearLocalVideoSource({ clearInput = true, clearVideo = true } = {}) {
  const wasLocalSource = captureSourceKind === 'local-video';
  revokeLocalVideoObjectUrl();
  if (wasLocalSource) {
    captureSourceKind = null;
  }
  if (clearInput && ui.localVideoInput) {
    ui.localVideoInput.value = '';
  }
  if (clearVideo && ui.video && !mediaStream) {
    ui.video.pause();
    ui.video.removeAttribute('src');
    ui.video.load();
  }
  updateLocalVideoUi();
}

function updateFrameEditUi() {
  const canEdit = !isRecording && getCanonicalCapturedFrames().length > 0;
  if (ui.editFrameBtn) {
    ui.editFrameBtn.disabled = !canEdit || frameEditState.active;
    ui.editFrameBtn.className = !canEdit || frameEditState.active
      ? 'retro-button bg-zinc-900 text-zinc-600 py-2 px-3 text-[8px] border border-zinc-800 opacity-60 cursor-not-allowed'
      : 'retro-button bg-zinc-800 text-[#00d0ff] py-2 px-3 text-[8px] border border-[#00d0ff]/60';
  }
  if (ui.editToolbar) {
    ui.editToolbar.classList.toggle('hidden', !frameEditState.active);
    ui.editToolbar.classList.toggle('flex', frameEditState.active);
  }
  if (ui.editStatus) {
    ui.editStatus.classList.toggle('hidden', !frameEditState.active);
    if (frameEditState.active) {
      const currentFrame = frameEditState.frameIndex >= 0 ? frameEditState.frameIndex + 1 : 0;
      ui.editStatus.textContent = `Edit frame ${currentFrame}. Drag joints above. Lower preview stays frozen as reference.`;
      ui.editStatus.className = 'text-[#00d0ff] text-[8px] leading-relaxed mt-1';
    } else {
      ui.editStatus.textContent = 'Edit frame mode.';
      ui.editStatus.className = 'hidden text-zinc-500 text-[8px] leading-relaxed mt-1';
    }
  }
  updateOverlayInteractionUi();
}

function updateOverlayInteractionUi() {
  if (!ui.overlay) return;
  const interactive = captureCropState.selecting || frameEditState.active;
  ui.overlay.style.pointerEvents = interactive ? 'auto' : 'none';
  ui.overlay.style.cursor = frameEditState.active
    ? (frameEditState.draggingLandmarkIndex >= 0 ? 'grabbing' : 'grab')
    : captureCropState.selecting
      ? 'crosshair'
      : 'default';
}

function getActiveCaptureRegion() {
  return captureCropState.region || { x: 0, y: 0, width: 1, height: 1 };
}

function clearCaptureDraft() {
  captureCropState.dragging = false;
  captureCropState.anchor = null;
  captureCropState.draftRegion = null;
}

function setCaptureRegion(region) {
  if (!region) {
    captureCropState.region = null;
    return;
  }
  const x = THREE.MathUtils.clamp(region.x, 0, 1);
  const y = THREE.MathUtils.clamp(region.y, 0, 1);
  const maxWidth = Math.max(0, 1 - x);
  const maxHeight = Math.max(0, 1 - y);
  const width = THREE.MathUtils.clamp(region.width, 0, maxWidth);
  const height = THREE.MathUtils.clamp(region.height, 0, maxHeight);
  captureCropState.region = width >= 0.04 && height >= 0.04
    ? { x, y, width, height }
    : null;
}

function getOverlayVideoRect() {
  if (!ui.overlay || !ui.video) return null;
  if (frameEditState.active && (!ui.video.videoWidth || !ui.video.videoHeight)) {
    return {
      x: 0,
      y: 0,
      width: ui.overlay.width || 1,
      height: ui.overlay.height || 1,
    };
  }
  return getContainedVideoRect(
    ui.overlay.width || 1,
    ui.overlay.height || 1,
    ui.video.videoWidth || 1,
    ui.video.videoHeight || 1
  );
}

function getNormalizedPointFromOverlayEvent(event) {
  if (!ui.overlay) return null;
  const bounds = ui.overlay.getBoundingClientRect();
  const scaleX = bounds.width > 0 ? ui.overlay.width / bounds.width : 1;
  const scaleY = bounds.height > 0 ? ui.overlay.height / bounds.height : 1;
  const canvasX = (event.clientX - bounds.left) * scaleX;
  const canvasY = (event.clientY - bounds.top) * scaleY;
  const rect = getOverlayVideoRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const x = THREE.MathUtils.clamp((canvasX - rect.x) / rect.width, 0, 1);
  const y = THREE.MathUtils.clamp((canvasY - rect.y) / rect.height, 0, 1);
  return { x, y };
}

function buildNormalizedRegionFromPoints(a, b) {
  if (!a || !b) return null;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function cloneLandmarks(landmarks = []) {
  return Array.isArray(landmarks) ? landmarks.map((landmark) => (landmark ? { ...landmark } : null)) : [];
}

function cloneFrameLandmarkData(frame = {}) {
  return cloneLandmarks(frame.landmarks || []);
}

function getWorkingEditLandmarks() {
  return frameEditState.workingFrame?.landmarks || [];
}

function getOriginalEditLandmarks() {
  return frameEditState.originalFrame?.landmarks || [];
}

function projectNormalizedLandmarkToOverlay(landmark, rect) {
  if (!landmark || !rect) return null;
  return {
    x: rect.x + (landmark.x ?? 0) * rect.width,
    y: rect.y + (landmark.y ?? 0) * rect.height,
  };
}

function hitTestEditableLandmark(point) {
  const rect = getOverlayVideoRect();
  if (!point || !rect) return -1;
  const workingLandmarks = getWorkingEditLandmarks();
  let bestIndex = -1;
  let bestDistanceSq = 14 * 14;
  EDITABLE_LANDMARK_INDICES.forEach((index) => {
    const projected = projectNormalizedLandmarkToOverlay(workingLandmarks[index], rect);
    if (!projected) return;
    const dx = projected.x - (rect.x + point.x * rect.width);
    const dy = projected.y - (rect.y + point.y * rect.height);
    const distanceSq = (dx * dx) + (dy * dy);
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function setEditedLandmarkPosition(index, point) {
  const workingLandmarks = getWorkingEditLandmarks();
  if (!workingLandmarks[index]) return;
  workingLandmarks[index].x = THREE.MathUtils.clamp(point.x, 0, 1);
  workingLandmarks[index].y = THREE.MathUtils.clamp(point.y, 0, 1);
  workingLandmarks[index].visibility = Math.max(workingLandmarks[index].visibility ?? 0, 0.95);
}

function onOverlayPointerDown(event) {
  if (frameEditState.active) {
    const point = getNormalizedPointFromOverlayEvent(event);
    if (!point) return;
    const landmarkIndex = hitTestEditableLandmark(point);
    if (landmarkIndex < 0) return;
    frameEditState.draggingLandmarkIndex = landmarkIndex;
    updateOverlayInteractionUi();
    ui.overlay?.setPointerCapture?.(event.pointerId);
    drawOverlay();
    event.preventDefault();
    return;
  }
  if (!captureCropState.selecting) return;
  const point = getNormalizedPointFromOverlayEvent(event);
  if (!point) return;
  captureCropState.dragging = true;
  captureCropState.anchor = point;
  captureCropState.draftRegion = { x: point.x, y: point.y, width: 0, height: 0 };
  ui.overlay?.setPointerCapture?.(event.pointerId);
  drawOverlay(latestPosePacket?.landmarks || null);
  event.preventDefault();
}

function onOverlayPointerMove(event) {
  if (frameEditState.active) {
    if (frameEditState.draggingLandmarkIndex < 0) return;
    const point = getNormalizedPointFromOverlayEvent(event);
    if (!point) return;
    setEditedLandmarkPosition(frameEditState.draggingLandmarkIndex, point);
    drawOverlay();
    event.preventDefault();
    return;
  }
  if (!captureCropState.selecting || !captureCropState.dragging) return;
  const point = getNormalizedPointFromOverlayEvent(event);
  if (!point) return;
  captureCropState.draftRegion = buildNormalizedRegionFromPoints(captureCropState.anchor, point);
  drawOverlay(latestPosePacket?.landmarks || null);
  event.preventDefault();
}

function onOverlayPointerUp(event) {
  if (frameEditState.active) {
    if (frameEditState.draggingLandmarkIndex >= 0) {
      const point = getNormalizedPointFromOverlayEvent(event);
      if (point) {
        setEditedLandmarkPosition(frameEditState.draggingLandmarkIndex, point);
      }
      frameEditState.draggingLandmarkIndex = -1;
      updateOverlayInteractionUi();
      drawOverlay();
      event.preventDefault();
    }
    return;
  }
  if (!captureCropState.selecting || !captureCropState.dragging) return;
  const point = getNormalizedPointFromOverlayEvent(event) || captureCropState.anchor;
  const region = buildNormalizedRegionFromPoints(captureCropState.anchor, point);
  clearCaptureDraft();
  captureCropState.selecting = false;
  setCaptureRegion(region);
  updateCaptureAreaUi();
  drawOverlay(latestPosePacket?.landmarks || null);
  if (captureCropState.region) {
    setStatus('Capture area updated. Tracking now follows only that zone.', 'success');
  } else {
    setStatus('Capture area was too small. Full frame capture restored.', 'error');
  }
  event.preventDefault();
}

function getMotionGroup() {
  const group = state.animationMode ? state.animationModeObject : state.selectedMesh;
  return group?.isGroup ? group : null;
}

function isCaptureGeneratedGroup(group) {
  return group?.userData?.humanoidRigMode === 'capture-generated'
    || isSkinnedCaptureGroup(group)
    || group?.userData?.motionRipperGenerated?.generatedFrom === 'motion-ripper-video'
    || group?.userData?.motionRipperGenerated?.generatedFrom === 'motion-ripper-video-skinned';
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

function findTargetNodeByName(group, targetName) {
  if (!group || !targetName) return null;
  let targetNode = null;
  group.traverse((node) => {
    if (targetNode) return;
    const nodeName = String(node?.userData?.name || node?.name || '').trim();
    if (nodeName === targetName) {
      targetNode = node;
    }
  });
  return targetNode;
}

function getNamedParentTarget(group, node) {
  let parent = node?.parent;
  while (parent && parent !== group) {
    const parentName = String(parent?.userData?.name || parent?.name || '').trim();
    if (parentName) return parentName;
    parent = parent.parent;
  }
  return null;
}

function resolvePelvisTargetName(group, animationTargets) {
  const leftUpperNode = findTargetNodeByName(group, animationTargets.LEG_L_UPPER);
  const rightUpperNode = findTargetNodeByName(group, animationTargets.LEG_R_UPPER);
  const leftParentTarget = getNamedParentTarget(group, leftUpperNode);
  const rightParentTarget = getNamedParentTarget(group, rightUpperNode);

  if (leftParentTarget && leftParentTarget === rightParentTarget) {
    return leftParentTarget;
  }

  return animationTargets.PELVIS || animationTargets.SPINE || animationTargets.CHEST || null;
}

function applyCaptureTargetAliases(animationTargets) {
  CAPTURE_JOINTS.forEach((jointName) => {
    if (animationTargets[jointName]) return;
    const aliases = CAPTURE_TARGET_ALIASES[jointName] || [];
    const targetName = aliases.map((alias) => animationTargets[alias]).find(Boolean);
    if (targetName) {
      animationTargets[jointName] = targetName;
    }
  });
  return animationTargets;
}

function resolveCaptureTargetConfig(group) {
  const skeleton = getSkeletonById(HUMANOID_CAPTURE_SKELETON_ID);
  const slotMap = group.userData?.slotMap || {};
  const slotBindings = group.userData?.slotBindings || skeleton?.defaultBindings || {};
  const syntheticPivotSet = new Set(group.userData?.syntheticHumanoidPivots || []);
  const animationTargets = applyCaptureTargetAliases({
    ...buildBoneToTargetMap(group, slotMap, slotBindings),
    ...getFallbackNamedTargets(group),
  });
  const rootMotionTargetName = getRootTargetName(group);
  animationTargets.ROOT = rootMotionTargetName;

  const pelvisTargetName = animationTargets.PELVIS || resolvePelvisTargetName(group, animationTargets) || rootMotionTargetName;
  const chestTargetName = animationTargets.CHEST || animationTargets.SPINE || pelvisTargetName;
  const neckTargetName = animationTargets.NECK || chestTargetName || animationTargets.HEAD || null;

  animationTargets.PELVIS = pelvisTargetName;
  animationTargets.CHEST = chestTargetName;
  animationTargets.NECK = neckTargetName;

  const displayTargets = {
    ...animationTargets,
    PELVIS: pelvisTargetName,
    CHEST: chestTargetName,
    NECK: neckTargetName || chestTargetName || animationTargets.HEAD || pelvisTargetName,
  };
  const suppressedBones = new Set();

  if (!pelvisTargetName || pelvisTargetName === chestTargetName) {
    suppressedBones.add('PELVIS');
  }
  if (!chestTargetName) {
    suppressedBones.add('CHEST');
  }
  if (!neckTargetName || neckTargetName === chestTargetName || neckTargetName === animationTargets.HEAD) {
    suppressedBones.add('NECK');
  }

  ['L', 'R'].forEach((side) => {
    const clavicleName = `CLAVICLE_${side}`;
    const armUpperName = `ARM_${side}_UPPER`;
    const clavicleTarget = animationTargets[clavicleName];
    const armUpperTarget = animationTargets[armUpperName];

    if (
      syntheticPivotSet.has(clavicleName)
      || !clavicleTarget
      || clavicleTarget === armUpperTarget
      || clavicleTarget === chestTargetName
      || clavicleTarget === neckTargetName
    ) {
      suppressedBones.add(clavicleName);
    }

    displayTargets[clavicleName] = clavicleTarget || armUpperTarget || chestTargetName || neckTargetName || pelvisTargetName;
  });

  return {
    animationTargets,
    displayTargets,
    rootMotionTargetName,
    suppressedBones,
  };
}

function canCaptureGroup(group) {
  if (!group?.isGroup) {
    return { ok: false, error: t('selectGroupForAnimMode') };
  }

  const skeletonId = group.userData?.skeletonId || null;
  const archetype = group.userData?.archetype || null;

  if (skeletonId && !HUMANOID_CAPTURE_COMPATIBLE_SKELETON_IDS.has(skeletonId)) {
    return { ok: false, error: t('motionRipperOnlyHumanoid') };
  }
  if (archetype && archetype !== 'HUMANOID') {
    return { ok: false, error: t('motionRipperOnlyHumanoid') };
  }

  return { ok: true };
}

function buildCaptureAnimationForTargetGroup(animDef, group, targetConfig = resolveCaptureTargetConfig(group)) {
  if (isSkinnedCaptureGroup(group)) {
    return buildSkinnedCaptureAnimationDefinition(animDef, group, {
      captureFacingYaw: getCaptureFacingYaw(),
    });
  }
  return translateCapturedAnimationForGroup(animDef, group, targetConfig);
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
    applyCapturedSkeletonToGroup(group, animationForImport.sourceSkeleton, targetConfig);
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

export function motionRipperTogglePreviewPlayback() {
  if (frameEditState.active) return;
  if (!previewState.action) return;
  setPreviewPlaybackState(!previewState.playing);
  if (previewState.playing) {
    setPreviewStatus('Previewing the captured take on the current model, the resolved rig and the captured rig.', 'success');
  } else {
    setPreviewStatus('Preview paused. Compare model, resolved rig and captured rig before importing.', 'info');
  }
}

export function motionRipperPreviewPrevFrame() {
  if (frameEditState.active) return;
  const context = getCurrentCanonicalFrameContext();
  if (!context) return;
  if (seekPreviewToFrame(context.currentIndex - 1, { pause: true })) {
    setPreviewStatus('Preview paused on the previous frame.', 'info');
  }
}

export function motionRipperPreviewNextFrame() {
  if (frameEditState.active) return;
  const context = getCurrentCanonicalFrameContext();
  if (!context) return;
  if (seekPreviewToFrame(context.currentIndex + 1, { pause: true })) {
    setPreviewStatus('Preview paused on the next frame.', 'info');
  }
}

export function motionRipperDeleteCurrentFrame() {
  if (frameEditState.active) return;
  const context = getCurrentCanonicalFrameContext();
  if (!context) return;

  const frameKey = getFrameKey(context.currentFrame.time);
  const remainingFrames = recordedFrames.filter((frame) => getFrameKey(frame.time) !== frameKey);
  if (remainingFrames.length === recordedFrames.length) {
    setStatus('Could not remove the selected frame.', 'error');
    return;
  }

  recordedFrames = reindexRecordedFrames(remainingFrames);
  updateStats();
  refreshCapturePreview({ autoPlay: false });

  const nextCanonicalCount = getCanonicalCapturedFrames().length;
  if (nextCanonicalCount > 0) {
    seekPreviewToFrame(Math.min(context.currentIndex, nextCanonicalCount - 1), { pause: true });
  }

  setStatus(`Removed frame ${context.currentIndex + 1}.`, 'success');
  setPreviewStatus('Current frame removed from the take.', 'success');
}

export function motionRipperRepairCurrentFrame() {
  if (frameEditState.active) return;
  const context = getCurrentCanonicalFrameContext();
  if (!context) return;

  const previousFrame = context.canonicalFrames[context.currentIndex - 1] || null;
  const nextFrame = context.canonicalFrames[context.currentIndex + 1] || null;
  const repairedFrame = buildRepairedFrame(context.currentFrame, previousFrame, nextFrame);
  if (!repairedFrame) {
    setStatus('Could not repair the selected frame.', 'error');
    return;
  }

  const frameKey = getFrameKey(context.currentFrame.time);
  if (!replaceRecordedFrameByKey(frameKey, repairedFrame)) {
    setStatus('Could not replace the selected frame.', 'error');
    return;
  }

  refreshCapturePreview({ autoPlay: false });
  seekPreviewToFrame(context.currentIndex, { pause: true });
  setStatus(`Repaired frame ${context.currentIndex + 1} using adjacent pose data.`, 'success');
  setPreviewStatus('Current frame repaired. Review the result before importing.', 'success');
}

function buildEditedFrameFromLandmarks(baseFrame, editedLandmarks) {
  if (!baseFrame || !Array.isArray(editedLandmarks) || editedLandmarks.length === 0) return null;

  const poseState = computePoseFromLandmarks(editedLandmarks);
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

function stopFrameEdit({ redraw = true } = {}) {
  frameEditState.active = false;
  frameEditState.frameIndex = -1;
  frameEditState.frameKey = null;
  frameEditState.originalFrame = null;
  frameEditState.workingFrame = null;
  frameEditState.draggingLandmarkIndex = -1;
  updateFrameEditUi();
  updatePreviewUi();
  if (redraw) {
    drawOverlay(latestPosePacket?.landmarks || null);
  }
}

export function motionRipperStartFrameEdit() {
  ensureUi();
  if (isRecording) {
    setStatus('Stop the recording before editing a frame.', 'error');
    return;
  }

  const context = getCurrentCanonicalFrameContext();
  if (!context) {
    setStatus('Capture a take before editing a frame.', 'error');
    return;
  }
  if (!Array.isArray(context.currentFrame.landmarks) || context.currentFrame.landmarks.length === 0) {
    setStatus('This take has no editable landmarks stored. Record it again to edit joints manually.', 'error');
    return;
  }

  captureCropState.selecting = false;
  clearCaptureDraft();
  seekPreviewToFrame(context.currentIndex, { pause: true });
  frameEditState.active = true;
  frameEditState.frameIndex = context.currentIndex;
  frameEditState.frameKey = getFrameKey(context.currentFrame.time);
  frameEditState.originalFrame = cloneRecordedFrame(context.currentFrame);
  frameEditState.workingFrame = cloneRecordedFrame(context.currentFrame);
  updateCaptureAreaUi();
  updateFrameEditUi();
  updatePreviewUi();
  drawOverlay();
  setStatus(`Editing frame ${context.currentIndex + 1}. Drag joints above, then SAVE or CANCEL.`, 'success');
  setPreviewStatus('Edit mode active. The preview below is frozen as your before-edit reference.', 'info');
}

export function motionRipperCancelFrameEdit() {
  ensureUi();
  if (!frameEditState.active) return;
  stopFrameEdit();
  setStatus('Frame edit cancelled. No changes were saved.', 'success');
  setPreviewStatus('Preview ready. Compare the model, the resolved rig and the captured rig before deciding to import.', 'success');
}

export function motionRipperSaveFrameEdit() {
  ensureUi();
  if (!frameEditState.active || !frameEditState.workingFrame) return;

  const updatedFrame = buildEditedFrameFromLandmarks(frameEditState.originalFrame, frameEditState.workingFrame.landmarks);
  if (!updatedFrame) {
    setStatus('Could not rebuild the edited frame.', 'error');
    return;
  }

  if (!replaceRecordedFrameByKey(frameEditState.frameKey, updatedFrame)) {
    setStatus('Could not save the edited frame.', 'error');
    return;
  }

  const savedFrameIndex = frameEditState.frameIndex;
  stopFrameEdit({ redraw: false });
  refreshCapturePreview({ autoPlay: false });
  seekPreviewToFrame(savedFrameIndex, { pause: true });
  drawOverlay(latestPosePacket?.landmarks || null);
  setStatus(`Saved edits for frame ${savedFrameIndex + 1}.`, 'success');
  setPreviewStatus('Edited frame saved. Review the updated model, resolved rig and captured rig before importing.', 'success');
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

function ensureTrackingCanvas(width = ui.video?.videoWidth || 1, height = ui.video?.videoHeight || 1) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  if (!captureCropState.processingCanvas) {
    captureCropState.processingCanvas = document.createElement('canvas');
    captureCropState.processingContext = captureCropState.processingCanvas.getContext('2d', { willReadFrequently: false });
  }
  if (captureCropState.processingCanvas.width !== safeWidth || captureCropState.processingCanvas.height !== safeHeight) {
    captureCropState.processingCanvas.width = safeWidth;
    captureCropState.processingCanvas.height = safeHeight;
  }
  return captureCropState.processingCanvas;
}

function remapLandmarksFromCaptureRegion(landmarks, region) {
  if (!Array.isArray(landmarks) || !region) return landmarks;
  const zScale = Math.max(Math.sqrt(region.width * region.height), 0.001);
  return landmarks.map((landmark) => ({
    ...landmark,
    x: region.x + (landmark.x ?? 0) * region.width,
    y: region.y + (landmark.y ?? 0) * region.height,
    z: (landmark.z ?? 0) * zScale,
  }));
}

function getDetectionSource() {
  const region = captureCropState.region;
  if (!region || !ui.video) {
    return { source: ui.video, region: null };
  }

  const videoWidth = Math.max(1, ui.video.videoWidth || 1);
  const videoHeight = Math.max(1, ui.video.videoHeight || 1);
  const cropWidth = Math.max(1, region.width * videoWidth);
  const cropHeight = Math.max(1, region.height * videoHeight);
  const canvas = ensureTrackingCanvas(cropWidth, cropHeight);
  const context = captureCropState.processingContext;
  const width = canvas.width;
  const height = canvas.height;
  const sx = region.x * videoWidth;
  const sy = region.y * videoHeight;
  const sw = Math.max(1, cropWidth);
  const sh = Math.max(1, cropHeight);

  context.clearRect(0, 0, width, height);
  context.drawImage(ui.video, sx, sy, sw, sh, 0, 0, width, height);
  return { source: canvas, region };
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

    const nextPose = computePoseFromLandmarks(landmarks);
    currentPoseState = smoothPoseState(currentPoseState, nextPose, Number.parseFloat(ui.smoothing?.value || '0.55'));

    updateTrackingUi(latestPosePacket.confidence);
    drawOverlay(landmarks);
    samplePoseIfRecording(nowMs, landmarks);
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

function getRecordingElapsedSeconds(nowMs) {
  if (captureSourceKind === 'local-video' && ui.video) {
    return Math.max(0, (ui.video.currentTime || 0) - recordingVideoStartedAt);
  }
  return (nowMs - recordingStartedAt) / 1000;
}

function resetFreezeLowerBodyPreference() {
  captureAnalysisState.freezeLowerBodyTouched = false;
  if (ui.freezeLowerBody) {
    ui.freezeLowerBody.checked = false;
  }
}

function averageJointConfidence(frameOrPose, jointNames) {
  if (!jointNames.length) return 0;
  const sum = jointNames.reduce((acc, jointName) => acc + getPoseConfidenceValue(frameOrPose, jointName), 0);
  return sum / jointNames.length;
}

function countReliableCaptureJoints(frameOrPose, jointNames) {
  return jointNames.reduce((count, jointName) => {
    const confidence = getPoseConfidenceValue(frameOrPose, jointName);
    const threshold = JOINT_CONFIDENCE_THRESHOLDS[jointName] ?? 0.45;
    return count + (confidence >= threshold ? 1 : 0);
  }, 0);
}

function analyzeCaptureCoverage(frames = getCanonicalCapturedFrames()) {
  if (!Array.isArray(frames) || frames.length < 2) {
    return createEmptyCaptureAnalysis(Array.isArray(frames) ? frames.length : 0);
  }

  let upperReliableFrames = 0;
  let lowerReliableFrames = 0;
  let upperAverageConfidence = 0;
  let lowerAverageConfidence = 0;

  frames.forEach((frame) => {
    const upperReliableCount = countReliableCaptureJoints(frame, UPPER_BODY_CAPTURE_JOINTS);
    const lowerReliableCount = countReliableCaptureJoints(frame, LOWER_BODY_CAPTURE_JOINTS);
    if (upperReliableCount >= HALF_BODY_UPPER_RELIABLE_JOINT_COUNT) {
      upperReliableFrames += 1;
    }
    if (lowerReliableCount >= HALF_BODY_LOWER_RELIABLE_JOINT_COUNT) {
      lowerReliableFrames += 1;
    }
    upperAverageConfidence += averageJointConfidence(frame, UPPER_BODY_CAPTURE_JOINTS);
    lowerAverageConfidence += averageJointConfidence(frame, LOWER_BODY_CAPTURE_JOINTS);
  });

  const frameCount = frames.length;
  const upperReliableFrameRatio = upperReliableFrames / frameCount;
  const lowerReliableFrameRatio = lowerReliableFrames / frameCount;
  upperAverageConfidence /= frameCount;
  lowerAverageConfidence /= frameCount;
  const reliabilityGap = upperReliableFrameRatio - lowerReliableFrameRatio;
  const isHalfBodyDetected = frameCount >= HALF_BODY_MIN_FRAME_COUNT
    && upperReliableFrameRatio >= HALF_BODY_UPPER_RELIABLE_FRAME_RATIO
    && lowerReliableFrameRatio <= HALF_BODY_LOWER_RELIABLE_FRAME_RATIO
    && reliabilityGap >= HALF_BODY_RELIABILITY_GAP
    && lowerAverageConfidence <= Math.max(0, upperAverageConfidence - HALF_BODY_CONFIDENCE_GAP);

  return {
    frameCount,
    upperReliableFrameRatio,
    lowerReliableFrameRatio,
    upperAverageConfidence,
    lowerAverageConfidence,
    reliabilityGap,
    isHalfBodyDetected,
  };
}

function resolveCaptureTrackOptions(frames = getCanonicalCapturedFrames()) {
  const analysis = analyzeCaptureCoverage(frames);
  const suppressedCaptureJoints = new Set();
  if (ui.freezeLowerBody?.checked) {
    LOWER_BODY_CAPTURE_JOINTS.forEach((jointName) => suppressedCaptureJoints.add(jointName));
  }
  return {
    analysis,
    suppressedCaptureJoints,
  };
}

function updateHalfBodyUi(analysis, hasFrames) {
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

function updateStats() {
  const hasFrames = recordedFrames.length >= 2;
  const analysis = analyzeCaptureCoverage();
  captureAnalysisState.analysis = analysis;
  if (ui.frameCount) {
    ui.frameCount.textContent = String(recordedFrames.length);
  }
  if (ui.durationValue) {
    const duration = recordedFrames.length > 0 ? recordedFrames[recordedFrames.length - 1].time : 0;
    ui.durationValue.textContent = `${duration.toFixed(1)}s`;
  }
  if (ui.importBtn) {
    ui.importBtn.disabled = !hasFrames || frameEditState.active;
    ui.importBtn.className = hasFrames && !frameEditState.active
      ? 'col-span-2 retro-button bg-[#ffcc00] text-black py-2 text-[9px] font-bold border-2 border-[#ffcc00]'
      : 'col-span-2 retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.createCharacterBtn) {
    ui.createCharacterBtn.disabled = !hasFrames || frameEditState.active;
    ui.createCharacterBtn.className = hasFrames && !frameEditState.active
      ? 'col-span-2 retro-button bg-[#00d0ff] text-black py-2 text-[9px] font-bold border-2 border-[#00d0ff]'
      : 'col-span-2 retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  if (ui.exportDebugBtn) {
    ui.exportDebugBtn.disabled = !hasFrames || frameEditState.active;
    ui.exportDebugBtn.className = hasFrames && !frameEditState.active
      ? 'col-span-2 retro-button bg-zinc-800 text-[#00d0ff] py-2 text-[9px] border border-[#00d0ff]/60'
      : 'col-span-2 retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
  }
  updateHalfBodyUi(analysis, hasFrames && !frameEditState.active);
}

function cloneJsonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sanitizeDebugFileStem(name) {
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

function buildDebugAnimationExports(group) {
  const canonicalFrames = getCanonicalCapturedFrames();
  if (canonicalFrames.length < 2) {
    return null;
  }

  const captureTrackOptions = resolveCaptureTrackOptions(canonicalFrames);
  const canonicalAnimation = buildCanonicalAnimationDefinition(canonicalFrames, captureTrackOptions);
  const speedMultiplier = getPreviewSpeedMultiplier();
  const animationForImport = ui.previewImportSpeed?.checked
    ? retimeAnimationDefinition(canonicalAnimation, speedMultiplier)
    : canonicalAnimation;
  const targetConfig = resolveCaptureTargetConfig(group);
  const translatedAnimation = buildCaptureAnimationForTargetGroup(animationForImport, group, targetConfig);
  const fastPoserExport = translatedAnimation
    ? convertAnimationDefinitionToFastPoserAsset(translatedAnimation, group)
    : null;
  const fastPoserAnimation = fastPoserExport?.success ? fastPoserExport.data : null;
  const frameDump = canonicalFrames.map((frame) => ({
    time: frame.time,
    pose: cloneJsonValue(frame.pose),
    capturedRig: cloneJsonValue(frame.capturedRig),
    landmarks: cloneJsonValue(frame.landmarks),
  }));

  return {
    canonicalFrames,
    canonicalAnimation,
    animationForImport,
    translatedAnimation,
    fastPoserAnimation,
    targetConfig,
    captureTrackOptions,
    frameDump,
  };
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

export function motionRipperExportDebugJsons() {
  if (frameEditState.active) {
    setStatus('Save or cancel the current frame edit before exporting debug JSONs.', 'error');
    return;
  }

  const group = activeGroup || getMotionGroup();
  if (!group) {
    showToast(t('selectGroupForAnim'));
    return;
  }

  const debugExport = buildDebugAnimationExports(group);
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

  const fileStem = sanitizeDebugFileStem(ensureAnimationName());
  const captureDebugJson = {
    ...cloneJsonValue(canonicalAnimation),
    debug: {
      exportKind: 'motion-ripper-capture',
      groupName: group.userData?.name || group.name || 'GROUP',
      templateId: group.userData?.templateId || null,
      sampleRate: Number.parseInt(ui.sampleRate?.value || '10', 10) || 10,
      smoothing: Number.parseFloat(ui.smoothing?.value || '0.55') || 0.55,
      rootMotion: !!ui.rootMotion?.checked,
      previewSpeed: getPreviewSpeedMultiplier(),
      importUsesPreviewSpeed: !!ui.previewImportSpeed?.checked,
      captureArea: cloneJsonValue(getActiveCaptureRegion()),
      captureFacing: getCaptureFacingMode(),
      captureFacingYaw: getCaptureFacingYaw(),
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
    isSkinnedCaptureGroup(group)
      ? serializeSkinnedCaptureGroup(group)
      : serializeGroupAsImportJSON(group)
  );
  if (!serializedGroup) {
    setStatus('Could not serialize the current model for debug export.', 'error');
    return;
  }
  if (!isCaptureGeneratedGroup(group)) {
    applyCapturedSkeletonToSerializedGroup(serializedGroup, animationForImport.sourceSkeleton, targetConfig);
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

function ensurePreviewRuntime() {
  ensureUi();
  if (previewState.renderer || !ui.previewModelCanvas || !ui.previewRigCanvas || !ui.previewCapturedCanvas) return;

  previewState.scene = createPreviewScene({ withLights: true });
  previewState.rigScene = createPreviewScene({ withLights: false });
  previewState.capturedScene = createPreviewScene({ withLights: false });

  previewState.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  previewState.camera.position.set(8, 6, 10);
  previewState.rigCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  previewState.rigCamera.position.set(8, 6, 10);
  previewState.capturedCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  previewState.capturedCamera.position.set(8, 6, 10);

  previewState.renderer = createPreviewRenderer(ui.previewModelCanvas);
  previewState.rigRenderer = createPreviewRenderer(ui.previewRigCanvas);
  previewState.capturedRenderer = createPreviewRenderer(ui.previewCapturedCanvas);

  previewState.controls = new OrbitControls(previewState.camera, ui.previewModelCanvas);
  previewState.controls.enableDamping = true;
  previewState.rigControls = new OrbitControls(previewState.rigCamera, ui.previewRigCanvas);
  previewState.rigControls.enableDamping = true;
  previewState.capturedControls = new OrbitControls(previewState.capturedCamera, ui.previewCapturedCanvas);
  previewState.capturedControls.enableDamping = true;
  setupPreviewControlSync(previewState.controls, previewState.camera);
  setupPreviewControlSync(previewState.rigControls, previewState.rigCamera);
  setupPreviewControlSync(previewState.capturedControls, previewState.capturedCamera);

  resizePreviewViewports();
  updatePreviewUi();
  startPreviewLoop();
}

function startPreviewLoop() {
  if (previewState.frameId || !previewState.renderer) return;
  previewState.lastRenderAt = performance.now();

  const renderFrame = () => {
    previewState.frameId = requestAnimationFrame(renderFrame);

    if (!previewState.renderer || !previewState.scene || !previewState.camera) return;

    const { modelResized, rigResized, capturedResized } = resizePreviewViewports();
    if (!previewState.cameraAdjusted) {
      runWithPreviewCameraSyncSuppressed(() => {
        if (modelResized && previewState.model) {
          framePreviewCamera(previewState.camera, previewState.controls, previewState.model);
        }
        if (rigResized && previewState.rigHelperGroup) {
          framePreviewCamera(previewState.rigCamera, previewState.rigControls, previewState.rigHelperGroup);
        }
        if (capturedResized && previewState.capturedHelperGroup) {
          framePreviewCamera(previewState.capturedCamera, previewState.capturedControls, previewState.capturedHelperGroup);
        }
      });
    }

    const now = performance.now();
    const deltaSeconds = Math.min(Math.max((now - previewState.lastRenderAt) / 1000, 0), 0.1);
    const previewDeltaSeconds = deltaSeconds * getPreviewSpeedMultiplier();
    previewState.lastRenderAt = now;

    let controlChanged = false;
    controlChanged = previewState.controls?.update() || controlChanged;
    controlChanged = previewState.rigControls?.update() || controlChanged;
    controlChanged = previewState.capturedControls?.update() || controlChanged;

    if (previewState.playing && previewState.mixer) {
      previewState.mixer.update(previewDeltaSeconds);
    }
    if (previewState.playing && previewState.rigMixer) {
      previewState.rigMixer.update(previewDeltaSeconds);
    }

    syncPreviewFrameCounter();
    const shouldRender = previewState.playing || modelResized || rigResized || capturedResized || controlChanged || previewState.needsRender;
    if (!shouldRender) {
      return;
    }

    updateRigPreviewHelpers();
    updateCapturedPreviewHelpers();
    previewState.renderer.render(previewState.scene, previewState.camera);
    previewState.rigRenderer?.render(previewState.rigScene, previewState.rigCamera);
    previewState.capturedRenderer?.render(previewState.capturedScene, previewState.capturedCamera);
    previewState.needsRender = false;
  };

  renderFrame();
}

function disposePreviewRuntime() {
  if (previewState.frameId) {
    cancelAnimationFrame(previewState.frameId);
    previewState.frameId = 0;
  }

  clearPreviewModel();

  previewState.controls?.dispose?.();
  previewState.rigControls?.dispose?.();
  previewState.capturedControls?.dispose?.();
  previewState.renderer?.dispose?.();
  previewState.rigRenderer?.dispose?.();
  previewState.capturedRenderer?.dispose?.();

  previewState.renderer = null;
  previewState.scene = null;
  previewState.camera = null;
  previewState.controls = null;
  previewState.rigRenderer = null;
  previewState.rigScene = null;
  previewState.rigCamera = null;
  previewState.rigControls = null;
  previewState.capturedRenderer = null;
  previewState.capturedScene = null;
  previewState.capturedCamera = null;
  previewState.capturedControls = null;
  previewState.lastRenderAt = 0;
  previewState.playing = false;
  previewState.needsRender = false;
  previewState.cameraAdjusted = false;
  previewState.suppressControlSync = false;
  previewState.syncReferenceTarget = null;
}

function createPreviewScene({ withLights = true } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09090b);
  if (withLights) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.25);
    keyLight.position.set(14, 22, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x66d9ff, 0.35);
    fillLight.position.set(-10, 12, -8);
    scene.add(fillLight);
  }
  scene.add(new THREE.GridHelper(20, 20, 0x444444, 0x262626));
  return scene;
}

function createPreviewRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  return renderer;
}

function resizePreviewViewport(stage, canvas, renderer, camera) {
  if (!renderer || !camera || !stage || !canvas) return false;

  const width = Math.max(stage.clientWidth || 0, 1);
  const height = Math.max(stage.clientHeight || 0, 1);
  const resized = canvas.width !== width || canvas.height !== height;

  if (resized) {
    canvas.width = width;
    canvas.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  return resized;
}

function resizePreviewViewports() {
  return {
    modelResized: resizePreviewViewport(ui.previewModelStage, ui.previewModelCanvas, previewState.renderer, previewState.camera),
    rigResized: resizePreviewViewport(ui.previewRigStage, ui.previewRigCanvas, previewState.rigRenderer, previewState.rigCamera),
    capturedResized: resizePreviewViewport(ui.previewCapturedStage, ui.previewCapturedCanvas, previewState.capturedRenderer, previewState.capturedCamera),
  };
}

function getPreviewControlBundles() {
  return [
    { controls: previewState.controls, camera: previewState.camera },
    { controls: previewState.rigControls, camera: previewState.rigCamera },
    { controls: previewState.capturedControls, camera: previewState.capturedCamera },
  ].filter(({ controls, camera }) => !!controls && !!camera);
}

function runWithPreviewCameraSyncSuppressed(callback) {
  previewState.suppressControlSync = true;
  try {
    callback?.();
  } finally {
    previewState.suppressControlSync = false;
  }
}

function syncPreviewControlsFrom(sourceControls, sourceCamera) {
  if (!sourceControls || !sourceCamera) return;

  const nextTarget = sourceControls.target.clone();
  const referenceTarget = previewState.syncReferenceTarget?.clone() || nextTarget.clone();
  const targetDelta = nextTarget.clone().sub(referenceTarget);
  const offset = sourceCamera.position.clone().sub(nextTarget);

  runWithPreviewCameraSyncSuppressed(() => {
    getPreviewControlBundles().forEach(({ controls, camera }) => {
      if (controls === sourceControls) return;
      controls.target.add(targetDelta);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    });
  });

  previewState.syncReferenceTarget = nextTarget;
}

function setupPreviewControlSync(controls, camera) {
  if (!controls || !camera) return;
  controls.addEventListener('start', () => {
    if (previewState.suppressControlSync) return;
    previewState.syncReferenceTarget = controls.target.clone();
  });
  controls.addEventListener('change', () => {
    if (previewState.suppressControlSync) return;
    previewState.cameraAdjusted = true;
    previewState.needsRender = true;
    syncPreviewControlsFrom(controls, camera);
  });
}

function framePreviewCamera(camera, controls, object3D) {
  if (!camera || !controls) return;

  const box = object3D ? new THREE.Box3().setFromObject(object3D) : null;
  if (!box || box.isEmpty()) {
    controls.target.set(0, 1.75, 0);
    camera.position.set(6, 5, 8);
    camera.lookAt(controls.target);
    controls.update();
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const fitHeight = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const fitWidth = fitHeight / Math.max(camera.aspect, 0.1);
  const distance = Math.max(fitHeight, fitWidth, 4) * 1.3;
  const offset = new THREE.Vector3(1.1, 0.78, 1.1).normalize().multiplyScalar(distance);

  controls.target.copy(center);
  camera.position.copy(center).add(offset);
  camera.lookAt(center);
  controls.update();
}

function cloneGroupForPreview(group) {
  let hasSkinnedMesh = false;
  group?.traverse?.((node) => {
    if (node?.isSkinnedMesh) hasSkinnedMesh = true;
  });
  const clone = hasSkinnedMesh ? SkeletonUtils.clone(group) : group.clone(true);
  clone.traverse((node) => {
    if (!node?.isMesh) return;
    if (node.geometry?.clone) {
      node.geometry = node.geometry.clone();
    }
    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => material?.clone?.() || material);
    } else if (node.material?.clone) {
      node.material = node.material.clone();
    }
  });
  return clone;
}

function buildNamedNodeLookup(root) {
  const lookup = {};
  root?.traverse((node) => {
    const userDataName = String(node?.userData?.name || '').trim();
    const nodeName = String(node?.name || '').trim();
    if (userDataName && !(userDataName in lookup)) {
      lookup[userDataName] = node;
    }
    if (nodeName && !(nodeName in lookup)) {
      lookup[nodeName] = node;
    }
  });
  return lookup;
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((entry) => disposeMaterial(entry));
    return;
  }
  material.dispose?.();
}

function disposePreviewObject3D(object3D) {
  object3D?.traverse((node) => {
    if (!node?.isMesh && !node?.isLine) return;
    node.geometry?.dispose?.();
    disposeMaterial(node.material);
    node.material = null;
  });
}

function createRigHelperGroup() {
  const group = new THREE.Group();
  const jointMeshes = {};
  const lines = [];

  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const isHead = jointName === 'HEAD';
    const isCore = jointName === 'PELVIS' || jointName === 'CHEST' || jointName === 'NECK';
    const isClavicle = jointName === 'CLAVICLE_L' || jointName === 'CLAVICLE_R';
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(isHead ? 0.16 : (isCore ? 0.13 : (isClavicle ? 0.11 : 0.12)), 8, 6),
      new THREE.MeshBasicMaterial({
        color: isHead ? 0xffcc00 : (isCore ? 0x7df9ff : (isClavicle ? 0x66ffcc : 0x00ffff)),
        wireframe: true,
        depthTest: false,
      })
    );
    sphere.visible = false;
    group.add(sphere);
    jointMeshes[jointName] = sphere;
  });

  PREVIEW_RIG_CONNECTIONS.forEach(([startJointName, endJointName]) => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({
        color: 0x00ffcc,
        depthTest: false,
      })
    );
    line.visible = false;
    group.add(line);
    lines.push({ startJointName, endJointName, line });
  });

  return { group, jointMeshes, lines };
}

function resolvePreviewJointPosition(jointName) {
  const targetName = previewState.targetMap?.[jointName];
  if (!targetName) return null;
  const node = previewState.rigNodeLookup?.[targetName];
  if (!node) return null;
  return node.getWorldPosition(new THREE.Vector3());
}

function distanceBetweenVectorsSquared(a, b) {
  if (!a || !b) return Infinity;
  return a.distanceToSquared(b);
}

function buildPreviewClaviclePoint(chest, shoulder) {
  if (!chest || !shoulder) return null;
  return chest.clone().lerp(shoulder, 0.62);
}

function coercePreviewRigVectors(vectors, suppressedBones = null) {
  const coerced = { ...vectors };
  const isSuppressed = (jointName) => suppressedBones?.has?.(jointName);
  const pelvisFromLegs = averagePointVector([coerced.LEG_L_UPPER, coerced.LEG_R_UPPER]);
  if (!coerced.PELVIS) {
    coerced.PELVIS = pelvisFromLegs;
  }

  const shoulderCenter = averagePointVector([
    coerced.ARM_L_UPPER,
    coerced.ARM_R_UPPER,
    coerced.CLAVICLE_L,
    coerced.CLAVICLE_R,
  ]);
  if (
    !coerced.CHEST
    || isSuppressed('CHEST')
    || distanceBetweenVectorsSquared(coerced.CHEST, coerced.PELVIS) < 1e-8
  ) {
    coerced.CHEST = coerced.PELVIS && shoulderCenter
      ? coerced.PELVIS.clone().lerp(shoulderCenter, 0.72)
      : (shoulderCenter || coerced.CHEST || coerced.PELVIS || null);
  }

  if (
    (!coerced.CLAVICLE_L || isSuppressed('CLAVICLE_L') || distanceBetweenVectorsSquared(coerced.CLAVICLE_L, coerced.ARM_L_UPPER) < 1e-8)
    && coerced.CHEST
    && coerced.ARM_L_UPPER
  ) {
    coerced.CLAVICLE_L = buildPreviewClaviclePoint(coerced.CHEST, coerced.ARM_L_UPPER);
  }
  if (
    (!coerced.CLAVICLE_R || isSuppressed('CLAVICLE_R') || distanceBetweenVectorsSquared(coerced.CLAVICLE_R, coerced.ARM_R_UPPER) < 1e-8)
    && coerced.CHEST
    && coerced.ARM_R_UPPER
  ) {
    coerced.CLAVICLE_R = buildPreviewClaviclePoint(coerced.CHEST, coerced.ARM_R_UPPER);
  }

  const neckBase = averagePointVector([
    shoulderCenter,
    averagePointVector([coerced.CLAVICLE_L, coerced.CLAVICLE_R]),
  ]) || shoulderCenter;
  if (
    !coerced.NECK
    || isSuppressed('NECK')
    || distanceBetweenVectorsSquared(coerced.NECK, coerced.CHEST) < 1e-8
    || distanceBetweenVectorsSquared(coerced.NECK, coerced.HEAD) < 1e-8
  ) {
    coerced.NECK = neckBase && coerced.HEAD
      ? neckBase.clone().lerp(coerced.HEAD, 0.35)
      : (neckBase || coerced.CHEST || coerced.HEAD || null);
  }

  return coerced;
}

function normalizePreviewRigFrame(frame, suppressedBones = null) {
  if (!frame) return null;

  const vectors = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const position = frame[jointName];
    if (!Array.isArray(position) || position.length !== 3) return;
    vectors[jointName] = new THREE.Vector3(position[0], position[1], position[2]);
  });
  const coercedVectors = coercePreviewRigVectors(vectors, suppressedBones);

  const hipCenter = coercedVectors.PELVIS || averagePointVector([coercedVectors.LEG_L_UPPER, coercedVectors.LEG_R_UPPER]);
  const minY = Object.values(coercedVectors).reduce((acc, vector) => Math.min(acc, vector.y), Infinity);
  const maxY = Object.values(coercedVectors).reduce((acc, vector) => Math.max(acc, vector.y), -Infinity);
  const height = Number.isFinite(maxY - minY) ? Math.max(maxY - minY, 0.001) : 1;
  const scale = 8 / height;
  const origin = hipCenter || new THREE.Vector3();

  const normalized = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const vector = coercedVectors[jointName];
    normalized[jointName] = vector
      ? vectorToArray(vector.clone().sub(origin).multiplyScalar(scale))
      : null;
  });
  return normalized;
}

function collectResolvedPreviewRigFrame() {
  const frame = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    frame[jointName] = vectorToArray(resolvePreviewJointPosition(jointName));
  });
  return normalizePreviewRigFrame(frame, previewState.suppressedBones);
}

function updateRigPreviewHelpers() {
  if (!previewState.rigHelperGroup) return;

  const frame = previewState.resolvedFrames[previewState.currentFrameIndex] || previewState.resolvedFrames[0] || null;
  const resolvedRig = frame?.resolvedRig || null;
  const positionsByJoint = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const sphere = previewState.rigJointMeshes[jointName];
    if (!sphere) return;
    const position = resolvedRig?.[jointName] || null;
    const visible = Array.isArray(position) && position.length === 3;
    sphere.visible = visible;
    if (visible) {
      sphere.position.set(position[0], position[1], position[2]);
      positionsByJoint[jointName] = sphere.position.clone();
    }
  });

  previewState.rigLines.forEach(({ startJointName, endJointName, line }) => {
    const start = positionsByJoint[startJointName];
    const end = positionsByJoint[endJointName];
    const visible = !!start && !!end;
    line.visible = visible;
    if (!visible) return;
    const positionAttr = line.geometry.getAttribute('position');
    positionAttr.setXYZ(0, start.x, start.y, start.z);
    positionAttr.setXYZ(1, end.x, end.y, end.z);
    positionAttr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  });
}

function updateCapturedPreviewHelpers() {
  if (!previewState.capturedHelperGroup) return;

  const frame = previewState.capturedFrames[previewState.currentFrameIndex] || previewState.capturedFrames[0] || null;
  const capturedRig = frame?.capturedRig || null;
  const positionsByJoint = {};

  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const sphere = previewState.capturedJointMeshes[jointName];
    if (!sphere) return;
    const position = capturedRig?.[jointName] || null;
    const visible = Array.isArray(position) && position.length === 3;
    sphere.visible = visible;
    if (visible) {
      sphere.position.set(position[0], position[1], position[2]);
      positionsByJoint[jointName] = sphere.position.clone();
    }
  });

  previewState.capturedLines.forEach(({ startJointName, endJointName, line }) => {
    const start = positionsByJoint[startJointName];
    const end = positionsByJoint[endJointName];
    const visible = !!start && !!end;
    line.visible = visible;
    if (!visible) return;
    const positionAttr = line.geometry.getAttribute('position');
    positionAttr.setXYZ(0, start.x, start.y, start.z);
    positionAttr.setXYZ(1, end.x, end.y, end.z);
    positionAttr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  });
}

function clearPreviewAnimation() {
  if (previewState.mixer) {
    previewState.mixer.stopAllAction();
    if (previewState.model) {
      previewState.mixer.uncacheRoot(previewState.model);
    }
  }
  if (previewState.rigMixer) {
    previewState.rigMixer.stopAllAction();
    if (previewState.rigModel) {
      previewState.rigMixer.uncacheRoot(previewState.rigModel);
    }
  }
  previewState.mixer = null;
  previewState.action = null;
  previewState.rigMixer = null;
  previewState.rigAction = null;
  previewState.clip = null;
  previewState.capturedFrames = [];
  previewState.resolvedFrames = [];
  previewState.frameTimes = [];
  previewState.currentFrameIndex = 0;
  previewState.totalFrameCount = 0;
  previewState.playing = false;
  previewState.needsRender = true;
}

function clearPreviewModel() {
  clearPreviewAnimation();
  if (previewState.model && previewState.scene) {
    previewState.scene.remove(previewState.model);
    disposePreviewObject3D(previewState.model);
  }
  if (previewState.rigHelperGroup && previewState.rigScene) {
    previewState.rigScene.remove(previewState.rigHelperGroup);
    disposePreviewObject3D(previewState.rigHelperGroup);
  }
  if (previewState.rigModel && previewState.rigScene) {
    previewState.rigScene.remove(previewState.rigModel);
    disposePreviewObject3D(previewState.rigModel);
  }
  if (previewState.capturedHelperGroup && previewState.capturedScene) {
    previewState.capturedScene.remove(previewState.capturedHelperGroup);
    disposePreviewObject3D(previewState.capturedHelperGroup);
  }
  previewState.model = null;
  previewState.rigModel = null;
  previewState.rigHelperGroup = null;
  previewState.rigJointMeshes = {};
  previewState.rigLines = [];
  previewState.capturedHelperGroup = null;
  previewState.capturedJointMeshes = {};
  previewState.capturedLines = [];
  previewState.targetMap = null;
  previewState.suppressedBones = null;
  previewState.rigNodeLookup = null;
  updatePreviewUi();
}

function setPreviewStatus(message, tone = 'info') {
  if (!ui.previewStatus) return;
  ui.previewStatus.textContent = message;
  ui.previewStatus.className = tone === 'error'
    ? 'text-rose-300 text-[8px] leading-relaxed mt-1'
    : tone === 'success'
      ? 'text-emerald-300 text-[8px] leading-relaxed mt-1'
      : 'text-zinc-500 text-[8px] leading-relaxed mt-1';
}

function getFrameIndexForPreviewTime(time) {
  const frameTimes = previewState.frameTimes;
  if (!frameTimes.length) return 0;
  let frameIndex = 0;
  for (let index = 0; index < frameTimes.length; index += 1) {
    if (time + 1e-5 >= frameTimes[index]) {
      frameIndex = index;
    } else {
      break;
    }
  }
  return frameIndex;
}

function syncPreviewFrameCounter() {
  const totalFrames = previewState.totalFrameCount || 0;
  let currentFrame = totalFrames > 0 ? 1 : 0;

  if (totalFrames > 0 && previewState.action && previewState.clip) {
    if (previewState.playing) {
      const duration = Math.max(previewState.clip.duration || 0, 0.0001);
      const time = THREE.MathUtils.clamp(previewState.action.time, 0, duration);
      previewState.currentFrameIndex = getFrameIndexForPreviewTime(time);
    } else {
      previewState.currentFrameIndex = THREE.MathUtils.clamp(previewState.currentFrameIndex || 0, 0, totalFrames - 1);
    }
    currentFrame = previewState.currentFrameIndex + 1;
  } else {
    previewState.currentFrameIndex = 0;
  }

  if (ui.previewFrameCurrent) {
    ui.previewFrameCurrent.textContent = String(currentFrame);
  }
  if (ui.previewFrameTotal) {
    ui.previewFrameTotal.textContent = String(totalFrames);
  }
}

function updatePreviewUi() {
  const hasClip = !!previewState.clip;
  const frameCount = previewState.totalFrameCount || getCanonicalCapturedFrames().length;
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

function getPreviewSpeedMultiplier() {
  const parsed = Number.parseFloat(ui.previewSpeed?.value || '1');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function renderPreviewNow() {
  updateRigPreviewHelpers();
  updateCapturedPreviewHelpers();
  previewState.controls?.update();
  previewState.rigControls?.update();
  previewState.capturedControls?.update();
  previewState.renderer?.render(previewState.scene, previewState.camera);
  previewState.rigRenderer?.render(previewState.rigScene, previewState.rigCamera);
  previewState.capturedRenderer?.render(previewState.capturedScene, previewState.capturedCamera);
  previewState.needsRender = false;
}

function setPreviewPlaybackState(playing) {
  if (!playing && previewState.action && previewState.clip) {
    const duration = Math.max(previewState.clip.duration || 0, 0.0001);
    const time = THREE.MathUtils.clamp(previewState.action.time, 0, duration);
    previewState.currentFrameIndex = getFrameIndexForPreviewTime(time);
  }
  previewState.playing = !!playing;
  if (previewState.action) {
    previewState.action.paused = !previewState.playing;
  }
  if (previewState.rigAction) {
    previewState.rigAction.paused = !previewState.playing;
  }
  previewState.needsRender = true;
  previewState.lastRenderAt = performance.now();
  updatePreviewUi();
}

function applyPreviewTime(time) {
  const actionWasPaused = previewState.action?.paused ?? false;
  const rigActionWasPaused = previewState.rigAction?.paused ?? false;

  if (previewState.action) {
    previewState.action.paused = false;
  }
  if (previewState.rigAction) {
    previewState.rigAction.paused = false;
  }

  previewState.mixer?.setTime(time);
  previewState.rigMixer?.setTime(time);

  if (previewState.action) {
    previewState.action.time = time;
    previewState.action.paused = actionWasPaused;
  }

  if (previewState.rigAction) {
    previewState.rigAction.time = time;
    previewState.rigAction.paused = rigActionWasPaused;
  }

  previewState.model?.updateMatrixWorld?.(true);
  previewState.rigModel?.updateMatrixWorld?.(true);
}

function seekPreviewToFrame(frameIndex, { pause = true } = {}) {
  if (!previewState.frameTimes.length || !previewState.clip) return false;

  const clampedIndex = THREE.MathUtils.clamp(frameIndex, 0, previewState.frameTimes.length - 1);
  const time = previewState.frameTimes[clampedIndex] ?? 0;

  if (pause) {
    setPreviewPlaybackState(false);
  }

  previewState.currentFrameIndex = clampedIndex;
  applyPreviewTime(time);
  previewState.needsRender = true;
  syncPreviewFrameCounter();
  updatePreviewUi();
  renderPreviewNow();
  return true;
}

function getFrameKey(time) {
  return roundTime(time).toFixed(1);
}

function cloneSerializedTransform(transform = {}) {
  return {
    position: Array.isArray(transform.position) ? [...transform.position] : [0, 0, 0],
    quaternion: Array.isArray(transform.quaternion) ? [...transform.quaternion] : [0, 0, 0, 1],
    confidence: Number.isFinite(transform.confidence) ? transform.confidence : 0,
  };
}

function cloneSerializedPose(pose = {}) {
  const clonedPose = {};
  POSE_JOINTS.forEach((jointName) => {
    clonedPose[jointName] = cloneSerializedTransform(pose[jointName]);
  });
  return clonedPose;
}

function cloneCapturedRigData(capturedRig = null) {
  if (!capturedRig) return null;
  const clonedRig = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    clonedRig[jointName] = Array.isArray(capturedRig[jointName]) ? [...capturedRig[jointName]] : null;
  });
  return clonedRig;
}

function cloneRecordedFrame(frame = {}) {
  return {
    time: roundTime(frame.time || 0),
    pose: cloneSerializedPose(frame.pose),
    capturedRig: cloneCapturedRigData(frame.capturedRig),
    landmarks: cloneFrameLandmarkData(frame),
  };
}

function reindexRecordedFrames(frames) {
  return (frames || [])
    .slice()
    .sort((a, b) => a.time - b.time)
    .map((frame, index) => ({
      ...cloneRecordedFrame(frame),
      time: roundTime(index * MOTION_TIME_STEP),
    }));
}

function interpolateNumberArray(a, b, t) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    return a.map((value, index) => THREE.MathUtils.lerp(value, b[index], t));
  }
  if (Array.isArray(a)) return [...a];
  if (Array.isArray(b)) return [...b];
  return null;
}

function interpolateQuaternionArray(a, b, t) {
  if (!Array.isArray(a) && !Array.isArray(b)) {
    return [0, 0, 0, 1];
  }
  if (!Array.isArray(a)) return [...b];
  if (!Array.isArray(b)) return [...a];
  const qa = new THREE.Quaternion(a[0], a[1], a[2], a[3]);
  const qb = new THREE.Quaternion(b[0], b[1], b[2], b[3]);
  qa.slerp(qb, t).normalize();
  return [qa.x, qa.y, qa.z, qa.w];
}

function buildRepairedFrame(currentFrame, previousFrame, nextFrame) {
  if (!currentFrame) return null;
  const targetTime = roundTime(currentFrame.time || 0);

  if (!previousFrame && !nextFrame) {
    return cloneRecordedFrame(currentFrame);
  }

  if (!previousFrame || !nextFrame) {
    const sourceFrame = cloneRecordedFrame(previousFrame || nextFrame);
    sourceFrame.time = targetTime;
    return sourceFrame;
  }

  const timeSpan = Math.max(nextFrame.time - previousFrame.time, MOTION_TIME_STEP);
  const blend = THREE.MathUtils.clamp((targetTime - previousFrame.time) / timeSpan, 0, 1);
  const repairedPose = {};
  POSE_JOINTS.forEach((jointName) => {
    repairedPose[jointName] = {
      position: interpolateNumberArray(previousFrame.pose?.[jointName]?.position, nextFrame.pose?.[jointName]?.position, blend) || [0, 0, 0],
      quaternion: interpolateQuaternionArray(previousFrame.pose?.[jointName]?.quaternion, nextFrame.pose?.[jointName]?.quaternion, blend),
      confidence: THREE.MathUtils.lerp(
        previousFrame.pose?.[jointName]?.confidence ?? nextFrame.pose?.[jointName]?.confidence ?? 0,
        nextFrame.pose?.[jointName]?.confidence ?? previousFrame.pose?.[jointName]?.confidence ?? 0,
        blend
      ),
    };
  });

  const repairedRig = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    repairedRig[jointName] = interpolateNumberArray(previousFrame.capturedRig?.[jointName], nextFrame.capturedRig?.[jointName], blend);
  });

  const repairedLandmarks = [];
  const maxLandmarks = Math.max(previousFrame.landmarks?.length || 0, nextFrame.landmarks?.length || 0);
  for (let index = 0; index < maxLandmarks; index += 1) {
    const previousLandmark = previousFrame.landmarks?.[index];
    const nextLandmark = nextFrame.landmarks?.[index];
    if (!previousLandmark && !nextLandmark) {
      repairedLandmarks[index] = null;
      continue;
    }
    repairedLandmarks[index] = {
      ...(previousLandmark || nextLandmark || {}),
      x: THREE.MathUtils.lerp(previousLandmark?.x ?? nextLandmark?.x ?? 0, nextLandmark?.x ?? previousLandmark?.x ?? 0, blend),
      y: THREE.MathUtils.lerp(previousLandmark?.y ?? nextLandmark?.y ?? 0, nextLandmark?.y ?? previousLandmark?.y ?? 0, blend),
      z: THREE.MathUtils.lerp(previousLandmark?.z ?? nextLandmark?.z ?? 0, nextLandmark?.z ?? previousLandmark?.z ?? 0, blend),
      visibility: THREE.MathUtils.lerp(previousLandmark?.visibility ?? nextLandmark?.visibility ?? 1, nextLandmark?.visibility ?? previousLandmark?.visibility ?? 1, blend),
    };
  }

  return {
    time: targetTime,
    pose: repairedPose,
    capturedRig: repairedRig,
    landmarks: repairedLandmarks,
  };
}

function getCurrentCanonicalFrameContext() {
  const canonicalFrames = getCanonicalCapturedFrames();
  if (!canonicalFrames.length) return null;
  const currentIndex = THREE.MathUtils.clamp(previewState.currentFrameIndex || 0, 0, canonicalFrames.length - 1);
  return {
    canonicalFrames,
    currentIndex,
    currentFrame: canonicalFrames[currentIndex],
  };
}

function replaceRecordedFrameByKey(frameKey, nextFrame) {
  let replaced = false;
  recordedFrames = recordedFrames.map((frame) => {
    if (getFrameKey(frame.time) !== frameKey) return frame;
    replaced = true;
    return {
      ...cloneRecordedFrame(nextFrame),
      time: roundTime(frame.time),
    };
  });
  return replaced;
}

function refreshCapturePreview({ autoPlay = false } = {}) {
  ensurePreviewRuntime();
  if (
    !previewState.renderer
    || !previewState.scene
    || !previewState.rigRenderer
    || !previewState.rigScene
    || !previewState.capturedRenderer
    || !previewState.capturedScene
  ) return;

  const group = activeGroup || getMotionGroup();
  clearPreviewModel();

  if (!group) {
    setPreviewStatus('Select a humanoid group to preview a capture on it.', 'error');
    return;
  }

  previewState.model = cloneGroupForPreview(group);
  previewState.scene.add(previewState.model);
  previewState.rigModel = cloneGroupForPreview(group);
  previewState.rigModel.traverse((node) => {
    if (node?.isMesh) {
      node.visible = false;
    }
  });
  previewState.rigScene.add(previewState.rigModel);
  const captureTargetConfig = resolveCaptureTargetConfig(group);
  previewState.targetMap = captureTargetConfig.displayTargets;
  previewState.suppressedBones = captureTargetConfig.suppressedBones;
  previewState.rigNodeLookup = buildNamedNodeLookup(previewState.rigModel);

  const rigHelper = createRigHelperGroup();
  previewState.rigHelperGroup = rigHelper.group;
  previewState.rigJointMeshes = rigHelper.jointMeshes;
  previewState.rigLines = rigHelper.lines;
  previewState.rigScene.add(previewState.rigHelperGroup);

  const capturedHelper = createRigHelperGroup();
  previewState.capturedHelperGroup = capturedHelper.group;
  previewState.capturedJointMeshes = capturedHelper.jointMeshes;
  previewState.capturedLines = capturedHelper.lines;
  previewState.capturedScene.add(previewState.capturedHelperGroup);

  updateRigPreviewHelpers();
  updateCapturedPreviewHelpers();
  if (!previewState.cameraAdjusted) {
    runWithPreviewCameraSyncSuppressed(() => {
      framePreviewCamera(previewState.camera, previewState.controls, previewState.model);
      framePreviewCamera(previewState.rigCamera, previewState.rigControls, previewState.rigHelperGroup);
      framePreviewCamera(previewState.capturedCamera, previewState.capturedControls, previewState.capturedHelperGroup);
    });
  }

  if (recordedFrames.length < 2) {
    setPreviewStatus(
      isRecording
        ? 'Recording in progress. Stop the take to compare model, resolved rig and captured rig before importing.'
        : 'Current model, resolved rig and captured rig are ready. Capture a take to animate all three before importing.',
      'info'
    );
    updatePreviewUi();
    return;
  }

  try {
    const canonicalFrames = getCanonicalCapturedFrames();
    const captureTrackOptions = resolveCaptureTrackOptions(canonicalFrames);
    const previewSuppressedBones = new Set([
      ...captureTargetConfig.suppressedBones,
      ...captureTrackOptions.suppressedCaptureJoints,
    ]);
    previewState.suppressedBones = previewSuppressedBones;
    const canonical = buildCanonicalAnimationDefinition(canonicalFrames, captureTrackOptions);
    if (!isCaptureGeneratedGroup(group)) {
      applyCapturedSkeletonToGroup(previewState.model, canonical.sourceSkeleton, captureTargetConfig);
      applyCapturedSkeletonToGroup(previewState.rigModel, canonical.sourceSkeleton, captureTargetConfig);
    }
    previewState.rigNodeLookup = buildNamedNodeLookup(previewState.rigModel);

    const translated = buildCaptureAnimationForTargetGroup(canonical, previewState.model, captureTargetConfig);
    if (!translated) {
      setPreviewStatus('Preview could not map this take onto the current model.', 'error');
      updatePreviewUi();
      return;
    }

    const clip = compileAnimation(translated, previewState.model);
    if (!clip) {
      setPreviewStatus('Preview could not build compatible animation tracks for this model.', 'error');
      updatePreviewUi();
      return;
    }

    const rigClip = compileAnimation(translated, previewState.rigModel);
    if (!rigClip) {
      setPreviewStatus('Rig preview could not build compatible animation tracks for this model.', 'error');
      updatePreviewUi();
      return;
    }

    previewState.clip = clip;
    previewState.frameTimes = canonicalFrames.map((frame) => frame.time);
    previewState.totalFrameCount = previewState.frameTimes.length;
    previewState.currentFrameIndex = 0;
    previewState.mixer = new THREE.AnimationMixer(previewState.model);
    previewState.action = previewState.mixer.clipAction(clip);
    previewState.action.setLoop(clip.userData?.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
    previewState.action.clampWhenFinished = true;
    previewState.action.play();
    previewState.action.paused = !autoPlay;

    previewState.rigMixer = new THREE.AnimationMixer(previewState.rigModel);
    previewState.rigAction = previewState.rigMixer.clipAction(rigClip);
    previewState.rigAction.setLoop(rigClip.userData?.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
    previewState.rigAction.clampWhenFinished = true;
    previewState.rigAction.play();
    previewState.rigAction.paused = !autoPlay;

    previewState.resolvedFrames = canonicalFrames.map((frame) => {
      previewState.rigMixer.setTime(frame.time);
      previewState.rigModel.updateMatrixWorld(true);
      return {
        time: frame.time,
        resolvedRig: collectResolvedPreviewRigFrame(),
      };
    });
    previewState.capturedFrames = canonicalFrames.map((frame) => ({
      time: frame.time,
      capturedRig: normalizePreviewRigFrame(frame.capturedRig || null, previewSuppressedBones),
    }));

    previewState.rigMixer.setTime(0);
    previewState.rigModel.updateMatrixWorld(true);
    previewState.rigAction.paused = !autoPlay;

    previewState.playing = autoPlay;
    previewState.lastRenderAt = performance.now();
    updateRigPreviewHelpers();
    updateCapturedPreviewHelpers();
    if (!previewState.cameraAdjusted) {
      runWithPreviewCameraSyncSuppressed(() => {
        framePreviewCamera(previewState.camera, previewState.controls, previewState.model);
        framePreviewCamera(previewState.rigCamera, previewState.rigControls, previewState.rigHelperGroup);
        framePreviewCamera(previewState.capturedCamera, previewState.capturedControls, previewState.capturedHelperGroup);
      });
    }

    setPreviewStatus(
      autoPlay
        ? 'Previewing the captured take on the model, the resolved rig and the captured rig.'
        : 'Preview ready. Compare the model, the resolved rig and the captured rig before deciding to import.',
      'success'
    );
  } catch (error) {
    console.error('Motion Ripper preview failed.', error);
    clearPreviewAnimation();
    setPreviewStatus('Preview failed to build. You can still record again or import at your own risk.', 'error');
  }

  updatePreviewUi();
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

function drawOverlay(landmarks = null) {
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

  if (frameEditState.active) {
    drawFrameEditOverlay(context, rect);
    drawCaptureAreaOverlay(context, rect);
    return;
  }

  if (Array.isArray(landmarks)) {
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

  drawCaptureAreaOverlay(context, rect);
}

function drawLandmarkRig(context, rect, landmarks, {
  lineColor = 'rgba(0, 255, 204, 0.95)',
  pointColor = 'rgba(255, 204, 0, 0.95)',
  pointRadius = 4.5,
  lineWidth = 3,
  dashed = false,
  highlightIndex = -1,
  highlightColor = 'rgba(0, 255, 136, 1)',
} = {}) {
  if (!Array.isArray(landmarks)) return;

  context.save();
  context.shadowBlur = 0;
  context.lineCap = 'round';
  context.lineWidth = lineWidth;
  context.strokeStyle = lineColor;
  if (dashed) {
    context.setLineDash([8, 6]);
  }

  CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    if (!start || !end) return;
    const startPoint = projectLandmark(start, rect);
    const endPoint = projectLandmark(end, rect);
    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(endPoint.x, endPoint.y);
    context.stroke();
  });

  if (dashed) {
    context.setLineDash([]);
  }

  EDITABLE_LANDMARK_INDICES.forEach((index) => {
    const landmark = landmarks[index];
    if (!landmark) return;
    const point = projectLandmark(landmark, rect);
    const selected = index === highlightIndex;
    context.beginPath();
    context.fillStyle = selected ? highlightColor : pointColor;
    context.arc(point.x, point.y, selected ? pointRadius + 1.5 : pointRadius, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}

function drawFrameEditOverlay(context, rect) {
  const originalLandmarks = getOriginalEditLandmarks();
  const workingLandmarks = getWorkingEditLandmarks();

  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.74)';
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();

  drawLandmarkRig(context, rect, originalLandmarks, {
    lineColor: 'rgba(255, 184, 0, 0.45)',
    pointColor: 'rgba(255, 184, 0, 0.45)',
    pointRadius: 3.5,
    lineWidth: 2,
    dashed: true,
  });

  drawLandmarkRig(context, rect, workingLandmarks, {
    lineColor: 'rgba(0, 255, 204, 0.95)',
    pointColor: 'rgba(255, 204, 0, 0.95)',
    pointRadius: 4.5,
    lineWidth: 3,
    highlightIndex: frameEditState.draggingLandmarkIndex,
  });

  context.save();
  context.fillStyle = 'rgba(0, 208, 255, 0.95)';
  context.font = "10px 'Press Start 2P', monospace";
  context.textBaseline = 'top';
  context.fillText('EDIT FRAME', rect.x + 8, rect.y + 8);
  context.fillStyle = 'rgba(255, 184, 0, 0.95)';
  context.fillText('ORANGE = ORIGINAL', rect.x + 8, rect.y + 24);
  context.fillStyle = 'rgba(0, 255, 204, 0.95)';
  context.fillText('CYAN = EDITED', rect.x + 8, rect.y + 40);
  context.restore();
}

function drawCaptureAreaOverlay(context, rect) {
  const region = captureCropState.draftRegion || captureCropState.region;
  const showPrompt = captureCropState.selecting && !region;
  if (!region && !showPrompt) return;

  context.save();
  context.shadowBlur = 0;

  if (region) {
    const x = rect.x + region.x * rect.width;
    const y = rect.y + region.y * rect.height;
    const width = region.width * rect.width;
    const height = region.height * rect.height;

    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.rect(x, y, width, height);
    context.fill('evenodd');

    context.strokeStyle = captureCropState.selecting ? 'rgba(0, 208, 255, 1)' : 'rgba(255, 204, 0, 1)';
    context.lineWidth = 2;
    context.setLineDash([8, 5]);
    context.strokeRect(x, y, width, height);
    context.setLineDash([]);

    context.fillStyle = captureCropState.selecting ? 'rgba(0, 208, 255, 0.95)' : 'rgba(255, 204, 0, 0.95)';
    context.font = "10px 'Press Start 2P', monospace";
    context.textBaseline = 'top';
    context.fillText(captureCropState.selecting ? 'DRAWING AREA' : 'CAPTURE AREA', x + 6, Math.max(rect.y + 6, y + 6));
  } else if (showPrompt) {
    context.strokeStyle = 'rgba(0, 208, 255, 0.95)';
    context.lineWidth = 2;
    context.setLineDash([8, 5]);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    context.setLineDash([]);
    context.fillStyle = 'rgba(0, 208, 255, 0.95)';
    context.font = "10px 'Press Start 2P', monospace";
    context.textBaseline = 'top';
    context.fillText('DRAG TO SELECT AREA', rect.x + 8, rect.y + 8);
  }

  context.restore();
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
    LM.LEFT_WRIST,
    LM.RIGHT_WRIST,
    LM.LEFT_HIP,
    LM.RIGHT_HIP,
    LM.LEFT_KNEE,
    LM.RIGHT_KNEE,
    LM.LEFT_ANKLE,
    LM.RIGHT_ANKLE,
  ];

  const scores = trackedIndices
    .map((index) => landmarks[index]?.visibility)
    .filter((score) => Number.isFinite(score));

  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function createEmptyPoseState() {
  const pose = {};
  POSE_JOINTS.forEach((jointName) => {
    pose[jointName] = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      positionTracked: false,
      rotationTracked: false,
      confidence: 0,
    };
  });
  return pose;
}

function clonePoseState(source) {
  const pose = {};
  POSE_JOINTS.forEach((jointName) => {
    pose[jointName] = {
      position: source[jointName].position.clone(),
      quaternion: source[jointName].quaternion.clone(),
      positionTracked: !!source[jointName].positionTracked,
      rotationTracked: !!source[jointName].rotationTracked,
      confidence: source[jointName].confidence || 0,
    };
  });
  return pose;
}

function computePoseFromLandmarks(landmarks) {
  const pose = createEmptyPoseState();
  const worldQuaternionMap = {};

  const torso = landmarks.map((landmark) => (isReliableLandmark(landmark) ? toWorldVector(landmark, TORSO_DEPTH_SCALE) : null));
  const limbs = landmarks.map((landmark) => (isReliableLandmark(landmark) ? toWorldVector(landmark, LIMB_DEPTH_SCALE) : null));
  const shouldersCenter = midpointVector(torso[LM.LEFT_SHOULDER], torso[LM.RIGHT_SHOULDER]);
  const hipsCenter = midpointVector(torso[LM.LEFT_HIP], torso[LM.RIGHT_HIP]);
  const earsCenter = midpointVector(torso[LM.LEFT_EAR], torso[LM.RIGHT_EAR]);

  const torsoUp = averageDirection([
    directionBetween(hipsCenter, shouldersCenter),
    directionBetween(torso[LM.LEFT_HIP], torso[LM.LEFT_SHOULDER]),
    directionBetween(torso[LM.RIGHT_HIP], torso[LM.RIGHT_SHOULDER]),
  ]);

  const pelvisLeft = averageDirection([
    directionBetween(torso[LM.RIGHT_HIP], torso[LM.LEFT_HIP]),
  ]);
  const chestLeft = averageDirection([
    directionBetween(torso[LM.RIGHT_SHOULDER], torso[LM.LEFT_SHOULDER]),
    directionBetween(torso[LM.RIGHT_HIP], torso[LM.LEFT_HIP]),
  ]);
  const chestUp = averageDirection([
    torsoUp,
    directionBetween(hipsCenter, shouldersCenter),
    directionBetween(shouldersCenter, torso[LM.NOSE]),
  ]);
  const neckUp = averageDirection([
    directionBetween(shouldersCenter, torso[LM.NOSE]),
    directionBetween(shouldersCenter, earsCenter),
    chestUp,
  ]);

  const pelvisConfidence = getJointConfidence(landmarks, 'PELVIS');
  if (torsoUp && pelvisLeft && canTrackJoint('PELVIS', pelvisConfidence)) {
    const pelvisWorldQuaternion = quaternionFromBasis(pelvisLeft, torsoUp);
    setWorldQuaternionOnPose(pose, worldQuaternionMap, 'PELVIS', pelvisWorldQuaternion, pelvisConfidence);
    // CHEST inherits PELVIS world rotation (local = identity) like animateur Spine = Hips.
    // NECK and CLAVICLE_L/R stay identity local — they're export-rig fillers, not animated joints.
    worldQuaternionMap.CHEST = pelvisWorldQuaternion.clone();
    worldQuaternionMap.NECK = pelvisWorldQuaternion.clone();
    worldQuaternionMap.CLAVICLE_L = pelvisWorldQuaternion.clone();
    worldQuaternionMap.CLAVICLE_R = pelvisWorldQuaternion.clone();
  }

  const headLeft = averageDirection([
    directionBetween(torso[LM.RIGHT_EAR], torso[LM.LEFT_EAR]),
    directionBetween(torso[LM.RIGHT_SHOULDER], torso[LM.LEFT_SHOULDER]),
  ]);
  const headUp = averageDirection([
    directionBetween(earsCenter, torso[LM.NOSE]),
    directionBetween(shouldersCenter, torso[LM.NOSE]),
    neckUp,
  ]);
  const headConfidence = getJointConfidence(landmarks, 'HEAD');
  if (headLeft && headUp && canTrackJoint('HEAD', headConfidence)) {
    const headWorldQuaternion = quaternionFromBasis(headLeft, headUp);
    setWorldQuaternionOnPose(pose, worldQuaternionMap, 'HEAD', headWorldQuaternion, headConfidence);
  }

  applyBoneDirection(
    pose,
    worldQuaternionMap,
    'ARM_L_UPPER',
    directionBetween(limbs[LM.LEFT_SHOULDER], limbs[LM.LEFT_ELBOW]),
    DOWN_AXIS,
    getJointConfidence(landmarks, 'ARM_L_UPPER')
  );
  applyBoneDirection(
    pose,
    worldQuaternionMap,
    'ARM_L_LOWER',
    directionBetween(limbs[LM.LEFT_ELBOW], limbs[LM.LEFT_WRIST]),
    DOWN_AXIS,
    getJointConfidence(landmarks, 'ARM_L_LOWER')
  );
  // HAND_L stays identity — animateur doesn't animate hands (no MediaPipe finger data).

  applyBoneDirection(
    pose,
    worldQuaternionMap,
    'ARM_R_UPPER',
    directionBetween(limbs[LM.RIGHT_SHOULDER], limbs[LM.RIGHT_ELBOW]),
    DOWN_AXIS,
    getJointConfidence(landmarks, 'ARM_R_UPPER')
  );
  applyBoneDirection(
    pose,
    worldQuaternionMap,
    'ARM_R_LOWER',
    directionBetween(limbs[LM.RIGHT_ELBOW], limbs[LM.RIGHT_WRIST]),
    DOWN_AXIS,
    getJointConfidence(landmarks, 'ARM_R_LOWER')
  );
  // HAND_R stays identity — animateur doesn't animate hands.

  applyBoneDirectionWithReference(
    pose,
    worldQuaternionMap,
    'LEG_L_UPPER',
    directionBetween(limbs[LM.LEFT_HIP], limbs[LM.LEFT_KNEE]),
    worldQuaternionMap.PELVIS,
    getJointConfidence(landmarks, 'LEG_L_UPPER')
  );
  applyBoneDirectionWithReference(
    pose,
    worldQuaternionMap,
    'LEG_L_LOWER',
    directionBetween(limbs[LM.LEFT_KNEE], limbs[LM.LEFT_ANKLE]),
    worldQuaternionMap.LEG_L_UPPER || worldQuaternionMap.PELVIS,
    getJointConfidence(landmarks, 'LEG_L_LOWER')
  );
  // FOOT_L stays identity — animateur doesn't animate feet.

  applyBoneDirectionWithReference(
    pose,
    worldQuaternionMap,
    'LEG_R_UPPER',
    directionBetween(limbs[LM.RIGHT_HIP], limbs[LM.RIGHT_KNEE]),
    worldQuaternionMap.PELVIS,
    getJointConfidence(landmarks, 'LEG_R_UPPER')
  );
  applyBoneDirectionWithReference(
    pose,
    worldQuaternionMap,
    'LEG_R_LOWER',
    directionBetween(limbs[LM.RIGHT_KNEE], limbs[LM.RIGHT_ANKLE]),
    worldQuaternionMap.LEG_R_UPPER || worldQuaternionMap.PELVIS,
    getJointConfidence(landmarks, 'LEG_R_LOWER')
  );
  // FOOT_R stays identity — animateur doesn't animate feet.

  const rootPosition = computeRootPosition(landmarks);
  if (rootPosition) {
    pose.PELVIS.position.copy(rootPosition);
    pose.PELVIS.positionTracked = true;
  }
  return pose;
}

function applyBoneDirection(pose, worldQuaternionMap, jointName, direction, sourceAxis = DOWN_AXIS, confidence = 1) {
  if (!direction || !canTrackJoint(jointName, confidence)) return;
  const worldQuaternion = new THREE.Quaternion().setFromUnitVectors(sourceAxis, direction);
  setWorldQuaternionOnPose(pose, worldQuaternionMap, jointName, worldQuaternion, confidence);
}

function applyBoneDirectionWithReference(pose, worldQuaternionMap, jointName, direction, referenceQuaternion, confidence = 1) {
  if (!direction || !canTrackJoint(jointName, confidence)) return;
  if (!referenceQuaternion) {
    applyBoneDirection(pose, worldQuaternionMap, jointName, direction, DOWN_AXIS, confidence);
    return;
  }

  const upAxis = direction.clone().multiplyScalar(-1);
  const referenceSideAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(referenceQuaternion);
  if (referenceSideAxis.lengthSq() < 1e-8) {
    applyBoneDirection(pose, worldQuaternionMap, jointName, direction, DOWN_AXIS, confidence);
    return;
  }

  const worldQuaternion = quaternionFromBasis(referenceSideAxis, upAxis);
  setWorldQuaternionOnPose(pose, worldQuaternionMap, jointName, worldQuaternion, confidence);
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
  if (!isReliableLandmark(leftHip) || !isReliableLandmark(rightHip) || !isReliableLandmark(leftShoulder) || !isReliableLandmark(rightShoulder)) {
    return null;
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
  POSE_JOINTS.forEach((jointName) => {
    const jointAlpha = getJointBlendAlpha(jointName, alpha, nextPose[jointName].confidence);
    if (nextPose[jointName].positionTracked) {
      pose[jointName].position.lerp(nextPose[jointName].position, jointAlpha);
      pose[jointName].positionTracked = true;
    }
    if (nextPose[jointName].rotationTracked) {
      pose[jointName].quaternion.slerp(nextPose[jointName].quaternion, jointAlpha).normalize();
      pose[jointName].rotationTracked = true;
    }
    pose[jointName].confidence = nextPose[jointName].positionTracked || nextPose[jointName].rotationTracked
      ? nextPose[jointName].confidence
      : (previousPose[jointName].confidence || 0) * 0.92;
  });
  return pose;
}

function setWorldQuaternionOnPose(pose, worldQuaternionMap, jointName, worldQuaternion, confidence = 1) {
  const parentName = JOINT_PARENTS[jointName];
  if (parentName) {
    if (!worldQuaternionMap[parentName]) return;
    pose[jointName].quaternion.copy(
      worldQuaternionMap[parentName].clone().invert().multiply(worldQuaternion)
    ).normalize();
  } else {
    pose[jointName].quaternion.copy(worldQuaternion).normalize();
  }
  pose[jointName].rotationTracked = true;
  pose[jointName].confidence = Math.max(pose[jointName].confidence, confidence);
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

function samplePoseIfRecording(nowMs, landmarks = latestPosePacket?.landmarks || null) {
  if (!isRecording || !currentPoseState) return;

  const interval = 1 / (Number.parseInt(ui.sampleRate?.value || '10', 10) || 10);
  const elapsedSeconds = getRecordingElapsedSeconds(nowMs);
  if (elapsedSeconds + 1e-6 < lastSampledAt + interval) {
    return;
  }

  const roundedTime = roundTime(elapsedSeconds);
  const serializedPose = serializePose(currentPoseState);
  const rootPosition = currentPoseState?.ROOT?.positionTracked ? currentPoseState.ROOT.position.clone() : new THREE.Vector3();
  const capturedRig = buildCapturedPreviewRigFromLandmarks(landmarks, rootPosition);
  const lastFrame = recordedFrames[recordedFrames.length - 1];

  if (lastFrame && Math.abs(lastFrame.time - roundedTime) < 1e-6) {
    lastFrame.pose = serializedPose;
    lastFrame.capturedRig = capturedRig;
    lastFrame.landmarks = cloneLandmarks(landmarks);
  } else {
    recordedFrames.push({
      time: roundedTime,
      pose: serializedPose,
      capturedRig,
      landmarks: cloneLandmarks(landmarks),
    });
  }

  lastSampledAt = roundedTime;
  updateStats();
}

function serializePose(pose) {
  const serialized = {};
  POSE_JOINTS.forEach((jointName) => {
    const transform = pose[jointName];
    serialized[jointName] = {
      position: [transform.position.x, transform.position.y, transform.position.z],
      quaternion: [
        transform.quaternion.x,
        transform.quaternion.y,
        transform.quaternion.z,
        transform.quaternion.w,
      ],
      confidence: transform.confidence || 0,
    };
  });
  return serialized;
}

function getPoseTransform(frameOrPose, jointName) {
  if (frameOrPose?.pose?.[jointName]) {
    return frameOrPose.pose[jointName];
  }
  return frameOrPose?.[jointName] || null;
}

function getPoseQuaternion(frameOrPose, jointName) {
  const quaternion = getPoseTransform(frameOrPose, jointName)?.quaternion;
  if (!Array.isArray(quaternion) || quaternion.length !== 4) {
    return new THREE.Quaternion();
  }

  return new THREE.Quaternion(
    quaternion[0] ?? 0,
    quaternion[1] ?? 0,
    quaternion[2] ?? 0,
    quaternion[3] ?? 1
  ).normalize();
}

function getPoseConfidenceValue(frameOrPose, jointName) {
  const confidence = getPoseTransform(frameOrPose, jointName)?.confidence;
  if (Number.isFinite(confidence)) {
    return confidence;
  }
  return 1;
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

function computeCaptureRestPose(frames) {
  const restFrame = captureRestPose || (Array.isArray(frames) && frames.length > 0 ? frames[0] : null);
  const restPose = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    restPose[jointName] = getPoseQuaternion(restFrame, jointName);
  });

  return restPose;
}

function getCaptureSkeletonParentName(jointName) {
  if (jointName === 'PELVIS') return null;
  return JOINT_PARENTS[jointName] || null;
}

function getCaptureRigVector(frame, jointName) {
  const position = frame?.capturedRig?.[jointName];
  if (!Array.isArray(position) || position.length !== 3) return null;
  if (!position.every((value) => Number.isFinite(value))) return null;
  return new THREE.Vector3(position[0], position[1], position[2]);
}

function roundSkeletonValue(value) {
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 1000000) / 1000000 : 0;
}

function vectorToRoundedArray(vector) {
  return [
    roundSkeletonValue(vector?.x ?? 0),
    roundSkeletonValue(vector?.y ?? 0),
    roundSkeletonValue(vector?.z ?? 0),
  ];
}

function averageVectors(vectors) {
  if (!vectors.length) return null;
  const sum = new THREE.Vector3();
  vectors.forEach((vector) => sum.add(vector));
  return sum.multiplyScalar(1 / vectors.length);
}

function mirrorCaptureLocalVector(vector) {
  return vector ? new THREE.Vector3(-vector.x, vector.y, vector.z) : null;
}

function getCaptureRigJointNames() {
  return [...CAPTURE_JOINTS];
}

function findCaptureSkeletonRestFrame(frames) {
  return (Array.isArray(frames) ? frames : []).find((frame) => (
    getCaptureRigVector(frame, 'PELVIS')
    && getCaptureRigVector(frame, 'CHEST')
  )) || null;
}

function computeCapturedLocalOffsetFromFrame(frame, jointName) {
  if (jointName === 'PELVIS') {
    return new THREE.Vector3();
  }

  const parentName = getCaptureSkeletonParentName(jointName);
  const joint = getCaptureRigVector(frame, jointName);
  const parent = parentName ? getCaptureRigVector(frame, parentName) : null;
  if (!joint || !parent) return null;

  return joint.clone().sub(parent);
}

function computeAverageCapturedLocalOffset(frames, jointName) {
  if (jointName === 'PELVIS') {
    return new THREE.Vector3();
  }

  const samples = [];
  (Array.isArray(frames) ? frames : []).forEach((frame) => {
    const offset = computeCapturedLocalOffsetFromFrame(frame, jointName);
    if (offset) samples.push(offset);
  });
  return averageVectors(samples);
}

function buildCapturedLocalOffsetMap(frames) {
  const restFrame = findCaptureSkeletonRestFrame(frames);
  const localOffsets = new Map();
  const joints = [...CAPTURE_JOINTS];

  joints.forEach((jointName) => {
    localOffsets.set(
      jointName,
      computeAverageCapturedLocalOffset(frames, jointName)
        || computeCapturedLocalOffsetFromFrame(restFrame, jointName)
        || null
    );
  });

  joints.forEach((jointName) => {
    if (localOffsets.get(jointName)) return;
    const mirrorJointName = CAPTURE_MIRROR_JOINTS[jointName];
    const mirrorOffset = mirrorJointName ? localOffsets.get(mirrorJointName) : null;
    if (mirrorOffset) {
      localOffsets.set(jointName, mirrorCaptureLocalVector(mirrorOffset));
    }
  });

  return localOffsets;
}

function buildCaptureSkeletonWorldMapFromLocalOffsets(localOffsets) {
  const world = new Map();

  function resolve(jointName) {
    if (world.has(jointName)) return world.get(jointName).clone();
    const local = localOffsets.get(jointName)?.clone?.() || new THREE.Vector3();
    const parentName = getCaptureSkeletonParentName(jointName);
    const position = local.clone();
    if (parentName) {
      const parent = resolve(parentName);
      if (parent) position.add(parent);
    }
    world.set(jointName, position.clone());
    return position;
  }

  getCaptureRigJointNames().forEach((jointName) => resolve(jointName));
  return world;
}

function getWorldMapSpan(world, leftName, rightName, axis = 'x') {
  const left = world.get(leftName);
  const right = world.get(rightName);
  if (!left || !right) return 0;
  return Math.abs((right[axis] ?? 0) - (left[axis] ?? 0));
}

function getWorldMapPairCenter(world, leftName, rightName, fallbackName = null) {
  const left = world.get(leftName);
  const right = world.get(rightName);
  if (left && right) return left.clone().add(right).multiplyScalar(0.5);
  return fallbackName ? world.get(fallbackName)?.clone() || null : null;
}

function setWorldMapSymmetricSpan(world, leftName, rightName, center, minSpan) {
  const left = world.get(leftName);
  const right = world.get(rightName);
  if (!left || !right || !center || !Number.isFinite(minSpan) || minSpan <= 0) return false;
  if (getWorldMapSpan(world, leftName, rightName, 'x') >= minSpan) return false;

  const pairCenter = left.clone().add(right).multiplyScalar(0.5);
  left.x = center.x - (minSpan * 0.5);
  right.x = center.x + (minSpan * 0.5);
  left.y = Number.isFinite(left.y) ? left.y : pairCenter.y;
  right.y = Number.isFinite(right.y) ? right.y : pairCenter.y;
  return true;
}

function isCapturedSkeletonFlat(world) {
  const bounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => world.get(jointName)));
  const height = Math.max(bounds?.size?.y || 0, 1e-5);
  const horizontalSpan = Math.max(bounds?.size?.x || 0, bounds?.size?.z || 0);
  return horizontalSpan / height < LATERAL_RUNNER_FLATNESS_RATIO;
}

function humanizeCapturedSkeletonWorldMap(world) {
  const next = new Map(
    getCaptureRigJointNames().map((jointName) => [
      jointName,
      world.get(jointName)?.clone?.() || new THREE.Vector3(),
    ])
  );
  const bounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => next.get(jointName)));
  const height = Math.max(bounds?.size?.y || 1, 1e-5);
  const chest = next.get('CHEST') || next.get('PELVIS') || new THREE.Vector3();
  const pelvis = next.get('PELVIS') || new THREE.Vector3();
  const shoulderCenter = getWorldMapPairCenter(next, 'ARM_L_UPPER', 'ARM_R_UPPER', 'CHEST')
    || getWorldMapPairCenter(next, 'CLAVICLE_L', 'CLAVICLE_R', 'CHEST')
    || chest.clone();
  const hipCenter = getWorldMapPairCenter(next, 'LEG_L_UPPER', 'LEG_R_UPPER', 'PELVIS') || pelvis.clone();

  const shoulderSpan = Math.max(
    getWorldMapSpan(next, 'ARM_L_UPPER', 'ARM_R_UPPER', 'x'),
    getWorldMapSpan(next, 'CLAVICLE_L', 'CLAVICLE_R', 'x'),
    height * 0.22
  );
  const clavicleSpan = Math.max(shoulderSpan * 0.72, height * 0.16);
  const hipSpan = Math.max(
    getWorldMapSpan(next, 'LEG_L_UPPER', 'LEG_R_UPPER', 'x'),
    height * 0.13
  );

  setWorldMapSymmetricSpan(next, 'CLAVICLE_L', 'CLAVICLE_R', shoulderCenter, clavicleSpan);
  setWorldMapSymmetricSpan(next, 'ARM_L_UPPER', 'ARM_R_UPPER', shoulderCenter, shoulderSpan);
  setWorldMapSymmetricSpan(next, 'ARM_L_LOWER', 'ARM_R_LOWER', shoulderCenter, shoulderSpan * 0.9);
  setWorldMapSymmetricSpan(next, 'HAND_L', 'HAND_R', shoulderCenter, shoulderSpan * 0.82);
  setWorldMapSymmetricSpan(next, 'LEG_L_UPPER', 'LEG_R_UPPER', hipCenter, hipSpan);
  setWorldMapSymmetricSpan(next, 'LEG_L_LOWER', 'LEG_R_LOWER', hipCenter, hipSpan * 0.88);
  setWorldMapSymmetricSpan(next, 'FOOT_L', 'FOOT_R', hipCenter, hipSpan * 0.9);

  return next;
}

function constrainCapturedSkeletonWorldMap(world) {
  if (!isLateralRunnerCapture() && !isCapturedSkeletonFlat(world)) {
    return world;
  }
  return humanizeCapturedSkeletonWorldMap(world);
}

function buildCaptureLocalOffsetMapFromWorld(world) {
  const localOffsets = new Map();
  getCaptureRigJointNames().forEach((jointName) => {
    const position = world.get(jointName);
    const parentName = getCaptureSkeletonParentName(jointName);
    const parent = parentName ? world.get(parentName) : null;
    localOffsets.set(
      jointName,
      position
        ? (parent ? position.clone().sub(parent) : position.clone())
        : null
    );
  });
  return localOffsets;
}

function buildCapturedSkeletonDefinition(frames) {
  const fallbackSkeleton = getSkeletonById(HUMANOID_CAPTURE_SKELETON_ID);
  const fallbackPositions = new Map((fallbackSkeleton?.bones || []).map((bone) => [bone.name, bone.position || [0, 0, 0]]));
  const joints = getCaptureRigJointNames();
  const rawLocalOffsets = buildCapturedLocalOffsetMap(frames);
  const constrainedWorld = constrainCapturedSkeletonWorldMap(buildCaptureSkeletonWorldMapFromLocalOffsets(rawLocalOffsets));
  const localOffsets = buildCaptureLocalOffsetMapFromWorld(constrainedWorld);

  return {
    id: HUMANOID_CAPTURE_SKELETON_ID,
    archetype: 'HUMANOID',
    generatedFrom: isLateralRunnerCapture() ? 'motion-ripper-constrained-lateral-rig' : 'motion-ripper-captured-rig',
    bones: joints.map((jointName) => {
      const parentName = getCaptureSkeletonParentName(jointName);
      const position = localOffsets.get(jointName);

      return {
        name: jointName,
        parent: parentName,
        position: position
          ? vectorToRoundedArray(position)
          : [...(fallbackPositions.get(jointName) || [0, 0, 0])],
      };
    }),
    defaultBindings: fallbackSkeleton?.defaultBindings ? cloneJsonValue(fallbackSkeleton.defaultBindings) : {},
    animations: [],
  };
}

function getCaptureDefaultBindings(sourceSkeleton = null) {
  const fallbackSkeleton = getSkeletonById(HUMANOID_CAPTURE_SKELETON_ID);
  return cloneJsonValue(
    sourceSkeleton?.defaultBindings
    || fallbackSkeleton?.defaultBindings
    || {
      HEAD: ['HEAD'],
      TORSO: ['PELVIS', 'CHEST', 'NECK'],
      ARM_L: ['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L'],
      ARM_R: ['CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R'],
      LEG_L: ['LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L'],
      LEG_R: ['LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R'],
      WEAPON_MAIN: [],
      WEAPON_SECONDARY: [],
    }
  );
}

function roundGeometryValue(value) {
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 10000) / 10000 : 0;
}

function vectorToGeometryArray(vector) {
  return [
    roundGeometryValue(vector?.x ?? 0),
    roundGeometryValue(vector?.y ?? 0),
    roundGeometryValue(vector?.z ?? 0),
  ];
}

function createCuboidGeometryBetween(start, end, width = 0.24, depth = width) {
  if (!start || !end) return null;

  const segment = end.clone().sub(start);
  const length = segment.length();
  if (length < 1e-5) return null;

  const axis = segment.clone().normalize();
  const reference = Math.abs(axis.dot(new THREE.Vector3(0, 1, 0))) < 0.92
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const sideA = new THREE.Vector3().crossVectors(axis, reference).normalize().multiplyScalar(width * 0.5);
  const sideB = new THREE.Vector3().crossVectors(axis, sideA).normalize().multiplyScalar(depth * 0.5);
  const localEnd = segment;

  const makeCorners = (point) => [
    point.clone().add(sideA).add(sideB),
    point.clone().add(sideA).sub(sideB),
    point.clone().sub(sideA).sub(sideB),
    point.clone().sub(sideA).add(sideB),
  ];

  return {
    type: 'custom',
    vertices: [
      ...makeCorners(new THREE.Vector3()),
      ...makeCorners(localEnd),
    ].map(vectorToGeometryArray),
    faces: [
      [0, 1, 2], [0, 2, 3],
      [4, 6, 5], [4, 7, 6],
      [0, 4, 5], [0, 5, 1],
      [1, 5, 6], [1, 6, 2],
      [2, 6, 7], [2, 7, 3],
      [3, 7, 4], [3, 4, 0],
    ],
  };
}

function getCaptureCharacterSpace(sourceSkeleton) {
  const sourceWorld = buildSkeletonWorldPositionMap(sourceSkeleton);
  const sourceBounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => sourceWorld.get(jointName)));
  const sourceHeight = Math.max(sourceBounds?.size?.y || 0, 1e-5);
  const scale = THREE.MathUtils.clamp(
    CAPTURE_CHARACTER_TARGET_HEIGHT / sourceHeight,
    CAPTURE_CHARACTER_MIN_SCALE,
    CAPTURE_CHARACTER_MAX_SCALE
  );
  const center = sourceBounds
    ? new THREE.Vector3(
        (sourceBounds.min.x + sourceBounds.max.x) * 0.5,
        sourceBounds.min.y,
        (sourceBounds.min.z + sourceBounds.max.z) * 0.5
      )
    : new THREE.Vector3();
  const floorOffset = new THREE.Vector3(0, CAPTURE_CHARACTER_FLOOR_Y, 0);
  const points = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    const source = sourceWorld.get(jointName) || new THREE.Vector3();
    points[jointName] = source.clone().sub(center).multiplyScalar(scale).add(floorOffset);
  });

  return { points, scale };
}

function distanceBetweenPoints(points, aName, bName, fallback = 0.4) {
  const a = points[aName];
  const b = points[bName];
  if (!a || !b) return fallback;
  const distance = a.distanceTo(b);
  return Number.isFinite(distance) && distance > 1e-5 ? distance : fallback;
}

function capturePointArray(points, jointName) {
  return vectorToRoundedArray(points[jointName] || new THREE.Vector3());
}

function makeCaptureLabelPiece(points, name, parent = null) {
  return {
    name,
    geometry: { type: 'label', params: {} },
    position: capturePointArray(points, name),
    pivot: capturePointArray(points, name),
    ...(parent ? { parent } : {}),
  };
}

function makeCaptureBoxPiece(points, name, parent, size, color, offset = new THREE.Vector3()) {
  const pivot = points[name] || new THREE.Vector3();
  const position = pivot.clone().add(offset);
  return {
    name,
    geometry: {
      type: 'cube',
      params: {
        width: roundGeometryValue(size.x),
        height: roundGeometryValue(size.y),
        depth: roundGeometryValue(size.z),
      },
    },
    color,
    position: vectorToRoundedArray(position),
    pivot: vectorToRoundedArray(pivot),
    ...(parent ? { parent } : {}),
  };
}

function makeCaptureSegmentPiece(points, name, parent, childName, width, depth, color) {
  const start = points[name] || new THREE.Vector3();
  const end = points[childName] || null;
  const geometry = createCuboidGeometryBetween(start, end, width, depth);
  if (!geometry) {
    return makeCaptureLabelPiece(points, name, parent);
  }

  return {
    name,
    geometry,
    color,
    position: vectorToRoundedArray(start),
    pivot: vectorToRoundedArray(start),
    ...(parent ? { parent } : {}),
  };
}

function makeCaptureVisualSegmentPiece(points, name, parent, startName, endName, width, depth, color) {
  const start = points[startName] || new THREE.Vector3();
  const end = points[endName] || null;
  const geometry = createCuboidGeometryBetween(start, end, width, depth);
  if (!geometry) {
    return null;
  }

  return {
    name,
    geometry,
    color,
    position: vectorToRoundedArray(start),
    pivot: vectorToRoundedArray(start),
    ...(parent ? { parent } : {}),
  };
}

function captureCharacterGeometryScale() {
  return CAPTURE_CHARACTER_TARGET_HEIGHT / CAPTURE_CHARACTER_REFERENCE_HEIGHT;
}

function captureCharacterDimension(value) {
  return value * captureCharacterGeometryScale();
}

function captureCharacterSize(x, y, z) {
  const scale = captureCharacterGeometryScale();
  return new THREE.Vector3(x * scale, y * scale, z * scale);
}

function buildCaptureCharacterDefinition(sourceSkeleton, animationName) {
  const { points, scale } = getCaptureCharacterSpace(sourceSkeleton);
  const headHeight = Math.max(distanceBetweenPoints(points, 'NECK', 'HEAD', 0.75), 0.55);
  const pelvisSize = captureCharacterSize(1.0, 0.42, 0.6);
  const torsoWidth = captureCharacterDimension(0.9);
  const torsoDepth = captureCharacterDimension(0.5);
  const upperTorsoWidth = captureCharacterDimension(0.86);
  const upperTorsoDepth = captureCharacterDimension(0.46);
  const neckSize = captureCharacterDimension(0.34);
  const headSize = new THREE.Vector3(
    captureCharacterDimension(0.7),
    Math.max(headHeight * 0.82, captureCharacterDimension(0.8)),
    captureCharacterDimension(0.7)
  );
  const shoulderWidth = captureCharacterDimension(0.34);
  const shoulderDepth = captureCharacterDimension(0.32);
  const upperArmWidth = captureCharacterDimension(0.25);
  const forearmWidth = captureCharacterDimension(0.22);
  const upperLegWidth = captureCharacterDimension(0.35);
  const shinWidth = captureCharacterDimension(0.31);
  const safeName = sanitizeDebugFileStem(animationName || 'capture').replace(/-/g, '_');
  const bindings = getCaptureDefaultBindings(sourceSkeleton);

  const pieces = [
    makeCaptureBoxPiece(
      points,
      'PELVIS',
      null,
      pelvisSize,
      '#273856'
    ),
    makeCaptureVisualSegmentPiece(points, 'TORSO_CORE', 'PELVIS', 'PELVIS', 'CHEST', torsoWidth, torsoDepth, '#245f9f'),
    makeCaptureSegmentPiece(points, 'CHEST', 'PELVIS', 'NECK', upperTorsoWidth, upperTorsoDepth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'NECK', 'CHEST', 'HEAD', neckSize, neckSize, '#d8b08f'),
    makeCaptureBoxPiece(
      points,
      'HEAD',
      'NECK',
      headSize,
      '#d8b08f',
      new THREE.Vector3(0, headHeight * 0.15, 0)
    ),
    makeCaptureSegmentPiece(points, 'CLAVICLE_L', 'CHEST', 'ARM_L_UPPER', shoulderWidth, shoulderDepth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'ARM_L_UPPER', 'CLAVICLE_L', 'ARM_L_LOWER', upperArmWidth, upperArmWidth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'ARM_L_LOWER', 'ARM_L_UPPER', 'HAND_L', forearmWidth, forearmWidth, '#324258'),
    makeCaptureBoxPiece(points, 'HAND_L', 'ARM_L_LOWER', captureCharacterSize(0.26, 0.22, 0.28), '#d8b08f'),
    makeCaptureSegmentPiece(points, 'CLAVICLE_R', 'CHEST', 'ARM_R_UPPER', shoulderWidth, shoulderDepth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'ARM_R_UPPER', 'CLAVICLE_R', 'ARM_R_LOWER', upperArmWidth, upperArmWidth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'ARM_R_LOWER', 'ARM_R_UPPER', 'HAND_R', forearmWidth, forearmWidth, '#324258'),
    makeCaptureBoxPiece(points, 'HAND_R', 'ARM_R_LOWER', captureCharacterSize(0.26, 0.22, 0.28), '#d8b08f'),
    makeCaptureSegmentPiece(points, 'LEG_L_UPPER', 'PELVIS', 'LEG_L_LOWER', upperLegWidth, upperLegWidth, '#273856'),
    makeCaptureSegmentPiece(points, 'LEG_L_LOWER', 'LEG_L_UPPER', 'FOOT_L', shinWidth, shinWidth, '#1f2d44'),
    makeCaptureBoxPiece(points, 'FOOT_L', 'LEG_L_LOWER', captureCharacterSize(0.32, 0.22, 0.54), '#101820'),
    makeCaptureSegmentPiece(points, 'LEG_R_UPPER', 'PELVIS', 'LEG_R_LOWER', upperLegWidth, upperLegWidth, '#273856'),
    makeCaptureSegmentPiece(points, 'LEG_R_LOWER', 'LEG_R_UPPER', 'FOOT_R', shinWidth, shinWidth, '#1f2d44'),
    makeCaptureBoxPiece(points, 'FOOT_R', 'LEG_R_LOWER', captureCharacterSize(0.32, 0.22, 0.54), '#101820'),
  ].filter(Boolean);

  return {
    id: `motion_ripper_capture_${safeName}`,
    name: `${animationName || 'Capture'} Character`,
    assetRole: 'playable',
    pieces,
    _captureRigScale: scale,
    _archetypeMeta: {
      archetype: 'HUMANOID',
      skeletonId: HUMANOID_CAPTURE_SKELETON_ID,
      animationProfile: null,
      slotMap: bindings,
    },
  };
}

function getCaptureCharacterSpawnPosition(referenceGroup = null) {
  const position = new THREE.Vector3();
  if (referenceGroup?.isObject3D) {
    referenceGroup.getWorldPosition(position);
    state.userObjects?.worldToLocal?.(position);
    position.x += 6;
    return position;
  }

  const existingCount = state.userObjects?.children?.length || 0;
  return new THREE.Vector3(existingCount * 6, 0, 0);
}

function buildCaptureCharacterGroup(sourceSkeleton, animationName, referenceGroup = null) {
  const def = buildCaptureCharacterDefinition(sourceSkeleton, animationName);
  const group = buildGroupFromDefinition(def, { compileAnimations: false });
  const bindings = getCaptureDefaultBindings(sourceSkeleton);
  group.name = def.name;
  group.userData.name = def.name;
  group.userData.templateId = def.id;
  group.userData.archetype = 'HUMANOID';
  group.userData.slotMap = cloneJsonValue(bindings);
  group.userData.slotBindings = cloneJsonValue(bindings);
  group.userData.animationProfile = null;
  group.userData.skeletonId = HUMANOID_CAPTURE_SKELETON_ID;
  group.userData.humanoidRigMode = 'capture-generated';
  group.userData.motionRipperGenerated = {
    generatedFrom: 'motion-ripper-video',
    sourceSkeletonId: sourceSkeleton?.id || HUMANOID_CAPTURE_SKELETON_ID,
    captureRigScale: roundSkeletonValue(def._captureRigScale || 1),
  };
  group.position.copy(getCaptureCharacterSpawnPosition(referenceGroup));
  group.updateMatrixWorld(true);
  return group;
}

function isLateralRunnerCapture() {
  const facingMode = getCaptureFacingMode();
  return facingMode === 'left' || facingMode === 'right';
}

function getLateralRunnerLimitKey(targetName) {
  if (targetName === 'CHEST' || targetName === 'NECK' || targetName === 'HEAD') return targetName;
  if (targetName === 'CLAVICLE_L' || targetName === 'CLAVICLE_R') return 'CLAVICLE';
  if (targetName === 'ARM_L_UPPER' || targetName === 'ARM_R_UPPER') return 'ARM_UPPER';
  if (targetName === 'ARM_L_LOWER' || targetName === 'ARM_R_LOWER') return 'ARM_LOWER';
  if (targetName === 'HAND_L' || targetName === 'HAND_R') return 'HAND';
  if (targetName === 'LEG_L_UPPER' || targetName === 'LEG_R_UPPER') return 'LEG_UPPER';
  if (targetName === 'LEG_L_LOWER' || targetName === 'LEG_R_LOWER') return 'LEG_LOWER';
  if (targetName === 'FOOT_L' || targetName === 'FOOT_R') return 'FOOT';
  return null;
}

function normalizeAngleForConstraint(angle) {
  return Math.atan2(Math.sin(angle || 0), Math.cos(angle || 0));
}

function clampAngleToRange(angle, range) {
  const normalized = normalizeAngleForConstraint(angle);
  if (!Array.isArray(range) || range.length !== 2) return normalized;
  return THREE.MathUtils.clamp(normalized, range[0], range[1]);
}

function constrainEulerValue(value, limits) {
  const source = Array.isArray(value) ? value : [0, 0, 0];
  return [0, 1, 2].map((axis) => clampAngleToRange(source[axis] || 0, limits?.[axis]));
}

function smoothConstrainedRotationKeyframes(keyframes) {
  let previous = null;
  return (keyframes || []).map((keyframe) => {
    let value = Array.isArray(keyframe.value) ? [...keyframe.value] : [0, 0, 0];
    if (previous) {
      value = value.map((axisValue, axis) => {
        const unwrapped = unwrapEulerAngle(axisValue, previous[axis]);
        const maxStep = LATERAL_RUNNER_MAX_ROTATION_STEP;
        const stepped = THREE.MathUtils.clamp(unwrapped, previous[axis] - maxStep, previous[axis] + maxStep);
        return previous[axis] + ((stepped - previous[axis]) * (1 - LATERAL_RUNNER_ROTATION_SMOOTHING));
      });
    }
    previous = value;
    return {
      ...keyframe,
      value,
    };
  });
}

function applyLateralRunnerRotationLimits(animDef) {
  return {
    ...animDef,
    tracks: (animDef.tracks || []).map((track) => {
      if (track?.property !== 'rotation') {
        return {
          ...track,
          keyframes: (track.keyframes || []).map((keyframe) => ({
            ...keyframe,
            value: Array.isArray(keyframe.value) ? [...keyframe.value] : keyframe.value,
          })),
        };
      }

      const limitKey = getLateralRunnerLimitKey(track.target);
      const limits = limitKey ? LATERAL_RUNNER_ROTATION_LIMITS[limitKey] : null;
      const keyframes = (track.keyframes || []).map((keyframe) => ({
        ...keyframe,
        value: limits
          ? constrainEulerValue(keyframe.value, limits)
          : (Array.isArray(keyframe.value) ? [...keyframe.value] : keyframe.value),
      }));

      return {
        ...track,
        interpolation: track.interpolation === 'step' ? track.interpolation : 'linear',
        keyframes: limits ? smoothConstrainedRotationKeyframes(keyframes) : keyframes,
      };
    }),
  };
}

function applyLateralRunnerRootMotionLimits(animDef) {
  const rootTrack = (getTrackByTargetAndProperty(animDef, 'PELVIS', 'position') || getTrackByTargetAndProperty(animDef, 'ROOT', 'position'));
  const sourceKeyframes = rootTrack?.keyframes || [];
  if (!rootTrack || sourceKeyframes.length < 2) return animDef;

  const height = getSourceSkeletonHeight(animDef.sourceSkeleton);
  const rest = Array.isArray(sourceKeyframes[0]?.value) ? sourceKeyframes[0].value : [0, 0, 0];
  const maxVertical = Math.max(height * LATERAL_RUNNER_ROOT_VERTICAL_RATIO, 0.025);
  const maxDepth = Math.max(height * LATERAL_RUNNER_ROOT_DEPTH_RATIO, 0.02);
  const maxStep = Math.max(height * LATERAL_RUNNER_ROOT_MAX_STEP_RATIO, 0.012);
  let previous = [...rest];

  const keyframes = sourceKeyframes.map((keyframe, index) => {
    const source = Array.isArray(keyframe.value) ? keyframe.value : rest;
    if (index === 0) {
      previous = [source[0] || 0, rest[1] || 0, rest[2] || 0];
      return {
        ...keyframe,
        value: [...previous],
      };
    }

    const clampedY = (rest[1] || 0) + THREE.MathUtils.clamp((source[1] || 0) - (rest[1] || 0), -maxVertical, maxVertical);
    const clampedZ = (rest[2] || 0) + THREE.MathUtils.clamp((source[2] || 0) - (rest[2] || 0), -maxDepth, maxDepth);
    const limitedY = previous[1] + THREE.MathUtils.clamp(clampedY - previous[1], -maxStep, maxStep);
    const limitedZ = previous[2] + THREE.MathUtils.clamp(clampedZ - previous[2], -maxStep, maxStep);
    previous = [
      source[0] || 0,
      previous[1] + ((limitedY - previous[1]) * (1 - LATERAL_RUNNER_ROOT_SMOOTHING)),
      previous[2] + ((limitedZ - previous[2]) * (1 - LATERAL_RUNNER_ROOT_SMOOTHING)),
    ];

    return {
      ...keyframe,
      value: [...previous],
    };
  });

  return {
    ...animDef,
    tracks: (animDef.tracks || []).map((track) => (
      track === rootTrack
        ? { ...track, keyframes }
        : track
    )),
  };
}

function getTrackValueAtIndex(track, index, fallback) {
  const keyframe = track?.keyframes?.[index];
  if (Array.isArray(keyframe?.value)) return [...keyframe.value];
  return Array.isArray(fallback) ? [...fallback] : fallback;
}

function getTrackByTargetAndProperty(animDef, target, property) {
  return (animDef?.tracks || []).find((track) => track?.target === target && track?.property === property) || null;
}

function getBoneDefinitionMap(sourceSkeleton) {
  return new Map((sourceSkeleton?.bones || []).map((bone) => [bone.name, bone]));
}

function getSourceSkeletonHeight(sourceSkeleton) {
  const world = buildSkeletonWorldPositionMap(sourceSkeleton);
  const bounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => world.get(jointName)));
  return Math.max(bounds?.size?.y || 1, 1);
}

function computeAnimationBoneWorldPose(animDef, frameIndex) {
  const sourceSkeleton = animDef?.sourceSkeleton;
  const boneDefs = getBoneDefinitionMap(sourceSkeleton);
  const rootTrack = (getTrackByTargetAndProperty(animDef, 'PELVIS', 'position') || getTrackByTargetAndProperty(animDef, 'ROOT', 'position'));
  const rotationTracks = new Map(
    (animDef?.tracks || [])
      .filter((track) => track?.property === 'rotation')
      .map((track) => [track.target, track])
  );
  const worldPose = new Map();

  function resolve(boneName) {
    if (worldPose.has(boneName)) return worldPose.get(boneName);
    const boneDef = boneDefs.get(boneName);
    if (!boneDef) return null;

    const parentName = boneDef.parent || getCaptureSkeletonParentName(boneName);
    const localPosition = (boneName === 'PELVIS' && rootTrack)
      ? new THREE.Vector3(...getTrackValueAtIndex(rootTrack, frameIndex, boneDef.position || [0, 0, 0]))
      : new THREE.Vector3(...(boneDef.position || [0, 0, 0]));
    const rotationValue = getTrackValueAtIndex(rotationTracks.get(boneName), frameIndex, [0, 0, 0]);
    const localRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      rotationValue[0] || 0,
      rotationValue[1] || 0,
      rotationValue[2] || 0,
      'XYZ'
    ));

    let position = localPosition.clone();
    let quaternion = localRotation.clone();
    if (parentName) {
      const parentPose = resolve(parentName);
      if (parentPose) {
        position = parentPose.position.clone().add(localPosition.clone().applyQuaternion(parentPose.quaternion));
        quaternion = parentPose.quaternion.clone().multiply(localRotation).normalize();
      }
    }

    const pose = { position, quaternion };
    worldPose.set(boneName, pose);
    return pose;
  }

  CAPTURE_JOINTS.forEach((boneName) => resolve(boneName));
  return worldPose;
}

function chooseFootLockCandidate(samples, index, groundY, threshold) {
  const sample = samples[index];
  if (!sample) return null;
  const candidates = ['FOOT_L', 'FOOT_R']
    .map((footName) => {
      const position = sample[footName];
      if (!position) return null;
      const groundDistance = position.y - groundY;
      if (groundDistance > threshold) return null;
      const previous = samples[Math.max(0, index - 1)]?.[footName];
      const next = samples[Math.min(samples.length - 1, index + 1)]?.[footName];
      const verticalMotion = previous && next ? Math.abs(next.y - previous.y) : 0;
      return {
        footName,
        position,
        score: groundDistance + (verticalMotion * 0.75),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
  return candidates[0] || null;
}

function applyLateralRunnerFootLock(animDef) {
  const rootTrack = (getTrackByTargetAndProperty(animDef, 'PELVIS', 'position') || getTrackByTargetAndProperty(animDef, 'ROOT', 'position'));
  if (!rootTrack || !animDef?.sourceSkeleton?.bones?.length || (rootTrack.keyframes || []).length < 3) {
    return animDef;
  }

  const height = getSourceSkeletonHeight(animDef.sourceSkeleton);
  const samples = (rootTrack.keyframes || []).map((_, index) => {
    const pose = computeAnimationBoneWorldPose(animDef, index);
    return {
      FOOT_L: pose.get('FOOT_L')?.position?.clone?.() || null,
      FOOT_R: pose.get('FOOT_R')?.position?.clone?.() || null,
    };
  });
  const footPositions = samples.flatMap((sample) => [sample.FOOT_L, sample.FOOT_R]).filter(Boolean);
  if (footPositions.length < 4) return animDef;

  const groundY = footPositions.reduce((min, position) => Math.min(min, position.y), Infinity);
  if (!Number.isFinite(groundY)) return animDef;

  const contactThreshold = Math.max(height * 0.035, 0.045);
  let activeFoot = null;
  let lockPoint = null;
  const runningOffset = new THREE.Vector3();

  const keyframes = rootTrack.keyframes.map((keyframe, index) => {
    const candidate = chooseFootLockCandidate(samples, index, groundY, contactThreshold);
    let targetOffset = new THREE.Vector3();
    let blend = LATERAL_RUNNER_FOOT_RELEASE_BLEND;

    if (candidate) {
      if (activeFoot !== candidate.footName || !lockPoint) {
        activeFoot = candidate.footName;
        lockPoint = candidate.position.clone().add(runningOffset);
      }
      targetOffset = lockPoint.clone().sub(candidate.position);
      targetOffset.y = THREE.MathUtils.clamp(targetOffset.y, -height * 0.025, height * 0.05);
      blend = LATERAL_RUNNER_FOOT_LOCK_BLEND;
    } else {
      activeFoot = null;
      lockPoint = null;
    }

    runningOffset.lerp(targetOffset, blend);
    const source = Array.isArray(keyframe.value) ? keyframe.value : [0, 0, 0];
    return {
      ...keyframe,
      value: [
        (source[0] || 0) + runningOffset.x,
        (source[1] || 0) + runningOffset.y,
        (source[2] || 0) + runningOffset.z,
      ],
    };
  });

  return {
    ...animDef,
    tracks: (animDef.tracks || []).map((track) => (
      track === rootTrack
        ? { ...track, keyframes }
        : track
    )),
  };
}

function applyCaptureAnimationConstraints(animDef, frames, captureTrackOptions = null) {
  if (!animDef || !isLateralRunnerCapture()) {
    return animDef;
  }

  const constrainedRotations = applyLateralRunnerRotationLimits(animDef);
  const constrainedRootMotion = applyLateralRunnerRootMotionLimits(constrainedRotations);
  const constrainedMotion = applyLateralRunnerFootLock(constrainedRootMotion);
  return {
    ...constrainedMotion,
    constraints: {
      ...(constrainedMotion.constraints || {}),
      profile: 'lateral-runner',
      captureFacing: getCaptureFacingMode(),
      footLock: true,
      rotationLimits: true,
      rootMotionLimits: true,
      suppressedCaptureJoints: Array.from(captureTrackOptions?.suppressedCaptureJoints || []),
      frameCount: Array.isArray(frames) ? frames.length : 0,
    },
  };
}

function unwrapEulerAngle(angle, previousAngle) {
  if (!Number.isFinite(previousAngle)) return angle;

  let unwrapped = angle;
  while ((unwrapped - previousAngle) > Math.PI) {
    unwrapped -= Math.PI * 2;
  }
  while ((unwrapped - previousAngle) < -Math.PI) {
    unwrapped += Math.PI * 2;
  }
  return unwrapped;
}

function buildNormalizedRotationKeyframes(frames, jointName, restQuaternion) {
  const inverseRestQuaternion = restQuaternion.clone().invert();
  let previousEuler = null;

  return frames.map((frame) => {
    const currentQuaternion = getPoseQuaternion(frame, jointName);
    const deltaQuaternion = inverseRestQuaternion.clone().multiply(currentQuaternion).normalize();
    const euler = new THREE.Euler().setFromQuaternion(deltaQuaternion, 'XYZ');

    const value = previousEuler
      ? [
          unwrapEulerAngle(euler.x, previousEuler[0]),
          unwrapEulerAngle(euler.y, previousEuler[1]),
          unwrapEulerAngle(euler.z, previousEuler[2]),
        ]
      : [euler.x, euler.y, euler.z];

    previousEuler = value;
    return {
      time: frame.time,
      value,
    };
  });
}

function pickPelvisPosition(pose) {
  const rootPos = pose?.ROOT?.position;
  const rootIsNonZero = Array.isArray(rootPos) && rootPos.some((value) => Number.isFinite(value) && Math.abs(value) > 1e-6);
  if (rootIsNonZero) return rootPos;
  const pelvisPos = pose?.PELVIS?.position;
  if (Array.isArray(pelvisPos)) return pelvisPos;
  return Array.isArray(rootPos) ? rootPos : null;
}

function shouldEmitCapturedJointTrack(frames, jointName) {
  const threshold = JOINT_CONFIDENCE_THRESHOLDS[jointName] ?? 0.45;
  return frames.some((frame) => getPoseConfidenceValue(frame, jointName) >= threshold);
}

function getCanonicalCapturedFrames() {
  const uniqueFrames = new Map();
  recordedFrames.forEach((frame) => {
    uniqueFrames.set(frame.time.toFixed(1), {
      time: roundTime(frame.time),
      pose: frame.pose,
      capturedRig: frame.capturedRig || null,
      landmarks: cloneFrameLandmarkData(frame),
    });
  });
  return Array.from(uniqueFrames.values()).sort((a, b) => a.time - b.time);
}

function buildCanonicalAnimationDefinition(frames = getCanonicalCapturedFrames(), captureTrackOptions = resolveCaptureTrackOptions(frames)) {
  const name = ensureAnimationName();
  const duration = frames[frames.length - 1]?.time || 0.1;
  const tracks = [];
  const restPose = computeCaptureRestPose(frames);
  const sourceSkeleton = buildCapturedSkeletonDefinition(frames);
  const suppressedCaptureJoints = captureTrackOptions?.suppressedCaptureJoints || new Set();

  const rotationTargets = CAPTURE_JOINTS;
  rotationTargets.forEach((jointName) => {
    if (suppressedCaptureJoints.has(jointName)) {
      return;
    }
    if (!shouldEmitCapturedJointTrack(frames, jointName)) {
      return;
    }
    tracks.push({
      target: jointName,
      property: 'rotation',
      rotationSpace: 'rest-delta',
      interpolation: 'linear',
      keyframes: buildNormalizedRotationKeyframes(frames, jointName, restPose[jointName] || new THREE.Quaternion()),
    });
  });

  tracks.push({
    target: 'PELVIS',
    property: 'position',
    interpolation: 'linear',
    keyframes: frames.map((frame) => ({
      time: frame.time,
      value: pickPelvisPosition(frame.pose) || [0, 0, 0],
    })),
  });

  const animation = {
    name,
    duration,
    loop: true,
    source: 'motion-ripper',
    sourceSkeletonId: HUMANOID_CAPTURE_SKELETON_ID,
    sourceSkeleton,
    tracks,
  };

  return applyCaptureAnimationConstraints(animation, frames, captureTrackOptions);
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
  const sourceSkeleton = buildCapturedSkeletonDefinition(canonicalFrames, captureTrackOptions);
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

function retimeAnimationDefinition(animDef, speedMultiplier = 1) {
  const clampedSpeed = Number.isFinite(speedMultiplier) && speedMultiplier > 0 ? speedMultiplier : 1;
  if (!animDef || Math.abs(clampedSpeed - 1) < 1e-6) {
    return animDef;
  }

  return {
    ...animDef,
    duration: (animDef.duration || 0) / clampedSpeed,
    tracks: (animDef.tracks || []).map((track) => ({
      ...track,
      keyframes: (track.keyframes || []).map((keyframe) => ({
        ...keyframe,
        time: keyframe.time / clampedSpeed,
        value: Array.isArray(keyframe?.value) ? [...keyframe.value] : keyframe?.value,
      })),
    })),
  };
}

function applyFacingYawToRootDelta(delta, group) {
  const captureFacingYaw = getCaptureFacingYaw();
  const targetFacingYaw = Number.isFinite(group?.userData?.defaultFacingYaw)
    ? group.userData.defaultFacingYaw
    : (Number.isFinite(group?.rotation?.y) ? group.rotation.y : 0);
  const facingYaw = captureFacingYaw + targetFacingYaw;

  if (Math.abs(facingYaw) < 1e-6) {
    return delta;
  }

  return delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), facingYaw);
}

function rotationTrackValueToQuaternion(value) {
  if (Array.isArray(value) && value.length >= 4) {
    return new THREE.Quaternion(
      value[0] ?? 0,
      value[1] ?? 0,
      value[2] ?? 0,
      value[3] ?? 1
    ).normalize();
  }
  if (Array.isArray(value) && value.length >= 3) {
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(
      value[0] ?? 0,
      value[1] ?? 0,
      value[2] ?? 0,
      'XYZ'
    )).normalize();
  }
  return new THREE.Quaternion();
}

function quaternionToRotationTrackValue(quaternion, previousValue = null) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  const value = [euler.x, euler.y, euler.z];
  if (!Array.isArray(previousValue)) return value;
  return value.map((axisValue, axis) => unwrapEulerAngle(axisValue, previousValue[axis]));
}

function getTargetRestQuaternion(group, targetName, targetNode) {
  const restSnapshot = group?.userData?.animModeRestPoseSnapshot;
  const restTransform = restSnapshot instanceof Map ? restSnapshot.get(targetName) : null;
  const quaternion = restTransform?.quaternion?.clone?.()
    || targetNode?.quaternion?.clone?.()
    || new THREE.Quaternion();
  return quaternion.normalize();
}

function shouldUseIdentityRotationReference(track, animDef) {
  const firstValue = track?.keyframes?.[0]?.value;
  return track?.rotationSpace === 'rest-delta'
    || (
      animDef?.source === 'motion-ripper'
      && Array.isArray(firstValue)
      && firstValue.length <= 3
    );
}

function retargetRotationTrackForTarget(track, targetName, restQuaternion, options = {}) {
  const sourceKeyframes = track.keyframes || [];
  if (sourceKeyframes.length === 0) return null;

  const referenceQuaternion = options.useIdentityReference
    ? new THREE.Quaternion()
    : rotationTrackValueToQuaternion(sourceKeyframes[0]?.value);
  const inverseReferenceQuaternion = referenceQuaternion.clone().invert();
  let previousValue = null;

  return {
    ...track,
    target: targetName,
    property: 'rotation',
    keyframes: sourceKeyframes.map((keyframe) => {
      const sourceQuaternion = rotationTrackValueToQuaternion(keyframe.value);
      const deltaQuaternion = sourceQuaternion.multiply(inverseReferenceQuaternion).normalize();
      const retargetedQuaternion = restQuaternion.clone().multiply(deltaQuaternion).normalize();
      const value = quaternionToRotationTrackValue(retargetedQuaternion, previousValue);
      previousValue = value;
      return {
        ...keyframe,
        value,
      };
    }),
  };
}

function translateTrackForTarget(track, group, targetName, options = {}) {
  if (!targetName) return null;

  const keyframes = (track.keyframes || []).map((keyframe) => ({
    ...keyframe,
    value: Array.isArray(keyframe?.value) ? [...keyframe.value] : keyframe?.value,
  }));

  if (track.property === 'rotation') {
    const targetNode = findTargetNodeByName(group, targetName);
    if (!targetNode) return null;
    return retargetRotationTrackForTarget(
      { ...track, keyframes },
      targetName,
      getTargetRestQuaternion(group, targetName, targetNode),
      { useIdentityReference: !!options.useIdentityRotationReference }
    );
  }

  if (track.property !== 'position') {
    return {
      ...track,
      target: targetName,
      keyframes,
    };
  }

  if (!options.isRootTrack) {
    return null;
  }

  const targetNode = findTargetNodeByName(group, targetName);
  if (!targetNode) return null;

  const rest = keyframes[0]?.value || [0, 0, 0];
  const base = targetNode.position;
  const applyFacingYaw = !!options.applyFacingYaw;
  const rootMotionScale = Number.isFinite(options.rootMotionScale) ? options.rootMotionScale : 1;
  return {
    ...track,
    target: targetName,
    keyframes: keyframes.map((keyframe) => ({
      ...keyframe,
      value: (() => {
        const delta = new THREE.Vector3(
          (keyframe.value?.[0] ?? 0) - (rest[0] ?? 0),
          (keyframe.value?.[1] ?? 0) - (rest[1] ?? 0),
          (keyframe.value?.[2] ?? 0) - (rest[2] ?? 0)
        ).multiplyScalar(rootMotionScale);
        const translatedDelta = applyFacingYaw ? applyFacingYawToRootDelta(delta, group) : delta;
        return [
          base.x + translatedDelta.x,
          base.y + translatedDelta.y,
          base.z + translatedDelta.z,
        ];
      })(),
    })),
  };
}

function translateCapturedAnimationForGroup(animDef, group, targetConfig = resolveCaptureTargetConfig(group)) {
  const tracks = [];
  const targetVectors = getGroupTargetVectors(group, targetConfig);
  const rootMotionScale = animDef?.sourceSkeleton
    ? resolveCaptureRigFit(animDef.sourceSkeleton, targetVectors).scale
    : 1;

  for (const track of animDef?.tracks || []) {
    if (!track) continue;

    let targetName = null;
    const isRootMotionTrack = (track.target === 'PELVIS' || track.target === 'ROOT') && track.property === 'position';

    if (isRootMotionTrack) {
      targetName = targetConfig.rootMotionTargetName;
    } else if (track.target === 'ROOT') {
      continue;
    } else if (targetConfig.suppressedBones.has(track.target)) {
      continue;
    } else {
      targetName = targetConfig.animationTargets[track.target];
    }

    const translatedTrack = translateTrackForTarget(track, group, targetName, {
      applyFacingYaw: isRootMotionTrack,
      isRootTrack: isRootMotionTrack,
      useIdentityRotationReference: shouldUseIdentityRotationReference(track, animDef),
      rootMotionScale: isRootMotionTrack ? rootMotionScale : 1,
    });
    if (translatedTrack) {
      tracks.push(translatedTrack);
    }
  }

  if (tracks.length === 0) return null;

  return {
    ...animDef,
    tracks,
    name: animDef.name,
    duration: animDef.duration,
    loop: animDef.loop,
    source: animDef.source,
    sourceSkeletonId: animDef.sourceSkeletonId,
    sourceAuthor: 'ilatroce',
  };
}

function buildSkeletonWorldPositionMap(skeleton) {
  const bones = new Map((skeleton?.bones || []).map((bone) => [bone.name, bone]));
  const result = new Map();

  function resolve(name) {
    if (result.has(name)) return result.get(name).clone();
    const bone = bones.get(name);
    if (!bone) return null;

    const position = new THREE.Vector3(...(bone.position || [0, 0, 0]));
    if (bone.parent) {
      const parent = resolve(bone.parent);
      if (parent) position.add(parent);
    }
    result.set(name, position.clone());
    return position;
  }

  (skeleton?.bones || []).forEach((bone) => resolve(bone.name));
  return result;
}

function getVectorBounds(vectors) {
  const valid = vectors.filter((vector) => vector && Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z));
  if (valid.length === 0) return null;
  const min = valid[0].clone();
  const max = valid[0].clone();
  valid.forEach((vector) => {
    min.min(vector);
    max.max(vector);
  });
  return { min, max, size: max.clone().sub(min) };
}

function resolveCaptureRigFit(sourceSkeleton, targetVectorsByJoint) {
  const sourceWorldByJoint = buildSkeletonWorldPositionMap(sourceSkeleton);
  const sourcePelvis = sourceWorldByJoint.get('PELVIS') || new THREE.Vector3();
  const targetPelvis = targetVectorsByJoint.PELVIS || targetVectorsByJoint.CHEST || new THREE.Vector3();
  const joints = CAPTURE_JOINTS.filter((jointName) => sourceWorldByJoint.has(jointName) && targetVectorsByJoint[jointName]);
  const sourceBounds = getVectorBounds(joints.map((jointName) => sourceWorldByJoint.get(jointName)));
  const targetBounds = getVectorBounds(joints.map((jointName) => targetVectorsByJoint[jointName]));
  const sourceHeight = sourceBounds?.size?.y || 0;
  const targetHeight = targetBounds?.size?.y || 0;
  const scale = sourceHeight > 1e-6 && targetHeight > 1e-6 ? targetHeight / sourceHeight : 1;
  const fitted = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    const source = sourceWorldByJoint.get(jointName);
    if (!source) return;
    fitted[jointName] = source.clone().sub(sourcePelvis).multiplyScalar(scale).add(targetPelvis);
  });

  return { fitted, scale };
}

function toVector3FromArray(value) {
  return Array.isArray(value) && value.length === 3
    ? new THREE.Vector3(value[0] || 0, value[1] || 0, value[2] || 0)
    : null;
}

function getSerializedPieceVector(piece) {
  return toVector3FromArray(piece?.pivot) || toVector3FromArray(piece?.position);
}

function buildSerializedTargetVectors(serializedGroup, targetConfig) {
  const piecesByName = new Map((serializedGroup?.pieces || []).map((piece) => [piece.name, piece]));
  const vectors = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    const targetName = targetConfig?.animationTargets?.[jointName];
    const piece = targetName ? piecesByName.get(targetName) : null;
    const vector = getSerializedPieceVector(piece);
    if (vector) vectors[jointName] = vector;
  });

  return vectors;
}

function getCaptureDisplayPosition(jointName, piece, fittedPositions) {
  const own = fittedPositions[jointName];
  if (!own) return null;

  if (jointName === 'HEAD') {
    return own.clone();
  }

  const childName = CAPTURE_SEGMENT_CHILDREN[jointName];
  const child = childName ? fittedPositions[childName] : null;
  if (child && piece?.geometry?.type !== 'label') {
    return own.clone().lerp(child, 0.5);
  }

  const oldPosition = toVector3FromArray(piece?.position);
  const oldPivot = toVector3FromArray(piece?.pivot);
  if (oldPosition && oldPivot && piece?.geometry?.type !== 'label') {
    return own.clone().add(oldPosition.sub(oldPivot));
  }

  return own.clone();
}

function getCapturePivotPosition(jointName, fittedPositions) {
  if (jointName === 'HEAD') {
    return fittedPositions.NECK || fittedPositions.HEAD || null;
  }
  return fittedPositions[jointName] || null;
}

function applyCapturedSkeletonToSerializedGroup(serializedGroup, sourceSkeleton, targetConfig) {
  if (!serializedGroup || !Array.isArray(serializedGroup.pieces) || !sourceSkeleton?.bones?.length) {
    return false;
  }

  const piecesByName = new Map(serializedGroup.pieces.map((piece) => [piece.name, piece]));
  const targetVectors = buildSerializedTargetVectors(serializedGroup, targetConfig);
  const { fitted, scale } = resolveCaptureRigFit(sourceSkeleton, targetVectors);
  let changed = false;

  CAPTURE_JOINTS.forEach((jointName) => {
    const targetName = targetConfig?.animationTargets?.[jointName];
    const piece = targetName ? piecesByName.get(targetName) : null;
    if (!piece) return;

    const pivot = getCapturePivotPosition(jointName, fitted);
    const position = getCaptureDisplayPosition(jointName, piece, fitted);
    if (!pivot || !position) return;

    piece.pivot = vectorToRoundedArray(pivot);
    piece.position = vectorToRoundedArray(position);
    changed = true;
  });

  if (changed) {
    serializedGroup.skeletonId = sourceSkeleton.id || HUMANOID_CAPTURE_SKELETON_ID;
    serializedGroup.animationProfile = null;
    if (sourceSkeleton.defaultBindings && typeof sourceSkeleton.defaultBindings === 'object') {
      serializedGroup.slotBindings = cloneJsonValue(sourceSkeleton.defaultBindings);
    }
    serializedGroup.captureRigApplied = {
      sourceSkeletonId: sourceSkeleton.id || HUMANOID_CAPTURE_SKELETON_ID,
      scale: roundSkeletonValue(scale),
    };
  }
  return changed;
}

function getGroupTargetVectors(group, targetConfig) {
  if (!group?.isGroup) return {};
  group.updateWorldMatrix(true, true);
  const vectors = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    const targetName = targetConfig?.animationTargets?.[jointName];
    const node = targetName ? findTargetNodeByName(group, targetName) : null;
    if (!node) return;

    const position = new THREE.Vector3();
    node.getWorldPosition(position);
    group.worldToLocal(position);
    vectors[jointName] = position;
  });

  return vectors;
}

function setNodeRootPosition(group, node, rootPosition) {
  if (!group || !node || !rootPosition) return;
  group.updateWorldMatrix(true, true);
  const worldPosition = group.localToWorld(rootPosition.clone());
  const localPosition = node.parent
    ? node.parent.worldToLocal(worldPosition)
    : worldPosition;
  node.position.copy(localPosition);
}

function setPivotMeshDisplayPosition(group, node, rootPosition) {
  const mesh = node?.children?.find((child) => child?.isMesh);
  if (!group || !node || !mesh || !rootPosition) return;
  group.updateWorldMatrix(true, true);
  node.updateWorldMatrix(true, false);
  const worldPosition = group.localToWorld(rootPosition.clone());
  mesh.position.copy(node.worldToLocal(worldPosition));
}

function applyCapturedSkeletonToGroup(group, sourceSkeleton, targetConfig) {
  if (!group?.isGroup || !sourceSkeleton?.bones?.length) return false;

  const targetVectors = getGroupTargetVectors(group, targetConfig);
  const { fitted, scale } = resolveCaptureRigFit(sourceSkeleton, targetVectors);
  let changed = false;

  CAPTURE_JOINTS.forEach((jointName) => {
    const targetName = targetConfig?.animationTargets?.[jointName];
    const node = targetName ? findTargetNodeByName(group, targetName) : null;
    if (!node) return;

    const pivot = getCapturePivotPosition(jointName, fitted);
    const position = getCaptureDisplayPosition(jointName, {
      geometry: { type: node.userData?.geometryType || 'label' },
      position: vectorToArray(node.position),
      pivot: vectorToArray(node.position),
    }, fitted);
    if (!pivot) return;

    setNodeRootPosition(group, node, pivot);
    if (position) setPivotMeshDisplayPosition(group, node, position);
    changed = true;
  });

  if (changed) {
    group.userData.skeletonId = sourceSkeleton.id || HUMANOID_CAPTURE_SKELETON_ID;
    group.userData.animationProfile = null;
    if (sourceSkeleton.defaultBindings && typeof sourceSkeleton.defaultBindings === 'object') {
      group.userData.slotBindings = cloneJsonValue(sourceSkeleton.defaultBindings);
    }
    group.userData.captureRigApplied = {
      sourceSkeletonId: sourceSkeleton.id || HUMANOID_CAPTURE_SKELETON_ID,
      scale: roundSkeletonValue(scale),
    };
    group.updateMatrixWorld(true);
  }
  return changed;
}

function toWorldVector(landmark, depthScale = 1) {
  if (!landmark) return null;
  const z = Number.isFinite(landmark.z) ? landmark.z : 0;
  return new THREE.Vector3(landmark.x, -landmark.y, -z * depthScale);
}

function midpointVector(a, b) {
  if (!a || !b) return null;
  return a.clone().add(b).multiplyScalar(0.5);
}

function averagePointVector(points) {
  const sum = new THREE.Vector3();
  let count = 0;
  points.forEach((point) => {
    if (!point) return;
    sum.add(point);
    count += 1;
  });
  if (count === 0) return null;
  return sum.multiplyScalar(1 / count);
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

function buildCapturedPreviewRigFromLandmarks(landmarks, rootPosition = new THREE.Vector3()) {
  if (!Array.isArray(landmarks) || landmarks.length === 0) return null;

  const points = landmarks.map((landmark) => {
    if (!isReliableLandmark(landmark)) return null;
    return toWorldVector(landmark, CAPTURED_RIG_DEPTH_SCALE);
  });

  const hipsCenter = midpointVector(points[LM.LEFT_HIP], points[LM.RIGHT_HIP]);
  const shouldersCenter = midpointVector(points[LM.LEFT_SHOULDER], points[LM.RIGHT_SHOULDER]);
  if (!hipsCenter || !shouldersCenter) return null;

  const headPoint = averagePointVector([
    points[LM.NOSE],
    midpointVector(points[LM.LEFT_EAR], points[LM.RIGHT_EAR]),
    shouldersCenter.clone().add(new THREE.Vector3(0, 0.32, 0)),
  ]);
  const chestPoint = hipsCenter.clone().lerp(shouldersCenter, 0.72);
  const neckPoint = headPoint
    ? shouldersCenter.clone().lerp(headPoint, 0.35)
    : shouldersCenter.clone().add(new THREE.Vector3(0, 0.12, 0));
  const leftClaviclePoint = buildPreviewClaviclePoint(chestPoint, points[LM.LEFT_SHOULDER]);
  const rightClaviclePoint = buildPreviewClaviclePoint(chestPoint, points[LM.RIGHT_SHOULDER]);

  const leftFootPoint = averagePointVector([
    points[LM.LEFT_ANKLE],
    points[LM.LEFT_HEEL],
    points[LM.LEFT_FOOT_INDEX],
  ]);
  const rightFootPoint = averagePointVector([
    points[LM.RIGHT_ANKLE],
    points[LM.RIGHT_HEEL],
    points[LM.RIGHT_FOOT_INDEX],
  ]);

  const offset = (point) => {
    if (!point) return null;
    return point.clone()
      .sub(hipsCenter)
      .add(rootPosition);
  };

  return {
    PELVIS: vectorToArray(offset(hipsCenter)),
    CHEST: vectorToArray(offset(chestPoint)),
    NECK: vectorToArray(offset(neckPoint)),
    HEAD: vectorToArray(offset(headPoint)),
    CLAVICLE_L: vectorToArray(offset(leftClaviclePoint)),
    ARM_L_UPPER: vectorToArray(offset(points[LM.LEFT_SHOULDER])),
    ARM_L_LOWER: vectorToArray(offset(points[LM.LEFT_ELBOW])),
    HAND_L: vectorToArray(offset(points[LM.LEFT_WRIST])),
    CLAVICLE_R: vectorToArray(offset(rightClaviclePoint)),
    ARM_R_UPPER: vectorToArray(offset(points[LM.RIGHT_SHOULDER])),
    ARM_R_LOWER: vectorToArray(offset(points[LM.RIGHT_ELBOW])),
    HAND_R: vectorToArray(offset(points[LM.RIGHT_WRIST])),
    LEG_L_UPPER: vectorToArray(offset(points[LM.LEFT_HIP])),
    LEG_L_LOWER: vectorToArray(offset(points[LM.LEFT_KNEE])),
    FOOT_L: vectorToArray(offset(leftFootPoint)),
    LEG_R_UPPER: vectorToArray(offset(points[LM.RIGHT_HIP])),
    LEG_R_LOWER: vectorToArray(offset(points[LM.RIGHT_KNEE])),
    FOOT_R: vectorToArray(offset(rightFootPoint)),
  };
}

function vectorToArray(vector) {
  if (!vector) return null;
  return [vector.x, vector.y, vector.z];
}

function distance2D(a, b) {
  if (!a || !b) return 0;
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
}

function getJointConfidence(landmarks, jointName) {
  const sourceIndices = JOINT_CONFIDENCE_SOURCES[jointName];
  if (!sourceIndices?.length) return 1;

  const scores = sourceIndices
    .map((index) => landmarks[index]?.visibility)
    .filter((score) => Number.isFinite(score));

  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function canTrackJoint(jointName, confidence) {
  return confidence >= (JOINT_CONFIDENCE_THRESHOLDS[jointName] ?? 0.45);
}

function getJointBlendAlpha(jointName, baseAlpha, confidence) {
  const smoothingFactor = JOINT_SMOOTHING_FACTORS[jointName] ?? 1;
  const confidenceFloor = JOINT_CONFIDENCE_THRESHOLDS[jointName] ?? 0.45;
  const confidenceAlpha = THREE.MathUtils.clamp(
    THREE.MathUtils.mapLinear(confidence || 0, confidenceFloor, 1, 0.3, 1),
    0.3,
    1
  );
  return THREE.MathUtils.clamp(baseAlpha * smoothingFactor * confidenceAlpha, 0.02, 1);
}

function roundTime(value) {
  return Math.round((value + Number.EPSILON) / MOTION_TIME_STEP) * MOTION_TIME_STEP;
}
