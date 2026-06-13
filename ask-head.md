# Prompt para generar una head.json de Avatar Forge

Copia este prompt en un LLM externo cuando quieras una nueva cabeza para el pipeline mold-only.

```text
Quiero una head.json valida para Avatar Forge de Retrovisor 3D.

Devuelve SOLO JSON valido, sin markdown ni explicaciones.

Objetivo visual:
[DESCRIBE AQUI LA CABEZA: PSX adulto, N64 redonda, caricatura, menton duro, etc.]

Contrato obligatorio:
- La cabeza debe ser low-poly.
- Usa un unico mesh principal llamado HEAD_BASE.
- El formato de geometria es custom con vertices y faces triangulares.
- `axes` debe ser `{ "up": "+y", "front": "+z" }`.
- +Y es arriba.
- +Z es la cara/frente.
- La cabeza debe estar centrada alrededor de X=0 y Z=0.
- La base inferior de la cabeza debe quedar cerca de y=0.
- La altura total recomendada es 1.2 unidades.
- No incluyas pelo, ojos, boca, cejas, orejas separadas ni accesorios como piezas extra salvo que se pidan explicitamente. Los rasgos se montan despues por landmarks.

Estructura exacta:
{
  "name": "snake_case_head_name",
  "axes": { "up": "+y", "front": "+z" },
  "pieces": [
    {
      "name": "HEAD_BASE",
      "geometry": {
        "type": "custom",
        "params": {
          "vertices": [[x, y, z]],
          "faces": [[0, 1, 2]]
        }
      }
    }
  ],
  "landmarks": {
    "eyeL": [x, y, z],
    "eyeR": [x, y, z],
    "noseTip": [x, y, z],
    "mouth": [x, y, z],
    "earL": [x, y, z],
    "earR": [x, y, z],
    "hairline": [x, y, z],
    "crown": [x, y, z],
    "chin": [x, y, z]
  }
}

Rangos recomendados para una cabeza de altura 1.2:
- y min cerca de 0.0, y max cerca de 1.2.
- ancho total X entre 0.55 y 0.95.
- profundidad total Z entre 0.45 y 0.85.
- eyeL.x negativo y eyeR.x positivo, con distancia entre ojos de 0.22 a 0.42.
- eyeL.y y eyeR.y entre 0.55 y 0.75.
- noseTip.y entre 0.43 y 0.62, por debajo de los ojos.
- noseTip.z debe estar en la superficie frontal y normalmente ser mayor que eyeL.z/eyeR.z.
- mouth.y entre 0.28 y 0.48, por debajo de noseTip.
- chin.y entre 0.05 y 0.22.
- hairline.y entre 0.78 y 0.98.
- crown.y entre 1.08 y 1.22.
- earL.x debe estar cerca del extremo izquierdo; earR.x cerca del extremo derecho.
- earL.y y earR.y entre 0.48 y 0.72.
- ear landmarks deben estar a media profundidad, no en la nuca ni delante de los ojos.

Checklist antes de responder:
- Todas las faces son triangulos con indices validos.
- No hay vertices NaN, strings ni null.
- La cara mira hacia +Z.
- Los landmarks estan sobre o muy cerca de la superficie del mesh.
- `eyeL` esta a la izquierda y `eyeR` a la derecha desde el punto de vista del personaje.
- La nariz no esta por encima de los ojos.
- La boca no esta por debajo del chin.
- El crown es el punto mas alto de la cabeza.
- La auditoria de Avatar Forge deberia poder cumplir:
  - distancia del centro de cada rasgo a su landmark <= 0.18 unidades normalizadas
  - browEyeGap >= -0.02
  - eyeNoseGap >= 0
  - noseMouthGap >= 0.015
  - mouthBottom <= 0.9
  - earTop >= 0.38
  - ningun rasgo cae por debajo de chin.y ni por encima de crown.y + 0.1

Ejemplo minimo de orientacion:
{
  "name": "small_psx_portrait_head",
  "axes": { "up": "+y", "front": "+z" },
  "pieces": [
    {
      "name": "HEAD_BASE",
      "geometry": {
        "type": "custom",
        "params": {
          "vertices": [
            [-0.28, 0.12, 0.10],
            [0.28, 0.12, 0.10],
            [-0.36, 0.46, 0.22],
            [0.36, 0.46, 0.22],
            [-0.28, 0.86, 0.18],
            [0.28, 0.86, 0.18],
            [-0.16, 1.16, -0.02],
            [0.16, 1.16, -0.02],
            [-0.24, 0.18, -0.28],
            [0.24, 0.18, -0.28],
            [-0.32, 0.55, -0.34],
            [0.32, 0.55, -0.34],
            [-0.20, 1.05, -0.24],
            [0.20, 1.05, -0.24]
          ],
          "faces": [
            [0, 1, 3], [0, 3, 2],
            [2, 3, 5], [2, 5, 4],
            [4, 5, 7], [4, 7, 6],
            [1, 9, 11], [1, 11, 3],
            [3, 11, 13], [3, 13, 5],
            [5, 13, 7],
            [8, 0, 2], [8, 2, 10],
            [10, 2, 4], [10, 4, 12],
            [12, 4, 6],
            [8, 9, 1], [8, 1, 0],
            [10, 11, 9], [10, 9, 8],
            [12, 13, 11], [12, 11, 10],
            [6, 7, 13], [6, 13, 12]
          ]
        }
      }
    }
  ],
  "landmarks": {
    "eyeL": [-0.15, 0.66, 0.24],
    "eyeR": [0.15, 0.66, 0.24],
    "noseTip": [0.0, 0.53, 0.30],
    "mouth": [0.0, 0.37, 0.23],
    "earL": [-0.36, 0.58, -0.04],
    "earR": [0.36, 0.58, -0.04],
    "hairline": [0.0, 0.88, 0.16],
    "crown": [0.0, 1.16, -0.02],
    "chin": [0.0, 0.15, 0.12]
  }
}
```

Despues de guardar la respuesta en `src/data/avatar/heads/`, registra la cabeza en `src/data/avatar/catalog/head-meshes.js`, mapea un mold en `src/data/avatar/catalog/head-molds.js` y ejecuta:

```powershell
node scripts/derive-head-landmarks.mjs
npm run check
```
