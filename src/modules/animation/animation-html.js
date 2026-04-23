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
                        <label class="block text-zinc-400 text-[9px] mb-1">MOLDE BASE</label>
                        <div class="flex gap-2">
                            <select id="prompt-mold-select" class="flex-1 bg-zinc-800 border border-[#ff00ff]/60 text-white text-[10px] px-2 py-1 font-mono">
                                <option value="">AUTO / SIN PREFERENCIA</option>
                            </select>
                            <button onclick="promptApplyMoldHint()" class="retro-button bg-zinc-800 border border-[#ff00ff] text-[#ff00ff] px-3 py-1 text-[9px]">USAR</button>
                        </div>
                        <p class="text-zinc-500 text-[8px] mt-2 leading-relaxed">Inserta una preferencia de molde base en la descripción para que el LLM parta de una topología existente del repo.</p>
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
                <div class="flex items-center justify-between gap-2 mb-2">
                    <h4 class="text-[#ffcc00] text-[10px]" data-i18n="rigBindings">Bindings</h4>
                    <button onclick="rigAutoBind()" class="retro-button bg-zinc-800 text-[#ff00ff] px-2 py-1 text-[9px] border border-[#ff00ff]" data-i18n="rigAutoBind">AUTO BIND</button>
                </div>
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

    <!-- Motion Ripper Modal -->
    <div id="motion-ripper-modal" class="hidden fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" style="font-family: 'Press Start 2P', monospace;">
        <div class="w-full max-w-[1200px] h-[92vh] bg-zinc-950 border-4 border-[#00d0ff] grid grid-cols-[320px,minmax(0,1fr)] overflow-hidden">
            <aside class="border-r-2 border-[#00d0ff]/40 p-4 min-h-0 overflow-hidden">
                <div class="h-full overflow-y-auto pr-1">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <h3 class="text-[#00d0ff] text-xs tracking-widest mb-2">MOTION RIPPER</h3>
                        <p class="text-zinc-400 text-[9px] leading-relaxed">Comparte la pestaña o ventana donde se reproduce YouTube, deja que MediaPipe siga el cuerpo y vuelca la animación directamente al grupo seleccionado.</p>
                    </div>
                    <button onclick="closeMotionRipperModal()" class="text-zinc-400 hover:text-white text-sm px-2">✕</button>
                </div>

                <div class="mb-4 border border-zinc-700 bg-zinc-900/70 p-3">
                    <div class="text-zinc-500 text-[8px] mb-1">TARGET</div>
                    <div id="motion-ripper-target-label" class="text-[#ffcc00] text-[10px] break-all">GROUP</div>
                </div>

                <div class="flex flex-col gap-2 mb-4">
                    <button id="motion-ripper-share-btn" onclick="motionRipperShareScreen()" class="retro-button bg-[#00d0ff] text-black py-2 text-[10px] font-bold border-2 border-[#00d0ff]">SHARE SCREEN / WINDOW</button>
                    <div class="mb-3 border border-zinc-700 bg-zinc-900 px-3 py-2">
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="text-zinc-400 text-[8px]">SOURCE FACING</span>
                        </div>
                        <select id="motion-ripper-capture-facing" class="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-[8px] px-2 py-2">
                            <option value="front">FRONT TO CAMERA</option>
                            <option value="back">BACK TO CAMERA</option>
                            <option value="left">FACING SCREEN-LEFT</option>
                            <option value="right">FACING SCREEN-RIGHT</option>
                        </select>
                        <p id="motion-ripper-capture-facing-hint" class="text-[8px] leading-relaxed text-zinc-500 mt-1">Usa esto si la persona empieza de espaldas o de lado. Solo corrige la direccion del desplazamiento del root.</p>
                    </div>
                    <div class="mb-3 border border-zinc-700 bg-zinc-900 px-3 py-2">
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="text-zinc-400 text-[8px]">LOWER BODY</span>
                            <span id="motion-ripper-body-mode-badge" class="hidden text-[8px] text-amber-200 border border-amber-400/60 px-2 py-1 bg-amber-500/10">MEDIO CUERPO DETECTADO</span>
                        </div>
                        <label class="flex items-start gap-2">
                            <input id="motion-ripper-freeze-lower-body" type="checkbox" class="accent-[#00d0ff] mt-0.5">
                            <span class="text-zinc-400 text-[8px] leading-relaxed">Congelar piernas en idle si el clip corta el cuerpo o si el tracking inferior mete ruido.</span>
                        </label>
                        <p id="motion-ripper-freeze-lower-body-hint" class="text-[8px] leading-relaxed text-zinc-500 mt-1">Si el video es torso-arriba, esta opcion evita importar piernas temblorosas.</p>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <button id="motion-ripper-stop-share-btn" onclick="motionRipperStopShare()" class="retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600">STOP SHARE</button>
                        <button id="motion-ripper-neutral-btn" onclick="motionRipperCaptureNeutral()" class="retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600">SET NEUTRAL</button>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button id="motion-ripper-select-area-btn" onclick="motionRipperToggleAreaSelection()" class="retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600">SELECT AREA</button>
                        <button id="motion-ripper-reset-area-btn" onclick="motionRipperResetArea()" class="retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600">RESET AREA</button>
                    </div>
                    <p id="motion-ripper-area-label" class="text-[8px] leading-relaxed text-zinc-500">Capture area: full frame.</p>
                </div>

                <div class="border border-zinc-700 bg-zinc-900/70 p-3 mb-4">
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <span class="text-[#00d0ff] text-[9px] tracking-widest">RECORDING</span>
                        <span id="motion-ripper-recording-badge" class="text-[8px] text-[#00ff88] border border-[#00ff88]/50 px-2 py-1">IDLE</span>
                    </div>

                    <label class="block mb-3">
                        <span class="block text-zinc-400 text-[8px] mb-1">ANIMATION NAME</span>
                        <input id="motion-ripper-name" type="text" class="w-full bg-zinc-800 border border-[#00d0ff] text-white text-[10px] px-2 py-2 font-mono focus:outline-none" placeholder="youtube-rip">
                    </label>

                    <div class="grid grid-cols-[1fr,88px] gap-3 mb-3">
                        <label class="block">
                            <span class="block text-zinc-400 text-[8px] mb-1">POSE SMOOTHING</span>
                            <input id="motion-ripper-smoothing" oninput="motionRipperUpdateSmoothingLabel()" type="range" min="0" max="0.85" step="0.05" value="0.55" class="w-full accent-[#00d0ff]">
                            <span id="motion-ripper-smoothing-value" class="text-[8px] text-[#00d0ff]">0.55</span>
                        </label>
                        <label class="block">
                            <span class="block text-zinc-400 text-[8px] mb-1">FPS</span>
                            <select id="motion-ripper-sample-rate" class="w-full bg-zinc-800 border border-[#00d0ff] text-white text-[10px] px-2 py-2 font-mono">
                                <option value="10">10</option>
                                <option value="5">5</option>
                            </select>
                        </label>
                    </div>

                    <label class="flex items-start gap-2 border border-zinc-700 bg-zinc-900 px-3 py-2 mb-3">
                        <input id="motion-ripper-root-motion" type="checkbox" checked class="accent-[#00d0ff] mt-0.5">
                        <span class="text-zinc-400 text-[8px] leading-relaxed">Track root motion. Si el desplazamiento queda inestable, desactívalo y captura solo el gesto corporal.</span>
                    </label>

                    <div class="grid grid-cols-2 gap-2">
                        <button id="motion-ripper-record-btn" onclick="motionRipperToggleRecording()" class="retro-button bg-[#00ff88] text-black py-2 text-[9px] font-bold border-2 border-[#00ff88]">START RECORD</button>
                        <button id="motion-ripper-clear-btn" onclick="motionRipperClearCapture()" class="retro-button bg-zinc-800 text-zinc-300 py-2 text-[9px] border border-zinc-600">CLEAR</button>
                        <button id="motion-ripper-import-btn" onclick="motionRipperImportCapture()" class="col-span-2 retro-button bg-[#ffcc00] text-black py-2 text-[9px] font-bold border-2 border-[#ffcc00]">IMPORT INTO CURRENT MODEL</button>
                        <button id="motion-ripper-export-debug-btn" onclick="motionRipperExportDebugJsons()" class="col-span-2 retro-button bg-zinc-800 text-[#00d0ff] py-2 text-[9px] border border-[#00d0ff]/60">EXPORT DEBUG JSONS</button>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-4">
                    <div class="bg-zinc-900 border border-zinc-700 p-2">
                        <div class="text-zinc-500 text-[8px] mb-1">TRACKED</div>
                        <div id="motion-ripper-tracked-state" class="text-white text-[10px]">WAITING</div>
                    </div>
                    <div class="bg-zinc-900 border border-zinc-700 p-2">
                        <div class="text-zinc-500 text-[8px] mb-1">CONFIDENCE</div>
                        <div id="motion-ripper-confidence-value" class="text-white text-[10px]">0%</div>
                    </div>
                    <div class="bg-zinc-900 border border-zinc-700 p-2">
                        <div class="text-zinc-500 text-[8px] mb-1">KEYFRAMES</div>
                        <div id="motion-ripper-frame-count" class="text-white text-[10px]">0</div>
                    </div>
                    <div class="bg-zinc-900 border border-zinc-700 p-2">
                        <div class="text-zinc-500 text-[8px] mb-1">LENGTH</div>
                        <div id="motion-ripper-duration-value" class="text-white text-[10px]">0.0s</div>
                    </div>
                </div>

                <div class="border border-zinc-700 bg-zinc-900/70 p-3 mb-4">
                    <div class="text-zinc-500 text-[8px] mb-1">STATUS</div>
                    <p id="motion-ripper-status-text" class="text-zinc-300 text-[10px] leading-relaxed">Loading MediaPipe...</p>
                </div>

                <div class="border border-zinc-700 bg-zinc-900/70 p-3">
                    <div class="text-[#00d0ff] text-[8px] mb-2 tracking-widest">CREDIT</div>
                    <p class="text-zinc-400 text-[8px] leading-relaxed">Esta integración adapta la idea de Motion Ripper del repositorio <span class="text-[#00d0ff]">Animateur</span>, creado por <span class="text-[#ffcc00]">ilatroce</span>, al formato de animación y rig de LowPoly64.</p>
                </div>
                </div>
            </aside>

            <div class="p-4 min-w-0 min-h-0 grid grid-rows-[minmax(0,1fr),300px] gap-4">
                <div class="min-h-0 flex flex-col">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <div>
                            <div class="text-[#00d0ff] text-[9px] tracking-widest">VIDEO FEED</div>
                            <p id="motion-ripper-edit-status" class="hidden text-zinc-500 text-[8px] leading-relaxed mt-1">Edit frame mode.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="motion-ripper-edit-frame-btn" onclick="motionRipperStartFrameEdit()" class="retro-button bg-zinc-800 text-[#00d0ff] py-2 px-3 text-[8px] border border-[#00d0ff]/60">EDIT FRAME</button>
                            <div id="motion-ripper-edit-toolbar" class="hidden items-center gap-2">
                                <button id="motion-ripper-edit-cancel-btn" onclick="motionRipperCancelFrameEdit()" class="retro-button bg-zinc-800 text-zinc-300 py-2 px-3 text-[8px] border border-zinc-600">CANCEL</button>
                                <button id="motion-ripper-edit-save-btn" onclick="motionRipperSaveFrameEdit()" class="retro-button bg-[#00ff88] text-black py-2 px-3 text-[8px] font-bold border-2 border-[#00ff88]">SAVE</button>
                            </div>
                        </div>
                    </div>
                    <div class="relative w-full flex-1 min-h-[280px] border-2 border-[#00d0ff]/40 bg-zinc-900 overflow-hidden">
                        <video id="motion-ripper-video" autoplay muted playsinline class="absolute inset-0 w-full h-full object-contain bg-zinc-950"></video>
                        <canvas id="motion-ripper-overlay" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>
                    </div>
                </div>

                <div class="min-h-0 flex flex-col">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <div>
                            <div class="text-[#00d0ff] text-[9px] tracking-widest">PREVIEW SPLIT</div>
                            <p id="motion-ripper-preview-status" class="text-zinc-500 text-[8px] leading-relaxed mt-1">Model, resolved rig and captured video rig. Compare all three before importing.</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <label class="text-[8px] leading-tight text-zinc-400 text-right">
                                <div class="text-zinc-500">PREVIEW SPEED</div>
                                <select id="motion-ripper-preview-speed" onchange="motionRipperUpdatePreviewSpeed()" class="mt-1 bg-zinc-800 border border-zinc-600 text-white text-[8px] px-2 py-1 font-mono">
                                    <option value="0.25">0.25x</option>
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1" selected>1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2">2x</option>
                                </select>
                            </label>
                            <div class="text-[8px] leading-tight text-zinc-400 text-right">
                                <div class="text-zinc-500">FRAME</div>
                                <div class="text-white"><span id="motion-ripper-preview-frame-current">0</span> / <span id="motion-ripper-preview-frame-total">0</span></div>
                            </div>
                            <button id="motion-ripper-preview-toggle-btn" onclick="motionRipperTogglePreviewPlayback()" class="retro-button bg-zinc-800 text-zinc-300 py-2 px-3 text-[8px] border border-zinc-600">PLAY PREVIEW</button>
                        </div>
                    </div>
                    <label class="mb-2 flex items-center gap-2 text-[8px] text-zinc-400">
                        <input id="motion-ripper-preview-import-speed" type="checkbox" class="accent-[#00d0ff]">
                        <span>Use preview speed on import</span>
                    </label>
                    <div class="mb-2 flex flex-wrap gap-2">
                        <button id="motion-ripper-prev-frame-btn" onclick="motionRipperPreviewPrevFrame()" class="retro-button bg-zinc-800 text-zinc-300 py-2 px-3 text-[8px] border border-zinc-600">PREV FRAME</button>
                        <button id="motion-ripper-next-frame-btn" onclick="motionRipperPreviewNextFrame()" class="retro-button bg-zinc-800 text-zinc-300 py-2 px-3 text-[8px] border border-zinc-600">NEXT FRAME</button>
                        <button id="motion-ripper-repair-frame-btn" onclick="motionRipperRepairCurrentFrame()" class="retro-button bg-zinc-800 text-[#00d0ff] py-2 px-3 text-[8px] border border-[#00d0ff]/60">REPAIR FRAME</button>
                        <button id="motion-ripper-delete-frame-btn" onclick="motionRipperDeleteCurrentFrame()" class="retro-button bg-zinc-800 text-rose-300 py-2 px-3 text-[8px] border border-rose-400/60">DELETE FRAME</button>
                    </div>
                    <div id="motion-ripper-preview-stage" class="relative flex-1 min-h-[220px] border-2 border-[#00d0ff]/40 bg-zinc-900 overflow-hidden">
                        <div class="absolute inset-0 grid grid-cols-3 gap-3 p-3">
                            <div id="motion-ripper-preview-model-stage" class="relative min-w-0 min-h-0 border border-zinc-700 bg-zinc-950 overflow-hidden">
                                <div class="absolute top-2 left-2 z-10 text-[7px] tracking-widest text-[#00d0ff] bg-black/70 px-2 py-1 border border-[#00d0ff]/30">MODEL</div>
                                <canvas id="motion-ripper-preview-model-canvas" class="absolute inset-0 w-full h-full block"></canvas>
                            </div>
                            <div id="motion-ripper-preview-rig-stage" class="relative min-w-0 min-h-0 border border-zinc-700 bg-zinc-950 overflow-hidden">
                                <div class="absolute top-2 left-2 z-10 text-[7px] tracking-widest text-[#00d0ff] bg-black/70 px-2 py-1 border border-[#00d0ff]/30">RIG</div>
                                <canvas id="motion-ripper-preview-rig-canvas" class="absolute inset-0 w-full h-full block"></canvas>
                            </div>
                            <div id="motion-ripper-preview-captured-stage" class="relative min-w-0 min-h-0 border border-zinc-700 bg-zinc-950 overflow-hidden">
                                <div class="absolute top-2 left-2 z-10 text-[7px] tracking-widest text-[#00d0ff] bg-black/70 px-2 py-1 border border-[#00d0ff]/30">CAPTURED RIG</div>
                                <canvas id="motion-ripper-preview-captured-canvas" class="absolute inset-0 w-full h-full block"></canvas>
                            </div>
                        </div>
                        <div id="motion-ripper-preview-empty" class="absolute inset-0 flex items-center justify-center text-zinc-600 text-[9px] text-center px-6 leading-relaxed pointer-events-none">Capture a take to preview it on the current model.</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;
  document.body.appendChild(container);
}
