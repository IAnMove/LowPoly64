// Animation Profiles — loads and manages animation profile definitions

import { getSkeletonById } from './skeleton-registry.js';

const profileModules = import.meta.glob('../../data/animation-profiles/**/*.json', { eager: true });

const PROFILE_REGISTRY = [];

Object.entries(profileModules).forEach(([path, mod]) => {
  const profile = mod.default ?? mod;
  if (profile && profile.id && profile.skeletonId && Array.isArray(profile.animations)) {
    PROFILE_REGISTRY.push({ ...profile });
  } else {
    console.warn(`Invalid animation profile: ${path}`);
  }
});

export function getProfileById(id) {
  return PROFILE_REGISTRY.find((p) => p.id === id) || null;
}

export function getProfilesBySkeletonId(skeletonId) {
  return PROFILE_REGISTRY.filter((p) => p.skeletonId === skeletonId);
}

export function registerProfile(def) {
  if (!def || !def.id || !def.skeletonId || !Array.isArray(def.animations)) {
    return false;
  }
  const existing = PROFILE_REGISTRY.findIndex((p) => p.id === def.id);
  if (existing >= 0) {
    PROFILE_REGISTRY[existing] = { ...def };
  } else {
    PROFILE_REGISTRY.push({ ...def });
  }
  return true;
}

export function getProfilesByArchetype(archetype) {
  return PROFILE_REGISTRY.filter((p) => {
    const skel = getSkeletonById(p.skeletonId);
    return skel && skel.archetype === archetype;
  });
}

// Given a profileId, resolve which animations from the skeleton to use
export function resolveAnimationProfile(profileId) {
  const profile = getProfileById(profileId);
  if (!profile) return null;

  const skeleton = getSkeletonById(profile.skeletonId);
  if (!skeleton || !Array.isArray(skeleton.animations)) return null;

  const animations = skeleton.animations.filter((anim) =>
    profile.animations.includes(anim.name)
  );

  return {
    profile,
    skeleton,
    animations,
    style: profile.style || {},
  };
}
