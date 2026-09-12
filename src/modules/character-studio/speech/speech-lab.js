import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildCharacterDesignGroup } from '../../agent/character-commands.js';
import { createAvatarPreviewRuntime } from '../../avatar/avatar-preview-runtime.js';
import { prepareObjectForGlbExport } from '../../viewport/export.js';
import { SPEECH_CHARACTERS, getSpeechCharacter, attachCharacterMouth, frameSpeechCharacter } from './speech-characters.js';
import { createSpeechMouth } from './speech-mouths.js';
import { analyzeSpeechAudio, framesFromCues, sampleSpeechFrame, speechTrackToJSON, speechTrackFromJSON, SPEECH_VISEMES, VISEME_SHAPES } from './speech-core.js';
import { rhubarbResultToSpeechTrack } from './rhubarb-adapter.js';
import { probeSpeechService } from './speech-service-status.js';

const $ = id => document.getElementById(id);
const audio = $('audio'), cards = [], audioCache = new Map(), audioBytesCache = new Map();
const characterSelect = $('character');
let character = getSpeechCharacter('mario64'), characterId = character.id, characterRevision = 0, characterChangeController = null;
let track = framesFromCues({ version: 1, cues: SPEECH_VISEMES.slice(1).map((viseme, i) => ({ start: i * .8 + .15, end: i * .8 + .7, viseme })) });
const analysisTracks = new Map([['intensity', track]]);
let driver = 'intensity', activeAudio = null, currentDemo = null, activeWavBytes = null, context, micStream, analyser, micSamples, userAudioURL, manualFrame = null, raf, disposed = false;
let micSource, micPending = false, micGeneration = 0, inputRevision = 0, analysisAbortController = null, analyzing = false, liveFrame = { open: 0, wide: 0, round: 0 };
let engineState = 'checking', engineCheckController = null;
const engineMessages = {
  checking: 'Comprobando el análisis local…',
  ready: 'Análisis local disponible. Puedes calcular gestos para tus grabaciones.',
  missing: 'Falta instalar el motor de voz. Las demos, la intensidad y las pistas JSON ya funcionan.',
  unavailable: 'Análisis local no disponible en esta página. Puedes usar las demos, la intensidad y las pistas JSON.',
};
function showEngineState(value) {
  engineState = value;
  $('engine-status').textContent = engineMessages[value];
  $('engine-status').dataset.state = value;
  $('engine-retry').disabled = value === 'checking';
  $('engine-setup').hidden = value === 'ready' || value === 'checking';
  refreshAnalysisControls();
}
async function checkSpeechEngine() {
  engineCheckController?.abort();
  const controller = new AbortController();
  engineCheckController = controller;
  showEngineState('checking');
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const result = await probeSpeechService({ signal: controller.signal });
    if (!disposed && engineCheckController === controller) showEngineState(result);
  } finally {
    clearTimeout(timeout);
    if (engineCheckController === controller) engineCheckController = null;
  }
}
const clearAudioURL = () => { if (userAudioURL) URL.revokeObjectURL(userAudioURL); userAudioURL = null; };
const status = text => { $('status').textContent = text; };
const audioContext = () => context ||= new AudioContext();
function disposeGroup(group) {
  group.traverse(node => { node.geometry?.dispose(); for (const material of Array.isArray(node.material) ? node.material : [node.material]) material?.dispose(); });
}
function attachMouth(group, mouth, preset = character) {
  return attachCharacterMouth(group, mouth, preset);
}
function updateCharacterUI(preset) {
  if (characterSelect) characterSelect.value = preset.id;
  const modeLabels = { svg: 'Boca SVG', cutout: 'Boca de capas', jaw: 'Boca tridimensional' };
  for (const article of document.querySelectorAll('[data-mode]')) {
    const mode = article.dataset.mode;
    article.querySelector('canvas')?.setAttribute('aria-label', (modeLabels[mode] || 'Boca') + ' en ' + preset.label);
    const button = article.querySelector('.export');
    if (button) button.textContent = 'Guardar ' + preset.label + ' hablando · GLB';
  }
}
function preservedTime() {
  const value = !audio.paused ? audio.currentTime : Number($('scrub').value) || 0;
  return Math.min(track.duration, Math.max(0, value));
}
function disposeSpeechCard(card) {
  card.mouth?.object?.removeFromParent();
  card.group?.removeFromParent();
  card.mouth?.dispose();
  if (card.group) disposeGroup(card.group);
}
function disposeStagedCards(staged) {
  for (const { mouth, group } of staged) {
    mouth?.object?.removeFromParent();
    mouth?.dispose();
    if (group) disposeGroup(group);
  }
}
function characterChangeCancelled(revision, controller) {
  return disposed || controller.signal.aborted || revision !== characterRevision;
}
async function setCharacter(id) {
  const nextCharacter = getSpeechCharacter(id);
  if (!nextCharacter) throw new RangeError('Unknown speech character: ' + id);
  characterChangeController?.abort();
  const revision = ++characterRevision;
  if (nextCharacter.id === characterId && cards.every(card => card.characterId === nextCharacter.id)) {
    updateCharacterUI(nextCharacter);
    return nextCharacter;
  }
  const controller = new AbortController();
  characterChangeController = controller;
  const staged = [];
  let committed = false;
  status('Preparando ' + nextCharacter.label + '…');
  try {
    for (const card of cards) {
      if (characterChangeCancelled(revision, controller)) return false;
      const group = buildCharacterDesignGroup(nextCharacter.recipe);
      const mouth = createSpeechMouth({ mode: card.mode, ...nextCharacter.mouth, skin: nextCharacter.recipe.skin });
      attachMouth(group, mouth, nextCharacter);
      staged.push({ card, group, mouth });
      await mouth.ready;
      if (characterChangeCancelled(revision, controller)) return false;
    }
    if (characterChangeCancelled(revision, controller)) return false;
    for (const { card, group, mouth } of staged) {
      disposeSpeechCard(card);
      card.group = group;
      card.mouth = mouth;
      card.character = nextCharacter;
      card.characterId = nextCharacter.id;
      card.dirty = true;
      card.runtime.scene.add(group);
    }
    committed = true;
    character = nextCharacter;
    characterId = nextCharacter.id;
    updateCharacterUI(nextCharacter);
    setView($('view').value);
    setTime(preservedTime());
    status(nextCharacter.label + ' activo. La pista y el tiempo se conservan.');
    return nextCharacter;
  } catch (error) {
    if (characterChangeCancelled(revision, controller)) return false;
    throw error;
  } finally {
    if (!committed) disposeStagedCards(staged);
    if (characterChangeController === controller) characterChangeController = null;
  }
}
function applyFrame(frame) {
  for (const card of cards) { card.mouth.update(frame); card.dirty = true; }
  $('viseme').textContent = frame.viseme === 'rest' ? 'REPOSO' : frame.viseme;
  $('level').value = frame.open;
}
function setTime(value) {
  manualFrame = null;
  const time = Math.max(0, Math.min(track.duration, Number(value) || 0));
  $('scrub').value = time; $('time').textContent = `${time.toFixed(2)} s`;
  applyFrame(sampleSpeechFrame(track, time));
  return sampleSpeechFrame(track, time);
}
function refreshAnalysisControls() {
  const intensity = $('analysis-intensity'), phonetic = $('analysis-phonetic'), analyze = $('analyze-audio');
  if (!intensity || !phonetic || !analyze) return;
  const locked = analyzing || !!micStream || micPending;
  intensity.disabled = locked || !analysisTracks.has('intensity');
  phonetic.disabled = locked || !analysisTracks.has('phonetic');
  analyze.disabled = locked || !activeWavBytes || engineState !== 'ready';
  intensity.classList.toggle('active', driver === 'intensity');
  phonetic.classList.toggle('active', driver === 'phonetic');
}
function setTrack(next, { preserveTime = false } = {}) {
  const previousTime = preserveTime ? (!audio.paused ? audio.currentTime : Number($('scrub').value) || 0) : 0;
  track = next;
  $('scrub').max = Math.max(.01, next.duration);
  const time = Math.min(Math.max(0, previousTime), track.duration);
  setTime(time);
  if (Number.isFinite(audio.duration)) audio.currentTime = time;
  refreshAnalysisControls();
}
function setDriver(value, { announce = true } = {}) {
  if (!['intensity', 'phonetic'].includes(value)) throw new RangeError('Unknown speech analysis driver.');
  const next = analysisTracks.get(value);
  if (!next) {
    if (announce) status(value === 'phonetic' ? 'Calcula primero los gestos del audio.' : 'No hay análisis de intensidad disponible.');
    refreshAnalysisControls();
    return false;
  }
  driver = value;
  setTrack(next, { preserveTime: true });
  if (announce) status(value === 'phonetic' ? 'Gestos automáticos locales activos.' : 'Intensidad de voz activa.');
  refreshAnalysisControls();
  return true;
}
function setView(value) {
  const nextView = value === 'mouth' ? 'mouth' : 'face';
  $('view').value = nextView;
  for (const card of cards) {
    const preset = card.character || character;
    const solo = nextView === 'mouth';
    card.group.visible = !solo;
    if (solo) {
      card.mouth.object.removeFromParent();
      card.runtime.scene.add(card.mouth.object);
      card.mouth.object.position.set(0, 0, 0);
      card.mouth.object.rotation.set(0, 0, 0);
      frameSpeechCharacter(card.runtime, card.group, preset, true);
    } else {
      if (!card.group.parent) card.runtime.scene.add(card.group);
      attachMouth(card.group, card.mouth, preset);
      if (preset.id === 'mario64') {
        const target = new THREE.Vector3(0, 3.51, .18);
        card.runtime.controls.target.copy(target);
        card.runtime.camera.position.copy(target).add(new THREE.Vector3(.12, .025, 1).normalize().multiplyScalar(3.35));
        card.runtime.controls.update();
      } else frameSpeechCharacter(card.runtime, card.group, preset, false);
    }
    card.dirty = true;
  }
}
function stopMic() {
  micGeneration++; micPending = false; micSource?.disconnect(); micSource = null; liveFrame = { open: 0, wide: 0, round: 0 };
  $('mic').disabled = false;
  micStream?.getTracks().forEach(t => t.stop()); micStream = null; analyser?.disconnect(); analyser = null;
  $('mic').textContent = 'Usar micrófono';
  if (!analysisTracks.has(driver) && analysisTracks.has('phonetic')) driver = 'phonetic';
  refreshAnalysisControls();
}
function stop() {
  inputRevision++;
  analysisAbortController?.abort();
  analysisAbortController = null;
  analyzing = false;
  audio.pause(); stopMic(); manualFrame = null;
  applyFrame({ open: 0, wide: 0, round: 0, viseme: 'rest' });
  refreshAnalysisControls();
}
function envelope(buffer) {
  const samples = new Float32Array(buffer.length), gain = Number($('gain').value);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const pcm = buffer.getChannelData(channel);
    for (let i = 0; i < samples.length; i++) samples[i] += pcm[i] * gain / buffer.numberOfChannels;
  }
  const result = analyzeSpeechAudio(samples, buffer.sampleRate, { noiseGate: .025, smoothing: .4 });
  result.frames.push({ time: result.duration, open: 0, wide: 0, round: 0, viseme: 'rest' });
  return result;
}
function audioBufferToWav(buffer) {
  const channels = 1, bytesPerSample = 2, dataSize = buffer.length * channels * bytesPerSample;
  const output = new ArrayBuffer(44 + dataSize), view = new DataView(output);
  const write = (offset, value) => { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); };
  write(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true); view.setUint16(34, bytesPerSample * 8, true); write(36, 'data'); view.setUint32(40, dataSize, true);
  const source = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  for (let index = 0; index < buffer.length; index += 1) {
    let sample = 0; for (const channel of source) sample += channel[index] || 0;
    sample = Math.max(-1, Math.min(1, sample / Math.max(1, source.length)));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Uint8Array(output);
}
async function analyzeRhubarbAudio() {
  if (engineState !== 'ready') throw new Error(engineMessages[engineState]);
  if (!activeWavBytes || !activeAudio) throw new Error('Carga primero un audio para calcular sus gestos.');
  const revision = inputRevision;
  const sourceAudio = activeAudio;
  const sourceWav = activeWavBytes;
  const controller = new AbortController();
  analysisAbortController?.abort();
  analysisAbortController = controller;
  analyzing = true;
  refreshAnalysisControls();
  status('Calculando gestos del audio en local…');
  try {
    const response = await fetch('/api/speech/rhubarb', {
      method: 'POST',
      headers: { 'content-type': 'audio/wav' },
      body: sourceWav,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (controller.signal.aborted || revision !== inputRevision || disposed || activeAudio !== sourceAudio || activeWavBytes !== sourceWav) return null;
    if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'No se pudo calcular los gestos automáticos.');
    const next = rhubarbResultToSpeechTrack(payload.result, analysisTracks.get('intensity') || envelope(sourceAudio), { recognizer: 'phonetic' });
    if (controller.signal.aborted || revision !== inputRevision || disposed || activeAudio !== sourceAudio || activeWavBytes !== sourceWav) return null;
    analysisTracks.set('phonetic', next);
    setDriver('phonetic', { announce: false });
    status('Gestos automáticos listos. Se han calculado en este equipo con el reconocedor fonético.');
    return next;
  } catch (error) {
    if (controller.signal.aborted || revision !== inputRevision || disposed || activeAudio !== sourceAudio || activeWavBytes !== sourceWav) return null;
    throw error;
  } finally {
    if (analysisAbortController === controller) { analysisAbortController = null; analyzing = false; }
    refreshAnalysisControls();
  }
}
async function loadDemo(kind, play = false) {
  stop(); const revision = inputRevision;
  const path = `/speech-demo/${kind === 'vowels' ? 'vowels' : 'phrase'}.wav`;
  if (!audioCache.has(path)) {
    const response = await fetch(path); if (!response.ok) throw new Error('No se pudo abrir el audio de demostración.');
    const bytes = await response.arrayBuffer(); audioBytesCache.set(path, bytes.slice(0));
    audioCache.set(path, await audioContext().decodeAudioData(bytes.slice(0)));
  }
  if (revision !== inputRevision || disposed) return track;
  activeAudio = audioCache.get(path); activeWavBytes = audioBytesCache.get(path)?.slice(0); currentDemo = kind;
  if (kind === 'vowels') {
    const cues = await (await fetch('/speech-demo/vowels.cues.json')).json();
    if (revision !== inputRevision || disposed) return track;
    const next = framesFromCues(cues);
    next.duration = activeAudio.duration; next.frames.push({ time: activeAudio.duration, open: 0, wide: 0, round: 0, viseme: 'rest' });
    analysisTracks.set('intensity', next); analysisTracks.delete('phonetic'); driver = 'intensity'; setTrack(next);
    status('Vocales con tiempos preparados. Puedes mover la barra sin reproducir sonido.');
  } else {
    const intensity = envelope(activeAudio); analysisTracks.set('intensity', intensity);
    let phonetic = null;
    try {
      const response = await fetch('/speech-demo/phrase.rhubarb.json');
      if (response.ok) phonetic = rhubarbResultToSpeechTrack(await response.json(), intensity, { recognizer: 'phonetic' });
    } catch { phonetic = null; }
    if (revision !== inputRevision || disposed) return track;
    if (phonetic) analysisTracks.set('phonetic', phonetic); else analysisTracks.delete('phonetic');
    if (driver === 'phonetic' && !phonetic) driver = 'intensity';
    setTrack(driver === 'phonetic' && phonetic ? phonetic : intensity);
    status(driver === 'phonetic' && phonetic ? 'Frase con gestos automáticos preparados.' : 'La voz controla la abertura; puedes calcular gestos automáticos.');
  }
  clearAudioURL(); audio.src = path;
  if (play) await audio.play();
  refreshAnalysisControls();
  return track;
}
function download(data, filename, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function exportFilename(preset, mode) {
  const stem = { mario64: 'mario', cloud: 'cloud', explorer: 'exploradora' }[preset.id] || preset.id;
  return stem + '-speaking-' + mode + '.glb';
}
async function exportPrototype(mode, selectedCharacter = character) {
  const preset = typeof selectedCharacter === 'string' ? getSpeechCharacter(selectedCharacter) : selectedCharacter;
  if (!preset) throw new RangeError('Unknown speech character: ' + selectedCharacter);
  const snapshot = {
    id: preset.id,
    label: preset.label,
    characterId: preset.id,
    characterLabel: preset.label,
    recipe: preset.recipe,
    mouth: { ...preset.mouth, position: [...preset.mouth.position], rotation: [...preset.mouth.rotation] },
    mode,
    track: speechTrackToJSON(track),
  };
  const group = buildCharacterDesignGroup(snapshot.recipe);
  const mouth = createSpeechMouth({ mode: snapshot.mode, ...snapshot.mouth, skin: snapshot.recipe.skin });
  let prepared;
  try {
    await mouth.ready;
    attachMouth(group, mouth, snapshot);
    group.userData.speechPrototype = {
      mode: snapshot.mode,
      characterId: snapshot.characterId,
      characterLabel: snapshot.characterLabel,
      track: snapshot.track,
      audioEmbedded: false,
      anchor: {
        parent: snapshot.mouth.parent,
        position: [...snapshot.mouth.position],
        rotation: [...snapshot.mouth.rotation],
      },
    };
    prepared = prepareObjectForGlbExport(group);
    return await new GLTFExporter().parseAsync(prepared.object, { binary: true, animations: [...prepared.clips, mouth.createClip(snapshot.track, 'speech')], onlyVisible: true });
  } finally {
    mouth.dispose();
    disposeGroup(group);
    if (prepared) disposeGroup(prepared.object);
  }
}
function safely(action) { return async event => { try { await action(event); } catch (error) { status(error.message || String(error)); } }; }

async function initialize() {
  for (const article of document.querySelectorAll('[data-mode]')) {
    const mode = article.dataset.mode, canvas = article.querySelector('canvas');
    const runtime = createAvatarPreviewRuntime(canvas); runtime.renderer.setSize(440, 440, false); runtime.scene.background = new THREE.Color('#223044');
    runtime.scene.children.filter(child => child.type === 'GridHelper').forEach(grid => { runtime.scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); });
    const preset = character;
    const group = buildCharacterDesignGroup(preset.recipe);
    const mouth = createSpeechMouth({ mode, ...preset.mouth, skin: preset.recipe.skin });
    await mouth.ready; attachMouth(group, mouth, preset); runtime.scene.add(group);
    const card = { mode, runtime, group, mouth, canvas, article, character: preset, characterId: preset.id, dirty: true }; cards.push(card); runtime.controls.addEventListener('change', () => { card.dirty = true; });
    article.querySelector('.export').addEventListener('click', safely(async event => {
      const button = event.currentTarget; const selectedCharacter = character; button.disabled = true; status('Preparando el personaje y la animación…');
      try { download(await exportPrototype(mode, selectedCharacter), exportFilename(selectedCharacter, mode), 'model/gltf-binary'); status(selectedCharacter.label + ' exportado con el clip «speech». El sonido se conserva por separado.'); }
      finally { button.disabled = false; }
    }));
  }
  updateCharacterUI(character);
  setView('face'); setTrack(track);
  for (const viseme of SPEECH_VISEMES) {
    const button = document.createElement('button'); button.textContent = viseme === 'rest' ? 'Reposo' : viseme; button.dataset.viseme = viseme;
    button.addEventListener('click', () => { stop(); manualFrame = { ...VISEME_SHAPES[viseme], viseme }; applyFrame(manualFrame); status('Gesto manual. La barra de tiempo vuelve a la animación.'); }); $('poses').append(button);
  }
  $('phrase').addEventListener('click', safely(() => loadDemo('phrase', true)));
  $('vowels').addEventListener('click', safely(() => loadDemo('vowels', true)));
  $('stop').addEventListener('click', () => { stop(); status('En reposo.'); });
  $('analysis-intensity').addEventListener('click', () => setDriver('intensity'));
  $('analysis-phonetic').addEventListener('click', () => setDriver('phonetic'));
  $('analyze-audio').addEventListener('click', safely(analyzeRhubarbAudio));
  $('engine-retry').addEventListener('click', safely(checkSpeechEngine));
  $('view').addEventListener('change', () => setView($('view').value));
  characterSelect?.addEventListener('change', safely(() => setCharacter(characterSelect.value)));
  $('scrub').addEventListener('input', () => {
    const time = Number($('scrub').value); stop(); setTime(time);
    if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(time, audio.duration);
  });
  $('gain').addEventListener('input', () => {
    $('gain-value').textContent = $('gain').value + '×';
    if (activeAudio && currentDemo !== 'vowels' && !analyser && !micPending) {
      const time = Number($('scrub').value);
      const next = envelope(activeAudio);
      analysisTracks.set('intensity', next);
      if (driver === 'intensity') setTrack(next, { preserveTime: true });
      else {
        const phonetic = analysisTracks.get('phonetic');
        if (phonetic?.rhubarbCues) {
          const updated = rhubarbResultToSpeechTrack({ cues: phonetic.rhubarbCues, duration: phonetic.duration }, next);
          analysisTracks.set('phonetic', updated); setTrack(updated, { preserveTime: true });
        } else setTime(time);
      }
    }
  });
  $('file').addEventListener('change', safely(async event => {
    const file = event.target.files[0]; if (!file) return;
    stop(); const revision = inputRevision; status('Analizando ' + file.name + '…');
    if (file.size > 16 * 1024 * 1024) throw new Error('El audio puede ocupar como máximo 16 MB.');
    const bytes = await file.arrayBuffer();
    const decoded = await audioContext().decodeAudioData(bytes.slice(0));
    if (revision !== inputRevision || disposed) return;
    if (decoded.duration <= 0 || decoded.duration > 90) throw new Error('El audio debe durar entre 0 y 90 segundos.');
    if (44 + decoded.length * 2 > 16 * 1024 * 1024) throw new Error('El audio convertido supera 16 MB. Prueba una grabación más corta.');
    activeAudio = decoded; activeWavBytes = audioBufferToWav(decoded); currentDemo = 'custom';
    analysisTracks.set('intensity', envelope(activeAudio)); analysisTracks.delete('phonetic'); driver = 'intensity';
    clearAudioURL(); userAudioURL = URL.createObjectURL(file); audio.src = userAudioURL;
    setTrack(analysisTracks.get('intensity')); status('Preparado: ' + file.name + '. Pulsa reproducir o calcula gestos automáticos.');
  }));
  $('track-file').addEventListener('change', safely(async event => {
    const file = event.target.files[0]; if (!file) return;
    stop(); const revision = inputRevision;
    const data = JSON.parse(await file.text());
    if (revision !== inputRevision || disposed) return;
    const next = data.mouthCues || (data.source === 'rhubarb' && !data.frames)
      ? rhubarbResultToSpeechTrack(data)
      : data.cues && !data.frames ? framesFromCues(data) : speechTrackFromJSON(data);
    clearAudioURL(); audio.removeAttribute('src'); audio.load(); activeAudio = null; activeWavBytes = null; currentDemo = 'track';
    analysisTracks.clear();
    driver = next.source === 'rhubarb' ? 'phonetic' : 'intensity';
    analysisTracks.set(driver, next);
    setTrack(next); status('Movimientos importados. Explora con la barra de tiempo; el JSON no contiene sonido.');
  }));
  $('save-track').addEventListener('click', () => download(JSON.stringify(speechTrackToJSON(track), null, 2), 'speech.track.json'));
  $('mic').addEventListener('click', safely(async () => {
    if (micStream || micPending) { stop(); status('Micrófono detenido.'); return; }
    stop();
    driver = 'intensity';
    setDriver('intensity', { announce: false });
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('El micrófono necesita localhost o una conexión HTTPS.');
    const generation = ++micGeneration; micPending = true; refreshAnalysisControls(); $('mic').disabled = true; status('Esperando el permiso del micrófono…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== micGeneration || disposed) { stream.getTracks().forEach(t => t.stop()); return; }
      micStream = stream; await audioContext().resume();
      if (generation !== micGeneration || disposed) return;
      analyser = context.createAnalyser(); analyser.fftSize = 2048; micSamples = new Float32Array(analyser.fftSize);
      micSource = context.createMediaStreamSource(micStream); micSource.connect(analyser);
      $('mic').textContent = 'Detener micrófono'; status('Micrófono activo, sin retorno a los altavoces. El GLB exporta la pista preparada; esta escucha en directo no se graba.');
    } catch (error) { if (generation === micGeneration) stopMic(); throw error; }
    finally { if (generation === micGeneration) { micPending = false; $('mic').disabled = false; refreshAnalysisControls(); } }
  }));
  audio.addEventListener('play', () => { stopMic(); manualFrame = null; });
  audio.addEventListener('ended', () => { stop(); $('scrub').value = track.duration; $('time').textContent = `${track.duration.toFixed(2)} s`; });
  document.querySelectorAll('button[disabled]').forEach(button => button.disabled = false); refreshAnalysisControls();
  status('Listo. No se reproduce sonido hasta que pulses un control.');
  void checkSpeechEngine();
  let lastRender = -Infinity; function render(now = 0) {
    if (disposed) return;
    if (now - lastRender < 1000 / 30) { raf = requestAnimationFrame(render); return; } lastRender = now;
    if (analyser) {
      analyser.getFloatTimeDomainData(micSamples); const gained = micSamples.map(n => n * Number($('gain').value));
      const next = analyzeSpeechAudio(gained, context.sampleRate, { noiseGate: .035, smoothing: 0 }).frames.at(-1);
      for (const key of ['open', 'wide', 'round']) liveFrame[key] = next.open === 0 ? 0 : liveFrame[key] + (next[key] - liveFrame[key]) * .45;
      applyFrame({ ...liveFrame, viseme: next.viseme });
    } else if (!audio.paused) setTime(audio.currentTime);
    for (const card of cards) { const { runtime } = card; runtime.controls.update(); if (card.dirty) { runtime.renderer.render(runtime.scene, runtime.camera); card.dirty = false; } }
    raf = requestAnimationFrame(render);
  }
  render();
  window.__SPEECH_LAB__ = { cards, loadDemo, setTime, setView, setCharacter, exportPrototype, setTrack, setDriver, analyzeRhubarbAudio, checkSpeechEngine, get engineState() { return engineState; }, get track() { return speechTrackToJSON(track); }, get driver() { return driver; }, get characterId() { return characterId; }, get analyzing() { return analyzing; }, setPose(viseme) { stop(); manualFrame = { ...VISEME_SHAPES[viseme], viseme }; applyFrame(manualFrame); }, ready: true };
}
window.addEventListener('pagehide', () => { disposed = true; engineCheckController?.abort(); characterChangeController?.abort(); cancelAnimationFrame(raf); stop(); context?.close(); if (userAudioURL) URL.revokeObjectURL(userAudioURL); for (const card of cards) { disposeSpeechCard(card); card.runtime.controls.dispose(); card.runtime.renderer.dispose(); } });
initialize().catch(error => status(`No se pudo iniciar el laboratorio: ${error.message}`));
