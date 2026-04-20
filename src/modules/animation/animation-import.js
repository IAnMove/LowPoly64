import { compileAnimation } from './animation.js';
import { convertFastPoserAnimationAsset, isFastPoserAnimationAsset } from './animateur-animation-import.js';
import { showToast } from '../viewport/ui.js';
import { t } from '../shared/i18n.js';

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

export function validateAnimationJSON(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return t('jsonMustBeObject');
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return t('animMissingName');
  }
  if (!isFiniteNumber(data.duration) || data.duration <= 0 || data.duration > MAX_DURATION) {
    return t('animDurationInvalid');
  }
  if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
    return t('animTracksInvalid');
  }
  if (data.tracks.length > MAX_TRACKS) {
    return t('animTooManyTracks', { max: MAX_TRACKS });
  }

  for (let i = 0; i < data.tracks.length; i++) {
    const track = data.tracks[i];
    if (!track.target || typeof track.target !== 'string' || track.target.trim().length === 0) {
      return t('trackMissingTarget', { n: i + 1 });
    }
    if (!VALID_PROPERTIES.includes(track.property)) {
      return t('trackUnsupportedProp', { n: i + 1, prop: track.property, props: VALID_PROPERTIES.join(', ') });
    }
    if (!Array.isArray(track.keyframes) || track.keyframes.length === 0) {
      return t('trackKeyframesInvalid', { n: i + 1 });
    }
    if (track.keyframes.length > MAX_KEYFRAMES) {
      return t('trackTooManyKeyframes', { n: i + 1, max: MAX_KEYFRAMES });
    }

    let previousTime = -Infinity;
    for (let j = 0; j < track.keyframes.length; j++) {
      const kf = track.keyframes[j];
      if (!isFiniteNumber(kf.time) || kf.time < 0 || kf.time > data.duration) {
        return t('trackKeyframeTimeOutOfRange', { n: i + 1, k: j + 1, duration: data.duration });
      }
      if (kf.time <= previousTime) {
        return t('trackKeyframeTimeOrderInvalid', { n: i + 1, k: j + 1 });
      }
      previousTime = kf.time;

      const expectedLen = track.property === 'visible' ? 1 : 3;
      if (!Array.isArray(kf.value) || kf.value.length !== expectedLen) {
        return t('keyframeValueInvalid', { n: i + 1, k: j + 1, len: expectedLen });
      }

      if (track.property === 'visible') {
        if (kf.value.some((value) => value !== 0 && value !== 1)) {
          return t('keyframeVisibleValueInvalid', { n: i + 1, k: j + 1 });
        }
        continue;
      }

      if (kf.value.some((value) => !isFiniteNumber(value) || Math.abs(value) > MAX_ABS_VALUE)) {
        return t('keyframeValueNumbersInvalid', { n: i + 1, k: j + 1 });
      }
    }
  }

  return null;
}

function normalizeImportSourceData(data, group, fallbackIndex) {
  if (!isFastPoserAnimationAsset(data)) {
    return { success: true, data };
  }

  const converted = convertFastPoserAnimationAsset(data, group);
  if (!converted.success) {
    return {
      success: false,
      error: converted.error || t('animTracksInvalid'),
    };
  }

  const fallbackName = `Animation ${fallbackIndex}`;
  return {
    success: true,
    data: {
      ...converted.data,
      name: sanitizeName(converted.data.name, fallbackName),
    },
  };
}

function prepareAnimationDataToGroup(data, group, fallbackIndex = (group.userData.animations?.length || 0) + 1) {
  const sourceData = normalizeImportSourceData(data, group, fallbackIndex);
  if (!sourceData.success) {
    return { success: false, error: sourceData.error };
  }

  const validationError = validateAnimationJSON(sourceData.data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const normalized = normalizeAnimationDefinition(sourceData.data, `Animation ${fallbackIndex}`);
  const clip = compileAnimation(normalized, group);
  if (!clip) {
    return { success: false, error: t('noTracksCreated') };
  }

  return { success: true, normalized, clip };
}

export function importAnimationDataToGroup(data, group) {
  const prepared = prepareAnimationDataToGroup(data, group);
  if (!prepared.success) {
    return prepared;
  }

  if (!group.userData.animations) group.userData.animations = [];
  if (!group.userData.animationClips) group.userData.animationClips = [];

  group.userData.animations.push(prepared.normalized);
  group.userData.animationClips.push(prepared.clip);

  return { success: true, count: 1 };
}

export function importAnimationToGroup(jsonString, group) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, error: t('jsonInvalid') + e.message };
  }

  if (data.animations && Array.isArray(data.animations)) {
    return importMultipleAnimations(data.animations, group);
  }

  return importAnimationDataToGroup(data, group);
}

function importMultipleAnimations(animsArray, group) {
  if (animsArray.length === 0) {
    return { success: false, error: t('animArrayEmpty') };
  }

  const errors = [];
  const pending = [];

  for (let i = 0; i < animsArray.length; i++) {
    const result = prepareAnimationDataToGroup(
      animsArray[i],
      group,
      (group.userData.animations?.length || 0) + pending.length + 1
    );
    if (result.success) {
      pending.push(result);
    } else {
      const animName = typeof animsArray[i]?.name === 'string' ? sanitizeName(animsArray[i].name, '?') : '?';
      errors.push(`[${i + 1}] ${animName}: ${result.error}`);
    }
  }

  if (pending.length === 0) {
    return { success: false, error: t('noAnimImported') + '\n' + errors.join('\n') };
  }

  if (!group.userData.animations) group.userData.animations = [];
  if (!group.userData.animationClips) group.userData.animationClips = [];

  pending.forEach(({ normalized, clip }) => {
    group.userData.animations.push(normalized);
    group.userData.animationClips.push(clip);
  });

  showToast(t('nAnimsImported', { n: pending.length }));
  if (errors.length > 0) {
    return { success: true, count: pending.length, warnings: errors };
  }
  return { success: true, count: pending.length };
}
