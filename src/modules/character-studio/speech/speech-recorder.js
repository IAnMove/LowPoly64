import { speechTrackToJSON } from './speech-core.js';

const DEFAULT_FPS = 30;
const DEFAULT_MAX_DURATION = 90;
const MAX_ALLOWED_DURATION = 90;

const VIDEO_MIME_TYPES = Object.freeze([
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
]);

const AUDIO_MIME_TYPES = Object.freeze([
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
]);

export const SPEECH_RECORDER_STATES = Object.freeze({
  IDLE: 'idle',
  RECORDING: 'recording',
  STOPPING: 'stopping',
  COMPLETED: 'completed',
  ERROR: 'error',
  DISPOSED: 'disposed',
});

export class SpeechRecorderError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'SpeechRecorderError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeFps(value) {
  return Math.max(1, Math.min(240, Math.round(numberOr(value, DEFAULT_FPS))));
}

function normalizeMaxDuration(value) {
  return Math.max(.001, Math.min(MAX_ALLOWED_DURATION, numberOr(value, DEFAULT_MAX_DURATION)));
}

function unsupported(message, cause) {
  return new SpeechRecorderError('UNSUPPORTED', message, cause);
}

function invalidState(message) {
  return new SpeechRecorderError('INVALID_STATE', message);
}

function disposedError() {
  return new SpeechRecorderError('DISPOSED', 'Speech recorder has been disposed');
}

function trackEndedError() {
  return new SpeechRecorderError('TRACK_ENDED', 'A recording track ended unexpectedly');
}

function recorderError(message, cause) {
  return new SpeechRecorderError('RECORDER_ERROR', message, cause);
}

function asError(error, fallbackCode = 'RECORDER_ERROR') {
  if (error instanceof SpeechRecorderError) return error;
  const message = error?.message ? String(error.message) : String(error || 'Speech recording failed');
  return new SpeechRecorderError(fallbackCode, message, error);
}

function arrayFromTracks(stream, kind) {
  if (!stream) return [];
  const getter = kind === 'audio' ? stream.getAudioTracks : stream.getVideoTracks;
  if (typeof getter === 'function') {
    try {
      return Array.from(getter.call(stream) || []);
    } catch {
      return [];
    }
  }
  if (typeof stream.getTracks === 'function') {
    try {
      return Array.from(stream.getTracks() || []).filter((track) => !track.kind || track.kind === kind);
    } catch {
      return [];
    }
  }
  return [];
}

function cloneTrack(track) {
  if (!track || typeof track.clone !== 'function') return { track, cloned: false };
  try {
    const cloned = track.clone();
    if (cloned && cloned !== track) return { track: cloned, cloned: true };
  } catch {
    // A browser may expose clone but fail for a track that has just ended.
  }
  return { track, cloned: false };
}

function isTrackEnded(track) {
  return track?.readyState === 'ended';
}

function hasData(data) {
  if (data === null || data === undefined) return false;
  if (typeof data === 'string') return data.length > 0;
  if (typeof data.size === 'number') return data.size > 0;
  return true;
}

function attachEndedListener(track, handler) {
  if (!track || typeof handler !== 'function') return () => {};
  if (typeof track.addEventListener === 'function') {
    track.addEventListener('ended', handler);
    return () => {
      try { track.removeEventListener?.('ended', handler); } catch { /* ignored during cleanup */ }
    };
  }
  try {
    const previous = track.onended;
    track.onended = handler;
    return () => {
      if (track.onended === handler) track.onended = previous || null;
    };
  } catch {
    return () => {};
  }
}

function readClock(clock, fallbackNow) {
  try {
    if (typeof clock === 'function') return numberOr(clock(), fallbackNow());
    if (clock && typeof clock.now === 'function') return numberOr(clock.now(), fallbackNow());
    if (clock && Number.isFinite(Number(clock.now))) return Number(clock.now);
  } catch {
    // Fall back to the platform clock if an injected clock is unavailable.
  }
  return fallbackNow();
}

function chooseMimeType(recorderConstructor, candidates, required) {
  const isTypeSupported = recorderConstructor?.isTypeSupported;
  if (typeof isTypeSupported !== 'function') {
    return required ? 'video/webm' : undefined;
  }

  for (const mimeType of candidates) {
    try {
      if (isTypeSupported.call(recorderConstructor, mimeType)) return mimeType;
    } catch {
      // Continue through the candidates. The constructor will report a more
      // useful error if the browser cannot create a recorder at all.
    }
  }

  if (required) throw unsupported('This browser cannot record a supported video MIME type');
  // Some browsers report no audio-only MIME type while still accepting their
  // default when MediaRecorder is constructed without options.
  return undefined;
}

