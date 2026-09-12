import assert from 'node:assert/strict';
import test from 'node:test';

import { createSpeechStudioAudio, REST_FRAME } from '../src/modules/character-studio/speech/speech-studio-audio.js';

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
  }
}

class FakeTrack {
  constructor(kind = 'audio') {
    this.kind = kind;
    this.readyState = 'live';
    this.stopCount = 0;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  stop() {
    if (this.readyState === 'ended') return;
    this.readyState = 'ended';
    this.stopCount += 1;
    for (const listener of this.listeners.get('ended') || []) listener({ target: this });
  }
}

class FakeStream {
  constructor(tracks = [new FakeTrack()]) {
    this.tracks = tracks;
  }

  getTracks() { return [...this.tracks]; }
  getAudioTracks() { return this.tracks.filter((track) => track.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === 'video'); }
}

class FakeNode {
  constructor(name) {
    this.name = name;
    this.connections = [];
    this.disconnectCount = 0;
  }

  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.disconnectCount += 1; this.connections = []; }
}

class FakeAnalyser extends FakeNode {
  constructor() {
    super('analyser');
    this.fftSize = 0;
    this.level = 0;
  }

  getFloatTimeDomainData(target) {
    target.fill(this.level);
  }
}

class FakeAudioContext {
  static instances = [];
  static decode = async () => makeBuffer();

  constructor() {
    this.sampleRate = 1_000;
    this.destination = new FakeNode('speaker');
    this.mediaSource = null;
    this.mediaDestination = null;
    this.mediaDestinationStream = new FakeStream([new FakeTrack('audio')]);
    this.resumeCount = 0;
    this.closeCount = 0;
    FakeAudioContext.instances.push(this);
  }

  resume() {
    this.resumeCount += 1;
    return Promise.resolve();
  }

  decodeAudioData(bytes) {
    return FakeAudioContext.decode(bytes);
  }

  createAnalyser() {
    this.analyser = new FakeAnalyser();
    return this.analyser;
  }

  createMediaStreamSource(stream) {
    this.mediaStreamSource = new FakeNode('microphone-source');
    this.mediaStreamSource.stream = stream;
    return this.mediaStreamSource;
  }

  createMediaElementSource(audio) {
    this.mediaSource = new FakeNode('media-element-source');
    this.mediaSource.audio = audio;
    return this.mediaSource;
  }

  createMediaStreamDestination() {
    this.mediaDestination = new FakeNode('media-destination');
    this.mediaDestination.stream = this.mediaDestinationStream;
    return this.mediaDestination;
  }

  close() {
    this.closeCount += 1;
    return Promise.resolve();
  }
}

class FakeAudioElement {
  constructor() {
    this.src = '';
    this.pauseCount = 0;
    this.playCount = 0;
    this.loadCount = 0;
  }

