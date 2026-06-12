import { addPrimitiveToScene, createPrimitiveMesh } from './primitive-runtime-flow.js';

export function createPrimitiveController({
  getPrimitiveState = () => ({}),
  createPrimitiveMeshCommand = createPrimitiveMesh,
  addPrimitiveToSceneCommand = addPrimitiveToScene,
  geometryClasses,
  MeshClass,
  createMaterial,
  selectMesh,
  deselect,
  pushAction,
  translate = (key) => key,
} = {}) {
  function addPrimitive(type) {
    return addPrimitiveToSceneCommand(type, {
      primitiveState: getPrimitiveState(),
      createPrimitiveMeshCommand,
      geometryClasses,
      MeshClass,
      createMaterial,
      selectMesh,
      deselect,
      pushAction,
      translate,
    });
  }

  return {
    addPrimitive,
  };
}
