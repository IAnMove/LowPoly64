import { state } from '../shared/state.js';
import { onResize } from '../viewport/scene.js';

const DEFAULT_RIGHT_PANEL_CLASS = 'w-72 bg-zinc-900 border-l-4 border-[#ffcc00] p-4 flex flex-col panel overflow-y-auto shrink-0 min-h-0';
const ANIM_MODE_RIGHT_PANEL_CLASS = 'bg-zinc-900 border-l-4 border-[#00ff88] p-3 flex flex-col panel overflow-hidden shrink-0 min-h-0';
const ANIM_MODE_LEFT_PANEL_CLASS = 'w-72 bg-zinc-900 border-r-4 border-[#00ff88] p-3 flex flex-col panel overflow-hidden shrink-0 hidden min-h-0';
const DEFAULT_VIEWPORT_CLASS = 'flex-1 relative min-w-0';
const ANIM_MODE_VIEWPORT_CLASS = 'relative flex-1 min-w-0 min-h-0 h-full max-h-full overflow-hidden';
const ANIM_MODE_SPLIT_CLASS = 'flex flex-wrap flex-1 min-w-0 min-h-0 h-full max-h-full overflow-hidden';
const ANIM_MODE_SPLIT_HIDDEN_CLASS = `hidden ${ANIM_MODE_SPLIT_CLASS}`;
const ANIM_MODE_MODEL_STAGE_CLASS = 'flex min-w-[16rem] min-h-0 h-full max-h-full basis-1/2 grow shrink overflow-hidden border-r-2 border-[#00ff88]/40';
const ANIM_MODE_MODEL_STAGE_FULL_CLASS = 'flex min-w-0 min-h-0 h-full max-h-full basis-full grow shrink overflow-hidden';
const ANIM_MODE_RIG_STAGE_CLASS = 'flex min-w-[16rem] min-h-0 h-full max-h-full basis-1/2 grow shrink overflow-hidden bg-zinc-950 border-l-2 border-[#00ff88]/40';
const ANIM_MODE_RIG_STAGE_HIDDEN_CLASS = `hidden ${ANIM_MODE_RIG_STAGE_CLASS}`;
const ANIM_MODE_SECTION_KEYS = ['rig', 'reference', 'pose', 'import', 'export'];

export function scheduleAnimModeLayoutResize(resizeRigPreviewViewport) {
  requestAnimationFrame(() => {
    try {
      onResize?.();
    } catch (error) {
      console.warn('Could not refresh viewport after animation mode layout change.', error);
    }
    resizeRigPreviewViewport?.();
  });
}

export function isAnimModeSplitPreviewActive() {
  const splitHost = document.getElementById('anim-mode-preview-split');
  const rigStage = document.getElementById('anim-mode-rig-stage');
  return !!(state.animationMode && splitHost && rigStage
    && !splitHost.classList.contains('hidden')
    && !rigStage.classList.contains('hidden'));
}

export function syncAnimModeSplitClasses(animModeViewportState) {
  const previewSplit = document.getElementById('anim-mode-preview-split');
  const modelStage = document.getElementById('anim-mode-model-stage');
  const rigStage = document.getElementById('anim-mode-rig-stage');
  const rigToggleLabels = Array.from(document.querySelectorAll('[onclick*="animModeToggleRigViewport()"]'));
  if (!previewSplit || !modelStage || !rigStage) return;

  previewSplit.className = previewSplit.classList.contains('hidden')
    ? ANIM_MODE_SPLIT_HIDDEN_CLASS
    : ANIM_MODE_SPLIT_CLASS;
  if (animModeViewportState.rigHidden) {
    modelStage.className = ANIM_MODE_MODEL_STAGE_FULL_CLASS;
    rigStage.className = ANIM_MODE_RIG_STAGE_HIDDEN_CLASS;
  } else {
    modelStage.className = ANIM_MODE_MODEL_STAGE_CLASS;
    rigStage.className = ANIM_MODE_RIG_STAGE_CLASS;
  }

  rigToggleLabels.forEach((node) => {
    node.textContent = animModeViewportState.rigHidden ? 'SHOW' : 'HIDE';
  });
}

export function applyAnimModeSectionState(animModeSectionState, sectionKey) {
  const body = document.getElementById(`anim-mode-section-body-${sectionKey}`);
  const arrow = document.getElementById(`anim-mode-section-arrow-${sectionKey}`);
  if (!body || !arrow) return;

  const collapsed = !!animModeSectionState[sectionKey];
  body.classList.toggle('hidden', collapsed);
  arrow.innerHTML = collapsed ? '&#9654;' : '&#9660;';
}

export function syncAnimModeSectionStates(animModeSectionState) {
  ANIM_MODE_SECTION_KEYS.forEach((sectionKey) => applyAnimModeSectionState(animModeSectionState, sectionKey));
}

