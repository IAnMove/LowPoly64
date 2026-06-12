import { onResize } from './scene.js';
import { createPanelController } from './panel-controller.js';

export function createBrowserPanelController({
  root = globalThis.document,
  viewport = globalThis.window,
  onResizeCommand = onResize,
  schedule = setTimeout,
  createController = createPanelController,
} = {}) {
  return createController({
    getPanelElements: (config) => ({
      panel: root?.getElementById?.(config.panelId) || null,
      icon: root?.getElementById?.(config.iconId) || null,
    }),
    isNarrowViewport: () => viewport?.matchMedia?.('(max-width: 700px)').matches || false,
    scheduleResize: (callback, delay) => schedule(callback, delay),
    onResize: onResizeCommand,
  });
}
