function getElement(root, id) {
  return root?.getElementById?.(id) || null;
}

function createElement(root, tagName) {
  return root?.createElement?.(tagName) || globalThis.document?.createElement?.(tagName);
}

export function renderAnimationModeList(animations, handlers = {}, root = globalThis.document) {
  const list = getElement(root, 'anim-mode-list');
  if (!list) return false;

  list.replaceChildren();

  if (!animations || animations.length === 0) {
    const empty = createElement(root, 'p');
    if (!empty) return true;
    empty.className = 'text-zinc-500 text-[10px]';
    empty.textContent = handlers.translate?.('noAnimations') || 'No animations';
    list.appendChild(empty);
    return true;
  }

  animations.forEach((animation, index) => {
    const row = createAnimationRow(animation, index, handlers, root);
    if (row) list.appendChild(row);
  });
  return true;
}

function createAnimationRow(animation, index, handlers, root) {
  const row = createElement(root, 'div');
  const name = createElement(root, 'span');
  const duration = createElement(root, 'span');
  const tracks = createElement(root, 'span');
  const playButton = createElement(root, 'button');
  const deleteButton = createElement(root, 'button');
  if (!row || !name || !duration || !tracks || !playButton || !deleteButton) return null;

  row.className = 'flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-2 rounded';
  name.className = 'flex-1 text-[10px] text-white truncate';
  name.textContent = animation.name || `Anim ${index + 1}`;
  duration.className = 'text-[10px] text-zinc-400';
  duration.textContent = animation.duration ? `${animation.duration.toFixed(1)}s` : '';
  tracks.className = 'text-[10px] text-zinc-500';
  tracks.textContent = animation.tracks ? `${animation.tracks.length}t` : '';
  playButton.className = 'retro-button bg-[#ffcc00] text-black px-2 py-0.5 text-[10px] font-bold';
  playButton.textContent = 'PLAY';
  playButton.addEventListener?.('click', () => handlers.onPlay?.(index));
  deleteButton.className = 'retro-button bg-red-600 text-white px-2 py-0.5 text-[10px]';
  deleteButton.textContent = 'X';
  deleteButton.addEventListener?.('click', () => handlers.onDelete?.(index));

  row.append(name, duration, tracks, playButton, deleteButton);
  return row;
}

export function createAnimationListDomAdapter({ root = globalThis.document } = {}) {
  return {
    renderAnimationModeList: (animations, handlers) => renderAnimationModeList(animations, handlers, root),
  };
}