  pause() { this.pauseCount += 1; }
  play() { this.playCount += 1; return Promise.resolve(); }
  load() { this.loadCount += 1; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
}

function makeBuffer({ duration = .25, length = 250, level = .4 } = {}) {
  const samples = Float32Array.from({ length }, () => level);
  return {
    duration,
    length,
    numberOfChannels: 1,
    sampleRate: 1_000,
    getChannelData: () => samples,
  };
}

function makeBlob(name = 'voice.wav') {
  return { name, size: 4, arrayBuffer: async () => new ArrayBuffer(4) };
}

function makeURL() {
  let next = 0;
  const revoked = [];
  return {
    revoked,
    createObjectURL: () => `blob:fake-${next++}`,
    revokeObjectURL: (url) => revoked.push(url),
  };
}

function makeHarness({ getUserMedia = async () => new FakeStream(), decode = async () => makeBuffer() } = {}) {
  FakeAudioContext.instances = [];
  FakeAudioContext.decode = decode;
  const audio = new FakeAudioElement();
  const url = makeURL();
  let changes = 0;
  const media = createSpeechStudioAudio(audio, () => { changes += 1; }, {
    AudioContext: FakeAudioContext,
    navigator: { mediaDevices: { getUserMedia } },
    URL: url,
    Blob,
  });
  return { media, audio, url, get changes() { return changes; } };
}

test('cancelling a pending permission request releases a late stream without throwing', async () => {
  const permission = new Deferred();
  const track = new FakeTrack();
  const granted = new FakeStream([track]);
  const harness = makeHarness({ getUserMedia: () => permission.promise });
  const pending = harness.media.startMic();

  assert.equal(harness.media.micPending, true);
  harness.media.stopMic();
  permission.resolve(granted);

  assert.equal(await pending, false);
  assert.equal(harness.media.micPending, false);
  assert.equal(harness.media.micActive, false);
  assert.equal(harness.media.stream, null);
  assert.equal(track.stopCount, 1);
});

test('a stale decode rejection is treated as cancellation after a newer load state', async () => {
  const decode = new Deferred();
  const harness = makeHarness({ decode: () => decode.promise });
  const loading = harness.media.load(makeBlob());
  harness.media.clearAudio();
  decode.reject(new Error('late decode failed'));

  assert.equal(await loading, null);
  assert.equal(harness.media.data, null);
  assert.equal(harness.url.revoked.length, 0);
});

test('playback audio is routed to MediaStreamDestination without speaker feedback', async () => {
  const harness = makeHarness();
  await harness.media.load(makeBlob('demo.wav'));
  const output = await harness.media.outputStream();
  const context = FakeAudioContext.instances[0];

  assert.strictEqual(output, context.mediaDestinationStream);
  assert.equal(context.mediaSource.connections.length, 2);
  assert.strictEqual(context.mediaSource.connections[0], context.mediaDestination);
  assert.strictEqual(context.mediaSource.connections[1], context.destination);
  assert.equal(context.destination.connections.length, 0, 'the destination node itself never feeds another output');
  assert.strictEqual(await harness.media.outputStream(), output);
  assert.equal(context.mediaSource.connections.length, 2);
});

test('microphone monitoring connects only to the analyser and dispose is idempotent', async () => {
  const track = new FakeTrack();
  const granted = new FakeStream([track]);
  const harness = makeHarness({ getUserMedia: async () => granted });
  assert.equal(await harness.media.startMic(), true);
  const context = FakeAudioContext.instances[0];
  assert.strictEqual(await harness.media.outputStream(), granted);
  assert.equal(context.mediaSource, null, 'a live microphone stream is handed to the recorder directly');
  context.analyser.level = .5;

  const frame = harness.media.microphoneFrame();
  assert.ok(frame.open >= 0 && frame.open <= 1);
  assert.strictEqual(context.mediaStreamSource.connections[0], context.analyser);
  assert.equal(context.destination.connections.length, 0);

  harness.media.dispose();
  harness.media.dispose();
  assert.equal(track.stopCount, 1);
  assert.equal(context.closeCount, 1);
  assert.equal(harness.media.micPending, false);
  assert.equal(harness.media.micActive, false);
  await assert.rejects(harness.media.outputStream(), (error) => error.code === 'DISPOSED');
});

test('permission failures still reject while cancellation returns false', async () => {
  const failure = new Error('permission denied');
  const harness = makeHarness({ getUserMedia: async () => { throw failure; } });

  await assert.rejects(harness.media.startMic(), (error) => error === failure);
  assert.equal(harness.media.micPending, false);
  assert.equal(harness.media.micActive, false);
  assert.equal(harness.media.stream, null);
  assert.deepEqual(harness.media.microphoneFrame(), REST_FRAME);
});


test('switching from a playing file to microphone pauses file playback', async () => {
  const { media, audio } = makeHarness();
  await media.load(makeBlob()); await media.play();
  const pauses = audio.pauseCount;
  await media.startMic();
  assert.ok(audio.pauseCount > pauses);
  assert.equal(media.micActive, true);
  media.dispose();
});
