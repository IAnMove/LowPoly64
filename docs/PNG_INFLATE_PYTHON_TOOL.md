# PNG inflate → GLB (herramienta Python portable)

El archivo `tools/png_inflate_to_glb.py` convierte una imagen PNG o WebP con
transparencia en una malla 2.5D cerrada y texturizada. Es el port Python del
algoritmo v2 usado por el workbench de Retrovisor: recorte alfa, cuadrícula
acotada, limpieza de componentes, campo de distancias, perfiles de profundidad,
suavizado y paredes laterales.

## Instalación y uso mínimo

```powershell
python -m pip install Pillow
python tools/png_inflate_to_glb.py pez.png pez.glb --depth-profile organic --thickness 1.5 --density 56 --smoothing 2
```

El segundo nombre es opcional; si se omite, se crea un `.glb` junto a la imagen.
La textura queda embebida dentro del GLB.

## Parámetros importantes

- `--target-size 5`: tamaño del eje más largo, en unidades 3D.
- `--density 56`: resolución de la cuadrícula (12–72); más alto, más triángulos.
- `--thickness 1.5`: profundidad máxima total.
- `--bulge 0.9`: curva de abombado.
- `--depth-profile organic`: `balanced`, `organic` o `relief`.
- `--smoothing 2`: pasadas de suavizado (0–4).
- `--alpha-threshold 16` y `--coverage-threshold 0.2`: selección de silueta.
- `--component-mode largest`: conserva el componente mayor; `all` conserva islas.
- `--side-style sampled`: textura los laterales; `solid` usa `--side-color`.
- `--no-mirror-back`: no refleja horizontalmente la textura trasera.
- `--analysis-json resultado.json`: guarda métricas de la malla.

Se pueden aplicar pinceladas locales repetibles. `u` y `v` van de 0 a 1:

```powershell
python tools/png_inflate_to_glb.py pez.png pez.glb `
  --depth-profile organic --thickness 1.5 `
  --stroke inflate,0.58,0.50,20,0.9 `
  --stroke deflate,0.14,0.50,12,0.75 `
  --stroke smooth,0.58,0.50,25,0.7
```

## Cómo pedírselo a Codex en otro proyecto

Copia `tools/png_inflate_to_glb.py` al nuevo proyecto y usa este texto:

> Usa el script `tools/png_inflate_to_glb.py` como herramienta para convertir
> PNG transparentes en GLB simples. Instala Pillow si falta. Para objetos
> orgánicos empieza con `--depth-profile organic --density 56 --thickness 1.5
> --bulge 0.9 --smoothing 2`; ajusta `--target-size` al tamaño deseado. Ejecuta
> el script, comprueba que termina correctamente y entrega el `.glb` generado.

Limitación deliberada: reconstruye un volumen 2.5D simétrico a partir de una sola
vista; no inventa anatomía posterior ni equivale a una reconstrucción 3D real.
