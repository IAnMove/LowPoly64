// Prompt Generator UI — modal for generating LLM prompts for models and skeletons
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import {
  generateCharacterPrompt, getPromptSkeletons, getPromptProfiles,
  generateSkeletonPrompt as buildSkeletonPrompt, getArchetypeOptions,
} from './prompt-generator.js';

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
  const prompt = generateCharacterPrompt(skeletonId, profileId, description);
  const output = document.getElementById('prompt-output');
  if (output) output.value = prompt;
  document.getElementById('prompt-hint-model')?.classList.remove('hidden');
  document.getElementById('prompt-hint-skeleton')?.classList.add('hidden');
  const section = document.getElementById('prompt-output-section');
  if (section) section.classList.remove('hidden');
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
