# Avatar Forge: caras originales y rig compatible

## Lo que funciona ahora

El botón **ANIMAR CON GLB** acepta los personajes del creador PSX/N64 y los seis cuerpos de Avatar Forge: `psx_chibi`, `psx_heroic`, `psx_slim`, `psx_heavy`, `n64_classic` y `n64_round`.

Al cargar el GLB de Meshy analizado, crea una copia con 24 huesos y tres movimientos: correr, caminar y bailar. El original sigue disponible para editar su cuerpo, cabeza, pelo y facciones. La copia conserva las texturas de la cara, sus UV, su transparencia y su posición respecto a la cabeza.

Un GLB exportado por nosotros también funciona como donante de animaciones para otro cuerpo compatible de la app. Se ha probado ese recorrido usando las cuatro caras nuevas y también un cuerpo sin cabeza del creador retro.

## Cuatro caras nuevas

En **Avatar Forge**, los primeros botones de personajes son:

| Cara | Estilo | Expresión |
|---|---|---|
| Nora | N64 | Ojos vivos y sonrisa abierta |
| Ivo | PSX | Mirada decidida y media sonrisa |
| Mara | N64 | Párpados suaves y sonrisa serena |
| Bruno | PSX | Mirada entrecerrada y gesto pícaro |

Son composiciones editables, con doce dibujos originales: cuatro ojos, cuatro cejas y cuatro bocas. Puedes usar cada rasgo por separado, recolorear el iris y cambiar tamaño o posición. Al elegir una cara nueva, la cámara se acerca a la cabeza.

## Qué se ha corregido

- El pelo recorta los triángulos que cruzan la línea del cabello. Antes los eliminaba enteros y dejaba una tapa casi plana. Ahora conserva los laterales y combina la base con los mechones dibujados.
- Ojos, nariz, boca y orejas tienen anclajes más consistentes. El borde de las orejas permanece visible, con solapamiento sobre el cráneo.
- Las cintas y adornos tienen menos relieve. Gafas, pendientes y adornos del pelo mantienen anclajes independientes cuando se combinan.
- Cada oreja suave de los ejemplos baja de **30.192 a 496 triángulos**. El bisel y la subdivisión anteriores añadían geometría que no mejoraba su silueta.
- El JSON admite las piezas generadas de cabeza y pelo y espera a que sus texturas terminen de cargar antes de devolver el personaje importado.
- El rig corrige el frente interno de Avatar Forge y resuelve los lados de los brazos por su posición real. Esto evita transferir movimientos hacia atrás o colocar los brazos cruzados dentro del torso.

## Cómo probarlo

1. Abre Avatar Forge y elige Nora, Ivo, Mara o Bruno. Cambia los rasgos que quieras y crea el personaje.
2. Selecciónalo y pulsa **ANIMAR CON GLB**. Abre el archivo de Meshy proporcionado o uno de los ejemplos `*-animated.glb`.
3. Cambia el movimiento en la línea de tiempo.
4. Exporta la copia en GLB o JSON. Para seguir editando la receta usa el personaje original.

En `artifacts/avatar-forge-refresh/` hay recetas, JSON completos editables, GLB sin los clips de Meshy, versiones animadas en ambos formatos, vistas de frente/tres cuartos/perfil y un vídeo de los GLB exportados. El paquete `avatar-forge-examples.zip` reúne los ejemplos.

## Límites concretos

- El perfil corresponde al esqueleto de 24 huesos del GLB analizado. Un archivo distinto puede necesitar otro mapeo; la marca Meshy por sí sola no garantiza compatibilidad.
- Crear animaciones nuevas sobre ese esqueleto es viable, por ejemplo en Blender. El editor visual de animaciones de la app todavía necesita una adaptación para editar los clips nativos por cuaterniones. Reproducirlos, conservarlos y exportarlos sí funciona.
- La acción actual convierte cuerpos editables. Todavía no aplica nuestros clips a un Meshy importado manteniendo su malla y sus pesos originales. Los GLB exportados sí se reutilizan como donantes en nuestros cuerpos compatibles.
- La adopción cubre los seis moldes de Forge y el creador retro. Otros proveedores de humanoides, rigs faciales, dedos, contacto de pies y correcciones automáticas de intersecciones requieren trabajo adicional.
- Los rasgos de la cara permanecen rígidos y unidos a la cabeza; este cambio no añade huesos para expresiones ni mandíbula.

Meshy documenta la carga de modelos externos para auto rig y animación, pero eso no demuestra que conserve un rig o clips externos ya creados: [guía oficial de animación](https://docs.meshy.ai/en/webapp/guides/animate).

## Verificación

93 pruebas unitarias y compilación correctas. La ronda de revisión de navegador pasó 20 escenarios de colocación, controles, SVG, accesorios, rig e intercambio. Tras corregir el frente interno se repitieron las pruebas afectadas, incluidos los cuatro recorridos completos de animación, JSON, GLB, escena y redonación. También se verificaron los seis cuerpos de Forge con 24 huesos, cinco superficies faciales texturizadas y los tres clips.

Las capturas se han generado con el constructor real de la app en el puerto 5178; el vídeo usa los GLB exportados. Los fallos encontrados durante la revisión se conservaron en carpetas de pruebas separadas para poder distinguirlos de los resultados finales.
