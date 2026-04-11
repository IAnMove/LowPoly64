// Injects animation-domain HTML: anim-mode banner, prompt modal, assign-rig modal, rig-panel modal, import modal

export function injectAnimationHTML() {
  const container = document.createElement('div');
  container.id = 'animation-html-root';
  container.innerHTML = `
    <div id="anim-mode-banner" class="hidden fixed bottom-0 left-0 right-0 h-7 bg-[#00ff88] text-black text-[10px] font-bold flex items-center justify-center z-40 tracking-widest" style="font-family: 'Press Start 2P', monospace;">
        <span data-i18n="animModeBanner">ANIMATION MODE — </span><span id="anim-mode-banner-name" class="ml-2"></span>
        <button onclick="exitAnimationMode()" data-i18n="escBack" class="ml-6 bg-black text-[#00ff88] px-3 py-0.5 text-[10px]">ESC: BACK</button>
    </div>

    <!-- Prompt Generator Modal -->
    <div id="prompt-modal" class="hidden fixed inset-0 bg-black/90 z-50 flex items-center justify-center" style="font-family: 'Press Start 2P', monospace;">
        <div class="bg-zinc-900 border-4 border-[#ff00ff] w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b-2 border-[#ff00ff]/40 shrink-0">
                <h3 class="text-[#ff00ff] text-xs tracking-widest" data-i18n="promptGenTitle">GENERADOR DE PROMPT PARA LLM</h3>
                <button onclick="closePromptModal()" class="text-zinc-400 hover:text-white text-sm px-2">\u2715</button>
            </div>
            <div class="flex border-b-2 border-[#ff00ff]/30 shrink-0">
                <button id="prompt-tab-btn-model" onclick="switchPromptTab('model')" class="px-4 py-2 text-[9px] tracking-widest border-r border-[#ff00ff]/20 bg-[#ff00ff] text-black" data-i18n="promptTabModel">MODELO (CM)</button>
                <button id="prompt-tab-btn-skeleton" onclick="switchPromptTab('skeleton')" class="px-4 py-2 text-[9px] tracking-widest text-zinc-400 hover:text-white" data-i18n="promptTabSkeleton">ESQUELETO / RIG</button>
            </div>
            <div class="flex flex-col gap-3 p-4 overflow-y-auto flex-1">
                <div id="prompt-tab-model">
                    <div class="flex gap-3 mb-3">
                        <div class="flex-1">
                            <label class="block text-zinc-400 text-[9px] mb-1" data-i18n="promptSkeleton">ESQUELETO / ARQUETIPO</label>
                            <select id="prompt-skeleton-select" onchange="onPromptSkeletonChange()" class="w-full bg-zinc-800 border border-[#ff00ff] text-white text-[10px] px-2 py-1 font-mono"></select>
                        </div>
                        <div class="flex-1">
                            <label class="block text-zinc-400 text-[9px] mb-1" data-i18n="promptProfile">PERFIL DE ANIMACI\u00d3N</label>
                            <select id="prompt-profile-select" class="w-full bg-zinc-800 border border-[#ff00ff] text-white text-[10px] px-2 py-1 font-mono"></select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="block text-zinc-400 text-[9px] mb-1" data-i18n="promptDescription">DESCRIPCI\u00d3N DEL PERSONAJE</label>
                        <textarea id="prompt-description" rows="3" class="w-full bg-zinc-800 border border-[#ff00ff]/60 text-white text-[10px] p-2 font-mono resize-none focus:outline-none" placeholder="Ej: Un caballero con armadura oscura, escudo redondo plateado y espada corta."></textarea>
                    </div>
                    <button onclick="generateModelPrompt()" class="retro-button w-full bg-[#ff00ff] text-black py-2 text-[10px] font-bold border-2 border-[#ff00ff]" data-i18n="promptGenerate">GENERAR PROMPT</button>
                </div>
                <div id="prompt-tab-skeleton" class="hidden">
                    <div class="flex gap-3 mb-3">
                        <div class="flex-1">
                            <label class="block text-zinc-400 text-[9px] mb-1" data-i18n="promptArchetype">ARQUETIPO BASE</label>
                            <select id="prompt-archetype-select" onchange="onPromptArchetypeChange()" class="w-full bg-zinc-800 border border-[#ff00ff] text-white text-[10px] px-2 py-1 font-mono"></select>
                        </div>
                        <div class="flex-1 flex flex-col justify-end">
                            <label class="flex items-center gap-2 cursor-pointer mb-1">
                                <input type="checkbox" id="prompt-new-archetype" onchange="onPromptArchetypeChange()" class="accent-[#ff00ff]">
                                <span class="text-zinc-400 text-[9px]" data-i18n="promptNewArchetype">ARQUETIPO NUEVO</span>
                            </label>
                            <input id="prompt-new-archetype-name" type="text" placeholder="NOMBRE_NUEVO" class="hidden w-full bg-zinc-800 border border-[#ff00ff]/60 text-white text-[10px] px-2 py-1 font-mono focus:outline-none uppercase">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="block text-zinc-400 text-[9px] mb-1" data-i18n="promptSkeletonDesc">DESCRIPCI\u00d3N DE LA CRIATURA / OBJETO</label>
                        <textarea id="prompt-skeleton-description" rows="3" class="w-full bg-zinc-800 border border-[#ff00ff]/60 text-white text-[10px] p-2 font-mono resize-none focus:outline-none" placeholder="Ej: Un perro cuadr\u00fapedo con cola larga y orejas ca\u00eddas. Animaciones: idle, walk, run, bark."></textarea>
                    </div>
                    <div class="bg-zinc-800/50 border border-zinc-700 p-2 mb-3 text-[9px] text-zinc-400 leading-relaxed">
                        <span data-i18n="promptSkeletonHint">El LLM generar\u00e1 el JSON completo del esqueleto: bones, jerarqu\u00eda, bindings y animaciones. Gu\u00e1rdalo en </span><span class="text-[#ffcc00]">src/data/skeletons/</span><span data-i18n="promptSkeletonHint2"> y haz rebuild.</span>
                    </div>
                    <button onclick="generateSkeletonPrompt()" class="retro-button w-full bg-[#ff00ff] text-black py-2 text-[10px] font-bold border-2 border-[#ff00ff]" data-i18n="promptGenerate">GENERAR PROMPT</button>
                </div>
                <div id="prompt-output-section" class="hidden flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <label class="text-zinc-400 text-[9px]" data-i18n="promptResult">PROMPT GENERADO \u2014 pega esto en tu LLM</label>
                        <button onclick="copyPrompt()" class="retro-button bg-zinc-800 border border-[#ff00ff] text-[#ff00ff] px-3 py-1 text-[9px]" data-i18n="promptCopy">COPIAR</button>
                    </div>
                    <textarea id="prompt-output" rows="14" readonly class="w-full bg-zinc-950 border border-[#ff00ff]/30 text-zinc-300 text-[9px] p-2 font-mono resize-none focus:outline-none leading-relaxed"></textarea>
                    <div id="prompt-hint-model" class="text-zinc-500 text-[9px] leading-relaxed">
                        <span data-i18n="promptHowTo">Pega el JSON que devuelva el LLM en </span><span class="text-[#ffcc00]">IMPORT JSON</span><span data-i18n="promptHowTo2"> para a\u00f1adirlo a la escena con rig y animaciones ya vinculadas.</span>
                    </div>
                    <div id="prompt-hint-skeleton" class="hidden text-zinc-500 text-[9px] leading-relaxed">
                        <span data-i18n="promptSkeletonSaveHint">Guarda el JSON en </span><span class="text-[#ffcc00]">src/data/skeletons/</span><span data-i18n="promptSkeletonSaveHint2">. Si es arquetipo nuevo, actualiza tambi\u00e9n </span><span class="text-[#ffcc00]">archetype-system.js</span><span data-i18n="promptSkeletonSaveHint3"> y crea el perfil de animaci\u00f3n.</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Import JSON Modal -->
    <div id="import-modal" class="hidden fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div class="bg-zinc-900 border-4 border-[#ffcc00] p-6 w-[600px] max-h-[80vh] flex flex-col overflow-y-auto" style="font-family: 'Press Start 2P', monospace;">
            <h3 data-i18n="importObjectTitle" class="text-[#ffcc00] text-sm mb-4 tracking-widest">IMPORT OBJECT JSON</h3>
            <p data-i18n="importHint" class="text-zinc-400 text-[10px] mb-3">Paste here the JSON generated by an LLM (see ask.md for the prompt)</p>
            <textarea id="import-json-textarea" class="w-full h-48 bg-zinc-800 border-2 border-[#ffcc00] p-3 font-mono text-white text-xs resize-none focus:outline-none mb-2" placeholder='{ "name": "Mi Objeto", "pieces": [...] }'></textarea>
            <p id="import-error" class="text-red-400 text-[10px] mb-3 min-h-[1em]"></p>
            <div class="flex gap-3 mb-4">
                <button onclick="handleImportSubmit()" data-i18n="importObject" class="flex-1 retro-button bg-[#00ff88] text-black py-3 text-xs font-bold border-2 border-[#00ff88]">IMPORT OBJECT</button>
                <label class="flex-1 retro-button bg-zinc-800 text-[#ffcc00] py-3 text-xs text-center cursor-pointer border-2 border-[#ffcc00]">
                    <span data-i18n="loadJsonFile">LOAD .JSON</span>
                    <input type="file" accept=".json" class="hidden" onchange="handleImportFile(event)">
                </label>
                <button onclick="closeImportModal()" data-i18n="cancel" class="flex-1 retro-button bg-zinc-800 text-zinc-400 py-3 text-xs border-2 border-zinc-600">CANCEL</button>
            </div>
            <div class="border-t-2 border-[#ffcc00]/30 pt-4">
                <h4 class="text-[#ff00ff] text-[10px] mb-1 tracking-widest" data-i18n="importArchetypeTitle">IMPORT SKELETON / ANIMATION PROFILE</h4>
                <p class="text-zinc-500 text-[9px] mb-2 leading-relaxed" data-i18n="importArchetypeHint">Paste a skeleton JSON (with "bones") or an animation profile JSON (with "skeletonId"). Use PROMPT LLM to generate them.</p>
                <textarea id="import-archetype-textarea" class="w-full h-28 bg-zinc-800 border-2 border-[#ff00ff]/60 p-3 font-mono text-white text-xs resize-none focus:outline-none mb-2" placeholder='{ "id": "MY_SKELETON", "archetype": "HUMANOID", "bones": [...], "animations": [...] }'></textarea>
                <p id="import-archetype-error" class="text-red-400 text-[9px] mb-2 min-h-[1em]"></p>
                <div class="flex gap-2">
                    <button onclick="handleArchetypeImportSubmit()" class="retro-button bg-[#ff00ff] text-black py-2 px-4 text-[10px] font-bold border-2 border-[#ff00ff]" data-i18n="importArchetype">IMPORT</button>
                    <label class="retro-button bg-zinc-800 text-[#ff00ff] py-2 px-4 text-[10px] text-center cursor-pointer border-2 border-[#ff00ff]/60">
                        <span data-i18n="loadJsonFile">LOAD .JSON</span>
                        <input type="file" accept=".json" class="hidden" onchange="handleArchetypeImportFile(event)">
                    </label>
                </div>
            </div>
        </div>
    </div>

    <!-- Assign Rig Modal -->
    <div id="assign-rig-modal" class="hidden fixed inset-0 bg-black/80 z-[60] flex items-center justify-center" style="font-family: 'Press Start 2P', monospace;">
        <div class="bg-zinc-900 border-4 border-[#ff00ff] p-6 w-[460px]">
            <h3 class="text-[#ff00ff] text-xs mb-3 tracking-widest" data-i18n="assignRigTitle">ASIGNAR RIG AL MODELO</h3>
            <p class="text-zinc-400 text-[9px] mb-4 leading-relaxed" data-i18n="assignRigHint">Elige el arquetipo y esqueleto que animar\u00e1n este modelo. Despu\u00e9s podr\u00e1s vincular cada pieza del modelo a sus slots y bones.</p>
            <div class="flex gap-3 mb-4">
                <div class="flex-1">
                    <label class="block text-zinc-400 text-[9px] mb-1" data-i18n="assignRigArchetype">ARQUETIPO</label>
                    <select id="assign-rig-archetype" onchange="onAssignRigArchetypeChange()" class="w-full bg-zinc-800 border border-[#ff00ff] text-white text-[10px] px-2 py-1 font-mono"></select>
                </div>
                <div class="flex-1">
                    <label class="block text-zinc-400 text-[9px] mb-1" data-i18n="assignRigSkeleton">ESQUELETO</label>
                    <select id="assign-rig-skeleton" class="w-full bg-zinc-800 border border-[#ff00ff] text-white text-[10px] px-2 py-1 font-mono"></select>
                </div>
            </div>
            <div class="flex gap-3">
                <button onclick="confirmAssignRig()" class="flex-1 retro-button bg-[#ff00ff] text-black py-2 text-[10px] font-bold border-2 border-[#ff00ff]" data-i18n="assignRigConfirm">ASIGNAR Y ABRIR RIG</button>
                <button onclick="document.getElementById('assign-rig-modal').classList.add('hidden')" class="retro-button bg-zinc-800 text-zinc-400 py-2 px-4 text-[10px] border-2 border-zinc-600" data-i18n="cancel">CANCELAR</button>
            </div>
        </div>
    </div>

    <!-- Rig / Animations Modal -->
    <div id="rig-panel-modal" class="hidden fixed inset-0 bg-black/90 z-50 flex flex-col" style="font-family: 'Press Start 2P', monospace;">
        <div class="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b-2 border-[#ffcc00]">
            <div class="flex items-center gap-3">
                <h3 class="text-[#ffcc00] text-xs tracking-widest" data-i18n="rigAnimations">RIG / ANIMATIONS</h3>
                <span id="rig-archetype-label" class="text-[#ff00ff] text-[9px] bg-zinc-800 px-2 py-0.5 rounded"></span>
            </div>
            <div class="flex items-center gap-3">
                <label class="text-zinc-400 text-[10px]" data-i18n="rigSkeleton">Skeleton</label>
                <select id="rig-skeleton-select" class="bg-zinc-800 border border-[#ffcc00] text-white text-[10px] px-2 py-1 font-mono"></select>
                <button onclick="closeRigPanel()" class="text-zinc-400 hover:text-white text-xs px-3 py-1 border border-zinc-600" data-i18n="rigClose">Close</button>
            </div>
        </div>
        <div class="flex flex-1 overflow-hidden">
            <div class="flex-1 flex flex-col border-r border-zinc-700">
                <div class="text-center text-zinc-500 text-[10px] py-1 bg-zinc-900" data-i18n="rigModel">Model</div>
                <div id="rig-model-viewport" class="flex-1 relative">
                    <canvas id="rig-model-canvas"></canvas>
                </div>
            </div>
            <div class="flex-1 flex flex-col">
                <div class="text-center text-zinc-500 text-[10px] py-1 bg-zinc-900" data-i18n="rigBones">Bones</div>
                <div id="rig-skeleton-viewport" class="flex-1 relative">
                    <canvas id="rig-skeleton-canvas"></canvas>
                </div>
            </div>
        </div>
        <div class="flex bg-zinc-900 border-t-2 border-[#ffcc00]" style="height: 200px; min-height: 200px;">
            <div class="flex-1 overflow-y-auto border-r border-zinc-700 p-2">
                <h4 class="text-[#ffcc00] text-[10px] mb-2" data-i18n="rigBindings">Bindings</h4>
                <div id="rig-binding-table" class="space-y-1 text-[10px]"></div>
            </div>
            <div class="flex-1 overflow-y-auto p-2">
                <h4 class="text-[#ffcc00] text-[10px] mb-2" data-i18n="rigAnimList">Animations</h4>
                <div id="rig-anim-list" class="space-y-1 text-[10px]"></div>
                <div id="rig-anim-controls" class="mt-2 flex gap-2 hidden">
                    <button id="rig-play-btn" onclick="rigTogglePlay()" class="retro-button bg-zinc-800 text-[#00ff88] px-3 py-1 text-[10px] border border-[#00ff88]" data-i18n="rigPlay">Play</button>
                    <button onclick="rigStopAnim()" class="retro-button bg-zinc-800 text-red-400 px-3 py-1 text-[10px] border border-red-400" data-i18n="rigStop">Stop</button>
                    <div class="flex-1 bg-zinc-800 rounded overflow-hidden h-4 mt-0.5">
                        <div id="rig-anim-progress" class="h-full bg-[#ffcc00]" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;
  document.body.appendChild(container);
}
