# SPRITE_SPECIFICATIONS.md — Especificaciones detalladas para el atlas v2

Generado para tasks.md **H5.3** (Ampliación del atlas de sprites). Estas especificaciones sirven para que un LLM genere los sprites con máxima precisión. El método es idéntico al set v1 que funciona: pixel art limpio, contorno `#111111` de 1px, fondo transparente, placeholders de tinte EXACTOS.

---

## MÉTODO (reusar del set v1)

1. **Herramienta:** node-canvas o pixel art en editor (se valida con PIL luego).
2. **Resolución:** según la pieza (32×32 ojos, 48×16 cejas, 48×24 bocas).
3. **Contorno:** siempre `#111111` de 1–1.5px, suaviza las formas.
4. **Placeholders de tinte (NO sustituir):**
   - Ojos iris: **`#ff00ff`** (magenta puro)
   - Labios/interior boca: **`#00ff00`** (verde puro)
   - Cejas/pelo: **`#0000ff`** (azul puro)
5. **Blanco:** `#ffffff` puro donde no se tiña (ojos blancos, dientes).
6. **Fondo:** transparente (alpha 0).
7. **Estilo:** Ocarina/Majora — formas grandes, redondeadas, emocionalmente legibles a 32px y al 50% de zoom.
8. **Validación:** `scripts/check-sprites-manifest.mjs` (grep tintSlots correctos, PNG cargable, tamaño exacto).

---

## OJOS (32×32, lado izquierdo; el motor espeja derecha)

### eye_round_big
**Estilo:** Niño en OoT — círculo blanco ENORME con iris gigante.
- Contorno: 1.5px `#111111` alrededor de todo.
- Blanco del ojo: círculo de 26px de diámetro, centrado en (16,16), color `#ffffff`.
- Iris: círculo de 16px de diámetro en (16, 17), relleno `#ff00ff`.
- Brillo: pequeño círculo blanco de 3px en (12, 13) (arriba-izquierda del iris).
- Párpado inferior: línea curva de 1px de ancho, color `#111111`, desde (6,22) a (26,22).
- **Tintslots:** `{ "#ff00ff": "iris" }`

### eye_almond
**Estilo:** Almendra apuntada ligeramente afuera (adulto heroico).
- Contorno: 1px `#111111` óvalo inclinado.
- Blanco: óvalo 24×16px en (16,16) con eje ligeramente rotado (-10°), color `#ffffff`.
- Iris: óvalo 10×14px en (16, 16) con el mismo ángulo, relleno `#ff00ff`.
- Brillo: semicírculo blanco de 2px en la zona superior del iris.
- Párpado superior: línea curva de 1px desde (6, 12) a (26, 10) (apunta arriba-afuera).
- **Tintslots:** `{ "#ff00ff": "iris" }`

### eye_happy_closed
**Estilo:** Cerrado feliz (risa, guiño de satisfacción).
- Contorno: 1px `#111111`.
- Forma principal: arco ∩ de 2px de alto, desde (8, 14) a (24, 14), color `#111111`.
- Sin iris (solo contorno, la aleta es la "cerrazón").
- Pequeña línea de pestañas de 1px debajo si cabe.
- **Tintslots:** `{}` (sin tinte; usar color como está)

### eye_sad_closed
**Estilo:** Cerrado triste (sollozando, ojos X).
- Contorno: 1px `#111111`.
- Forma: arco ∪ (invertido ∩), de 2px, desde (8, 18) a (24, 18), color `#111111`.
- Una pequeña lágrima opcional: pixel de `#00ccff` en (10, 20).
- **Tintslots:** `{}`

### eye_wink
**Estilo:** Cerrado de lado, como un guiño cómplice.
- Contorno: 1px `#111111`.
- Párpado horizontal: línea de 2px desde (6, 15) a (26, 15), color `#111111`.
- Mitad inferior abierta: semicírculo blanco de 10px de alto, 20px de ancho, relleno `#ffffff`.
- Iris en la mitad visible: círculo de 8px en (16, 20), relleno `#ff00ff`.
- Brillo blanco de 1px en el iris.
- **Tintslots:** `{ "#ff00ff": "iris" }`

### eye_surprised
**Estilo:** Ojo sorprendido; círculo grande blanco, iris pequeño.
- Contorno: 1.5px `#111111` círculo de ~28px.
- Blanco: relleno `#ffffff` casi todo el círculo.
- Iris: pequeño círculo de 4px en el centro (16,16), relleno `#ff00ff`.
- Brillo: 2px blanco en (14, 14).
- Cejas levantadas: dos arcos finos de 1px sobre los ojos, de (8,6) a (12,4) y (20,4) a (24,6).
- **Tintslots:** `{ "#ff00ff": "iris" }`

