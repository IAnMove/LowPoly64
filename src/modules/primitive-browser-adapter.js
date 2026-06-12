import * as THREE from 'three';
import { t } from './i18n.js';
import { createMaterial } from './materials.js';
import { createPrimitiveController } from './primitive-controller.js';
import { deselect, selectMesh } from './selection.js';
import { state } from './state.js';
import { pushAction } from './undo.js';

export function createBrowserPrimitiveController({
  getPrimitiveState = () => state,
  createFacadeController = createPrimitiveController,
  geometryClasses = {
    BoxGeometryClass: THREE.BoxGeometry,
    CapsuleGeometryClass: THREE.CapsuleGeometry,
    ConeGeometryClass: THREE.ConeGeometry,
    CylinderGeometryClass: THREE.CylinderGeometry,
    PlaneGeometryClass: THREE.PlaneGeometry,
    SphereGeometryClass: THREE.SphereGeometry,
    TorusGeometryClass: THREE.TorusGeometry,
  },
  MeshClass = THREE.Mesh,
  createMaterialCommand = createMaterial,
  selectMeshCommand = selectMesh,
  deselectCommand = deselect,
  pushActionCommand = pushAction,
  translate = t,
} = {}) {
  return createFacadeController({
    getPrimitiveState,
    geometryClasses,
    MeshClass,
    createMaterial: createMaterialCommand,
    selectMesh: selectMeshCommand,
    deselect: deselectCommand,
    pushAction: pushActionCommand,
    translate,
  });
}
