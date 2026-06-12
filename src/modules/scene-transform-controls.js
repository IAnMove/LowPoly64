import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function createTransformSnapshot(object) {
  return {
    obj: object,
    pos: object.position.clone(),
    rot: object.rotation.clone(),
    scale: object.scale.clone(),
  };
}

export function applyTransformSnapshot(object, snapshot) {
  object.position.copy(snapshot.pos);
  object.rotation.copy(snapshot.rot);
  object.scale.copy(snapshot.scale);
}

export function createBoneEditInfo(object, { bonesVisible, mode }) {
  if (!bonesVisible || !object?.userData?.isPivot || mode !== 'translate') return null;
  const childMesh = object.children.find((child) => child.isMesh);
  if (!childMesh) return null;

  return {
    mesh: childMesh,
    origMeshPos: childMesh.position.clone(),
    origPivotPos: object.position.clone(),
  };
}

export function applyBonePivotCompensation(object, boneEditInfo) {
  const delta = object.position.clone().sub(boneEditInfo.origPivotPos);
  boneEditInfo.mesh.position.copy(boneEditInfo.origMeshPos).sub(delta);
}

export function createTransformUndoAction({
  object,
  before,
  after,
  type = 'Transformar',
  isSelected = () => false,
  updatePropertiesPanel = () => {},
}) {
  return {
    type,
    undo: () => {
      applyTransformSnapshot(object, before);
      if (isSelected(object)) updatePropertiesPanel();
    },
    redo: () => {
      applyTransformSnapshot(object, after);
      if (isSelected(object)) updatePropertiesPanel();
    },
  };
}

export function createPivotTransformUndoAction({
  object,
  before,
  after,
  boneEditInfo,
  type = 'Mover pivote',
  isSelected = () => false,
  updatePropertiesPanel = () => {},
}) {
  const meshBefore = boneEditInfo.origMeshPos.clone();
  const meshAfter = boneEditInfo.mesh.position.clone();

  return {
    type,
    undo: () => {
      applyTransformSnapshot(object, before);
      boneEditInfo.mesh.position.copy(meshBefore);
      if (isSelected(object)) updatePropertiesPanel();
    },
    redo: () => {
      applyTransformSnapshot(object, after);
      boneEditInfo.mesh.position.copy(meshAfter);
      if (isSelected(object)) updatePropertiesPanel();
    },
  };
}

export function createTransformControlHandlers({
  transformControls,
  orbitControls,
  getState,
  pushAction,
  updatePropertiesPanel,
}) {
  let beforeTransform = null;
  let boneEditInfo = null;

  return {
    onDraggingChanged: (event) => {
      orbitControls.enabled = !event.value;
      const object = transformControls.object;
      if (!object) return;

      if (event.value) {
        beforeTransform = createTransformSnapshot(object);
        boneEditInfo = createBoneEditInfo(object, {
          bonesVisible: getState().bonesVisible,
          mode: transformControls.mode,
        });
        return;
      }

      if (!beforeTransform || beforeTransform.obj !== object) return;

      const before = beforeTransform;
      const after = createTransformSnapshot(object);
      const isSelected = (target) => getState().selectedMesh === target;

      if (boneEditInfo) {
        pushAction(createPivotTransformUndoAction({
          object,
          before,
          after,
          boneEditInfo,
          isSelected,
          updatePropertiesPanel,
        }));
        boneEditInfo = null;
      } else {
        pushAction(createTransformUndoAction({
          object,
          before,
          after,
          isSelected,
          updatePropertiesPanel,
        }));
      }

      beforeTransform = null;
    },
    onChange: () => {
      if (boneEditInfo && transformControls.dragging && transformControls.object) {
        applyBonePivotCompensation(transformControls.object, boneEditInfo);
      }
      if (getState().selectedMesh) updatePropertiesPanel();
    },
  };
}

export function createEditorTransformControls({
  camera,
  domElement,
  scene,
  orbitControls,
  getState,
  pushAction,
  updatePropertiesPanel,
  TransformControlsClass = TransformControls,
}) {
  const transformControls = new TransformControlsClass(camera, domElement);
  const handlers = createTransformControlHandlers({
    transformControls,
    orbitControls,
    getState,
    pushAction,
    updatePropertiesPanel,
  });

  transformControls.addEventListener('dragging-changed', handlers.onDraggingChanged);
  transformControls.addEventListener('change', handlers.onChange);
  scene.add(transformControls.getHelper());

  return transformControls;
}