### eye_side_glance
**Estilo:** Mirada de lado (pícaro, sospechoso).
- Blanco ovalado de 22×14px en (16,16), rotado ~15° hacia afuera.
- Iris: 8×10px en (22, 17) (desplazado hacia el borde exterior), relleno `#ff00ff`.
- Contorno: 1px `#111111` alrededor.
- Brillo blanco de 2px en la zona exterior del iris (hacia la "comisura").
- **Tintslots:** `{ "#ff00ff": "iris" }`

### eye_heart
**Estilo:** Ojo en forma de corazón (amor, fascinación).
- Contorno: 1.5px `#111111`.
- Forma: corazón estilizado; dos lóbulos redondeados de ~8px arriba (en (12, 9) y (20, 9)), punta hacia abajo en (16, 24).
- Relleno ENTERO en `#ff00ff` (el iris es el corazón completo).
- Pequeño brillo blanco de 1px en uno de los lóbulos superiores.
- **Tintslots:** `{ "#ff00ff": "iris" }` (se tiñe el corazón entero)

### eye_robot
**Estilo:** Ojo de robot; cuadrado pixelado.
- Contorno: 1px `#111111` alrededor de un cuadrado de 20×20px.
- Interior blanco: 18×18px.
- Iris: cuadrado de 6×6px en (16, 16), relleno `#ff00ff`.
- Línea de scanline: 1px de alto, color `#999999`, atravesando horizontalmente el ojo a mitad de altura (y=19).
- **Tintslots:** `{ "#ff00ff": "iris" }`

---

## CEJAS (48×16)

### brow_worried
**Estilo:** Inclinada hacia arriba en el interior, preocupación.
- Forma: dos líneas curvas de 2px cada una, simétricas, que suben hacia el interior.
- Izquierda (x=8-20): curva desde (8, 14) a (20, 8), color `#0000ff`.
- Derecha (x=28-40): espejo de la izquierda.
- Contorno: 1px `#111111` alrededor.
- **Tintslots:** `{ "#0000ff": "brow" }`

### brow_arch
**Estilo:** Arco fino y elegante (sorpresa sofisticada).
- Forma: arco simétrico suave, altura máxima en el centro ~4px.
- Izquierda (x=8-24): arco desde (8, 13) (punto bajo) a (24, 9) (punto alto).
- Derecha (x=24-40): espejo.
- Ancho de línea: 1.5px `#0000ff`.
- Contorno: 1px `#111111` muy fino alrededor.
- **Tintslots:** `{ "#0000ff": "brow" }`

### brow_zigzag
**Estilo:** Zigzag de dos picos (enfado cómico, agitación).
- Forma: dos triángulos puntiagudos y agresivos.
- Izquierda: pico en (14, 6), base en (8, 12) — (20, 12).
- Derecha: pico en (34, 6), base en (28, 12) — (40, 12).
- Relleno `#0000ff`, contorno `#111111` de 1px.
- **Tintslots:** `{ "#0000ff": "brow" }`

### brow_thin
**Estilo:** Línea fina casi recta (neutral, elegante, poco expresiva).
- Forma: dos líneas casi horizontales con bajada mínima hacia los extremos.
- Izquierda (x=8-24): línea de 1px desde (8, 11) a (24, 10), color `#0000ff`.
- Derecha (x=24-40): línea desde (24, 10) a (40, 11).
- Sin contorno adicional (la línea es el contorno).
- **Tintslots:** `{ "#0000ff": "brow" }`

---

## BOCAS (48×24)

### mouth_grin_teeth
**Estilo:** Sonrisa ancha abierta con dientes blancos (felicidad extrema).
- Forma externa: arco ∩ grande, desde (8, 10) a (40, 10), relleno `#00ff00`.
- Interior (dientes): fila de 4–5 rectángulos pequeños de `#ffffff`, separados por líneas finas de `#111111`.
- Línea media horizontal de `#111111` dividiendo dientes/encía.
- Encía superior: tinta `#00ff00` pero más oscura (~`#00cc00`).
- Contorno: 1.5px `#111111`.
- **Tintslots:** `{ "#00ff00": "lip" }` (solo el interior verde, dientes se mantienen blancos)

### mouth_ooh
**Estilo:** Sorpresa, canto; óvalo pequeño y redondo.
- Forma: óvalo de 12×16px centrado en (24, 12), relleno `#00ff00`.
- Contorno: 1px `#111111`.
- Interior oscuro opcional: pequeño punto de `#7a3b2e` (marrón muy oscuro) en el centro (sugerir profundidad).
- **Tintslots:** `{ "#00ff00": "lip" }`

