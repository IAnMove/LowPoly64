export function createTexturePreviewLoop({
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (frameId) => cancelAnimationFrame(frameId),
  shouldRotate = () => false,
  rotatePreview = () => {},
  renderFrame = () => {},
} = {}) {
  let running = false;
  let frameId = null;

  function tick() {
    if (!running) return;
    frameId = requestFrame(tick);
    if (shouldRotate()) rotatePreview();
    renderFrame();
  }

  function start() {
    if (running) return frameId;
    running = true;
    tick();
    return frameId;
  }

  function stop() {
    if (!running) return;
    running = false;
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
  }

  function isRunning() {
    return running;
  }

  return {
    isRunning,
    start,
    stop,
  };
}
