// Shared UI utilities used across all domains

// Find the actual mesh for color/material operations (child mesh if PivotGroup, else the object itself)
export function getChildMesh(obj) {
  if (obj.userData.isPivot) {
    let found = null;
    for (const child of obj.children) {
      if (child.isMesh) { found = child; break; }
    }
    return found;
  }
  return obj.isMesh ? obj : null;
}

function addEditableMesh(meshes, seen, mesh) {
  if (!mesh || !mesh.isMesh || !mesh.material || seen.has(mesh.uuid)) return;
  seen.add(mesh.uuid);
  meshes.push(mesh);
}

export function getEditableMeshes(obj) {
  const meshes = [];
  const seen = new Set();
  if (!obj) return meshes;

  if (obj.isMesh) {
    addEditableMesh(meshes, seen, obj);
    return meshes;
  }

  if (obj.userData?.isPivot) {
    obj.children.forEach((child) => addEditableMesh(meshes, seen, child));
    return meshes;
  }

  if (obj.isGroup) {
    obj.traverse((child) => addEditableMesh(meshes, seen, child));
  }

  return meshes;
}

export function getPrimaryEditableMesh(obj) {
  return getEditableMeshes(obj)[0] || null;
}

export function collectEditableMeshes(objects) {
  const meshes = [];
  const seen = new Set();

  objects.forEach((object) => {
    getEditableMeshes(object).forEach((mesh) => addEditableMesh(meshes, seen, mesh));
  });

  return meshes;
}

// Toast notification system
export function showToast(message, duration = 2000) {
  const container = document.getElementById('toast-container') || document.body;
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-black border-2 border-[#ffcc00] text-[#ffcc00] px-6 py-3 text-xs font-mono z-50 pointer-events-none';
  toast.style.fontFamily = "'Press Start 2P', monospace";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, duration);
}
