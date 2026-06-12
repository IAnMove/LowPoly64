function getElement(root, id) {
  return root?.getElementById?.(id) || null;
}

function setHidden(root, id, hidden) {
  getElement(root, id)?.classList.toggle('hidden', hidden);
}

function setValue(root, id, value) {
  const element = getElement(root, id);
  if (element) element.value = value;
}

function getNumber(root, id, fallback) {
  const value = Number.parseFloat(getElement(root, id)?.value);
  return Number.isFinite(value) ? value : fallback;
}

export function showSingleSelectionFields(root = globalThis.document) {
  setHidden(root, 'single-selection-fields', false);
  setHidden(root, 'multi-selection-fields', true);
}

export function showMultiSelectionFields(root = globalThis.document) {
  setHidden(root, 'scene-info-view', true);
  setHidden(root, 'properties-panel', false);
  setHidden(root, 'single-selection-fields', true);
  setHidden(root, 'multi-selection-fields', false);
}

export function clearSelectionPanel(noObjectText, root = globalThis.document) {
  setHidden(root, 'properties-panel', true);
  setHidden(root, 'scene-info-view', false);
  setHidden(root, 'selected-overlay', true);
  setSelectedName(noObjectText, root);
}

export function setSelectedName(name, root = globalThis.document) {
  const selectedName = getElement(root, 'selected-name');
  if (selectedName) selectedName.textContent = name || 'Mesh';
}

export function writeObjectProperties(object, rotationToDegrees, root = globalThis.document) {
  setValue(root, 'prop-name', object.userData.name || '');
  setSelectedName(object.userData.name || 'Mesh', root);

  setValue(root, 'prop-posx', object.position.x.toFixed(2));
  setValue(root, 'prop-posy', object.position.y.toFixed(2));
  setValue(root, 'prop-posz', object.position.z.toFixed(2));

  setValue(root, 'prop-rotx', rotationToDegrees(object.rotation.x).toFixed(1));
  setValue(root, 'prop-roty', rotationToDegrees(object.rotation.y).toFixed(1));
  setValue(root, 'prop-rotz', rotationToDegrees(object.rotation.z).toFixed(1));

  setValue(root, 'prop-scalex', object.scale.x.toFixed(2));
  setValue(root, 'prop-scaley', object.scale.y.toFixed(2));
  setValue(root, 'prop-scalez', object.scale.z.toFixed(2));
}

export function readPositionInputs(root = globalThis.document) {
  return {
    x: getNumber(root, 'prop-posx', 0),
    y: getNumber(root, 'prop-posy', 0),
    z: getNumber(root, 'prop-posz', 0),
  };
}

export function readRotationDegreeInputs(root = globalThis.document) {
  return {
    x: getNumber(root, 'prop-rotx', 0),
    y: getNumber(root, 'prop-roty', 0),
    z: getNumber(root, 'prop-rotz', 0),
  };
}

export function readScaleInputs(root = globalThis.document) {
  return {
    x: getNumber(root, 'prop-scalex', 1),
    y: getNumber(root, 'prop-scaley', 1),
    z: getNumber(root, 'prop-scalez', 1),
  };
}

export function setColorInput(hex, root = globalThis.document) {
  setValue(root, 'prop-color', hex);
}

export function setMaterialInput(type, root = globalThis.document) {
  setValue(root, 'prop-material', type);
}

export function getMaterialInput(root = globalThis.document) {
  return getElement(root, 'prop-material')?.value || 'Lambert';
}

export function setActionButtonVisibility({ isGroup, isInGroup, showBone, hasParentPivot }, root = globalThis.document) {
  setHidden(root, 'btn-ungroup', !isInGroup && !isGroup);
  setHidden(root, 'bone-controls', !showBone);
  setHidden(root, 'btn-detach-bone', !hasParentPivot);
  setHidden(root, 'btn-anim-mode', !isGroup);
  setHidden(root, 'btn-copy-json-group', !isGroup);
}

export function writeUvControls(texture, rotationToDegrees, root = globalThis.document) {
  if (!texture) {
    setHidden(root, 'uv-controls', true);
    const preview = getElement(root, 'texture-preview');
    if (preview) {
      preview.classList.add('hidden');
      preview.src = '';
    }
    return;
  }

  setHidden(root, 'uv-controls', false);
  setValue(root, 'uv-offset-x', texture.offset.x.toFixed(2));
  setValue(root, 'uv-offset-y', texture.offset.y.toFixed(2));
  setValue(root, 'uv-repeat-x', texture.repeat.x.toFixed(2));
  setValue(root, 'uv-repeat-y', texture.repeat.y.toFixed(2));
  setValue(root, 'uv-rotation', rotationToDegrees(texture.rotation).toFixed(1));

  const preview = getElement(root, 'texture-preview');
  if (preview && texture.image) {
    preview.src = texture.image.src || '';
    preview.classList.remove('hidden');
  }
}

export function readUvInputs(root = globalThis.document) {
  return {
    offsetX: getNumber(root, 'uv-offset-x', 0),
    offsetY: getNumber(root, 'uv-offset-y', 0),
    repeatX: getNumber(root, 'uv-repeat-x', 1),
    repeatY: getNumber(root, 'uv-repeat-y', 1),
    rotationDeg: getNumber(root, 'uv-rotation', 0),
  };
}

export function createPropertiesPanelDomAdapter({ root = globalThis.document } = {}) {
  return {
    clearSelectionPanel: (noObjectText) => clearSelectionPanel(noObjectText, root),
    getMaterialInput: () => getMaterialInput(root),
    readPositionInputs: () => readPositionInputs(root),
    readRotationDegreeInputs: () => readRotationDegreeInputs(root),
    readScaleInputs: () => readScaleInputs(root),
    readUvInputs: () => readUvInputs(root),
    setActionButtonVisibility: (visibility) => setActionButtonVisibility(visibility, root),
    setColorInput: (hex) => setColorInput(hex, root),
    setMaterialInput: (type) => setMaterialInput(type, root),
    setSelectedName: (name) => setSelectedName(name, root),
    showMultiSelectionFields: () => showMultiSelectionFields(root),
    showSingleSelectionFields: () => showSingleSelectionFields(root),
    writeObjectProperties: (object, rotationToDegrees) => writeObjectProperties(object, rotationToDegrees, root),
    writeUvControls: (texture, rotationToDegrees) => writeUvControls(texture, rotationToDegrees, root),
  };
}
