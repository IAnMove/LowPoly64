import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createEditorScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x111111, 30, 80);
  return scene;
}

export function createEditorCamera() {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(10, 8, 15);
  return camera;
}

export function createEditorRenderer(canvas, pixelRatio = 1) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(pixelRatio, 2));
  renderer.shadowMap.enabled = false;
  return renderer;
}

export function addDefaultSceneObjects(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffeecc, 1.2);
  dirLight.position.set(15, 25, 10);
  scene.add(dirLight);

  const grid = new THREE.GridHelper(50, 50, 0xffcc00, 0x444444);
  grid.position.y = -0.01;
  scene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);

  const axes = new THREE.AxesHelper(5);
  scene.add(axes);
}

export function createUserObjectsGroup(scene) {
  const userObjects = new THREE.Group();
  scene.add(userObjects);
  return userObjects;
}

export function createEditorOrbitControls(camera, domElement) {
  const orbitControls = new OrbitControls(camera, domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.12;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 60;
  return orbitControls;
}

export function resizeViewport(camera, renderer, container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  return { width, height };
}
