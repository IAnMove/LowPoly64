function sanitizeSvgColor(svgMarkup) {
  return svgMarkup
    .replace(/currentColor/g, 'black')
    .replace(/stroke="[^"]*"/g, 'stroke="black"')
    .replace(/fill="none"/g, 'fill="transparent"');
}

export function normalizeSvgMarkup(svgMarkup) {
  if (typeof svgMarkup !== 'string') return '';
  const trimmed = svgMarkup.trim();
  const svgStartIndex = trimmed.search(/<svg\b/i);
  if (svgStartIndex === -1) return '';

  const prefix = trimmed.slice(0, svgStartIndex);
  const hasOnlyAllowedPreamble = /^(?:\s|<\?xml[\s\S]*?\?>|<!doctype[\s\S]*?>|<!--[\s\S]*?-->)*$/i.test(prefix);
  if (!hasOnlyAllowedPreamble) return '';

  const svgDocument = trimmed.slice(svgStartIndex);
  return sanitizeSvgColor(svgDocument);
}

export function rasterizeSvgToFilledSvg(svgMarkup, options = {}) {
  const gridSize = Math.max(8, options.gridSize || 64);
  const threshold = options.threshold ?? 128;
  const fitScale = options.fitScale ?? 0.85;
  const normalized = normalizeSvgMarkup(svgMarkup);

  return new Promise((resolve) => {
    if (!normalized) {
      resolve('');
      return;
    }

    const blob = new Blob([normalized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = gridSize;
      canvas.height = gridSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve('');
        return;
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, gridSize, gridSize);

      const scale = Math.min(gridSize / (image.width || gridSize), gridSize / (image.height || gridSize)) * fitScale;
      const width = (image.width || gridSize) * scale;
      const height = (image.height || gridSize) * scale;
      const offsetX = (gridSize - width) / 2;
      const offsetY = (gridSize - height) / 2;
      ctx.drawImage(image, offsetX, offsetY, width, height);

      const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
      const cellSize = Math.max(1, Math.floor(200 / gridSize));
      const totalSize = cellSize * gridSize;
      let pathData = '';

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const index = (y * gridSize + x) * 4;
          const brightness = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
          if (brightness < threshold) {
            const svgX = x * cellSize;
            const svgY = y * cellSize;
            pathData += `M${svgX},${svgY}h${cellSize}v${cellSize}h${-cellSize}Z `;
          }
        }
      }

      URL.revokeObjectURL(url);
      if (!pathData.trim()) {
        resolve('');
        return;
      }

      resolve(`<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}"><path d="${pathData.trim()}" fill="black"/></svg>`);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };

    image.src = url;
  });
}
