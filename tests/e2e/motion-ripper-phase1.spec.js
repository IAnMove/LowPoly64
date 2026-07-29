import { test, expect } from '@playwright/test';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
} from './helpers/app.js';

test.describe.configure({ timeout: 300000 });

async function inspectGroup(page, templateId) {
  return page.evaluate(async (id) => {
    const state = window.__LOWPOLY64_STATE__;
    const group = state.userObjects.children.find((child) => child.userData?.templateId === id);
    if (!group) {
      throw new Error(`Template group not found: ${id}`);
    }

    const nodes = {};
    group.traverse((node) => {
      if (!node?.userData?.isPivot) return;
      const name = String(node?.userData?.name || node?.name || '').trim();
      if (!name || name === (group.userData?.name || group.name)) return;

      let parentName = null;
      let parent = node.parent;
      while (parent && parent !== group) {
        parentName = String(parent?.userData?.name || parent?.name || '').trim() || null;
        if (parentName) break;
        parent = parent.parent;
      }

      nodes[name] = {
        parent: parentName,
      };
    });

    return {
      templateId: group.userData?.templateId || null,
      skeletonId: group.userData?.skeletonId || null,
      archetype: group.userData?.archetype || null,
      humanoidRigMode: group.userData?.humanoidRigMode || null,
      defaultFacingYaw: group.userData?.defaultFacingYaw ?? null,
      animationClipCount: group.userData?.animationClips?.length || 0,
      syntheticHumanoidPivots: [...(group.userData?.syntheticHumanoidPivots || [])],
      slotMap: group.userData?.slotMap || {},
      nodes,
    };
  }, templateId);
}

