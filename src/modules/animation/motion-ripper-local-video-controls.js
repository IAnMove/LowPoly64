import {
  LOCAL_VIDEO_DEFAULT_SPEED,
  LOCAL_VIDEO_SPEEDS,
} from './motion-ripper-constants.js';
import {
  formatVideoTime,
  getLocalVideoFrameStepSeconds as resolveLocalVideoFrameStepSeconds,
  resolveLocalVideoSpeed,
} from './motion-ripper-video-source.js';

export function createMotionRipperLocalVideoControls(context) {
  const {
    ui,
    getLocalVideoObjectUrl,
    setLocalVideoObjectUrl,
    getCaptureSourceKind,
    setCaptureSourceKind,
    getMediaStream,
    stopRecording,
    setStatus,
  } = context;

  function getLocalVideoSpeed() {
    return resolveLocalVideoSpeed(ui.video?.playbackRate, LOCAL_VIDEO_SPEEDS, LOCAL_VIDEO_DEFAULT_SPEED);
  }

  function getLocalVideoFrameStepSeconds() {
    return resolveLocalVideoFrameStepSeconds(ui.localVideoFps?.value);
  }

  function updateLocalVideoUi() {
    const hasLocalSource = !!getLocalVideoObjectUrl();
    const currentTime = ui.video?.currentTime || 0;
    const duration = ui.video?.duration || 0;

    if (ui.localVideoTime) {
      ui.localVideoTime.textContent = `${formatVideoTime(currentTime)} / ${formatVideoTime(duration)}`;
    }
    if (ui.clearLocalVideoBtn) {
      ui.clearLocalVideoBtn.disabled = !hasLocalSource;
      ui.clearLocalVideoBtn.className = hasLocalSource
        ? 'retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600'
        : 'retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
    }

    const activeSpeed = getLocalVideoSpeed();
    (ui.localVideoSpeedButtons || []).forEach((button) => {
      const speed = Number.parseFloat(button.dataset.motionRipperLocalVideoSpeed || '1');
      const isActive = Math.abs(speed - activeSpeed) < 1e-6;
      button.className = isActive
        ? 'retro-button bg-[#ff77aa] text-black px-2 py-1 text-[8px] border border-[#ff77aa]'
        : 'retro-button bg-zinc-800 text-[#ff77aa] px-2 py-1 text-[8px] border border-[#ff77aa]/70';
    });
  }

  function ensureLocalVideoBindings() {
    if (!ui.video || ui.video.dataset.motionRipperLocalVideoBound) return;
    ui.video.addEventListener('loadedmetadata', updateLocalVideoUi);
    ui.video.addEventListener('durationchange', updateLocalVideoUi);
    ui.video.addEventListener('timeupdate', updateLocalVideoUi);
    ui.video.addEventListener('play', updateLocalVideoUi);
    ui.video.addEventListener('pause', updateLocalVideoUi);
    ui.video.addEventListener('ended', () => {
      stopRecording();
      updateLocalVideoUi();
      if (getCaptureSourceKind() === 'local-video') {
        setStatus('Local video ended. Review the preview or record another take.', 'info');
      }
    });
    ui.video.dataset.motionRipperLocalVideoBound = 'true';
  }

  function revokeLocalVideoObjectUrl() {
    const objectUrl = getLocalVideoObjectUrl();
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    setLocalVideoObjectUrl(null);
  }

  function clearLocalVideoSource({ clearInput = true, clearVideo = true } = {}) {
    const wasLocalSource = getCaptureSourceKind() === 'local-video';
    revokeLocalVideoObjectUrl();
    if (wasLocalSource) {
      setCaptureSourceKind(null);
    }
    if (clearInput && ui.localVideoInput) {
      ui.localVideoInput.value = '';
    }
    if (clearVideo && ui.video && !getMediaStream()) {
      ui.video.pause();
      ui.video.removeAttribute('src');
      ui.video.load();
    }
    updateLocalVideoUi();
  }

  return {
    getLocalVideoSpeed,
    getLocalVideoFrameStepSeconds,
    updateLocalVideoUi,
    ensureLocalVideoBindings,
    clearLocalVideoSource,
  };
}
