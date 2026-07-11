import { loadSprite } from '../texture/texture-generator.js';

let galleryGeneration = 0;
let selectionHandler = null;
let returnFocusElement = null;
let galleryObserver = null;

function normalizeSearch(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function filterGallery(query = '') {
  const grid = getElement('avatar-face-gallery-grid');
  const count = getElement('avatar-face-gallery-count');
  const empty = getElement('avatar-face-gallery-empty');
  if (!grid) return;
  const needle = normalizeSearch(query);
  const buttons = [...grid.querySelectorAll('[data-face-gallery-preset]')];
  let visible = 0;
  buttons.forEach((button) => {
    const match = !needle || normalizeSearch(`${button.dataset.faceGalleryPreset} ${button.dataset.faceGalleryLabel}`).includes(needle);
    button.classList.toggle('hidden', !match);
    if (match) visible += 1;
  });
  if (count) count.textContent = `${visible}/${buttons.length}`;
  if (empty) {
    empty.classList.toggle('hidden', visible !== 0);
    empty.classList.toggle('flex', visible === 0);
  }
}

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

function disconnectGalleryObserver() {
  galleryObserver?.disconnect();
  galleryObserver = null;
}

async function runPreviewJob(canvas) {
  const job = canvas.avatarPreviewJob;
  if (!job || canvas.dataset.previewRendered === 'true') return;
  canvas.avatarPreviewJob = null;
  try {
    await job();
  } catch {
    paintChecker(canvas);
  }
  if (canvas.isConnected) canvas.dataset.previewRendered = 'true';
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
  disconnectGalleryObserver();
  selectionHandler = null;
  getElement('avatar-face-gallery-modal')?.classList.add('hidden');
  getElement('avatar-face-gallery-grid')?.replaceChildren();
  const search = getElement('avatar-face-gallery-search');
  if (search) search.value = '';
  filterGallery('');
  const focusTarget = returnFocusElement;
  returnFocusElement = null;
  if (focusTarget?.isConnected) focusTarget.focus();
}

export function openAvatarFaceGallery({ title, entries, selectedId, tint, onSelect }) {
  const modal = getElement('avatar-face-gallery-modal');
  const grid = getElement('avatar-face-gallery-grid');
  const titleElement = getElement('avatar-face-gallery-title');
  if (!modal || !grid || !titleElement) return;

  const generation = ++galleryGeneration;
  disconnectGalleryObserver();
  returnFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  selectionHandler = typeof onSelect === 'function' ? onSelect : null;
  titleElement.textContent = title;
  const previewCanvases = [];
  grid.replaceChildren(...entries.map((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.faceGalleryPreset = entry.id;
    button.dataset.faceGalleryLabel = entry.label;
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
      canvas.avatarPreviewJob = () => paintSprite(canvas, entry.spriteId, tint, generation);
    } else {
      canvas.avatarPreviewJob = () => paintSvg(canvas, entry.svgMarkup, generation);
    }
    previewCanvases.push(canvas);
    return button;
  }));
  modal.classList.remove('hidden');
  const search = getElement('avatar-face-gallery-search');
  if (search) search.value = '';
  filterGallery('');
  if (typeof IntersectionObserver === 'function') {
    galleryObserver = new IntersectionObserver((records) => {
      records.forEach((record) => {
        if (!record.isIntersecting) return;
        galleryObserver?.unobserve(record.target);
        void runPreviewJob(record.target);
      });
    }, { root: grid, rootMargin: '144px 0px', threshold: 0.01 });
    previewCanvases.forEach((canvas) => galleryObserver.observe(canvas));
  } else {
    previewCanvases.forEach((canvas) => { void runPreviewJob(canvas); });
  }
  grid.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
  search?.focus();
}

export function initAvatarFaceGallery() {
  getElement('avatar-face-gallery-modal')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const modal = event.currentTarget;
    const focusable = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.classList.contains('hidden') && element.getClientRects().length > 0);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  getElement('avatar-face-gallery-close')?.addEventListener('click', closeAvatarFaceGallery);
  getElement('avatar-face-gallery-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-face-gallery-preset]');
    if (!button) return;
    selectionHandler?.(button.dataset.faceGalleryPreset);
    closeAvatarFaceGallery();
  });
  getElement('avatar-face-gallery-search')?.addEventListener('input', (event) => {
    filterGallery(event.target.value);
  });
}
