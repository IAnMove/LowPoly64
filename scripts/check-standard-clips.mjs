#!/usr/bin/env node
// Validates the portable clip library that ships inside skeleton definitions
// (docs/SKELETON.md): every track must target a real bone of its skeleton,
// keyframes must be well-formed, and animation profiles may only expose
// clips that exist. Runs as part of `npm run check`.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SKELETON_DIR = path.join(ROOT, 'src', 'data', 'skeletons');
const PROFILE_DIR = path.join(ROOT, 'src', 'data', 'animation-profiles');

const PROPERTIES = new Set(['position', 'rotation', 'scale']);
// Strict contract rules (zero-baseline position deltas, bounded rotations)
// only apply to the portable HUMANOID_STANDARD library; legacy skeletons
// keep their historical conventions and get structural checks only.
const STRICT_SKELETON_IDS = new Set(['HUMANOID_STANDARD']);
const INTERPOLATIONS = new Set(['linear', 'smooth', 'step']);
const MAX_ROTATION_RAD = 3.4;

const errors = [];

function loadJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function isVec3(value) {
  return Array.isArray(value) && value.length === 3 && value.every((n) => Number.isFinite(n));
}

function checkClip(skeletonId, boneNames, clip, index) {
  const strict = STRICT_SKELETON_IDS.has(skeletonId);
  const label = `${skeletonId} animations[${index}] (${clip?.name || 'unnamed'})`;
  if (!clip || typeof clip.name !== 'string' || !clip.name.trim()) {
    errors.push(`${label}: missing name`);
    return;
  }
  if (!Number.isFinite(clip.duration) || clip.duration <= 0) {
    errors.push(`${label}: duration must be > 0`);
  }
  if (typeof clip.loop !== 'boolean') {
    errors.push(`${label}: loop must be boolean`);
  }
  if (!Array.isArray(clip.tracks) || clip.tracks.length === 0) {
    errors.push(`${label}: needs at least one track`);
    return;
  }
  clip.tracks.forEach((track, t) => {
    const tl = `${label} tracks[${t}]`;
    if (!boneNames.has(track.target)) {
      errors.push(`${tl}: target "${track.target}" is not a bone of ${skeletonId}`);
    }
    if (!PROPERTIES.has(track.property)) {
      errors.push(`${tl}: invalid property "${track.property}"`);
    }
    if (track.interpolation && !INTERPOLATIONS.has(track.interpolation)) {
      errors.push(`${tl}: invalid interpolation "${track.interpolation}"`);
    }
    const kfs = track.keyframes;
    if (!Array.isArray(kfs) || kfs.length < 2) {
      errors.push(`${tl}: needs at least two keyframes`);
      return;
    }
    let prev = -Infinity;
    kfs.forEach((kf, k) => {
      if (!Number.isFinite(kf.time) || kf.time < 0) errors.push(`${tl} kf[${k}]: bad time`);
      if (kf.time < prev) errors.push(`${tl} kf[${k}]: times must be non-decreasing`);
      prev = kf.time;
      if (!isVec3(kf.value)) errors.push(`${tl} kf[${k}]: value must be [x, y, z] finite numbers`);
      if (strict && track.property === 'rotation' && isVec3(kf.value) && kf.value.some((v) => Math.abs(v) > MAX_ROTATION_RAD)) {
        errors.push(`${tl} kf[${k}]: rotation component beyond +/-${MAX_ROTATION_RAD} rad`);
      }
    });
    if (kfs[0].time !== 0) errors.push(`${tl}: first keyframe must be at time 0`);
    if (Number.isFinite(clip.duration) && prev > clip.duration + 1e-6) {
      errors.push(`${tl}: keyframe time ${prev} exceeds duration ${clip.duration}`);
    }
    if (strict && track.property === 'position' && isVec3(kfs[0].value) && kfs[0].value.some((v) => v !== 0)) {
      errors.push(`${tl}: position tracks are deltas — first keyframe must be [0, 0, 0]`);
    }
  });
}

const skeletons = new Map();
for (const file of readdirSync(SKELETON_DIR).filter((f) => f.endsWith('.json'))) {
  const skel = loadJson(path.join(SKELETON_DIR, file));
  if (!skel?.id || !Array.isArray(skel.bones)) continue;
  skeletons.set(skel.id, skel);
  const boneNames = new Set(skel.bones.map((b) => b.name));
  const seen = new Set();
  (skel.animations || []).forEach((clip, i) => {
    if (clip?.name) {
      if (seen.has(clip.name)) errors.push(`${skel.id}: duplicate animation name "${clip.name}"`);
      seen.add(clip.name);
    }
    checkClip(skel.id, boneNames, clip, i);
  });
}

for (const file of readdirSync(PROFILE_DIR).filter((f) => f.endsWith('.json'))) {
  const profile = loadJson(path.join(PROFILE_DIR, file));
  if (!profile?.id || !profile.skeletonId) continue;
  const skel = skeletons.get(profile.skeletonId);
  if (!skel) {
    errors.push(`profile ${profile.id}: unknown skeletonId ${profile.skeletonId}`);
    continue;
  }
  const clipNames = new Set((skel.animations || []).map((a) => a.name));
  (profile.animations || []).forEach((name) => {
    if (!clipNames.has(name)) {
      errors.push(`profile ${profile.id}: animation "${name}" not found in ${profile.skeletonId}`);
    }
  });
}

if (errors.length > 0) {
  console.error(`Standard clip check FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

const total = [...skeletons.values()].reduce((sum, s) => sum + (s.animations?.length || 0), 0);
console.log(`Standard clip check passed (${skeletons.size} skeletons, ${total} clips).`);
