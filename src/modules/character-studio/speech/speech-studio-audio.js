import { analyzeSpeechAudio } from './speech-core.js';

export const REST_FRAME = Object.freeze({ open: 0, wide: 0, round: 0, viseme: 'rest' });

function monoSamples(buffer, gain = 1) {
  const samples = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const pcm = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] += pcm[index] * gain / buffer.numberOfChannels;
    }
  }
  return samples;
}

export function encodeSpeechWav(buffer) {
  const samples = monoSamples(buffer);
  const result = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(result.buffer);
  const write = (offset, value) => [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, result.length - 8, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, index) => {
    const sample = Math.max(-1, Math.min(1, value));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  });
  return result;
}

function tracksOf(stream, kind = null) {
  if (!stream) return [];
  const getter = kind === 'audio' ? stream.getAudioTracks : kind === 'video' ? stream.getVideoTracks : stream.getTracks;
  if (typeof getter !== 'function') return [];
  try { return Array.from(getter.call(stream) || []); } catch { return []; }
}

function stopTracks(stream) {
  for (const track of tracksOf(stream)) {
    try { track.stop?.(); } catch { /* cleanup must continue */ }
  }
}

function makeClosedError() {
  const error = new Error('El estudio se ha cerrado.');
  error.code = 'DISPOSED';
  return error;
}