test('keeps humanoid capture targets structurally valid on skeleton and star_ranger', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  await addTemplate(page, 'skeleton');
  await addTemplate(page, 'star_ranger');

  const skeleton = await inspectGroup(page, 'skeleton');
  expect(skeleton.skeletonId).toBe('HUMANOID_DEFAULT');
  expect(skeleton.archetype).toBe('HUMANOID');
  expect(skeleton.humanoidRigMode).toBe('explicit');
  expect(skeleton.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(skeleton.animationClipCount).toBeGreaterThan(0);
  expect(skeleton.nodes.TORSO?.parent).toBe('PELVIS');
  expect(skeleton.nodes.CHEST?.parent).toBe('TORSO');
  expect(skeleton.nodes.NECK?.parent).toBe('CHEST');
  expect(skeleton.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(skeleton.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(skeleton.nodes.LEFT_ARM_UPPER?.parent).toBe('CLAVICLE_L');
  expect(skeleton.nodes.RIGHT_ARM_UPPER?.parent).toBe('CLAVICLE_R');
  expect(skeleton.nodes.LEFT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(skeleton.nodes.RIGHT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(skeleton.nodes.PELVIS_VISUAL?.parent).toBe('PELVIS');
  expect(skeleton.nodes.TORSO_VISUAL?.parent).toBe('TORSO');
  expect(skeleton.nodes.RIBCAGE?.parent).toBe('CHEST');
  expect(skeleton.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'PELVIS_VISUAL', 'TORSO', 'CHEST', 'NECK']));

  const starRanger = await inspectGroup(page, 'star_ranger');
  expect(starRanger.skeletonId).toBe('HUMANOID_STANDARD');
  expect(starRanger.archetype).toBe('HUMANOID');
  expect(starRanger.humanoidRigMode).toBe('explicit');
  expect(starRanger.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(starRanger.animationClipCount).toBeGreaterThan(0);
  expect(starRanger.nodes.TORSO?.parent).toBe('PELVIS');
  expect(starRanger.nodes.CHEST?.parent).toBe('TORSO');
  expect(starRanger.nodes.NECK?.parent).toBe('CHEST');
  expect(starRanger.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(starRanger.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(starRanger.nodes.LEFT_ARM_UPPER?.parent).toBe('CLAVICLE_L');
  expect(starRanger.nodes.RIGHT_ARM_UPPER?.parent).toBe('CLAVICLE_R');
  expect(starRanger.nodes.LEFT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(starRanger.nodes.RIGHT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(starRanger.nodes.TORSO_VISUAL?.parent).toBe('CHEST');
  expect(starRanger.nodes.BELT?.parent).toBe('TORSO');
  expect(starRanger.nodes.BLASTER_GLOW?.parent).toBe('BLASTER');

  await assertNoPageErrors(page);
});

test('keeps hero and knight on explicit humanoid rig nodes', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  await addTemplate(page, 'hero');
  await addTemplate(page, 'knight');

  const hero = await inspectGroup(page, 'hero');
  expect(hero.skeletonId).toBe('HUMANOID_STANDARD');
  expect(hero.archetype).toBe('HUMANOID');
  expect(hero.humanoidRigMode).toBe('explicit');
  expect(hero.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(hero.animationClipCount).toBeGreaterThan(0);
  expect(hero.syntheticHumanoidPivots).not.toEqual(expect.arrayContaining(['PELVIS', 'CHEST', 'NECK', 'CLAVICLE_L', 'CLAVICLE_R']));
  expect(hero.nodes.TORSO?.parent).toBe('PELVIS');
  expect(hero.nodes.CHEST?.parent).toBe('TORSO');
  expect(hero.nodes.NECK?.parent).toBe('CHEST');
  expect(hero.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(hero.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(hero.nodes.HEAD?.parent).toBe('NECK');
  expect(hero.nodes.LEFT_ARM_UPPER?.parent).toBe('CLAVICLE_L');
  expect(hero.nodes.RIGHT_ARM_UPPER?.parent).toBe('CLAVICLE_R');
  expect(hero.nodes.LEFT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(hero.nodes.RIGHT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(hero.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK', 'TORSO_VISUAL']));

  const knight = await inspectGroup(page, 'knight');
  expect(knight.skeletonId).toBe('HUMANOID_DEFAULT');
  expect(knight.archetype).toBe('HUMANOID');
  expect(knight.humanoidRigMode).toBe('explicit');
  expect(knight.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(knight.animationClipCount).toBeGreaterThan(0);
  expect(knight.syntheticHumanoidPivots).not.toEqual(expect.arrayContaining(['PELVIS', 'CHEST', 'NECK', 'CLAVICLE_L', 'CLAVICLE_R']));
  expect(knight.nodes.TORSO?.parent).toBe('PELVIS');
  expect(knight.nodes.CHEST?.parent).toBe('TORSO');
  expect(knight.nodes.NECK?.parent).toBe('CHEST');
  expect(knight.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(knight.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(knight.nodes.HEAD?.parent).toBe('NECK');
  expect(knight.nodes.LEFT_ARM_UPPER?.parent).toBe('CLAVICLE_L');
  expect(knight.nodes.RIGHT_ARM_UPPER?.parent).toBe('CLAVICLE_R');
  expect(knight.nodes.LEFT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(knight.nodes.RIGHT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(knight.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK', 'TORSO_VISUAL']));

  await assertNoPageErrors(page);
});

test('keeps archer and mage on explicit humanoid rig nodes', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  await addTemplate(page, 'archer');
  await addTemplate(page, 'mage');

  const archer = await inspectGroup(page, 'archer');
  expect(archer.skeletonId).toBe('HUMANOID_DEFAULT');
  expect(archer.archetype).toBe('HUMANOID');
  expect(archer.humanoidRigMode).toBe('explicit');
  expect(archer.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(archer.animationClipCount).toBeGreaterThan(0);
  expect(archer.syntheticHumanoidPivots).not.toEqual(expect.arrayContaining(['PELVIS', 'CHEST', 'NECK', 'CLAVICLE_L', 'CLAVICLE_R']));
  expect(archer.nodes.TORSO?.parent).toBe('PELVIS');
  expect(archer.nodes.CHEST?.parent).toBe('TORSO');
  expect(archer.nodes.NECK?.parent).toBe('CHEST');
  expect(archer.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(archer.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(archer.nodes.HEAD?.parent).toBe('NECK');
  expect(archer.nodes.LEFT_ARM_UPPER?.parent).toBe('CLAVICLE_L');
  expect(archer.nodes.RIGHT_ARM_UPPER?.parent).toBe('CLAVICLE_R');
  expect(archer.nodes.LEFT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(archer.nodes.RIGHT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(archer.nodes.QUIVER?.parent).toBe('CHEST');
  expect(archer.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK', 'TORSO_VISUAL']));

  const mage = await inspectGroup(page, 'mage');
  expect(mage.skeletonId).toBe('HUMANOID_DEFAULT');
  expect(mage.archetype).toBe('HUMANOID');
  expect(mage.humanoidRigMode).toBe('explicit');
  expect(mage.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(mage.animationClipCount).toBeGreaterThan(0);
  expect(mage.syntheticHumanoidPivots).not.toEqual(expect.arrayContaining(['PELVIS', 'CHEST', 'NECK', 'CLAVICLE_L', 'CLAVICLE_R']));
  expect(mage.nodes.TORSO?.parent).toBe('PELVIS');
  expect(mage.nodes.CHEST?.parent).toBe('TORSO');
  expect(mage.nodes.NECK?.parent).toBe('CHEST');
  expect(mage.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(mage.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(mage.nodes.HEAD?.parent).toBe('NECK');
  expect(mage.nodes.LEFT_ARM_UPPER?.parent).toBe('CLAVICLE_L');
  expect(mage.nodes.RIGHT_ARM_UPPER?.parent).toBe('CLAVICLE_R');
  expect(mage.nodes.LEFT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(mage.nodes.RIGHT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(mage.nodes.STAFF_CRYSTAL?.parent).toBe('STAFF');
  expect(mage.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK', 'TORSO_VISUAL']));

  await assertNoPageErrors(page);
});

test('keeps guard and merchant on explicit humanoid rig nodes', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  await addTemplate(page, 'guard');
  await addTemplate(page, 'merchant');

  const guard = await inspectGroup(page, 'guard');
  expect(guard.skeletonId).toBe('HUMANOID_DEFAULT');
  expect(guard.archetype).toBe('HUMANOID');
  expect(guard.humanoidRigMode).toBe('explicit');
  expect(guard.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(guard.animationClipCount).toBeGreaterThan(0);
  expect(guard.syntheticHumanoidPivots).not.toEqual(expect.arrayContaining(['PELVIS', 'CHEST', 'NECK', 'CLAVICLE_L', 'CLAVICLE_R']));
  expect(guard.nodes.TORSO?.parent).toBe('PELVIS');
  expect(guard.nodes.CHEST?.parent).toBe('TORSO');
  expect(guard.nodes.NECK?.parent).toBe('CHEST');
  expect(guard.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(guard.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(guard.nodes.HEAD?.parent).toBe('NECK');
  expect(guard.nodes.LEFT_ARM_UPPER?.parent).toBe('CLAVICLE_L');
  expect(guard.nodes.RIGHT_ARM_UPPER?.parent).toBe('CLAVICLE_R');
  expect(guard.nodes.LEFT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(guard.nodes.RIGHT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(guard.nodes.ARMADURA?.parent).toBe('CHEST');
  expect(guard.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK', 'TORSO_VISUAL']));

  const merchant = await inspectGroup(page, 'merchant');
  expect(merchant.skeletonId).toBe('HUMANOID_DEFAULT');
  expect(merchant.archetype).toBe('HUMANOID');
  expect(merchant.humanoidRigMode).toBe('explicit');
  expect(merchant.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(merchant.animationClipCount).toBeGreaterThan(0);
  expect(merchant.syntheticHumanoidPivots).not.toEqual(expect.arrayContaining(['PELVIS', 'CHEST', 'NECK', 'CLAVICLE_L', 'CLAVICLE_R']));
  expect(merchant.nodes.TORSO?.parent).toBe('PELVIS');
  expect(merchant.nodes.CHEST?.parent).toBe('TORSO');
  expect(merchant.nodes.NECK?.parent).toBe('CHEST');
  expect(merchant.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(merchant.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(merchant.nodes.HEAD?.parent).toBe('NECK');
  expect(merchant.nodes.LEFT_ARM_UPPER?.parent).toBe('CLAVICLE_L');
  expect(merchant.nodes.RIGHT_ARM_UPPER?.parent).toBe('CLAVICLE_R');
  expect(merchant.nodes.LEFT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(merchant.nodes.RIGHT_LEG_THIGH?.parent).toBe('PELVIS');
  expect(merchant.nodes.PACK?.parent).toBe('CHEST');
  expect(merchant.nodes.CART_BODY?.parent).toBe('TORSO');
  expect(merchant.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK', 'TORSO_VISUAL']));

  await assertNoPageErrors(page);
});

test('keeps villager as a sparse but explicit humanoid rig', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  await addTemplate(page, 'villager');

  const villager = await inspectGroup(page, 'villager');
  expect(villager.skeletonId).toBe('HUMANOID_DEFAULT');
  expect(villager.archetype).toBe('HUMANOID');
  expect(villager.humanoidRigMode).toBe('explicit');
  expect(villager.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
  expect(villager.animationClipCount).toBeGreaterThan(0);
  expect(villager.syntheticHumanoidPivots).not.toEqual(expect.arrayContaining(['PELVIS', 'CHEST', 'NECK', 'CLAVICLE_L', 'CLAVICLE_R']));
  expect(villager.nodes.PELVIS?.parent ?? null).toBeNull();
  expect(villager.nodes.TORSO?.parent).toBe('PELVIS');
  expect(villager.nodes.CHEST?.parent).toBe('TORSO');
  expect(villager.nodes.NECK?.parent).toBe('CHEST');
  expect(villager.nodes.CLAVICLE_L?.parent).toBe('CHEST');
  expect(villager.nodes.CLAVICLE_R?.parent).toBe('CHEST');
  expect(villager.nodes.HEAD?.parent).toBe('NECK');
  expect(villager.nodes.LEFT_ARM?.parent).toBe('CLAVICLE_L');
  expect(villager.nodes.RIGHT_ARM?.parent).toBe('CLAVICLE_R');
  expect(villager.nodes.LEFT_ARM_LOWER?.parent).toBe('LEFT_ARM');
  expect(villager.nodes.RIGHT_ARM_LOWER?.parent).toBe('RIGHT_ARM');
  expect(villager.nodes.LEFT_HAND?.parent).toBe('LEFT_ARM_LOWER');
  expect(villager.nodes.RIGHT_HAND?.parent).toBe('RIGHT_ARM_LOWER');
  expect(villager.nodes.LEFT_LEG?.parent).toBe('PELVIS');
  expect(villager.nodes.RIGHT_LEG?.parent).toBe('PELVIS');
  expect(villager.nodes.LEFT_LEG_SHIN?.parent).toBe('LEFT_LEG');
  expect(villager.nodes.RIGHT_LEG_SHIN?.parent).toBe('RIGHT_LEG');
  expect(villager.nodes.LEFT_FOOT?.parent).toBe('LEFT_LEG_SHIN');
  expect(villager.nodes.RIGHT_FOOT?.parent).toBe('RIGHT_LEG_SHIN');
  expect(villager.nodes.HAT?.parent).toBe('HEAD');
  expect(villager.slotMap.TORSO).toEqual(expect.arrayContaining(['TORSO', 'PELVIS', 'CHEST', 'NECK']));

  await assertNoPageErrors(page);
});

test('keeps remaining playable humanoids on explicit authored rig nodes', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  const templateIds = [
    'bomber',
    'old-sage',
    'psx_dragoon',
    'psx_revenant',
    'psx_warrior',
    'starlight_princess',
  ];

  for (const templateId of templateIds) {
    await addTemplate(page, templateId);
    const group = await inspectGroup(page, templateId);
    expect(group.skeletonId).toBe('HUMANOID_DEFAULT');
    expect(group.archetype).toBe('HUMANOID');
    expect(group.humanoidRigMode).toBe('explicit');
    expect(group.defaultFacingYaw).toBeCloseTo(Math.PI, 5);
    expect(group.animationClipCount).toBeGreaterThan(0);
    expect(group.syntheticHumanoidPivots).toEqual([]);
    expect(group.nodes.PELVIS?.parent ?? null).toBeNull();
    expect(group.nodes.TORSO?.parent).toBe('PELVIS');
    expect(group.nodes.CHEST?.parent).toBe('TORSO');
    expect(group.nodes.NECK?.parent).toBe('CHEST');
    expect(group.nodes.CLAVICLE_L?.parent).toBe('CHEST');
    expect(group.nodes.CLAVICLE_R?.parent).toBe('CHEST');
    expect(group.nodes.HEAD?.parent).toBe('NECK');
    expect(group.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK']));
  }

  await assertNoPageErrors(page);
});
