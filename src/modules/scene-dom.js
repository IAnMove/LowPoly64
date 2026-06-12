export function getCanvasElement(root = globalThis.document) {
  return root?.getElementById?.('canvas') || null;
}

export function getViewportElement(root = globalThis.document) {
  return root?.getElementById?.('viewport') || null;
}

export function getDevicePixelRatio(source = globalThis.window) {
  return source?.devicePixelRatio || 1;
}

export function bindResizeHandler(handler, target = globalThis.window) {
  target?.addEventListener?.('resize', handler);
  return () => target?.removeEventListener?.('resize', handler);
}

export function createSceneDomAdapter({
  root = globalThis.document,
  viewport = globalThis.window,
} = {}) {
  return {
    bindResizeHandler: (handler) => bindResizeHandler(handler, viewport),
    getCanvasElement: () => getCanvasElement(root),
    getDevicePixelRatio: () => getDevicePixelRatio(viewport),
    getViewportElement: () => getViewportElement(root),
  };
}
