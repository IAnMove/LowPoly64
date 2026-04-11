# Estudio De Limites: Cabeza Tipo Portada 64

## Lo que ya funciona bien

- craneo grande y amable
- nariz y hocico saliente
- gorra con cupula y visera
- orejas laterales
- cejas y bigote como masas separadas
- lectura general a distancia

## Lo que sigue costando

- transicion mejilla-hocico sin textura
- ojos expresivos con parpado y mirada fina
- comisuras y sonrisa sin entrar en microgeometria
- bigote organico sin meter demasiados triangulos
- sombreado facial caracteristico de portada

## Conclusion

Con el pipeline actual, la cabeza puede acercarse bastante mediante:

- `SPHERE`
- `CUSTOM`
- `vertexColors`
- piezas separadas para nariz, visera y bigote

El siguiente salto fuerte ya no parece ser "mas cubos" ni siquiera "mas custom" por si solos.
Lo mas probable es que haga falta una de estas dos cosas:

1. textura facial pequena para ojos, mejillas y boca
2. una mezcla de textura facial + muy poca geometria de apoyo

## Decision Recomendada

- Para N64 cartoon/iconico: seguir usando cuerpo base + cabeza con silueta fuerte.
- Para caras de personaje mascota o portada: preparar soporte de textura facial pequena en templates o en un flujo de post-edicion rapido.

## Resultado De La Prueba

- La variante `n64_cover_mascot_v1_cm` confirma hasta donde llega la aproximacion solo con volumen.
- La variante `n64_cover_mascot_v2_cm` anade una `FACE_CARD` con textura serializada y mejora ojos, bigote y lectura de cara sin romper el resto del pipeline.
- Conclusion practica: para N64 generico seguimos con geometria; para "cara portada" el siguiente escalon real es geometria base + texture card dedicada.
