export const SCENE_STORAGE_KEY = 'lowpoly64-scene';

export function getBrowserSceneStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function createSceneStorage({
  storage = getBrowserSceneStorage(),
  storageKey = SCENE_STORAGE_KEY,
  stringify = JSON.stringify,
  parse = JSON.parse,
} = {}) {
  function getStorage() {
    if (!storage) {
      throw new Error('Scene storage is unavailable');
    }
    return storage;
  }

  function saveSceneSnapshot(snapshot) {
    getStorage().setItem(storageKey, stringify(snapshot));
    return snapshot;
  }

  function loadSceneSnapshot() {
    const raw = getStorage().getItem(storageKey);
    return raw ? parse(raw) : null;
  }

  return {
    loadSceneSnapshot,
    saveSceneSnapshot,
  };
}

export function saveSceneSnapshot(snapshot, options = {}) {
  return createSceneStorage(options).saveSceneSnapshot(snapshot);
}

export function loadSceneSnapshot(options = {}) {
  return createSceneStorage(options).loadSceneSnapshot();
}
