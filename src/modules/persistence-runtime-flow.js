import { disposeSceneObject } from './scene-disposal.js';

export { disposeSceneObject } from './scene-disposal.js';

export function clearRuntimeUserObjects(userObjects, {
  disposeObject = disposeSceneObject,
} = {}) {
  while (userObjects.children.length > 0) {
    const child = userObjects.children[0];
    userObjects.remove(child);
    disposeObject(child);
  }
}

export function serializeRuntimeScene(userObjects, {
  serializeObject,
} = {}) {
  const objects = [];
  userObjects.children.forEach((child) => {
    const data = serializeObject(child);
    if (data) objects.push(data);
  });
  return { version: 1, objects };
}

export function deserializeRuntimeScene(json, {
  userObjects,
  deselect,
  validateSerializedScene,
  deserializeObject,
  pixelated,
  clearUserObjects = clearRuntimeUserObjects,
  invalidMessage,
} = {}) {
  deselect();
  if (!validateSerializedScene(json)) {
    throw new Error(invalidMessage);
  }

  const rebuiltObjects = json.objects
    .map((data) => deserializeObject(data, { pixelated }))
    .filter(Boolean);
  clearUserObjects(userObjects);
  rebuiltObjects.forEach((object) => userObjects.add(object));
  return rebuiltObjects;
}

export function saveRuntimeScene({
  serializeScene,
  saveSceneSnapshot,
  showToast,
  messages,
} = {}) {
  try {
    saveSceneSnapshot(serializeScene());
    showToast(messages.saved);
    return true;
  } catch (error) {
    showToast(messages.error + (error?.message || ''));
    return false;
  }
}

export function loadRuntimeScene({
  loadSceneSnapshot,
  confirmLoad,
  deserializeScene,
  showToast,
  messages,
} = {}) {
  try {
    const snapshot = loadSceneSnapshot();
    if (!snapshot) {
      showToast(messages.noSaved);
      return false;
    }
    if (!confirmLoad(messages.confirm)) {
      return false;
    }
    deserializeScene(snapshot);
    showToast(messages.loaded);
    return true;
  } catch (error) {
    showToast(messages.error + (error?.message || messages.invalid));
    return false;
  }
}

export function exportRuntimeSceneJSON({
  serializeScene,
  downloadJSON,
  filename,
} = {}) {
  downloadJSON(serializeScene(), filename);
  return true;
}

export async function importRuntimeSceneJSON(file, {
  readFileAsJSON,
  deserializeScene,
  showToast,
  messages,
} = {}) {
  try {
    const data = await readFileAsJSON(file);
    deserializeScene(data);
    showToast(messages.loaded);
    return true;
  } catch (error) {
    showToast(messages.error + (error?.message || messages.invalid));
    return false;
  }
}
