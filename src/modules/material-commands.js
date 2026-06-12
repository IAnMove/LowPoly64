export function replaceMaterialType(mesh, newType, {
  createMaterial,
  preserveEmissive = false,
}) {
  if (!mesh?.material) return false;

  const oldMaterial = mesh.material;
  const replacement = createMaterial(newType, {
    color: oldMaterial.color ? oldMaterial.color.getHex() : 0xffcc00,
    flatShading: oldMaterial.flatShading,
    wireframe: oldMaterial.wireframe,
    map: oldMaterial.map,
  });

  if (preserveEmissive && oldMaterial.emissive) {
    replacement.emissive = oldMaterial.emissive.clone();
    replacement.emissiveIntensity = oldMaterial.emissiveIntensity;
  }

  mesh.material = replacement;
  oldMaterial.dispose();
  return true;
}

export function applyFlatShadingToObjects(userObjects, enabled) {
  userObjects.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    if (child.material.flatShading !== undefined) {
      child.material.flatShading = enabled;
      child.material.needsUpdate = true;
    }
    child.geometry?.computeVertexNormals?.();
  });
}

export function applyWireframeToObjects(userObjects, enabled) {
  userObjects.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.wireframe = enabled;
    }
  });
}

export function setMeshColor(mesh, hexColor) {
  if (!mesh?.material) return false;
  mesh.material.color.set(hexColor);
  return true;
}

export function choosePaletteColor(palette, random = Math.random) {
  if (!palette?.length) return null;
  return palette[Math.floor(random() * palette.length)];
}
