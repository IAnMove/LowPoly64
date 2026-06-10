## Context

`Avatar Forge` ya tiene una base funcional, pero el catálogo de estilos sigue siendo pequeño, heterogéneo y demasiado dependiente de ajustes manuales en `catalog.js`. Si seguimos añadiendo presets sin una definición editorial previa, el resultado será un selector largo pero inconsistente: familias mezcladas, clipping impredecible y presets que no leen bien en preview.

La ampliación que pide el usuario no es sólo “más contenido”; es una librería de estilos curada, con cobertura suficiente por tipo y una forma disciplinada de construirla en pasadas comprobadas dentro de la app real.

## Goals / Non-Goals

**Goals:**
- Definir un catálogo objetivo de 15 presets curados por tipo para los selectores visibles de `Avatar Forge`.
- Cubrir las familias visuales `PSX`, `N64` y un bloque `Bridge` que sirva de zona intermedia/neutral.
- Añadir metadatos editoriales y técnicos a cada preset para poder filtrar, ordenar y auditar el catálogo.
- Ejecutar la ampliación por pasadas pequeñas, con validación visual en `127.0.0.1:5178` antes de dar cada lote por bueno.
- Mantener defaults legibles: el primer preset visible de cada selector debe componer un avatar usable, no un estado vacío o roto.

**Non-Goals:**
- No subir a 15 el número de `body molds` en este cambio. Los cuerpos siguen siendo bases estructurales, no presets de estilo equivalentes a pelo/ojos/boca.
- No introducir sliders libres, edición procedural o un editor SVG manual.
- No abrir todavía nuevas categorías visibles como `nose` u `ears`.
- No intentar producir los 100+ presets en una sola pasada de implementación.

## Decisions

### 1. El objetivo “15 por tipo” se aplica a los selectores de estilo visibles

**Decision:** el mínimo de 15 presets se aplicará a `head shape`, `hair`, `eyes`, `brows`, `mouth`, `accessory` y `palette`.

**Why:**
- Son los tipos que el usuario percibe como librería de estilo.
- Son compatibles con el flujo actual de compilación de cabeza y preview.
- Permiten crecer mucho la variedad sin tocar pivots, moldes base o compatibilidad de rig.

**Alternatives considered:**
- Incluir `body mold` en el mismo objetivo de 15. Descartado porque dispara el coste de modelado, rig QA y clipping entre familias.

### 2. El catálogo se define primero como objetivo editorial y luego se implementa

**Decision:** antes de crear nuevos assets, se define un catálogo canónico con IDs, familia, intención visual y prioridad de rollout.

**Why:**
- Evita duplicados y presets “casi iguales”.
- Permite decidir primero qué huecos existen realmente.
- Da una base clara para las pasadas de implementación.

### 3. Cada preset tendrá metadatos de librería además de su geometría/markup

**Decision:** cada preset del catálogo tendrá como mínimo:
- `id`
- `label`
- `family` (`PSX`, `N64`, `Bridge`)
- `type`
- `silhouetteGoal`
- `compatibilityNotes`
- `rolloutPass`
- `validationStatus` (`planned`, `draft`, `validated`)

**Why:**
- Hace posible ordenar y auditar el catálogo sin depender sólo del nombre.
- Permite saber qué está definido, qué está implementado y qué ya se validó en vivo.

**Alternatives considered:**
- Guardar sólo `id` y `label`. Descartado porque no resuelve el problema de curación ni de rollout.

### 4. El catálogo de código se dividirá por tipo, no crecerá en un único bloque monolítico

**Decision:** la ampliación deberá mover la definición editorial hacia módulos por tipo o por familia, aunque el consumo final pueda seguir agregándose en un `catalog` unificado.

**Why:**
- `catalog.js` ya empieza a ser difícil de mantener.
- Separar por tipo facilita rollout, revisión y diffs pequeños.

### 5. La librería se construirá por pasadas con validación obligatoria en la app real

