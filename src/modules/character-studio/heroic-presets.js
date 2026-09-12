/** Authored example, using the same editable profiles available to recipes. */
export const HERO_PSX_RECIPE = Object.freeze({
  format: 'retrovisor-character-design', version: 1,
  name: 'Cloud · héroe PSX', style: 'psx',
  body: { profile: 'heroic', height: 4.5, width: 1.7, shoulders: 1, waist: 1, arms: 1, legs: 1, boots: 1 },
  head: { profile: 'heroic', style: 'psx', scale: 1, jaw: 1 },
  hair: { style: 'hero_spikes', color: '#eec34b' }, skin: '#e4ad83',
  outfit: { style: 'soldier', shirt: '#34325b', pants: '#49436d', shoes: '#392e2b' },
  equipment: {
    sword: { enabled: true, profile: 'buster', width: .72, length: 2.55, color: '#b2bdc7' },
    pauldron: { enabled: true, profile: 'shell', side: 'left', size: .84, color: '#737d91' },
  },
});
