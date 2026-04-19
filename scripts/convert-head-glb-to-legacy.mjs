import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'artifacts', 'cabezas');

function roundNumber(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function sanitizeName(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function geometryToLegacyPayload(name, geometry) {
  const position = geometry.getAttribute('position');
  if (!position) {
    throw new Error(`Mesh "${name}" has no position attribute.`);
  }

  const vertices = [];
  for (let index = 0; index < position.count; index += 1) {
    vertices.push([
      roundNumber(position.getX(index)),
      roundNumber(position.getY(index)),
      roundNumber(position.getZ(index)),
    ]);
  }

  const faces = [];
  if (geometry.index) {
    const indices = geometry.index.array;
    for (let index = 0; index < indices.length; index += 3) {
      faces.push([indices[index], indices[index + 1], indices[index + 2]]);
    }
  } else {
    for (let index = 0; index < position.count; index += 3) {
      faces.push([index, index + 1, index + 2]);
    }
  }

  return {
    name,
    pieces: [
      {
        name: 'HEAD_BASE',
        color: '#f2f2f2',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        geometry: {
          type: 'custom',
          params: {
            vertices,
            faces,
          },
        },
      },
    ],
  };
}

async function loadFirstMeshFromGlb(filepath) {
  const bytes = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
      resolve,
      reject,
    );
  });

  let firstMesh = null;
  gltf.scene.updateWorldMatrix(true, true);
  gltf.scene.traverse((node) => {
    if (!firstMesh && node.isMesh) {
      firstMesh = node;
    }
  });

  if (!firstMesh?.geometry) {
    throw new Error(`No mesh geometry found in ${path.basename(filepath)}`);
  }

  const geometry = firstMesh.geometry.clone();
  geometry.applyMatrix4(firstMesh.matrixWorld);
  geometry.computeBoundingBox?.();
  geometry.computeBoundingSphere?.();
  return geometry;
}

async function main() {
  const entries = (await fs.readdir(SOURCE_DIR))
    .filter((name) => name.toLowerCase().endsWith('.glb'))
    .sort((left, right) => left.localeCompare(right));

  for (const entry of entries) {
    const filepath = path.join(SOURCE_DIR, entry);
    const geometry = await loadFirstMeshFromGlb(filepath);
    const basename = path.basename(entry, '.glb');
    const payload = geometryToLegacyPayload(`${sanitizeName(basename)}_HEAD`, geometry);
    const outputPath = path.join(SOURCE_DIR, `${basename}.legacy.json`);
    await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    const box = geometry.boundingBox || new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position'));
    const size = box.getSize(new THREE.Vector3());
    console.log(`${path.basename(outputPath)} -> ${payload.pieces[0].geometry.params.vertices.length}v / ${payload.pieces[0].geometry.params.faces.length}f / size ${size.toArray().map((value) => roundNumber(value)).join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
