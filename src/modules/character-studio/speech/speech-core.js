/**
 * Pure speech envelope and viseme helpers for the retro character studio.
 *
 * The analyser intentionally does not claim to recognise phonemes. It turns
 * an audio envelope into a small, deterministic set of mouth controls and
 * lets an author supply explicit viseme cues when timing needs to be exact.
 */

export const SPEECH_VISEMES = Object.freeze(['rest', 'A', 'E', 'I', 'O', 'U', 'M', 'F']);

const VISEME_SET = new Set(SPEECH_VISEMES);
const DEFAULT_FPS = 30;
const DEFAULT_NOISE_GATE = 0.035;
const DEFAULT_SMOOTHING = 0.35;
const EPSILON = 1e-8;
export const RHUBARB_SHAPE_TO_VISEME = Object.freeze({
  X: 'rest',
  A: 'M',
  B: 'I',
  C: 'E',
  D: 'A',
  E: 'O',
  F: 'U',
  G: 'F',
  H: 'E',
});
const RHUBARB_SHAPES = new Set(Object.keys(RHUBARB_SHAPE_TO_VISEME));

const VISEME_SHAPES = Object.freeze({
  rest: Object.freeze({ open: 0, wide: 0, round: 0 }),
  M: Object.freeze({ open: 0.035, wide: 0.55, round: 0.05 }),
  F: Object.freeze({ open: 0.08, wide: 0.7, round: 0.04 }),
  A: Object.freeze({ open: 0.72, wide: 0.58, round: 0.22 }),
  E: Object.freeze({ open: 0.54, wide: 0.9, round: 0.08 }),
  I: Object.freeze({ open: 0.42, wide: 1, round: 0.18 }),
  O: Object.freeze({ open: 0.7, wide: 0.28, round: 0.95 }),
  U: Object.freeze({ open: 0.45, wide: 0.2, round: 0.92 }),
});

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value, fallback) {
  const number = finite(value, fallback);
  return number > 0 ? number : fallback;
}

function normalizeViseme(value, fallback = 'rest') {
  const viseme = String(value ?? '').trim().toUpperCase();
  if (viseme === 'REST') return 'rest';
  return VISEME_SET.has(viseme) ? viseme : fallback;
}

function visemeForShape(open, wide, round, requested = null) {
  const explicit = normalizeViseme(requested, '');
  if (explicit) {
    // Explicit author cues are timing data, not a phonetic guess. Preserve
    // every valid vocal, including a closed M cue, through interpolation.
    return explicit;
  }
  if (open <= 0.045) return 'rest';
  if (round >= 0.7 && wide < 0.55) return round > 0.84 ? 'O' : 'U';
  if (wide >= 0.82) return open < 0.5 ? 'I' : 'E';
  return 'A';
}

function makeFrame({ time = 0, open = 0, wide = 0, round = 0, viseme = null, level = null } = {}) {
  const safeOpen = clamp(finite(open));
  const safeWide = clamp(finite(wide));
  const safeRound = clamp(finite(round));
  return {
    time: Math.max(0, finite(time)),
    open: safeOpen,
    wide: safeWide,
    round: safeRound,
    viseme: visemeForShape(safeOpen, safeWide, safeRound, viseme),
    ...(level === null || level === undefined ? {} : { level: clamp(finite(level)) }),
  };
}

function cloneFrame(frame, time = frame?.time || 0) {
  return makeFrame({
    time,
    open: frame?.open,
    wide: frame?.wide,
    round: frame?.round,
    viseme: frame?.viseme,
    level: frame?.level,
  });
}

function smoothValue(previous, next, amount) {
  return previous + (next - previous) * amount;
}

function normalizeAnalysisOptions(options = {}) {
  const fps = Math.max(1, Math.min(240, Math.round(positive(options.fps, DEFAULT_FPS))));
  const noiseGate = clamp(finite(options.noiseGate, DEFAULT_NOISE_GATE), 0, 0.95);
  const smoothing = clamp(finite(options.smoothing, DEFAULT_SMOOTHING), 0, 0.98);
  return { fps, noiseGate, smoothing };
}

/**
 * Analyse a mono PCM buffer into a small facial-animation track.
 *
 * `wide` is estimated from zero crossings and `round` is the complementary
 * rounded-mouth tendency. They are deliberately envelope controls, not a
 * phonetic classifier.
 */
