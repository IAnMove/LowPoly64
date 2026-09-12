# Rig Meshy: análisis y compatibilidad con personajes retro

Archivo analizado: `Meshy_AI_Meshy_Merged_Animations.glb` (7.100.368 bytes), proporcionado por el usuario. Los resultados describen este archivo concreto, no todos los posibles rigs de Meshy.

## Qué contiene

| Elemento | Resultado medido |
|---|---:|
| Formato | glTF 2.0 binario, exportado por Blender |
| Mallas / skins | 1 / 1 |
| Vértices / triángulos | 11.316 / 15.033 |
| Huesos | 24, de los cuales 22 influyen en la malla |
| Pesos por vértice | De 1 a 4, suma normalizada |
| Textura | Una imagen PNG de 2048 × 2048 |
| Extensión visible en reposo | 1,70 de alto, 1,70 de ancho, aproximadamente 0,38 de fondo |

Los 3.055 vértices con un solo peso ya se comportan como partes rígidas. El resto combina dos, tres o cuatro huesos. Por tanto, una malla sencilla también puede usar este tipo de esqueleto.

| Clip | Duración en el archivo | Contenido |
|---|---:|---|
| Armature\|clip0\|baselayer | 0,033 s | Una única pose estática |
| Running | 0,667 s | Correr |
| Walking | 1,067 s | Caminar |
| Hip_Hop_Dance_3 | 4,767 s | Baile |

Los clips empiezan en 1/30 de segundo. Solo `Hips` cambia de posición a lo largo de los movimientos; las demás articulaciones cambian su rotación y mantienen sus longitudes. Las escalas son constantes. El cargador real de la app ha reproducido la pose, la caminata y el baile del archivo sin errores de página.

## Esqueleto real

```text
Hips
├─ LeftUpLeg → LeftLeg → LeftFoot → LeftToeBase
├─ RightUpLeg → RightLeg → RightFoot → RightToeBase
└─ Spine02 → Spine01 → Spine
   ├─ LeftShoulder → LeftArm → LeftForeArm → LeftHand
   ├─ RightShoulder → RightArm → RightForeArm → RightHand
   └─ neck → Head
      ├─ head_end
      └─ headfront
```

`head_end` y `headfront` no influyen en ningún vértice. No hay huesos de dedos, mandíbula ni deformaciones faciales por morph targets. Los nombres `Spine02`, `Spine01` y `Spine` recorren la columna de abajo arriba en ese orden.

El nodo `Armature` tiene escala 0,01. Las distancias locales de huesos y las traslaciones de los clips rondan valores de centímetros, mientras que el personaje visible mide 1,70 unidades. Las matrices de enlace y la jerarquía resuelven esa relación: multiplicar todos los datos indiscriminadamente por 0,01 produciría errores.

## Comparación con nuestra app

- Los personajes del creador PSX/N64 tienen 19 pivotes: las 18 articulaciones estándar más el ancla visual `CHEST`. Todavía son grupos y piezas rígidas.
- Motion Ripper ya genera un `SkinnedMesh` con 18 huesos para `HUMANOID_CAPTURE`. Su entrada es vídeo/captura, no clips de un GLB.
- El importador nativo ya puede conservar los huesos, los pesos y los clips de un GLB completo. Faltaba aplicar sus movimientos a nuestros propios personajes.
- Las definiciones de animación tradicionales usan Euler; los clips GLB usan cuaterniones. El adaptador conserva los clips nativos para evitar convertir y degradar esas rotaciones.

## Primer adaptador

1. Selecciona un cuerpo o personaje de **CREAR PERSONAJES** o **Avatar Forge**.
2. En sus propiedades, pulsa **ANIMAR CON GLB / ANIMATE WITH GLB**.
3. Carga el GLB de animaciones. Se comprueba el perfil de 24 huesos y se crea una copia animada.
4. Cambia entre los movimientos en la línea de tiempo. El cuerpo original sigue disponible para editarlo, cambiar su cabeza y producir otra copia.
5. Exporta la copia en GLB o JSON. Su JSON completo usa el contenedor `retrovisor-gltf`, que conserva malla, huesos, pesos y clips.

El adaptador ajusta las posiciones de los huesos a las proporciones del personaje, normaliza sus brazos a una pose de referencia, conserva las orientaciones de enlace del donante y escala el desplazamiento de la pelvis. Las extremidades y la cabeza mantienen pesos rígidos; el tronco reparte pesos entre niveles de columna. Los colores proceden de nuestro personaje; la malla y las texturas del donante no se copian.

Avatar Forge también admite esta conversión: conserva sus superficies faciales texturizadas bajo el hueso Head y adapta su orientación interna. Véase [la revisión de Avatar Forge](avatar-forge-refresh.md) para ejemplos, cobertura actual y límites de edición.

La copia tiene un esqueleto de deformación real. La edición por piezas y el cambio de cabeza se hacen sobre el original; después se genera una nueva copia con el archivo de animaciones.

## Hasta dónde llega y qué sigue

Este primer perfil valida la estructura concreta analizada. Otros GLB pueden usar nombres, padres, ejes y poses distintos y necesitan otro perfil o un mapeo explícito. Compartir la marca Meshy o los nombres de huesos no garantiza por sí solo compatibilidad.

Las mejoras siguientes son una biblioteca de clips sobre un rig canónico independiente del donante, contacto de pies con el suelo, transiciones entre movimientos y más secciones en codos, rodillas y cintura para suavizar la flexión cuando se desee. Las proporciones caricaturescas también pueden requerir correcciones para evitar que manos y pies atraviesen el cuerpo.

Base del formato: [especificación glTF, skins](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins). Los datos concretos de este informe se han extraído del archivo adjunto y comprobado con el código local.

## Validación del resultado

Los dos ejemplos exportados conservan 24 huesos y los tres clips de movimiento. El N64 tiene 520 triángulos y el PSX, 360. Se ha comprobado movimiento real de vértices, pesos normalizados y longitudes de hueso constantes, antes y después de pasar por JSON, GLB y guardado de escena.

Un GLB nuestro también se ha reutilizado como donante para un segundo cuerpo sin cabeza. La posición, rotación y escala del donante en la escena no cambian los clips transferidos. Al exportar dos personajes juntos, cada uno mantiene sus propias pistas, aunque los huesos compartan nombre.

Las nueve pruebas de navegador del creador y de la compatibilidad pasan. Las capturas y la grabación se han generado cargando los GLB exportados, no usando los grupos originales en memoria. Los ejemplos, informes de validación y vídeo están en `artifacts/meshy-rig-analysis/`.

Resultado final: 88 pruebas unitarias, nueve escenarios de navegador y compilación correctos. El contacto de pies y la edición avanzada de clips nativos siguen fuera del alcance de este primer adaptador.
