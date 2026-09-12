import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSpeechRecorder,
  SPEECH_RECORDER_STATES,
} from '../src/modules/character-studio/speech/speech-recorder.js';

class FakeClock {
  constructor() {
    this.time = 0;
    this.nextTimer = 1;
    this.timers = new Map();
  }

  now() {
    return this.time;
  }

  setTimeout(callback, delay) {
    const id = this.nextTimer++;
    this.timers.set(id, { callback, at: this.time + delay });
    return id;
  }

  clearTimeout(id) {
    this.timers.delete(id);
  }

  advance(milliseconds) {
    this.time += milliseconds;
    const due = [...this.timers.entries()]
      .filter(([, timer]) => timer.at <= this.time)
      .sort(([, first], [, second]) => first.at - second.at);
    for (const [id, timer] of due) {
      if (!this.timers.delete(id)) continue;
      timer.callback();
    }
  }
}

class FakeTrack {
  constructor(kind) {
    this.kind = kind;
    this.readyState = 'live';
    this.stopCount = 0;
    this.listeners = new Map();
    this.clones = [];
  }

  clone() {
    const cloned = new FakeTrack(this.kind);
    this.clones.push(cloned);
    return cloned;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type) {
    for (const listener of this.listeners.get(type) || []) listener({ target: this });
  }

  end() {
    if (this.readyState === 'ended') return;
    this.readyState = 'ended';
    this.emit('ended');
  }

  stop() {
    this.stopCount += 1;
    this.end();
  }
}

class FakeStream {
  constructor(tracks) {
    this.tracks = [...tracks];
  }

  getTracks() {
    return [...this.tracks];
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video');
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio');
  }
}

class FakeCanvas {
  constructor(videoTrack) {
    this.videoTrack = videoTrack;
    this.captureFps = null;
  }

  captureStream(fps) {
    this.captureFps = fps;
    return new FakeStream([this.videoTrack]);
  }
}

class FakeRecorder {
  static instances = [];

  static isTypeSupported(mimeType) {
    return mimeType === 'video/webm' || mimeType === 'audio/webm';
  }

  constructor(stream, options = {}) {
    this.stream = stream;
    this.mimeType = options.mimeType || (stream.getAudioTracks().length ? 'audio/webm' : 'video/webm');
    this.state = 'inactive';
    this.startCount = 0;
    this.stopCount = 0;
    this.ondataavailable = null;
    this.onerror = null;
    this.onstop = null;
    FakeRecorder.instances.push(this);
  }

  start() {
    this.startCount += 1;
    this.state = 'recording';
  }

  stop() {
    if (this.state === 'inactive') throw new Error('already stopped');
    this.stopCount += 1;
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([this.mimeType]) });
    this.onstop?.();
  }

  emitError(message = 'fake recorder error') {
    this.onerror?.({ error: new Error(message) });
  }
}

function makeHarness(options = {}) {
  FakeRecorder.instances = [];
  const clock = new FakeClock();
  const videoTrack = new FakeTrack('video');
  const audioTrack = new FakeTrack('audio');
  const canvas = new FakeCanvas(videoTrack);
  const audioStream = options.withAudio === false ? null : new FakeStream([audioTrack]);
  const errors = [];
  const completed = [];
  const recorder = createSpeechRecorder({
    canvas,
    audioStream,
    fps: options.fps ?? 30,
    maxDuration: options.maxDuration ?? 10,
    clock,
    onComplete: (value) => completed.push(value),
    onError: (error) => errors.push(error),
    deps: {
      MediaRecorder: FakeRecorder,
      MediaStream: FakeStream,
      Blob,
      setTimeout: clock.setTimeout.bind(clock),
      clearTimeout: clock.clearTimeout.bind(clock),
    },
  });
  return { recorder, clock, videoTrack, audioTrack, canvas, errors, completed };
}

