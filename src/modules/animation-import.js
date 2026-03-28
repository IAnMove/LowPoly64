import { state } from './state.js';
import { compileAnimation } from './animation.js';
import { showToast } from './ui.js';

const VALID_PROPERTIES = ['position', 'rotation', 'scale'];

export function validateAnimationJSON(data) {
  if (!data || typeof data !== 'object') {
    return 'El JSON debe ser un objeto.';
  }
  if (!data.name || typeof data.name !== 'string') {
    return 'Falta el campo "name" (string).';
  }
  if (!data.duration || data.duration <= 0) {
    return 'El campo "duration" debe ser un numero positivo.';
  }
  if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
    return 'El campo "tracks" debe ser un array no vacio.';
  }
  for (let i = 0; i < data.tracks.length; i++) {
    const track = data.tracks[i];
    if (!track.target || typeof track.target !== 'string') {
      return `Track ${i + 1}: falta "target" (string).`;
    }
    if (!VALID_PROPERTIES.includes(track.property)) {
      return `Track ${i + 1}: propiedad "${track.property}" no soportada. Usa: ${VALID_PROPERTIES.join(', ')}`;
    }
    if (!Array.isArray(track.keyframes) || track.keyframes.length === 0) {
      return `Track ${i + 1}: "keyframes" debe ser un array no vacio.`;
    }
    for (let j = 0; j < track.keyframes.length; j++) {
      const kf = track.keyframes[j];
      if (typeof kf.time !== 'number') {
        return `Track ${i + 1}, keyframe ${j + 1}: "time" debe ser un numero.`;
      }
      if (!Array.isArray(kf.value) || kf.value.length !== 3) {
        return `Track ${i + 1}, keyframe ${j + 1}: "value" debe ser un array de 3 numeros.`;
      }
    }
  }
  return null;
}

export function importAnimationToGroup(jsonString, group) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, error: 'JSON invalido: ' + e.message };
  }

  // Support batch format: {"animations": [...]}
  if (data.animations && Array.isArray(data.animations)) {
    return importMultipleAnimations(data.animations, group);
  }

  return importSingleAnimation(data, group);
}

function importSingleAnimation(data, group) {
  const validationError = validateAnimationJSON(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const clip = compileAnimation(data, group);
  if (!clip) {
    return { success: false, error: 'No se pudieron crear tracks de animacion. Verifica que los targets existan en el grupo.' };
  }

  if (!group.userData.animations) group.userData.animations = [];
  if (!group.userData.animationClips) group.userData.animationClips = [];

  group.userData.animations.push(data);
  group.userData.animationClips.push(clip);

  return { success: true, count: 1 };
}

function importMultipleAnimations(animsArray, group) {
  if (animsArray.length === 0) {
    return { success: false, error: 'El array "animations" esta vacio.' };
  }

  const errors = [];
  let imported = 0;

  for (let i = 0; i < animsArray.length; i++) {
    const result = importSingleAnimation(animsArray[i], group);
    if (result.success) {
      imported++;
    } else {
      errors.push(`[${i + 1}] ${animsArray[i].name || '?'}: ${result.error}`);
    }
  }

  if (imported === 0) {
    return { success: false, error: 'Ninguna animacion importada.\n' + errors.join('\n') };
  }

  showToast(`${imported} animacion${imported > 1 ? 'es' : ''} importada${imported > 1 ? 's' : ''}`);
  if (errors.length > 0) {
    return { success: true, count: imported, warnings: errors };
  }
  return { success: true, count: imported };
}
