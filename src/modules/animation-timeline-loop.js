function getDefaultRequestFrame() {
  return globalThis.requestAnimationFrame?.bind(globalThis) || (() => {});
}

export function createAnimationTimelineLoop({
  requestFrame = getDefaultRequestFrame(),
  getAnimationProgress = () => null,
  isAnimationPlaying = () => false,
  updateAnimationTimelinePlayback = () => {},
} = {}) {
  let running = false;

  function frame() {
    if (!running) return;

    requestFrame(frame);
    updateAnimationTimelinePlayback(getAnimationProgress(), isAnimationPlaying());
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
