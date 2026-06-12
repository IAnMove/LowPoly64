import { TEXTURE_DEFAULT_PALETTE } from './texture-editor-paint-core.js';

export function renderTexturePaintPalette({
  container,
  palette = TEXTURE_DEFAULT_PALETTE,
  createSwatch,
  onColorSelect = () => {},
} = {}) {
  if (!container) return false;

  container.replaceChildren();
  palette.forEach((hex) => {
    const swatch = createSwatch(hex);
    swatch.addEventListener('click', () => onColorSelect(hex));
    container.appendChild(swatch);
  });
  return true;
}