export function ensureAnimationModeLayout({
  animModeSectionState,
  animModeViewportState,
  resizeRigPreviewViewport,
}) {
  const workspace = document.getElementById('main-workspace');
  const viewport = document.getElementById('viewport');
  const previewSplit = document.getElementById('anim-mode-preview-split');
  const modelStage = document.getElementById('anim-mode-model-stage');
  const rigStage = document.getElementById('anim-mode-rig-stage');
  const rightPanel = document.getElementById('right-panel');
  const animPanel = document.getElementById('anim-mode-panel');
  const leftToggle = document.getElementById('toggle-left');
  const rigPanel = document.getElementById('anim-mode-rig-panel');
  const toolsHost = document.getElementById('anim-mode-tools-panel');
  const referenceHost = document.getElementById('anim-mode-section-body-reference');
  const poseHost = document.getElementById('anim-mode-section-body-pose');
  const importHost = document.getElementById('anim-mode-section-body-import');
  const exportHost = document.getElementById('anim-mode-section-body-export');
  const timelineHost = document.getElementById('anim-mode-timeline-host');
  const editorHost = document.getElementById('anim-mode-editor-host');
  const timeline = document.getElementById('animation-timeline');
  const editor = document.getElementById('anim-mode-editor');
  const referenceVideo = document.getElementById('anim-mode-reference-video');
  const poseLibrary = document.getElementById('anim-mode-pose-library');
  const importPanel = document.getElementById('anim-mode-import-panel');
  const exportPanel = document.getElementById('anim-mode-export-panel');

  const centerAnchor = previewSplit || viewport;
  if (workspace && animPanel && leftToggle && animPanel.nextElementSibling !== leftToggle) {
    workspace.insertBefore(animPanel, leftToggle);
  }
  if (workspace && centerAnchor && leftToggle && leftToggle.nextElementSibling !== centerAnchor) {
    workspace.insertBefore(leftToggle, centerAnchor);
  }

  if (modelStage && viewport && viewport.parentElement !== modelStage) {
    modelStage.appendChild(viewport);
  }
  if (viewport) {
    viewport.className = ANIM_MODE_VIEWPORT_CLASS;
  }
  if (rigStage && rigPanel && rigPanel.parentElement !== rigStage) {
    rigStage.appendChild(rigPanel);
  }

  if (animPanel) {
    animPanel.className = ANIM_MODE_LEFT_PANEL_CLASS;
  }

  if (rightPanel) {
    rightPanel.className = ANIM_MODE_RIGHT_PANEL_CLASS;
    rightPanel.style.width = '24rem';
  }

  toolsHost?.classList.remove('panel-collapsed');

  if (referenceHost && referenceVideo && referenceVideo.parentElement !== referenceHost) {
    referenceHost.appendChild(referenceVideo);
  }
  if (poseHost && poseLibrary && poseLibrary.parentElement !== poseHost) {
    poseHost.appendChild(poseLibrary);
  }
  if (importHost && importPanel && importPanel.parentElement !== importHost) {
    importHost.appendChild(importPanel);
  }
  if (exportHost && exportPanel && exportPanel.parentElement !== exportHost) {
    exportHost.appendChild(exportPanel);
  }

  if (timelineHost && timeline && timeline.parentElement !== timelineHost) {
    timelineHost.appendChild(timeline);
  }
  if (editorHost && editor && editor.parentElement !== editorHost) {
    editorHost.appendChild(editor);
  }

  if (timeline) {
    timeline.className = 'hidden bg-black/90 border-2 border-[#ffcc00] rounded px-4 py-3 flex flex-wrap items-center gap-3 text-[10px] font-mono w-full';
  }
  if (editor) {
    editor.className = 'bg-black/90 border-2 border-[#00d0ff] rounded p-4 flex flex-col gap-4 w-full';
  }
  if (referenceVideo) {
    referenceVideo.className = 'space-y-3';
  }
  if (poseLibrary) {
    poseLibrary.className = 'space-y-3';
  }
  if (importPanel) {
    importPanel.className = 'space-y-3';
  }
  if (exportPanel) {
    exportPanel.className = 'space-y-2';
  }
  if (previewSplit) {
    previewSplit.className = ANIM_MODE_SPLIT_HIDDEN_CLASS;
  }
  if (modelStage) {
    modelStage.className = ANIM_MODE_MODEL_STAGE_CLASS;
  }
  if (rigStage) {
    rigStage.className = ANIM_MODE_RIG_STAGE_HIDDEN_CLASS;
  }
  if (rigPanel) {
    rigPanel.className = 'hidden h-full w-full bg-black/90 border-2 border-[#00ff88] rounded overflow-hidden flex flex-col min-h-0';
  }
  const rigSectionBody = document.getElementById('anim-mode-section-body-rig');
  if (rigSectionBody) {
    rigSectionBody.className = 'flex-1 min-h-0 p-3 flex flex-col gap-3';
  }
  const rigViewport = document.getElementById('anim-mode-rig-viewport');
  if (rigViewport) {
    rigViewport.className = 'relative flex-1 min-h-[16rem] bg-zinc-950 border border-[#00ff88]/40 overflow-hidden rounded';
  }

  syncAnimModeSectionStates(animModeSectionState);
  syncAnimModeSplitClasses(animModeViewportState);
  scheduleAnimModeLayoutResize(resizeRigPreviewViewport);
}

export function restoreDefaultAnimationModeLayout() {
  const workspace = document.getElementById('main-workspace');
  const viewport = document.getElementById('viewport');
  const previewSplit = document.getElementById('anim-mode-preview-split');
  const toggleRight = document.getElementById('toggle-right');
  const rightPanel = document.getElementById('right-panel');
  const rigPanel = document.getElementById('anim-mode-rig-panel');
  const toolsHost = document.getElementById('anim-mode-tools-panel');
  const rigStage = document.getElementById('anim-mode-rig-stage');

  if (workspace && viewport && toggleRight && viewport.parentElement !== workspace) {
    workspace.insertBefore(viewport, toggleRight);
  }
  if (viewport) {
    viewport.className = DEFAULT_VIEWPORT_CLASS;
  }
  if (rightPanel && rigPanel && rigPanel.parentElement !== rightPanel) {
    rightPanel.insertBefore(rigPanel, toolsHost || rightPanel.firstChild || null);
  }
  if (previewSplit) {
    previewSplit.classList.add('hidden');
  }
  if (rigStage) {
    rigStage.classList.add('hidden');
  }
  if (rightPanel) {
    rightPanel.className = DEFAULT_RIGHT_PANEL_CLASS;
    rightPanel.style.width = '';
  }
}
