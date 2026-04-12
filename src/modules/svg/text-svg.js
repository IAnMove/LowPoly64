import opentype from 'opentype.js';

export const SVG_TEXT_FONTS = Object.freeze([
  { name: 'DM Sans', url: 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf' },
  { name: 'Bebas Neue', url: 'https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXooxW4.ttf' },
  { name: 'Playfair Display', url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKfsukDQ.ttf' },
  { name: 'Righteous', url: 'https://fonts.gstatic.com/s/righteous/v18/1cXxaUPXBpj2rGoU7C9mjw.ttf' },
  { name: 'Black Ops One', url: 'https://fonts.gstatic.com/s/blackopsone/v21/qWcsB6-ypo7xBdr6Xshe96H3WDw.ttf' },
  { name: 'Permanent Marker', url: 'https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004Hao.ttf' },
  { name: 'Rubik Mono One', url: 'https://fonts.gstatic.com/s/rubikmonoone/v20/UqyJK8kPP3hjw6ANTdfRk9YSN-8w.ttf' },
  { name: 'Pacifico', url: 'https://fonts.gstatic.com/s/pacifico/v23/FwZY7-Qmy14u9lezJ96A.ttf' },
  { name: 'Oswald', url: 'https://fonts.gstatic.com/s/oswald/v57/TK3_WkUHHAIjg75cFRf3bXL8LICs1xZogUE.ttf' },
  { name: 'Archivo Black', url: 'https://fonts.gstatic.com/s/archivoblack/v23/HTxqL289NzCGg4MzN6KJ7eW6OYs.ttf' },
]);

export const DEFAULT_SVG_TEXT_FONT = 'Rubik Mono One';

const fontCache = new Map();

export function getSvgTextFontCatalog() {
  return [...SVG_TEXT_FONTS];
}

async function loadArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font request failed (${response.status})`);
  }
  return response.arrayBuffer();
}

export async function loadSvgTextFont(fontName = DEFAULT_SVG_TEXT_FONT) {
  if (fontCache.has(fontName)) return fontCache.get(fontName);

  const fontDef = SVG_TEXT_FONTS.find((entry) => entry.name === fontName);
  if (!fontDef) throw new Error(`Font not supported: ${fontName}`);

  const buffer = await loadArrayBuffer(fontDef.url);
  const font = opentype.parse(buffer);
  fontCache.set(fontName, font);
  return font;
}

export function textToSvg(text, font, options = {}) {
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  if (!normalizedText || !font) return '';

  const size = options.size || 200;
  const padding = options.padding || 20;
  const available = Math.max(8, size - padding);

  let fontSize = size - 20;
  let fullPath = font.getPath(normalizedText, 0, 0, fontSize);
  let box = fullPath.getBoundingBox();
  let width = box.x2 - box.x1;
  let height = box.y2 - box.y1;

  while ((width > available || height > available) && fontSize > 8) {
    fontSize -= 4;
    fullPath = font.getPath(normalizedText, 0, 0, fontSize);
    box = fullPath.getBoundingBox();
    width = box.x2 - box.x1;
    height = box.y2 - box.y1;
  }

  const offsetX = (size - width) / 2 - box.x1;
  const offsetY = (size - height) / 2 - box.y1;
  const glyphs = font.stringToGlyphs(normalizedText);
  const paths = [];

  let cursorX = offsetX;
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const glyphPath = glyph.getPath(cursorX, offsetY, fontSize);
    const pathData = glyphPath.toPathData(2);
    if (pathData) {
      paths.push(`<path d="${pathData}" fill="black" fill-rule="evenodd"/>`);
    }

    const advance = (glyph.advanceWidth || 0) * (fontSize / (font.unitsPerEm || 1000));
    if (i < glyphs.length - 1) {
      const kerning = font.getKerningValue(glyphs[i], glyphs[i + 1]);
      cursorX += advance + kerning * (fontSize / (font.unitsPerEm || 1000));
    } else {
      cursorX += advance;
    }
  }

  if (paths.length === 0) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths.join('')}</svg>`;
}

export async function textToSvgMarkup(text, fontName = DEFAULT_SVG_TEXT_FONT, options = {}) {
  const font = await loadSvgTextFont(fontName);
  return textToSvg(text, font, options);
}
