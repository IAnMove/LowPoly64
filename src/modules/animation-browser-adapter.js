import { state } from './state.js';
import { createAnimationController } from './animation-controller.js';

export function createBrowserAnimationController({
  getAnimationState = () => state,
  createFacadeController = createAnimationController,
} = {}) {
  return createFacadeController({
    getAnimationState,
  });
}
