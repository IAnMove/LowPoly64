function getElement(root, id) {
  return root?.getElementById?.(id) || null;
}

function createElement(root, tagName) {
  return root?.createElement?.(tagName) || globalThis.document?.createElement?.(tagName);
}

export function getSelectedAnimationIndex(root = globalThis.document) {
  const select = getElement(root, 'anim-select');
  const index = Number.parseInt(select?.value, 10);
  return Number.isFinite(index) ? index : 0;
}

export function setSelectedAnimationIndex(index, root = globalThis.document) {
  const select = getElement(root, 'anim-select');
  if (select) select.value = index;
}

export function renderAnimationTimeline(group, root = globalThis.document) {
  const timeline = getElement(root, 'animation-timeline');
  if (!timeline) return false;

  const clips = group?.userData?.animationClips || [];
  if (!group || clips.length === 0) {
    timeline.classList.add('hidden');
    return false;
  }

  timeline.classList.remove('hidden');

  const select = getElement(root, 'anim-select');
  if (!select) return true;

  select.replaceChildren();
  const animations = group.userData.animations || [];
  clips.forEach((clip, index) => {
    const option = createElement(root, 'option');
    if (!option) return;
    option.value = index;
    option.textContent = animations[index]?.name || clip.name || `Anim ${index + 1}`;
    select.appendChild(option);
  });

  return true;
}

export function updateAnimationTimelinePlayback(progress, playing, root = globalThis.document) {
  const timeline = getElement(root, 'animation-timeline');
  if (!timeline || timeline.classList.contains('hidden')) return false;

  const progressBar = getElement(root, 'anim-progress');
  if (progressBar && progress.duration > 0) {
    progressBar.style.width = `${(progress.time / progress.duration) * 100}%`;
  }

  const time = getElement(root, 'anim-time');
  if (time) {
    time.textContent = `${progress.time.toFixed(1)} / ${progress.duration.toFixed(1)}`;
  }

  const playButton = getElement(root, 'btn-play');
  if (playButton) {
    playButton.classList.toggle('bg-[#ffcc00]', !playing);
    playButton.classList.toggle('text-black', !playing);
    playButton.classList.toggle('bg-green-600', playing);
    playButton.classList.toggle('text-white', playing);
  }

  const stopButton = getElement(root, 'btn-stop');
  if (stopButton) {
    const stopped = !playing;
    stopButton.classList.toggle('bg-zinc-800', !stopped || playing);
    stopButton.classList.toggle('text-[#ffcc00]', !stopped || playing);
  }

  return true;
}

export function createAnimationTimelineDomAdapter({ root = globalThis.document } = {}) {
  return {
    getSelectedAnimationIndex: () => getSelectedAnimationIndex(root),
    setSelectedAnimationIndex: (index) => setSelectedAnimationIndex(index, root),
    renderAnimationTimeline: (group) => renderAnimationTimeline(group, root),
    updateAnimationTimelinePlayback: (progress, playing) => updateAnimationTimelinePlayback(progress, playing, root),
  };
}
