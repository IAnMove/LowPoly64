function createDomElement(tagName, root = globalThis.document) {
  return root?.createElement?.(tagName) || null;
}

export function getExpandableObjectListChildren(obj) {
  if (!obj?.isGroup) return [];
  if (obj.userData?.isPivot) {
    return (obj.children || []).filter((child) => child.isGroup);
  }
  return obj.children || [];
}

export function findObjectListRootTarget(obj, rootObject) {
  let target = obj;
  while (target?.parent && target.parent !== rootObject) {
    target = target.parent;
  }
  return target;
}

export function renderObjectListToggle(isOpen, {
  content,
  arrow,
} = {}) {
  if (!content || !arrow) return false;

  if (isOpen) {
    content.classList.remove('hidden');
    arrow.innerHTML = '&#9660;';
  } else {
    content.classList.add('hidden');
    arrow.innerHTML = '&#9654;';
  }

  return true;
}

export function renderSelectedOverlay(selectedObject, {
  overlay,
} = {}) {
  if (!overlay) return false;

  const name = selectedObject?.userData?.name;
  if (!selectedObject || !name) {
    overlay.classList.add('hidden');
    return true;
  }

  overlay.textContent = name;
  overlay.classList.remove('hidden');
  return true;
}

export function createObjectListEntry(obj, {
  container,
  createElement = createDomElement,
  depth = 0,
  rootObject,
  selectedObject = null,
  selectedObjects = new Set(),
  onSelect = () => {},
  onSelectRoot = () => {},
  onToggleExpanded = () => {},
} = {}) {
  const isGroup = obj.isGroup && !obj.userData?.isPivot;
  const isPivot = obj.userData?.isPivot;
  const name = obj.userData?.name || 'Object';
  const isSelected = obj === selectedObject || selectedObjects.has(obj);
  const expandableChildren = getExpandableObjectListChildren(obj);
  const hasChildren = expandableChildren.length > 0;

  const row = createElement('div');
  if (!row) return null;
  row.className = 'flex items-center gap-1 px-2 py-[3px] cursor-pointer hover:bg-white/10 select-none'
    + (isSelected ? ' bg-[#4488ff]/25 text-[#4488ff]' : ' text-zinc-300');
  row.style.paddingLeft = `${8 + depth * 12}px`;

  if (hasChildren) {
    const toggle = createElement('span');
    if (!toggle) return null;
    toggle.className = 'text-[#ffcc00] w-3 text-center flex-shrink-0 cursor-pointer';
    toggle.innerHTML = obj._listExpanded ? '&#9660;' : '&#9654;';
    toggle.addEventListener('click', (event) => {
      event.stopPropagation?.();
      onToggleExpanded(obj);
    });
    row.appendChild(toggle);
  } else {
    const spacer = createElement('span');
    if (!spacer) return null;
    spacer.className = 'w-3 flex-shrink-0';
    row.appendChild(spacer);
  }

  const icon = createElement('span');
  if (!icon) return null;
  icon.className = isGroup
    ? 'flex-shrink-0 text-[#ffcc00]'
    : isPivot
      ? 'flex-shrink-0 text-[#00ffcc]'
      : 'flex-shrink-0 text-zinc-400';
  if (isGroup) {
    icon.textContent = '\u25A1';
  } else if (isPivot) {
    icon.textContent = hasChildren ? '\u25C7' : '\u2022';
  } else {
    icon.textContent = '\u25A0';
  }
  row.appendChild(icon);

  const label = createElement('span');
  if (!label) return null;
  label.className = 'truncate';
  label.textContent = name;
  row.appendChild(label);

  row.addEventListener('click', () => onSelect(obj));
  row.addEventListener('dblclick', (event) => {
    event.stopPropagation?.();
    const target = findObjectListRootTarget(obj, rootObject);
    if (target?.isGroup) {
      onSelectRoot(target);
    }
  });

  container.appendChild(row);

  if (obj._listExpanded && hasChildren) {
    expandableChildren.forEach((child) => {
      createObjectListEntry(child, {
        container,
        createElement,
        depth: depth + 1,
        rootObject,
        selectedObject,
        selectedObjects,
        onSelect,
        onSelectRoot,
        onToggleExpanded,
      });
    });
  }

  return row;
}

export function renderObjectList({
  content,
  countElement,
  objects = [],
  isOpen = false,
  rootObject = null,
  selectedObject = null,
  selectedObjects = new Set(),
  translate = (key) => key,
  createElement = createDomElement,
  onSelect = () => {},
  onSelectRoot = () => {},
  onToggleExpanded = () => {},
} = {}) {
  if (!countElement || !content) return false;

  const items = objects || [];
  countElement.textContent = `(${items.length})`;

  if (!isOpen) return true;

  content.innerHTML = '';

  if (items.length === 0) {
    const empty = createElement('div');
    if (!empty) return true;
    empty.className = 'px-3 py-2 text-zinc-500 italic';
    empty.textContent = translate('emptyScene');
    content.appendChild(empty);
    return true;
  }

  items.forEach((obj) => {
    createObjectListEntry(obj, {
      container: content,
      createElement,
      rootObject,
      selectedObject,
      selectedObjects,
      onSelect,
      onSelectRoot,
      onToggleExpanded,
    });
  });

  return true;
}

export function createObjectListDomAdapter({ root = globalThis.document } = {}) {
  const createElement = (tagName) => createDomElement(tagName, root);

  return {
    renderList: (options = {}) => renderObjectList({ ...options, createElement }),
    renderToggle: renderObjectListToggle,
    renderOverlay: renderSelectedOverlay,
  };
}
