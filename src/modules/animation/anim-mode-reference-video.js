import * as THREE from 'three';

const referenceVideoState = {
  objectUrl: null,
  speed: 0.5,
  bindingsReady: false,
};

function getReferenceVideoDom() {
  return {
    player: document.getElementById('anim-mode-reference-player'),
    input: document.getElementById('anim-mode-reference-input'),
    empty: document.getElementById('anim-mode-reference-empty'),
    time: document.getElementById('anim-mode-reference-time'),
    status: document.getElementById('anim-mode-reference-status'),
    fps: document.getElementById('anim-mode-reference-fps'),
    speedButtons: Array.from(document.querySelectorAll('[data-reference-video-speed]')),
  };
}

function setReferenceVideoStatus(message, mode = 'idle') {
  const { status } = getReferenceVideoDom();
  if (!status) return;
  status.textContent = message;
  status.className = mode === 'error'
    ? 'text-rose-300 text-[9px] leading-relaxed min-h-[1em]'
    : mode === 'success'
      ? 'text-[#ff77aa] text-[9px] leading-relaxed min-h-[1em]'
      : 'text-zinc-500 text-[9px] leading-relaxed min-h-[1em]';
}

function revokeReferenceVideoUrl() {
  if (!referenceVideoState.objectUrl) return;
  URL.revokeObjectURL(referenceVideoState.objectUrl);
  referenceVideoState.objectUrl = null;
}

function getReferenceVideoFrameStepSeconds() {
  const { fps } = getReferenceVideoDom();
  const fpsValue = Number.parseFloat(fps?.value || '30');
  const safeFps = THREE.MathUtils.clamp(Number.isFinite(fpsValue) ? fpsValue : 30, 1, 120);
  return 1 / safeFps;
}

export function updateReferenceVideoUi() {
  const { player, empty, time, speedButtons } = getReferenceVideoDom();
  if (!player) return;

  if (empty) {
    const hasSource = !!player.currentSrc;
    empty.classList.toggle('hidden', hasSource);
  }

  if (time) {
    const current = Number.isFinite(player.currentTime) ? player.currentTime : 0;
    const duration = Number.isFinite(player.duration) ? player.duration : 0;
    time.textContent = `${current.toFixed(2)} / ${duration.toFixed(2)}`;
  }

  speedButtons.forEach((button) => {
    const buttonSpeed = Number.parseFloat(button.dataset.referenceVideoSpeed || '1');
    const isActive = Math.abs(buttonSpeed - referenceVideoState.speed) < 1e-6;
    button.className = isActive
      ? 'retro-button bg-[#ff77aa] border border-[#ff77aa] text-black px-2 py-1 text-[10px]'
      : 'retro-button bg-zinc-800 border border-[#ff77aa] text-[#ff77aa] px-2 py-1 text-[10px]';
  });
}

export function ensureReferenceVideoBindings() {
  if (referenceVideoState.bindingsReady) return;
  const { player } = getReferenceVideoDom();
  if (!player) return;

  player.addEventListener('loadedmetadata', () => {
    player.playbackRate = referenceVideoState.speed;
    updateReferenceVideoUi();
    setReferenceVideoStatus('Reference video ready. You can slow it down or step through frames.', 'success');
  });
  player.addEventListener('timeupdate', updateReferenceVideoUi);
  player.addEventListener('pause', updateReferenceVideoUi);
  player.addEventListener('play', updateReferenceVideoUi);
  player.addEventListener('ended', () => {
    updateReferenceVideoUi();
    setReferenceVideoStatus('Reference video ended.', 'idle');
  });
  referenceVideoState.bindingsReady = true;
}

export function pauseReferenceVideo() {
  getReferenceVideoDom().player?.pause?.();
}

export function loadReferenceVideo(event) {
  ensureReferenceVideoBindings();
  const { player, input } = getReferenceVideoDom();
  const file = event?.target?.files?.[0] || input?.files?.[0] || null;
  if (!player || !file) {
    setReferenceVideoStatus('Choose a local video file first.', 'error');
    return;
  }

  revokeReferenceVideoUrl();
  referenceVideoState.objectUrl = URL.createObjectURL(file);
  player.pause();
  player.src = referenceVideoState.objectUrl;
  player.currentTime = 0;
  player.load();
  updateReferenceVideoUi();
  setReferenceVideoStatus(`Loading "${file.name}"...`);
}

export function clearReferenceVideo() {
  const { player, input } = getReferenceVideoDom();
  if (!player) return;
  player.pause();
  player.removeAttribute('src');
  player.load();
  if (input) {
    input.value = '';
  }
  revokeReferenceVideoUrl();
  updateReferenceVideoUi();
  setReferenceVideoStatus('Reference video cleared.');
}

export async function toggleReferenceVideoPlayback() {
  ensureReferenceVideoBindings();
  const { player } = getReferenceVideoDom();
  if (!player?.currentSrc) {
    setReferenceVideoStatus('Load a local reference video first.', 'error');
    return;
  }

  if (!player.paused) {
    player.pause();
    setReferenceVideoStatus('Reference video paused.');
    return;
  }

  try {
    player.playbackRate = referenceVideoState.speed;
    await player.play();
    setReferenceVideoStatus(`Playing at ${referenceVideoState.speed}x.`, 'success');
  } catch (error) {
    console.error(error);
    setReferenceVideoStatus('Could not start video playback.', 'error');
  }
}

function stepReferenceVideo(direction) {
  ensureReferenceVideoBindings();
  const { player } = getReferenceVideoDom();
  if (!player?.currentSrc) {
    setReferenceVideoStatus('Load a local reference video first.', 'error');
    return;
  }

  player.pause();
  const step = getReferenceVideoFrameStepSeconds();
  const duration = Number.isFinite(player.duration) ? player.duration : 0;
  const nextTime = THREE.MathUtils.clamp(
    (Number.isFinite(player.currentTime) ? player.currentTime : 0) + (step * direction),
    0,
    Math.max(duration || 0, 0)
  );
  player.currentTime = nextTime;
  updateReferenceVideoUi();
  setReferenceVideoStatus(`Stepped to ${nextTime.toFixed(2)}s using ${step.toFixed(3)}s/frame.`);
}

export function referenceVideoPrevFrame() {
  stepReferenceVideo(-1);
}

export function referenceVideoNextFrame() {
  stepReferenceVideo(1);
}

export function setReferenceVideoSpeed(speed) {
  const nextSpeed = THREE.MathUtils.clamp(Number.parseFloat(speed) || 1, 0.1, 4);
  referenceVideoState.speed = nextSpeed;
  const { player } = getReferenceVideoDom();
  if (player) {
    player.playbackRate = nextSpeed;
  }
  updateReferenceVideoUi();
  setReferenceVideoStatus(`Reference speed set to ${nextSpeed}x.`, 'success');
}