/** Owns only the studio's media resources; microphone input is never monitored. */
export function createSpeechStudioAudio(audio, onChange = () => {}, options = {}) {
  const config = options && typeof options === 'object' ? options : {};
  const deps = config.deps && typeof config.deps === 'object' ? config.deps : {};
  const AudioContextConstructor = config.AudioContext ?? deps.AudioContext ?? globalThis.AudioContext;
  const navigatorSource = config.navigator ?? deps.navigator ?? globalThis.navigator;
  const URLSource = config.URL ?? deps.URL ?? globalThis.URL;
  const BlobConstructor = config.Blob ?? deps.Blob ?? globalThis.Blob;
  const resolveGetUserMedia = () => config.getUserMedia ?? deps.getUserMedia ?? navigatorSource?.mediaDevices?.getUserMedia;
  const createObjectURL = config.createObjectURL ?? deps.createObjectURL
    ?? URLSource?.createObjectURL?.bind(URLSource);
  const revokeObjectURL = config.revokeObjectURL ?? deps.revokeObjectURL
    ?? URLSource?.revokeObjectURL?.bind(URLSource);

  let context;
  let source;
  let destination;
  let stream;
  let analyser;
  let micSource;
  let samples;
  let url;
  let pending = false;
  let generation = 0;
  let disposed = false;
  let audioData = null;
  let live = { ...REST_FRAME };
  let sourceConnected = false;
  const releasedStreams = new WeakSet();

  const notify = () => {
    try { onChange(); } catch { /* UI notification must not break cleanup */ }
  };
  const ensureOpen = () => {
    if (disposed) throw makeClosedError();
  };
  const ctx = () => {
    ensureOpen();
    if (!AudioContextConstructor) throw new Error('Este navegador no ofrece audio web.');
    return context ||= new AudioContextConstructor();
  };
  const releaseStream = (owned) => {
    if (!owned || (typeof owned !== 'object' && typeof owned !== 'function') || releasedStreams.has(owned)) return;
    releasedStreams.add(owned);
    stopTracks(owned);
  };
  const releaseURL = () => {
    if (!url) return;
    try { revokeObjectURL?.(url); } catch { /* stale object URLs are harmless */ }
    url = null;
  };

  function stopMic() {
    generation += 1;
    pending = false;
    try { micSource?.disconnect?.(); } catch { /* ignored during cleanup */ }
    micSource = null;
    try { analyser?.disconnect?.(); } catch { /* ignored during cleanup */ }
    analyser = null;
    samples = null;
    const owned = stream;
    stream = null;
    releaseStream(owned);
    live = { ...REST_FRAME };
    notify();
  }

  function stop() {
    try { audio?.pause?.(); } catch { /* ignored during cleanup */ }
    stopMic();
  }

  function clearAudio() {
    stop();
    try { audio?.removeAttribute?.('src'); } catch { /* ignored during cleanup */ }
    try { audio?.load?.(); } catch { /* ignored during cleanup */ }
    releaseURL();
    audioData = null;
    notify();
  }

  async function load(blob) {
    ensureOpen();
    if (!blob || typeof blob.arrayBuffer !== 'function') throw new TypeError('Se necesita un archivo de audio.');
    if (Number(blob.size) > 16 * 1024 * 1024) throw new Error('El audio debe ocupar menos de 16 MB.');
    stop();
    const revision = generation;
    let buffer;
    try {
      const bytes = await blob.arrayBuffer();
      buffer = await ctx().decodeAudioData(bytes);
    } catch (error) {
      if (disposed || revision !== generation) return null;
      throw error;
    }
    if (disposed || revision !== generation) return null;
    if (!buffer?.duration || buffer.duration > 90) throw new Error('Usa una grabación de entre 0 y 90 segundos.');
    if (buffer.length * 2 + 44 > 16 * 1024 * 1024) throw new Error('El audio decodificado supera 16 MB. Prueba una grabación más corta.');
    const wav = encodeSpeechWav(buffer);
    const track = analyzeSpeechAudio(monoSamples(buffer, 1), buffer.sampleRate, { noiseGate: .025, smoothing: .4 });
    track.frames.push({ time: buffer.duration, ...REST_FRAME });
    if (typeof BlobConstructor !== 'function' || typeof createObjectURL !== 'function') throw new Error('Este navegador no permite preparar el audio.');
    const blobData = new BlobConstructor([wav], { type: 'audio/wav' });
    releaseURL();
    const nextURL = createObjectURL(blobData);
    url = nextURL;
    try { audio.src = url; audio.load?.(); } catch (error) {
      releaseURL();
      throw error;
    }
    audioData = { buffer, wav, track, blob: blobData, name: blob.name || 'voice.wav' };
    notify();
    return audioData;
  }

  async function startMic() {
    if (disposed) return false;
    stop();
    const revision = generation;
    pending = true;
    notify();
    let granted = null;
    try {
      const getUserMedia = resolveGetUserMedia();
      if (typeof getUserMedia !== 'function') throw new Error('Este navegador no ofrece micrófono aquí. Abre Retrovisor en localhost o HTTPS.');
      granted = await getUserMedia.call(navigatorSource?.mediaDevices, { audio: true });
      if (disposed || revision !== generation) { releaseStream(granted); return false; }
      stream = granted;
      await ctx().resume?.();
      if (disposed || revision !== generation) {
        if (stream === granted) { stream = null; releaseStream(granted); }
        else releaseStream(granted);
        return false;
      }
      const currentContext = ctx();
      analyser = currentContext.createAnalyser();
      analyser.fftSize = 2048;
      samples = new Float32Array(analyser.fftSize);
      micSource = currentContext.createMediaStreamSource(stream);
      micSource.connect(analyser);
      for (const track of tracksOf(stream, 'audio')) {
        track.addEventListener?.('ended', () => { if (stream === granted) stopMic(); }, { once: true });
      }
      return true;
    } catch (error) {
      if (disposed || revision !== generation) {
        if (granted && stream !== granted) releaseStream(granted);
        return false;
      }
      stopMic();
      throw error;
    } finally {
      if (revision === generation) pending = false;
      notify();
    }
  }

  async function outputStream() {
    ensureOpen();
    const currentContext = ctx();
    await currentContext.resume?.();
    ensureOpen();
    if (stream) return stream;
    if (!audioData) return null;
    if (!destination) destination = currentContext.createMediaStreamDestination();
    if (!source) source = currentContext.createMediaElementSource(audio);
    if (!sourceConnected) {
      source.connect(destination);
      source.connect(currentContext.destination);
      sourceConnected = true;
    }
    return destination.stream;
  }

  function microphoneFrame(gain = 2) {
    if (disposed || !analyser || !samples) return { ...REST_FRAME };
    analyser.getFloatTimeDomainData(samples);
    const boosted = Float32Array.from(samples, sample => sample * gain);
    const next = analyzeSpeechAudio(boosted, ctx().sampleRate, { noiseGate: .035, smoothing: 0 }).frames[0] || REST_FRAME;
    for (const key of ['open', 'wide', 'round']) live[key] += (next[key] - live[key]) * .45;
    live.viseme = live.open < .045 ? 'rest' : next.viseme;
    return { ...live };
  }

  async function play() {
    ensureOpen();
    stopMic();
    await ctx().resume?.();
    ensureOpen();
    return audio?.play?.();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    try { audio?.pause?.(); } catch { /* ignored during cleanup */ }
    stopMic();
    try { audio?.removeAttribute?.('src'); } catch { /* ignored during cleanup */ }
    try { audio?.load?.(); } catch { /* ignored during cleanup */ }
    releaseURL();
    audioData = null;
    try { micSource?.disconnect?.(); } catch { /* ignored during cleanup */ }
    try { source?.disconnect?.(); } catch { /* ignored during cleanup */ }
    try { destination?.disconnect?.(); } catch { /* ignored during cleanup */ }
    releaseStream(destination?.stream);
    const closing = context?.close?.();
    Promise.resolve(closing).catch(() => {});
    context = null;
    source = null;
    destination = null;
    sourceConnected = false;
  }

  return {
    load,
    clearAudio,
    startMic,
    stopMic,
    stop,
    play,
    outputStream,
    microphoneFrame,
    dispose,
    get data() { return audioData; },
    get stream() { return stream; },
    get micPending() { return pending; },
    get micActive() { return Boolean(analyser); },
  };
}
