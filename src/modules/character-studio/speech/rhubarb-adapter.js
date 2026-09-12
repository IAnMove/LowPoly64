import { framesFromCues, RHUBARB_SHAPE_TO_VISEME } from './speech-core.js';
export { RHUBARB_SHAPE_TO_VISEME };

const RHUBARB_SHAPES = new Set(Object.keys(RHUBARB_SHAPE_TO_VISEME));

function finite(value, fallback = NaN) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function shapeOf(value) {
  const shape = String(value ?? '').trim().toUpperCase();
  return RHUBARB_SHAPES.has(shape) ? shape : null;
}

function invalid(message, path = '') {
  const error = new Error(path ? `${path}: ${message}` : message);
  error.code = 'INVALID_RHUBARB_RESULT';
  error.path = path;
  return error;
}

function inputResult(input) {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      throw invalid('Rhubarb response is not valid JSON');
    }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw invalid('Rhubarb response must be an object');
  }
  return input;
}

function rawCuesOf(result) {
  if (Array.isArray(result.mouthCues)) return result.mouthCues;
  if (Array.isArray(result.cues)) return result.cues;
  throw invalid('Rhubarb response must contain mouthCues or cues');
}

function durationOf(result, cues) {
  const metadataDuration = finite(result.metadata?.duration, NaN);
  const explicitDuration = finite(result.duration, NaN);
  const lastEnd = cues.reduce((maximum, cue) => Math.max(maximum, cue.end), 0);
  const duration = Number.isFinite(metadataDuration)
    ? metadataDuration
    : Number.isFinite(explicitDuration) ? explicitDuration : lastEnd;
  if (!Number.isFinite(duration) || duration < 0) throw invalid('duration must be finite and >= 0', 'metadata.duration');
  return Math.max(duration, lastEnd);
}

/**
 * Convert Rhubarb's JSON (or the normalized JSON emitted by our CLI) into the
 * app's language-neutral timed cues. The original A-H/X shape is retained so
 * an author can inspect the approximation later.
 */
export function rhubarbResultToSpeechCues(input, { recognizer = 'phonetic' } = {}) {
  const result = inputResult(input);
  const sourceCues = rawCuesOf(result);
  const cues = sourceCues.map((cue, index) => {
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) throw invalid('cue must be an object', `cues[${index}]`);
    const start = finite(cue.start);
    const end = finite(cue.end);
    if (!Number.isFinite(start) || start < 0) throw invalid('start must be finite and >= 0', `cues[${index}].start`);
    if (!Number.isFinite(end) || end <= start) throw invalid('end must be finite and > start', `cues[${index}].end`);
    const shape = shapeOf(cue.value ?? cue.shape ?? cue.rhubarbShape);
    if (!shape) throw invalid(`unknown mouth shape ${String(cue.value ?? cue.shape ?? cue.rhubarbShape)}`, `cues[${index}].value`);
    return { start, end, shape, viseme: RHUBARB_SHAPE_TO_VISEME[shape] };
  }).sort((left, right) => left.start - right.start || left.end - right.end);
  return {
    version: 1,
    source: 'rhubarb',
    recognizer,
    duration: durationOf(result, cues),
    cues,
  };
}

/** Create the existing serialisable track, optionally shaped by an envelope. */
export function rhubarbResultToSpeechTrack(input, envelope = null, options = {}) {
  const cueSet = rhubarbResultToSpeechCues(input, options);
  const track = framesFromCues(cueSet.cues, envelope || { duration: cueSet.duration, fps: options.fps || 30, frames: [] });
  track.duration = Math.max(track.duration, cueSet.duration);
  track.source = cueSet.source;
  track.recognizer = cueSet.recognizer;
  track.rhubarbCues = cueSet.cues.map(cue => ({ ...cue }));
  return track;
}

export function isRhubarbShape(value) {
  return shapeOf(value) !== null;
}

