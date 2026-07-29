import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearHistory,
  getHistoryStatus,
  pushAction,
  undo,
} from '../src/modules/shared/undo.js';

function action(onDispose) {
  return {
    type: 'disposable fixture',
    undo() {},
    redo() {},
    dispose: onDispose,
  };
}

test('disposes history entries when capacity evicts them or history is cleared', () => {
  clearHistory();
  let disposed = 0;
  for (let index = 0; index < 51; index += 1) {
    pushAction(action(() => { disposed += 1; }));
  }
  assert.equal(disposed, 1);
  assert.equal(getHistoryStatus().undoDepth, 50);

  clearHistory();
  assert.equal(disposed, 51);
  assert.deepEqual(getHistoryStatus(), {
    canUndo: false,
    canRedo: false,
    undoDepth: 0,
    redoDepth: 0,
  });
});

test('disposes redo entries when a new branch is pushed', () => {
  clearHistory();
  let disposed = 0;
  pushAction(action(() => { disposed += 1; }));
  undo();
  pushAction(action(() => { disposed += 1; }));
  assert.equal(disposed, 1);
  clearHistory();
  assert.equal(disposed, 2);
});
