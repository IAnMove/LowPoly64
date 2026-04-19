export const DEFAULT_SLOT_COLOR_MAP = Object.freeze({
  HEAD: 'skin',
  TORSO: 'bodyPrimary',
  BODY: 'bodyPrimary',
  ARM_L: 'bodySecondary',
  ARM_R: 'bodySecondary',
  LEG_L: 'bodySecondary',
  LEG_R: 'bodySecondary',
  WING_L: 'accent',
  WING_R: 'accent',
  TAIL: 'accent',
  WEAPON_MAIN: 'accent',
  WEAPON_SECONDARY: 'accent',
});

export function buildMap(entries) {
  return Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
}