**Decision:** cada lote se implementará por bloques de familia/tipo y sólo se marcará como `validated` tras revisión visual en `127.0.0.1:5178`, con capturas guardadas.

**Why:**
- Muchos fallos de esta librería no aparecen leyendo código, sólo al ver el resultado.
- Obliga a cerrar clipping, escala, offsets y lectura visual antes de acumular más deuda.

### 6. El primer preset visible de cada selector debe seguir siendo composable

**Decision:** aunque existan estados `none` cuando haga falta, el orden editorial del selector debe empezar por una opción usable para preview.

**Why:**
- El Forge debe arrancar con una cara/cabeza legible.
- Hace que las capturas y el QA del catálogo sean mucho más rápidos.

## Target Catalog

### Head Shapes (15)
- `psx_buque_01` — Cabezabuque Classic `[PSX]` — cráneo rectangular suavizado, frontal ancho.
- `psx_skull_01` — PSX Skull `[PSX]` — máscara estrecha, mandíbula simple.
- `psx_portrait_01` — Portrait Slim `[PSX]` — adulto fino, frente plana.
- `psx_soft_block_01` — Soft Block `[PSX]` — bloque suave tipo chibi serio.
- `psx_hero_jaw_01` — Hero Jaw `[PSX]` — mandíbula más marcada sin cartoon duro.
- `n64_zeppelin_01` — Zeppelin `[N64]` — ovalado alargado vertical.
- `n64_cartool_01` — Cartool `[N64]` — mejilla amplia y masa central redonda.
- `n64_round_toon_01` — Round Toon `[N64]` — cráneo redondo y amable.
- `n64_hero_oval_01` — Hero Oval `[N64]` — heroico, alto y más atlético.
- `n64_wide_cheek_01` — Wide Cheek `[N64]` — pómulo fuerte, mandíbula blanda.
- `bridge_teen_soft_01` — Teen Soft `[Bridge]` — juvenil y neutro.
- `bridge_longface_01` — Long Face `[Bridge]` — cara más larga sin extremar estilo.
- `bridge_mii_soft_01` — Mii Soft `[Bridge]` — minimalista y muy legible.
- `bridge_baby_round_01` — Baby Round `[Bridge]` — muy suave, cara pequeña.
- `bridge_angular_slim_01` — Angular Slim `[Bridge]` — fino con ligera arista.

### Hair (15)
- `psx_bob_01` — Bob `[PSX]` — masa rígida media, flequillo en dos bloques.
- `psx_side_part_01` — Side Part `[PSX]` — raya lateral definida y compacta.
- `psx_layered_hero_01` — Layered Hero `[PSX]` — mechones apilados tipo protagonista.
- `psx_slick_back_01` — Slick Back `[PSX]` — peinado peinado hacia atrás.
- `psx_buzz_cut_01` — Buzz Cut `[PSX]` — muy corto, volumen mínimo.
- `n64_flip_bob_01` — Flip Bob `[N64]` — bob con puntas hacia fuera.
- `n64_round_bangs_01` — Round Bangs `[N64]` — flequillo curvo y compacto.
- `n64_puff_spikes_01` — Puff Spikes `[N64]` — pinchos redondeados, menos agresivos.
- `n64_wavy_mid_01` — Wavy Mid `[N64]` — media melena ondulada simple.
- `n64_chunky_pony_01` — Chunky Pony `[N64]` — coleta gruesa con bloque trasero.
- `bridge_short_spikes_01` — Short Spikes `[Bridge]` — pinchos cortos neutros.
- `bridge_curtain_long_01` — Curtain Long `[Bridge]` — cortina larga central.
- `bridge_bowl_01` — Bowl Cut `[Bridge]` — casco redondeado sencillo.
- `bridge_low_pony_01` — Low Pony `[Bridge]` — coleta baja limpia.
- `bridge_twin_buns_01` — Twin Buns `[Bridge]` — dos moños compactos.

