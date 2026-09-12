import JSZip from 'jszip';
import { speechTrackToJSON } from './speech-core.js';

export function mediaExtension(blob, fallback = 'webm') {
  const type = blob?.type || '';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mp4')) return 'mp4';
  if (type.includes('ogg')) return 'ogg';
  return fallback;
}

/** Portable files; importing into another product still requires its own adapter. */
export async function createSpeechBundle({ model, track, audio, video, character, mode, stage, background, recipe }) {
  const zip = new JSZip(), json = speechTrackToJSON(track);
  const audioName = audio ? 'voice.' + mediaExtension(audio) : null;
  const videoName = video ? 'performance.' + mediaExtension(video) : null;
  const manifest = {
    format: 'retrovisor-speaking-character', version: 1, character, mouthMode: mode,
    model: 'model.glb', speechTrack: 'speech.track.json', animationClip: 'speech',
    audio: audioName, video: videoName, duration: json.duration,
    timeUnit: 'seconds', playback: { startAt: 0, loop: false, audioEmbeddedInGLB: false },
    stage: stage || null, recipe: recipe ? 'character.recipe.json' : null,
    compatibility: { hocuspocus: 'unverified', liveMicrophoneDriverIncluded: false },
  };
  zip.file('model.glb', model); zip.file('speech.track.json', JSON.stringify(json, null, 2));
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  if (audio) zip.file(audioName, await audio.arrayBuffer());
  if (video) zip.file(videoName, await video.arrayBuffer());
  if (background) zip.file('background.' + (background.type.includes('png') ? 'png' : background.type.includes('webp') ? 'webp' : 'jpg'), await background.arrayBuffer());
  if (recipe) zip.file('character.recipe.json', JSON.stringify(recipe, null, 2));
  zip.file('LEEME.txt', `PERSONAJE CON VOZ · RETROVISOR

model.glb contiene el personaje, su rig y la animación de boca llamada speech.
La voz NO está dentro del GLB: está en ${audioName || '(esta exportación no incluye audio)'}.
speech.track.json contiene los movimientos de boca con tiempos en segundos.
${videoName ? videoName + ' es el vídeo ya compuesto, listo para reproducir.' : 'Esta exportación no incluye una grabación de vídeo.'}

En Retrovisor: importa model.glb en el editor y elige la animación speech.
Para revisar o usar otra voz: selecciona ese personaje, abre Bocas y voz, carga
el audio y después speech.track.json. Ajusta el encuadre y vuelve a grabar.

En un motor 3D: carga model.glb, reproduce speech una sola vez y arranca la voz
en el mismo instante. Usa el reloj del audio para mantener ambos sincronizados.
El modelo por sí solo no escucha el micrófono: eso requiere un controlador en
la aplicación de destino. Las bocas SVG se exportan como planos texturizados.

El vídeo conserva el fondo y los objetos de la escena que se veían al grabar.
model.glb contiene únicamente el personaje; guarda la escena completa desde
el editor si también necesitas editar su decorado.

El formato del ZIP es público (manifest.json, versión 1). Todavía no hay un
importador verificado para Hocuspocus. Su integración requiere adaptar ese
programa a estos archivos; no basta con renombrar el ZIP.
`);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
}
