# ideas.md — Crítica y propuestas para Retrovisor / LowPoly64

Escrito tras revisar código, docs, capturas visuales y el historial de commits (2026-07-02).
Es una opinión franca para pensar, no un plan; el plan está en `newtask.md`.

---

## Lo que está bien (y conviene proteger)

**La disciplina de ingeniería es inusualmente buena para un proyecto personal.** Auditorías
visuales con Playwright, sweeps de capturas, `npm run check` como gate, openspec, docs de
decisiones (`mario64-head-limitations.md` es exactamente el tipo de documento que evita
repetir errores). Esto vale más que cualquier feature: es lo que permite delegar tareas a
modelos baratos con confianza. No lo sacrifiques por ir rápido.

**El patrón "contrato JSON + prompt para LLM externo" (`ask.md`, `ask-head.md`) es la idea
más valiosa del proyecto.** Convertir el editor en un runtime de formatos declarativos
validables es justo lo que hace que "crear con LLMs" escale. La dirección correcta es tener
MÁS contratos de este tipo (personajes, clips, decals) y MENOS contenido artesanal en JS.

**El trabajo reciente de cabezas (junio) es mejor de lo que crees.** Las cabezas mesh con
landmarks 3D propios, el casco de pelo procedural y el montaje por landmarks son una base
sólida y reciente. Mirando las capturas, el cráneo en sí ya "lee" como PSX. El problema no
es esa base.

---

## Lo que está mal (crítica franca)