### Eyes (15)
- `psx_narrow_01` — Narrow `[PSX]` — ojos estrechos, lectura seria.
- `psx_almond_soft_01` — Almond Soft `[PSX]` — almendrados suaves.
- `psx_almond_sharp_01` — Almond Sharp `[PSX]` — almendrados tensos.
- `psx_hero_square_01` — Hero Square `[PSX]` — blancos algo más rectos.
- `psx_heavy_lid_01` — Heavy Lid `[PSX]` — párpado pesado, mirada cansada.
- `n64_wide_01` — Wide `[N64]` — abiertos y claros.
- `n64_cartool_oval_01` — Cartool Oval `[N64]` — óvalos simples y centrados.
- `n64_round_toon_01` — Round Toon `[N64]` — redondos y caricaturescos.
- `n64_bead_01` — Tiny Bead `[N64]` — muy pequeños, muy lowpoly.
- `n64_sleepy_01` — Sleepy `[N64]` — adormecidos y blandos.
- `bridge_dot_01` — Dot `[Bridge]` — mínimo y funcional.
- `bridge_smile_01` — Smile Eyes `[Bridge]` — ojos cerrados sonrientes.
- `bridge_droopy_01` — Droopy `[Bridge]` — caídos, tristes.
- `bridge_confident_half_01` — Confident Half `[Bridge]` — semientornados.
- `bridge_intense_01` — Intense `[Bridge]` — tensión heroica neutral.

### Brows (15)
- `soft_01` — Soft `[Bridge]` — ceja básica suave.
- `straight_01` — Straight `[Bridge]` — recta limpia.
- `angled_01` — Angled `[Bridge]` — inclinada intensa.
- `short_01` — Short `[Bridge]` — corta y compacta.
- `psx_serious_01` — Serious `[PSX]` — bloque más duro.
- `psx_flat_thick_01` — Flat Thick `[PSX]` — gruesa y plana.
- `psx_sharp_v_01` — Sharp V `[PSX]` — pico pronunciado.
- `n64_curve_01` — Curve `[N64]` — curva amable.
- `n64_gentle_round_01` — Gentle Round `[N64]` — redondeada ligera.
- `n64_sleepy_low_01` — Sleepy Low `[N64]` — baja y cansada.
- `bridge_arched_soft_01` — Arched Soft `[Bridge]` — arco natural.
- `bridge_tiny_tilt_01` — Tiny Tilt `[Bridge]` — minimal inclinada.
- `bridge_worried_rise_01` — Worried Rise `[Bridge]` — preocupación.
- `bridge_hero_block_01` — Hero Block `[Bridge]` — heroica compacta.
- `bridge_mischief_01` — Mischief `[Bridge]` — ladeada juguetona.

### Mouth (15)
- `smile_01` — Smile `[Bridge]` — sonrisa estándar.
- `neutral_01` — Neutral `[Bridge]` — línea neutra.
- `grin_01` — Grin `[Bridge]` — sonrisa amplia.
- `open_01` — Open `[Bridge]` — boca abierta simple.
- `psx_line_01` — PSX Line `[PSX]` — línea fina adulta.
- `psx_smirk_left_01` — Smirk Left `[PSX]` — media sonrisa izquierda.
- `psx_smirk_right_01` — Smirk Right `[PSX]` — media sonrisa derecha.
- `psx_frown_01` — Frown `[PSX]` — ceño oral negativo.
- `n64_bean_01` — Bean `[N64]` — boca en frijol, caricaturesca.
- `n64_tiny_smile_01` — Tiny Smile `[N64]` — sonrisa corta.
- `n64_wide_open_01` — Wide Open `[N64]` — abierta grande.
- `bridge_tiny_neutral_01` — Tiny Neutral `[Bridge]` — mínima.
- `bridge_pout_01` — Pout `[Bridge]` — morro compacto.
- `bridge_o_shape_01` — O Shape `[Bridge]` — sorpresa.
- `bridge_toothy_grin_01` — Toothy Grin `[Bridge]` — sonrisa con diente.

