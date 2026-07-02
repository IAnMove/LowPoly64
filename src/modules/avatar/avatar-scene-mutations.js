import { emit } from '../../event-bus.js';
import { refreshObjectList, updateSelectedOverlay } from '../viewport/object-list.js';
import { selectMesh } from '../viewport/selection.js';

function moveChildToIndex(parent, child, index) {
  if (!parent || !child) return;
  const currentIndex = parent.children.indexOf(child);
  if (currentIndex === -1) return;
  const safeIndex = Math.max(0, Math.min(index, parent.children.length - 1));
  if (currentIndex === safeIndex) return;
  parent.children.splice(currentIndex, 1);
  parent.children.splice(safeIndex, 0, child);
}

export function insertChildAtIndex(parent, child, index) {
  if (!parent || !child) return;
  parent.add(child);
  moveChildToIndex(parent, child, index);
}

export function removeChildIfPresent(parent, child) {
  if (!parent || !child || child.parent !== parent) return;
  parent.remove(child);
}

export function replaceChildAtIndex(parent, currentChild, nextChild, index) {
  if (!parent || !nextChild) return;
  removeChildIfPresent(parent, currentChild);
  insertChildAtIndex(parent, nextChild, index);
}

export function syncSceneAfterMutation(selectedGroup = null) {
  if (selectedGroup) {
    selectMesh(selectedGroup);
  }
  refreshObjectList();
  updateSelectedOverlay();
  emit('scene:objects-changed');
}
