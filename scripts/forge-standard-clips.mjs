// Authors/reworks HUMANOID_STANDARD clips and syncs the three data files:
//   src/data/animations/humanoid_standard.json   (clip library)
//   src/data/skeletons/humanoid_standard.json    (embedded animations)
//   src/data/animation-profiles/humanoid_standard_avatar_base.json (exposure)
//
// The clip validator (scripts/check-standard-clips.mjs) requires:
// - library.clips === skeleton.animations (JSON equality)
// - position tracks only on Hips, first keyframe [0, 0, 0] (deltas)
// - rotation components within +/-3.4 rad, first keyframe at time 0
//
// Run: node scripts/forge-standard-clips.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const LIBRARY_PATH = 'src/data/animations/humanoid_standard.json';
const SKELETON_PATH = 'src/data/skeletons/humanoid_standard.json';
const PROFILE_PATH = 'src/data/animation-profiles/humanoid_standard_avatar_base.json';

const track = (target, property, interpolation, keys) => ({
  target,
  property,
  interpolation,
  keyframes: keys.map(([time, value]) => ({ time, value })),
});
const rot = (target, keys, interpolation = 'linear') => track(target, 'rotation', interpolation, keys);
const pos = (target, keys, interpolation = 'smooth') => track(target, 'position', interpolation, keys);
const both = (side, fn) => [fn('Left', 1), fn('Right', -1)];

