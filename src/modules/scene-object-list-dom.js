function createDomElement(tagName, root = globalThis.document) {
  return root?.createElement?.(tagName) || null;
}

export function createSceneObjectListEmptyState({
  translate = (key) => key,
  createElement = createDomElement,
} = {}) {
  const empty = createElement('div');
  if (!empty) return null;
  empty.className = 'text-zinc-500 text-[10px] italic py-2';
  empty.textContent = translate('emptyScene');
  return empty;
}

export function createSceneObjectListRow(obj, {
  createElement = createDomElement,
  onSelect = () => {},
} = {}) {
  const row = createElement('div');
  const icon = createElement('span');
  const label = createElement('span');
  if (!row || !icon || !label) return null;

  row.className = 'flex items-center gap-2 px-2 py-[5px] cursor-pointer hover:bg-white/10 rounded text-[10px] font-mono text-zinc-300';

  icon.textContent = obj.isGroup ? '\u25A1' : '\u25A0';
  icon.className = obj.isGroup ? 'text-[#ffcc00]' : 'text-zinc-400';

  label.className = 'truncate';
  label.textContent = obj.userData?.name || 'Object';

  row.appendChild(icon);
  row.appendChild(label);
  row.addEventListener?.('click', () => onSelect(obj));

  return row;
}

export function renderSceneObjectList(objects = [], {
  container,
  translate = (key) => key,
  createElement = createDomElement,
  onSelect = () => {},
} = {}) {
  if (!container) return false;

  const items = objects || [];
  if (typeof container.replaceChildren === 'function') {
    container.replaceChildren();
  } else {
    container.innerHTML = '';
  }

  if (items.length === 0) {
    const empty = createSceneObjectListEmptyState({ translate, createElement });
    if (empty) container.appendChild(empty);
    return true;
  }

  items.forEach((obj) => {
    const row = createSceneObjectListRow(obj, { createElement, onSelect });
    if (row) container.appendChild(row);
  });

  return true;
}

export function createSceneObjectListDomAdapter({ root = globalThis.document } = {}) {
  const createElement = (tagName) => createDomElement(tagName, root);

  return {
    renderList: (objects, options = {}) => renderSceneObjectList(objects, {
      ...options,
      createElement,
    }),
  };
}
