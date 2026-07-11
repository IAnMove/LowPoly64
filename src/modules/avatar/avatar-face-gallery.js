import { loadSprite } from '../texture/texture-generator.js';

let galleryGeneration = 0;
let selectionHandler = null;

function getElement(id) {
  return document.getElementById(id);
}

function paintChecker(canvas) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const cell = 8;
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      context.fillStyle = ((x / cell) + (y / cell)) % 2 === 0 ? '#111114' : '#1c1c21';
      context.fillRect(x, y, cell, cell);
    }
  }
  return context;
}

async function paintSprite(canvas, spriteId, tint, generation) {
  const context = paintChecker(canvas);
  if (!context || !spriteId) return;
  const sprite = await loadSprite(spriteId, tint);
  if (generation !== galleryGeneration || !canvas.isConnected) return;
  context.imageSmoothingEnabled = false;
  const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
  const width = Math.max(1, Math.round(sprite.width * scale));
  const height = Math.max(1, Math.round(sprite.height * scale));
  context.drawImage(sprite, Math.round((canvas.width - width) / 2), Math.round((canvas.height - height) / 2), width, height);
}

async function paintSvg(canvas, svgMarkup, generation) {
  const context = paintChecker(canvas);
  if (!context || !svgMarkup) return;
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }));
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not render avatar feature SVG preview.'));
      image.src = url;
    });
    if (generation !== galleryGeneration || !canvas.isConnected) return;
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function isAvatarFaceGalleryOpen() {
  const modal = getElement('avatar-face-gallery-modal');
  return !!modal && !modal.classList.contains('hidden');
}

export function closeAvatarFaceGallery() {
  galleryGeneration += 1;
  selectionHandler = null;
  getElement('avatar-face-gallery-modal')?.classList.add('hidden');
  getElement('avatar-face-gallery-grid')?.replaceChildren();
}

export function openAvatarFaceGallery({ title, entries, selectedId, tint, onSelect }) {
  const modal = getElement('avatar-face-gallery-modal');
  const grid = getElement('avatar-face-gallery-grid');
  const titleElement = getElement('avatar-face-gallery-title');
  if (!modal || !grid || !titleElement) return;

  const generation = ++galleryGeneration;
  selectionHandler = typeof onSelect === 'function' ? onSelect : null;
  titleElement.textContent = title;
  grid.replaceChildren(...entries.map((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.faceGalleryPreset = entry.id;
    button.className = 'min-w-0 border bg-zinc-900 p-2 text-left hover:border-[#ff77aa]';
    button.classList.add(entry.id === selectedId ? 'border-[#00d0ff]' : 'border-zinc-700');
    button.setAttribute('aria-pressed', entry.id === selectedId ? 'true' : 'false');

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 72;
    canvas.className = 'mb-2 block h-[72px] w-full [image-rendering:pixelated]';
    const label = document.createElement('div');
    label.className = 'truncate text-[7px] leading-relaxed text-zinc-300';
    label.textContent = entry.label;
    label.title = entry.label;
    button.append(canvas, label);
    if (entry.spriteId) {
      void paintSprite(canvas, entry.spriteId, tint, generation).catch(() => paintChecker(canvas));
    } else {
      void paintSvg(canvas, entry.svgMarkup, generation).catch(() => paintChecker(canvas));
    }
    return button;
  }));
  modal.classList.remove('hidden');
  grid.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
}

export function initAvatarFaceGallery() {
  getElement('avatar-face-gallery-close')?.addEventListener('click', closeAvatarFaceGallery);
  getElement('avatar-face-gallery-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-face-gallery-preset]');
    if (!button) return;
    selectionHandler?.(button.dataset.faceGalleryPreset);
    closeAvatarFaceGallery();
  });
}
