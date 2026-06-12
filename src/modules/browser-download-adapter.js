export function createBrowserDownloadLink(filename, href, {
  documentRef = document,
} = {}) {
  const link = documentRef.createElement('a');
  link.download = filename;
  link.href = href;
  return link;
}

export function triggerDownloadLink(link) {
  link.click();
  return link;
}

export function downloadDataURL(dataUrl, filename, {
  createDownloadLink = createBrowserDownloadLink,
  triggerDownload = triggerDownloadLink,
} = {}) {
  const link = createDownloadLink(filename, dataUrl);
  triggerDownload(link);
  return link;
}

export function downloadBlob(blob, filename, {
  urlApi = URL,
  createDownloadLink = createBrowserDownloadLink,
  triggerDownload = triggerDownloadLink,
} = {}) {
  const href = urlApi.createObjectURL(blob);
  try {
    const link = createDownloadLink(filename, href);
    triggerDownload(link);
    return link;
  } finally {
    urlApi.revokeObjectURL(href);
  }
}
