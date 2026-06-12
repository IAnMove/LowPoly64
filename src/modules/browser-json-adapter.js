import { downloadBlob } from './browser-download-adapter.js';

export function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  return downloadBlob(blob, filename);
}

export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        resolve(JSON.parse(event.target.result));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error('File read failed'));
    };
    reader.readAsText(file);
  });
}
