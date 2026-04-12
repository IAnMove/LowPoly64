import { SVG_SOURCE_MODE } from './svg-metadata.js';

function pixelPatternToGrid(pattern) {
  return pattern.map((row) => [...row].map((cell) => cell === '1'));
}

const FILLED_STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#000000"/>
</svg>`;

const STROKE_BOLT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>
</svg>`;

const PIXEL_HEART = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <path d="M27,18L45,18L45,36L63,36L63,18L81,18L81,36L99,36L99,18L117,18L117,36L126,36L126,54L117,54L117,72L108,72L108,81L99,81L99,90L90,90L90,99L81,99L81,108L72,108L72,117L63,117L63,108L54,108L54,99L45,99L45,90L36,90L36,81L27,81L27,72L18,72L18,54L9,54L9,36L27,36Z" fill="#000000" fill-rule="evenodd"/>
</svg>`;

const PIXEL_HEART_GRID = pixelPatternToGrid([
  '0000000000000000',
  '0001100000110000',
  '0011110001111000',
  '0111111011111100',
  '1111111111111110',
  '1111111111111110',
  '1111111111111110',
  '0111111111111100',
  '0011111111111000',
  '0001111111110000',
  '0000111111100000',
  '0000011111000000',
  '0000001110000000',
  '0000000100000000',
  '0000000000000000',
  '0000000000000000',
]);

export const SVG_SAMPLE_SOURCES = Object.freeze({
  filledStar: {
    name: 'Filled Star',
    mode: SVG_SOURCE_MODE.CODE,
    markup: FILLED_STAR,
  },
  strokeBolt: {
    name: 'Stroke Bolt',
    mode: SVG_SOURCE_MODE.CODE,
    markup: STROKE_BOLT,
  },
  pixelHeart: {
    name: 'Pixel Heart',
    mode: SVG_SOURCE_MODE.PIXEL,
    markup: PIXEL_HEART,
    inputs: {
      gridSize: 16,
      pixels: PIXEL_HEART_GRID,
    },
  },
  textRetro: {
    name: 'Retro Text',
    mode: SVG_SOURCE_MODE.TEXT,
    markup: '',
    inputs: {
      text: 'RETRO',
      fontName: 'Rubik Mono One',
    },
  },
});

export function getDefaultSvgSample() {
  return SVG_SAMPLE_SOURCES.filledStar;
}
