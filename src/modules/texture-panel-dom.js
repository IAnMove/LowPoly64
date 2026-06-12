function getElement(root, id) {
  return root?.getElementById?.(id) || null;
}

export function showTexturePanelPreview(src, root = globalThis.document) {
  const preview = getElement(root, 'texture-preview');
  if (!preview) return;
  preview.src = src;
  preview.classList.remove('hidden');
}

export function showTextureUVControls(root = globalThis.document) {
  getElement(root, 'uv-controls')?.classList.remove('hidden');
}

export function setupTextureDropZone(dropZone, onFile) {
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('border-white');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-white');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('border-white');
    const file = event.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      onFile(file);
    }
  });
}

export function createTexturePanelDomAdapter({ root = globalThis.document } = {}) {
  return {
    bindTextureDropZone: setupTextureDropZone,
    showPreview: (src) => showTexturePanelPreview(src, root),
    showUvControls: () => showTextureUVControls(root),
  };
}
