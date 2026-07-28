export function injectPngModelHTML() {
  const root = document.createElement('div');
  root.id = 'png-model-html-root';
  root.innerHTML = `
  <div id='png-model-modal' style='display: none;' class='hidden fixed inset-0 bg-black/90 z-[59] flex items-center justify-center'>
    <div class='bg-zinc-900 border-4 border-[#7cff00] rounded w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden'>
      <header class='flex items-center justify-between px-5 py-3 border-b-2 border-[#7cff00]/40'>
        <div><h3 class='text-[#7cff00] text-xs'>PNG TO FLAT MODEL</h3><p id='png-model-subtitle' class='text-zinc-500 text-[8px] mt-1'>Transparent image to editable 2.5D volume</p></div>
        <button id='png-model-x' class='text-zinc-400 text-sm px-2'>X</button>
      </header>
      <div class='flex flex-1 min-h-0 overflow-hidden'>
        <section class='w-[36%] min-w-[330px] border-r border-zinc-700 flex flex-col min-h-0'>
          <div class='p-4 border-b border-zinc-800 flex items-center gap-3'>
            <label class='text-[9px] px-3 py-2 border-2 border-[#7cff00] text-[#7cff00] cursor-pointer'>LOAD PNG / WEBP<input id='png-model-file' type='file' accept='.png,.webp,image/png,image/webp' class='hidden'></label>
            <span id='png-model-file-label' class='text-zinc-500 text-[8px] truncate'>No image loaded</span>
          </div>
          <div class='flex-1 min-h-0 overflow-auto p-4 space-y-3'>
            <div class='flex justify-between'><span class='text-zinc-500 text-[8px]'>DEPTH PAINT</span><button id='png-model-clear-depth' class='text-[8px] px-2 py-1 border border-zinc-600 text-zinc-400'>RESET MAP</button></div>
            <div class='relative bg-zinc-950 border-2 border-[#7cff00]/40 min-h-[260px] flex items-center justify-center overflow-hidden'>
              <canvas id='png-model-paint' class='max-w-full max-h-[52vh] touch-none cursor-crosshair'></canvas>
              <div id='png-model-paint-empty' class='absolute text-zinc-600 text-[8px] text-center px-8'>Load a transparent image. Red adds volume; blue removes it.</div>
            </div>
            <div class='grid grid-cols-4 gap-1' id='png-model-tools'>
              <button data-tool='inflate' class='png-depth-tool text-[7px] p-2 border border-red-500 text-red-300 bg-red-950'>INFLATE</button>
              <button data-tool='deflate' class='png-depth-tool text-[7px] p-2 border border-blue-500 text-blue-300'>DEFLATE</button>
              <button data-tool='smooth' class='png-depth-tool text-[7px] p-2 border border-yellow-500 text-yellow-300'>SMOOTH</button>
              <button data-tool='erase' class='png-depth-tool text-[7px] p-2 border border-zinc-500 text-zinc-300'>ERASE</button>
            </div>
            <label class='block text-zinc-500 text-[8px]'>BRUSH SIZE <span id='png-model-brush-size-value' class='text-white'>8</span><input id='png-model-brush-size' type='range' min='1' max='24' value='8' class='w-full accent-[#7cff00] mt-1'></label>
            <label class='block text-zinc-500 text-[8px]'>BRUSH STRENGTH <span id='png-model-brush-strength-value' class='text-white'>0.25</span><input id='png-model-brush-strength' type='range' min='0.05' max='1' step='0.05' value='0.25' class='w-full accent-[#7cff00] mt-1'></label>
            <p class='text-zinc-600 text-[7px] leading-relaxed'>Paint inside the green crop. The map remains editable after save/load.</p>
          </div>
        </section>
        <section class='w-[30%] min-w-[300px] border-r border-zinc-700 overflow-y-auto p-4'>
          <div class='grid grid-cols-2 gap-3'>
            <label class='col-span-2 text-zinc-500 text-[8px]'>NAME<input id='png-model-name' type='text' maxlength='80' value='PNG FLAT MODEL' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>TARGET SIZE<input id='png-model-target-size' type='number' min='0.25' max='50' step='0.25' value='4' class='png-model-field'></label>
            <label class='col-span-2 text-zinc-500 text-[8px]'><span class='flex items-center justify-between'><span>MESH DENSITY</span><span id='png-model-density-value' class='text-[#7cff00]'>40</span></span><input id='png-model-density' type='range' min='12' max='72' step='1' value='40' class='mt-2 w-full accent-[#7cff00]'><span id='png-model-topology-summary' class='mt-1 block text-[7px] text-zinc-500'>No mesh generated</span></label>
            <label class='text-zinc-500 text-[8px]'>THICKNESS<input id='png-model-thickness' type='number' min='0.02' max='20' step='0.05' value='0.8' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>BULGE CURVE<input id='png-model-bulge' type='number' min='0.25' max='4' step='0.05' value='1.35' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>ALPHA CUT<input id='png-model-alpha' type='number' min='1' max='254' value='16' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>SMOOTHING<select id='png-model-smoothing' class='png-model-field'><option value='0'>OFF</option><option value='1' selected>LOW</option><option value='2'>MEDIUM</option><option value='3'>HIGH</option><option value='4'>MAX</option></select></label>
            <label class='text-zinc-500 text-[8px]'>PAINT EFFECT<input id='png-model-manual-strength' type='number' min='0' max='2' step='0.05' value='0.75' class='png-model-field'></label>
            <label class='text-zinc-500 text-[8px]'>SIDE COLOR<input id='png-model-side-color' type='color' value='#665533' class='mt-1 w-full h-[34px] bg-transparent border border-[#7cff00]/40'></label>
            <label class='col-span-2 flex items-center gap-2 text-zinc-400 text-[8px] py-2'><input id='png-model-mirror' type='checkbox' checked class='accent-[#7cff00]'> MIRROR TEXTURE ON BACK</label>
          </div>
          <div class='mt-4 text-zinc-500 text-[8px] mb-2'>ANALYSIS</div><div id='png-model-analysis' class='bg-zinc-950 border border-zinc-700 p-3 text-[8px] text-zinc-400 leading-relaxed min-h-[100px]'>No image analyzed yet.</div>
          <div class='mt-3 text-zinc-500 text-[8px] mb-2'>STATUS</div><div id='png-model-status' class='bg-zinc-950 border border-zinc-700 p-3 text-[8px] text-zinc-400 leading-relaxed min-h-[66px]'>Choose an image to begin.</div>
        </section>
        <section class='flex-1 min-w-0 flex flex-col p-4'><div class='flex items-center justify-between gap-3 text-zinc-500 text-[8px] mb-2'><span>3D PREVIEW - DRAG TO ORBIT / WHEEL TO ZOOM</span><div class='flex shrink-0 items-center gap-3'><label class='flex items-center gap-1 text-zinc-300'><input id='png-model-show-wireframe' type='checkbox' class='accent-[#7cff00]'> POLYGONS</label><label class='flex items-center gap-1 text-zinc-300'><input id='png-model-show-vertices' type='checkbox' class='accent-[#ff3bd4]'> VERTICES</label></div></div><div id='png-model-preview' class='flex-1 min-h-[420px] bg-zinc-950 border-2 border-[#7cff00]/40'></div><p class='text-zinc-600 text-[7px] mt-2'>Inspection overlays only affect this preview; they are not saved or exported.</p></section>
      </div>
      <footer class='flex gap-2 px-5 py-3 border-t border-[#7cff00]/30'>
        <button id='png-model-refresh' class='text-[9px] px-4 py-2 border border-[#7cff00] text-[#7cff00]'>REGENERATE</button>
        <button id='png-model-close' class='text-[9px] px-4 py-2 border border-zinc-600 text-zinc-400'>CLOSE</button>
        <button id='png-model-confirm' disabled class='flex-1 text-[9px] py-2 border-2 border-[#7cff00] bg-[#7cff00] text-black font-bold disabled:opacity-30'>CREATE MODEL</button>
      </footer>
    </div>
  </div>`;
  root.querySelectorAll('.png-model-field').forEach((field) => {
    field.className += ' mt-1 w-full bg-zinc-950 border border-[#7cff00]/40 p-2 text-[9px] text-white';
  });
  document.body.appendChild(root);
}
