import * as THREE from 'three';

function getDefaultRequestFrame() {
  return globalThis.requestAnimationFrame?.bind(globalThis) || (() => {});
}

export function createSceneRenderLoop({
  clock = new THREE.Clock(),
  requestFrame = getDefaultRequestFrame(),
  updateOrbitControls = () => {},
  updateAnimationMixer = () => {},
  updateBones = () => {},
  renderFrame = () => {},
} = {}) {
  let running = false;

  function frame() {
    if (!running) return;

    requestFrame(frame);
    const delta = clock.getDelta();
    updateOrbitControls(delta);
    updateAnimationMixer(delta);
    updateBones(delta);
    renderFrame(delta);
  }

  return {
    start: () => {
      if (running) return;
      running = true;
      frame();
    },
    stop: () => {
      running = false;
    },
    isRunning: () => running,
  };
}
