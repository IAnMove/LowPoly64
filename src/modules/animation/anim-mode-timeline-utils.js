import * as THREE from 'three';

export function collectAnimationFrameTimes(animationDef) {
  const times = new Set();
  (animationDef?.tracks || []).forEach((track) => {
    (track?.keyframes || []).forEach((keyframe) => {
      if (Number.isFinite(keyframe?.time)) {
        times.add(Number(keyframe.time));
      }
    });
  });

  if (!times.size) {
    times.add(0);
  }

  if (Number.isFinite(animationDef?.duration) && animationDef.duration > 0) {
    times.add(Number(animationDef.duration));
  }

  return Array.from(times).sort((a, b) => a - b);
}

export function sampleTrackValue(track, time) {
  const keyframes = track?.keyframes || [];
  if (!keyframes.length) return null;
  if (time <= keyframes[0].time) {
    return Array.isArray(keyframes[0].value) ? [...keyframes[0].value] : keyframes[0].value;
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1];
    const next = keyframes[index];
    if (time > next.time) continue;

    if (Math.abs(time - next.time) < 1e-6) {
      return Array.isArray(next.value) ? [...next.value] : next.value;
    }

    if (track.interpolation === 'step') {
      return Array.isArray(previous.value) ? [...previous.value] : previous.value;
    }

    if (!Array.isArray(previous.value) || !Array.isArray(next.value) || previous.value.length !== next.value.length) {
      return Array.isArray(previous.value) ? [...previous.value] : previous.value;
    }

    const span = Math.max(next.time - previous.time, 1e-6);
    const alpha = THREE.MathUtils.clamp((time - previous.time) / span, 0, 1);
    return previous.value.map((value, valueIndex) => THREE.MathUtils.lerp(value ?? 0, next.value[valueIndex] ?? 0, alpha));
  }

  const last = keyframes[keyframes.length - 1];
  return Array.isArray(last.value) ? [...last.value] : last.value;
}

export function upsertVectorTrackKeyframe(animationDef, targetName, property, time, value, restValue = [0, 0, 0]) {
  if (!animationDef || !targetName || !property || !Array.isArray(value)) return null;
  if (!Array.isArray(animationDef.tracks)) {
    animationDef.tracks = [];
  }

  let track = animationDef.tracks.find((entry) => entry.target === targetName && entry.property === property);
  if (!track) {
    const keyframes = [];
    const duration = Math.max(Number.isFinite(animationDef.duration) ? animationDef.duration : 0, time);
    const pushKeyframe = (keyTime, keyValue) => {
      if (!Number.isFinite(keyTime)) return;
      const existing = keyframes.find((entry) => Math.abs(entry.time - keyTime) < 1e-6);
      if (existing) {
        existing.value = [...keyValue];
        return;
      }
      keyframes.push({ time: keyTime, value: [...keyValue] });
    };

    pushKeyframe(0, restValue);
    pushKeyframe(time, value);
    if (duration > 0) {
      pushKeyframe(duration, restValue);
    }

    track = {
      target: targetName,
      property,
      interpolation: 'linear',
      keyframes: keyframes.sort((a, b) => a.time - b.time),
    };
    animationDef.tracks.push(track);
    return track;
  }

  if (!Array.isArray(track.keyframes)) {
    track.keyframes = [];
  }

  const existingKeyframe = track.keyframes.find((entry) => Math.abs(entry.time - time) < 1e-6);
  if (existingKeyframe) {
    existingKeyframe.value = [...value];
  } else {
    track.keyframes.push({ time, value: [...value] });
    track.keyframes.sort((a, b) => a.time - b.time);
  }

  return track;
}