export function analyzeSpeechAudio(samples, sampleRate, options = {}) {
  if (!samples || typeof samples.length !== 'number') {
    throw new TypeError('samples must be an array-like PCM buffer');
  }
  const rate = positive(sampleRate, 0);
  if (!rate) throw new RangeError('sampleRate must be greater than zero');

  const { fps, noiseGate, smoothing } = normalizeAnalysisOptions(options);
  const duration = samples.length / rate;
  const frameCount = Math.max(1, Math.ceil(duration * fps));
  const samplesPerFrame = Math.max(1, rate / fps);
  const frames = [];
  let previousOpen = 0;
  let previousWide = 0;
  let previousRound = 0;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const start = Math.floor(frameIndex * samplesPerFrame);
    const end = Math.min(samples.length, Math.max(start + 1, Math.ceil((frameIndex + 1) * samplesPerFrame)));
    const count = Math.max(1, end - start);
    let sumSquares = 0;
    let sumAbs = 0;
    let crossings = 0;
    let previousSample = finite(samples[start], 0);

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const value = finite(samples[sampleIndex], 0);
      sumSquares += value * value;
      sumAbs += Math.abs(value);
      if (sampleIndex > start && ((value >= 0 && previousSample < 0) || (value < 0 && previousSample >= 0))) {
        crossings += 1;
      }
      previousSample = value;
    }

    const rms = Math.sqrt(sumSquares / count);
    const meanAbs = sumAbs / count;
    const level = clamp(Math.max(rms, meanAbs * 0.92));
    const rawOpen = level <= noiseGate
      ? 0
      : clamp((level - noiseGate) / Math.max(1 - noiseGate, EPSILON));
    const zeroCrossingRate = crossings / Math.max(count - 1, 1);
    const rawWide = rawOpen <= 0
      ? 0
      : clamp(rawOpen * (0.38 + Math.min(zeroCrossingRate * 5, 0.62)));
    const rawRound = rawOpen <= 0
      ? 0
      : clamp(rawOpen * (1 - rawWide * 0.58));

    // Smoothing is applied to the envelope but a gated frame always decays
    // toward a genuinely closed mouth instead of leaving a noisy twitch.
    const smoothingAmount = rawOpen === 0 ? Math.min(1, smoothing * 1.8) : (1 - smoothing);
    const nextOpen = smoothValue(previousOpen, rawOpen, smoothingAmount);
    const nextWide = smoothValue(previousWide, rawWide, smoothingAmount);
    const nextRound = smoothValue(previousRound, rawRound, smoothingAmount);
    // A gated sample is silence immediately; smoothing only shapes voiced transitions.
    const gatedOpen = rawOpen === 0 ? 0 : nextOpen;
    const time = frameIndex / fps;
    const frame = makeFrame({
      time,
      open: gatedOpen,
      wide: gatedOpen === 0 ? 0 : nextWide,
      round: gatedOpen === 0 ? 0 : nextRound,
      level,
    });
    frames.push(frame);
    previousOpen = frame.open;
    previousWide = frame.wide;
    previousRound = frame.round;
  }

  return {
    version: 1,
    duration,
    fps,
    noiseGate,
    smoothing,
    frames,
  };
}

function trackFrames(track) {
  if (Array.isArray(track)) return track;
  if (Array.isArray(track?.frames)) return track.frames;
  return [];
}

function trackDuration(track, frames) {
  const explicit = finite(track?.duration, NaN);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const last = frames[frames.length - 1];
  return Math.max(0, finite(last?.time, 0));
}

/** Sample and linearly interpolate a speech track at a time in seconds. */
export function sampleSpeechFrame(track, time = 0) {
  const frames = trackFrames(track);
  if (frames.length === 0) return makeFrame({ time: Math.max(0, finite(time)) });
  const noiseGate = clamp(finite(track?.noiseGate, DEFAULT_NOISE_GATE));
  const finish = (frame, requestedTime) => {
    const cloned = cloneFrame(frame, requestedTime);
    const explicitClosed = cloned.viseme === 'M' || cloned.viseme === 'F';
    return cloned.open <= noiseGate && !explicitClosed
      ? makeFrame({ time: requestedTime })
      : cloned;
  };
  if (frames.length === 1) return finish(frames[0], Math.max(0, finite(time)));

  const requestedTime = Math.max(0, finite(time));
  if (requestedTime <= finite(frames[0].time)) return finish(frames[0], requestedTime);
  const lastIndex = frames.length - 1;
  if (requestedTime >= finite(frames[lastIndex].time)) return finish(frames[lastIndex], requestedTime);

  let upperIndex = 1;
  while (upperIndex < frames.length && requestedTime > finite(frames[upperIndex].time)) upperIndex += 1;
  const lowerIndex = Math.max(0, upperIndex - 1);
  const lower = frames[lowerIndex];
  const upper = frames[Math.min(upperIndex, lastIndex)];
  const lowerTime = finite(lower.time);
  const upperTime = finite(upper.time, lowerTime + 1);
  const span = Math.max(upperTime - lowerTime, EPSILON);
  const linear = clamp((requestedTime - lowerTime) / span);
  // Smoothstep keeps a 30 fps envelope from visibly snapping at frame edges.
  const amount = linear * linear * (3 - 2 * linear);
  const open = smoothValue(finite(lower.open), finite(upper.open), amount);
  const wide = smoothValue(finite(lower.wide), finite(upper.wide), amount);
  const round = smoothValue(finite(lower.round), finite(upper.round), amount);
  const sampledViseme = normalizeViseme(linear < 0.5 ? lower.viseme : upper.viseme, '');
  if (open <= noiseGate && sampledViseme !== 'M' && sampledViseme !== 'F') return makeFrame({ time: requestedTime });
  return makeFrame({
    time: requestedTime,
    open,
    wide,
    round,
    viseme: sampledViseme,
    level: smoothValue(finite(lower.level, open), finite(upper.level, open), amount),
  });
}

