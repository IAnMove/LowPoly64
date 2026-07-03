# Prompt para generar un spec de cabeza Avatar Forge

Copia este prompt en un LLM externo cuando quieras una nueva cabeza para el
generador paramétrico de Avatar Forge.

```text
Quiero un spec de cabeza válido para Avatar Forge de Retrovisor 3D.

Devuelve SOLO JSON válido, sin markdown ni explicaciones.

Objetivo visual:
[DESCRIBE AQUI LA CABEZA: heroica adulta, redonda N64, slim, mandíbula fuerte, etc.]

Contrato obligatorio:
- NO devuelvas vértices ni faces.
- NO incluyas pelo, ojos, boca, cejas, nariz, orejas ni accesorios.
- La cabeza se genera con `buildGeneratedHead(spec)`.
- El resultado debe ser un cráneo low-poly limpio, sin rasgos esculpidos.
- Los ojos, cejas y boca se pintarán después como sprites en un decal.
- Nariz, orejas y pelo se montarán después por landmarks generados.
- El `id` debe empezar por `gen_head_` y ser snake_case.

Estructura exacta:
{
  "id": "gen_head_custom_name",
  "name": "Custom Name",
  "spec": {
    "skullWidth": 0.8,
    "skullDepth": 0.86,
    "jawWidth": 0.6,
    "jawDrop": 0.5,
    "chinShape": 0.35,
    "cheekFullness": 0.35,
    "faceFlatness": 0.6,
    "crownRoundness": 0.6,
    "eyeLineHeight": 0.5
  }
}

Rangos válidos:
- skullWidth: 0.5 a 1.1. Anchura total del cráneo.
- skullDepth: 0.5 a 1.05. Profundidad frente-nuca.
- jawWidth: 0.35 a 0.95. Anchura de mandíbula relativa.
- jawDrop: 0 a 1. 0 = cara corta/redonda, 1 = cara larga.
- chinShape: 0 a 1. 0 = barbilla redonda, 1 = barbilla puntiaguda.
- cheekFullness: 0 a 1. 0 = mejillas planas, 1 = mejillas llenas.
- faceFlatness: 0 a 1. Fuerza de la placa facial donde va el decal.
- crownRoundness: 0 a 1. 0 = coronilla plana, 1 = cúpula redonda.
- eyeLineHeight: 0.42 a 0.6. Altura de línea de ojos.

Reglas visuales:
- Para héroe adulto N64: skullWidth 0.72-0.86, skullDepth 0.84-0.98,
  jawWidth 0.58-0.72, jawDrop 0.62-0.8, crownRoundness 0.45-0.65.
- Para chibi: skullWidth 0.9-1.1, skullDepth 0.85-1.0, jawWidth 0.35-0.52,
  jawDrop 0.1-0.38, eyeLineHeight 0.48-0.54.
- Para cabeza angular: jawWidth 0.7-0.95, chinShape 0.55-0.9,
  crownRoundness 0.15-0.45.
- Para cabeza amable/redonda: cheekFullness 0.55-0.9, chinShape 0.05-0.35,
  crownRoundness 0.65-0.95.
- Mantén faceFlatness entre 0.5 y 0.75 para que el decal facial lea bien.

Checklist antes de responder:
- JSON válido.
- El id empieza por `gen_head_`.
- Todos los campos de `spec` son números finitos.
- Ningún valor sale de rango.
- No hay malla, vértices, faces ni landmarks manuales.
- El cráneo descrito debería funcionar con decal, nariz/orejas 3D y casco de pelo.

Ejemplo:
{
  "id": "gen_head_lean_hero",
  "name": "Lean Hero",
  "spec": {
    "skullWidth": 0.74,
    "skullDepth": 0.9,
    "jawWidth": 0.62,
    "jawDrop": 0.74,
    "chinShape": 0.58,
    "cheekFullness": 0.18,
    "faceFlatness": 0.58,
    "crownRoundness": 0.48,
    "eyeLineHeight": 0.55
  }
}
```

Después de aceptar el JSON, añade el preset a `GENERATED_HEAD_PRESETS` en
`src/data/avatar/generated-heads.js` y ejecuta:

```powershell
node scripts/check-generated-heads.mjs
npm run audit:avatar-visual
npm run check
```
