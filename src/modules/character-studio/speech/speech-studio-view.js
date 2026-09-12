import './speech-studio.css';
import { showEditorWorkspace } from '../../shared/editor-workspaces.js';

export function createSpeechStudioView() {
  const workspace = document.createElement('section');
  workspace.id = 'speech-workspace';
  workspace.className = 'speech-studio';
  workspace.setAttribute('aria-labelledby', 'workspace-speech-tab');
  workspace.setAttribute('role', 'tabpanel');
  workspace.tabIndex = -1;
  workspace.innerHTML = `
    <header class="ss-header"><h2 id="speech-studio-title">Bocas y voz <small>BETA</small></h2><span class="ss-workspace-hint">Personaje · voz · grabación</span></header>
    <div class="ss-layout">
      <aside class="ss-settings">
        <fieldset data-lock><legend>01 / Tu personaje</legend>
          <label>Personaje<select id="speech-character"></select></label>
          <label>Tipo de boca<select id="speech-mouth"><option value="svg">2D · dibujo SVG</option><option value="cutout">2D · capas recortadas</option><option value="jaw">3D · mandíbula</option></select></label>
          <label>Encuadre<select id="speech-view"><option value="face">Webcam · primer plano</option><option value="body">Cuerpo completo</option><option value="scene">Toda mi escena</option></select></label>
          <button id="speech-reframe">Centrar cámara</button>
          <p id="speech-source-note" class="ss-hint"></p>
          <details><summary>Ajustar posición de la boca</summary><div class="ss-anchor">
            <label>Horizontal<input id="speech-x" type="number" step="0.01"></label>
            <label>Altura<input id="speech-y" type="number" step="0.01"></label>
            <label>Profundidad<input id="speech-z" type="number" step="0.01"></label>
            <label>Inclinación °<input id="speech-tilt" type="number" step="1"></label>
            <label>Tamaño<input id="speech-size" type="range" min="0.3" max="2" step="0.05" value="1"></label>
          </div></details>
        </fieldset>
        <fieldset data-lock><legend>02 / Fondo del vídeo</legend>
          <div class="ss-row"><label class="ss-color">Color<input id="speech-bg" type="color" value="#09090b"></label><button id="speech-green">Croma verde</button></div>
          <label class="ss-file">Elegir imagen<input id="speech-background" type="file" accept="image/png,image/jpeg,image/webp"></label>
          <button id="speech-clear-background" hidden>Quitar imagen</button>
          <p class="ss-hint">La imagen se ajusta al encuadre. En «Toda mi escena» también aparecen tus objetos 3D.</p>
        </fieldset>
        <fieldset data-lock><legend>03 / Voz y gestos</legend>
          <button id="speech-demo">▶ Probar una frase</button>
          <label class="ss-file">Cargar audio · máximo 90 s<input id="speech-audio-file" type="file" accept="audio/*"></label>
          <label>Movimiento<select id="speech-driver"><option value="intensity">Según la intensidad</option><option value="phonetic" disabled>Gestos calculados</option></select></label>
          <button id="speech-analyze" disabled>Calcular gestos del audio</button>
          <p id="speech-engine" class="ss-hint">Comprobando análisis local…</p>
          <label>Sensibilidad del micro<input id="speech-gain" type="range" min="0.5" max="5" step="0.1" value="2"></label>
          <label class="ss-file">Importar movimientos · JSON<input id="speech-track-file" type="file" accept=".json,application/json"></label>
        </fieldset>
      </aside>
      <div class="ss-main">
        <div class="ss-stage" id="speech-stage"><canvas id="speech-canvas" width="1280" height="720" aria-label="Escenario del personaje hablando" tabindex="0"></canvas><span class="ss-badge" id="speech-live">WEBCAM / AVATAR</span><span class="ss-stage-caption">Arrastra para girar · rueda para acercar</span></div>
        <div class="ss-transport">
          <button id="speech-mic">Activar micrófono</button><button id="speech-play" disabled>▶ Reproducir voz</button><button id="speech-stop">Parar</button><button id="speech-record" class="ss-record" disabled>● Grabar vídeo</button><button id="speech-fullscreen" title="Ampliar el escenario">⛶ Ampliar</button>
        </div>
        <div class="ss-timeline"><input id="speech-time" aria-label="Tiempo de la voz" type="range" min="0" max="1" step="0.01" value="0"><output id="speech-clock">0:00 / 0:00</output></div>
        <audio id="speech-audio" preload="auto"></audio>
        <p id="speech-status" class="ss-status" role="status" aria-live="polite">Preparando el personaje…</p>
        <p class="ss-hint">El micro mueve la boca en directo según el sonido y no se oye por los altavoces. Para gestos más precisos, carga un audio y calcula sus gestos. Grabación de hasta 90 segundos.</p>
        <section class="ss-export"><div><h3>Reutilizar este personaje</h3><p class="ss-hint">El GLB lleva la animación «speech». La voz se guarda en un archivo separado.</p></div><div class="ss-actions"><button id="speech-add" disabled>Añadir copia a mi escena</button><button id="speech-glb" disabled>Modelo + animación · GLB</button><button id="speech-json" disabled>Movimientos · JSON</button><button id="speech-bundle" disabled>Todo para reutilizar · ZIP</button></div></section>
        <section id="speech-take" class="ss-take" hidden><div><h3>Última toma grabada</h3><p id="speech-take-info" class="ss-hint"></p></div><video id="speech-take-preview" controls playsinline preload="metadata"></video><div class="ss-actions"><button id="speech-take-video">Guardar vídeo</button><button id="speech-take-audio">Guardar voz</button><button id="speech-take-zip">Guardar toma completa · ZIP</button></div><p class="ss-hint">Esta toma se conserva al cambiar a Escena 3D. Descárgala antes de recargar o cerrar Retrovisor. La siguiente grabación la sustituirá.</p></section>
      </div>
    </div>`;
  document.getElementById('main-workspace').insertAdjacentElement('afterend', workspace);
  showEditorWorkspace('speech');
  return { workspace, $: name => workspace.querySelector('#speech-' + name) };
}
