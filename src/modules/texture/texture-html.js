// Injects texture-domain HTML: texture-editor modal, AI gen modal, prompt expand modal, config modal

export function injectTextureHTML() {
  const container = document.createElement('div');
  container.id = 'texture-html-root';
  container.innerHTML = `
    <!-- Texture Editor Modal -->
    <div id="texture-editor-modal" class="hidden fixed inset-0 bg-black/90 z-50 flex items-center justify-center" style="font-family: 'Press Start 2P', monospace;">
        <div class="bg-zinc-900 border-4 border-[#00ffcc] rounded max-w-[900px] w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div class="flex items-center justify-between px-5 py-3 border-b-2 border-[#00ffcc]/40">
                <h3 data-i18n="textureEditor" class="text-[#00ffcc] text-xs tracking-widest">TEXTURE EDITOR</h3>
                <button onclick="closeTextureEditor()" class="text-zinc-400 hover:text-white text-sm px-2">X</button>
            </div>
            <div class="flex flex-1 overflow-hidden min-h-0">
                <!-- Left: tools -->
                <div class="w-44 bg-zinc-950 border-r border-zinc-700 p-3 flex flex-col gap-3 overflow-y-auto shrink-0">
                    <div>
                        <label data-i18n="tool" class="text-zinc-500 text-[9px] block mb-1">TOOL</label>
                        <div class="flex gap-1">
                            <button id="tex-tool-brush" onclick="texSetTool('brush')" data-i18n="brush" class="flex-1 text-[10px] py-1 border border-[#00ffcc] bg-[#ffcc00] text-black">BRUSH</button>
                            <button id="tex-tool-eraser" onclick="texSetTool('eraser')" data-i18n="eraser" class="flex-1 text-[10px] py-1 border border-[#00ffcc] bg-zinc-800 text-white">ERASER</button>
                            <button id="tex-tool-uvmap" onclick="texSetTool('uvmap')" class="flex-1 text-[10px] py-1 border border-[#00ffcc] bg-zinc-800 text-white">UV MAP</button>
                        </div>
                    </div>
                    <div>
                        <label data-i18n="size" class="text-zinc-500 text-[9px] block mb-1">SIZE</label>
                        <div class="flex gap-1">
                            <button id="tex-size-0" onclick="texSetSize(0)" class="w-7 h-7 text-[10px] border border-[#00ffcc] bg-zinc-800">1</button>
                            <button id="tex-size-1" onclick="texSetSize(1)" class="w-7 h-7 text-[10px] border border-[#00ffcc] bg-zinc-800">2</button>
                            <button id="tex-size-2" onclick="texSetSize(2)" class="w-7 h-7 text-[10px] border border-[#00ffcc] bg-[#ffcc00] text-black">3</button>
                            <button id="tex-size-3" onclick="texSetSize(3)" class="w-7 h-7 text-[10px] border border-[#00ffcc] bg-zinc-800">4</button>
                            <button id="tex-size-4" onclick="texSetSize(4)" class="w-7 h-7 text-[10px] border border-[#00ffcc] bg-zinc-800">5</button>
                        </div>
                    </div>
                    <div>
                        <label data-i18n="color" class="text-zinc-500 text-[9px] block mb-1">COLOR</label>
                        <div id="tex-palette" class="flex flex-wrap gap-1 mb-2"></div>
                        <input type="color" id="tex-custom-color" value="#ff0000" class="w-full h-7 bg-transparent border border-[#00ffcc] cursor-pointer" onchange="texSetColor(this.value)">
                    </div>
                    <div>
                        <button onclick="openAIGenModal()" class="w-full text-[10px] py-2 border-2 border-[#aa00ff] bg-zinc-800 text-[#aa00ff] hover:bg-[#aa00ff] hover:text-white font-bold tracking-wider">\u2726 AI GENERATE</button>
                        <div id="tex-ai-model-small" class="text-zinc-600 text-[7px] text-center mt-1 leading-tight"></div>
                    </div>
                    <div class="flex flex-col gap-1 mt-auto">
                        <button onclick="texPaintUndo()" data-i18n="undo" class="text-[10px] py-1 border border-[#00ffcc] bg-zinc-800 text-[#00ffcc] hover:bg-zinc-700">UNDO</button>
                        <hr class="border-zinc-700 my-1">
                        <button onclick="texLoadImage()" data-i18n="loadImage" class="text-[10px] py-1 border border-[#00ffcc] bg-zinc-800 text-[#00ffcc] hover:bg-zinc-700">LOAD IMAGE</button>
                        <button onclick="texDownload()" data-i18n="downloadPng" class="text-[10px] py-1 border border-[#00ffcc] bg-zinc-800 text-[#00ffcc] hover:bg-zinc-700">DOWNLOAD PNG</button>
                        <button onclick="saveTextureSnapshot()" class="text-[10px] py-1 border border-[#ffcc00] bg-zinc-800 text-[#ffcc00] hover:bg-zinc-700">SAVE SNAPSHOT</button>
                        <button onclick="texNewCanvas()" data-i18n="newClear" class="text-[10px] py-1 border border-red-600 bg-zinc-800 text-red-400 hover:bg-zinc-700">NEW (CLEAR)</button>
                        <span id="tex-autosave-status" class="text-zinc-600 text-[7px] text-center transition-opacity duration-500" style="opacity:0">AUTO-SAVED</span>
                    </div>
                </div>
                <!-- Center: paint canvas -->
                <div class="flex-1 flex items-center justify-center bg-zinc-800 p-4 min-w-0">
                    <div class="relative inline-block">
                        <canvas id="tex-paint-canvas" class="border-2 border-[#00ffcc]/50 cursor-crosshair" style="width: 350px; height: 350px; image-rendering: pixelated;"></canvas>
                        <div id="tex-uv-overlay" class="absolute border-2 pointer-events-none hidden" style="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);"></div>
                        <canvas id="tex-uvmap-canvas" class="absolute inset-0 pointer-events-none hidden" style="image-rendering: auto;"></canvas>
                        <canvas id="tex-grid-canvas" class="absolute inset-0 pointer-events-none" style="image-rendering: auto;"></canvas>
                    </div>
                </div>
                <!-- Right: preview + UV -->
                <div class="w-52 bg-zinc-950 border-l border-zinc-700 p-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
                    <div>
                        <label data-i18n="preview3d" class="text-zinc-500 text-[9px] block mb-1">3D PREVIEW</label>
                        <div id="tex-preview-3d" class="w-full aspect-square bg-zinc-800 border border-zinc-700 rounded overflow-hidden"></div>
                    </div>
                    <div id="tex-face-section" class="hidden">
                        <label data-i18n="face" class="text-zinc-500 text-[9px] block mb-1">FACE</label>
                        <select id="tex-face-select" onchange="texSelectFace(this.value)" class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-1 mb-1">
                            <option value="-1" data-i18n="allFaces">ALL FACES</option>
                            <option value="0" data-i18n="faceRight">RIGHT</option>
                            <option value="1" data-i18n="faceLeft">LEFT</option>
                            <option value="2" data-i18n="faceTop">TOP</option>
                            <option value="3" data-i18n="faceBottom">BOTTOM</option>
                            <option value="4" data-i18n="faceFront">FRONT</option>
                            <option value="5" data-i18n="faceBack">BACK</option>
                        </select>
                        <div id="tex-face-controls" class="hidden space-y-1">
                            <div class="grid grid-cols-2 gap-1">
                                <div><label class="text-zinc-600 text-[8px]">OFFSET U</label><input id="tex-face-ou" type="number" step="0.05" value="0" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texSetFaceUV('ou',this.value)"></div>
                                <div><label class="text-zinc-600 text-[8px]">OFFSET V</label><input id="tex-face-ov" type="number" step="0.05" value="0" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texSetFaceUV('ov',this.value)"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-1">
                                <div><label class="text-zinc-600 text-[8px]">SCALE U</label><input id="tex-face-su" type="number" step="0.05" value="1" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texSetFaceUV('su',this.value)"></div>
                                <div><label class="text-zinc-600 text-[8px]">SCALE V</label><input id="tex-face-sv" type="number" step="0.05" value="1" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texSetFaceUV('sv',this.value)"></div>
                            </div>
                            <div><label data-i18n="rotation" class="text-zinc-600 text-[8px]">ROTATION</label><input id="tex-face-rot" type="number" step="90" value="0" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texSetFaceUV('rot',this.value)"></div>
                        </div>
                        <p id="tex-face-name" class="hidden text-[9px] text-zinc-400 mt-1"></p>
                        <hr class="border-zinc-700 my-2">
                    </div>
                    <div id="tex-global-uv">
                        <div>
                            <label data-i18n="uvOffset" class="text-zinc-500 text-[9px] block mb-1">UV OFFSET</label>
                            <div class="grid grid-cols-2 gap-1">
                                <input id="tex-uv-ox" type="number" step="0.05" value="0" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texUpdateUV()">
                                <input id="tex-uv-oy" type="number" step="0.05" value="0" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texUpdateUV()">
                            </div>
                        </div>
                        <div class="mt-3">
                            <label data-i18n="uvRepeat" class="text-zinc-500 text-[9px] block mb-1">UV REPEAT</label>
                            <div class="grid grid-cols-2 gap-1">
                                <input id="tex-uv-rx" type="number" step="0.1" value="1" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texUpdateUV()">
                                <input id="tex-uv-ry" type="number" step="0.1" value="1" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texUpdateUV()">
                            </div>
                        </div>
                        <div class="mt-3">
                            <label data-i18n="rotation" class="text-zinc-500 text-[9px] block mb-1">ROTATION</label>
                            <input id="tex-uv-rot" type="number" step="90" value="0" class="bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-0.5 w-full" oninput="texUpdateUV()">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- AI Texture Generator Modal -->
    <div id="ai-gen-modal" class="hidden fixed inset-0 bg-black/80 z-[55] flex items-center justify-center" style="font-family: 'Press Start 2P', monospace;">
        <div class="bg-zinc-900 border-4 border-[#aa00ff] rounded w-full max-w-md flex flex-col" style="max-height: 90vh;">
            <div class="flex items-center justify-between px-4 py-3 border-b-2 border-[#aa00ff]/40 shrink-0">
                <div class="flex flex-col gap-0.5">
                    <h3 class="text-[#aa00ff] text-xs tracking-widest">AI TEXTURE GENERATOR</h3>
                    <div id="ai-gen-model-indicator" class="text-[7px] leading-tight"></div>
                </div>
                <button onclick="closeAIGenModal()" class="text-zinc-400 hover:text-white text-sm px-2">X</button>
            </div>
            <div class="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
                <div>
                    <label class="text-zinc-500 text-[9px] block mb-1">TEMPLATE</label>
                    <select onchange="applyPromptTemplate(this)" class="w-full bg-zinc-800 border border-zinc-600 text-[8px] text-zinc-400 px-1 py-1" style="font-family: inherit;">
                        <option value="">\u2014 select a template \u2014</option>
                        <optgroup label="CHARACTER \u2014 FACE">
                            <option value="goblin facial traits, green skin, wide nose, yellow eyes, UV face texture map, square facial texture tile, flat facial features only, no portrait, no neck, no shoulders, no full head, no head outline, no background, front orthographic view, symmetrical face layout, PS1 videogame texture, limited palette, visible dithering, hard pixel shadows">Goblin Face</option>
                            <option value="human warrior male face, weathered skin, battle scar, strong jaw, UV face texture map, square facial texture tile, flat facial features only, front orthographic view, symmetrical face layout, PS1 videogame texture, limited palette, visible dithering, hard pixel shadows">Human Warrior Face</option>
                            <option value="undead skeleton face, bone white, dark hollow eye sockets, cracked jaw, UV face texture map, square facial texture tile, flat features only, front orthographic view, symmetrical, PS1 videogame texture, limited palette, dithering">Skeleton Face</option>
                            <option value="orc brute face, grey-green skin, tusks, scarred, UV face texture map, square facial texture tile, flat facial features, front orthographic view, symmetrical, PS1 videogame texture, limited palette, dithering, hard pixel shadows">Orc Face</option>
                            <option value="elf mage face, pale skin, sharp features, glowing eyes, UV face texture map, square facial texture tile, flat facial features only, front orthographic view, symmetrical, PS1 videogame texture, limited palette, dithering">Elf Mage Face</option>
                            <option value="dwarf warrior face, ruddy skin, thick beard, bushy eyebrows, UV face texture map, square facial texture tile, flat facial features only, front orthographic view, symmetrical, PS1 videogame texture, limited palette, dithering">Dwarf Face</option>
                        </optgroup>
                        <optgroup label="CHARACTER \u2014 BODY">
                            <option value="knight plate armor torso, scratched metal, battle worn, rust edges, flat front view, square tile, seamless edges, PS1 texture, limited palette, dithering, no background">Plate Armor Torso</option>
                            <option value="wizard cloth robe torso, dark purple fabric, gold trim, worn, flat front view, square tile, seamless, PS1 texture, limited palette, dithering, no background">Wizard Robe Torso</option>
                            <option value="rogue leather armor torso, dark brown, straps, rivets, flat front view, square tile, seamless, PS1 texture, limited palette, dithering, no background">Leather Armor Torso</option>
                            <option value="barbarian bare chest, tribal tattoos, scars, muscular, flat front view, square tile, seamless, PS1 texture, limited palette, dithering, no background">Barbarian Chest</option>
                        </optgroup>
                        <optgroup label="ENVIRONMENT \u2014 GROUND">
                            <option value="asphalt road texture top down, cracks, worn markings, seamless tile, PS1 style, limited palette, visible dithering">Asphalt Road</option>
                            <option value="grass ground texture top down, short green grass, subtle variation, seamless tile, PS1 style, limited palette, dithering, pixelated">Grass Field</option>
                            <option value="dungeon stone floor texture top down, grey cobblestones, mortar lines, seamless tile, PS1 style, limited palette, dithering">Stone Floor</option>
                            <option value="dirt path texture top down, brown earth, small pebbles, seamless tile, PS1 style, limited palette, dithering">Dirt Path</option>
                            <option value="desert sand texture top down, warm beige, subtle dunes, seamless tile, PS1 style, limited palette, dithering">Sand Desert</option>
                            <option value="dark water surface texture top down, navy blue, subtle ripple pattern, seamless tile, PS1 style, limited palette, dithering">Water Surface</option>
                            <option value="lava floor texture top down, dark rock with glowing orange cracks, seamless tile, PS1 style, limited palette, dithering">Lava Floor</option>
                            <option value="snow ground texture top down, white with subtle blue shadows, seamless tile, PS1 style, limited palette, dithering">Snow Ground</option>
                        </optgroup>
                        <optgroup label="ENVIRONMENT \u2014 WALLS">
                            <option value="stone brick wall texture, grey rocks, mortar, slightly worn, seamless tile, PS1 style, limited palette, dithering">Stone Brick Wall</option>
                            <option value="wooden wall planks texture, horizontal boards, wood grain, slightly worn, seamless tile, PS1 style, limited palette, dithering">Wood Planks Wall</option>
                            <option value="sci-fi metal panel wall texture, rivets, panel seams, worn paint, seamless tile, PS1 style, limited palette, dithering">Metal Panel Wall</option>
                            <option value="dungeon mud brick wall texture, adobe style, cracked clay, moss patches, seamless tile, PS1 style, limited palette, dithering">Mud Brick Wall</option>
                            <option value="castle dungeon wall texture, dark stone, moisture stains, iron torch bracket, seamless tile, PS1 style, limited palette, dithering">Dungeon Wall</option>
                        </optgroup>
                        <optgroup label="PROPS &amp; OBJECTS">
                            <option value="wooden treasure chest texture, flat unwrapped, brown planks, iron bands, lock, PS1 style, limited palette, dithering, square tile">Treasure Chest</option>
                            <option value="old wooden barrel texture, flat unwrapped, dark wood staves, iron hoops, PS1 style, limited palette, dithering, square tile">Wooden Barrel</option>
                            <option value="rusty iron sword blade texture, flat, scratched metal, blood stains, PS1 style, limited palette, dithering, square tile">Iron Sword</option>
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label class="text-zinc-500 text-[9px] block mb-1">PROMPT</label>
                    <div class="relative">
                        <textarea id="tex-gen-prompt" rows="3" placeholder="click to open full editor..."
                            onclick="openPromptExpandModal()"
                            readonly
                            class="w-full bg-zinc-800 border border-[#aa00ff] text-[9px] text-white px-1 py-1 resize-none placeholder-zinc-600 cursor-pointer" style="font-family: inherit;"></textarea>
                        <button onclick="openPromptExpandModal()" class="absolute top-1 right-1 text-[8px] text-[#aa00ff] hover:text-white leading-none" title="Expand editor">\u2922</button>
                    </div>
                    <label class="flex items-center gap-1.5 cursor-pointer mt-1">
                        <input type="checkbox" id="tex-single-subject" class="accent-[#aa00ff]">
                        <span class="text-zinc-500 text-[8px]">Single subject (no tiling)</span>
                    </label>
                </div>
                <button id="tex-gen-btn" onclick="texGenerate()" class="text-[10px] py-1.5 border-2 border-[#aa00ff] bg-zinc-800 text-[#aa00ff] hover:bg-[#aa00ff] hover:text-white font-bold tracking-widest">GENERATE</button>
                <div id="tex-gen-pending" class="hidden flex flex-col gap-1 border-2 border-[#00ff88] rounded p-1.5">
                    <label class="text-[#00ff88] text-[8px] tracking-widest">APPROVE RESULT?</label>
                    <img id="tex-gen-preview-img" src="" alt="preview"
                         class="w-full border border-zinc-600" style="image-rendering: pixelated; aspect-ratio:1; max-height: 200px; object-fit: contain;">
                    <span id="tex-gen-pending-label" class="text-zinc-500 text-[8px]"></span>
                    <div class="flex gap-1">
                        <button onclick="texApplyGenerated()" class="flex-1 text-[10px] py-1 border-2 border-[#00ff88] bg-zinc-800 text-[#00ff88] hover:bg-[#00ff88] hover:text-black font-bold">\u2713 APPLY</button>
                        <button onclick="texDiscardGenerated()" class="text-[10px] py-1 px-2 border border-red-600 bg-zinc-800 text-red-400 hover:bg-zinc-700">\u2717</button>
                    </div>
                </div>
                <hr class="border-zinc-700">
                <!-- Chroma Key -->
                <div class="flex flex-col gap-1.5">
                    <label class="text-zinc-500 text-[9px] block">REMOVE BG COLOR</label>
                    <div class="flex gap-1 items-center">
                        <input type="color" id="tex-chroma-color" value="#808080"
                               class="w-8 h-7 bg-transparent border border-zinc-600 cursor-pointer shrink-0">
                        <button onclick="texStartColorSample()" title="Pick color from canvas"
                                class="text-[9px] px-1.5 py-1 border border-zinc-600 bg-zinc-800 text-zinc-400 hover:text-white">\u25B4</button>
                        <div class="flex-1">
                            <label class="text-zinc-600 text-[7px] block">TOLERANCE</label>
                            <input type="range" id="tex-chroma-tol" min="0" max="120" value="30"
                                   class="w-full accent-[#00ffcc]">
                        </div>
                    </div>
                    <button onclick="texRemoveColor()" class="text-[10px] py-1 border border-[#00ffcc] bg-zinc-800 text-[#00ffcc] hover:bg-[#00ffcc] hover:text-black">REMOVE COLOR</button>
                </div>
                <hr class="border-zinc-700">
                <!-- Sprite Strip -->
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between">
                        <label class="text-zinc-500 text-[9px]">SPRITE STRIP</label>
                        <div class="flex gap-1">
                            <button id="tex-strip-remove-btn" onclick="texRemoveSelectedVariation()" title="Remove selected variation"
                                class="hidden text-[8px] px-2 py-0.5 border border-red-600 text-red-400 bg-zinc-900 hover:bg-zinc-800">- REMOVE</button>
                            <button id="tex-strip-export-btn" onclick="texExportStrip()" title="Save the whole sprite strip as one image"
                                class="hidden text-[8px] px-2 py-0.5 border border-[#ffcc00] text-[#ffcc00] bg-zinc-900 hover:bg-zinc-800">EXPORT PNG</button>
                            <button id="tex-strip-apply-btn" onclick="texApplyStrip()" title="Apply full strip as texture"
                                class="text-[8px] px-2 py-0.5 border border-[#00ffcc] text-[#00ffcc] bg-zinc-900 hover:bg-zinc-800">APPLY</button>
                        </div>
                    </div>
                    <div id="tex-strip-nav"
                        class="flex gap-1.5 overflow-x-auto pb-1 min-h-[58px] items-start border border-zinc-700 rounded p-1">
                        <span class="text-zinc-600 text-[8px] self-center px-1">Generate or paint a base sprite, then add variations</span>
                    </div>
                    <p class="text-zinc-600 text-[7px] leading-relaxed">Click tile to select \u00b7 right-click to remove</p>
                    <div id="tex-strip-var-section" class="hidden flex flex-col gap-1 border border-[#aa00ff]/40 rounded p-1.5">
                        <span class="text-zinc-500 text-[8px]">VARIATION FROM <span id="tex-strip-src-label" class="text-[#ffcc00]">BASE</span></span>
                        <textarea id="tex-strip-var-prompt" rows="2"
                            placeholder="change expression to sad, angry, hurt..."
                            class="w-full bg-zinc-800 border border-zinc-600 text-[9px] text-white px-1 py-0.5 resize-none placeholder-zinc-600"
                            style="font-family: inherit;"></textarea>
                        <button id="tex-strip-var-btn" onclick="texGenerateVariation()"
                            class="text-[9px] py-1 border-2 border-[#aa00ff] bg-zinc-800 text-[#aa00ff] hover:bg-[#aa00ff] hover:text-white font-bold">
                            GENERATE VARIATION
                        </button>
                    </div>
                    <div class="flex items-center gap-1 mt-0.5">
                        <button id="tex-grid-toggle" onclick="texToggleGrid()" title="Show UV grid guide"
                            class="text-[8px] px-2 py-0.5 border border-zinc-600 bg-zinc-800 text-zinc-500 hover:text-white">GRID GUIDE</button>
                        <select onchange="texSetGridSize(this.value)" class="flex-1 bg-zinc-800 border border-zinc-600 text-[8px] text-zinc-500 px-1 py-0.5">
                            <option value="2x2">2\u00d72</option>
                            <option value="3x3">3\u00d73</option>
                            <option value="4x4">4\u00d74</option>
                            <option value="4x1">4\u00d71</option>
                            <option value="8x1">8\u00d71</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Prompt Expand Modal -->
    <div id="prompt-expand-modal" class="hidden fixed inset-0 bg-black/95 z-[60] flex items-center justify-center" style="font-family: 'Press Start 2P', monospace;">
        <div class="bg-zinc-900 border-4 border-[#aa00ff] rounded w-full max-w-2xl flex flex-col" style="max-height: 90vh;">
            <div class="flex items-center justify-between px-5 py-3 border-b-2 border-[#aa00ff]/40 shrink-0">
                <div class="flex flex-col gap-0.5">
                    <h3 class="text-[#aa00ff] text-xs tracking-widest">PROMPT EDITOR</h3>
                    <div id="prompt-modal-model-indicator" class="text-[7px] leading-tight"></div>
                </div>
                <button onclick="closePromptExpandModal()" class="text-zinc-400 hover:text-white text-sm px-2">X</button>
            </div>
            <div class="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
                <div>
                    <label class="text-zinc-500 text-[9px] block mb-1">SUGGESTED PROMPTS</label>
                    <select onchange="applyPromptTemplate(this)" class="w-full bg-zinc-800 border border-zinc-600 text-[9px] text-white px-2 py-1.5" style="font-family: inherit;">
                        <option value="">\u2014 select a template to load it \u2014</option>
                        <optgroup label="CHARACTER \u2014 FACE">
                            <option value="goblin facial traits, green skin, wide nose, yellow eyes, UV face texture map, square facial texture tile, flat facial features only, no portrait, no neck, no shoulders, no full head, no head outline, no background, front orthographic view, symmetrical face layout, PS1 videogame texture, limited palette, visible dithering, hard pixel shadows">Goblin Face</option>
                            <option value="human warrior male face, weathered skin, battle scar, strong jaw, UV face texture map, square facial texture tile, flat facial features only, front orthographic view, symmetrical face layout, PS1 videogame texture, limited palette, visible dithering, hard pixel shadows">Human Warrior Face</option>
                            <option value="undead skeleton face, bone white, dark hollow eye sockets, cracked jaw, UV face texture map, square facial texture tile, flat features only, front orthographic view, symmetrical, PS1 videogame texture, limited palette, dithering">Skeleton Face</option>
                            <option value="orc brute face, grey-green skin, tusks, scarred, UV face texture map, square facial texture tile, flat facial features, front orthographic view, symmetrical, PS1 videogame texture, limited palette, dithering, hard pixel shadows">Orc Face</option>
                            <option value="elf mage face, pale skin, sharp features, glowing eyes, UV face texture map, square facial texture tile, flat facial features only, front orthographic view, symmetrical, PS1 videogame texture, limited palette, dithering">Elf Mage Face</option>
                            <option value="dwarf warrior face, ruddy skin, thick beard, bushy eyebrows, UV face texture map, square facial texture tile, flat facial features only, front orthographic view, symmetrical, PS1 videogame texture, limited palette, dithering">Dwarf Face</option>
                        </optgroup>
                        <optgroup label="CHARACTER \u2014 BODY">
                            <option value="knight plate armor torso, scratched metal, battle worn, rust edges, flat front view, square tile, seamless edges, PS1 texture, limited palette, dithering, no background">Plate Armor Torso</option>
                            <option value="wizard cloth robe torso, dark purple fabric, gold trim, worn, flat front view, square tile, seamless, PS1 texture, limited palette, dithering, no background">Wizard Robe Torso</option>
                            <option value="rogue leather armor torso, dark brown, straps, rivets, flat front view, square tile, seamless, PS1 texture, limited palette, dithering, no background">Leather Armor Torso</option>
                            <option value="barbarian bare chest, tribal tattoos, scars, muscular, flat front view, square tile, seamless, PS1 texture, limited palette, dithering, no background">Barbarian Chest</option>
                        </optgroup>
                        <optgroup label="ENVIRONMENT \u2014 GROUND">
                            <option value="asphalt road texture top down, cracks, worn markings, seamless tile, PS1 style, limited palette, visible dithering">Asphalt Road</option>
                            <option value="grass ground texture top down, short green grass, subtle variation, seamless tile, PS1 style, limited palette, dithering, pixelated">Grass Field</option>
                            <option value="dungeon stone floor texture top down, grey cobblestones, mortar lines, seamless tile, PS1 style, limited palette, dithering">Stone Floor</option>
                            <option value="dirt path texture top down, brown earth, small pebbles, seamless tile, PS1 style, limited palette, dithering">Dirt Path</option>
                            <option value="desert sand texture top down, warm beige, subtle dunes, seamless tile, PS1 style, limited palette, dithering">Sand Desert</option>
                            <option value="dark water surface texture top down, navy blue, subtle ripple pattern, seamless tile, PS1 style, limited palette, dithering">Water Surface</option>
                            <option value="lava floor texture top down, dark rock with glowing orange cracks, seamless tile, PS1 style, limited palette, dithering">Lava Floor</option>
                            <option value="snow ground texture top down, white with subtle blue shadows, seamless tile, PS1 style, limited palette, dithering">Snow Ground</option>
                        </optgroup>
                        <optgroup label="ENVIRONMENT \u2014 WALLS">
                            <option value="stone brick wall texture, grey rocks, mortar, slightly worn, seamless tile, PS1 style, limited palette, dithering">Stone Brick Wall</option>
                            <option value="wooden wall planks texture, horizontal boards, wood grain, slightly worn, seamless tile, PS1 style, limited palette, dithering">Wood Planks Wall</option>
                            <option value="sci-fi metal panel wall texture, rivets, panel seams, worn paint, seamless tile, PS1 style, limited palette, dithering">Metal Panel Wall</option>
                            <option value="dungeon mud brick wall texture, adobe style, cracked clay, moss patches, seamless tile, PS1 style, limited palette, dithering">Mud Brick Wall</option>
                            <option value="castle dungeon wall texture, dark stone, moisture stains, iron torch bracket, seamless tile, PS1 style, limited palette, dithering">Dungeon Wall</option>
                        </optgroup>
                        <optgroup label="PROPS &amp; OBJECTS">
                            <option value="wooden treasure chest texture, flat unwrapped, brown planks, iron bands, lock, PS1 style, limited palette, dithering, square tile">Treasure Chest</option>
                            <option value="old wooden barrel texture, flat unwrapped, dark wood staves, iron hoops, PS1 style, limited palette, dithering, square tile">Wooden Barrel</option>
                            <option value="rusty iron sword blade texture, flat, scratched metal, blood stains, PS1 style, limited palette, dithering, square tile">Iron Sword</option>
                        </optgroup>
                    </select>
                </div>
                <div class="flex-1">
                    <label class="text-zinc-500 text-[9px] block mb-1">PROMPT</label>
                    <textarea id="tex-gen-prompt-full" rows="8" placeholder="Describe the texture you want to generate..."
                        class="w-full bg-zinc-800 border border-[#aa00ff] text-[10px] text-white px-2 py-2 resize-none placeholder-zinc-600"
                        style="font-family: 'Courier New', monospace; min-height: 180px;"></textarea>
                </div>
                <p class="text-zinc-600 text-[8px] leading-relaxed">TIP: Select a template above to load it, then customize the details (skin color, material, setting). Use ENHANCE to let a local LLM improve the prompt automatically.</p>
            </div>
            <div class="flex gap-2 px-4 py-3 border-t border-[#aa00ff]/30 shrink-0">
                <button id="prompt-enhance-btn" onclick="enhancePrompt()" class="hidden text-[10px] py-2 px-4 border-2 border-[#00ffcc] bg-zinc-800 text-[#00ffcc] hover:bg-[#00ffcc] hover:text-black">ENHANCE</button>
                <button id="prompt-generate-btn" onclick="texGenerateFromModal()" class="flex-1 text-[10px] py-2 border-2 border-[#aa00ff] bg-[#aa00ff] text-white hover:bg-[#8800cc] font-bold">GENERATE</button>
                <button onclick="closePromptExpandModal()" class="text-[10px] py-2 px-4 border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700">CLOSE</button>
            </div>
        </div>
    </div>

    <!-- Config Modal -->
    <div id="config-modal" class="hidden fixed inset-0 bg-black/90 z-50 flex items-center justify-center" style="font-family: 'Press Start 2P', monospace;">
        <div class="bg-zinc-900 border-4 border-[#aa00ff] rounded w-full max-w-md flex flex-col overflow-hidden">
            <div class="flex items-center justify-between px-5 py-3 border-b-2 border-[#aa00ff]/40">
                <h3 class="text-[#aa00ff] text-xs tracking-widest">AI TEXTURE CONFIG</h3>
                <button onclick="closeConfigModal()" class="text-zinc-400 hover:text-white text-sm px-2">X</button>
            </div>
            <div class="p-5 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
                <div>
                    <label class="text-zinc-500 text-[9px] block mb-2">GENERATION METHOD</label>
                    <input type="hidden" id="cfg-method-select" value="openai">
                    <div class="flex gap-2">
                        <button id="cfg-method-openai" onclick="onConfigMethodChange('openai')"
                                class="flex-1 text-[10px] py-2 border-2 border-[#aa00ff] bg-[#ffcc00] text-black">OPENAI</button>
                        <button id="cfg-method-sd" onclick="onConfigMethodChange('stable-diffusion')"
                                class="flex-1 text-[10px] py-2 border-2 border-[#aa00ff] bg-zinc-800 text-white">LOCAL SD</button>
                    </div>
                </div>
                <div id="cfg-section-openai" class="flex flex-col gap-3">
                    <div class="border border-[#aa00ff]/30 rounded p-3 flex flex-col gap-3">
                        <p class="text-zinc-500 text-[8px] leading-relaxed">API key is saved only in your browser (localStorage). It is never sent to any server other than api.openai.com.</p>
                        <div>
                            <label class="text-zinc-500 text-[9px] block mb-1">API KEY</label>
                            <input type="password" id="cfg-openai-key" placeholder="sk-..."
                                   class="w-full bg-zinc-800 border border-[#aa00ff]/50 text-[10px] text-white px-2 py-1.5 font-mono">
                        </div>
                        <div>
                            <label class="text-zinc-500 text-[9px] block mb-1">MODEL</label>
                            <input type="text" id="cfg-openai-model" value="gpt-image-1-mini"
                                   class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-2 py-1.5">
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="text-zinc-500 text-[9px] block mb-1">SIZE</label>
                                <select id="cfg-openai-size" class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-1.5">
                                    <option value="1024x1024">1024\u00d71024</option>
                                    <option value="512x512">512\u00d7512</option>
                                    <option value="256x256">256\u00d7256</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-zinc-500 text-[9px] block mb-1">QUALITY</label>
                                <select id="cfg-openai-quality" class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-1.5">
                                    <option value="low">LOW</option>
                                    <option value="medium">MEDIUM</option>
                                    <option value="high">HIGH</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="cfg-section-sd" class="hidden flex flex-col gap-3">
                    <div class="border border-[#aa00ff]/30 rounded p-3 flex flex-col gap-3">
                        <p class="text-zinc-500 text-[8px] leading-relaxed">Point to your local Forge / AUTOMATIC1111 server. Enable API in its settings and make sure CORS is allowed.</p>
                        <div>
                            <label class="text-zinc-500 text-[9px] block mb-1">SERVER URL</label>
                            <input type="text" id="cfg-sd-url" value="http://127.0.0.1:7860"
                                   class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-2 py-1.5 font-mono">
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <label class="text-zinc-500 text-[9px] block mb-1">WIDTH</label>
                                <input type="number" id="cfg-sd-width" value="512" step="64" min="64" max="2048"
                                       class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-1.5">
                            </div>
                            <div>
                                <label class="text-zinc-500 text-[9px] block mb-1">HEIGHT</label>
                                <input type="number" id="cfg-sd-height" value="512" step="64" min="64" max="2048"
                                       class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-1.5">
                            </div>
                            <div>
                                <label class="text-zinc-500 text-[9px] block mb-1">STEPS</label>
                                <input type="number" id="cfg-sd-steps" value="20" min="1" max="150"
                                       class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-1.5">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col gap-3">
                    <label class="text-zinc-500 text-[9px] block border-t border-zinc-700 pt-4">LOCAL LLM \u2014 OLLAMA <span class="text-zinc-600">(prompt enhancement)</span></label>
                    <div class="border border-[#00ffcc]/30 rounded p-3 flex flex-col gap-3">
                        <p class="text-zinc-500 text-[8px] leading-relaxed">Connect a local Ollama server to enhance prompts before sending them to the image generator.</p>
                        <div>
                            <label class="text-zinc-500 text-[9px] block mb-1">OLLAMA ENDPOINT</label>
                            <input type="text" id="cfg-ollama-url" value="http://127.0.0.1:11434"
                                   class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-2 py-1.5 font-mono">
                        </div>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <label class="text-zinc-500 text-[9px]">MODEL</label>
                                <button id="cfg-ollama-load-btn" onclick="loadOllamaModels()"
                                        class="text-[8px] px-2 py-0.5 border border-[#00ffcc] text-[#00ffcc] bg-zinc-900 hover:bg-zinc-800">LOAD MODELS</button>
                            </div>
                            <select id="cfg-ollama-model-select" class="w-full bg-zinc-800 border border-zinc-600 text-[10px] text-white px-1 py-1.5">
                                <option value="">\u2014 click Load Models \u2014</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex gap-2 px-5 py-3 border-t border-[#aa00ff]/30">
                <button onclick="saveConfigModal()" class="flex-1 text-[10px] py-2 border-2 border-[#aa00ff] bg-[#aa00ff] text-white hover:bg-[#8800cc]">SAVE</button>
                <button onclick="closeConfigModal()" class="text-[10px] py-2 px-4 border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700">CANCEL</button>
            </div>
        </div>
    </div>
  `;
  document.body.appendChild(container);
}
