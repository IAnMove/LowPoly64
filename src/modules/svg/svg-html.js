export function injectSvgHTML() {
  const container = document.createElement('div');
  container.id = 'svg-html-root';
  container.innerHTML = `
    <div id="svg-workbench-modal" class="hidden fixed inset-0 bg-black/90 z-[58] flex items-center justify-center" style="font-family: 'Press Start 2P', monospace;">
      <div class="bg-zinc-900 border-4 border-[#00d0ff] rounded w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b-2 border-[#00d0ff]/40">
          <div class="flex flex-col gap-1">
            <h3 id="svg-workbench-heading" class="text-[#00d0ff] text-xs tracking-widest">SVG WORKBENCH</h3>
            <div id="svg-workbench-subtitle" class="text-zinc-500 text-[8px] leading-tight">Import or regenerate an SVG-derived model</div>
          </div>
          <button onclick="closeSvgWorkbench()" class="text-zinc-400 hover:text-white text-sm px-2">X</button>
        </div>

        <div class="flex flex-1 min-h-0 overflow-hidden">
          <div class="w-[52%] min-w-0 border-r border-zinc-700 flex flex-col">
            <div class="px-4 py-3 border-b border-zinc-800 flex flex-wrap gap-2">
              <button id="svg-mode-code" class="text-[9px] px-3 py-2 border-2 border-[#00d0ff] bg-[#ffcc00] text-black">CODE</button>
              <button id="svg-mode-file" class="text-[9px] px-3 py-2 border-2 border-[#00d0ff] bg-zinc-800 text-[#00d0ff]">FILE</button>
              <button id="svg-mode-pixel" class="text-[9px] px-3 py-2 border-2 border-[#00d0ff] bg-zinc-800 text-[#00d0ff]">PIXEL</button>
              <button id="svg-mode-text" class="text-[9px] px-3 py-2 border-2 border-[#00d0ff] bg-zinc-800 text-[#00d0ff]">TEXT</button>
            </div>

            <div class="px-4 py-3 border-b border-zinc-800">
              <div class="text-zinc-500 text-[8px] mb-2">SAMPLES</div>
              <div class="flex flex-wrap gap-2">
                <button id="svg-sample-filledStar" class="text-[8px] px-2 py-1 border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-[#00d0ff] hover:text-[#00d0ff]">FILLED</button>
                <button id="svg-sample-strokeBolt" class="text-[8px] px-2 py-1 border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-[#00d0ff] hover:text-[#00d0ff]">STROKE</button>
                <button id="svg-sample-pixelHeart" class="text-[8px] px-2 py-1 border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-[#00d0ff] hover:text-[#00d0ff]">PIXEL</button>
                <button id="svg-sample-textRetro" class="text-[8px] px-2 py-1 border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-[#00d0ff] hover:text-[#00d0ff]">TEXT</button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              <div id="svg-source-code" class="space-y-2">
                <label class="block text-zinc-500 text-[8px]">SVG MARKUP</label>
                <textarea id="svg-code-textarea" class="w-full min-h-[360px] bg-zinc-950 border-2 border-[#00d0ff]/50 p-3 font-mono text-white text-[10px] resize-y focus:outline-none" placeholder="<svg ...>"></textarea>
              </div>

              <div id="svg-source-file" class="hidden space-y-3">
                <div class="flex gap-2 items-center">
                  <label class="text-[9px] px-3 py-2 border-2 border-[#00d0ff] bg-zinc-800 text-[#00d0ff] cursor-pointer hover:bg-[#00d0ff] hover:text-black">
                    LOAD SVG
                    <input id="svg-file-input" type="file" accept=".svg,image/svg+xml" class="hidden">
                  </label>
                  <span id="svg-file-label" class="text-zinc-500 text-[8px] truncate">No file loaded</span>
                </div>
                <textarea id="svg-file-textarea" class="w-full min-h-[320px] bg-zinc-950 border-2 border-[#00d0ff]/50 p-3 font-mono text-white text-[10px] resize-y focus:outline-none" placeholder="<svg ...>"></textarea>
              </div>

              <div id="svg-source-pixel" class="hidden space-y-3">
                <div class="flex gap-2 items-center">
                  <button id="svg-pixel-clear" class="text-[9px] px-3 py-2 border border-red-500 bg-zinc-800 text-red-400 hover:bg-red-600 hover:text-white">CLEAR</button>
                  <span class="text-zinc-500 text-[8px] leading-tight">Drag to paint. Right-click to erase.</span>
                </div>
                <div id="svg-pixel-grid" class="grid gap-[2px] bg-zinc-950 border-2 border-[#00d0ff]/50 p-2 w-fit select-none"></div>
              </div>

              <div id="svg-source-text" class="hidden space-y-3">
                <div>
                  <label class="block text-zinc-500 text-[8px] mb-1">TEXT</label>
                  <input id="svg-text-input" type="text" maxlength="24" class="w-full bg-zinc-950 border-2 border-[#00d0ff]/50 px-3 py-2 text-[10px] text-white focus:outline-none" placeholder="RETRO">
                </div>
                <div>
                  <label class="block text-zinc-500 text-[8px] mb-1">FONT</label>
                  <select id="svg-font-select" class="w-full bg-zinc-950 border-2 border-[#00d0ff]/50 px-3 py-2 text-[10px] text-white focus:outline-none"></select>
                </div>
                <p class="text-zinc-500 text-[8px] leading-relaxed">Text mode loads a supported font and converts glyphs to path-based SVG before extrusion.</p>
              </div>
            </div>
          </div>

          <div class="flex-1 min-w-0 flex flex-col">
            <div class="grid grid-cols-2 gap-4 p-4 border-b border-zinc-800">
              <div class="col-span-2">
                <label class="block text-zinc-500 text-[8px] mb-1">NAME</label>
                <input id="svg-name-input" type="text" class="w-full bg-zinc-950 border-2 border-[#00d0ff]/50 px-3 py-2 text-[10px] text-white focus:outline-none" placeholder="SVG MODEL">
              </div>
              <div>
                <label class="block text-zinc-500 text-[8px] mb-1">DEPTH</label>
                <input id="svg-depth-input" type="number" step="0.1" min="0.1" max="20" class="w-full bg-zinc-950 border-2 border-[#00d0ff]/50 px-2 py-2 text-[10px] text-white focus:outline-none" value="1">
              </div>
              <div>
                <label class="block text-zinc-500 text-[8px] mb-1">SMOOTHNESS</label>
                <input id="svg-smoothness-input" type="number" step="0.05" min="0" max="1" class="w-full bg-zinc-950 border-2 border-[#00d0ff]/50 px-2 py-2 text-[10px] text-white focus:outline-none" value="0.2">
              </div>
              <div>
                <label class="block text-zinc-500 text-[8px] mb-1">TARGET SIZE</label>
                <input id="svg-target-size-input" type="number" step="0.1" min="0.5" max="50" class="w-full bg-zinc-950 border-2 border-[#00d0ff]/50 px-2 py-2 text-[10px] text-white focus:outline-none" value="4">
              </div>
              <div>
                <label class="block text-zinc-500 text-[8px] mb-1">RENDER MODE</label>
                <select id="svg-render-mode-input" class="w-full bg-zinc-950 border-2 border-[#00d0ff]/50 px-2 py-2 text-[10px] text-white focus:outline-none">
                  <option value="auto">AUTO</option>
                  <option value="solid">SOLID</option>
                  <option value="inflated-head">INFLATED HEAD</option>
                  <option value="plane">LAYERED PLANE</option>
                </select>
              </div>
              <div>
                <label class="block text-zinc-500 text-[8px] mb-1">BASE COLOR</label>
                <input id="svg-color-input" type="color" class="w-full h-[38px] bg-transparent border-2 border-[#00d0ff]/50 cursor-pointer" value="#ffcc00">
              </div>
              <label class="flex items-center gap-2 text-[8px] text-zinc-400 col-span-1">
                <input id="svg-auto-mount-input" type="checkbox" checked class="accent-[#00d0ff]">
                AUTO MOUNT
              </label>
              <label class="flex items-center gap-2 text-[8px] text-zinc-400 col-span-1">
                <input id="svg-force-rasterize-input" type="checkbox" class="accent-[#00d0ff]">
                FORCE RASTERIZE
              </label>
              <label class="flex items-center gap-2 text-[8px] text-zinc-400 col-span-1">
                <input id="svg-bevel-enabled-input" type="checkbox" checked class="accent-[#00d0ff]">
                BEVEL ENABLED
              </label>
              <div class="col-span-2">
                <label class="block text-zinc-500 text-[8px] mb-1">RASTER GRID</label>
                <input id="svg-grid-size-input" type="number" step="1" min="8" max="256" class="w-full bg-zinc-950 border-2 border-[#00d0ff]/50 px-2 py-2 text-[10px] text-white focus:outline-none" value="64">
              </div>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
              <div>
                <div class="text-zinc-500 text-[8px] mb-2">SVG PREVIEW</div>
                <div class="aspect-square bg-zinc-950 border-2 border-[#00d0ff]/40 rounded flex items-center justify-center overflow-hidden">
                  <img id="svg-preview-image" class="hidden max-w-full max-h-full object-contain" alt="SVG preview">
                  <div id="svg-preview-empty" class="text-zinc-600 text-[9px] text-center px-6 leading-relaxed">Paste, upload, draw or generate an SVG source to preview it here.</div>
                </div>
              </div>

              <div>
                <div class="text-zinc-500 text-[8px] mb-2">ANALYSIS</div>
                <div id="svg-analysis" class="bg-zinc-950 border border-zinc-700 rounded p-3 text-[8px] text-zinc-400 leading-relaxed min-h-[88px]">No SVG analyzed yet.</div>
              </div>

              <div>
                <div class="text-zinc-500 text-[8px] mb-2">STATUS</div>
                <div id="svg-status" class="bg-zinc-950 border border-zinc-700 rounded p-3 text-[8px] text-zinc-400 leading-relaxed min-h-[64px]">Idle.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-2 px-5 py-3 border-t border-[#00d0ff]/30">
          <button id="svg-stop-btn" class="hidden text-[10px] py-2 px-4 border-2 border-red-500 bg-zinc-800 text-red-400 hover:bg-red-600 hover:text-white">STOP</button>
          <button id="svg-refresh-btn" class="text-[10px] py-2 px-4 border border-[#00d0ff] bg-zinc-800 text-[#00d0ff] hover:bg-[#00d0ff] hover:text-black">REFRESH</button>
          <button id="svg-close-btn" class="text-[10px] py-2 px-4 border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700">CLOSE</button>
          <button id="svg-confirm-btn" class="flex-1 text-[10px] py-2 border-2 border-[#00d0ff] bg-[#00d0ff] text-black hover:bg-[#00b0dd] font-bold">IMPORT SVG</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
}
