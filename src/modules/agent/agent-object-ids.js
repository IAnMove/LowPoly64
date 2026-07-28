import { AGENT_ID_PATTERN } from './tool-schema.js';

const AGENT_ID_REGEX = new RegExp(AGENT_ID_PATTERN);
let fallbackCounter = 0;

function randomToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, '');
  }
  fallbackCounter += 1;
  return `${Date.now().toString(36)}${fallbackCounter.toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export function createAgentId() {
  return `rv_${randomToken()}`;
}

export function isValidAgentId(value) {
  return typeof value === 'string' && AGENT_ID_REGEX.test(value);
}

export function isAgentAddressableObject(object, sceneRoot = null) {
  if (!object || object.userData?.isProxy) return false;
  if (!(object.isMesh || object.isGroup)) return false;
  if (!sceneRoot) return true;
  if (object.isMesh && object.parent?.userData?.isPivot === true) return false;
  return object !== sceneRoot;
}

function visit(root, callback) {
  if (!root) return;
  if (typeof root.traverse === 'function') {
    root.traverse(callback);
    return;
  }
  callback(root);
  for (const child of root.children || []) visit(child, callback);
}

export function ensureAgentId(object, usedIds = null) {
  if (!object) return null;
  const used = usedIds || new Set();
  let id = object.userData?.agentId;
  if (!isValidAgentId(id) || used.has(id)) {
    do {
      id = createAgentId();
    } while (used.has(id));
    object.userData ||= {};
    object.userData.agentId = id;
  }
  used.add(id);
  return id;
}

export function setRestoredAgentId(object, agentId) {
  if (!object || !isValidAgentId(agentId)) return false;
  object.userData ||= {};
  object.userData.agentId = agentId;
  return true;
}

export function clearAgentIds(root) {
  visit(root, (object) => {
    if (object?.userData && Object.hasOwn(object.userData, 'agentId')) {
      delete object.userData.agentId;
    }
  });
}

export function normalizeAgentIds(sceneRoot) {
  const usedIds = new Set();
  const repairedIds = [];
  const objects = [];
  for (const child of sceneRoot?.children || []) {
    visit(child, (object) => {
      if (!isAgentAddressableObject(object, sceneRoot)) {
        if (object?.userData && Object.hasOwn(object.userData, 'agentId')) {
          delete object.userData.agentId;
        }
        return;
      }
      const previous = object.userData?.agentId || null;
      const id = ensureAgentId(object, usedIds);
      objects.push(object);
      if (previous !== id) repairedIds.push({ previous, id });
    });
  }
  return { objects, usedIds, repairedIds };
}

export function findObjectByAgentId(sceneRoot, agentId) {
  if (!sceneRoot || !isValidAgentId(agentId)) return null;
  let found = null;
  for (const child of sceneRoot.children || []) {
    visit(child, (object) => {
      if (!found
        && isAgentAddressableObject(object, sceneRoot)
        && object?.userData?.agentId === agentId) {
        found = object;
      }
    });
    if (found) break;
  }
  return found;
}

export function getAddressableObjects(sceneRoot) {
  return normalizeAgentIds(sceneRoot).objects;
}
