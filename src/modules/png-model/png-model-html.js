import './png-model-workbench.css';

export function injectPngModelHTML() {
  const root = document.createElement('div');
  root.id = 'png-model-html-root';
  root.innerHTML = `
  <div
    id='png-model-modal'
    style='display: none;'
    class='hidden fixed inset-0 bg-black/90 z-[59] flex items-center justify-center p-2 sm:p-4'
    role='dialog'
    aria-modal='true'
    aria-labelledby='png-model-title'
    aria-describedby='png-model-subtitle'
  >
    <div class='png-model-shell bg-zinc-900 border-2 sm:border-4 border-[#7cff00] rounded w-full flex flex-col overflow-hidden'>
      <header class='flex items-center justify-between gap-4 px-4 sm:px-5 py-3 border-b-2 border-[#7cff00]/40'>
        <div>
          <h3 id='png-model-title' data-i18n='pngModelTitle' class='text-[#7cff00] text-xs'>PNG TO FLAT MODEL</h3>
          <p id='png-model-subtitle' class='text-zinc-500 text-[8px] mt-1'>Transparent image to editable 2.5D volume</p>
        </div>
        <div class='flex items-center gap-3'>
          <span id='png-model-unsaved' class='hidden text-amber-300 text-[8px]' role='status'>UNSAVED CHANGES</span>
          <button id='png-model-x' type='button' class='text-zinc-300 text-sm px-3 py-2 border border-transparent hover:border-zinc-600' aria-label='Close PNG model workbench'>X</button>
        </div>
      </header>

      <div class='png-model-workspace flex flex-1 min-h-0 overflow-auto flex-col'>
        <section class='png-model-source-panel w-full border-b border-zinc-700 flex flex-col' aria-label='Source and depth painting'>
          <div class='p-4 border-b border-zinc-800 flex flex-wrap items-center gap-3'>
            <label class='text-[9px] px-3 py-2 border-2 border-[#7cff00] text-[#7cff00] cursor-pointer focus-within:ring-2 focus-within:ring-white'>
              LOAD PNG / WEBP
              <input id='png-model-file' type='file' accept='.png,.webp,image/png,image/webp' class='sr-only'>
            </label>
            <button id='png-model-example-fish' type='button' data-i18n='pngModelTryFish' class='text-[8px] px-3 py-2 border-2 border-cyan-500 text-cyan-300 disabled:opacity-40'>TRY REEF FISH</button>
            <span id='png-model-file-label' class='min-w-0 flex-1 text-zinc-500 text-[8px] truncate'>No image loaded</span>
          </div>

          <div class='png-model-source-scroll flex-1 min-h-0 overflow-visible p-4 space-y-3'>
            <div class='flex flex-wrap justify-between items-center gap-2'>
              <span class='text-zinc-500 text-[8px]'>DEPTH PAINT</span>
              <div class='flex gap-1'>
                <button id='png-model-depth-undo' type='button' data-i18n='undo' disabled class='text-[8px] px-2 py-1 border border-zinc-600 text-zinc-300 disabled:opacity-30' aria-label='Undo depth stroke'>UNDO</button>
                <button id='png-model-depth-redo' type='button' data-i18n='redo' disabled class='text-[8px] px-2 py-1 border border-zinc-600 text-zinc-300 disabled:opacity-30' aria-label='Redo depth stroke'>REDO</button>
                <button id='png-model-clear-depth' type='button' data-i18n='pngModelResetMap' class='text-[8px] px-2 py-1 border border-zinc-600 text-zinc-300'>RESET MAP</button>
              </div>
            </div>
            <div class='relative bg-zinc-950 border-2 border-[#7cff00]/40 min-h-[260px] flex items-center justify-center overflow-hidden'>
              <canvas id='png-model-paint' class='max-w-full max-h-[48vh] touch-none cursor-crosshair' aria-label='Paint depth map' tabindex='0'></canvas>
              <div id='png-model-paint-empty' class='absolute text-zinc-600 text-[8px] text-center px-8'>Load a transparent image. Red adds volume; blue removes it.</div>
            </div>
            <div class='png-model-tools-grid grid grid-cols-2 gap-1' id='png-model-tools' role='toolbar' aria-label='Depth paint tools'>
              <button type='button' data-tool='inflate' class='png-depth-tool text-[7px] p-2 border border-red-500 text-red-300 bg-red-950' aria-pressed='true'>INFLATE</button>
              <button type='button' data-tool='deflate' class='png-depth-tool text-[7px] p-2 border border-blue-500 text-blue-300' aria-pressed='false'>DEFLATE</button>
              <button type='button' data-tool='smooth' class='png-depth-tool text-[7px] p-2 border border-yellow-500 text-yellow-300' aria-pressed='false'>SMOOTH</button>
              <button type='button' data-tool='erase' class='png-depth-tool text-[7px] p-2 border border-zinc-500 text-zinc-300' aria-pressed='false'>ERASE</button>
            </div>
            <label class='block text-zinc-500 text-[8px]'>BRUSH SIZE <output id='png-model-brush-size-value' class='text-white'>8</output><input id='png-model-brush-size' type='range' min='1' max='24' value='8' class='w-full accent-[#7cff00] mt-1'></label>
            <label class='block text-zinc-500 text-[8px]'>BRUSH STRENGTH <output id='png-model-brush-strength-value' class='text-white'>0.25</output><input id='png-model-brush-strength' type='range' min='0.05' max='1' step='0.05' value='0.25' class='w-full accent-[#7cff00] mt-1'></label>
            <p class='text-zinc-500 text-[7px] leading-relaxed'>Paint inside the crop. The local map supports Undo/Redo and remains editable after saving.</p>
          </div>
        </section>

        <section class='png-model-settings-panel w-full border-b border-zinc-700 p-4' aria-label='Model settings'>
          <div class='png-model-settings-grid grid gap-3'>
            <label class='png-model-wide text-zinc-500 text-[8px]'>NAME<input id='png-model-name' type='text' maxlength='80' value='PNG FLAT MODEL' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>TARGET SIZE<input id='png-model-target-size' type='number' min='0.25' max='50' step='0.25' value='4' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>DEPTH PROFILE<select id='png-model-depth-profile' class='png-model-field'><option value='organic'>ORGANIC ROUND</option><option value='balanced'>BALANCED</option><option value='relief'>SHALLOW RELIEF</option></select></label>
            <label class='png-model-wide text-zinc-500 text-[8px]'>
              <span class='flex items-center justify-between'><span>MESH DENSITY</span><output id='png-model-density-value' class='text-[#7cff00]'>40</output></span>
              <input id='png-model-density' type='range' min='12' max='72' step='1' value='40' class='mt-2 w-full accent-[#7cff00]'>
              <span id='png-model-topology-summary' class='mt-1 block text-[7px] text-zinc-500'>No mesh generated</span>
            </label>
            <label class='text-zinc-500 text-[8px]'>MAX DEPTH<input id='png-model-thickness' type='number' min='0.02' max='20' step='0.05' value='0.8' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>BULGE CURVE<input id='png-model-bulge' type='number' min='0.25' max='4' step='0.05' value='1.35' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>EDGE DEPTH <output id='png-model-edge-depth-value' class='text-white'>3%</output><input id='png-model-edge-depth' type='range' min='0' max='0.2' step='0.005' value='0.03' class='mt-2 w-full accent-[#7cff00]'></label>
            <label class='text-zinc-500 text-[8px]'>EDGE FALLOFF <output id='png-model-edge-falloff-value' class='text-white'>18%</output><input id='png-model-edge-falloff' type='range' min='0.02' max='0.5' step='0.01' value='0.18' class='mt-2 w-full accent-[#7cff00]'></label>
            <label class='text-zinc-500 text-[8px]'>CONNECTED PARTS<select id='png-model-component-mode' class='png-model-field'><option value='largest'>MAIN SHAPE</option><option value='all'>ALL PARTS</option></select></label>
            <label class='text-zinc-500 text-[8px]'>CELL COVERAGE <output id='png-model-coverage-value' class='text-white'>20%</output><input id='png-model-coverage' type='range' min='0.01' max='1' step='0.01' value='0.2' class='mt-2 w-full accent-[#7cff00]' aria-describedby='png-model-coverage-hint'><span id='png-model-coverage-hint' class='block mt-1 text-[7px] text-zinc-600'>Lower keeps thin details.</span></label>
            <label class='png-model-wide flex items-center gap-2 text-zinc-300 text-[8px]'><input id='png-model-lock-depth-ratio' type='checkbox' checked class='accent-[#7cff00]'> KEEP DEPTH PROPORTIONAL WHEN RESIZING</label>
            <label class='text-zinc-500 text-[8px]'>ALPHA CUT<input id='png-model-alpha' type='number' min='1' max='254' value='16' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>SMOOTHING<select id='png-model-smoothing' class='png-model-field'><option value='0'>OFF</option><option value='1' selected>LOW</option><option value='2'>MEDIUM</option><option value='3'>HIGH</option><option value='4'>MAX</option></select></label>
            <label class='text-zinc-500 text-[8px]'>PAINT EFFECT<input id='png-model-manual-strength' type='number' min='0' max='2' step='0.05' value='0.75' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>SIDE FINISH<select id='png-model-side-style' class='png-model-field'><option value='sampled'>SAMPLED RIM</option><option value='solid'>SOLID COLOR</option></select></label>
            <label class='text-zinc-500 text-[8px]'>SIDE TINT<input id='png-model-side-color' type='color' value='#665533' class='mt-1 w-full h-[34px] bg-transparent border border-[#7cff00]/40'></label>
            <label class='png-model-wide flex items-center gap-2 text-zinc-300 text-[8px] py-2'><input id='png-model-mirror' type='checkbox' checked class='accent-[#7cff00]'> MIRROR TEXTURE ON BACK</label>
          </div>

          <h4 class='mt-4 text-zinc-500 text-[8px] mb-2'>ANALYSIS</h4>
          <pre id='png-model-analysis' class='bg-zinc-950 border border-zinc-700 p-3 text-[8px] text-zinc-300 leading-relaxed min-h-[148px] whitespace-pre-wrap tabular-nums font-mono overflow-x-auto'>No image analyzed yet.</pre>
          <h4 class='mt-3 text-zinc-500 text-[8px] mb-2'>STATUS</h4>
          <div id='png-model-status' class='bg-zinc-950 border border-zinc-700 p-3 text-[8px] text-zinc-300 leading-relaxed min-h-[66px]' role='status' aria-live='polite'>Choose an image to begin.</div>
        </section>

        <section class='png-model-preview-panel w-full min-w-0 flex flex-col p-4' aria-label='3D preview'>
          <div class='flex flex-wrap items-center justify-between gap-3 text-zinc-500 text-[8px] mb-2'>
            <span>3D PREVIEW - DRAG TO ORBIT / WHEEL TO ZOOM</span>
            <div class='flex flex-wrap items-center gap-2'>
              <div class='flex items-center gap-1' role='toolbar' aria-label='Preview views'>
                <button type='button' data-view='front' data-i18n='pngModelViewFront' class='png-model-view px-2 py-1 border border-zinc-600 text-zinc-300' aria-pressed='false'>FRONT</button>
                <button type='button' data-view='three-quarter' class='png-model-view px-2 py-1 border border-[#7cff00] text-[#7cff00]' aria-pressed='true'>3/4</button>
                <button type='button' data-view='side' data-i18n='pngModelViewSide' class='png-model-view px-2 py-1 border border-zinc-600 text-zinc-300' aria-pressed='false'>SIDE</button>
              </div>
              <label class='flex items-center gap-1 text-zinc-300'><input id='png-model-show-wireframe' type='checkbox' class='accent-[#7cff00]'> POLYGONS</label>
              <label class='flex items-center gap-1 text-zinc-300'><input id='png-model-show-vertices' type='checkbox' class='accent-[#ff3bd4]'> VERTICES</label>
            </div>
          </div>
          <div id='png-model-preview' class='flex-1 min-h-[360px] lg:min-h-[420px] bg-zinc-950 border-2 border-[#7cff00]/40'></div>
          <p class='text-zinc-500 text-[7px] mt-2'>Inspection overlays and camera view only affect this preview; they are not saved or exported.</p>
        </section>
      </div>

      <footer class='flex flex-wrap gap-2 px-4 sm:px-5 py-3 border-t border-[#7cff00]/30'>
        <button id='png-model-refresh' type='button' data-i18n='pngModelRegenerate' class='text-[9px] px-4 py-2 border border-[#7cff00] text-[#7cff00]'>REGENERATE</button>
        <button id='png-model-close' type='button' data-i18n='pngModelClose' class='text-[9px] px-4 py-2 border border-zinc-600 text-zinc-300'>CLOSE</button>
        <button id='png-model-confirm' type='button' disabled class='min-w-[180px] flex-1 text-[9px] py-2 border-2 border-[#7cff00] bg-[#7cff00] text-black font-bold disabled:opacity-30'>CREATE MODEL</button>
      </footer>
    </div>
  </div>`;

  root.querySelectorAll('.png-model-field').forEach((field) => {
    field.className += ' mt-1 w-full bg-zinc-950 border border-[#7cff00]/40 p-2 text-[9px] text-white';
  });
  document.body.appendChild(root);
}
