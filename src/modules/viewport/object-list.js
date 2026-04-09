import { state } from '../shared/state.js';
import { selectMesh, deselectAll, toggleMultiSelect } from './selection.js';
import { t } from '../shared/i18n.js';

let listOpen = false;

export function toggleObjectList() {
  listOpen = !listOpen;
  const content = document.getElementById('object-list-content');
  const arrow = document.getElementById('object-list-arrow');
  if (listOpen) {
    content.classList.remove('hidden');
    arrow.innerHTML = '&#9660;';
    refreshObjectList();
  } else {
    content.classList.add('hidden');
    arrow.innerHTML = '&#9654;';
  }
}

export function refreshObjectList() {
  const countEl = document.getElementById('object-list-count');
  const content = document.getElementById('object-list-content');
  if (!countEl || !content) return;

  const children = state.userObjects ? state.userObjects.children : [];
  countEl.textContent = `(${children.length})`;

  if (!listOpen) return;

  content.innerHTML = '';

  if (children.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'px-3 py-2 text-zinc-500 italic';
    empty.textContent = t('emptyScene');
    content.appendChild(empty);
    return;
  }

  children.forEach((obj) => {
    buildListEntry(obj, content, 0);
  });
}

function getExpandableChildren(obj) {
  if (!obj.isGroup) return [];
  // For PivotGroups, expandable children are sub-groups (not the pivot's own mesh)
  if (obj.userData.isPivot) {
    return obj.children.filter((c) => c.isGroup);
  }
  return obj.children;
}

function buildListEntry(obj, container, depth) {
  const isGroup = obj.isGroup && !obj.userData.isPivot;
  const isPivot = obj.userData.isPivot;
  const name = obj.userData.name || 'Object';
  const isSelected = obj === state.selectedMesh || state.selectedMeshes.has(obj);
  const expandableChildren = getExpandableChildren(obj);
  const hasChildren = expandableChildren.length > 0;

  const row = document.createElement('div');
  row.className = 'flex items-center gap-1 px-2 py-[3px] cursor-pointer hover:bg-white/10 select-none'
    + (isSelected ? ' bg-[#4488ff]/25 text-[#4488ff]' : ' text-zinc-300');
  row.style.paddingLeft = (8 + depth * 12) + 'px';

  // Expand/collapse toggle for any node with children
  if (hasChildren) {
    const toggle = document.createElement('span');
    toggle.className = 'text-[#ffcc00] w-3 text-center flex-shrink-0 cursor-pointer';
    toggle.innerHTML = obj._listExpanded ? '&#9660;' : '&#9654;';
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      obj._listExpanded = !obj._listExpanded;
      refreshObjectList();
    });
    row.appendChild(toggle);
  } else {
    const spacer = document.createElement('span');
    spacer.className = 'w-3 flex-shrink-0';
    row.appendChild(spacer);
  }

  // Icon
  const icon = document.createElement('span');
  icon.className = 'flex-shrink-0';
  if (isGroup) {
    icon.textContent = '\u25A1';
    icon.classList.add('text-[#ffcc00]');
  } else if (isPivot) {
    icon.textContent = hasChildren ? '\u25C7' : '\u2022';
    icon.classList.add('text-[#00ffcc]');
  } else {
    icon.textContent = '\u25A0';
    icon.classList.add('text-zinc-400');
  }
  row.appendChild(icon);

  // Name
  const label = document.createElement('span');
  label.className = 'truncate';
  label.textContent = name;
  row.appendChild(label);

  // Click to select (Ctrl+click for multi-select)
  row.addEventListener('click', (e) => {
    if ((e.ctrlKey || e.metaKey) && !state.animationMode) {
      toggleMultiSelect(obj);
    } else {
      deselectAll();
      selectMesh(obj);
    }
    updateSelectedOverlay();
    refreshObjectList();
  });

  // Double-click to select root group
  row.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    let target = obj;
    while (target.parent && target.parent !== state.userObjects) {
      target = target.parent;
    }
    if (target.isGroup) {
      deselectAll();
      selectMesh(target);
      updateSelectedOverlay();
      refreshObjectList();
    }
  });

  container.appendChild(row);

  // Render children if expanded
  if (obj._listExpanded && hasChildren) {
    expandableChildren.forEach((child) => {
      buildListEntry(child, container, depth + 1);
    });
  }
}

export function updateSelectedOverlay() {
  const overlay = document.getElementById('selected-overlay');
  if (!overlay) return;

  const mesh = state.selectedMesh;
  if (!mesh) {
    overlay.classList.add('hidden');
    return;
  }

  const name = mesh.userData.name;
  if (!name) {
    overlay.classList.add('hidden');
    return;
  }

  overlay.textContent = name;
  overlay.classList.remove('hidden');
}
