const VALID_PROPERTIES = ['position', 'rotation', 'scale', 'visible'];
const MAX_TRACKS = 64;
const MAX_KEYFRAMES = 240;
const MAX_DURATION = 600;
const MAX_NAME_LENGTH = 80;
const MAX_ABS_VALUE = 1000;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeName(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
  return normalized || fallback;
}

function normalizeTrack(track, index) {
  return {
    ...track,
    target: sanitizeName(track.target, `TARGET_${index + 1}`),
    keyframes: Array.isArray(track.keyframes)
      ? track.keyframes.map((keyframe) => ({
        ...keyframe,
        value: Array.isArray(keyframe.value) ? [...keyframe.value] : keyframe.value,
      }))
      : track.keyframes,
  };
}

export function normalizeAnimationDefinition(data, fallbackName = 'Animation') {
  return {
    ...data,
    name: sanitizeName(data.name, fallbackName),
    tracks: Array.isArray(data.tracks)
      ? data.tracks.map((track, index) => normalizeTrack(track, index))
      : data.tracks,
  };
}

export function validateAnimationJSON(data, {
  translate = (key) => key,
} = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return translate('jsonMustBeObject');
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return translate('animMissingName');
  }
  if (!isFiniteNumber(data.duration) || data.duration <= 0 || data.duration > MAX_DURATION) {
    return translate('animDurationInvalid');
  }
  if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
    return translate('animTracksInvalid');
  }
  if (data.tracks.length > MAX_TRACKS) {
    return translate('animTooManyTracks', { max: MAX_TRACKS });
  }

  for (let i = 0; i < data.tracks.length; i++) {
    const track = data.tracks[i];
    if (!track.target || typeof track.target !== 'string' || track.target.trim().length === 0) {
      return translate('trackMissingTarget', { n: i + 1 });
    }
    if (!VALID_PROPERTIES.includes(track.property)) {
      return translate('trackUnsupportedProp', {
        n: i + 1,
        prop: track.property,
        props: VALID_PROPERTIES.join(', '),
      });
    }
    if (!Array.isArray(track.keyframes) || track.keyframes.length === 0) {
      return translate('trackKeyframesInvalid', { n: i + 1 });
    }
    if (track.keyframes.length > MAX_KEYFRAMES) {
      return translate('trackTooManyKeyframes', { n: i + 1, max: MAX_KEYFRAMES });
    }

    for (let j = 0; j < track.keyframes.length; j++) {
      const kf = track.keyframes[j];
      if (!isFiniteNumber(kf.time) || kf.time < 0 || kf.time > data.duration) {
        return translate('trackKeyframeTimeOutOfRange', {
          n: i + 1,
          k: j + 1,
          duration: data.duration,
        });
      }

      const expectedLen = track.property === 'visible' ? 1 : 3;
      if (!Array.isArray(kf.value) || kf.value.length !== expectedLen) {
        return translate('keyframeValueInvalid', { n: i + 1, k: j + 1, len: expectedLen });
      }
      if (kf.value.some((value) => !isFiniteNumber(value) || Math.abs(value) > MAX_ABS_VALUE)) {
        return translate('keyframeValueNumbersInvalid', { n: i + 1, k: j + 1 });
      }
    }
  }

  return null;
}

export function importAnimationDataToGroup(data, group, {
  validateAnimation = validateAnimationJSON,
  normalizeAnimation = normalizeAnimationDefinition,
  compileAnimation,
  translate = (key) => key,
} = {}) {
  const validationError = validateAnimation(data, { translate });
  if (validationError) {
    return { success: false, error: validationError };
  }

  const normalized = normalizeAnimation(data, `Animation ${group.userData.animations?.length || 1}`);
  const clip = compileAnimation(normalized, group);
  if (!clip) {
    return { success: false, error: translate('noTracksCreated') };
  }

  if (!group.userData.animations) group.userData.animations = [];
  if (!group.userData.animationClips) group.userData.animationClips = [];

  group.userData.animations.push(normalized);
  group.userData.animationClips.push(clip);

  return { success: true, count: 1 };
}

export function importAnimationToGroup(jsonString, group, dependencies = {}) {
  const { translate = (key) => key } = dependencies;
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    return { success: false, error: translate('jsonInvalid') + error.message };
  }

  if (data.animations && Array.isArray(data.animations)) {
    return importMultipleAnimations(data.animations, group, dependencies);
  }

  return importAnimationDataToGroup(data, group, dependencies);
}

export function importMultipleAnimations(animsArray, group, dependencies = {}) {
  const {
    showToast = () => {},
    translate = (key) => key,
  } = dependencies;
  if (animsArray.length === 0) {
    return { success: false, error: translate('animArrayEmpty') };
  }

  const errors = [];
  let imported = 0;

  for (let i = 0; i < animsArray.length; i++) {
    const result = importAnimationDataToGroup(animsArray[i], group, dependencies);
    if (result.success) {
      imported++;
    } else {
      const animName = typeof animsArray[i]?.name === 'string'
        ? sanitizeName(animsArray[i].name, '?')
        : '?';
      errors.push(`[${i + 1}] ${animName}: ${result.error}`);
    }
  }

  if (imported === 0) {
    return { success: false, error: translate('noAnimImported') + '\n' + errors.join('\n') };
  }

  showToast(translate('nAnimsImported', { n: imported }));
  if (errors.length > 0) {
    return { success: true, count: imported, warnings: errors };
  }
  return { success: true, count: imported };
}
