# Flujo Body-First

## Idea

Separar la construccion del personaje en dos capas:

1. cuerpo base
2. cabeza, pelo, manos, pies y accesorios

Esto reduce mucho el ruido de iteracion porque el equipo deja de rediseñar el esqueleto visual completo cada vez que cambia una cara o un peinado.

## Beneficios

- una misma base sirve para alto, bajo, fuerte o delgado
- el lenguaje visual del cuerpo se mantiene coherente
- la cabeza se puede iterar aparte
- el pelo deja de condicionar el cuerpo
- las manos y zapatos se pueden convertir en modulos

## Cuerpo Base

Cada cuerpo base debe resolver solo:

- torso
- pelvis
- hombros
- brazo superior
- antebrazo
- mano placeholder
- muslo
- espinilla
- pie placeholder

La cabeza queda fuera.

## Variaciones Permitidas

Sobre el cuerpo base se permiten cambios en:

- anchura de hombros
- altura total
- volumen de pecho
- anchura de pelvis
- grosor de brazos
- grosor de piernas
- tamano de mano
- tamano de pie

## Regla Practica

Si el personaje cambia de personalidad o rol pero no cambia de "familia visual", primero se duplica el cuerpo base y despues se monta la cabeza y los accesorios.

## Orden De Trabajo

1. elegir cuerpo base PSX o N64
2. ajustar altura / anchura / grosor
3. montar cabeza
4. montar pelo o casco
5. cambiar manos y pies si hace falta
6. anadir ropa, arma y accesorios

## Pruebas Recomendadas

- un heroe PSX
- un guardia PSX
- una princesa N64
- una cabeza estudio tipo mascota N64

La prueba de cabeza estilo portada ayuda a descubrir enseguida si el sistema necesita mas geometria custom, texturas faciales o ambos.