### mouth_cat
**Estilo:** Gato sonriendo; ":3" — dos semicírculos.
- Dos arcos simétricos de 2px de alto, inclinados ligeramente hacia arriba en los extremos.
- Izquierda: arco desde (10, 12) a (22, 10), relleno `#00ff00`.
- Derecha: arco desde (26, 10) a (38, 12), relleno `#00ff00`.
- Línea central fina de `#111111` conectando los dos arcos en (24, 11).
- Contorno: 1px `#111111`.
- **Tintslots:** `{ "#00ff00": "lip" }`

### mouth_tongue
**Estilo:** Sonrisa con lengua fuera (bromista, travieso).
- Boca abierta: arco ∩ desde (10, 8) a (38, 8), relleno `#00ff00`.
- Lengua: forma de gota desde (24, 8) a (24, 18), ancho máximo 8px en (20, 14) — (28, 14), relleno `#00ff00`.
- Contorno: 1px `#111111` en boca + lengua.
- Brillo: línea fina blanca de 1px en la lengua (reflejo).
- **Tintslots:** `{ "#00ff00": "lip" }` (lengua se tiñe igual que los labios)

### mouth_sad_open
**Estilo:** Abierta hacia abajo (llanto cómico, tristeza dramática).
- Arco ∪ (invertido ∩) desde (10, 6) a (38, 16), relleno `#00ff00`.
- Línea de dientes o encía fina horizontal de `#111111` a media altura (y=11).
- Lágrima opcional: gota de `#99ddff` (azul cielo) que cae desde uno de los ojos si hay espacio arriba en y<0 (o usar (24, -2) si permitimos overflow).
- Contorno: 1px `#111111`.
- **Tintslots:** `{ "#00ff00": "lip" }`

### mouth_smirk
**Estilo:** Sonrisa ladeada asimétrica (confianza, burla).
- Lado izquierdo más bajo: arco desde (10, 14) a (24, 10), relleno `#00ff00`.
- Lado derecho más alto: arco desde (24, 10) a (38, 14), relleno `#00ff00`.
- La comisura izquierda (10, 14) está más baja que la derecha (38, 14), creando la asimetría.
- Contorno: 1px `#111111`.
- IMPORTANTE: respetar el flag `side: 'R'` del motor — cuando `side === 'R'`, el engine espeja horizontalmente, así que la asimetría se invierte correctamente.
- **Tintslots:** `{ "#00ff00": "lip" }`

### mouth_neutral_small
**Estilo:** Línea recta pequeña (neutral, serio, sin emoción).
- Forma: línea horizontal recta de 12px de largo, 2px de alto (grosor), desde (18, 11) a (30, 11), color `#00ff00`.
- Contorno: 1px `#111111` alrededor.
- Sin relleno interior adicional.
- **Tintslots:** `{ "#00ff00": "lip" }`

---

## VALIDACIÓN Y CIERRE (H5.3)

Tras generar los 20 sprites:

1. **Validación de manifest:** 
   ```bash
   node ./scripts/check-sprites-manifest.mjs
   ```
   Verifica: 20 entradas (9 ojos + 4 cejas + 7 bocas), tintSlots correctos, PNG físicos en `src/data/avatar/sprites/`.

2. **Validación de tint-swap:**
   ```javascript
   const { loadSprite } = await import('./src/modules/texture/texture-generator.js');
   const eye = await loadSprite('eye_round_big', { iris: '#3a6ea5' });
   // Debe devolver canvas con iris azul donde había magenta
   ```

3. **Auditoría visual:** sweep `$env:CAPTURE_HEADS='1'; npx playwright test avatar-head-capture` con los 20 sprites × 8 cabezas, mira frente y perfil.

4. **Presets de catálogo:** añadir 20 entradas a `src/data/avatar/catalog/eye-presets.js`, `brow-presets.js`, `mouth-presets.js` con `spriteId` de cada uno, labels i18n ES+EN ("Ojo redondo grande", "Boca gato", etc.).

5. **Commit:** todas las PNG + manifest + presets + tests verdes en `npm run check` (salvo Playwright si es lento).

---

## Notas para Codex

- **Simplificar o expandir:** si 20 sprites es abrumador, empezar con ~10 (1-2 por categoría emoción) y iterar.
- **Herramienta:** si usas node-canvas, validar que los PNG resultantes son idénticos a la spec (verifica con `pngcrush` o PIL).
- **Asset bundling:** vite glob debe incluir los PNG (ya está configurado en `texture-generator.js` línea 44).
- **Pasos por sprite:** generar PNG → validar tamaño y placeholder hex exactos → probar swap de tinte → commit.
