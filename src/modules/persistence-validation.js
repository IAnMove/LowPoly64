const MAX_SCENE_OBJECTS = 400;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVector3(value, maxAbs = 10000) {
  return Array.isArray(value)
    && value.length === 3
    && value.every((entry) => isFiniteNumber(entry) && Math.abs(entry) <= maxAbs);
}

function isSerializedMaterialColor(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function validateSerializedObject(data, depth = 0) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || depth > 16) return false;

  if (data.type === 'pivot') {
    const mesh = data.mesh;
    const childrenValid = Array.isArray(data.children)
      && data.children.every((child) => validateSerializedObject(child, depth + 1));
    const meshValid = !mesh || (
      typeof mesh.geometryType === 'string'
      && typeof mesh.materialType === 'string'
      && isVector3(mesh.position)
      && (!mesh.color || isSerializedMaterialColor(mesh.color))
      && (!mesh.texture || typeof mesh.texture === 'object')
    );
    return typeof data.name === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && childrenValid
      && meshValid;
  }

  if (data.type === 'group') {
    return typeof data.name === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && Array.isArray(data.children)
      && data.children.every((child) => validateSerializedObject(child, depth + 1))
      && (!data.animations || Array.isArray(data.animations));
  }

  if (data.type === 'mesh') {
    return typeof data.name === 'string'
      && typeof data.geometryType === 'string'
      && typeof data.materialType === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && (!data.color || isSerializedMaterialColor(data.color))
      && (!data.texture || typeof data.texture === 'object');
  }

  return false;
}

export function validateSerializedScene(data) {
  return !!data
    && typeof data === 'object'
    && !Array.isArray(data)
    && Array.isArray(data.objects)
    && data.objects.length <= MAX_SCENE_OBJECTS
    && data.objects.every((objectData) => validateSerializedObject(objectData));
}
