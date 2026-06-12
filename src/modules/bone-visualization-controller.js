export function findBoneTargets(userObjects) {
  const pivots = [];
  const rootGroups = [];

  userObjects.traverse((child) => {
    if (child.userData.isPivot) pivots.push(child);
  });

  userObjects.children.forEach((child) => {
    if (!child.isGroup || child.userData.isPivot) return;
    if (child.children.some((nested) => nested.userData.isPivot)) {
      rootGroups.push(child);
    }
  });

  return { pivots, rootGroups, count: pivots.length + rootGroups.length };
}

export function createBoneVisualizationController({
  getBoneState = () => ({}),
  GroupClass,
  MeshClass,
  SphereGeometryClass,
  MeshBasicMaterialClass,
  LineBasicMaterialClass,
  Vector3Class,
  BufferGeometryClass,
  LineClass,
  findBoneTargetsCommand = findBoneTargets,
} = {}) {
  let bonesGroup = null;
  let boneHelpers = [];
  let boneLines = [];
  let bonePivotCount = 0;

  const boneSphereGeometry = new SphereGeometryClass(0.15, 6, 4);
  const boneSphereMaterial = new MeshBasicMaterialClass({
    color: 0x00ffff,
    wireframe: true,
    depthTest: false,
  });
  const boneLineMaterial = new LineBasicMaterialClass({
    color: 0x00ffff,
    depthTest: false,
  });
  const boneRootMaterial = new MeshBasicMaterialClass({
    color: 0xffcc00,
    wireframe: true,
    depthTest: false,
  });

  function raycastBones(raycaster) {
    const boneState = getBoneState();
    if (!boneState.bonesVisible || !bonesGroup || boneHelpers.length === 0) return null;
    const spheres = boneHelpers.map((helper) => helper.sphere);
    const intersects = raycaster.intersectObjects(spheres);
    if (intersects.length === 0) return null;
    const hitSphere = intersects[0].object;
    const helper = boneHelpers.find((candidate) => candidate.sphere === hitSphere);
    return helper ? helper.pivotGroup : null;
  }

  function toggleBones() {
    const boneState = getBoneState();
    boneState.bonesVisible = !boneState.bonesVisible;
    if (boneState.bonesVisible) {
      buildBones();
    } else {
      clearBones();
    }
    return boneState.bonesVisible;
  }

  function buildBones() {
    const boneState = getBoneState();
    clearBones();
    bonesGroup = new GroupClass();
    bonesGroup.name = '__bones__';
    bonesGroup.renderOrder = 999;
    boneState.scene.add(bonesGroup);

    boneHelpers = [];
    boneLines = [];

    boneState.userObjects.traverse((child) => {
      if (!child.userData.isPivot) return;

      const sphere = new MeshClass(boneSphereGeometry, boneSphereMaterial);
      sphere.renderOrder = 999;
      bonesGroup.add(sphere);
      boneHelpers.push({ pivotGroup: child, sphere });

      const parentIsPivot = child.parent && child.parent.userData.isPivot;
      const parentIsRootGroup = child.parent
        && child.parent.isGroup
        && !child.parent.userData.isPivot
        && child.parent !== boneState.userObjects;
      if (parentIsPivot || parentIsRootGroup) {
        const points = [new Vector3Class(), new Vector3Class()];
        const geometry = new BufferGeometryClass().setFromPoints(points);
        const line = new LineClass(geometry, boneLineMaterial);
        line.renderOrder = 999;
        bonesGroup.add(line);
        boneLines.push({ line, parentNode: child.parent, childPivot: child });
      }
    });

    const { rootGroups, count } = findBoneTargetsCommand(boneState.userObjects);
    rootGroups.forEach((rootGroup) => {
      const sphere = new MeshClass(boneSphereGeometry, boneRootMaterial);
      sphere.renderOrder = 999;
      bonesGroup.add(sphere);
      boneHelpers.push({ pivotGroup: rootGroup, sphere });
    });

    bonePivotCount = count;
    updateBones();
  }

  function clearBones() {
    const boneState = getBoneState();
    if (bonesGroup) {
      boneLines.forEach(({ line }) => {
        if (line.geometry) line.geometry.dispose();
      });
      boneState.scene.remove(bonesGroup);
      bonesGroup = null;
    }
    boneHelpers = [];
    boneLines = [];
    bonePivotCount = 0;
  }

  function updateBones() {
    const boneState = getBoneState();
    if (!boneState.bonesVisible || !bonesGroup) return;

    const { count } = findBoneTargetsCommand(boneState.userObjects);
    if (count !== bonePivotCount) {
      buildBones();
      return;
    }

    const worldPosition = new Vector3Class();

    boneHelpers.forEach(({ pivotGroup, sphere }) => {
      pivotGroup.getWorldPosition(worldPosition);
      sphere.position.copy(worldPosition);
    });

    boneLines.forEach(({ line, parentNode, childPivot }) => {
      const position = line.geometry.attributes.position;
      parentNode.getWorldPosition(worldPosition);
      position.setXYZ(0, worldPosition.x, worldPosition.y, worldPosition.z);
      childPivot.getWorldPosition(worldPosition);
      position.setXYZ(1, worldPosition.x, worldPosition.y, worldPosition.z);
      position.needsUpdate = true;
    });
  }

  return {
    raycastBones,
    toggleBones,
    updateBones,
  };
}
