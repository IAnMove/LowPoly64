import * as THREE from 'three';
import { EDITABLE_LANDMARK_INDICES } from './motion-ripper-constants.js';
import { getContainedVideoRect } from './motion-ripper-overlay.js';

export function createMotionRipperOverlayController(context) {
  const {
    ui,
    captureCropState,
    frameEditState,
    getCanonicalCapturedFrames,
    getIsRecording,
    getLatestLandmarks,
    drawOverlay,
    setStatus,
  } = context;

  function updateOverlayInteractionUi() {
    if (!ui.overlay) return;
    const interactive = captureCropState.selecting || frameEditState.active;
    ui.overlay.style.pointerEvents = interactive ? 'auto' : 'none';
    ui.overlay.style.cursor = frameEditState.active
      ? (frameEditState.draggingLandmarkIndex >= 0 ? 'grabbing' : 'grab')
      : captureCropState.selecting
        ? 'crosshair'
        : 'default';
  }

  function updateCaptureAreaUi() {
    const hasCustomRegion = !!captureCropState.region;
    const canEditArea = !frameEditState.active;
    if (ui.selectAreaBtn) {
      ui.selectAreaBtn.disabled = !canEditArea;
      ui.selectAreaBtn.textContent = captureCropState.selecting ? 'DRAW AREA...' : 'SELECT AREA';
      ui.selectAreaBtn.className = captureCropState.selecting && canEditArea
        ? 'retro-button bg-[#00d0ff] text-black py-2 text-[9px] font-bold border-2 border-[#00d0ff]'
        : canEditArea
          ? 'retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600'
          : 'retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
    }
    if (ui.resetAreaBtn) {
      ui.resetAreaBtn.disabled = !hasCustomRegion || !canEditArea;
      ui.resetAreaBtn.className = hasCustomRegion && canEditArea
        ? 'retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600'
        : 'retro-button bg-zinc-900 text-zinc-600 py-2 text-[9px] border border-zinc-800 opacity-60 cursor-not-allowed';
    }
    if (ui.areaLabel) {
      if (captureCropState.selecting) {
        ui.areaLabel.textContent = 'Capture area: drag on the video to isolate the dancer you want.';
        ui.areaLabel.className = 'text-[8px] leading-relaxed text-[#00d0ff]';
      } else if (hasCustomRegion) {
        const { width, height } = captureCropState.region;
        ui.areaLabel.textContent = `Capture area: custom ${(width * 100).toFixed(0)}% x ${(height * 100).toFixed(0)}%.`;
        ui.areaLabel.className = 'text-[8px] leading-relaxed text-[#ffcc00]';
      } else {
        ui.areaLabel.textContent = 'Capture area: full frame.';
        ui.areaLabel.className = 'text-[8px] leading-relaxed text-zinc-500';
      }
    }
    updateOverlayInteractionUi();
  }

  function updateFrameEditUi() {
    const canEdit = !getIsRecording() && getCanonicalCapturedFrames().length > 0;
    if (ui.editFrameBtn) {
      ui.editFrameBtn.disabled = !canEdit || frameEditState.active;
      ui.editFrameBtn.className = !canEdit || frameEditState.active
        ? 'retro-button bg-zinc-900 text-zinc-600 py-2 px-3 text-[8px] border border-zinc-800 opacity-60 cursor-not-allowed'
        : 'retro-button bg-zinc-800 text-[#00d0ff] py-2 px-3 text-[8px] border border-[#00d0ff]/60';
    }
    if (ui.editToolbar) {
      ui.editToolbar.classList.toggle('hidden', !frameEditState.active);
      ui.editToolbar.classList.toggle('flex', frameEditState.active);
    }
    if (ui.editStatus) {
      ui.editStatus.classList.toggle('hidden', !frameEditState.active);
      if (frameEditState.active) {
        const currentFrame = frameEditState.frameIndex >= 0 ? frameEditState.frameIndex + 1 : 0;
        ui.editStatus.textContent = `Edit frame ${currentFrame}. Drag joints above. Lower preview stays frozen as reference.`;
        ui.editStatus.className = 'text-[#00d0ff] text-[8px] leading-relaxed mt-1';
      } else {
        ui.editStatus.textContent = 'Edit frame mode.';
        ui.editStatus.className = 'hidden text-zinc-500 text-[8px] leading-relaxed mt-1';
      }
    }
    updateOverlayInteractionUi();
  }

  function getActiveCaptureRegion() {
    return captureCropState.region || { x: 0, y: 0, width: 1, height: 1 };
  }

  function clearCaptureDraft() {
    captureCropState.dragging = false;
    captureCropState.anchor = null;
    captureCropState.draftRegion = null;
  }

  function setCaptureRegion(region) {
    if (!region) {
      captureCropState.region = null;
      return;
    }
    const x = THREE.MathUtils.clamp(region.x, 0, 1);
    const y = THREE.MathUtils.clamp(region.y, 0, 1);
    const maxWidth = Math.max(0, 1 - x);
    const maxHeight = Math.max(0, 1 - y);
    const width = THREE.MathUtils.clamp(region.width, 0, maxWidth);
    const height = THREE.MathUtils.clamp(region.height, 0, maxHeight);
    captureCropState.region = width >= 0.04 && height >= 0.04
      ? { x, y, width, height }
      : null;
  }

  function getOverlayVideoRect() {
    if (!ui.overlay || !ui.video) return null;
    if (frameEditState.active && (!ui.video.videoWidth || !ui.video.videoHeight)) {
      return {
        x: 0,
        y: 0,
        width: ui.overlay.width || 1,
        height: ui.overlay.height || 1,
      };
    }
    return getContainedVideoRect(
      ui.overlay.width || 1,
      ui.overlay.height || 1,
      ui.video.videoWidth || 1,
      ui.video.videoHeight || 1
    );
  }

  function getNormalizedPointFromOverlayEvent(event) {
    if (!ui.overlay) return null;
    const bounds = ui.overlay.getBoundingClientRect();
    const scaleX = bounds.width > 0 ? ui.overlay.width / bounds.width : 1;
    const scaleY = bounds.height > 0 ? ui.overlay.height / bounds.height : 1;
    const canvasX = (event.clientX - bounds.left) * scaleX;
    const canvasY = (event.clientY - bounds.top) * scaleY;
    const rect = getOverlayVideoRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    const x = THREE.MathUtils.clamp((canvasX - rect.x) / rect.width, 0, 1);
    const y = THREE.MathUtils.clamp((canvasY - rect.y) / rect.height, 0, 1);
    return { x, y };
  }

  function buildNormalizedRegionFromPoints(a, b) {
    if (!a || !b) return null;
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return {
      x,
      y,
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    };
  }

  function getWorkingEditLandmarks() {
    return frameEditState.workingFrame?.landmarks || [];
  }

  function getOriginalEditLandmarks() {
    return frameEditState.originalFrame?.landmarks || [];
  }

  function projectNormalizedLandmarkToOverlay(landmark, rect) {
    if (!landmark || !rect) return null;
    return {
      x: rect.x + (landmark.x ?? 0) * rect.width,
      y: rect.y + (landmark.y ?? 0) * rect.height,
    };
  }

  function hitTestEditableLandmark(point) {
    const rect = getOverlayVideoRect();
    if (!point || !rect) return -1;
    const workingLandmarks = getWorkingEditLandmarks();
    let bestIndex = -1;
    let bestDistanceSq = 14 * 14;
    EDITABLE_LANDMARK_INDICES.forEach((index) => {
      const projected = projectNormalizedLandmarkToOverlay(workingLandmarks[index], rect);
      if (!projected) return;
      const dx = projected.x - (rect.x + point.x * rect.width);
      const dy = projected.y - (rect.y + point.y * rect.height);
      const distanceSq = (dx * dx) + (dy * dy);
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function setEditedLandmarkPosition(index, point) {
    const workingLandmarks = getWorkingEditLandmarks();
    if (!workingLandmarks[index]) return;
    workingLandmarks[index].x = THREE.MathUtils.clamp(point.x, 0, 1);
    workingLandmarks[index].y = THREE.MathUtils.clamp(point.y, 0, 1);
    workingLandmarks[index].visibility = Math.max(workingLandmarks[index].visibility ?? 0, 0.95);
  }

  function onOverlayPointerDown(event) {
    if (frameEditState.active) {
      const point = getNormalizedPointFromOverlayEvent(event);
      if (!point) return;
      const landmarkIndex = hitTestEditableLandmark(point);
      if (landmarkIndex < 0) return;
      frameEditState.draggingLandmarkIndex = landmarkIndex;
      updateOverlayInteractionUi();
      ui.overlay?.setPointerCapture?.(event.pointerId);
      drawOverlay();
      event.preventDefault();
      return;
    }
    if (!captureCropState.selecting) return;
    const point = getNormalizedPointFromOverlayEvent(event);
    if (!point) return;
    captureCropState.dragging = true;
    captureCropState.anchor = point;
    captureCropState.draftRegion = { x: point.x, y: point.y, width: 0, height: 0 };
    ui.overlay?.setPointerCapture?.(event.pointerId);
    drawOverlay(getLatestLandmarks());
    event.preventDefault();
  }

  function onOverlayPointerMove(event) {
    if (frameEditState.active) {
      if (frameEditState.draggingLandmarkIndex < 0) return;
      const point = getNormalizedPointFromOverlayEvent(event);
      if (!point) return;
      setEditedLandmarkPosition(frameEditState.draggingLandmarkIndex, point);
      drawOverlay();
      event.preventDefault();
      return;
    }
    if (!captureCropState.selecting || !captureCropState.dragging) return;
    const point = getNormalizedPointFromOverlayEvent(event);
    if (!point) return;
    captureCropState.draftRegion = buildNormalizedRegionFromPoints(captureCropState.anchor, point);
    drawOverlay(getLatestLandmarks());
    event.preventDefault();
  }

  function onOverlayPointerUp(event) {
    if (frameEditState.active) {
      if (frameEditState.draggingLandmarkIndex >= 0) {
        const point = getNormalizedPointFromOverlayEvent(event);
        if (point) {
          setEditedLandmarkPosition(frameEditState.draggingLandmarkIndex, point);
        }
        frameEditState.draggingLandmarkIndex = -1;
        updateOverlayInteractionUi();
        drawOverlay();
        event.preventDefault();
      }
      return;
    }
    if (!captureCropState.selecting || !captureCropState.dragging) return;
    const point = getNormalizedPointFromOverlayEvent(event) || captureCropState.anchor;
    const region = buildNormalizedRegionFromPoints(captureCropState.anchor, point);
    clearCaptureDraft();
    captureCropState.selecting = false;
    setCaptureRegion(region);
    updateCaptureAreaUi();
    drawOverlay(getLatestLandmarks());
    if (captureCropState.region) {
      setStatus('Capture area updated. Tracking now follows only that zone.', 'success');
    } else {
      setStatus('Capture area was too small. Full frame capture restored.', 'error');
    }
    event.preventDefault();
  }

  function bindOverlayInteractions() {
    if (captureCropState.overlayBound || !ui.overlay) return;
    ui.overlay.addEventListener('pointerdown', onOverlayPointerDown);
    ui.overlay.addEventListener('pointermove', onOverlayPointerMove);
    window.addEventListener('pointerup', onOverlayPointerUp);
    window.addEventListener('pointercancel', onOverlayPointerUp);
    captureCropState.overlayBound = true;
  }

  return {
    bindOverlayInteractions,
    updateCaptureAreaUi,
    updateFrameEditUi,
    getActiveCaptureRegion,
    clearCaptureDraft,
    setCaptureRegion,
    getWorkingEditLandmarks,
    getOriginalEditLandmarks,
  };
}
