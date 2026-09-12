import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAvatarPreviewRuntime, frameAvatarPreviewCamera } from '../../avatar/avatar-preview-runtime.js';
import { importGlbFromBuffer } from '../../viewport/json-import.js';
import { state } from '../../shared/state.js';
import { showEditorWorkspace } from '../../shared/editor-workspaces.js';
import { createSpeechStudioView } from './speech-studio-view.js';
import { SPEECH_CHARACTERS, attachCharacterMouth, frameSpeechCharacter } from './speech-characters.js';
import { createSpeechMouth } from './speech-mouths.js';
import { framesFromCues, sampleSpeechFrame, speechTrackFromJSON, speechTrackToJSON } from './speech-core.js';
import { rhubarbResultToSpeechTrack } from './rhubarb-adapter.js';
import { probeSpeechService } from './speech-service-status.js';
import { createSpeechStudioAudio, REST_FRAME } from './speech-studio-audio.js';
import { createSpeechRecorder } from './speech-recorder.js';
import { createSpeechBundle, mediaExtension } from './speech-bundle.js';
import { listSceneSpeechCharacters, createSpeechCharacter, createSpeechSceneBackdrop, disposeSpeechClone, exportSpeechCharacter } from './speech-scene-adapter.js';

let activeStudio = null;
let lastTake = null;
const emptyTrack = () => framesFromCues({ version: 1, cues: [{ start: 0, end: 1, viseme: 'rest' }] });
const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function download(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** Persistent speech workspace sharing the editor shell and scene. */
export async function openSpeechStudio() {
  if (activeStudio) { await activeStudio.activate(); return activeStudio; }
  const { workspace, $ } = createSpeechStudioView();
  const stage = $('canvas'), drawing = stage.getContext('2d', { alpha: false });
  const glCanvas = document.createElement('canvas');
  const runtime = createAvatarPreviewRuntime(glCanvas, { alpha: true });
  runtime.renderer.setSize(1280, 720, false); runtime.renderer.setClearColor(0, 0);
  runtime.scene.background = null; runtime.camera.aspect = 16 / 9; runtime.camera.updateProjectionMatrix();
  runtime.scene.children.filter(node => node.type === 'GridHelper').forEach(node => { runtime.scene.remove(node); node.geometry.dispose(); node.material.dispose(); });
  runtime.controls.dispose(); runtime.controls = new OrbitControls(runtime.camera, stage);
  runtime.controls.enableDamping = true;
  const world = new THREE.Group(); runtime.scene.add(world);
  const presets = [...listSceneSpeechCharacters(), ...SPEECH_CHARACTERS];
  for (const preset of presets) { const option = new Option(preset.label, preset.id); $('character').add(option); }
  let active = true, switchPromise = null;
  let character, group, mouth, backdrop, revision = 0, disposed = false, closing = false, busy = false, recording = false;
  let track = emptyTrack(), tracks = new Map([['intensity', track]]), frame = { ...REST_FRAME }, raf, lastRender = -Infinity;
  let silentPlaybackStart = null;
  let completedResult = null;
  let recorder = null, finalizing = null, captureStarted = 0, captureSnapshot = null;
  let lastStageSignature = null;
  let image = null, imageBlob = null, imageRevision = 0, takeURL = null, baseMouth = null;
  let engineReady = false, analysisAbort = null, inputRevision = 0;
  let engineAbort = null;
  function selectedSceneId() {
    let selected = state.selectedMesh;
    while (selected?.parent && selected.parent !== state.userObjects) selected = selected.parent;
    return selected?.parent === state.userObjects ? 'scene:' + selected.uuid : null;
  }
  let sceneSelectionAtLeave = selectedSceneId();
  let previousMicActive = false;
  const media = createSpeechStudioAudio($('audio'), () => {
    if (previousMicActive && !media.micActive) frame = { ...REST_FRAME };
    previousMicActive = media.micActive;
    if (!disposed) refresh();
  });
  const status = message => { if (!disposed) $('status').textContent = message; };
  const run = action => async event => { try { await action(event); } catch (error) { status(error.name === 'NotAllowedError' ? 'No se ha permitido el micrófono o la reproducción. Puedes volver a intentarlo desde su botón.' : error.message || String(error)); } };
  function refresh() {
    if (disposed) return;
    const locked = !active || busy || recording || Boolean(finalizing) || closing;
    workspace.querySelectorAll('[data-lock]').forEach(fieldset => { fieldset.disabled = locked; });
    for (const name of ['glb', 'json', 'bundle', 'add']) $(name).disabled = locked || !group || media.micActive;
    $('record').disabled = !active || busy || Boolean(finalizing) || !group || closing || media.micPending;
    $('record').textContent = recording ? '■ Terminar grabación' : '● Grabar vídeo';
    $('mic').disabled = locked; $('mic').textContent = media.micPending ? 'Cancelar micrófono…' : media.micActive ? 'Desactivar micrófono' : 'Activar micrófono';
    $('mic').setAttribute('aria-pressed', String(media.micActive));
    $('play').disabled = locked || !group; $('play').textContent = media.data ? '▶ Reproducir voz' : '▶ Reproducir movimientos'; $('time').disabled = locked || media.micActive;
    $('analyze').disabled = locked || !media.data || !engineReady || Boolean(analysisAbort) || media.micActive;
    $('driver').querySelector('[value=phonetic]').disabled = !tracks.has('phonetic');
    $('driver').querySelector('[value=intensity]').disabled = !tracks.has('intensity');
    $('live').dataset.recording = String(recording);
    $('live').textContent = recording ? '● GRABANDO · ' + clock((performance.now() - captureStarted) / 1000) : media.micActive ? '● MICRO ACTIVO' : 'WEBCAM / AVATAR';
    runtime.controls.enabled = !recording && !finalizing;
  }
  function setTrack(next) {
    silentPlaybackStart = null;
    track = speechTrackFromJSON(speechTrackToJSON(next));
    $('time').max = String(track.duration); $('time').value = '0'; frame = { ...REST_FRAME };
    if (media.data) $('audio').currentTime = 0;
    refresh();
  }
  function dropCharacter() {
    mouth?.object.removeFromParent(); mouth?.dispose(); mouth = null;
    group?.removeFromParent(); if (group) disposeSpeechClone(group); group = null;
  }
  function syncAnchor() {
    if (!mouth || !character) return;
    for (const [index, axis] of ['x', 'y', 'z'].entries()) {
      const value = Number($(axis).value); if (Number.isFinite(value)) character.mouth.position[index] = value;
    }
    character.mouth.rotation[0] = THREE.MathUtils.degToRad(Number($('tilt').value) || 0);
    attachCharacterMouth(group, mouth, character);
    const scale = Number($('size').value); mouth.object.scale.setScalar(scale);
    Object.assign(group.userData.speechAnchor, { width: baseMouth.width * scale, height: baseMouth.height * scale, depth: baseMouth.depth * scale });
  }
  async function selectCharacter(id = $('character').value, { preserveCamera = false } = {}) {
    if (recording || finalizing) return;
    const sameCharacter = character?.id === id;
    const mouthScale = sameCharacter ? $('size').value : '1';
    const source = sameCharacter ? { ...character, mouth: { ...character.mouth, width: baseMouth.width, height: baseMouth.height, depth: baseMouth.depth } } : presets.find(preset => preset.id === id); if (!source) throw new Error('No se encuentra ese personaje.');
    const current = ++revision; busy = true; refresh();
    let nextGroup, nextMouth;
    try {
      const next = { ...source, mouth: structuredClone(source.mouth) };
      nextGroup = await createSpeechCharacter(next);
      nextMouth = createSpeechMouth({ mode: $('mouth').value, ...next.mouth, skin: next.recipe?.skin });
      await nextMouth.ready; attachCharacterMouth(nextGroup, nextMouth, next);
      if (disposed || current !== revision) { nextMouth.object.removeFromParent(); nextMouth.dispose(); disposeSpeechClone(nextGroup); return; }
      dropCharacter(); group = nextGroup; mouth = nextMouth; character = next; baseMouth = { ...next.mouth };
      world.add(group); $('character').value = id;
      for (const [index, axis] of ['x', 'y', 'z'].entries()) $(axis).value = String(next.mouth.position[index]);
      $('tilt').value = String(Math.round(THREE.MathUtils.radToDeg(next.mouth.rotation[0]))); $('size').value = mouthScale; syncAnchor();
      $('source-note').textContent = id.startsWith('scene:') ? 'Copia de tu personaje. Puedes ajustar la boca aquí; el original no cambia.' : 'Personaje preparado con cuerpo, rig y boca. Puedes añadir una copia a tu escena.';
      setView({ preserveCamera }); mouth.update(frame);
      status('Listo. Prueba una frase, carga tu voz o activa el micrófono.');
    } catch (error) {
      if (nextGroup && nextGroup !== group) { nextMouth?.object.removeFromParent(); nextMouth?.dispose(); disposeSpeechClone(nextGroup); }
      if (!disposed && current === revision) throw error;
    } finally { if (!disposed && current === revision) { busy = false; refresh(); } }
  }
  function setView({ preserveCamera = false } = {}) {
    backdrop?.removeFromParent(); if (backdrop) disposeSpeechClone(backdrop); backdrop = null;
    if (!group) return;
    if ($('view').value === 'scene') { backdrop = createSpeechSceneBackdrop(character.id); world.add(backdrop); }
    if (!preserveCamera) reframe();
  }
  function reframe() {
    if (!group) return;
    if ($('view').value === 'face') frameSpeechCharacter(runtime, group, character);
    else frameAvatarPreviewCamera($('view').value === 'scene' ? world : group, runtime);
  }
  function cancelAnalysis() { inputRevision++; analysisAbort?.abort(); analysisAbort = null; }
  async function loadAudio(blob, prepared = null) {
    cancelAnalysis(); const current = inputRevision;
    status('Preparando audio…'); const loaded = await media.load(blob);
    if (!loaded || disposed || current !== inputRevision) return;
    tracks = new Map([['intensity', loaded.track]]);
    if (prepared) tracks.set('phonetic', rhubarbResultToSpeechTrack(prepared, loaded.track, { recognizer: 'phonetic' }));
    $('driver').value = prepared ? 'phonetic' : 'intensity'; setTrack(tracks.get($('driver').value));
    status('Audio listo. Puedes reproducirlo, calcular gestos o grabar el vídeo.');
  }
  async function loadDemo(play = true) {
    cancelAnalysis(); const current = inputRevision;
    const [response, cueResponse] = await Promise.all([fetch('/speech-demo/phrase.wav'), fetch('/speech-demo/phrase.rhubarb.json')]);
    if (!response.ok) throw new Error('No se pudo cargar la frase de demostración.');
    const [blob, cues] = await Promise.all([response.blob(), cueResponse.ok ? cueResponse.json() : null]);
    if (disposed || current !== inputRevision) return;
    await loadAudio(blob, cues);
    if (play && !disposed && active && inputRevision === current + 1) await media.play();
  }
  async function analyze() {
    if (!media.data || !engineReady) return;
    media.stop(); cancelAnalysis(); const current = inputRevision, data = media.data;
    const controller = new AbortController(); analysisAbort = controller; refresh(); status('Calculando gestos del audio en este equipo…');
    try {
      const response = await fetch('/api/speech/rhubarb', { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: data.wav, signal: controller.signal });
      const payload = await response.json();
      if (disposed || current !== inputRevision || controller.signal.aborted) return;
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'No se pudo analizar la voz.');
      const result = rhubarbResultToSpeechTrack(payload.result, data.track, { recognizer: 'phonetic' });
      tracks.set('phonetic', result); $('driver').value = 'phonetic'; setTrack(result); status('Gestos calculados. Reproduce la voz para verlos.');
    } catch (error) { if (!controller.signal.aborted) throw error; }
    finally { if (analysisAbort === controller) analysisAbort = null; refresh(); }
  }
  function stageDescription() {
    return { view: $('view').value, backgroundColor: $('bg').value, backgroundImage: Boolean(image), width: 1280, height: 720,
      camera: { position: runtime.camera.position.toArray(), target: runtime.controls.target.toArray(), fov: runtime.camera.fov }, sceneObjectsInVideoOnly: $('view').value === 'scene' };
  }
  async function exportModel(selectedTrack = track) {
    return exportSpeechCharacter(group, mouth, selectedTrack, { characterId: character.id, characterLabel: character.label, mode: $('mouth').value, audioEmbedded: false });
  }
  async function currentAssets() {
    if (!group) throw new Error('Espera a que termine de prepararse el personaje.');
    const snapshot = { track: speechTrackToJSON(track), audio: media.data?.blob || null, character: character.label, mode: $('mouth').value,
      recipe: character.recipe || group.userData.characterDesignRecipe || null, stage: stageDescription(), background: imageBlob };
    return { ...snapshot, model: await exportModel(snapshot.track) };
  }
  function showTake() {
    if (!lastTake || disposed) return;
    $('take').hidden = false; $('take-info').textContent = `${lastTake.character} · ${clock(lastTake.duration)} · ${lastTake.audio ? 'vídeo, voz y movimientos' : 'vídeo y movimientos, sin audio'}`;
    if (takeURL) URL.revokeObjectURL(takeURL); takeURL = URL.createObjectURL(lastTake.video); $('take-preview').src = takeURL;
    $('take-audio').disabled = !lastTake.audio;
  }
  function finishTake(result) {
    if (completedResult === result) return finalizing || Promise.resolve();
    if (finalizing) return finalizing;
    completedResult = result;
    recording = false; silentPlaybackStart = null; media.stop(); frame = { ...REST_FRAME };
    finalizing = (async () => {
      try {
        const model = await exportModel(result.track);
        lastTake = { ...captureSnapshot, ...result, model };
        if (!disposed) { showTake(); status('Toma lista. Guarda el vídeo o el ZIP con personaje, voz y movimientos.'); }
      } finally { recorder?.dispose(); recorder = null; finalizing = null; refresh(); }
    })();
    refresh(); return finalizing;
  }
  async function stopRecording() {
    if (recorder && recording) { const result = await recorder.stop(); await finishTake(result); }
    else if (finalizing) await finalizing;
  }
  async function startRecording() {
    if (recording) return stopRecording();
    cancelAnalysis(); const current = revision; busy = true; refresh();
    try {
      const stream = await media.outputStream();
      if (disposed || !active || closing || current !== revision) return;
      captureSnapshot = { character: character.label, mode: $('mouth').value, recipe: character.recipe || group.userData.characterDesignRecipe || null, stage: stageDescription(), background: imageBlob };
      const wasMic = media.micActive;
      if (!wasMic && media.data) { $('audio').pause(); $('audio').currentTime = 0; $('time').value = '0'; }
      frame = { ...REST_FRAME }; mouth.update(frame); renderStage();
      recorder = createSpeechRecorder({ canvas: stage, audioStream: stream, fps: 30, maxDuration: 90,
        onComplete: result => { finishTake(result).catch(error => status('No se pudo preparar la toma: ' + error.message)); },
        onError: error => { recording = false; media.stop(); status('Error al grabar: ' + error.message); refresh(); },
      });
      completedResult = null; captureStarted = performance.now(); recorder.start(); recording = true;
      if (!wasMic && media.data) await media.play();
      else if (!wasMic) { $('time').value = '0'; silentPlaybackStart = performance.now(); }
      status('Grabando lo que ves en el escenario. Pulsa Terminar grabación cuando acabes.');
    } catch (error) { recording = false; recorder?.dispose(); recorder = null; throw error; }
    finally { busy = false; refresh(); }
  }
  function renderStage() {
    runtime.controls.update();
    const signature = [group?.uuid, mouth?.object.uuid, backdrop?.uuid, imageRevision, $('bg').value,
      ...runtime.camera.position.toArray(), ...runtime.camera.quaternion.toArray(), runtime.camera.zoom,
      ...(mouth?.object.position.toArray() || []), ...(mouth?.object.rotation.toArray() || []), ...(mouth?.object.scale.toArray() || []),
      frame.open, frame.wide, frame.round, frame.viseme].join('|');
    if (!recording && signature === lastStageSignature) return;
    lastStageSignature = signature;
    runtime.renderer.render(runtime.scene, runtime.camera);
    drawing.fillStyle = $('bg').value; drawing.fillRect(0, 0, stage.width, stage.height);
    if (image) { const scale = Math.max(stage.width / image.width, stage.height / image.height); drawing.drawImage(image, (stage.width - image.width * scale) / 2, (stage.height - image.height * scale) / 2, image.width * scale, image.height * scale); }
    drawing.drawImage(glCanvas, 0, 0);
  }
  function tick(now) {
    if (disposed || !active) return;
    raf = requestAnimationFrame(tick); if (now - lastRender < 1000 / 30) return; lastRender = now;
    if (media.micActive) frame = media.microphoneFrame(Number($('gain').value));
    else if (!$('audio').paused) { frame = sampleSpeechFrame(track, $('audio').currentTime); $('time').value = String($('audio').currentTime); }
    else if (silentPlaybackStart !== null) {
      const time = Math.min(track.duration, (now - silentPlaybackStart) / 1000);
      frame = sampleSpeechFrame(track, time); $('time').value = String(time);
      if (time >= track.duration) { silentPlaybackStart = null; frame = { ...REST_FRAME }; if (recording) stopRecording().catch(error => status(error.message)); }
    }
    mouth?.update(frame); if (recording && recorder?.state === 'recording') recorder.addFrame(frame); renderStage();
    $('clock').textContent = clock(Number($('time').value)) + ' / ' + clock(track.duration);
    if (recording) $('live').textContent = '● GRABANDO · ' + clock((now - captureStarted) / 1000);
  }
  async function activate() {
    if (switchPromise) await switchPromise;
    if (disposed) return;
    if (active) { workspace.focus({ preventScroll: true }); return; }
    const previousId = character?.id;
    const selected = selectedSceneId();
    const available = [...listSceneSpeechCharacters(), ...SPEECH_CHARACTERS];
    presets.splice(0, presets.length, ...available);
    $('character').replaceChildren(...presets.map(preset => new Option(preset.label, preset.id)));
    const selectedChanged = selected !== sceneSelectionAtLeave && presets.some(preset => preset.id === selected);
    const nextId = selectedChanged ? selected : presets.some(preset => preset.id === previousId) ? previousId : presets[0].id;
    $('character').value = nextId;
    active = true; closing = false; busy = false;
    showEditorWorkspace('speech'); lastStageSignature = null; lastRender = -Infinity;
    raf = requestAnimationFrame(tick); refresh(); checkEngine();
    // Scene models and scenery may have changed while editing. Preset geometry
    // and the user's camera stay intact when simply visiting the other workspace.
    if (!group || nextId !== previousId || nextId.startsWith('scene:')) await selectCharacter(nextId, { preserveCamera: nextId === previousId });
    else if ($('view').value === 'scene') setView({ preserveCamera: true });
    if (active) workspace.focus({ preventScroll: true });
  }
  function close() {
    if (switchPromise) return switchPromise;
    if (!active || disposed) return Promise.resolve();
    closing = true; refresh(); revision++; cancelAnalysis();
    if (media.micPending) media.stopMic();
    switchPromise = (async () => {
      try { await stopRecording(); } catch (error) { status(error.message); }
      media.stop(); silentPlaybackStart = null; $('take-preview').pause();
      active = false; busy = false; cancelAnimationFrame(raf);
      sceneSelectionAtLeave = selectedSceneId();
      showEditorWorkspace('scene'); document.getElementById('workspace-scene-tab')?.focus();
    })().finally(() => { closing = false; switchPromise = null; refresh(); });
    return switchPromise;
  }
  async function dispose() {
    if (disposed) return;
    await close(); disposed = true; engineAbort?.abort(); cancelAnalysis();
    cancelAnimationFrame(raf); media.dispose(); recorder?.dispose(); dropCharacter();
    if (backdrop) disposeSpeechClone(backdrop); image?.close();
    runtime.controls.dispose(); runtime.renderer.dispose(); runtime.renderer.forceContextLoss();
    if (takeURL) URL.revokeObjectURL(takeURL); $('take-preview').removeAttribute('src'); $('take-preview').load();
    window.removeEventListener('pagehide', dispose); workspace.remove(); activeStudio = null;
    if (window.__SPEECH_STUDIO__ === api) delete window.__SPEECH_STUDIO__;
  }
  workspace.addEventListener('keydown', event => { event.stopPropagation(); });
  window.addEventListener('pagehide', dispose, { once: true });
  $('character').addEventListener('change', run(() => selectCharacter()));
  $('mouth').addEventListener('change', run(() => selectCharacter()));
  $('view').addEventListener('change', setView); $('reframe').addEventListener('click', reframe);
  for (const name of ['x', 'y', 'z', 'tilt', 'size']) $(name).addEventListener('input', syncAnchor);
  $('green').addEventListener('click', () => { $('bg').value = '#00ff00'; imageRevision++; image?.close(); image = null; imageBlob = null; $('clear-background').hidden = true; });
  $('clear-background').addEventListener('click', () => { imageRevision++; image?.close(); image = null; imageBlob = null; $('background').value = ''; $('clear-background').hidden = true; });
  $('background').addEventListener('change', run(async () => {
    const file = $('background').files[0]; if (!file) return; const current = ++imageRevision;
    if (file.size > 16 * 1024 * 1024) throw new Error('Usa una imagen de menos de 16 MB.');
    const bitmap = await createImageBitmap(file);
    if (disposed || current !== imageRevision) { bitmap.close(); return; }
    if (bitmap.width * bitmap.height > 32 * 1024 * 1024) { bitmap.close(); throw new Error('La imagen es demasiado grande. Redúcela a menos de 32 megapíxeles.'); }
    image?.close(); image = bitmap; imageBlob = file; lastStageSignature = null; $('clear-background').hidden = false;
  }));
  $('demo').addEventListener('click', run(() => withExport(() => loadDemo())));
  $('audio-file').addEventListener('change', run(() => withExport(async () => { const file = $('audio-file').files[0]; if (file) await loadAudio(file); $('audio-file').value = ''; })));
  $('track-file').addEventListener('change', run(async () => {
    const file = $('track-file').files[0]; if (!file) return;
    if (file.size > 16 * 1024 * 1024) throw new Error('La pista JSON supera 16 MB.');
    const json = JSON.parse(await file.text());
    const next = json.mouthCues ? rhubarbResultToSpeechTrack(json) : json.cues ? framesFromCues(json) : speechTrackFromJSON(json);
    if (next.duration > 90) throw new Error('La pista no puede superar 90 segundos.');
    cancelAnalysis(); media.stop();
    const mismatched = media.data && Math.abs(media.data.buffer.duration - next.duration) > .2;
    if (mismatched) media.clearAudio();
    const driver = next.source === 'rhubarb' ? 'phonetic' : 'intensity'; tracks = new Map([[driver, next]]); $('driver').value = driver; setTrack(next);
    $('track-file').value = ''; status(mismatched ? 'Pista cargada. El audio anterior tenía otra duración y se ha separado.' : 'Movimientos cargados. Puedes revisar la boca con la barra de tiempo.');
  }));
  $('driver').addEventListener('change', () => { media.stop(); const next = tracks.get($('driver').value); if (next) setTrack(next); });
  $('analyze').addEventListener('click', run(analyze));
  $('mic').addEventListener('click', run(async () => {
    cancelAnalysis(); silentPlaybackStart = null; if (media.micActive || media.micPending) { media.stopMic(); frame = { ...REST_FRAME }; status('Micrófono desactivado.'); }
    else if (await media.startMic()) status('Micrófono activo. Habla para mover la boca; pulsa Grabar vídeo para guardar la toma.'); refresh();
  }));
  $('play').addEventListener('click', run(async () => {
    if (media.data) { silentPlaybackStart = null; if ($('audio').ended) $('audio').currentTime = 0; await media.play(); }
    else { media.stopMic(); const time = Number($('time').value); silentPlaybackStart = performance.now() - (time >= track.duration ? 0 : time) * 1000; }
  }));
  $('stop').addEventListener('click', run(async () => { await stopRecording(); cancelAnalysis(); silentPlaybackStart = null; media.stop(); frame = { ...REST_FRAME }; refresh(); }));
  $('audio').addEventListener('ended', run(async () => { frame = { ...REST_FRAME }; if (recording) await stopRecording(); }));
  $('time').addEventListener('input', () => { silentPlaybackStart = null; media.stop(); const time = Number($('time').value); if (media.data) $('audio').currentTime = time; frame = sampleSpeechFrame(track, time); });
  $('record').addEventListener('click', run(startRecording));
  $('fullscreen').addEventListener('click', run(() => document.fullscreenElement ? document.exitFullscreen() : $('stage').requestFullscreen()));
  async function withExport(action) { busy = true; refresh(); try { await action(); } finally { busy = false; refresh(); } }
  $('glb').addEventListener('click', run(() => withExport(async () => download(new Blob([await exportModel()], { type: 'model/gltf-binary' }), 'speaking-character.glb'))));
  $('json').addEventListener('click', () => download(new Blob([JSON.stringify(speechTrackToJSON(track), null, 2)], { type: 'application/json' }), 'speech.track.json'));
  $('bundle').addEventListener('click', run(() => withExport(async () => download(await createSpeechBundle(await currentAssets()), 'speaking-character.zip'))));
  $('add').addEventListener('click', run(() => withExport(async () => { const result = await importGlbFromBuffer(await exportModel(), character.label + ' · voz.glb'); if (!result.success) throw new Error(result.error || 'No se pudo añadir la copia.'); status('Copia añadida a tu escena con la animación speech. Puedes deshacerlo desde el editor.'); })));
  $('take-video').addEventListener('click', () => { if (lastTake) download(lastTake.video, 'performance.' + mediaExtension(lastTake.video)); });
  $('take-audio').addEventListener('click', () => { if (lastTake?.audio) download(lastTake.audio, 'voice.' + mediaExtension(lastTake.audio)); });
  $('take-zip').addEventListener('click', run(async () => { if (lastTake) download(await createSpeechBundle(lastTake), 'recorded-character.zip'); }));
  const api = { workspace, activate, close, dispose, selectCharacter, loadDemo, loadAudio, setTrack, exportModel, currentAssets, startRecording, stopRecording, media, runtime, world,
    get character() { return character; }, get group() { return group; }, get mouth() { return mouth; }, get track() { return track; },
    get recording() { return recording; }, get lastTake() { return lastTake; }, get visible() { return active && !disposed; }, get ready() { return active && Boolean(group) && !busy && !disposed; },
  };
  activeStudio = api; window.__SPEECH_STUDIO__ = api;
  showTake(); raf = requestAnimationFrame(tick);
  function checkEngine() {
    engineAbort?.abort();
    const controller = new AbortController(); engineAbort = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);
    probeSpeechService({ signal: controller.signal }).then(result => {
      if (disposed || engineAbort !== controller) return;
      engineReady = result === 'ready';
      $('engine').textContent = engineReady ? 'Análisis local disponible.' : 'Análisis local no disponible. Puedes usar la demo, el micro, audios por intensidad y pistas JSON.';
      refresh();
    }).catch(() => {
      if (disposed || engineAbort !== controller) return;
      engineReady = false;
      $('engine').textContent = 'Análisis local no disponible. La demo y el micro siguen funcionando.'; refresh();
    }).finally(() => clearTimeout(timeout));
  }
  checkEngine();
  try { await selectCharacter(presets[0].id); } catch (error) { status(error.message); }
  return api;
}

export function closeSpeechStudio() {
  if (activeStudio) return activeStudio.close();
  showEditorWorkspace('scene');
  return Promise.resolve();
}
