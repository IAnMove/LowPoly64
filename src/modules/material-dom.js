export function syncColorInputs(hex, root = globalThis.document) {
  const palettePicker = root?.getElementById?.('palette-color-picker');
  if (palettePicker) palettePicker.value = hex;

  const propColor = root?.getElementById?.('prop-color');
  if (propColor) propColor.value = hex;
}

export function createMaterialDomAdapter({ root = globalThis.document } = {}) {
  return {
    syncColorInputs: (hex) => syncColorInputs(hex, root),
  };
}