### Accessories (15 + `none`)
- `ribbon_blue` — Ribbon `[Bridge]` — lazo superior.
- `round_glasses` — Round Glasses `[Bridge]` — gafas redondas.
- `star_clip` — Star Clip `[Bridge]` — estrella lateral.
- `psx_square_glasses_01` — Square Glasses `[PSX]` — gafas rectas.
- `psx_visor_strip_01` — Visor Strip `[PSX]` — visera/visor estrecho.
- `psx_bandana_knot_01` — Bandana Knot `[PSX]` — bandana simple.
- `psx_eyepatch_01` — Eyepatch `[PSX]` — parche.
- `n64_headband_sport_01` — Sport Headband `[N64]` — cinta deportiva.
- `n64_goggles_up_01` — Goggles Up `[N64]` — gafas sobre pelo.
- `n64_flower_pin_01` — Flower Pin `[N64]` — flor lateral.
- `n64_leaf_clip_01` — Leaf Clip `[N64]` — hoja decorativa.
- `bridge_hairpin_duo_01` — Hairpin Duo `[Bridge]` — dos pasadores.
- `bridge_tiny_horns_01` — Tiny Horns `[Bridge]` — cuernos pequeños.
- `bridge_jewel_circlet_01` — Jewel Circlet `[Bridge]` — tiara baja.
- `bridge_mono_earring_01` — Mono Earring `[Bridge]` — pendiente único.

### Palettes (15)
- `warm_rose` — Warm Rose `[Bridge]`
- `olive_gold` — Olive Gold `[Bridge]`
- `cool_ash` — Cool Ash `[Bridge]`
- `sunny_tan` — Sunny Tan `[Bridge]`
- `velvet_night` — Velvet Night `[PSX]`
- `bubble_pop` — Bubble Pop `[N64]`
- `porcelain_blue` — Porcelain Blue `[PSX]`
- `cocoa_cream` — Cocoa Cream `[Bridge]`
- `mint_lilac` — Mint Lilac `[N64]`
- `autumn_amber` — Autumn Amber `[PSX]`
- `denim_coral` — Denim Coral `[Bridge]`
- `ivory_wine` — Ivory Wine `[PSX]`
- `rust_olive` — Rust Olive `[Bridge]`
- `arcade_teal` — Arcade Teal `[N64]`
- `sandstone_plum` — Sandstone Plum `[Bridge]`

## Risks / Trade-offs

- **Catálogo demasiado grande en un único fichero** → dividir por tipo/familia antes de que la implementación se vuelva inmantenible.
- **Mucho volumen pero poca calidad** → exigir validación visual en vivo y no marcar presets como completos sólo porque “existen”.
- **Clipping entre tipos** → revisar cada lote sobre `psx_chibi`, `psx_heroic` y `n64_classic`.
- **Deriva entre definición editorial y catálogo real** → mantener IDs y labels estables desde esta fase de diseño.
- **Defaults vacíos o absurdos tras ampliar el catálogo** → reservar el primer puesto de cada selector para un preset usable y representativo.

## Migration Plan

1. Crear la definición canónica del catálogo ampliado y su metadata.
2. Reestructurar el origen de datos del catálogo para soportar crecimiento por tipo/familia.
3. Implementar las pasadas de contenido en lotes pequeños con validación real en `5178`.
4. Añadir QA visual y checks de regresión para asegurar que el Forge sigue siendo navegable y que las combinaciones básicas no se rompen.
5. Cerrar el cambio cuando todos los tipos hayan alcanzado el mínimo de 15 presets validados.

## Open Questions

- Si en una segunda ampliación conviene abrir `nose` y `ears` como tipos visibles.
- Si `accessory` debe contar 15 presets reales además de `none` o si `none` entra en el conteo de UX.
- Si la UI final deberá introducir agrupación o filtros por familia (`PSX`, `N64`, `Bridge`) cuando el catálogo ya esté completo.
