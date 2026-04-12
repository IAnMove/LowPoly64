// Prompt Generator UI — modal for generating LLM prompts for models and skeletons
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import {
  generateCharacterPrompt, getPromptSkeletons, getPromptProfiles,
  generateSkeletonPrompt as buildSkeletonPrompt, getArchetypeOptions, getPromptMoldsForSkeleton,
} from './prompt-generator.js';

function fillPromptMoldSelect(skeletonId) {
  const moldSelect = document.getElementById('prompt-mold-select');
  if (!moldSelect) return;
  const previousValue = moldSelect.value;
  moldSelect.innerHTML = '';

  const autoOption = document.createElement('option');
  autoOption.value = '';
  autoOption.textContent = 'AUTO / SIN PREFERENCIA';
  moldSelect.appendChild(autoOption);

  getPromptMoldsForSkeleton(skeletonId).forEach((mold) => {
    const opt = document.createElement('option');
    opt.value = mold.id;
    opt.textContent = `${mold.id} - ${mold.name}`;
    moldSelect.appendChild(opt);
  });

  moldSelect.value = Array.from(moldSelect.options).some((option) => option.value === previousValue) ? previousValue : '';
  moldSelect.disabled = moldSelect.options.length <= 1;
}

function upsertPreferredMoldHint(description, moldId) {
  const clean = (description || '')
    .replace(/\n?\[MOLDE_BASE_PREFERIDO:[^\]]+\]\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!moldId) return clean;
  const hint = `[MOLDE_BASE_PREFERIDO: ${moldId}]`;
  return clean ? `${clean}\n\n${hint}` : hint;
}

export function openPromptModal() {
  const modal = document.getElementById('prompt-modal');
  if (!modal) return;
  const skelSelect = document.getElementById('prompt-skeleton-select');
  skelSelect.innerHTML = '';
  getPromptSkeletons().forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    skelSelect.appendChild(opt);
  });
  onPromptSkeletonChange();
  const archSelect = document.getElementById('prompt-archetype-select');
  archSelect.innerHTML = '';
  getArchetypeOptions().forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.id;
    archSelect.appendChild(opt);
  });
  const out = document.getElementById('prompt-output-section');
  if (out) out.classList.add('hidden');
  switchPromptTab('model');
  modal.classList.remove('hidden');
}

export function closePromptModal() {
  document.getElementById('prompt-modal')?.classList.add('hidden');
}

export function switchPromptTab(tab) {
  const isModel = tab === 'model';
  document.getElementById('prompt-tab-model').classList.toggle('hidden', !isModel);
  document.getElementById('prompt-tab-skeleton').classList.toggle('hidden', isModel);
  document.getElementById('prompt-tab-btn-model').className = isModel
    ? 'px-4 py-2 text-[9px] tracking-widest border-r border-[#ff00ff]/20 bg-[#ff00ff] text-black'
    : 'px-4 py-2 text-[9px] tracking-widest border-r border-[#ff00ff]/20 text-zinc-400 hover:text-white';
  document.getElementById('prompt-tab-btn-skeleton').className = !isModel
    ? 'px-4 py-2 text-[9px] tracking-widest bg-[#ff00ff] text-black'
    : 'px-4 py-2 text-[9px] tracking-widest text-zinc-400 hover:text-white';
  const out = document.getElementById('prompt-output-section');
  if (out) out.classList.add('hidden');
}

export function onPromptSkeletonChange() {
  const skeletonId = document.getElementById('prompt-skeleton-select')?.value;
  if (!skeletonId) return;
  const profileSelect = document.getElementById('prompt-profile-select');
  profileSelect.innerHTML = '';
  getPromptProfiles(skeletonId).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    profileSelect.appendChild(opt);
  });
  fillPromptMoldSelect(skeletonId);
}

export function onPromptArchetypeChange() {
  const isNew = document.getElementById('prompt-new-archetype')?.checked;
  const nameInput = document.getElementById('prompt-new-archetype-name');
  const archSelect = document.getElementById('prompt-archetype-select');
  if (nameInput) nameInput.classList.toggle('hidden', !isNew);
  if (archSelect) archSelect.disabled = !!isNew;
}

export function generateModelPrompt() {
  const skeletonId = document.getElementById('prompt-skeleton-select')?.value;
  const profileId = document.getElementById('prompt-profile-select')?.value;
  const description = document.getElementById('prompt-description')?.value?.trim();
  const preferredMold = document.getElementById('prompt-mold-select')?.value || '';
  const prompt = generateCharacterPrompt(skeletonId, profileId, description, { preferredMold });
  const output = document.getElementById('prompt-output');
  if (output) output.value = prompt;
  document.getElementById('prompt-hint-model')?.classList.remove('hidden');
  document.getElementById('prompt-hint-skeleton')?.classList.add('hidden');
  const section = document.getElementById('prompt-output-section');
  if (section) section.classList.remove('hidden');
}

export function promptApplyMoldHint() {
  const moldId = document.getElementById('prompt-mold-select')?.value || '';
  const descriptionEl = document.getElementById('prompt-description');
  if (!descriptionEl) return;
  descriptionEl.value = upsertPreferredMoldHint(descriptionEl.value, moldId);
  descriptionEl.focus();
  descriptionEl.setSelectionRange(descriptionEl.value.length, descriptionEl.value.length);
  showToast(moldId ? `Molde base sugerido: ${moldId}` : 'Preferencia de molde eliminada');
}

export function generateSkeletonPrompt() {
  const isNew = document.getElementById('prompt-new-archetype')?.checked;
  const archetypeId = document.getElementById('prompt-archetype-select')?.value;
  const newName = document.getElementById('prompt-new-archetype-name')?.value?.trim();
  const description = document.getElementById('prompt-skeleton-description')?.value?.trim();
  const prompt = buildSkeletonPrompt(archetypeId, isNew, newName, description);
  const output = document.getElementById('prompt-output');
  if (output) output.value = prompt;
  document.getElementById('prompt-hint-model')?.classList.add('hidden');
  document.getElementById('prompt-hint-skeleton')?.classList.remove('hidden');
  const section = document.getElementById('prompt-output-section');
  if (section) section.classList.remove('hidden');
}

export function copyPrompt() {
  const output = document.getElementById('prompt-output');
  if (!output) return;
  navigator.clipboard.writeText(output.value).then(() => {
    showToast(t('jsonCopied'));
  }).catch(() => {
    output.select();
    document.execCommand('copy');
  });
}
