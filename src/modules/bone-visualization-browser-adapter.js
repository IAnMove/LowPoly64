import * as THREE from 'three';
import { createBoneVisualizationController } from './bone-visualization-controller.js';
import { state } from './state.js';

export function createBrowserBoneVisualizationController({
  getBoneState = () => state,
  createFacadeController = createBoneVisualizationController,
} = {}) {
  return createFacadeController({
    getBoneState,
    GroupClass: THREE.Group,
    MeshClass: THREE.Mesh,
    SphereGeometryClass: THREE.SphereGeometry,
    MeshBasicMaterialClass: THREE.MeshBasicMaterial,
    LineBasicMaterialClass: THREE.LineBasicMaterial,
    Vector3Class: THREE.Vector3,
    BufferGeometryClass: THREE.BufferGeometry,
    LineClass: THREE.Line,
  });
}
