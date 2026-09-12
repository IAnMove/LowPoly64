import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

const OUTPUT = path.join(process.cwd(), 'artifacts', 'mario64-speech-lab');
const MODES = ['svg', 'cutout', 'jaw'];

test.describe.configure({ timeout: 180000 });
test.describe.serial('Mario64 speech mouth lab', () => {
  for (const mode of MODES) {
    test(`${mode} mouth is ready, animatable, and GLB round-trippable`, async ({ page }) => {
      await bootstrapApp(page, '/', { requireEditorModals: false });
      const report = await page.evaluate(async (modeName) => {
        const { createSpeechMouth } = await import('/src/modules/character-studio/speech/speech-mouths.js');
        const { state } = await import('/src/modules/shared/state.js');
        const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
        const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
        const { playAnimation, stopAnimation } = await import('/src/modules/animation/animation.js');

        const finiteArray = (values) => Array.from(values || []).every((value) => Number.isFinite(value));
        const finiteObject = (root) => {
          let finite = true;
          root.traverse((node) => {
            if (!finite) return;
            finite &&= [node.position, node.quaternion, node.scale]
              .every((value) => !value || finiteArray(value.toArray()));
            if (node.matrixWorld?.elements) finite &&= finiteArray(node.matrixWorld.elements);
            for (const attribute of Object.values(node.geometry?.attributes || {})) {
              if (attribute?.array) finite &&= finiteArray(attribute.array);
            }
          });
          return finite;
        };
        const snapshot = (root) => {
          root.updateMatrixWorld(true);
          const result = {};
          root.traverse((node) => {
            result[node.name] = {
              position: node.position.toArray(),
              quaternion: node.quaternion.toArray(),
              scale: node.scale.toArray(),
              matrixWorld: node.matrixWorld.toArray(),
            };
          });
          return result;
        };
        const transformChanged = (before, after) => Object.keys(before).some((name) => {
          const a = before[name];
          const b = after[name];
          if (!b) return false;
          const beforeValues = [...a.position, ...a.quaternion, ...a.scale];
          const afterValues = [...b.position, ...b.quaternion, ...b.scale];
          return beforeValues.some((value, index) => Math.abs(value - afterValues[index]) > 1e-6);
        });
        const uniqueNames = (root) => {
          const names = [];
          root.traverse((node) => names.push(node.name));
          return names.length === new Set(names).size;
        };
        const rest = { time: 0, open: 0, wide: 0, round: 0, viseme: 'rest' };
        const openA = { time: 0.25, open: 0.86, wide: 0.86, round: 0.12, viseme: 'A' };
        const roundO = { time: 0.5, open: 0.78, wide: 0.2, round: 0.96, viseme: 'O' };
        const track = { version: 1, duration: 0.5, fps: 20, frames: [rest, openA, roundO] };
        const mouth = createSpeechMouth({ mode: modeName, width: 0.56, height: 0.25, depth: 0.16, skin: '#e9b58e' });
        await mouth.ready;

        const sourceNames = [];
        mouth.object.traverse((node) => sourceNames.push(node.name));
        const sourceMeshes = [];
        mouth.object.traverse((node) => { if (node.isMesh) sourceMeshes.push(node); });
        const readyTextures = modeName !== 'svg' || sourceMeshes.every((mesh) => !!mesh.material?.map);
        const frontZ = sourceMeshes.every((mesh) => mesh.position.z >= -1e-6);

        mouth.update(rest);
        const sourceRestSnapshot = snapshot(mouth.object);
        const restNode = sourceMeshes.find((mesh) => /OPENING|CAVITY|SVG_rest/i.test(mesh.name));
        const restClosed = mouth.object.userData.speechFrame.open === 0 && !!restNode && restNode.scale.y < 0.25;
        mouth.update(openA);
        const sourceOpenSnapshot = snapshot(mouth.object);
        const preClipFrame = { ...mouth.object.userData.speechFrame };
        const clip = mouth.createClip(track, `speech-${modeName}`);
        const postClipFrame = { ...mouth.object.userData.speechFrame };
        const clipPreservedPose = JSON.stringify(preClipFrame) === JSON.stringify(postClipFrame);

        mouth.update(rest);
        const animatedMixerRoot = mouth.object;
        animatedMixerRoot.userData.animationClips = [clip];
        animatedMixerRoot.userData.gltfAnimations = [clip.toJSON()];
        playAnimation(animatedMixerRoot, 0);
        state.animationMixer.setTime(0);
        const animatedClosed = snapshot(animatedMixerRoot);
        state.animationMixer.setTime(0.25);
        const animatedOpen = snapshot(animatedMixerRoot);
        const sourceAnimationChanged = transformChanged(animatedClosed, animatedOpen);
        stopAnimation();

        // Export through the app's own GLB route. The selected object is kept
        // outside userObjects so this lab never changes the editor scene.
        state.userObjects.clear();
        state.selectedMeshes.clear();
        state.selectedMesh = animatedMixerRoot;
        const { buffer } = await exportGLBToBuffer(`mouth-${modeName}.glb`);
        const glbBytes = Array.from(new Uint8Array(buffer));
        state.selectedMesh = null;
        const parsed = await parseGlbGroup(buffer, `mouth-${modeName}.glb`);
        const importedClip = parsed.userData.animationClips?.find((entry) => entry.name === clip.name)
          || parsed.userData.animationClips?.[0]
          || null;
        let importedClosed = null;
        let importedOpen = null;
        let importedAnimationChanged = false;
        if (importedClip) {
          playAnimation(parsed, parsed.userData.animationClips.indexOf(importedClip));
          state.animationMixer.setTime(0);
          importedClosed = snapshot(parsed);
          state.animationMixer.setTime(0.25);
          importedOpen = snapshot(parsed);
          importedAnimationChanged = transformChanged(importedClosed, importedOpen);
          stopAnimation();
        }
        let importedTextureCount = 0;
        parsed.traverse((node) => {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.filter(Boolean).forEach((material) => { if (material.map) importedTextureCount += 1; });
        });

        // Use the editor renderer for a deterministic 384px mouth-only capture.
        // This avoids importing a second Three runtime into the browser page.
        const captureObject = createSpeechMouth({ mode: modeName, width: 0.56, height: 0.25, depth: 0.16, skin: '#e9b58e' });
        await captureObject.ready;
        captureObject.update(openA);
        const sceneChildren = [...state.scene.children];
        const lights = sceneChildren.filter((child) => child.isLight);
        state.scene.clear();
        lights.forEach((light) => state.scene.add(light));
        state.renderer.setClearColor('#071225', 1);
        state.scene.fog = null;
        state.scene.add(captureObject.object);
        state.orbitControls.enabled = false;
        state.orbitControls.minDistance = 0.01;
        state.orbitControls.target.set(0, 0, 0);
        state.camera.position.set(0, 0, 0.82);
        state.camera.aspect = 1;
        state.camera.lookAt(0, 0, 0);
        state.camera.updateProjectionMatrix();
        state.renderer.setPixelRatio(1);
        state.renderer.setSize(384, 384, false);
        state.renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;width:384px;height:384px;z-index:2147483647;background:#071225;image-rendering:auto;';
        state.renderer.render(state.scene, state.camera);

        return {
          mode: modeName,
          ready: true,
          readyTextures,
          uniqueNames: uniqueNames(mouth.object),
          centered: mouth.object.position.length() === 0,
          frontZ,
          restClosed,
          sourceAnimationChanged,
          clipPreservedPose,
          clip: {
            name: clip.name,
            duration: clip.duration,
            tracks: clip.tracks.length,
            finite: clip.tracks.every((entry) => finiteArray(entry.values)),
            hasEulerRotation: clip.tracks.some((entry) => entry.name.includes('.rotation[')),
          },
          glbSize: buffer.byteLength,
          glbBinary: buffer instanceof ArrayBuffer,
          imported: {
            sceneFinite: finiteObject(parsed),
            clipCount: parsed.userData.animationClips?.length || 0,
            clipName: importedClip?.name || null,
            clipTracks: importedClip?.tracks?.length || 0,
            animationChanged: importedAnimationChanged,
            textureCount: importedTextureCount,
          },
          matrices: {
            sourceRest: sourceRestSnapshot,
            sourceOpen: sourceOpenSnapshot,
            animatedClosed,
            animatedOpen,
            importedClosed,
            importedOpen,
          },
          glbBytes,
        };
      }, mode);

      expect(report.ready).toBe(true);
      expect(report.readyTextures, `${mode} textures`).toBe(true);
      expect(report.uniqueNames).toBe(true);
      expect(report.centered).toBe(true);
      expect(report.frontZ).toBe(true);
      expect(report.restClosed).toBe(true);
      expect(report.sourceAnimationChanged).toBe(true);
      expect(report.clipPreservedPose).toBe(true);
      expect(report.clip.name).toBe(`speech-${mode}`);
      expect(report.clip.duration).toBe(0.5);
      expect(report.clip.tracks).toBeGreaterThan(0);
      expect(report.clip.finite).toBe(true);
      expect(report.clip.hasEulerRotation).toBe(false);
      expect(report.glbBinary).toBe(true);
      expect(report.glbSize).toBeGreaterThan(100);
      expect(report.imported.sceneFinite).toBe(true);
      expect(report.imported.clipCount).toBeGreaterThan(0);
      expect(report.imported.clipName).toBe(`speech-${mode}`);
      expect(report.imported.clipTracks).toBeGreaterThan(0);
      expect(report.imported.animationChanged).toBe(true);
      if (mode === 'svg') expect(report.imported.textureCount).toBeGreaterThan(0);

      await fs.mkdir(OUTPUT, { recursive: true });
      await fs.writeFile(path.join(OUTPUT, `mouth-${mode}.glb`), Buffer.from(report.glbBytes));
      await page.locator('#canvas').screenshot({ path: path.join(OUTPUT, `mouth-${mode}-open.png`), animations: 'disabled' });
      const verification = {
        mode: report.mode,
        ready: report.ready,
        readyTextures: report.readyTextures,
        uniqueNames: report.uniqueNames,
        centered: report.centered,
        frontZ: report.frontZ,
        restClosed: report.restClosed,
        sourceAnimationChanged: report.sourceAnimationChanged,
        clipPreservedPose: report.clipPreservedPose,
        clip: report.clip,
        glbSize: report.glbSize,
        imported: report.imported,
        matrices: report.matrices,
      };
      const verificationPath = path.join(OUTPUT, 'mouth-verification.json');
      let existing = {};
      try {
        existing = JSON.parse(await fs.readFile(verificationPath, 'utf8'));
      } catch {}
      existing[mode] = verification;
      await fs.writeFile(verificationPath, JSON.stringify(existing, null, 2));
      await assertNoPageErrors(page);
    });
  }
});

