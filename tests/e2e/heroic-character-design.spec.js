import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

const OUTPUT = path.join(process.cwd(), 'artifacts', 'psx-hero-art-direction');
test.describe.configure({ timeout: 180000 });
test.describe.serial('PSX heroic character design', () => {
  async function initialize(page) {
    await bootstrapApp(page, '/', { requireEditorModals: false });
    await page.evaluate(async () => {
      const { executeAgentCommand } = await import('/src/modules/agent/agent-command-api.js');
      const { characterDrafts } = await import('/src/modules/agent/character-commands.js');
      const { clearHistory } = await import('/src/modules/shared/undo.js');
      const s = window.__LOWPOLY64_STATE__;
      s.userObjects.clear();
      s.selectedMesh = null;
      s.selectedMeshes.clear();
      characterDrafts.clear();
      clearHistory();
      window.characterCommand = async (name, args = {}) => {
        const result = await executeAgentCommand(name, args);
        if (!result.ok) throw new Error(`${name}: ${JSON.stringify(result.error)}`);
        return result;
      };
    });
  }

  test('builds Cloud heroic preset, round-trips JSON and GLB, and plays its rig', async ({ page }) => {
    await initialize(page);
    const report = await page.evaluate(async () => {
      const run = window.characterCommand;
      const s = window.__LOWPOLY64_STATE__;
      const { importObjectFromJSON, importGlbFromBuffer } = await import('/src/modules/viewport/json-import.js');
      const { playAnimation, stopAnimation } = await import('/src/modules/animation/animation.js');

      const parentName = node => node?.parent?.userData?.name || node?.parent?.name || null;
      const nodeName = node => node?.userData?.name || node?.name || null;
      const finiteArray = values => Array.from(values || []).every(value => Number.isFinite(value));
      const finiteNode = node => {
        const arrays = [node.position?.toArray?.(), node.quaternion?.toArray?.(), node.scale?.toArray?.()];
        if (arrays.some(values => values && !finiteArray(values))) return false;
        if (node.geometry?.attributes) {
          for (const attribute of Object.values(node.geometry.attributes)) {
            if (attribute?.array && !finiteArray(attribute.array)) return false;
          }
        }
        return true;
      };
      const snapshot = root => {
        const values = [];
        root.traverse(node => values.push([
          nodeName(node),
          ...node.position.toArray(),
          ...node.quaternion.toArray(),
        ]));
        return values;
      };
      const changed = (before, after) => before.some((entry, index) => entry.slice(1).some((value, offset) => Math.abs(value - after[index][offset + 1]) > 1e-7));
      const animationReport = root => {
        const clips = root.userData.animationClips || [];
        const entries = [];
        let moving = false;
        for (let index = 0; index < clips.length; index += 1) {
          const clip = clips[index];
          playAnimation(root, index);
          s.animationMixer.setTime(0);
          const before = snapshot(root);
          s.animationMixer.setTime(Math.min(Math.max(clip.duration || 0, 0.23), 0.23));
          const after = snapshot(root);
          const moved = changed(before, after);
          moving ||= moved;
          entries.push({ name: clip.name, duration: clip.duration, trackCount: clip.tracks?.length || 0, moved, finite: (clip.tracks || []).every(track => finiteArray(track.values)) });
          stopAnimation();
        }
        return { count: clips.length, names: clips.map(clip => clip.name), moving, entries };
      };
      const normalAlignmentReport = root => {
        const result = {};
        for (const name of ['HEAD', 'HAIR_CAP']) {
          const pivot = root.getObjectByName(name);
          const mesh = pivot?.children?.find(child => child.isMesh);
          const position = mesh?.geometry?.attributes?.position;
          const normal = mesh?.geometry?.attributes?.normal;
          const index = mesh?.geometry?.getIndex?.();
          const indices = index ? Array.from(index.array) : Array.from({ length: position?.count || 0 }, (_, value) => value);
          let minDot = 1;
          let mismatch = 0;
          let triangles = 0;
          const point = (attribute, value) => [attribute.getX(value), attribute.getY(value), attribute.getZ(value)];
          const normalFor = (a, b, c) => {
            const ab = b.map((value, axis) => value - a[axis]);
            const ac = c.map((value, axis) => value - a[axis]);
            const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
            const length = Math.hypot(...cross);
            return length > 1e-9 ? cross.map(value => value / length) : null;
          };
          if (position && normal) {
            for (let offset = 0; offset + 2 < indices.length; offset += 3) {
              const face = normalFor(point(position, indices[offset]), point(position, indices[offset + 1]), point(position, indices[offset + 2]));
              if (!face) continue;
              triangles += 1;
              for (const corner of [0, 1, 2]) {
                const vertex = point(normal, indices[offset + corner]);
                const length = Math.hypot(...vertex);
                if (length <= 1e-9) { mismatch += 1; continue; }
                const dot = Math.max(-1, Math.min(1, (vertex[0] * face[0] + vertex[1] * face[1] + vertex[2] * face[2]) / length));
                minDot = Math.min(minDot, dot);
                if (dot < 0.995) mismatch += 1;
              }
            }
          }
          result[name] = { indexed: !!index, triangles, minDot, mismatch, normalCount: normal?.count || 0 };
        }
        return result;
      };
      const sourceGeometryState = root => Object.fromEntries(['HEAD', 'HAIR_CAP'].map(name => {
        const pivot = root.getObjectByName(name);
        const mesh = pivot?.children?.find(child => child.isMesh);
        const geometry = mesh?.geometry;
        return [name, {
          geometry,
          index: geometry?.getIndex() ? Array.from(geometry.getIndex().array) : null,
          position: geometry?.attributes?.position ? Array.from(geometry.attributes.position.array) : null,
          normal: geometry?.attributes?.normal ? Array.from(geometry.attributes.normal.array) : null,
          flatShading: mesh?.material?.flatShading,
        }];
      }));
      const characterReport = root => {
        const design = root.userData.characterDesignRecipe || {};
        const required = ['HEAD', 'FACE_LIP', 'BROW_L', 'HAIR_CAP', 'HAIR_CROWN_HIGH', 'EQUIP_SWORD_BLADE', 'EQUIP_PAULDRON_LEFT'];
        const nodes = Object.fromEntries(required.map(name => [name, root.getObjectByName(name)]));
        const attachments = {
          FACE_LIP: parentName(nodes.FACE_LIP),
          BROW_L: parentName(nodes.BROW_L),
          HAIR_CROWN_HIGH: parentName(nodes.HAIR_CROWN_HIGH),
          EQUIP_SWORD_BLADE: parentName(nodes.EQUIP_SWORD_BLADE),
          EQUIP_PAULDRON_LEFT: parentName(nodes.EQUIP_PAULDRON_LEFT),
        };
        let finite = true;
        root.traverse(node => { finite &&= finiteNode(node); });
        const clips = root.userData.animationClips || [];
        finite &&= clips.every(clip => (clip.tracks || []).every(track => finiteArray(track.values)));
        return {
          profiles: {
            body: design.body?.profile,
            head: design.head?.profile,
            hair: design.hair?.style,
            outfit: design.outfit?.style,
            sword: design.equipment?.sword?.profile,
            pauldron: design.equipment?.pauldron?.profile,
          },
          present: Object.fromEntries(required.map(name => [name, !!nodes[name]])),
          attachments,
          finite,
          normals: normalAlignmentReport(root),
          animation: animationReport(root),
        };
      };

      const created = await run('build_character_draft', { catalog_id: 'studio:cloud-psx', operation_id: 'cloud-hero-build-001' });
      const built = await run('evaluate_character', { draft_id: created.data.draftId });
      const committed = await run('commit_character_draft', { draft_id: created.data.draftId, expected_revision: 0, operation_id: 'cloud-hero-commit-001' });
      const id = committed.data.id;
      const group = s.userObjects.children[0];
      const sourceBefore = sourceGeometryState(group);
      const views = await run('render_character_views', { id, size: 512 });
      const original = characterReport(group);
      const exportedJson = await run('export_character_asset', { id, format: 'json' });
      const exportedGlb = await run('export_character_asset', { id, format: 'glb' });
      const exportedRecipe = await run('export_character_asset', { id, format: 'recipe' });
      const json = exportedJson.artifacts[0].data;
      const glb = exportedGlb.artifacts[0].data;
      const recipe = exportedRecipe.artifacts[0].data;

      stopAnimation();
      s.userObjects.clear();
      s.selectedMesh = null;
      s.selectedMeshes.clear();
      const jsonResult = await importObjectFromJSON(JSON.stringify(json));
      const jsonRoot = s.userObjects.children.at(-1);
      const jsonReport = jsonRoot ? characterReport(jsonRoot) : null;

      stopAnimation();
      s.userObjects.clear();
      s.selectedMesh = null;
      s.selectedMeshes.clear();
      const binary = Uint8Array.from(atob(glb), character => character.charCodeAt(0));
      const glbResult = await importGlbFromBuffer(binary.buffer, 'cloud-hero.glb');
      const glbRoot = s.userObjects.children.at(-1);
      const glbReport = glbRoot ? characterReport(glbRoot) : null;
      const sourceAfter = sourceGeometryState(group);
      const sourceUnchanged = ['HEAD', 'HAIR_CAP'].every(name => {
        const before = sourceBefore[name], after = sourceAfter[name];
        return before.geometry === after.geometry
          && JSON.stringify(before.index) === JSON.stringify(after.index)
          && JSON.stringify(before.position) === JSON.stringify(after.position)
          && JSON.stringify(before.normal) === JSON.stringify(after.normal)
          && before.flatShading === after.flatShading;
      });

      return {
        id,
        built: built.data,
        views: views.artifacts.map(view => ({ view: view.view, width: view.width, height: view.height, bytes: view.data.length })),
        original,
        jsonResult,
        jsonReport,
        glbResult,
        glbReport,
        sourceUnchanged,
        json,
        glb,
        recipe,
      };
    });

    expect(report.built.valid, JSON.stringify(report.built.issues)).toBe(true);
    expect(report.jsonResult.success, report.jsonResult.error).toBe(true);
    expect(report.glbResult.success, report.glbResult.error).toBe(true);
    expect(report.sourceUnchanged).toBe(true);
    expect(report.glbReport.normals.HEAD.minDot).toBeGreaterThan(0.995);
    expect(report.glbReport.normals.HAIR_CAP.minDot).toBeGreaterThan(0.995);
    expect(report.glbReport.normals.HEAD.mismatch).toBe(0);
    expect(report.glbReport.normals.HAIR_CAP.mismatch).toBe(0);
    for (const result of [report.original, report.jsonReport, report.glbReport]) {
      expect(result, 'character report exists').toBeTruthy();
      expect(result.finite).toBe(true);
      expect(result.profiles).toEqual({ body: 'heroic', head: 'heroic', hair: 'hero_spikes', outfit: 'soldier', sword: 'buster', pauldron: 'shell' });
      for (const present of Object.values(result.present)) expect(present).toBe(true);
      expect(result.attachments).toEqual({
        FACE_LIP: 'HEAD',
        BROW_L: 'HEAD',
        HAIR_CROWN_HIGH: 'HEAD',
        EQUIP_SWORD_BLADE: 'HAND_R',
        EQUIP_PAULDRON_LEFT: 'CLAVICLE_L',
      });
      expect(result.animation.count).toBeGreaterThan(0);
      expect(result.animation.moving).toBe(true);
      expect(result.animation.entries.every(entry => entry.finite)).toBe(true);
    }
    expect(report.views.map(view => view.view)).toEqual(['front', 'profile', 'three-quarter']);
    expect(report.recipe.body.profile).toBe('heroic');
    expect(report.recipe.head.profile).toBe('heroic');
    expect(report.recipe.equipment.sword.profile).toBe('buster');
    expect(report.recipe.equipment.pauldron.profile).toBe('shell');

    await fs.mkdir(OUTPUT, { recursive: true });
    await fs.writeFile(path.join(OUTPUT, 'cloud-hero.json'), JSON.stringify(report.json, null, 2));
    await fs.writeFile(path.join(OUTPUT, 'cloud-hero.recipe.json'), JSON.stringify(report.recipe, null, 2));
    await fs.writeFile(path.join(OUTPUT, 'cloud-hero.glb'), Buffer.from(report.glb, 'base64'));
    await fs.writeFile(path.join(OUTPUT, 'verification.json'), JSON.stringify({
      preset: 'studio:cloud-psx',
      id: report.id,
      profiles: report.original.profiles,
      attachments: report.original.attachments,
      finite: report.original.finite && report.jsonReport.finite && report.glbReport.finite,
      sourceUnchanged: report.sourceUnchanged,
      glbNormals: report.glbReport.normals,
      animations: {
        original: report.original.animation,
        json: report.jsonReport.animation,
        glb: report.glbReport.animation,
      },
      roundTrip: {
        json: report.jsonResult.success,
        glb: report.glbResult.success,
        viewNames: report.views.map(view => view.view),
      },
    }, null, 2));
    await assertNoPageErrors(page);
  });

  test('patches heroic proportions, face, hair and sword while preserving manual transforms, IDs, gloves and boots', async ({ page }) => {
    await initialize(page);
    const report = await page.evaluate(async () => {
      const run = window.characterCommand;
      const { characterDrafts } = await import('/src/modules/agent/character-commands.js');
      const s = window.__LOWPOLY64_STATE__;
      const named = node => node?.userData?.name || node?.name || null;
      const material = node => node?.children?.find(child => child.isMesh)?.material?.color?.getHexString?.() || null;
      const meshSize = node => {
        const mesh = node?.children?.find(child => child.isMesh);
        const position = mesh?.geometry?.attributes?.position;
        if (!position) return null;
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let index = 0; index < position.count; index += 1) {
          for (let axis = 0; axis < 3; axis += 1) {
            const coordinate = axis === 0 ? position.getX(index) : axis === 1 ? position.getY(index) : position.getZ(index);
            min[axis] = Math.min(min[axis], coordinate);
            max[axis] = Math.max(max[axis], coordinate);
          }
        }
        return max.map((value, axis) => value - min[axis]);
      };
      const nodeState = (root, name) => {
        const node = root.getObjectByName(name);
        return node ? {
          id: node.userData?.agentId,
          position: node.position.toArray(),
          scale: node.scale.toArray(),
          rotation: node.rotation.toArray(),
          material: material(node),
          meshSize: meshSize(node),
          parent: named(node.parent),
        } : null;
      };
      const finite = root => {
        let valid = true;
        root.traverse(node => {
          valid &&= [...node.position.toArray(), ...node.quaternion.toArray(), ...node.scale.toArray()].every(Number.isFinite);
          if (node.geometry?.attributes?.position?.array) valid &&= Array.from(node.geometry.attributes.position.array).every(Number.isFinite);
        });
        return valid;
      };

      const created = await run('build_character_draft', { catalog_id: 'studio:cloud-psx', operation_id: 'cloud-patch-build-001' });
      const committed = await run('commit_character_draft', { draft_id: created.data.draftId, expected_revision: 0, operation_id: 'cloud-patch-commit-001' });
      const original = s.userObjects.children[0];
      const torso = original.getObjectByName('TORSO');
      const hand = original.getObjectByName('HAND_R');
      torso.scale.x = 1.17;
      torso.rotation.z = 0.13;
      hand.rotation.x = 0.23;
      const manualBadge = torso.children.find(child => child.isMesh)?.clone();
      manualBadge.name = 'MANUAL_CLOUD_BADGE';
      manualBadge.userData = { ...manualBadge.userData, name: manualBadge.name };
      torso.add(manualBadge);
      original.updateMatrixWorld(true);
      const names = ['TORSO', 'HAND_R', 'FOOT_L', 'OUTFIT_GLOVE_L', 'OUTFIT_WAIST_BELT', 'OUTFIT_BOOT_CUFF_L', 'OUTFIT_BOOT_SOLE_L'];
      const before = Object.fromEntries(names.map(name => [name, nodeState(original, name)]));
      const draft = await run('build_character_draft', { source_id: committed.data.id, operation_id: 'cloud-patch-draft-001' });
      const draftId = draft.data.draftId;
      await run('patch_character_draft', { draft_id: draftId, expected_revision: 0, operation_id: 'cloud-patch-body-001', patch: { body: { shoulders: 1.22, waist: 0.86 } } });
      await run('patch_character_draft', { draft_id: draftId, expected_revision: 1, operation_id: 'cloud-patch-head-001', patch: { head: { jaw: 1.14 } } });
      await run('patch_character_draft', { draft_id: draftId, expected_revision: 2, operation_id: 'cloud-patch-hair-sword-shirt-001', patch: { hair: { style: 'hero_spikes', color: '#d9823b' }, equipment: { sword: { width: 0.58 } }, outfit: { shirt: '#4d638e' } } });
      const final = characterDrafts.version(characterDrafts.get(draftId)).group;
      const after = Object.fromEntries(names.map(name => [name, nodeState(final, name)]));
      const recipe = final.userData.characterDesignRecipe;
      const sword = final.getObjectByName('EQUIP_SWORD_BLADE');
      const report = {
        recipe,
        finite: finite(final),
        manualBadge: !!final.getObjectByName('MANUAL_CLOUD_BADGE'),
        before,
        after,
        swordParent: named(sword?.parent),
        rootId: final.userData.agentId,
        sourceId: committed.data.id,
        revision: final.userData.characterDesignRevision,
        draftRevision: characterDrafts.get(draftId).revision,
        gloveMaterial: material(final.getObjectByName('OUTFIT_GLOVE_L')),
        bootCuffMaterial: material(final.getObjectByName('OUTFIT_BOOT_CUFF_L')),
        bootSoleMaterial: material(final.getObjectByName('OUTFIT_BOOT_SOLE_L')),
        collarMaterial: material(final.getObjectByName('OUTFIT_COLLAR')),
        beltMaterial: material(final.getObjectByName('OUTFIT_WAIST_BELT')),
      };
      return report;
    });

    expect(report.finite).toBe(true);
    expect(report.manualBadge).toBe(true);
    expect(report.recipe.body.shoulders).toBe(1.22);
    expect(report.recipe.body.waist).toBe(0.86);
    expect(report.recipe.head.jaw).toBe(1.14);
    expect(report.recipe.hair.color).toBe('#d9823b');
    expect(report.recipe.outfit.shirt).toBe('#4d638e');
    expect(report.recipe.equipment.sword.width).toBe(0.58);
    expect(report.swordParent).toBe('HAND_R');
    expect(report.draftRevision).toBe(3);
    expect(report.sourceId).toBe(report.rootId);
    for (const name of ['TORSO', 'HAND_R', 'FOOT_L', 'OUTFIT_GLOVE_L', 'OUTFIT_WAIST_BELT', 'OUTFIT_BOOT_CUFF_L', 'OUTFIT_BOOT_SOLE_L']) {
      expect(report.after[name], `${name} survived patch`).toBeTruthy();
      expect(report.after[name].id).toBe(report.before[name].id);
    }
    expect(report.after.TORSO.scale[0]).toBeCloseTo(1.17);
    expect(report.after.TORSO.rotation[2]).toBeCloseTo(0.13);
    expect(report.after.HAND_R.rotation[0]).toBeCloseTo(0.23);
    expect(report.gloveMaterial).toBe(report.before.OUTFIT_GLOVE_L.material);
    expect(report.beltMaterial).toBe(report.before.OUTFIT_WAIST_BELT.material);
    expect(report.bootCuffMaterial).toBe(report.before.OUTFIT_BOOT_CUFF_L.material);
    expect(report.bootSoleMaterial).toBe(report.before.OUTFIT_BOOT_SOLE_L.material);
    expect(report.collarMaterial).toBe('4d638e');
    expect(report.beltMaterial).not.toBe('4d638e');
    expect(report.after.OUTFIT_WAIST_BELT.meshSize[0]).not.toBeCloseTo(report.before.OUTFIT_WAIST_BELT.meshSize[0], 4);

    await fs.mkdir(OUTPUT, { recursive: true });
    let verification = {};
    try { verification = JSON.parse(await fs.readFile(path.join(OUTPUT, 'verification.json'), 'utf8')); } catch {}
    verification.patch = {
      finite: report.finite,
      manualBadge: report.manualBadge,
      recipe: {
        shoulders: report.recipe.body.shoulders,
        waist: report.recipe.body.waist,
        jaw: report.recipe.head.jaw,
        hairColor: report.recipe.hair.color,
        swordWidth: report.recipe.equipment.sword.width,
      },
      idsPreserved: ['TORSO', 'HAND_R', 'FOOT_L', 'OUTFIT_GLOVE_L', 'OUTFIT_WAIST_BELT', 'OUTFIT_BOOT_CUFF_L', 'OUTFIT_BOOT_SOLE_L'].every(name => report.after[name]?.id === report.before[name]?.id),
      manualTransformsPreserved: report.after.TORSO.scale[0] === report.before.TORSO.scale[0]
        && report.after.TORSO.rotation[2] === report.before.TORSO.rotation[2]
        && report.after.HAND_R.rotation[0] === report.before.HAND_R.rotation[0],
      materialsPreserved: report.gloveMaterial === report.before.OUTFIT_GLOVE_L.material
        && report.beltMaterial === report.before.OUTFIT_WAIST_BELT.material
        && report.bootCuffMaterial === report.before.OUTFIT_BOOT_CUFF_L.material
        && report.bootSoleMaterial === report.before.OUTFIT_BOOT_SOLE_L.material,
      soldierShirtOnlyChangedCollar: report.collarMaterial === '4d638e' && report.beltMaterial !== '4d638e',
      outfitRegeneratedForBody: report.after.OUTFIT_WAIST_BELT.meshSize[0] !== report.before.OUTFIT_WAIST_BELT.meshSize[0],
    };
    await fs.writeFile(path.join(OUTPUT, 'verification.json'), JSON.stringify(verification, null, 2));
    await assertNoPageErrors(page);
  });
  test('bakes flat normals without changing smooth groups or source attributes', async ({ page }) => {
    await initialize(page);
    const report = await page.evaluate(async () => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { prepareObjectForGlbExport } = await import('/src/modules/viewport/export.js');
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0, 1, 0, 0, 0, 1, 0,
        0, 0, 1, 1, 0, 1, 0, 0, 2,
      ], 3));
      geometry.setIndex([0, 1, 2, 3, 4, 5]);
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
        0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 1, 0, 0, 1, 0, 0, 1, 0,
      ], 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      ], 2));
      geometry.setAttribute('color', new THREE.Uint8BufferAttribute([
        255, 0, 0, 0, 255, 0, 0, 0, 255,
        128, 128, 0, 0, 128, 128, 128, 0, 128,
      ], 3, true));
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
        13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
      ], 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([
        1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
        0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0, 0, 0.75, 0.25, 0, 0,
      ], 4));
      geometry.morphAttributes.position = [new THREE.Float32BufferAttribute([
        0.1, 0, 0, 1.1, 0, 0, 0.1, 1, 0,
        0, 0, 1.1, 1, 0, 1.1, 0, 0, 2.1,
      ], 3)];
      geometry.morphTargetsRelative = true;
      geometry.addGroup(0, 3, 0);
      geometry.addGroup(3, 3, 1);
      const flat = new THREE.MeshStandardMaterial({ color: 0xff0000, flatShading: true });
      const smooth = new THREE.MeshStandardMaterial({ color: 0x00ff00, flatShading: false });
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(geometry, [flat, smooth]);
      mesh.name = 'MIXED_FLAT_SMOOTH';
      group.add(mesh);
      const source = {
        geometry,
        index: Array.from(geometry.index.array),
        color: Array.from(geometry.getAttribute('color').array),
        colorNormalized: geometry.getAttribute('color').normalized,
        skinIndex: Array.from(geometry.getAttribute('skinIndex').array),
        skinWeight: Array.from(geometry.getAttribute('skinWeight').array),
        morph: Array.from(geometry.morphAttributes.position[0].array),
        flatShading: flat.flatShading,
        smoothShading: smooth.flatShading,
      };
      const prepared = prepareObjectForGlbExport(group);
      const preparedMesh = prepared.object.getObjectByName('MIXED_FLAT_SMOOTH');
      const preparedGeometry = preparedMesh.geometry;
      const position = preparedGeometry.getAttribute('position');
      const normal = preparedGeometry.getAttribute('normal');
      const flatNormal = [normal.getX(0), normal.getY(0), normal.getZ(0)];
      const smoothNormal = [normal.getX(3), normal.getY(3), normal.getZ(3)];
      const sourceStillSame = mesh.geometry === geometry
        && geometry.getIndex() !== null
        && JSON.stringify(Array.from(geometry.index.array)) === JSON.stringify(source.index)
        && JSON.stringify(Array.from(geometry.getAttribute('color').array)) === JSON.stringify(source.color)
        && geometry.getAttribute('color').normalized === source.colorNormalized
        && JSON.stringify(Array.from(geometry.getAttribute('skinIndex').array)) === JSON.stringify(source.skinIndex)
        && JSON.stringify(Array.from(geometry.getAttribute('skinWeight').array)) === JSON.stringify(source.skinWeight)
        && JSON.stringify(Array.from(geometry.morphAttributes.position[0].array)) === JSON.stringify(source.morph)
        && flat.flatShading === source.flatShading
        && smooth.flatShading === source.smoothShading;
      return {
        sourceStillSame,
        preparedHasNoIndex: preparedGeometry.getIndex() === null,
        groups: preparedGeometry.groups.map(entry => ({ start: entry.start, count: entry.count, materialIndex: entry.materialIndex })),
        counts: {
          position: position.count,
          uv: preparedGeometry.getAttribute('uv')?.count,
          color: preparedGeometry.getAttribute('color')?.count,
          skinIndex: preparedGeometry.getAttribute('skinIndex')?.count,
          skinWeight: preparedGeometry.getAttribute('skinWeight')?.count,
          morph: preparedGeometry.morphAttributes.position?.[0]?.count,
        },
        color: Array.from(preparedGeometry.getAttribute('color').array),
        colorNormalized: preparedGeometry.getAttribute('color').normalized,
        skinIndex: Array.from(preparedGeometry.getAttribute('skinIndex').array),
        skinWeight: Array.from(preparedGeometry.getAttribute('skinWeight').array),
        morph: Array.from(preparedGeometry.morphAttributes.position[0].array),
        flatNormal,
        smoothNormal,
        preparedMaterials: preparedMesh.material.map(material => ({ flatShading: material.flatShading })),
      };
    });
    expect(report.sourceStillSame).toBe(true);
    expect(report.preparedHasNoIndex).toBe(true);
    expect(report.groups).toEqual([{ start: 0, count: 3, materialIndex: 0 }, { start: 3, count: 3, materialIndex: 1 }]);
    expect(report.counts).toEqual({ position: 6, uv: 6, color: 6, skinIndex: 6, skinWeight: 6, morph: 6 });
    expect(report.color).toEqual([255, 0, 0, 0, 255, 0, 0, 0, 255, 128, 128, 0, 0, 128, 128, 128, 0, 128]);
    expect(report.colorNormalized).toBe(true);
    expect(report.skinIndex).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
    expect(report.skinWeight).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0, 0, 0.75, 0.25, 0, 0]);
    const expectedMorph = [0.1, 0, 0, 1.1, 0, 0, 0.1, 1, 0, 0, 0, 1.1, 1, 0, 1.1, 0, 0, 2.1];
    expect(report.morph).toHaveLength(expectedMorph.length);
    report.morph.forEach((value, index) => expect(value).toBeCloseTo(expectedMorph[index], 5));
    expect(report.flatNormal[2]).toBeCloseTo(1);
    expect(report.flatNormal[0]).toBeCloseTo(0);
    expect(report.flatNormal[1]).toBeCloseTo(0);
    expect(report.smoothNormal).toEqual([0, 1, 0]);
    expect(report.preparedMaterials).toEqual([{ flatShading: true }, { flatShading: false }]);
    await assertNoPageErrors(page);
  });
});