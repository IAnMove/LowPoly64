import { createShortcutController } from './shortcut-controller.js';

const shortcutController = createShortcutController();

export function configureShortcutHooks(hooks = {}) {
  shortcutController.configureShortcutHooks(hooks);
}

export function resetShortcutHooks() {
  shortcutController.resetShortcutHooks();
}

export function onKeyDown(event) {
  shortcutController.onKeyDown(event);
}
