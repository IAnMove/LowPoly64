const GEOMETRY_FACTORIES = {
  capsule: ({ CapsuleGeometryClass }) => new CapsuleGeometryClass(0.8, 2, 4, 8),
  cone: ({ ConeGeometryClass }) => new ConeGeometryClass(1.5, 3, 8),
  cube: ({ BoxGeometryClass }) => new BoxGeometryClass(2, 2, 2),
  cylinder: ({ CylinderGeometryClass }) => new CylinderGeometryClass(1, 1, 2.5, 8),
  plane: ({ PlaneGeometryClass }) => new PlaneGeometryClass(3, 3),
  sphere: ({ SphereGeometryClass }) => new SphereGeometryClass(1.5, 8, 6),
  torus: ({ TorusGeometryClass }) => new TorusGeometryClass(1, 0.08, 4, 8),
};

export function createPrimitiveGeometry(type, geometryClasses = {}) {
  const createGeometry = GEOMETRY_FACTORIES[type];
  return createGeometry ? createGeometry(geometryClasses) : null;
}

export function createPrimitiveMesh(type, {
  geometryClasses = {},
  MeshClass,
  createMaterial,
  materialType,
} = {}) {
  const geometry = createPrimitiveGeometry(type, geometryClasses);
  if (!geometry) return null;

  const mesh = new MeshClass(geometry, createMaterial(materialType));
  mesh.userData = mesh.userData || {};
  mesh.userData.name = type.toUpperCase();
  mesh.userData.geometryType = type;
  mesh.position.set(0, 1, 0);

  if (type === 'plane') {
    mesh.rotation.x = -Math.PI / 2;
  }

  return mesh;
}

export function addPrimitiveToScene(type, {
  primitiveState,
  createPrimitiveMeshCommand = createPrimitiveMesh,
  selectMesh = () => {},
  deselect = () => {},
  pushAction = () => {},
  translate = (key) => key,
  ...meshDependencies
} = {}) {
  const mesh = createPrimitiveMeshCommand(type, {
    ...meshDependencies,
    materialType: primitiveState.currentMaterialType,
  });
  if (!mesh) return null;

  primitiveState.userObjects.add(mesh);
  selectMesh(mesh);

  pushAction({
    type: translate('actionCreatePrimitive'),
    undo: () => {
      if (primitiveState.selectedMesh === mesh) deselect();
      primitiveState.userObjects.remove(mesh);
    },
    redo: () => {
      primitiveState.userObjects.add(mesh);
      selectMesh(mesh);
    },
  });

  return mesh;
}
