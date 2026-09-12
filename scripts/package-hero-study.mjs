import fs from 'node:fs/promises';
import JSZip from 'jszip';

const folder = 'artifacts/psx-hero-art-direction';
const zip = new JSZip();
const files = (await fs.readdir(folder)).filter(name => /^(0[1-5]-.+\.png|06-editor\.png|reopened-glb-.+\.png|cloud-hero\.(json|glb|recipe\.json)|index\.html|verification\.json|editor-verification\.json)$/.test(name));
for (const filename of files) zip.file(filename, await fs.readFile(`${folder}/${filename}`));
zip.file('LEEME.txt', `HÉROE PSX / CLOUD · RETROVISOR

En la aplicación: Estudio de personajes → Nuevo · Héroe PSX / Cloud.

cloud-hero.json: personaje editable, rig y animaciones.
cloud-hero.glb: personaje y 13 animaciones, listo para importar.
cloud-hero.recipe.json: receta reproducible con perfiles y proporciones.
index.html: galería de las cinco etapas. Abrir tras extraer el ZIP.
06-editor.png: ventana de creación dentro de la aplicación.

El modelo tiene 2.383 triángulos. Los archivos usan la postura de reposo;
las imágenes de la etapa 5 muestran una pose de presentación.

Puedes crear un cuerpo sin cabeza y aplicarle después otra cabeza.
Los perfiles son reutilizables y permiten ajustar hombros, cintura,
brazos, piernas, botas, mandíbula, colores y equipo.

Es una interpretación geométrica estilizada. No incluye texturas pintadas
ni animación facial; pueden seguir afinándose la silueta y las facciones.
`);
const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
const filename = `${folder}/cloud-psx-kit.zip`;
await fs.writeFile(filename, output);
const verified = await JSZip.loadAsync(output);
for (const name of ['cloud-hero.json', 'cloud-hero.glb', 'index.html', '05-pose-three-quarter.png']) if (!verified.file(name)) throw new Error('Missing deliverable: ' + name);
console.log(JSON.stringify({ filename, bytes: output.length, entries: Object.keys(verified.files).length }));
