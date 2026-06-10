import { FAST_POSER_POSE_LIBRARY_FORMAT } from './animateur-animation-import.js';

export function buildPoseLibraryAsset(poses = []) {
  return {
    format: FAST_POSER_POSE_LIBRARY_FORMAT,
    version: 1,
    type: 'pose-library',
    poses,
  };
}

export function generatePoseLibraryId() {
  return globalThis.crypto?.randomUUID?.()
    || `pose_${Date.now()}_${Math.round(Math.random() * 1e6).toString(36)}`;
}

export function normalizePoseLibraryEntry(entry, fallbackIndex = 0) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.pose !== 'object' || Array.isArray(entry.pose)) {
    return null;
  }

  return {
    id: String(entry.id || `pose_${fallbackIndex + 1}`).trim() || `pose_${fallbackIndex + 1}`,
    name: String(entry.name || `Pose ${fallbackIndex + 1}`).trim() || `Pose ${fallbackIndex + 1}`,
    characterIndex: Number.isInteger(entry.characterIndex) && entry.characterIndex >= 0 ? entry.characterIndex : 0,
    pose: entry.pose,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };
}
