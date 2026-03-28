import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { state } from './state.js';
import { updatePropertiesPanel } from './ui.js';

export function initScene() {
  // Scene
  state.scene = new THREE.Scene();
  state.scene.fog = new THREE.Fog(0x111111, 30, 80);

  // Camera
  state.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  state.camera.position.set(10, 8, 15);

  // Renderer
  const canvas = document.getElementById('canvas');
  state.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.shadowMap.enabled = false;

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  state.scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffeecc, 1.2);
  dirLight.position.set(15, 25, 10);
  state.scene.add(dirLight);

  // User objects group
  state.userObjects = new THREE.Group();
  state.scene.add(state.userObjects);

  // Grid
  const grid = new THREE.GridHelper(50, 50, 0xffcc00, 0x444444);
  grid.position.y = -0.01;
  state.scene.add(grid);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  state.scene.add(floor);

  // Axes
  const axes = new THREE.AxesHelper(5);
  state.scene.add(axes);

  // OrbitControls
  state.orbitControls = new OrbitControls(state.camera, state.renderer.domElement);
  state.orbitControls.enableDamping = true;
  state.orbitControls.dampingFactor = 0.12;
  state.orbitControls.minDistance = 5;
  state.orbitControls.maxDistance = 60;

  // TransformControls
  state.transformControls = new TransformControls(state.camera, state.renderer.domElement);
  state.transformControls.addEventListener('dragging-changed', (event) => {
    state.orbitControls.enabled = !event.value;
  });
  state.transformControls.addEventListener('change', () => {
    if (state.selectedMesh) updatePropertiesPanel();
  });
  state.scene.add(state.transformControls.getHelper());

  // Responsive resize
  onResize();
  window.addEventListener('resize', onResize);

  // Render loop
  animate();
}

function onResize() {
  const container = document.getElementById('viewport');
  const w = container.clientWidth;
  const h = container.clientHeight;
  state.camera.aspect = w / h;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  state.orbitControls.update();
  state.renderer.render(state.scene, state.camera);
}
