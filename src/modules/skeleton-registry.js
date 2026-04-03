// Skeleton Registry — loads and manages skeleton definitions

const skeletonModules = import.meta.glob('../data/skeletons/**/*.json', { eager: true });

const SKELETON_REGISTRY = [];

function normalizeSkeleton(raw, sourcePath) {
  const skel = typeof raw.default === 'object' ? raw.default : raw;
  if (!skel || !skel.id || !skel.archetype || !Array.isArray(skel.bones)) {
    console.warn(`Invalid skeleton file: ${sourcePath}`);
    return null;
  }
  return { ...skel };
}

// Initialize from glob
Object.entries(skeletonModules).forEach(([path, mod]) => {
  const skel = normalizeSkeleton(mod, path);
  if (skel) SKELETON_REGISTRY.push(skel);
});

export function getSkeletonsByArchetype(archetype) {
  return SKELETON_REGISTRY.filter((s) => s.archetype === archetype);
}

export function getSkeletonById(id) {
  return SKELETON_REGISTRY.find((s) => s.id === id) || null;
}

export function getDefaultSkeleton(archetype) {
  return SKELETON_REGISTRY.find((s) => s.archetype === archetype) || null;
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
