import { createBrowserPrimitiveController } from './primitive-browser-adapter.js';

const primitiveController = createBrowserPrimitiveController();

export function addPrimitive(type) {
  return primitiveController.addPrimitive(type);
}
