const FACE_MODE_VALUES = Object.freeze(['decal', 'hybrid', 'geometry']);
const FACE_DETAIL_PATTERNS = Object.freeze([
  /(^|_)PUPIL(_|$)/i,
  /(^|_)PUPILA(_|$)/i,
  /(^|_)EYE(_|$)/i,
  /(^|_)OJO(_|$)/i,
  /(^|_)SOCKET(_|$)/i,
  /(^|_)MOUTH(_|$)/i,
  /(^|_)BOCA(_|$)/i,
  /(^|_)LIP(_|$)/i,
  /(^|_)TEETH(_|$)/i,
  /(^|_)TOOTH(_|$)/i,
  /(^|_)JAW(_|$)/i,
  /(^|_)CEJA(_|$)/i,
  /(^|_)BROW(_|$)/i,
  /(^|_)NARIZ(_|$)/i,
  /(^|_)NOSE(_|$)/i,
]);

function normalizeNodeName(value) {
  return String(value || '').trim().toUpperCase();
}

function getNodeName(node) {
  return normalizeNodeName(node?.userData?.name || node?.name || '');
}

function isFaceDetailNodeName(name) {
  if (!name || name === 'FACE_DECAL' || name === 'HEAD') return false;
  return FACE_DETAIL_PATTERNS.some((pattern) => pattern.test(name));
}

function collectFaceModeTargets(group) {
  let faceDecalNode = null;
  const detailNodes = [];

  group?.traverse((node) => {
    if (!node || node === group) return;
    const name = getNodeName(node);
    if (!name) return;

    if (name === 'FACE_DECAL') {
      faceDecalNode = node;
      return;
    }

    if (isFaceDetailNodeName(name)) {
      detailNodes.push(node);
    }
  });

  return { faceDecalNode, detailNodes };
}

export function normalizeFaceMode(mode) {
  const normalized = String(mode || '').trim().toLowerCase();
  return FACE_MODE_VALUES.includes(normalized) ? normalized : 'decal';
}

export function getFaceModeState(group) {
  if (!group?.isGroup) {
    return {
      available: false,
      toggleAvailable: false,
      mode: 'decal',
      detailCount: 0,
      visibleDetailCount: 0,
      hiddenDetailCount: 0,
      hasFaceDecal: false,
    };
  }

  const { faceDecalNode, detailNodes } = collectFaceModeTargets(group);
  const available = !!faceDecalNode;
  const toggleAvailable = available && detailNodes.length > 0;
  const mode = toggleAvailable ? normalizeFaceMode(group.userData?.faceMode) : 'decal';
  const visibleDetailCount = detailNodes.filter((node) => node.visible !== false).length;
  const hiddenDetailCount = detailNodes.length - visibleDetailCount;

  return {
    available,
    toggleAvailable,
    mode,
    detailCount: detailNodes.length,
    visibleDetailCount,
    hiddenDetailCount,
    hasFaceDecal: !!faceDecalNode,
  };
}

export function applyFaceModeToGroup(group, mode) {
  if (!group?.isGroup) return false;

  const { faceDecalNode, detailNodes } = collectFaceModeTargets(group);
  if (!faceDecalNode) return false;

  const resolvedMode = detailNodes.length > 0
    ? normalizeFaceMode(mode || group.userData?.faceMode)
    : 'decal';
  const showDecal = resolvedMode !== 'geometry';
  const showDetails = resolvedMode !== 'decal';

  faceDecalNode.visible = showDecal;
  detailNodes.forEach((node) => {
    node.visible = showDetails;
  });

  group.userData.faceMode = resolvedMode;
  return true;
}

export function ensureDefaultFaceMode(group) {
  const state = getFaceModeState(group);
  if (!state.available) return false;
  return applyFaceModeToGroup(group, state.mode || 'decal');
}
