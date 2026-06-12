export function showToastMessage(message, duration = 2000, root = globalThis.document, schedule = setTimeout) {
  const container = root?.getElementById?.('toast-container') || root?.body;
  if (!container) return null;

  const toast = root?.createElement?.('div');
  if (!toast) return null;
  toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-black border-2 border-[#ffcc00] text-[#ffcc00] px-6 py-3 text-xs font-mono z-50 pointer-events-none';
  toast.style.fontFamily = "'Press Start 2P', monospace";
  toast.textContent = message;
  container.appendChild(toast);
  schedule(() => {
    toast.remove();
  }, duration);
  return toast;
}

export function createToastDomAdapter({
  root = globalThis.document,
  schedule = setTimeout,
} = {}) {
  return {
    showToastMessage: (message, duration) => showToastMessage(message, duration, root, schedule),
  };
}
