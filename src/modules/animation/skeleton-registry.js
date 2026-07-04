// Skeleton Registry — loads and manages skeleton definitions

const skeletonModules = import.meta.glob('../../data/skeletons/**/*.json', { eager: true });
const animationLibraryModules = import.meta.glob('../../data/animations/**/*.json', { eager: true });

const SKELETON_REGISTRY = [];
const ANIMATION_LIBRARY_BY_SKELETON = new Map();

function cloneClip(clip) {
  return {
    ...clip,
    tracks: Array.isArray(clip.tracks)
      ? clip.tracks.map((track) => ({
        ...track,
        keyframes: Array.isArray(track.keyframes)
          ? track.keyframes.map((keyframe) => ({
            ...keyframe,
            value: Array.isArray(keyframe.value) ? [...keyframe.value] : keyframe.value,
          }))
          : track.keyframes,
      }))
      : clip.tracks,
  };
}

function normalizeAnimationLibrary(raw, sourcePath) {
  const library = typeof raw.default === 'object' ? raw.default : raw;
  if (!library || !library.skeletonId || !Array.isArray(library.clips)) {
    console.warn(`Invalid animation library file: ${sourcePath}`);
    return null;
  }
  return {
    ...library,
    clips: library.clips.map((clip) => cloneClip(clip)),
  };
}

Object.entries(animationLibraryModules).forEach(([path, mod]) => {
  const library = normalizeAnimationLibrary(mod, path);
  if (!library) return;
  if (ANIMATION_LIBRARY_BY_SKELETON.has(library.skeletonId)) {
    console.warn(`Duplicate animation library for skeleton ${library.skeletonId}: ${path}`);
    return;
  }
  ANIMATION_LIBRARY_BY_SKELETON.set(library.skeletonId, library);
});

function normalizeSkeleton(raw, sourcePath) {
  const skel = typeof raw.default === 'object' ? raw.default : raw;
  if (!skel || !skel.id || !skel.archetype || !Array.isArray(skel.bones)) {
    console.warn(`Invalid skeleton file: ${sourcePath}`);
    return null;
  }
  const library = ANIMATION_LIBRARY_BY_SKELETON.get(skel.id);
  return {
    ...skel,
    ...(library ? { animations: library.clips.map((clip) => cloneClip(clip)) } : {}),
  };
}

// Initialize from glob
Object.entries(skeletonModules).forEach(([path, mod]) => {
  const skel = normalizeSkeleton(mod, path);
  if (skel) SKELETON_REGISTRY.push(skel);
});

export function getSkeletonsByArchetype(archetype) {
  return SKELETON_REGISTRY.filter((s) => s.archetype === archetype && !s.internal);
}

export function getSkeletonById(id) {
  return SKELETON_REGISTRY.find((s) => s.id === id) || null;
}

export function getDefaultSkeleton(archetype) {
  return SKELETON_REGISTRY.find((s) => s.archetype === archetype && !s.internal) || null;
}

export function registerSkeleton(def) {
  if (!def || !def.id || !def.archetype || !Array.isArray(def.bones)) {
    console.warn('registerSkeleton: invalid skeleton definition');
    return false;
  }
  const existing = SKELETON_REGISTRY.findIndex((s) => s.id === def.id);
  if (existing >= 0) {
    SKELETON_REGISTRY[existing] = { ...def };
  } else {
    SKELETON_REGISTRY.push({ ...def });
  }
  return true;
}

export function getAllSkeletons() {
  return [...SKELETON_REGISTRY];
}
