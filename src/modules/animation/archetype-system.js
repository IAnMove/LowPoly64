// Archetype System — defines archetypes and their available slots

export const SLOT_IDS = [
  'HEAD', 'TORSO', 'ARM_L', 'ARM_R', 'LEG_L', 'LEG_R',
  'BODY', 'WING_L', 'WING_R', 'TAIL',
  'WHEEL_FL', 'WHEEL_FR', 'WHEEL_RL', 'WHEEL_RR',
  'WEAPON_MAIN', 'WEAPON_SECONDARY',
];

export const ARCHETYPE_IDS = ['HUMANOID', 'BIRD', 'CAR', 'PROP'];

const ARCHETYPE_SLOTS = {
  HUMANOID: ['HEAD', 'TORSO', 'ARM_L', 'ARM_R', 'LEG_L', 'LEG_R', 'WEAPON_MAIN', 'WEAPON_SECONDARY'],
  BIRD: ['BODY', 'HEAD', 'LEG_L', 'LEG_R', 'WING_L', 'WING_R', 'TAIL'],
  CAR: ['BODY', 'WHEEL_FL', 'WHEEL_FR', 'WHEEL_RL', 'WHEEL_RR'],
  PROP: ['BODY'],
};

export function getArchetype(id) {
  const slots = ARCHETYPE_SLOTS[id];
  return slots ? { id, slots } : null;
}

export function getSlots(archetypeId) {
  return ARCHETYPE_SLOTS[archetypeId] || null;
}

export function registerArchetype(id, slots) {
  ARCHETYPE_SLOTS[id] = [...slots];
  if (!ARCHETYPE_IDS.includes(id)) ARCHETYPE_IDS.push(id);
}

export function validateSlot(archetypeId, slotId) {
  const slots = ARCHETYPE_SLOTS[archetypeId];
  return slots ? slots.includes(slotId) : false;
}
