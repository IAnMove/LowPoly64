import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { compileAnimation } from './animation.js';
import {
  buildNamedNodeLookup,
  cloneGroupForPreview,
  createPreviewRenderer,
  createPreviewScene,
  createRigHelperGroup,
  disposePreviewObject3D,
  framePreviewCamera,
  resizePreviewViewport,
} from './motion-ripper-preview-runtime.js';
import {
  collectResolvedPreviewRigFrame as collectPreviewRigFrame,
  normalizePreviewRigFrame,
} from './motion-ripper-preview-rig.js';
import { PREVIEW_RIG_JOINTS } from './motion-ripper-constants.js';
import { isCaptureGeneratedGroup, resolveCaptureTargetConfig } from './motion-ripper-target-config.js';
import { applyCapturedSkeletonToGroup } from './motion-ripper-retargeting.js';
import { updateMotionRipperPreviewUi } from './motion-ripper-preview-ui-controls.js';

export function createMotionRipperPreviewController({
  ui,
  previewState,
  frameEditState,
  ensureUi,
  updateFrameEditUi,
  getMotionGroup,
  getActiveGroup,
  getIsRecording,
  getCanonicalCapturedFrames,
  resolveCaptureTrackOptions,
  buildCanonicalAnimationDefinition,
  getCaptureRetargetingOptions,
  buildCaptureAnimationForTargetGroup,
}) {
  function ensurePreviewRuntime() {
    ensureUi();
    if (previewState.renderer || !ui.previewModelCanvas || !ui.previewRigCanvas || !ui.previewCapturedCanvas) return;
  
    previewState.scene = createPreviewScene({ withLights: true });
    previewState.rigScene = createPreviewScene({ withLights: false });
    previewState.capturedScene = createPreviewScene({ withLights: false });
  
    previewState.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    previewState.camera.position.set(8, 6, 10);
    previewState.rigCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    previewState.rigCamera.position.set(8, 6, 10);
    previewState.capturedCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    previewState.capturedCamera.position.set(8, 6, 10);
  
    previewState.renderer = createPreviewRenderer(ui.previewModelCanvas);
    previewState.rigRenderer = createPreviewRenderer(ui.previewRigCanvas);
    previewState.capturedRenderer = createPreviewRenderer(ui.previewCapturedCanvas);
  
    previewState.controls = new OrbitControls(previewState.camera, ui.previewModelCanvas);
    previewState.controls.enableDamping = true;
    previewState.rigControls = new OrbitControls(previewState.rigCamera, ui.previewRigCanvas);
    previewState.rigControls.enableDamping = true;
    previewState.capturedControls = new OrbitControls(previewState.capturedCamera, ui.previewCapturedCanvas);
    previewState.capturedControls.enableDamping = true;
    setupPreviewControlSync(previewState.controls, previewState.camera);
    setupPreviewControlSync(previewState.rigControls, previewState.rigCamera);
    setupPreviewControlSync(previewState.capturedControls, previewState.capturedCamera);
  
    resizePreviewViewports();
    updatePreviewUi();
    startPreviewLoop();
  }
  
  function startPreviewLoop() {
    if (previewState.frameId || !previewState.renderer) return;
    previewState.lastRenderAt = performance.now();
  
    const renderFrame = () => {
      previewState.frameId = requestAnimationFrame(renderFrame);
  
      if (!previewState.renderer || !previewState.scene || !previewState.camera) return;
  
      const { modelResized, rigResized, capturedResized } = resizePreviewViewports();
      if (!previewState.cameraAdjusted) {
        runWithPreviewCameraSyncSuppressed(() => {
          if (modelResized && previewState.model) {
            framePreviewCamera(previewState.camera, previewState.controls, previewState.model);
          }
          if (rigResized && previewState.rigHelperGroup) {
            framePreviewCamera(previewState.rigCamera, previewState.rigControls, previewState.rigHelperGroup);
          }
          if (capturedResized && previewState.capturedHelperGroup) {
            framePreviewCamera(previewState.capturedCamera, previewState.capturedControls, previewState.capturedHelperGroup);
          }
        });
      }
  
      const now = performance.now();
      const deltaSeconds = Math.min(Math.max((now - previewState.lastRenderAt) / 1000, 0), 0.1);
      const previewDeltaSeconds = deltaSeconds * getPreviewSpeedMultiplier();
      previewState.lastRenderAt = now;
  
      let controlChanged = false;
      controlChanged = previewState.controls?.update() || controlChanged;
      controlChanged = previewState.rigControls?.update() || controlChanged;
      controlChanged = previewState.capturedControls?.update() || controlChanged;
  
      if (previewState.playing && previewState.mixer) {
        previewState.mixer.update(previewDeltaSeconds);
      }
      if (previewState.playing && previewState.rigMixer) {
        previewState.rigMixer.update(previewDeltaSeconds);
      }
  
      syncPreviewFrameCounter();
      const shouldRender = previewState.playing || modelResized || rigResized || capturedResized || controlChanged || previewState.needsRender;
      if (!shouldRender) {
        return;
      }
  
      updateRigPreviewHelpers();
      updateCapturedPreviewHelpers();
      previewState.renderer.render(previewState.scene, previewState.camera);
      previewState.rigRenderer?.render(previewState.rigScene, previewState.rigCamera);
      previewState.capturedRenderer?.render(previewState.capturedScene, previewState.capturedCamera);
      previewState.needsRender = false;
    };
  
    renderFrame();
  }
  
  function disposePreviewRuntime() {
    if (previewState.frameId) {
      cancelAnimationFrame(previewState.frameId);
      previewState.frameId = 0;
    }
  
    clearPreviewModel();
  
    previewState.controls?.dispose?.();
    previewState.rigControls?.dispose?.();
    previewState.capturedControls?.dispose?.();
    previewState.renderer?.dispose?.();
    previewState.rigRenderer?.dispose?.();
    previewState.capturedRenderer?.dispose?.();
  
    previewState.renderer = null;
    previewState.scene = null;
    previewState.camera = null;
    previewState.controls = null;
    previewState.rigRenderer = null;
    previewState.rigScene = null;
    previewState.rigCamera = null;
    previewState.rigControls = null;
    previewState.capturedRenderer = null;
    previewState.capturedScene = null;
    previewState.capturedCamera = null;
    previewState.capturedControls = null;
    previewState.lastRenderAt = 0;
    previewState.playing = false;
    previewState.needsRender = false;
    previewState.cameraAdjusted = false;
    previewState.suppressControlSync = false;
    previewState.syncReferenceTarget = null;
  }
  
  function resizePreviewViewports() {
    return {
      modelResized: resizePreviewViewport(ui.previewModelStage, ui.previewModelCanvas, previewState.renderer, previewState.camera),
      rigResized: resizePreviewViewport(ui.previewRigStage, ui.previewRigCanvas, previewState.rigRenderer, previewState.rigCamera),
      capturedResized: resizePreviewViewport(ui.previewCapturedStage, ui.previewCapturedCanvas, previewState.capturedRenderer, previewState.capturedCamera),
    };
  }
  
  function getPreviewControlBundles() {
    return [
      { controls: previewState.controls, camera: previewState.camera },
      { controls: previewState.rigControls, camera: previewState.rigCamera },
      { controls: previewState.capturedControls, camera: previewState.capturedCamera },
    ].filter(({ controls, camera }) => !!controls && !!camera);
  }
  
  function runWithPreviewCameraSyncSuppressed(callback) {
    previewState.suppressControlSync = true;
    try {
      callback?.();
    } finally {
      previewState.suppressControlSync = false;
    }
  }
  
  function syncPreviewControlsFrom(sourceControls, sourceCamera) {
    if (!sourceControls || !sourceCamera) return;
  
    const nextTarget = sourceControls.target.clone();
    const referenceTarget = previewState.syncReferenceTarget?.clone() || nextTarget.clone();
    const targetDelta = nextTarget.clone().sub(referenceTarget);
    const offset = sourceCamera.position.clone().sub(nextTarget);
  
    runWithPreviewCameraSyncSuppressed(() => {
      getPreviewControlBundles().forEach(({ controls, camera }) => {
        if (controls === sourceControls) return;
        controls.target.add(targetDelta);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      });
    });
  
    previewState.syncReferenceTarget = nextTarget;
  }
  
  function setupPreviewControlSync(controls, camera) {
    if (!controls || !camera) return;
    controls.addEventListener('start', () => {
      if (previewState.suppressControlSync) return;
      previewState.syncReferenceTarget = controls.target.clone();
    });
    controls.addEventListener('change', () => {
      if (previewState.suppressControlSync) return;
      previewState.cameraAdjusted = true;
      previewState.needsRender = true;
      syncPreviewControlsFrom(controls, camera);
    });
  }
  
  function collectResolvedPreviewRigFrame() {
    return collectPreviewRigFrame({
      targetMap: previewState.targetMap,
      nodeLookup: previewState.rigNodeLookup,
      suppressedBones: previewState.suppressedBones,
    });
  }
  
  function updateRigPreviewHelpers() {
    if (!previewState.rigHelperGroup) return;
  
    const frame = previewState.resolvedFrames[previewState.currentFrameIndex] || previewState.resolvedFrames[0] || null;
    const resolvedRig = frame?.resolvedRig || null;
    const positionsByJoint = {};
    PREVIEW_RIG_JOINTS.forEach((jointName) => {
      const sphere = previewState.rigJointMeshes[jointName];
      if (!sphere) return;
      const position = resolvedRig?.[jointName] || null;
      const visible = Array.isArray(position) && position.length === 3;
      sphere.visible = visible;
      if (visible) {
        sphere.position.set(position[0], position[1], position[2]);
        positionsByJoint[jointName] = sphere.position.clone();
      }
    });
  
    previewState.rigLines.forEach(({ startJointName, endJointName, line }) => {
      const start = positionsByJoint[startJointName];
      const end = positionsByJoint[endJointName];
      const visible = !!start && !!end;
      line.visible = visible;
      if (!visible) return;
      const positionAttr = line.geometry.getAttribute('position');
      positionAttr.setXYZ(0, start.x, start.y, start.z);
      positionAttr.setXYZ(1, end.x, end.y, end.z);
      positionAttr.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    });
  }
  
  function updateCapturedPreviewHelpers() {
    if (!previewState.capturedHelperGroup) return;
  
    const frame = previewState.capturedFrames[previewState.currentFrameIndex] || previewState.capturedFrames[0] || null;
    const capturedRig = frame?.capturedRig || null;
    const positionsByJoint = {};
  
    PREVIEW_RIG_JOINTS.forEach((jointName) => {
      const sphere = previewState.capturedJointMeshes[jointName];
      if (!sphere) return;
      const position = capturedRig?.[jointName] || null;
      const visible = Array.isArray(position) && position.length === 3;
      sphere.visible = visible;
      if (visible) {
        sphere.position.set(position[0], position[1], position[2]);
        positionsByJoint[jointName] = sphere.position.clone();
      }
    });
  
    previewState.capturedLines.forEach(({ startJointName, endJointName, line }) => {
      const start = positionsByJoint[startJointName];
      const end = positionsByJoint[endJointName];
      const visible = !!start && !!end;
      line.visible = visible;
      if (!visible) return;
      const positionAttr = line.geometry.getAttribute('position');
      positionAttr.setXYZ(0, start.x, start.y, start.z);
      positionAttr.setXYZ(1, end.x, end.y, end.z);
      positionAttr.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    });
  }
  
  function clearPreviewAnimation() {
    if (previewState.mixer) {
      previewState.mixer.stopAllAction();
      if (previewState.model) {
        previewState.mixer.uncacheRoot(previewState.model);
      }
    }
    if (previewState.rigMixer) {
      previewState.rigMixer.stopAllAction();
      if (previewState.rigModel) {
        previewState.rigMixer.uncacheRoot(previewState.rigModel);
      }
    }
    previewState.mixer = null;
    previewState.action = null;
    previewState.rigMixer = null;
    previewState.rigAction = null;
    previewState.clip = null;
    previewState.capturedFrames = [];
    previewState.resolvedFrames = [];
    previewState.frameTimes = [];
    previewState.currentFrameIndex = 0;
    previewState.totalFrameCount = 0;
    previewState.playing = false;
    previewState.needsRender = true;
  }
  
  function clearPreviewModel() {
    clearPreviewAnimation();
    if (previewState.model && previewState.scene) {
      previewState.scene.remove(previewState.model);
      disposePreviewObject3D(previewState.model);
    }
    if (previewState.rigHelperGroup && previewState.rigScene) {
      previewState.rigScene.remove(previewState.rigHelperGroup);
      disposePreviewObject3D(previewState.rigHelperGroup);
    }
    if (previewState.rigModel && previewState.rigScene) {
      previewState.rigScene.remove(previewState.rigModel);
      disposePreviewObject3D(previewState.rigModel);
    }
    if (previewState.capturedHelperGroup && previewState.capturedScene) {
      previewState.capturedScene.remove(previewState.capturedHelperGroup);
      disposePreviewObject3D(previewState.capturedHelperGroup);
    }
    previewState.model = null;
    previewState.rigModel = null;
    previewState.rigHelperGroup = null;
    previewState.rigJointMeshes = {};
    previewState.rigLines = [];
    previewState.capturedHelperGroup = null;
    previewState.capturedJointMeshes = {};
    previewState.capturedLines = [];
    previewState.targetMap = null;
    previewState.suppressedBones = null;
    previewState.rigNodeLookup = null;
    updatePreviewUi();
  }
  
  function setPreviewStatus(message, tone = 'info') {
    if (!ui.previewStatus) return;
    ui.previewStatus.textContent = message;
    ui.previewStatus.className = tone === 'error'
      ? 'text-rose-300 text-[8px] leading-relaxed mt-1'
      : tone === 'success'
        ? 'text-emerald-300 text-[8px] leading-relaxed mt-1'
        : 'text-zinc-500 text-[8px] leading-relaxed mt-1';
  }
  
  function getFrameIndexForPreviewTime(time) {
    const frameTimes = previewState.frameTimes;
    if (!frameTimes.length) return 0;
    let frameIndex = 0;
    for (let index = 0; index < frameTimes.length; index += 1) {
      if (time + 1e-5 >= frameTimes[index]) {
        frameIndex = index;
      } else {
        break;
      }
    }
    return frameIndex;
  }
  
  function syncPreviewFrameCounter() {
    const totalFrames = previewState.totalFrameCount || 0;
    let currentFrame = totalFrames > 0 ? 1 : 0;
  
    if (totalFrames > 0 && previewState.action && previewState.clip) {
      if (previewState.playing) {
        const duration = Math.max(previewState.clip.duration || 0, 0.0001);
        const time = THREE.MathUtils.clamp(previewState.action.time, 0, duration);
        previewState.currentFrameIndex = getFrameIndexForPreviewTime(time);
      } else {
        previewState.currentFrameIndex = THREE.MathUtils.clamp(previewState.currentFrameIndex || 0, 0, totalFrames - 1);
      }
      currentFrame = previewState.currentFrameIndex + 1;
    } else {
      previewState.currentFrameIndex = 0;
    }
  
    if (ui.previewFrameCurrent) {
      ui.previewFrameCurrent.textContent = String(currentFrame);
    }
    if (ui.previewFrameTotal) {
      ui.previewFrameTotal.textContent = String(totalFrames);
    }
  }
  
  function updatePreviewUi() {
    updateMotionRipperPreviewUi({
      ui,
      previewState,
      frameEditState,
      frameCount: previewState.totalFrameCount || getCanonicalCapturedFrames().length,
      syncPreviewFrameCounter,
      updateFrameEditUi,
    });
  }
  
  function getPreviewSpeedMultiplier() {
    const parsed = Number.parseFloat(ui.previewSpeed?.value || '1');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }
  
  function renderPreviewNow() {
    updateRigPreviewHelpers();
    updateCapturedPreviewHelpers();
    previewState.controls?.update();
    previewState.rigControls?.update();
    previewState.capturedControls?.update();
    previewState.renderer?.render(previewState.scene, previewState.camera);
    previewState.rigRenderer?.render(previewState.rigScene, previewState.rigCamera);
    previewState.capturedRenderer?.render(previewState.capturedScene, previewState.capturedCamera);
    previewState.needsRender = false;
  }
  
  function setPreviewPlaybackState(playing) {
    if (!playing && previewState.action && previewState.clip) {
      const duration = Math.max(previewState.clip.duration || 0, 0.0001);
      const time = THREE.MathUtils.clamp(previewState.action.time, 0, duration);
      previewState.currentFrameIndex = getFrameIndexForPreviewTime(time);
    }
    previewState.playing = !!playing;
    if (previewState.action) {
      previewState.action.paused = !previewState.playing;
    }
    if (previewState.rigAction) {
      previewState.rigAction.paused = !previewState.playing;
    }
    previewState.needsRender = true;
    previewState.lastRenderAt = performance.now();
    updatePreviewUi();
  }
  
  function applyPreviewTime(time) {
    const actionWasPaused = previewState.action?.paused ?? false;
    const rigActionWasPaused = previewState.rigAction?.paused ?? false;
  
    if (previewState.action) {
      previewState.action.paused = false;
    }
    if (previewState.rigAction) {
      previewState.rigAction.paused = false;
    }
  
    previewState.mixer?.setTime(time);
    previewState.rigMixer?.setTime(time);
  
    if (previewState.action) {
      previewState.action.time = time;
      previewState.action.paused = actionWasPaused;
    }
  
    if (previewState.rigAction) {
      previewState.rigAction.time = time;
      previewState.rigAction.paused = rigActionWasPaused;
    }
  
    previewState.model?.updateMatrixWorld?.(true);
    previewState.rigModel?.updateMatrixWorld?.(true);
  }
  
  function seekPreviewToFrame(frameIndex, { pause = true } = {}) {
    if (!previewState.frameTimes.length || !previewState.clip) return false;
  
    const clampedIndex = THREE.MathUtils.clamp(frameIndex, 0, previewState.frameTimes.length - 1);
    const time = previewState.frameTimes[clampedIndex] ?? 0;
  
    if (pause) {
      setPreviewPlaybackState(false);
    }
  
    previewState.currentFrameIndex = clampedIndex;
    applyPreviewTime(time);
    previewState.needsRender = true;
    syncPreviewFrameCounter();
    updatePreviewUi();
    renderPreviewNow();
    return true;
  }
  
  function getCurrentCanonicalFrameContext() {
    const canonicalFrames = getCanonicalCapturedFrames();
    if (!canonicalFrames.length) return null;
    const currentIndex = THREE.MathUtils.clamp(previewState.currentFrameIndex || 0, 0, canonicalFrames.length - 1);
    return {
      canonicalFrames,
      currentIndex,
      currentFrame: canonicalFrames[currentIndex],
    };
  }
  
  function refreshCapturePreview({ autoPlay = false } = {}) {
    ensurePreviewRuntime();
    if (
      !previewState.renderer
      || !previewState.scene
      || !previewState.rigRenderer
      || !previewState.rigScene
      || !previewState.capturedRenderer
      || !previewState.capturedScene
    ) return;
  
    const group = getActiveGroup() || getMotionGroup();
    clearPreviewModel();
  
    if (!group) {
      setPreviewStatus('Select a humanoid group to preview a capture on it.', 'error');
      return;
    }
  
    previewState.model = cloneGroupForPreview(group);
    previewState.scene.add(previewState.model);
    previewState.rigModel = cloneGroupForPreview(group);
    previewState.rigModel.traverse((node) => {
      if (node?.isMesh) {
        node.visible = false;
      }
    });
    previewState.rigScene.add(previewState.rigModel);
    const captureTargetConfig = resolveCaptureTargetConfig(group);
    previewState.targetMap = captureTargetConfig.displayTargets;
    previewState.suppressedBones = captureTargetConfig.suppressedBones;
    previewState.rigNodeLookup = buildNamedNodeLookup(previewState.rigModel);
  
    const rigHelper = createRigHelperGroup();
    previewState.rigHelperGroup = rigHelper.group;
    previewState.rigJointMeshes = rigHelper.jointMeshes;
    previewState.rigLines = rigHelper.lines;
    previewState.rigScene.add(previewState.rigHelperGroup);
  
    const capturedHelper = createRigHelperGroup();
    previewState.capturedHelperGroup = capturedHelper.group;
    previewState.capturedJointMeshes = capturedHelper.jointMeshes;
    previewState.capturedLines = capturedHelper.lines;
    previewState.capturedScene.add(previewState.capturedHelperGroup);
  
    updateRigPreviewHelpers();
    updateCapturedPreviewHelpers();
    if (!previewState.cameraAdjusted) {
      runWithPreviewCameraSyncSuppressed(() => {
        framePreviewCamera(previewState.camera, previewState.controls, previewState.model);
        framePreviewCamera(previewState.rigCamera, previewState.rigControls, previewState.rigHelperGroup);
        framePreviewCamera(previewState.capturedCamera, previewState.capturedControls, previewState.capturedHelperGroup);
      });
    }
  
    if (getCanonicalCapturedFrames().length < 2) {
      setPreviewStatus(
        getIsRecording()
          ? 'Recording in progress. Stop the take to compare model, resolved rig and captured rig before importing.'
          : 'Current model, resolved rig and captured rig are ready. Capture a take to animate all three before importing.',
        'info'
      );
      updatePreviewUi();
      return;
    }
  
    try {
      const canonicalFrames = getCanonicalCapturedFrames();
      const captureTrackOptions = resolveCaptureTrackOptions(canonicalFrames);
      const previewSuppressedBones = new Set([
        ...captureTargetConfig.suppressedBones,
        ...captureTrackOptions.suppressedCaptureJoints,
      ]);
      previewState.suppressedBones = previewSuppressedBones;
      const canonical = buildCanonicalAnimationDefinition(canonicalFrames, captureTrackOptions);
      if (!isCaptureGeneratedGroup(group)) {
        applyCapturedSkeletonToGroup(previewState.model, canonical.sourceSkeleton, captureTargetConfig, getCaptureRetargetingOptions());
        applyCapturedSkeletonToGroup(previewState.rigModel, canonical.sourceSkeleton, captureTargetConfig, getCaptureRetargetingOptions());
      }
      previewState.rigNodeLookup = buildNamedNodeLookup(previewState.rigModel);
  
      const translated = buildCaptureAnimationForTargetGroup(canonical, previewState.model, captureTargetConfig);
      if (!translated) {
        setPreviewStatus('Preview could not map this take onto the current model.', 'error');
        updatePreviewUi();
        return;
      }
  
      const clip = compileAnimation(translated, previewState.model);
      if (!clip) {
        setPreviewStatus('Preview could not build compatible animation tracks for this model.', 'error');
        updatePreviewUi();
        return;
      }
  
      const rigClip = compileAnimation(translated, previewState.rigModel);
      if (!rigClip) {
        setPreviewStatus('Rig preview could not build compatible animation tracks for this model.', 'error');
        updatePreviewUi();
        return;
      }
  
      previewState.clip = clip;
      previewState.frameTimes = canonicalFrames.map((frame) => frame.time);
      previewState.totalFrameCount = previewState.frameTimes.length;
      previewState.currentFrameIndex = 0;
      previewState.mixer = new THREE.AnimationMixer(previewState.model);
      previewState.action = previewState.mixer.clipAction(clip);
      previewState.action.setLoop(clip.userData?.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
      previewState.action.clampWhenFinished = true;
      previewState.action.play();
      previewState.action.paused = !autoPlay;
  
      previewState.rigMixer = new THREE.AnimationMixer(previewState.rigModel);
      previewState.rigAction = previewState.rigMixer.clipAction(rigClip);
      previewState.rigAction.setLoop(rigClip.userData?.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
      previewState.rigAction.clampWhenFinished = true;
      previewState.rigAction.play();
      previewState.rigAction.paused = !autoPlay;
  
      previewState.resolvedFrames = canonicalFrames.map((frame) => {
        previewState.rigMixer.setTime(frame.time);
        previewState.rigModel.updateMatrixWorld(true);
        return {
          time: frame.time,
          resolvedRig: collectResolvedPreviewRigFrame(),
        };
      });
      previewState.capturedFrames = canonicalFrames.map((frame) => ({
        time: frame.time,
        capturedRig: normalizePreviewRigFrame(frame.capturedRig || null, previewSuppressedBones),
      }));
  
      previewState.rigMixer.setTime(0);
      previewState.rigModel.updateMatrixWorld(true);
      previewState.rigAction.paused = !autoPlay;
  
      previewState.playing = autoPlay;
      previewState.lastRenderAt = performance.now();
      updateRigPreviewHelpers();
      updateCapturedPreviewHelpers();
      if (!previewState.cameraAdjusted) {
        runWithPreviewCameraSyncSuppressed(() => {
          framePreviewCamera(previewState.camera, previewState.controls, previewState.model);
          framePreviewCamera(previewState.rigCamera, previewState.rigControls, previewState.rigHelperGroup);
          framePreviewCamera(previewState.capturedCamera, previewState.capturedControls, previewState.capturedHelperGroup);
        });
      }
  
      setPreviewStatus(
        autoPlay
          ? 'Previewing the captured take on the model, the resolved rig and the captured rig.'
          : 'Preview ready. Compare the model, the resolved rig and the captured rig before deciding to import.',
        'success'
      );
    } catch (error) {
      console.error('Motion Ripper preview failed.', error);
      clearPreviewAnimation();
      setPreviewStatus('Preview failed to build. You can still record again or import at your own risk.', 'error');
    }
  
    updatePreviewUi();
  }

  return {
    ensureRuntime: ensurePreviewRuntime,
    disposeRuntime: disposePreviewRuntime,
    updateUi: updatePreviewUi,
    getSpeedMultiplier: getPreviewSpeedMultiplier,
    setPlaybackState: setPreviewPlaybackState,
    seekToFrame: seekPreviewToFrame,
    getCurrentCanonicalFrameContext,
    refresh: refreshCapturePreview,
    clearAnimation: clearPreviewAnimation,
    renderNow: renderPreviewNow,
    syncFrameCounter: syncPreviewFrameCounter,
  };
}
