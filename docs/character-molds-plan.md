# Plan De Moldes PSX / N64

## Objetivo

Subir los personajes desde un look "retro con sabor voxel" a un look claramente reconocible como PSX o N64 sin romper el pipeline actual de Retrovisor.

El objetivo no es hacer personajes mas complejos por hacerlos mas complejos. El objetivo es mejorar:

- silueta
- lectura de cabeza y pelo
- separacion anatomica del cuerpo
- consistencia de estilo por familia visual
- reutilizacion mediante moldes base

## Diagnostico

Ahora mismo muchos personajes comparten estos problemas:

- cabeza resuelta como un cubo principal con detalles pegados
- pelo resuelto como una tapa o casco cubico unico
- torso y pelvis poco diferenciados
- brazos y piernas demasiado rectos o uniformes
- demasiada dependencia de cubos para zonas donde la silueta pide otra solucion
- mezcla de lenguaje visual PSX y N64 dentro del mismo personaje

Eso da un resultado agradable y legible, pero mas cerca de voxel/Minecraft que de PSX o N64.

## Entregables

Primera iteracion:

1. Un molde base humanoide PSX reutilizable.
2. Un molde base humanoide N64 reutilizable.
3. Una guia de uso para convertir personajes actuales sobre esos moldes.
4. Reglas de prompt para que nuevas generaciones respeten la separacion de formas.

Segunda iteracion:

1. Variantes de pelo y cabeza sobre cada molde.
2. Variantes de torso: heroe, soldado, princesa, aldeano, mago.
3. Biblioteca de accesorios compatibles: casco, capucha, corona, espada, escudo, vara.

## Restricciones Del Pipeline

El plan parte de lo que la herramienta ya soporta:

- CharacterModel con rig humanoide
- jerarquia `parent` + `pivot`
- `vertexColors` y `faceColors`
- `cube`, `sphere`, `cylinder`, `cone`, `capsule`, `torus`, `wedge`, `pyramid`
- texturas y UV por cara para casos PSX
- modo de render PSX con baja resolucion, jitter, dithering y affine texture

No hace falta rehacer el motor para la siguiente subida de calidad.

## Estructura Base Comun

Todo humanoide nuevo debe separar, como minimo:

- cabeza
- cara o frente
- masa principal del pelo
- laterales o parte trasera del pelo
- torso
- pelvis
- brazo superior
- antebrazo
- mano
- muslo
- espinilla
- pie

Si no cumple ese minimo, el personaje casi seguro volvera a leerse como voxel.

## Molde PSX

### Objetivo visual

Parecido a JRPG/aventura PSX:

- silueta dura
- planos visibles
- piezas angulosas
- detalle apoyado en bloques, placas y textura

### Reglas de forma

- Cabeza compacta, algo mas estrecha y mas angular que en N64.
- Cara diferenciada del craneo.
- Pelo dividido en 3-5 masas grandes.
- Torso y pelvis claramente separados.
- Hombros marcados.
- Manos y pies un poco sobredimensionados.
- Evitar redondear por defecto: usar geometria dura primero y curva solo si aporta lectura.

### Reglas de detalle

- Usar `faceColors` en placas, cinturones, casco, hombreras o botas.
- Usar piezas finas frontales para ceja, visera, frente o flequillo.
- Reservar ojos, cejas, boca y rasgos finos para textura cuando haga falta.
- No usar demasiados microcubos faciales.

### Presupuesto orientativo

- Cabeza + pelo: 8-12 piezas
- Torso + pelvis: 4-7 piezas
- Cada brazo: 3-4 piezas
- Cada pierna: 3 piezas

### Criterios de aceptacion

- La cabeza no se confunde con un cubo limpio.
- El pelo no se lee como un solo casco.
- La pelvis existe como masa independiente.
- El personaje sigue funcionando con el modo PSX activado.

## Molde N64

### Objetivo visual

Parecido a plataformas y action-adventure N64:

- volumen claro
- silueta amable y exagerada
- formas redondeadas low-poly
- menos dependencia de textura para vender el personaje

### Reglas de forma

- Cabeza mas grande y amable.
- Uso de `sphere` y `cylinder` low-seg cuando mejoran la silueta.
- Cara con nariz o hocico simple.
- Pelo como casco volumetrico con uno o varios mechones grandes.
- Torso ancho y pelvis compacta.
- Manos y zapatos grandes.

### Reglas de detalle

- Usar `vertexColors` para volumen en vez de meter demasiadas piezas.
- Los ojos y la boca deben ser simples.
- La silueta tiene que seguir funcionando aunque apagues ojos y boca.
- Evitar ruido geometrico pequeno.