// Reworked: stagger back, knees buckle, collapse forward, hold face-down.
const DIE = {
  name: 'die',
  duration: 2.4,
  loop: false,
  tracks: [
    pos('Hips', [[0, [0, 0, 0]], [0.35, [0, -0.1, -0.3]], [0.9, [0, -1.35, -0.15]], [1.5, [0, -2.3, 0.3]], [2.4, [0, -2.3, 0.3]]]),
    rot('Hips', [[0, [0, 0, 0]], [0.35, [-0.15, 0, 0.1]], [0.9, [0.35, 0, 0.12]], [1.5, [1.3, 0.1, 0.2]], [2.4, [1.3, 0.1, 0.2]]], 'smooth'),
    ...both('L', (_, sign) => rot(`${sign === 1 ? 'Left' : 'Right'}_Upper_Leg`, [[0, [0, 0, 0]], [0.9, [0.9, 0, sign * 0.1]], [1.5, [0.55, 0, sign * 0.15]], [2.4, [0.55, 0, sign * 0.15]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Leg`, [[0, [0, 0, 0]], [0.9, [-1.7, 0, 0]], [1.5, [-1.1, 0, 0]], [2.4, [-1.1, 0, 0]]], 'smooth')),
    rot('Spine', [[0, [0, 0, 0]], [0.35, [-0.2, 0, 0]], [0.9, [0.5, 0, 0]], [1.5, [0.35, 0.05, 0.05]], [2.4, [0.3, 0.05, 0.05]]], 'smooth'),
    rot('Head', [[0, [0, 0, 0]], [0.5, [-0.25, 0, 0]], [0.9, [0.5, 0, 0]], [1.5, [0.55, 0, 0.1]], [2.4, [0.55, 0, 0.1]]], 'smooth'),
    ...both('L', (side, sign) => rot(`${side}_Upper_Arm`, [[0, [0, 0, 0]], [0.35, [-0.7, 0, sign * -0.6]], [0.9, [-1.2, 0, sign * -0.25]], [1.5, [-1.35, 0, sign * -0.15]], [2.4, [-1.35, 0, sign * -0.15]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Arm`, [[0, [0, 0, 0]], [0.35, [-0.9, 0, 0]], [0.9, [-0.5, 0, 0]], [1.5, [-0.2, 0, 0]], [2.4, [-0.2, 0, 0]]], 'smooth')),
  ],
};

const SMOKE = {
  name: 'smoke',
  duration: 4.2,
  loop: true,
  tracks: [
    rot('Right_Upper_Arm', [[0, [0, 0, 0]], [0.7, [-1.1, -0.35, -0.2]], [1.5, [-1.15, -0.4, -0.2]], [2.1, [-1.1, -0.35, -0.2]], [2.7, [-0.4, -0.1, -0.15]], [4.2, [0, 0, 0]]], 'smooth'),
    rot('Right_Lower_Arm', [[0, [0, 0, 0]], [0.7, [-1.9, 0, 0.15]], [1.5, [-2.0, 0, 0.15]], [2.7, [-0.7, 0, 0]], [4.2, [0, 0, 0]]], 'smooth'),
    rot('Head', [[0, [0, 0, 0]], [0.7, [-0.08, 0, 0]], [1.5, [-0.15, 0, 0]], [2.1, [-0.12, 0, 0]], [2.9, [0.18, 0, 0.05]], [4.2, [0, 0, 0]]], 'smooth'),
    rot('Spine', [[0, [0, 0, 0]], [1.5, [-0.04, 0, 0]], [2.9, [0.07, 0, 0]], [4.2, [0, 0, 0]]], 'smooth'),
    rot('Left_Upper_Arm', [[0, [-0.15, 0, 0.5]], [4.2, [-0.15, 0, 0.5]]], 'smooth'),
    rot('Left_Lower_Arm', [[0, [-0.75, 0, 0.3]], [4.2, [-0.75, 0, 0.3]]], 'smooth'),
    pos('Hips', [[0, [0, 0, 0]], [2.1, [0, -0.03, 0]], [4.2, [0, 0, 0]]]),
  ],
};

const PICKAXE = {
  name: 'pickaxe',
  duration: 1.7,
  loop: true,
  tracks: [
    ...both('L', (side, sign) => rot(`${side}_Upper_Arm`, [[0, [0, 0, 0]], [0.55, [-2.3, 0, sign * 0.35]], [0.85, [0.75, 0, sign * 0.1]], [1.2, [0.55, 0, sign * 0.15]], [1.7, [0, 0, 0]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Arm`, [[0, [0, 0, 0]], [0.55, [-1.1, 0, 0]], [0.85, [-0.15, 0, 0]], [1.7, [0, 0, 0]]], 'smooth')),
    rot('Spine', [[0, [0, 0, 0]], [0.55, [-0.35, 0, 0]], [0.85, [0.6, 0, 0]], [1.2, [0.4, 0, 0]], [1.7, [0, 0, 0]]], 'smooth'),
    pos('Hips', [[0, [0, 0, 0]], [0.55, [0, 0.06, 0]], [0.85, [0, -0.28, 0]], [1.2, [0, -0.1, 0]], [1.7, [0, 0, 0]]]),
    rot('Head', [[0, [0, 0, 0]], [0.55, [-0.3, 0, 0]], [0.85, [0.35, 0, 0]], [1.7, [0, 0, 0]]], 'smooth'),
    ...both('L', (side) => rot(`${side}_Upper_Leg`, [[0, [0, 0, 0]], [0.85, [0.3, 0, 0]], [1.7, [0, 0, 0]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Leg`, [[0, [0, 0, 0]], [0.85, [-0.45, 0, 0]], [1.7, [0, 0, 0]]], 'smooth')),
  ],
};

const SHOVEL = {
  name: 'shovel',
  duration: 2.4,
  loop: true,
  tracks: [
    rot('Spine', [[0, [0, 0, 0]], [0.6, [0.55, 0, 0]], [1.0, [0.62, 0, 0]], [1.5, [0.15, 0.45, 0]], [1.9, [0.1, 0.5, 0]], [2.4, [0, 0, 0]]], 'smooth'),
    pos('Hips', [[0, [0, 0, 0]], [0.6, [0, -0.3, 0.05]], [1.0, [0, -0.38, 0.05]], [1.5, [0, -0.05, 0]], [2.4, [0, 0, 0]]]),
    rot('Hips', [[0, [0, 0, 0]], [1.5, [0, 0.35, 0]], [1.9, [0, 0.4, 0]], [2.4, [0, 0, 0]]], 'smooth'),
    ...both('L', (side, sign) => rot(`${side}_Upper_Arm`, [[0, [0, 0, 0]], [0.6, [-0.75, 0, sign * 0.15]], [1.0, [-0.9, 0, sign * 0.1]], [1.5, [-0.35, -0.3, sign * 0.25]], [1.9, [-0.3, -0.35, sign * 0.3]], [2.4, [0, 0, 0]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Arm`, [[0, [0, 0, 0]], [0.6, [-0.5, 0, 0]], [1.0, [-0.65, 0, 0]], [1.5, [-0.9, 0, 0]], [2.4, [0, 0, 0]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Upper_Leg`, [[0, [0, 0, 0]], [0.6, [0.35, 0, 0]], [1.0, [0.4, 0, 0]], [1.5, [0.05, 0, 0]], [2.4, [0, 0, 0]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Leg`, [[0, [0, 0, 0]], [0.6, [-0.5, 0, 0]], [1.0, [-0.55, 0, 0]], [1.5, [-0.1, 0, 0]], [2.4, [0, 0, 0]]], 'smooth')),
    rot('Head', [[0, [0, 0, 0]], [0.6, [0.25, 0, 0]], [1.0, [0.3, 0, 0]], [1.5, [0, 0.3, 0]], [2.4, [0, 0, 0]]], 'smooth'),
  ],
};

const SIT = {
  name: 'sit',
  duration: 3.2,
  loop: false,
  tracks: [
    pos('Hips', [[0, [0, 0, 0]], [0.7, [0, -1.5, 0]], [1.6, [0, -1.47, 0]], [2.4, [0, -1.51, 0]], [3.2, [0, -1.5, 0]]]),
    rot('Hips', [[0, [0, 0, 0]], [0.7, [-0.08, 0, 0]], [3.2, [-0.08, 0, 0]]], 'smooth'),
    ...both('L', (side, sign) => rot(`${side}_Upper_Leg`, [[0, [0, 0, 0]], [0.7, [1.5, 0, sign * 0.05]], [3.2, [1.5, 0, sign * 0.05]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Leg`, [[0, [0, 0, 0]], [0.7, [-1.5, 0, 0]], [3.2, [-1.5, 0, 0]]], 'smooth')),
    rot('Spine', [[0, [0, 0, 0]], [0.7, [0.12, 0, 0]], [1.6, [0.15, 0, 0]], [2.4, [0.11, 0, 0]], [3.2, [0.12, 0, 0]]], 'smooth'),
    rot('Head', [[0, [0, 0, 0]], [0.7, [0.05, 0, 0]], [1.4, [0.05, 0.25, 0]], [2.2, [0.05, -0.2, 0]], [3.2, [0.05, 0, 0]]], 'smooth'),
    ...both('L', (side, sign) => rot(`${side}_Upper_Arm`, [[0, [0, 0, 0]], [0.7, [-0.55, 0, sign * 0.1]], [3.2, [-0.55, 0, sign * 0.1]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Arm`, [[0, [0, 0, 0]], [0.7, [-0.4, 0, 0]], [3.2, [-0.4, 0, 0]]], 'smooth')),
  ],
};

const SLEEP = {
  name: 'sleep',
  duration: 4.0,
  loop: false,
  tracks: [
    pos('Hips', [[0, [0, 0, 0]], [1.2, [0, -2.35, 0]], [2.4, [0, -2.33, 0]], [3.2, [0, -2.35, 0]], [4.0, [0, -2.34, 0]]]),
    rot('Hips', [[0, [0, 0, 0]], [1.2, [-1.5, 0, 0]], [4.0, [-1.5, 0, 0]]], 'smooth'),
    ...both('L', (side, sign) => rot(`${side}_Upper_Leg`, [[0, [0, 0, 0]], [1.2, [0.1, 0, sign * 0.05]], [4.0, [0.1, 0, sign * 0.05]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Leg`, [[0, [0, 0, 0]], [1.2, [-0.15, 0, 0]], [4.0, [-0.15, 0, 0]]], 'smooth')),
    rot('Spine', [[0, [0, 0, 0]], [1.2, [0.08, 0, 0]], [2.4, [0.13, 0, 0]], [3.2, [0.07, 0, 0]], [4.0, [0.12, 0, 0]]], 'smooth'),
    rot('Head', [[0, [0, 0, 0]], [1.2, [0.15, 0, 0.08]], [4.0, [0.15, 0, 0.08]]], 'smooth'),
    ...both('L', (side, sign) => rot(`${side}_Upper_Arm`, [[0, [0, 0, 0]], [1.2, [-0.15, 0, sign * 0.35]], [4.0, [-0.15, 0, sign * 0.35]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Arm`, [[0, [0, 0, 0]], [1.2, [-0.1, 0, 0]], [4.0, [-0.1, 0, 0]]], 'smooth')),
  ],
};

const CHEER = {
  name: 'cheer',
  duration: 1.6,
  loop: true,
  tracks: [
    pos('Hips', [[0, [0, 0, 0]], [0.2, [0, -0.12, 0]], [0.4, [0, 0.22, 0]], [0.6, [0, 0, 0]], [1.0, [0, -0.1, 0]], [1.2, [0, 0.18, 0]], [1.6, [0, 0, 0]]]),
    rot('Right_Upper_Arm', [[0, [0, 0, 0]], [0.2, [-1.2, 0, -0.4]], [0.4, [-2.6, 0, -0.35]], [0.8, [0, 0, 0]], [1.6, [0, 0, 0]]], 'smooth'),
    rot('Right_Lower_Arm', [[0, [0, 0, 0]], [0.4, [-0.5, 0, 0]], [0.8, [0, 0, 0]], [1.6, [0, 0, 0]]], 'smooth'),
    rot('Left_Upper_Arm', [[0, [0, 0, 0]], [0.8, [0, 0, 0]], [1.0, [-1.2, 0, 0.4]], [1.2, [-2.6, 0, 0.35]], [1.6, [0, 0, 0]]], 'smooth'),
    rot('Left_Lower_Arm', [[0, [0, 0, 0]], [1.2, [-0.5, 0, 0]], [1.6, [0, 0, 0]]], 'smooth'),
    rot('Head', [[0, [0, 0, 0]], [0.4, [-0.18, 0, 0]], [0.8, [0, 0, 0]], [1.2, [-0.18, 0, 0]], [1.6, [0, 0, 0]]], 'smooth'),
    ...both('L', (side) => rot(`${side}_Upper_Leg`, [[0, [0, 0, 0]], [0.2, [0.35, 0, 0]], [0.4, [-0.15, 0, 0]], [0.6, [0, 0, 0]], [1.0, [0.3, 0, 0]], [1.2, [-0.12, 0, 0]], [1.6, [0, 0, 0]]], 'smooth')),
    ...both('L', (side) => rot(`${side}_Lower_Leg`, [[0, [0, 0, 0]], [0.2, [-0.55, 0, 0]], [0.4, [-0.1, 0, 0]], [0.6, [0, 0, 0]], [1.0, [-0.5, 0, 0]], [1.2, [-0.08, 0, 0]], [1.6, [0, 0, 0]]], 'smooth')),
  ],
};

const REWORKED = { die: DIE };
const NEW_CLIPS = [SMOKE, PICKAXE, SHOVEL, SIT, SLEEP, CHEER];

function upsertClip(clips, clip) {
  const index = clips.findIndex((entry) => entry.name === clip.name);
  if (index >= 0) {
    clips[index] = clip;
  } else {
    clips.push(clip);
  }
}

const library = JSON.parse(readFileSync(LIBRARY_PATH, 'utf8'));
const skeleton = JSON.parse(readFileSync(SKELETON_PATH, 'utf8'));
const profile = JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));

const clips = (library.clips || []).map((clip) => ({ ...clip }));
Object.values(REWORKED).forEach((clip) => upsertClip(clips, clip));
NEW_CLIPS.forEach((clip) => upsertClip(clips, clip));

library.clips = clips;
skeleton.animations = clips;
profile.animations = clips.map((clip) => clip.name);

writeFileSync(LIBRARY_PATH, `${JSON.stringify(library, null, 2)}\n`);
writeFileSync(SKELETON_PATH, `${JSON.stringify(skeleton, null, 2)}\n`);
writeFileSync(PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`);

console.log(`clips now: ${clips.map((clip) => clip.name).join(', ')}`);
console.log(`reworked: ${Object.keys(REWORKED).join(', ')}; added: ${NEW_CLIPS.map((clip) => clip.name).join(', ')}`);
