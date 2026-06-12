export function getActiveJSONExportObject(exportState) {
  return exportState.animationMode ? exportState.animationModeObject : exportState.selectedMesh;
}

export function createSceneImportJSON(userObjects, {
  serializeGroup,
} = {}) {
  const data = { name: 'SCENE', objects: [] };
  userObjects?.children?.forEach((child) => {
    const serialized = serializeGroup(child);
    if (serialized) data.objects.push(serialized);
  });
  return data;
}

export function createJSONExportPayload({
  exportState,
  requireSelection = false,
  serializeGroup,
  translate = (key) => key,
} = {}) {
  const object = getActiveJSONExportObject(exportState);

  if (!object && requireSelection) {
    return { error: translate('selectObjectFirst') };
  }

  if (!object) {
    return {
      payload: {
        data: createSceneImportJSON(exportState.userObjects, { serializeGroup }),
        filename: 'scene.json',
        toast: translate('sceneExported'),
      },
    };
  }

  const data = serializeGroup(object);
  if (!data) {
    return { error: translate('couldNotSerialize') };
  }

  return {
    payload: {
      data,
      filename: `${(data.name || 'object').toLowerCase().replace(/\s+/g, '_')}.json`,
      toast: translate('objectExported'),
    },
  };
}

export function downloadJSONExport({
  exportState,
  requireSelection = false,
  showSuccessToast = false,
  serializeGroup,
  downloadJSON,
  showToast = () => {},
  translate = (key) => key,
} = {}) {
  const { payload, error } = createJSONExportPayload({
    exportState,
    requireSelection,
    serializeGroup,
    translate,
  });
  if (error) {
    showToast(error);
    return null;
  }

  downloadJSON(payload.data, payload.filename);
  if (showSuccessToast) {
    showToast(payload.toast);
  }
  return payload;
}

export function copyJSONExport({
  exportState,
  requireSelection = false,
  serializeGroup,
  copyJSON,
  showToast = () => {},
  translate = (key) => key,
} = {}) {
  const { payload, error } = createJSONExportPayload({
    exportState,
    requireSelection,
    serializeGroup,
    translate,
  });
  if (error) {
    showToast(error);
    return null;
  }

  return copyJSON(payload.data);
}

export function copySceneJSONExport({
  serializeScene,
  copyJSON,
} = {}) {
  return copyJSON(serializeScene());
}

export function copyJSONToClipboard(data, {
  writeText,
  promptCopy = () => {},
  showToast = () => {},
  translate = (key) => key,
} = {}) {
  const json = JSON.stringify(data, null, 2);
  return Promise.resolve()
    .then(() => writeText(json))
    .then(() => {
      showToast(translate('jsonCopied'));
      return { copied: true, json };
    })
    .catch(() => {
      promptCopy(translate('copyThisJson'), json);
      return { copied: false, json };
    });
}