function cueError(path, message, allowed) {
  return { path, message, ...(allowed ? { allowed: [...allowed] } : {}) };
}

/** Validate explicit, author-timed viseme cues without doing recognition. */
export function validateSpeechCues(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: [cueError('', 'speech cues must be an object')] };
  }
  if (input.version !== 1) errors.push(cueError('version', 'version must be 1', [1]));
  if (!Array.isArray(input.cues)) {
    errors.push(cueError('cues', 'cues must be an array'));
    return { ok: false, errors };
  }
  input.cues.forEach((cue, index) => {
    const path = `cues[${index}]`;
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) {
      errors.push(cueError(path, 'cue must be an object'));
      return;
    }
    const start = cue.start;
    const end = cue.end;
    if (typeof start !== 'number' || !Number.isFinite(start) || start < 0) {
      errors.push(cueError(`${path}.start`, 'start must be a finite number >= 0'));
    }
    if (typeof end !== 'number' || !Number.isFinite(end) || end <= (typeof start === 'number' ? start : 0)) {
      errors.push(cueError(`${path}.end`, 'end must be a finite number greater than start'));
    }
    const viseme = normalizeViseme(cue.viseme, '');
    if (!viseme || !VISEME_SET.has(viseme)) {
      errors.push(cueError(`${path}.viseme`, 'unknown viseme', SPEECH_VISEMES));
    }
  });
  return { ok: errors.length === 0, errors };
}