### Presupuesto orientativo

- Cabeza + pelo: 7-10 piezas
- Torso + pelvis: 4-6 piezas
- Cada brazo: 3-4 piezas
- Cada pierna: 3 piezas

### Criterios de aceptacion

- La cabeza se ve mas organica sin perder el low-poly.
- Brazos y piernas ganan volumen sin parecer tubos modernos.
- El personaje sigue siendo legible a tamano pequeno.

## Flujo De Produccion

### Fase 1. Molde

Construir primero el personaje base sin ropa compleja ni accesorios finales.

Checklist:

- proporciones cerradas
- pivots correctos
- cabeza/pelo cerrados
- pelvis separada
- manos y pies en escala correcta

### Fase 2. Familia De Variantes

Crear variantes compatibles sin tocar el esqueleto:

- peinados
- casco/capucha/corona
- torsos de cloth, armor y dress
- botas y guantes

### Fase 3. Conversion De Personajes Existentes

Orden recomendado:

1. `hero`
2. `guard`
3. `starlight_princess`

Motivo:

- cubren heroe, armadura y princesa
- fuerzan a resolver pelo, cuerpo, vestido y accesorios
- sirven como prueba de fuego de ambos estilos

### Fase 4. Texturas Faciales PSX

Solo para personajes que lo pidan:

- tile facial 32x32 o 64x64
- ojos, cejas, boca y sombreado pintados
- usar geometria solo para rasgos que afecten de verdad a la silueta

## Regla De Decision Rapida

Usa PSX si el personaje pide:

- armadura angulosa
- drama oscuro
- detalle pintado
- casco, visera, placas, mechones duros

Usa N64 si el personaje pide:

- carisma de silueta
- look amable o cartoon
- volumen redondeado
- lectura fuerte a distancia

## Proxima Iteracion Recomendada

Tras validar los dos moldes base:

1. clonar el molde PSX para `psx_hero_v2`
2. clonar el molde N64 para `n64_princess_v2`
3. comparar ambos a igual distancia y camara
4. extraer una libreria comun de peinados, pelvis, hombros y botas

## Tabla De Proporciones De Moldes Generados

La fuente ejecutable vive en `CHARACTER_MOLD_PROPORTIONS` dentro de
`src/data/templates/generated-character-molds.js`. `npm run check` ejecuta
`scripts/check-character-mold-proportions.mjs`, que mide los bounding boxes de
las piezas generadas y permite una deriva maxima del 10%.

Medidas:

- `altura`: alto total del bounding box generado.
- `cabezas`: altura total dividida por la altura del cranium `HEAD`.
- `hombros`: ancho superior de `TORSO` en anchos de cabeza.
- `brazo`: `ARM_*` + `*_FOREARM`, sin mano, como fraccion de altura.
- `pierna`: `LEG_*` + `*_SHIN`, sin pie, como fraccion de altura.
- `mano`: alto de `HAND_*` en alturas de cabeza.
- `pie`: profundidad de `FOOT_*` en alturas de cabeza.

| Molde | Altura | Cabezas | Hombros | Brazo | Pierna | Mano | Pie |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `psx_humanoid_chibi_mold_cm` | 5.5568 | 2.3153 | 0.7149 | 0.2699 | 0.2288 | 0.1500 | 0.4500 |
| `psx_humanoid_heroic_mold_cm` | 6.6064 | 4.6524 | 1.7121 | 0.3633 | 0.4043 | 0.2535 | 0.8169 |
| `psx_humanoid_slim_mold_cm` | 6.4832 | 4.9115 | 1.3333 | 0.3625 | 0.4323 | 0.2424 | 0.7273 |
| `psx_humanoid_heavy_mold_cm` | 6.1696 | 4.0589 | 1.6129 | 0.3485 | 0.3388 | 0.2632 | 0.8684 |
| `n64_humanoid_round_mold_cm` | 5.9574 | 2.3362 | 0.7462 | 0.2434 | 0.2400 | 0.2039 | 0.5098 |
| `n64_humanoid_classic_mold_cm` | 6.3588 | 3.6970 | 1.1728 | 0.3145 | 0.3713 | 0.2326 | 0.6860 |

## Definition Of Done

La iteracion se considera buena cuando:

- ya no hace falta explicar si un personaje es PSX o N64
- cabeza y pelo son lo primero que venden el estilo
- el cuerpo deja de leerse como "bloque con extremidades"
- las nuevas generaciones del LLM dejan de caer en soluciones voxel por defecto