**1. La causa raíz del look Minecraft está identificada y no es la que estás atacando.**
Los cuerpos se montan con ortoedros alineados a los ejes y las caras con geometría 3D
(ojos-esfera saltones). Link de Ocarina es lo contrario: volúmenes ahusados (ningún
paralelepípedo puro en todo el modelo) y cara pintada como textura. Tu propio doc
`mario64-head-limitations.md` llegó a esta conclusión hace semanas ("el siguiente escalón
real es geometría base + texture card") y la conclusión se quedó en un template de prueba
en vez de convertirse en sistema. Mientras las primitivas disponibles sean cajas, esferas y
cilindros rectos, cualquier LLM generará Minecraft, por bueno que sea el prompt: el
vocabulario limita el estilo.

**2. El editor de caras no está "muy mal": está mal donde no lo estás arreglando.** El
núcleo (landmarks + mount plan) es limpio y tiene tests. Lo insostenible son las dos capas
de encima: los rasgos como placas SVG proyectadas (estética "pegatina Mii", z-fighting
conceptual con el estilo N64) y las tablas de offsets manuales por preset×molde
(`MESH_PORTRAIT_PART_PRESET_OFFSETS`), que son trabajo artesanal combinatorio infinito —
7 cabezas × decenas de presets, y cada cabeza nueva multiplica. Mi recomendación clara:
**ni empezar de cero ni seguir puliendo lo de ahora**. Conservar el núcleo, sustituir
rasgos por decals (los sliders Mii pasan a mover dibujos en un canvas 2D, que es trivial y
determinista, en vez de geometría 3D montada), y borrar las tablas de offsets. Empezar de
cero tiraría las 7 cabezas, los landmarks y los tests — lo único del sistema que funciona.

**3. Motion Ripper es la fosa de las Marianas del proyecto.** ~40 ficheros, el módulo más
grande del repo, un change de 27 tareas completado… y sigue sin convencer. El diagnóstico
de `task.md` (retargeting rest-delta sobre rigs con ejes arbitrarios no puede funcionar) es
correcto. El riesgo ahora es el coste hundido: la tentación de "una iteración más". La
decisión valiente ya está escrita en task.md (congelar, y borrar si tras migrar a
HUMANOID_STANDARD no convence) — solo falta ejecutarla. Cada semana que sigue viva sin
congelar, absorbe atención del generador de personajes, que es donde está el valor.

**4. Tres contratos de esqueleto + capa de aliases = deuda que sabotea tu objetivo nº1.**
"Animaciones fáciles de trasladar entre cuerpos" es matemáticamente imposible mientras cada
rig tenga pivots y ejes locales distintos. No hay heurística de compensación que lo
arregle; hay que estandarizar los rigs (mismos huesos, mismos ejes, misma rest pose) y
entonces trasladar un clip es copiar curvas. Es la apuesta de la Fase 3 de newtask.md y es
la única que funciona (es literalmente cómo lo hacen los juegos reales).

**5. Higiene: hay un perfil entero de Chrome dentro del repo** (`.tmp-chrome-svg/`, miles
de ficheros), ~120 ficheros modificados sin commitear, y `index.html` es un monolito de
57 KB con toda la UI. Los dos primeros son arreglo de una tarde y reducen riesgo real de
pérdida/confusión. El monolito de index.html no urge, pero cada feature nueva lo engorda;
plantéate extraer los paneles a templates JS cuando toques cada zona (no como big-bang).

**6. Los templates JSON artesanales de 1.000–2.000 líneas son un callejón sin salida.**
`psx_guard_v2_cm.json` (1.850 líneas) no lo puede mantener nadie, ni humano ni LLM (se come
el contexto). El movimiento correcto ya lo hiciste con los moldes generados
(`generated-character-molds.js`): specs pequeños + builders. Extiende esa filosofía: los
templates del futuro deberían ser "molde + ropa + decal + paleta" (decenas de líneas), no
mil líneas de vértices. Los templates viejos pueden quedarse como están (funcionan), pero
no añadir más de ese estilo.

---

## Ideas que creo que funcionarían bien

**El "test Link" como métrica norte.** Un solo personaje benchmark (héroe élfico, T2.3)
que se reconstruye tras cada mejora del pipeline. Si el benchmark mejora, el proyecto
avanza; si no, la feature era ruido. Mucho mejor que acumular features.

**Bucle de auto-corrección visual para LLMs.** Ya tienes la mitad: capturas automatizadas
por Playwright. La otra mitad: un script `npm run render -- <template.json>` que escupa
front/profile/three-quarter en PNG. Flujo: LLM genera JSON → script renderiza → el LLM (o
uno multimodal) mira las capturas y corrige → repetir. Convertiría "generar personajes con
LLM" de lotería a proceso convergente. Probablemente la feature con mejor ratio
valor/esfuerzo tras los decals.

**Presupuestos de estilo como validación dura.** El estilo PSX/N64 es en gran parte
restricciones: ≤800 triángulos por personaje, texturas ≤64px, paleta limitada, flat
shading. El validador de import podría medir y avisar ("este personaje tiene 3.400 tris,
no parecerá N64"). Las restricciones codificadas enseñan a los LLMs mejor que la prosa.

**Vertex-color shading falso.** Un truco enorme de la época: oscurecer los vértices
inferiores de cada pieza (falso ambient occlusion) y aclarar los superiores. Un
post-proceso automático opcional al importar ("bake retro AO") daría profundidad
inmediata a todos los modelos sin coste de geometría. Barato de implementar sobre
`vertex-colors.js`.

**Los efectos retro que ya tienes (affine + dither) merecen estar en el flujo de
presentación.** Para las capturas de auditoría y para "vender" los personajes, renderizar
con dither + resolución baja hace que el mismo modelo parezca el doble de auténtico.
Considera un modo cámara "PSX preview" de un clic.

**Biblioteca de clips como contenido, no como feature.** Cuando la Fase 3 esté, 15–20
clips buenos (idle variados, walk, run, ataques, emotes) convierten el editor en un
generador de personajes jugables. Los clips son JSON pequeños, perfectos para generarlos
con LLM contra `ask-animation.md`.

**Blender como herramienta de apoyo puntual** (tienes el MCP conectado): no para el
runtime, pero sí para inspeccionar GLB exportados, comparar proporciones contra modelos de
referencia reales, o decimar una malla de referencia a low-poly y convertirla a `custom`.
Útil sobre todo para calibrar la tabla de proporciones de T2.2.

## Ideas que descartaría (y por qué)

- **Más matemática de retargeting** (constraints, filtros, IK de compensación): la vía está
  agotada por diseño; el arreglo es estandarizar rigs, no compensar mejor.
- **Más offsets manuales por preset×molde**: cada uno añadido hoy es deuda que la Fase 4
  borra mañana.
- **Empezar el editor de caras de cero**: tiraría lo único validado (cabezas, landmarks,
  tests). El problema es la capa de rasgos y la UI, no la base.
- **Perseguir el rigor "skeleton real de three.js" (SkinnedMesh + huesos con skinning)**
  a corto plazo: tu sistema de PivotGroups con piezas rígidas ES el estilo N64 auténtico
  (los personajes de la época animaban piezas rígidas, con costuras visibles). SkinnedMesh
  puede ser una v2, no un prerequisito.
- **Más familias/variantes de cabezas antes de que los decals existan**: multiplicar
  contenido sobre un sistema de rasgos que vas a sustituir es trabajo perdido.

---

## Conclusión H5 (2026-07-04): rasgos con profundidad

El truco de dar volumen a ojos, cejas y boca funciona mejor que una cara plana:
una loseta de ~0.18 interocular de profundidad, parcialmente embebida en el
cráneo y parcialmente sobresaliente, se ve en frontal, perfil y tres cuartos sin
exigir offsets frágiles por cabeza. La proporción aproximada de "cabeza de 10 cm
con rasgos de ~1.8-2 cm de grosor" no es ridícula para este estilo; al contrario,
encaja con la exageración N64/PSX y facilita el ajuste visual.

La reconstrucción del héroe élfico confirma que el camino correcto es cráneo
generado + losetas sprite + presets compactos. El sistema supera al v1 en
mantenibilidad porque ya no depende de una malla de cabeza artesanal ni de una
rejilla facial procedural, y además deja un baseline visual reproducible. La
deuda que queda no está en los rasgos, sino en convertir más personajes a specs
pequeñas y en crear una QA visual de benchmarks que impida que una mejora local
estropee perfiles o tres cuartos.

La siguiente iteración debería centrarse en tres cosas: presets de profundidad
editables para las losetas, una galería de benchmarks que compare personajes
clave en tres vistas, y un atlas de sprites más expresivo pero igualmente
regenerable.

## Conclusión H6.3 (2026-07-05): galería benchmark

La galería de cuatro personajes cubre riesgos distintos: `n64_elf_hero_cm`
vigila cráneo generado + losetas + orejas/sombrero; `n64_simple_villager_cm`
vigila el caso humanoide N64 simple con `FACE_DECAL` pequeño; `psx_slim_guard_cm`
vigila casco, arma y lectura PSX estrecha; `n64_cover_mascot_v2_cm` vigila
mascota N64 con face card texturizada, gorra, orejas y overalls. El valor está
en comparar las tres vistas antes de tocar facciones: si una mejora rompe el
perfil o deja el frente mirando hacia atrás, el benchmark lo hace visible.

## En una frase

El proyecto no está bloqueado por falta de esfuerzo sino por vocabulario: dale al pipeline
volúmenes ahusados y caras pintadas (Fases 1–2), estandariza un único rig (Fase 3), deja
que los landmarks que ya construiste hagan su trabajo sin tablas manuales (Fase 4), y el
"parece Minecraft" desaparece porque deja de ser expresable.
