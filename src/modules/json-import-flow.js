export function parseJSONImportText(jsonText, {
  translate = (key) => key,
} = {}) {
  try {
    return { data: JSON.parse(jsonText) };
  } catch (error) {
    return { error: translate('jsonInvalid') + error.message };
  }
}

export function showJSONImportError(message, {
  setImportError = () => {},
} = {}) {
  setImportError(message);
  return { success: false, error: message };
}

export function importObjectDefinitionFromData(data, {
  getImportState,
  validateObject,
  normalizeObject,
  buildObjectGroup,
  importAnimationData = () => ({ success: true }),
  addGroup = () => {},
  removeGroup = () => {},
  getSelectedMesh = () => null,
  selectGroup = () => {},
  deselect = () => {},
  pushAction = () => {},
  showToast = () => {},
  translate = (key) => key,
} = {}) {
  const getRuntimeState = createJSONImportRuntimeStateGetter({
    getImportState,
    getSelectedMesh,
  });
  const validationError = validateObject(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const normalized = normalizeObject(data);
  const group = buildObjectGroup(normalized);

  if (Array.isArray(normalized.animations) && normalized.animations.length > 0) {
    const warnings = [];
    for (let i = 0; i < normalized.animations.length; i++) {
      const result = importAnimationData(normalized.animations[i], group);
      if (!result.success) {
        warnings.push(result.error);
      }
    }
    if (warnings.length > 0) {
      showToast(warnings[0]);
    }
  }

  addGroup(group);
  selectGroup(group);

  pushAction({
    type: translate('actionImportObject'),
    undo: () => {
      const selectedMesh = getRuntimeState().selectedMesh;
      if (selectedMesh === group || group.children?.includes(selectedMesh)) {
        deselect();
      }
      removeGroup(group);
    },
    redo: () => {
      addGroup(group);
      selectGroup(group);
    },
  });

  showToast(translate('objectImported') + normalized.name);
  return { success: true, group, normalized };
}

export function importObjectFromJSONString(jsonString, dependencies = {}) {
  const { data, error } = parseJSONImportText(jsonString, dependencies);
  if (error) {
    return { success: false, error };
  }

  return importObjectDefinitionFromData(data, dependencies);
}

export function importAnimationJSONToSelected(jsonText, {
  getImportState,
  getSelectedGroup = () => null,
  importAnimationToGroup,
  showTimelineForGroup = () => {},
  closeImportModal = () => {},
  setImportError = () => {},
  translate = (key) => key,
} = {}) {
  const group = createJSONImportRuntimeStateGetter({
    getImportState,
    getSelectedGroup,
  })().selectedGroup;
  if (!group || !group.isGroup) {
    return showJSONImportError(translate('selectGroupForAnim'), { setImportError });
  }

  const result = importAnimationToGroup(jsonText, group);
  if (result.success) {
    showTimelineForGroup(group);
    closeImportModal();
  } else {
    setImportError(result.error);
  }
  return result;
}

export function handleParsedJSONImport(data, jsonText, dependencies = {}) {
  const {
    closeImportModal = () => {},
    setImportError = () => {},
    translate = (key) => key,
  } = dependencies;
  const isObject = data && typeof data === 'object' && !Array.isArray(data);

  if (isObject && data.pieces) {
    const result = importObjectDefinitionFromData(data, dependencies);
    if (result.success) {
      closeImportModal();
    } else {
      setImportError(result.error);
    }
    return result;
  }

  if (isObject && (data.tracks || (data.animations && !data.pieces))) {
    return importAnimationJSONToSelected(jsonText, dependencies);
  }

  return showJSONImportError(translate('jsonNotRecognized'), { setImportError });
}

export function handleJSONImportSubmit({
  getImportText = () => '',
  translate = (key) => key,
  ...dependencies
} = {}) {
  const text = getImportText();
  if (!text) {
    return showJSONImportError(translate('pasteJsonFirst'), dependencies);
  }

  const { data, error } = parseJSONImportText(text, { translate });
  if (error) {
    return showJSONImportError(error, dependencies);
  }

  return handleParsedJSONImport(data, text, { ...dependencies, translate });
}

export async function handleJSONImportFile(file, {
  readFileAsJSON,
  setImportText = () => {},
  translate = (key) => key,
  ...dependencies
} = {}) {
  if (!file) return undefined;

  try {
    const data = await readFileAsJSON(file);
    const jsonText = JSON.stringify(data, null, 2);
    setImportText(jsonText);
    return handleParsedJSONImport(data, jsonText, { ...dependencies, translate });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return showJSONImportError(translate('jsonInvalid') + error.message, dependencies);
    }
    return showJSONImportError(translate('jsonFileReadError'), dependencies);
  }
}

function readStateValue(source, keys, fallback) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }
  return fallback();
}

export function createJSONImportRuntimeStateGetter({
  getImportState,
  getSelectedMesh = () => null,
  getSelectedGroup = () => null,
} = {}) {
  return () => {
    const importState = getImportState?.() || {};
    return {
      importState,
      selectedMesh: readStateValue(importState, ['selectedMesh'], getSelectedMesh),
      selectedGroup: readStateValue(importState, ['selectedGroup', 'selectedMesh'], getSelectedGroup),
    };
  };
}
