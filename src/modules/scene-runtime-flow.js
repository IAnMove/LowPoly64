export function createSceneRuntimeController({
  sceneState,
  createScene,
  createCamera,
  createRenderer,
  addDefaultSceneObjects,
  createUserObjectsGroup,
  createOrbitControls,
  createTransformControls,
  getCanvasElement,
  getDevicePixelRatio,
  getViewportElement,
  resizeViewport,
  bindResizeHandler,
  createRenderLoop,
  updateAnimationMixer,
  updateBones,
  pushAction,
  updatePropertiesPanel,
}) {
  let renderLoop = null;
  let unbindResize = null;

  function stop() {
    renderLoop?.stop?.();
    unbindResize?.();
    renderLoop = null;
    unbindResize = null;
  }

  function onResize() {
    if (!sceneState.camera || !sceneState.renderer) return null;
    return resizeViewport(sceneState.camera, sceneState.renderer, getViewportElement());
  }

  function initScene() {
    stop();

    sceneState.scene = createScene();
    sceneState.camera = createCamera();
    sceneState.renderer = createRenderer(getCanvasElement(), getDevicePixelRatio());

    addDefaultSceneObjects(sceneState.scene);
    sceneState.userObjects = createUserObjectsGroup(sceneState.scene);

    sceneState.orbitControls = createOrbitControls(
      sceneState.camera,
      sceneState.renderer.domElement
    );
    sceneState.transformControls = createTransformControls({
      camera: sceneState.camera,
      domElement: sceneState.renderer.domElement,
      scene: sceneState.scene,
      orbitControls: sceneState.orbitControls,
      getState: () => sceneState,
      pushAction,
      updatePropertiesPanel,
    });

    onResize();
    unbindResize = bindResizeHandler(onResize);

    renderLoop = createRenderLoop({
      updateOrbitControls: () => sceneState.orbitControls.update(),
      updateAnimationMixer,
      updateBones,
      renderFrame: () => sceneState.renderer.render(sceneState.scene, sceneState.camera),
    });
    renderLoop.start();

    return {
      scene: sceneState.scene,
      camera: sceneState.camera,
      renderer: sceneState.renderer,
      userObjects: sceneState.userObjects,
      orbitControls: sceneState.orbitControls,
      transformControls: sceneState.transformControls,
      renderLoop,
    };
  }

  return {
    initScene,
    onResize,
    stop,
  };
}
