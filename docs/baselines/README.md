# Baselines visuales

Capturas de referencia congeladas ANTES de cada cambio grande de geometría, para
poder juzgar el "después" de las fases de `newtask.md`.

## 2026-07/

Estado del pipeline al cierre de la Fase 0 (branch `fable/fixing_problems`).

- `psx_mesh_portrait_*` — las 7 cabezas mesh × bundle por defecto, vistas
  front/profile/back. Generadas con el sweep
  `CAPTURE_HEADS=1 npx playwright test avatar-head-capture`.
- Resto (`psx_chibi`, `psx_heroic`, `psx_slim`, `psx_heavy`, `n64_classic`,
  `n64_round`) — los 6 moldes de cuerpo, vistas front/profile/three-quarter.
  Generadas con `CAPTURE_BODIES=1 npx playwright test avatar-body-capture`.

Generadas el 2026-06-12 durante el trabajo de Avatar Forge (entre los commits
`4f049be` y `6a77949`); el estado commiteado más cercano al contenido real es
`e67696e`. Sirven como "antes" para las fases 1–2 (geometría ahusada) y 4 (caras
decal). Al terminar cada fase, regenerar los sweeps y añadir una carpeta nueva
con fecha en lugar de sobrescribir esta.
