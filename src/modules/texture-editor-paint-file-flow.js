export function loadPaintImageFromFileInput({
  createFileInput,
  loadImageFile,
  applyImage,
  saveSnapshot,
  onCommitChange = () => {},
  onPreviewChange = () => {},
  onError = () => {},
} = {}) {
  const input = createFileInput();
  input.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const { image } = await loadImageFile(file);
      applyImage(image);
      saveSnapshot();
      onCommitChange();
      onPreviewChange();
    } catch (error) {
      onError(error);
    }
  }, { once: true });
  input.click();
  return input;
}

export function downloadPaintCanvas(canvas, {
  downloadDataURL,
  filename = 'texture.png',
  mimeType = 'image/png',
} = {}) {
  return downloadDataURL(canvas.toDataURL(mimeType), filename);
}