test('aligns mouth frames to elapsed capture time and records supplied audio separately', async () => {
  const harness = makeHarness({ fps: 24 });
  harness.recorder.start();
  harness.clock.advance(125);
  harness.recorder.addFrame({ open: .8, wide: .4, round: .1, viseme: 'A' });
  harness.clock.advance(375);

  const result = await harness.recorder.stop();
  assert.equal(harness.canvas.captureFps, 24);
  assert.equal(result.duration, .5);
  assert.equal(result.mimeType, 'video/webm');
  assert.ok(result.video instanceof Blob);
  assert.ok(result.audio instanceof Blob);
  assert.deepEqual(result.track.frames.map((frame) => frame.time), [0, .125, .5]);
  assert.equal(result.track.frames[1].viseme, 'A');
  assert.equal(result.track.frames.at(-1).viseme, 'rest');
  assert.equal(result.track.frames.at(-1).open, 0);
  assert.equal(harness.completed.length, 1);
  assert.equal(harness.audioTrack.stopCount, 0, 'the controller-owned audio track stays live');
  assert.equal(harness.videoTrack.stopCount, 1, 'the internally captured canvas track is released');
  assert.equal(harness.recorder.state, SPEECH_RECORDER_STATES.COMPLETED);
});

test('always closes the mouth at the beginning and end, including an empty take', async () => {
  const harness = makeHarness({ withAudio: false });
  harness.recorder.start();
  harness.clock.advance(250);

  const result = await harness.recorder.stop();
  assert.equal(result.track.frames[0].time, 0);
  assert.equal(result.track.frames[0].viseme, 'rest');
  assert.equal(result.track.frames.at(-1).time, .25);
  assert.equal(result.track.frames.at(-1).viseme, 'rest');
  assert.equal(result.audio, null);
});

test('stop is idempotent and automatic duration limit completes once', async () => {
  const harness = makeHarness({ maxDuration: 1 });
  harness.recorder.start();
  harness.clock.advance(1000);

  assert.equal(harness.recorder.state, SPEECH_RECORDER_STATES.COMPLETED);
  assert.equal(harness.completed.length, 1);
  const first = await harness.recorder.stop();
  const second = await harness.recorder.stop();
  assert.strictEqual(first, second);
  assert.equal(first.duration, 1);
  assert.equal(first.track.frames.at(-1).time, 1);
  assert.equal(harness.completed.length, 1);
});

test('unexpected recording track end reports an error and releases owned tracks', async () => {
  const harness = makeHarness();
  harness.recorder.start();
  const recordingVideoTrack = harness.videoTrack.clones[0];
  recordingVideoTrack.end();

  assert.equal(harness.recorder.state, SPEECH_RECORDER_STATES.ERROR);
  assert.equal(harness.errors.length, 1);
  assert.equal(harness.errors[0].code, 'TRACK_ENDED');
  assert.equal(harness.videoTrack.stopCount, 1);
  assert.equal(harness.audioTrack.stopCount, 0);
  await assert.rejects(harness.recorder.stop(), (error) => error.code === 'TRACK_ENDED');
});

test('recorder failures and disposal clean up handles without stopping source audio', async () => {
  const harness = makeHarness();
  harness.recorder.start();
  const [videoRecorder] = FakeRecorder.instances;
  videoRecorder.emitError();
  assert.equal(harness.recorder.state, SPEECH_RECORDER_STATES.ERROR);
  assert.equal(harness.errors.length, 1);
  assert.equal(harness.videoTrack.stopCount, 1);
  assert.equal(harness.audioTrack.stopCount, 0);

  const disposed = makeHarness();
  disposed.recorder.start();
  disposed.recorder.dispose();
  assert.equal(disposed.recorder.state, SPEECH_RECORDER_STATES.DISPOSED);
  assert.equal(disposed.videoTrack.stopCount, 1);
  assert.equal(disposed.audioTrack.stopCount, 0);
  await assert.rejects(disposed.recorder.stop(), (error) => error.code === 'DISPOSED');
});

