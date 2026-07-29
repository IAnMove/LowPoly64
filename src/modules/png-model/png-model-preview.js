import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function disposeObject(object) {
  object?.traverse?.((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      material?.map?.dispose?.();
      material?.dispose?.();
    });
  });
}

function disposeInspectionObject(object) {
  object?.traverse?.((node) => {
    if (!node.isLineSegments && !node.isPoints) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material?.dispose?.());
  });
}

export class PngModelPreview {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080808);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 500);
    this.camera.position.set(2, 1.2, 8);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.replaceChildren(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(4, 6, 8);
    this.scene.add(key);
    this.grid = new THREE.GridHelper(12, 24, 0x00d0ff, 0x222222);
    this.grid.position.y = -2.5;
    this.scene.add(this.grid);
    this.inspection = {
      showWireframe: false,
      showVertices: false,
    };
    this.inspectionRoot = new THREE.Group();
    this.inspectionRoot.name = 'PNG MODEL INSPECTION';
    this.scene.add(this.inspectionRoot);
    this.model = null;
    this.view = 'three-quarter';
    this.modelCenter = new THREE.Vector3();
    this.modelRadius = 1;
    this.running = true;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.animate();
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setModel(model) {
    this.clearInspectionOverlays();
    if (this.model) {
      this.scene.remove(this.model);
      disposeObject(this.model);
    }
    this.model = model;
    if (!model) return;
    this.scene.add(model);
    model.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 0.5);
    this.modelCenter.copy(center);
    this.modelRadius = radius;
    this.controls.target.copy(center);
    this.camera.near = Math.max(0.01, radius / 100);
    this.camera.far = Math.max(100, radius * 20);
    this.camera.updateProjectionMatrix();
    this.grid.position.y = box.min.y - radius * 0.08;
    this.setView(this.view);
    this.rebuildInspectionOverlays();
  }

  setView(view = 'three-quarter') {
    const safeView = ['front', 'three-quarter', 'side'].includes(view) ? view : 'three-quarter';
    this.view = safeView;
    if (!this.model) return;
    const radius = this.modelRadius;
    const offsets = {
      front: new THREE.Vector3(0, radius * 0.08, radius * 2.35),
      'three-quarter': new THREE.Vector3(radius * 0.58, radius * 0.2, radius * 2.2),
      side: new THREE.Vector3(radius * 2.35, radius * 0.08, 0),
    };
    this.controls.target.copy(this.modelCenter);
    this.camera.position.copy(this.modelCenter).add(offsets[safeView]);
    this.camera.lookAt(this.modelCenter);
    this.controls.update();
  }

  clearInspectionOverlays() {
    while (this.inspectionRoot.children.length) {
      const child = this.inspectionRoot.children.at(-1);
      this.inspectionRoot.remove(child);
      disposeInspectionObject(child);
    }
  }

  rebuildInspectionOverlays() {
    this.clearInspectionOverlays();
    if (!this.model || (!this.inspection.showWireframe && !this.inspection.showVertices)) return;
    this.model.updateWorldMatrix(true, true);
    this.model.traverse((node) => {
      if (!node.isMesh || !node.geometry?.getAttribute?.('position')) return;
      if (this.inspection.showWireframe) {
        const wireframe = new THREE.LineSegments(
          new THREE.WireframeGeometry(node.geometry),
          new THREE.LineBasicMaterial({
            color: 0x7cff00,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
          }),
        );
        wireframe.name = 'PNG MODEL POLYGONS';
        wireframe.matrix.copy(node.matrixWorld);
        wireframe.matrixAutoUpdate = false;
        wireframe.renderOrder = 4;
        this.inspectionRoot.add(wireframe);
      }
      if (this.inspection.showVertices) {
        const pointsGeometry = new THREE.BufferGeometry();
        pointsGeometry.setAttribute('position', node.geometry.getAttribute('position').clone());
        const points = new THREE.Points(
          pointsGeometry,
          new THREE.PointsMaterial({
            color: 0xff3bd4,
            size: 0.045,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
          }),
        );
        points.name = 'PNG MODEL VERTICES';
        points.matrix.copy(node.matrixWorld);
        points.matrixAutoUpdate = false;
        points.renderOrder = 5;
        this.inspectionRoot.add(points);
      }
    });
  }

  setInspection(next = {}) {
    this.inspection = {
      showWireframe: Boolean(next.showWireframe),
      showVertices: Boolean(next.showVertices),
    };
    this.rebuildInspectionOverlays();
  }

  getInspectionState() {
    let wireframeObjects = 0;
    let vertexObjects = 0;
    this.inspectionRoot.traverse((node) => {
      if (node.isLineSegments) wireframeObjects += 1;
      if (node.isPoints) vertexObjects += 1;
    });
    return {
      ...this.inspection,
      view: this.view,
      wireframeObjects,
      vertexObjects,
    };
  }

  animate() {
    if (!this.running) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.animate());
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.clearInspectionOverlays();
    if (this.model) disposeObject(this.model);
    this.renderer?.dispose();
    this.container?.replaceChildren();
  }
}
