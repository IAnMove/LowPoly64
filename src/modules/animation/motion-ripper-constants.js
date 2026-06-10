import * as THREE from 'three';

export const VISION_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21-rc.20250105/vision_bundle.mjs';
export const MEDIAPIPE_WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21-rc.20250105/wasm';
export const MEDIAPIPE_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export const HUMANOID_CAPTURE_SKELETON_ID = 'HUMANOID_CAPTURE';
export const HUMANOID_CAPTURE_COMPATIBLE_SKELETON_IDS = new Set([
  HUMANOID_CAPTURE_SKELETON_ID,
  'HUMANOID_DEFAULT',
  'HUMANOID_STANDARD',
]);
export const MOTION_TIME_STEP = 0.1;
export const TORSO_DEPTH_SCALE = 0.12;
export const LIMB_DEPTH_SCALE = 0.18;
export const CAPTURED_RIG_DEPTH_SCALE = 0.12;
export const CAPTURE_CHARACTER_REFERENCE_HEIGHT = 4.18;
export const CAPTURE_CHARACTER_TARGET_HEIGHT = CAPTURE_CHARACTER_REFERENCE_HEIGHT;
export const CAPTURE_CHARACTER_FLOOR_Y = 0.08;
export const CAPTURE_CHARACTER_MIN_SCALE = 0.25;
export const CAPTURE_CHARACTER_MAX_SCALE = 32;
export const DOWN_AXIS = new THREE.Vector3(0, -1, 0);
export const LEFT_AXIS = new THREE.Vector3(-1, 0, 0);
export const RIGHT_AXIS = new THREE.Vector3(1, 0, 0);
export const FOOT_AXIS = new THREE.Vector3(0, -1, 0.1).normalize();
export const CAPTURE_JOINTS = Object.freeze([
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
export const LOWER_BODY_CAPTURE_JOINTS = Object.freeze([
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'FOOT_L',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
  'FOOT_R',
]);
export const UPPER_BODY_CAPTURE_JOINTS = Object.freeze(CAPTURE_JOINTS.filter((jointName) => !LOWER_BODY_CAPTURE_JOINTS.includes(jointName)));
export const HALF_BODY_MIN_FRAME_COUNT = 4;
export const HALF_BODY_UPPER_RELIABLE_JOINT_COUNT = 4;
export const HALF_BODY_LOWER_RELIABLE_JOINT_COUNT = 2;
export const HALF_BODY_UPPER_RELIABLE_FRAME_RATIO = 0.6;
export const HALF_BODY_LOWER_RELIABLE_FRAME_RATIO = 0.4;
export const HALF_BODY_RELIABILITY_GAP = 0.25;
export const HALF_BODY_CONFIDENCE_GAP = 0.12;
export const CAPTURE_FACING_YAWS = Object.freeze({
  front: 0,
  back: Math.PI,
  left: Math.PI * 0.5,
  right: -Math.PI * 0.5,
});
export const LOCAL_VIDEO_SPEEDS = Object.freeze([0.25, 0.5, 1]);
export const LOCAL_VIDEO_DEFAULT_SPEED = 0.25;

export const POSE_JOINTS = Object.freeze([...CAPTURE_JOINTS]);

export const PREVIEW_RIG_JOINTS = Object.freeze([
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

export const PREVIEW_RIG_CONNECTIONS = Object.freeze([
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

export const JOINT_PARENTS = Object.freeze({
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

export const CAPTURE_MIRROR_JOINTS = Object.freeze({
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

export const LATERAL_RUNNER_ROTATION_LIMITS = Object.freeze({
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
export const LATERAL_RUNNER_MAX_ROTATION_STEP = 0.72;
export const LATERAL_RUNNER_ROTATION_SMOOTHING = 0.28;
export const LATERAL_RUNNER_FOOT_LOCK_BLEND = 0.72;
export const LATERAL_RUNNER_FOOT_RELEASE_BLEND = 0.24;
export const LATERAL_RUNNER_ROOT_VERTICAL_RATIO = 0.1;
export const LATERAL_RUNNER_ROOT_DEPTH_RATIO = 0.08;
export const LATERAL_RUNNER_ROOT_MAX_STEP_RATIO = 0.045;
export const LATERAL_RUNNER_ROOT_SMOOTHING = 0.34;
export const LATERAL_RUNNER_FLATNESS_RATIO = 0.14;

export const CAPTURE_SEGMENT_CHILDREN = Object.freeze({
  ARM_L_UPPER: 'ARM_L_LOWER',
  ARM_L_LOWER: 'HAND_L',
  ARM_R_UPPER: 'ARM_R_LOWER',
  ARM_R_LOWER: 'HAND_R',
  LEG_L_UPPER: 'LEG_L_LOWER',
  LEG_L_LOWER: 'FOOT_L',
  LEG_R_UPPER: 'LEG_R_LOWER',
  LEG_R_LOWER: 'FOOT_R',
});

export const CAPTURE_TARGET_ALIASES = Object.freeze({
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

export const CONNECTIONS = Object.freeze([
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

export const EDITABLE_LANDMARK_INDICES = Object.freeze(Array.from(new Set(CONNECTIONS.flat())).sort((a, b) => a - b));

export const LM = Object.freeze({
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

export const JOINT_SMOOTHING_FACTORS = Object.freeze({
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

export const JOINT_CONFIDENCE_THRESHOLDS = Object.freeze({
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

export const JOINT_CONFIDENCE_SOURCES = Object.freeze({
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