/** Return sorted, detached, canonical cues or throw with `.errors`. */
export function normalizeSpeechCues(input) {
  const validation = validateSpeechCues(input);
  if (!validation.ok) {
    const error = new Error(`Invalid speech cues: ${validation.errors.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
    error.errors = validation.errors;
    throw error;
  }
  const sorted = input.cues
    .map((cue) => ({
      start: cue.start,
      end: cue.end,
      viseme: normalizeViseme(cue.viseme),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  sorted.forEach((cue) => {
    const previous = merged[merged.length - 1];
    if (previous && previous.viseme === cue.viseme && cue.start <= previous.end + EPSILON) {
      previous.end = Math.max(previous.end, cue.end);
    } else {
      merged.push({ ...cue });
    }
  });
  return { version: 1, cues: merged };
}

function envelopeFrames(envelope) {
  if (Array.isArray(envelope)) return envelope;
  if (Array.isArray(envelope?.frames)) return envelope.frames;
  return [];
}

function envelopeValue(envelope, time, index) {
  if (typeof envelope === 'function') return clamp(finite(envelope(time), 1));
  const values = envelopeFrames(envelope);
  if (values.length === 0) return 1;
  if (typeof values[0] === 'number') {
    const fps = positive(envelope?.fps, DEFAULT_FPS);
    const lower = Math.min(values.length - 1, Math.max(0, Math.floor(time * fps)));
    const upper = Math.min(values.length - 1, lower + 1);
    const amount = clamp(time * fps - lower);
    return clamp(smoothValue(finite(values[lower]), finite(values[upper]), amount));
  }
  const sampled = sampleSpeechFrame({ frames: values, noiseGate: 0 }, time);
  return clamp(finite(sampled.open, finite(values[index]?.level, 1)));
}

function cueShape(viseme, intensity, time) {
  const shape = VISEME_SHAPES[normalizeViseme(viseme)] || VISEME_SHAPES.rest;
  const amount = clamp(intensity);
  return makeFrame({
    time,
    open: shape.open * amount,
    wide: shape.wide * amount,
    round: shape.round * amount,
    viseme,
    level: amount,
  });
}

/**
 * Turn timed cues into the same serialisable track shape returned by the
 * analyser. `envelope` may be an analysed track, numeric samples per frame,
 * a function(time), or omitted (full cue intensity).
 */
export function framesFromCues(cues, envelope = null) {
  const normalized = Array.isArray(cues)
    ? normalizeSpeechCues({ version: 1, cues })
    : normalizeSpeechCues(cues);
  const envelopeTrack = envelope && typeof envelope === 'object' ? envelope : null;
  const fps = Math.max(1, Math.min(240, Math.round(positive(envelopeTrack?.fps, DEFAULT_FPS))));
  const cueDuration = normalized.cues.reduce((maximum, cue) => Math.max(maximum, cue.end), 0);
  const duration = Math.max(cueDuration, finite(envelopeTrack?.duration, 0));
  const sourceFrames = envelopeFrames(envelope);
  const frameCount = Math.max(1, sourceFrames.length || Math.ceil(duration * fps));
  const frames = [];

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / fps;
    const active = normalized.cues.find((cue) => time >= cue.start && time < cue.end);
    const intensity = envelopeValue(envelope, time, index);
    frames.push(active ? cueShape(active.viseme, intensity, time) : makeFrame({ time }));
  }

  return {
    version: 1,
    duration,
    fps,
    frames,
    cues: normalized.cues.map((cue) => ({ ...cue })),
  };
}

function normalizeSpeechTrackMetadata(track) {
  const keys = ['source', 'recognizer', 'rhubarbCues'];
  const present = keys.filter((key) => track?.[key] !== undefined);
  if (present.length === 0) return {};
  if (present.length !== keys.length) {
    throw new TypeError('speech track Rhubarb metadata must contain source, recognizer, and rhubarbCues');
  }
  if (track.source !== 'rhubarb') {
    throw new TypeError('speech track source must be rhubarb');
  }
  if (typeof track.recognizer !== 'string' || !track.recognizer.trim()) {
    throw new TypeError('speech track recognizer must be a non-empty string');
  }
  if (!Array.isArray(track.rhubarbCues)) {
    throw new TypeError('speech track rhubarbCues must be an array');
  }
  const rhubarbCues = track.rhubarbCues.map((cue, index) => {
    const path = `rhubarbCues[${index}]`;
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) {
      throw new TypeError(`${path} must be an object`);
    }
    const start = finite(cue.start, NaN);
    const end = finite(cue.end, NaN);
    const shape = String(cue.shape ?? cue.rhubarbShape ?? '').trim().toUpperCase();
    const viseme = normalizeViseme(cue.viseme, '');
    if (!Number.isFinite(start) || start < 0) throw new TypeError(`${path}.start must be finite and >= 0`);
    if (!Number.isFinite(end) || end <= start) throw new TypeError(`${path}.end must be finite and > start`);
    if (!RHUBARB_SHAPES.has(shape)) throw new TypeError(`${path}.shape is not a Rhubarb mouth shape`);
    if (!viseme || RHUBARB_SHAPE_TO_VISEME[shape] !== viseme) throw new TypeError(`${path}.viseme does not match its Rhubarb shape`);
    return { start, end, shape, viseme };
  });
  return { source: 'rhubarb', recognizer: track.recognizer.trim(), rhubarbCues };
}

/** JSON-safe detached representation suitable for persistence/import. */
export function speechTrackToJSON(track) {
  const frames = trackFrames(track).map((frame) => cloneFrame(frame));
  const metadata = normalizeSpeechTrackMetadata(track);
  return {
    version: 1,
    duration: trackDuration(track, frames),
    fps: Math.max(1, Math.round(positive(track?.fps, DEFAULT_FPS))),
    ...(Number.isFinite(track?.noiseGate) ? { noiseGate: clamp(track.noiseGate) } : {}),
    ...(Number.isFinite(track?.smoothing) ? { smoothing: clamp(track.smoothing) } : {}),
    frames,
    ...(Array.isArray(track?.cues) ? { cues: track.cues.map((cue) => ({ ...cue })) } : {}),
    ...metadata,
  };
}

export function speechTrackFromJSON(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.frames)) {
    throw new TypeError('speech track JSON must contain a frames array');
  }
  return speechTrackToJSON(value);
}

// Friendly aliases for callers that use the shorter track terminology.
export const trackToJSON = speechTrackToJSON;
export const trackFromJSON = speechTrackFromJSON;

export { VISEME_SHAPES };
