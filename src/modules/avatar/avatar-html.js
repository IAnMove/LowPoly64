export function injectAvatarHTML() {
  const container = document.createElement('div');
  container.id = 'avatar-html-root';
  container.innerHTML = `
    <div id="avatar-forge-modal" class="hidden fixed inset-0 bg-black/90 z-[59] flex items-center justify-center" style="font-family: 'Press Start 2P', monospace;">
      <div class="bg-zinc-900 border-4 border-[#ff77aa] rounded w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b-2 border-[#ff77aa]/40">
          <div class="flex flex-col gap-1">
            <h3 class="text-[#ff77aa] text-xs tracking-widest" data-i18n="avatarForge">AVATAR FORGE</h3>
            <div id="avatar-forge-subtitle" class="text-zinc-500 text-[8px] leading-tight" data-i18n="avatarNewSession">Build a new humanoid avatar from curated presets</div>
          </div>
          <button id="avatar-forge-close-top" class="text-zinc-400 hover:text-white text-sm px-2">X</button>
        </div>

        <div class="flex flex-1 min-h-0 overflow-hidden">
          <div class="w-[46%] min-w-0 border-r border-zinc-700 overflow-y-auto p-4 space-y-4">
            <section class="border border-zinc-700 bg-zinc-900/60 p-3">
              <div class="mb-3 text-[#ff77aa] text-[9px] tracking-wide" data-i18n="avatarBlockHeadBody">HEAD AND BODY</div>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label for="avatar-label-input" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarLabel">LABEL</label>
                  <input id="avatar-label-input" type="text" maxlength="64" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-3 py-2 text-[10px] text-white focus:outline-none" placeholder="Avatar">
                </div>
                <div class="col-span-2 flex items-start justify-between gap-3 border border-zinc-700 bg-zinc-950 px-3 py-2">
                  <div class="min-w-0">
                    <div class="text-zinc-500 text-[8px] mb-1" data-i18n="avatarHeadMode">HEAD MODE</div>
                    <div id="avatar-head-mode" class="text-[10px] text-[#9dffcb]">MOLD</div>
                  </div>
                  <div id="avatar-head-mode-note" class="max-w-[55%] text-right text-[8px] leading-relaxed text-zinc-500"></div>
                </div>
                <div>
                  <label for="avatar-body-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarBody">BODY</label>
                  <select id="avatar-body-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                </div>
                <div id="avatar-head-mold-wrap">
                  <label for="avatar-head-mold-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarHeadBase">HEAD BASE</label>
                  <select id="avatar-head-mold-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                </div>
                <div class="col-span-2">
                  <label for="avatar-head-scale-input" class="block">
                    <div class="mb-1 flex items-center justify-between gap-2 text-[8px] text-zinc-500">
                      <span data-i18n="avatarHeadScale">HEAD SCALE</span>
                      <span id="avatar-head-scale-value" class="text-zinc-200">1.00</span>
                    </div>
                    <input id="avatar-head-scale-input" type="range" min="0.85" max="1.4" step="0.01" class="w-full accent-[#ff77aa]">
                  </label>
                </div>
                <div class="col-span-2">
                  <div class="mb-2 flex items-center justify-between gap-2 text-[8px] text-zinc-500">
                    <span>SKULL SHAPE</span>
                    <span id="avatar-head-param-note" class="text-right text-zinc-600"></span>
                  </div>
                  <div id="avatar-head-param-controls" class="grid grid-cols-2 gap-3"></div>
                </div>
                <div class="col-span-2">
                  <label for="avatar-palette-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarPalette">PALETTE</label>
                  <select id="avatar-palette-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                </div>
              </div>

              <div class="mt-3">
                <div class="text-zinc-500 text-[8px] mb-2" data-i18n="avatarColors">COLORS</div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex items-center gap-2">
                    <input id="avatar-color-skin" type="color" class="w-10 h-10 bg-zinc-950 border-2 border-[#ff77aa]/50 rounded cursor-pointer">
                    <div class="min-w-0">
                      <label for="avatar-color-skin" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarColorSkin">SKIN</label>
                      <div id="avatar-color-skin-value" class="text-[8px] text-zinc-300">#000000</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <input id="avatar-color-hair" type="color" class="w-10 h-10 bg-zinc-950 border-2 border-[#ff77aa]/50 rounded cursor-pointer">
                    <div class="min-w-0">
                      <label for="avatar-color-hair" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarColorHair">HAIR</label>
                      <div id="avatar-color-hair-value" class="text-[8px] text-zinc-300">#000000</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <input id="avatar-color-iris" type="color" class="w-10 h-10 bg-zinc-950 border-2 border-[#ff77aa]/50 rounded cursor-pointer">
                    <div class="min-w-0">
                      <label for="avatar-color-iris" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarColorIris">IRIS</label>
                      <div id="avatar-color-iris-value" class="text-[8px] text-zinc-300">#000000</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <input id="avatar-color-body-primary" type="color" class="w-10 h-10 bg-zinc-950 border-2 border-[#ff77aa]/50 rounded cursor-pointer">
                    <div class="min-w-0">
                      <label for="avatar-color-body-primary" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarColorBodyPrimary">BODY A</label>
                      <div id="avatar-color-body-primary-value" class="text-[8px] text-zinc-300">#000000</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <input id="avatar-color-body-secondary" type="color" class="w-10 h-10 bg-zinc-950 border-2 border-[#ff77aa]/50 rounded cursor-pointer">
                    <div class="min-w-0">
                      <label for="avatar-color-body-secondary" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarColorBodySecondary">BODY B</label>
                      <div id="avatar-color-body-secondary-value" class="text-[8px] text-zinc-300">#000000</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <input id="avatar-color-accent" type="color" class="w-10 h-10 bg-zinc-950 border-2 border-[#ff77aa]/50 rounded cursor-pointer">
                    <div class="min-w-0">
                      <label for="avatar-color-accent" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarColorAccent">ACCENT</label>
                      <div id="avatar-color-accent-value" class="text-[8px] text-zinc-300">#000000</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div id="avatar-feature-controls" class="space-y-4">
              <section class="border border-zinc-700 bg-zinc-900/60 p-3">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div class="text-[#ff77aa] text-[9px] tracking-wide" data-i18n="avatarBlockFace">FACE</div>
                  <div id="avatar-feature-controls-note" class="text-right text-[8px] leading-relaxed text-zinc-500"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="col-span-2">
                    <label for="avatar-full-face-select" class="block text-zinc-500 text-[8px] mb-1">FULL FACE</label>
                    <select id="avatar-full-face-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                  </div>
                  <div>
                    <label for="avatar-eye-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarEyes">EYES</label>
                    <select id="avatar-eye-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                  </div>
                  <div>
                    <label for="avatar-brow-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarBrows">BROWS</label>
                    <select id="avatar-brow-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                  </div>
                  <div class="col-span-2">
                    <label for="avatar-mouth-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarMouth">MOUTH</label>
                    <select id="avatar-mouth-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                  </div>
                  <div class="col-span-2">
                    <label for="avatar-feature-slab-preset-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarFeatureSlabDepth">SLAB DEPTH</label>
                    <select id="avatar-feature-slab-preset-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                    <div id="avatar-feature-slab-preset-note" class="mt-1 min-h-4 text-[8px] leading-relaxed text-zinc-500"></div>
                  </div>
                  <label for="avatar-feature-depth-scale-input" class="col-span-2 block border border-zinc-700 bg-zinc-950 px-3 py-2">
                    <div class="mb-1 flex items-center justify-between gap-2 text-[8px] text-zinc-400">
                      <span data-i18n="avatarFeatureDepthFine">DEPTH FINE</span>
                      <span id="avatar-feature-depth-scale-value" class="text-zinc-200">1.00x</span>
                    </div>
                    <input id="avatar-feature-depth-scale-input" type="range" min="0.6" max="1.4" step="0.05" class="w-full accent-[#ff77aa]">
                  </label>
                </div>
                <div id="avatar-face-placement-controls" class="mt-3 grid grid-cols-2 gap-3"></div>
              </section>

              <section class="border border-zinc-700 bg-zinc-900/60 p-3">
                <div class="mb-3 text-[#ff77aa] text-[9px] tracking-wide" data-i18n="avatarBlockHairExtras">HAIR AND EXTRAS</div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="avatar-hair-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarHair">HAIR</label>
                    <select id="avatar-hair-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                  </div>
                  <div id="avatar-nose-wrap">
                    <label for="avatar-nose-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarNose">NOSE</label>
                    <select id="avatar-nose-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                  </div>
                  <div id="avatar-ear-wrap">
                    <label for="avatar-ear-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarEars">EARS</label>
                    <select id="avatar-ear-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                  </div>
                  <div>
                    <label for="avatar-accessory-select" class="block text-zinc-500 text-[8px] mb-1" data-i18n="avatarAccessory">ACCESSORY</label>
                    <select id="avatar-accessory-select" class="w-full bg-zinc-950 border-2 border-[#ff77aa]/50 px-2 py-2 text-[10px] text-white focus:outline-none"></select>
                  </div>
                </div>
                <div id="avatar-extra-placement-controls" class="mt-3 grid grid-cols-2 gap-3"></div>
              </section>
            </div>

            <div>
              <div class="text-zinc-500 text-[8px] mb-2" data-i18n="avatarSheet">CHARACTER SHEET</div>
              <div id="avatar-sheet" class="bg-zinc-950 border border-zinc-700 rounded p-3 text-[8px] text-zinc-300 leading-relaxed min-h-[152px]"></div>
            </div>
          </div>

          <div class="flex-1 min-w-0 flex flex-col p-4 gap-4">
            <div class="flex-1 min-h-0">
              <div class="mb-2 flex items-center justify-between gap-3">
                <div class="text-zinc-500 text-[8px]" data-i18n="avatarPreview">LIVE PREVIEW</div>
                <div class="flex items-center gap-3">
                  <div id="avatar-preview-view-controls" class="flex border border-zinc-700" role="group" aria-label="Preview view">
                    <button type="button" data-preview-view="front" class="h-6 min-w-12 px-2 text-[8px] text-zinc-400" data-i18n="avatarViewFront">FRONT</button>
                    <button type="button" data-preview-view="threeQuarter" class="h-6 min-w-12 border-x border-zinc-700 px-2 text-[8px] text-zinc-400" data-i18n="avatarViewThreeQuarter">3/4</button>
                    <button type="button" data-preview-view="profile" class="h-6 min-w-12 px-2 text-[8px] text-zinc-400" data-i18n="avatarViewSide">SIDE</button>
                  </div>
                  <label for="avatar-feature-slab-debug-toggle" class="flex items-center gap-2 text-[8px] text-zinc-400">
                    <input id="avatar-feature-slab-debug-toggle" type="checkbox" class="h-3 w-3 accent-[#00d0ff]">
                    <span>SLAB DEBUG</span>
                  </label>
                </div>
              </div>
              <div id="avatar-preview-stage" class="h-full min-h-[360px] bg-zinc-950 border-2 border-[#ff77aa]/40 rounded overflow-hidden relative">
                <canvas id="avatar-preview-canvas" class="w-full h-full block"></canvas>
                <div id="avatar-preview-empty" class="absolute inset-0 flex items-center justify-center text-zinc-600 text-[9px] text-center px-6 pointer-events-none">Avatar preview</div>
                <div id="avatar-feature-slab-debug-panel" class="hidden absolute left-2 bottom-2 max-w-[92%] bg-black/80 border border-[#00d0ff]/60 px-2 py-2 text-[7px] leading-relaxed text-[#aeefff] pointer-events-none whitespace-pre-wrap"></div>
              </div>
            </div>

            <div>
              <div class="text-zinc-500 text-[8px] mb-2" data-i18n="avatarBuildStatus">STATUS</div>
              <div id="avatar-forge-status" class="bg-zinc-950 border border-zinc-700 rounded p-3 text-[8px] text-zinc-400 leading-relaxed min-h-[64px]" data-i18n="avatarBuildIdle">Idle.</div>
            </div>
          </div>
        </div>

        <div class="flex gap-2 px-5 py-3 border-t border-[#ff77aa]/30">
          <button id="avatar-random-btn" class="text-[10px] py-2 px-4 border border-[#9dffcb]/70 bg-zinc-950 text-[#9dffcb] hover:bg-[#123327]" data-i18n="avatarRandom">RANDOM</button>
          <button id="avatar-forge-cancel-btn" class="text-[10px] py-2 px-4 border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700" data-i18n="cancel">CANCEL</button>
          <button id="avatar-forge-confirm-btn" class="flex-1 text-[10px] py-2 border-2 border-[#ff77aa] bg-[#ff77aa] text-black hover:bg-[#ff5f9c] font-bold" data-i18n="avatarCreate">CREATE AVATAR</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
}
