export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      loadImageDataURL(event.target.result)
        .then(({ image, dataUrl }) => resolve({ image, dataUrl }))
        .catch(reject);
    };
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export function loadImageDataURL(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, dataUrl });
    image.onerror = () => reject(new Error('Image load failed'));
    image.src = dataUrl;
  });
}