/**
 * Record an already composited canvas and optional supplied audio stream.
 *
 * The controller owns permission and playback policy. This module only uses
 * the stream it receives and never calls getUserMedia or plays audio.
 */
export function createSpeechRecorder(options = {}) {
  if (!options || typeof options !== 'object') throw new TypeError('Recorder options must be an object');

  const {
    canvas,
    audioStream = null,
    fps: requestedFps = DEFAULT_FPS,
    maxDuration: requestedMaxDuration = DEFAULT_MAX_DURATION,
    onComplete,
    onError,
  } = options;
  const fps = normalizeFps(requestedFps);
  const maxDuration = normalizeMaxDuration(requestedMaxDuration);
  const deps = options.deps && typeof options.deps === 'object' ? options.deps : {};
  const clock = options.clock ?? deps.clock;

  const platformNow = () => {
    if (globalThis.performance && typeof globalThis.performance.now === 'function') {
      return globalThis.performance.now();
    }
    return Date.now();
  };
  const now = () => readClock(clock ?? options.now ?? deps.now, platformNow);

  const timeoutSource = options.setTimeout ?? deps.setTimeout
    ?? (clock && typeof clock.setTimeout === 'function' ? clock.setTimeout.bind(clock) : null)
    ?? globalThis.setTimeout?.bind(globalThis);
  const clearTimeoutSource = options.clearTimeout ?? deps.clearTimeout
    ?? (clock && typeof clock.clearTimeout === 'function' ? clock.clearTimeout.bind(clock) : null)
    ?? globalThis.clearTimeout?.bind(globalThis);

  const RecorderConstructor = options.MediaRecorder ?? options.mediaRecorder
    ?? deps.MediaRecorder ?? deps.mediaRecorder ?? globalThis.MediaRecorder;
  const MediaStreamConstructor = options.MediaStream ?? deps.MediaStream ?? deps.mediaStream ?? globalThis.MediaStream;
  const BlobConstructor = options.Blob ?? deps.Blob ?? deps.blob ?? globalThis.Blob;
  const createMediaStream = options.createMediaStream ?? options.mediaStreamFactory
    ?? deps.createMediaStream ?? deps.mediaStreamFactory;
  const createMediaRecorder = options.createMediaRecorder ?? options.mediaRecorderFactory
    ?? deps.createMediaRecorder ?? deps.mediaRecorderFactory;

  let state = SPEECH_RECORDER_STATES.IDLE;
  let startTime = null;
  let stopDuration = null;
  let timerId = null;
  let stopPromise = null;
  let stopResolve = null;
  let stopReject = null;
  let result = null;
  let lastError = null;
  let errorNotified = false;
  let completeNotified = false;
  let resourcesReleased = false;
  let finalFrameAdded = false;

  let canvasStream = null;
  let compositeStream = null;
  let audioOnlyStream = null;
  let videoRecorder = null;
  let audioRecorder = null;
  let videoMimeType = null;
  let audioMimeType = null;
  let sourceCanvasTracks = [];
  let sourceAudioTracks = [];
  let recordingTracks = [];
  let ownedRecordingTracks = [];
  let trackUnsubscribers = [];
  let recorderBindings = [];
  let videoChunks = [];
  let audioChunks = [];
  let startedRecorders = new Set();
  let stoppedRecorders = new Set();
  let frames = [];

  const safeCallback = (callback, value) => {
    if (typeof callback !== 'function') return;
    try {
      const pending = callback(value);
      if (pending && typeof pending.catch === 'function') {
        pending.catch((error) => {
          if (callback === onComplete) reportError(asError(error));
        });
      }
    } catch (error) {
      // A controller callback must not leave the recording resources alive.
      if (callback === onComplete) reportError(asError(error));
    }
  };

  function reportError(error) {
    const normalized = asError(error);
    if (errorNotified) return normalized;
    errorNotified = true;
    safeCallback(onError, normalized);
    return normalized;
  }

  function elapsed() {
    if (startTime === null) return 0;
    return Math.max(0, Math.min(maxDuration, (now() - startTime) / 1000));
  }

  function normalizedFrame(frame, time) {
    const source = frame && typeof frame === 'object' ? { ...frame, time } : { time };
    return speechTrackToJSON({ version: 1, fps, duration: time, frames: [source] }).frames[0];
  }

  function restFrame(time) {
    return normalizedFrame({ open: 0, wide: 0, round: 0, viseme: 'rest' }, time);
  }

  function appendFinalRest(duration = stopDuration ?? elapsed()) {
    if (finalFrameAdded) return;
    const last = frames[frames.length - 1];
    if (last && last.time === duration && last.viseme === 'rest' && last.open === 0) {
      finalFrameAdded = true;
      return;
    }
    frames.push(restFrame(duration));
    finalFrameAdded = true;
  }

  function streamForTracks(tracks, fallbackStream = null) {
    if (typeof createMediaStream === 'function') return createMediaStream(tracks);
    if (typeof MediaStreamConstructor === 'function') return new MediaStreamConstructor(tracks);
    if (fallbackStream && tracks.length === arrayFromTracks(fallbackStream, 'video').length) return fallbackStream;
    throw unsupported('MediaStream is unavailable for speech recording');
  }

  function newRecorder(stream, mimeType) {
    if (typeof createMediaRecorder === 'function') {
      return createMediaRecorder(stream, mimeType ? { mimeType } : undefined);
    }
    if (typeof RecorderConstructor !== 'function') {
      throw unsupported('MediaRecorder is unavailable in this browser');
    }
    return mimeType ? new RecorderConstructor(stream, { mimeType }) : new RecorderConstructor(stream);
  }

  function detachRecorderBindings() {
    for (const binding of recorderBindings) {
      const { recorder } = binding;
      try {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
      } catch {
        // An already-released recorder may expose read-only event properties.
      }
    }
    recorderBindings = [];
  }

  function detachTrackListeners() {
    for (const unsubscribe of trackUnsubscribers.splice(0)) {
      try { unsubscribe(); } catch { /* ignored during cleanup */ }
    }
  }

  function stopTrack(track) {
    if (!track || typeof track.stop !== 'function') return;
    try { track.stop(); } catch { /* ignored during cleanup */ }
  }

  function stopRecorder(recorder, kind) {
    if (!recorder || typeof recorder.stop !== 'function') return;
    try {
      if (!startedRecorders.has(kind) && recorder.state === 'inactive') return;
      recorder.stop();
    } catch {
      // A recorder that is already inactive is safe to release.
    }
  }

  function releaseResources({ stopRecorders = true } = {}) {
    if (resourcesReleased) return;
    resourcesReleased = true;
    if (timerId !== null && typeof clearTimeoutSource === 'function') {
      try { clearTimeoutSource(timerId); } catch { /* ignored during cleanup */ }
    }
    timerId = null;
    detachTrackListeners();
    if (stopRecorders) {
      stopRecorder(videoRecorder, 'video');
      stopRecorder(audioRecorder, 'audio');
    }
    detachRecorderBindings();
    for (const track of new Set(ownedRecordingTracks)) stopTrack(track);
    for (const track of new Set(sourceCanvasTracks)) stopTrack(track);
    canvasStream = null;
    compositeStream = null;
    audioOnlyStream = null;
    videoRecorder = null;
    audioRecorder = null;
    sourceCanvasTracks = [];
    sourceAudioTracks = [];
    recordingTracks = [];
    ownedRecordingTracks = [];
  }

  function rejectPendingStop(error) {
    if (!stopReject) return;
    const reject = stopReject;
    stopResolve = null;
    stopReject = null;
    reject(error);
  }

  function fail(error, { throwError = false } = {}) {
    if (state === SPEECH_RECORDER_STATES.COMPLETED || state === SPEECH_RECORDER_STATES.DISPOSED) {
      return lastError || asError(error);
    }
    const normalized = asError(error);
    state = SPEECH_RECORDER_STATES.ERROR;
    lastError = normalized;
    releaseResources();
    rejectPendingStop(normalized);
    reportError(normalized);
    if (throwError) throw normalized;
    return normalized;
  }

  function handleTrackEnded() {
    if (state === SPEECH_RECORDER_STATES.RECORDING) fail(trackEndedError());
  }

  function bindTrack(track) {
    if (!track) return;
    if (isTrackEnded(track)) throw trackEndedError();
    trackUnsubscribers.push(attachEndedListener(track, handleTrackEnded));
  }

  function bindRecorder(recorder, kind, chunks) {
    if (!recorder) return;
    const binding = { recorder, kind };
    recorder.ondataavailable = (event) => {
      if (hasData(event?.data)) chunks.push(event.data);
    };
    recorder.onerror = (event) => {
      const cause = event?.error || event;
      fail(recorderError(`${kind} recorder failed`, cause));
    };
    recorder.onstop = () => {
      if (state === SPEECH_RECORDER_STATES.RECORDING) {
        fail(recorderError(`${kind} recorder stopped unexpectedly`));
        return;
      }
      if (state !== SPEECH_RECORDER_STATES.STOPPING) return;
      stoppedRecorders.add(kind);
      finishIfStopped();
    };
    recorderBindings.push(binding);
  }

  function createBlob(chunks, mimeType) {
    if (typeof BlobConstructor !== 'function') throw unsupported('Blob is unavailable for speech recording');
    try {
      return new BlobConstructor(chunks, mimeType ? { type: mimeType } : undefined);
    } catch (error) {
      throw recorderError('Unable to build speech recording data', error);
    }
  }

  function finishIfStopped() {
    const needAudio = Boolean(audioRecorder);
    if (state !== SPEECH_RECORDER_STATES.STOPPING) return;
    if (!stoppedRecorders.has('video') || (needAudio && !stoppedRecorders.has('audio'))) return;

    try {
      appendFinalRest(stopDuration ?? elapsed());
      const duration = stopDuration ?? elapsed();
      const track = speechTrackToJSON({ version: 1, duration, fps, frames });
      const actualVideoMime = String(videoRecorder?.mimeType || videoMimeType || 'video/webm');
      const actualAudioMime = String(audioRecorder?.mimeType || audioMimeType || 'audio/webm');
      result = {
        video: createBlob(videoChunks, actualVideoMime),
        audio: audioRecorder ? createBlob(audioChunks, actualAudioMime) : null,
        track,
        duration,
        mimeType: actualVideoMime,
      };
      state = SPEECH_RECORDER_STATES.COMPLETED;
      releaseResources({ stopRecorders: false });
      if (!completeNotified) {
        completeNotified = true;
        safeCallback(onComplete, result);
      }
      const resolve = stopResolve;
      stopResolve = null;
      stopReject = null;
      if (resolve) resolve(result);
    } catch (error) {
      fail(error);
    }
  }

  function requestRecorderStop(recorder, kind) {
    if (!recorder) return;
    if (!startedRecorders.has(kind)) {
      stoppedRecorders.add(kind);
      return;
    }
    try {
      recorder.stop();
    } catch (error) {
      fail(recorderError(`Unable to stop ${kind} recorder`, error));
    }
  }

  function setupResources() {
    if (!canvas || typeof canvas.captureStream !== 'function') {
      throw unsupported('A canvas with captureStream(fps) is required');
    }
    if (typeof RecorderConstructor !== 'function' && typeof createMediaRecorder !== 'function') {
      throw unsupported('MediaRecorder is unavailable in this browser');
    }

    canvasStream = canvas.captureStream(fps);
    const canvasTracks = arrayFromTracks(canvasStream, 'video');
    if (canvasTracks.length === 0) throw unsupported('The canvas capture stream has no video track');
    sourceCanvasTracks = canvasTracks;

    const audioSources = arrayFromTracks(audioStream, 'audio');
    sourceAudioTracks = audioSources;
    const videoClones = canvasTracks.map((source) => {
      if (isTrackEnded(source)) throw trackEndedError();
      return cloneTrack(source);
    });
    const audioClones = audioSources.map((source) => {
      if (isTrackEnded(source)) throw trackEndedError();
      return cloneTrack(source);
    });
    const audioRecords = audioClones.map(({ track }) => track).filter(Boolean);
    const videoRecords = videoClones.map(({ track }) => track).filter(Boolean);
    recordingTracks = [...videoRecords, ...audioRecords].filter(Boolean);
    ownedRecordingTracks = [...videoClones, ...audioClones]
      .filter(({ cloned, track }) => cloned && track)
      .map(({ track }) => track);

    compositeStream = streamForTracks(recordingTracks);
    audioOnlyStream = audioRecords.length > 0 ? streamForTracks(audioRecords) : null;
    videoMimeType = chooseMimeType(RecorderConstructor, VIDEO_MIME_TYPES, true);
    audioMimeType = audioOnlyStream ? chooseMimeType(RecorderConstructor, AUDIO_MIME_TYPES, false) : null;
    videoRecorder = newRecorder(compositeStream, videoMimeType);
    audioRecorder = audioOnlyStream ? newRecorder(audioOnlyStream, audioMimeType) : null;
    bindRecorder(videoRecorder, 'video', videoChunks);
    bindRecorder(audioRecorder, 'audio', audioChunks);
    for (const track of new Set([...recordingTracks, ...sourceCanvasTracks, ...sourceAudioTracks])) bindTrack(track);
  }

  function scheduleLimit() {
    if (typeof timeoutSource !== 'function') return;
    timerId = timeoutSource(() => {
      timerId = null;
      if (state !== SPEECH_RECORDER_STATES.RECORDING) return;
      const pending = stop();
      pending.catch(() => {});
    }, Math.max(1, Math.round(maxDuration * 1000)));
  }

  function start() {
    if (state !== SPEECH_RECORDER_STATES.IDLE) {
      if (state === SPEECH_RECORDER_STATES.DISPOSED) throw disposedError();
      throw invalidState(`Cannot start speech recorder while it is ${state}`);
    }
    try {
      setupResources();
      startTime = now();
      stopDuration = null;
      frames = [restFrame(0)];
      finalFrameAdded = false;
      startedRecorders = new Set();
      stoppedRecorders = new Set();
      state = SPEECH_RECORDER_STATES.RECORDING;
      videoRecorder.start();
      startedRecorders.add('video');
      if (state !== SPEECH_RECORDER_STATES.RECORDING) throw lastError;
      if (audioRecorder) {
        audioRecorder.start();
        startedRecorders.add('audio');
        if (state !== SPEECH_RECORDER_STATES.RECORDING) throw lastError;
      }
      scheduleLimit();
      return undefined;
    } catch (error) {
      if (state !== SPEECH_RECORDER_STATES.ERROR) fail(error);
      throw lastError || asError(error);
    }
  }

  function addFrame(frame) {
    if (state !== SPEECH_RECORDER_STATES.RECORDING) {
      if (state === SPEECH_RECORDER_STATES.DISPOSED) throw disposedError();
      throw invalidState(`Cannot add a speech frame while recorder is ${state}`);
    }
    const time = elapsed();
    const added = normalizedFrame(frame, time);
    frames.push(added);
    if (time >= maxDuration) {
      const pending = stop();
      pending.catch(() => {});
    }
    return added;
  }

  function stop() {
    if (state === SPEECH_RECORDER_STATES.STOPPING) return stopPromise;
    if (state === SPEECH_RECORDER_STATES.COMPLETED) return stopPromise || Promise.resolve(result);
    if (state === SPEECH_RECORDER_STATES.ERROR) return Promise.reject(lastError);
    if (state === SPEECH_RECORDER_STATES.DISPOSED) return Promise.reject(lastError || disposedError());
    if (state !== SPEECH_RECORDER_STATES.RECORDING) return Promise.reject(invalidState('Cannot stop a speech recorder before start'));

    state = SPEECH_RECORDER_STATES.STOPPING;
    stopDuration = elapsed();
    appendFinalRest(stopDuration);
    stopPromise = new Promise((resolve, reject) => {
      stopResolve = resolve;
      stopReject = reject;
    });
    if (timerId !== null && typeof clearTimeoutSource === 'function') {
      try { clearTimeoutSource(timerId); } catch { /* ignored during cleanup */ }
    }
    timerId = null;
    requestRecorderStop(videoRecorder, 'video');
    requestRecorderStop(audioRecorder, 'audio');
    finishIfStopped();
    return stopPromise;
  }

  function dispose() {
    if (state === SPEECH_RECORDER_STATES.DISPOSED) return;
    const error = disposedError();
    if (state === SPEECH_RECORDER_STATES.STOPPING) rejectPendingStop(error);
    if (state === SPEECH_RECORDER_STATES.RECORDING || state === SPEECH_RECORDER_STATES.STOPPING) {
      state = SPEECH_RECORDER_STATES.DISPOSED;
      lastError = error;
      releaseResources();
      return;
    }
    if (state === SPEECH_RECORDER_STATES.IDLE) {
      state = SPEECH_RECORDER_STATES.DISPOSED;
      lastError = error;
      releaseResources({ stopRecorders: false });
    }
  }

  return {
    start,
    addFrame,
    stop,
    dispose,
    get state() { return state; },
  };
}

