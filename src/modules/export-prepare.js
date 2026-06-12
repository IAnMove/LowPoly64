export function prepareExportGroup(exportGroup, {
  MeshStandardMaterialClass,
  ColorClass,
  compileAnimation = () => null,
  cloneTexture = (texture) => texture,
} = {}) {
  const clips = [];

  exportGroup.traverse((child) => {
    applyExportNodeName(child);
    prepareExportMaterial(child, {
      MeshStandardMaterialClass,
      ColorClass,
      cloneTexture,
    });
    collectAnimationClips(child, {
      compileAnimation,
      clips,
    });
  });

  return clips;
}

export function applyExportNodeName(node) {
  if (
    node.userData?.name
    && !(node.isMesh && node.parent?.userData?.isPivot)
  ) {
    node.name = node.userData.name;
    return true;
  }
  return false;
}

export function prepareExportMaterial(node, {
  MeshStandardMaterialClass,
  ColorClass,
  cloneTexture = (texture) => texture,
} = {}) {
  if (!node.isMesh || !node.material) return false;

  const oldMaterial = node.material;
  if (!oldMaterial.isMeshStandardMaterial && !oldMaterial.isMeshPhysicalMaterial) {
    node.material = new MeshStandardMaterialClass({
      color: oldMaterial.color ? oldMaterial.color.clone() : new ColorClass(0xffffff),
      flatShading: oldMaterial.flatShading || false,
      wireframe: false,
      roughness: 0.8,
      metalness: 0.1,
    });
    if (oldMaterial.map) {
      node.material.map = cloneTexture(oldMaterial.map);
    }
  }

  if (node.material.map) {
    node.material.map = cloneTexture(node.material.map);
  }

  if (node.material.emissive) {
    node.material.emissive.set(0x000000);
    node.material.emissiveIntensity = 0;
  }

  return true;
}

export function collectAnimationClips(node, {
  compileAnimation = () => null,
  clips = [],
} = {}) {
  if (!Array.isArray(node.userData?.animations) || node.userData.animations.length === 0) {
    return clips;
  }

  for (const animationDefinition of node.userData.animations) {
    const clip = compileAnimation(animationDefinition, node);
    if (clip) clips.push(clip);
  }
  return clips;
}
