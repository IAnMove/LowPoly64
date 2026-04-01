import * as THREE from 'three';
import { state } from './state.js';
import { createMaterial } from './materials.js';
import { selectMesh, deselect } from './selection.js';
import { pushAction } from './undo.js';
import { t } from './i18n.js';

export function addPrimitive(type) {
  let geometry;
  const mat = createMaterial(state.currentMaterialType);

  switch (type) {
    case 'cube':
      geometry = new THREE.BoxGeometry(2, 2, 2);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(1.5, 8, 6);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(1, 1, 2.5, 8);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(1.5, 3, 8);
      break;
    case 'plane':
      geometry = new THREE.PlaneGeometry(3, 3);
      break;
    case 'capsule':
      geometry = new THREE.CapsuleGeometry(0.8, 2, 4, 8);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(1, 0.08, 4, 8);
      break;
    default:
      return;
  }

  const mesh = new THREE.Mesh(geometry, mat);
  mesh.userData.name = type.toUpperCase();
  mesh.userData.geometryType = type;
  mesh.position.set(0, 1, 0);

  if (type === 'plane') {
    mesh.rotation.x = -Math.PI / 2;
  }

  state.userObjects.add(mesh);
  selectMesh(mesh);

  pushAction({
    type: t('actionCreatePrimitive'),
    undo: () => { if (state.selectedMesh === mesh) deselect(); state.userObjects.remove(mesh); },
    redo: () => { state.userObjects.add(mesh); selectMesh(mesh); },
  });
}
