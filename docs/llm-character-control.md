# Control conversacional de personajes

El asistente construye personajes a través de los generadores existentes de Retrovisor. La conversación produce una receta validada y un borrador aislado; el borrador se revisa antes de incorporarlo a la escena. Una referencia externa puede orientar la descripción, pero este flujo solo afirma las formas, piezas y presets que el catálogo y Character Studio pueden expresar.

## Herramientas y recetas

El asistente debe consultar `get_character_capabilities` antes de editar. Las herramientas principales son:

- `search_character_catalog` encuentra IDs exactos de Character Studio y Avatar Forge.
- `get_character_recipe` lee una receta de catálogo, personaje o revisión de borrador.
- `validate_character_recipe` comprueba los campos y valores sin modificar la escena.
- `build_character_draft` crea un borrador a partir de una receta, un `catalog_id` o un `source_id`.
- `patch_character_draft` cambia únicamente las partes solicitadas y conserva las demás.
- `render_character_views` produce vistas PNG frontal, de perfil y de tres cuartos.
- `evaluate_character` mide estructura, límites, triángulos, articulaciones y anclajes.
- `commit_character_draft` incorpora una revisión elegida en una única acción deshacible.
- `discard_character_draft` elimina el borrador sin cambiar la escena.
- `export_character_asset` entrega JSON, GLB o la receta compacta.

La receta canónica de Studio es `retrovisor-character-design`, versión 1. Sus estilos son `psx` y `n64`, y sus partes editables son `body`, `head`, `hair`, `outfit`, `equipment.sword` y `equipment.pauldron`. Los IDs de catálogo tienen el prefijo `studio:`.

Avatar Forge se usa con un `catalog_id` exacto con prefijo `forge:`. En este contrato el agente solo puede editar `name` y `head.scale`; la cara, el cuerpo y el pelo siguen siendo controles del preset y de la interfaz de Avatar Forge. Si el cambio pedido necesita otras partes de Forge, hay que indicarlo y usar sus controles, o empezar con una receta de Studio compatible. No se inventa un preset cuando la búsqueda no encuentra el ID.

Cada operación que muta un borrador lleva un `operation_id` nuevo. Repetir el mismo ID solo repite exactamente la misma petición. `patch_character_draft` exige el `expected_revision` leído del borrador; una edición concurrente se rechaza para no perder trabajo manual.

## Flujo de revisión

1. Consultar capacidades, catálogo y receta; validar los campos antes de construir.
2. Crear el borrador. Sigue fuera de la escena y recibe una revisión inicial `0`.
3. Renderizar las tres vistas y ejecutar `evaluate_character`. Las medidas detectan problemas comprobables, pero no puntúan parecido, estilo ni calidad estética.
4. Aplicar un parche pequeño, volver a renderizar y volver a evaluar. Se conservan los IDs, anclajes y partes no solicitadas.
5. Elegir `chosen_revision` y ejecutar `commit_character_draft`. La incorporación o sustitución del personaje es una sola acción de Undo/Redo. Si el personaje fuente cambió mientras el borrador estaba abierto, el commit informa conflicto y deja intacto el trabajo manual.
6. Exportar el personaje comprometido, o el borrador si todavía se está revisando. `json` contiene la geometría real y la receta persistida; `glb` contiene la geometría, materiales, jerarquía y animaciones exportables; `recipe` solo describe cómo regenerar un diseño.

Hay como máximo **3 correcciones por borrador** después de la revisión inicial y **6 borradores abiertos** a la vez. Los borradores viven en la memoria de la pestaña del editor y no son un guardado: cerrar o recargar esa pestaña los pierde; conviene hacer commit o exportar antes de recargar.

Una secuencia mínima de tres mensajes es:

1. «Crea un espadachín PSX con pelo rubio puntiagudo.» El asistente consulta capacidades, construye el catálogo `studio:psx-swordsman` o una receta validada y muestra las tres vistas.
2. «Añade una espada ancha y una hombrera izquierda; conserva el cuerpo.» El asistente aplica un parche de `equipment`, comprueba que la espada siga anclada a `HAND_R` y vuelve a renderizar.
3. «Haz la cabeza algo más pequeña y guarda el resultado en JSON y GLB.» El asistente crea otra revisión, revisa estructura y vistas, hace un commit deshacible y genera ambos artefactos si la exportación fue solicitada.

El tercer mensaje no convierte una referencia en una copia garantizada: el resultado queda limitado a la receta, las piezas y los presets disponibles.

## Artefactos y contexto del modelo

Los PNG, JSON y GLB completos viajan como artefactos del resultado de la herramienta. El panel ofrece su vista previa y descarga, y el transporte MCP conserva el contenido completo. El texto que vuelve al proveedor usa un resumen compacto para no confundir un resumen con un archivo importable.

Para un artefacto JSON, el contenido completo solo se incluye en el contexto del modelo cuando su representación ocupa como máximo **64.000 caracteres**. Si supera ese límite, el proveedor recibe una indicación explícita de que el JSON se omitió y puede seguir usando la receta o `get_character_recipe`; el artefacto íntegro permanece disponible para el panel/MCP. El límite de contexto del modelo no recorta ni reescribe el archivo descargable.

Si el proveedor confirma visión, las vistas pueden entrar como imágenes no confiables para inspección visual. Si no la confirma, el agente no recibe las imágenes para fingir una evaluación: el panel muestra `visual_review_required`, conserva las tres vistas completas y pide revisión manual. `evaluate_character` sigue siendo útil para estructura, pero no demuestra que la silueta, el rostro o el parecido sean correctos.

## Estado de proveedores locales

La configuración y las credenciales permanecen en el companion; un fallo local no activa un fallback a la nube. El botón **COMPROBAR** prueba el modelo concreto antes de habilitar herramientas.

- En Ollama, el modelo Qwen3 `qwen3:4b-instruct-2507-q4_K_M` ha pasado la prueba de llamadas a herramientas y JSON estructurado. La prueba de imagen no confirmó visión. Todavía no se debe afirmar que ese modelo haya completado de extremo a extremo la secuencia crear → editar → commit → exportar.
- LM Studio solo está cubierto por las pruebas de transporte simuladas. No se ha validado un servicio LM Studio instalado en este entorno.

La comprobación de capacidades es específica de la combinación servidor/modelo y no certifica calidad visual ni similitud con una referencia.


## Validación de esta entrega

La batería del proyecto y la compilación de producción pasan. Se comprobaron el flujo de personajes, las descargas del panel, el puente real del navegador, la edición después de reimportar JSON y GLB, y las caras de Avatar Forge con el GLB de Meshy proporcionado. La auditoría visual pasa para ocho casos de cabeza y seis moldes de cuerpo.

El asistente admite hasta 16 intercambios con el proveedor y 24 llamadas a herramientas por mensaje. Si deja un borrador pendiente, recibe una continuación acotada; nunca se hace commit automáticamente. Si no ejecuta operaciones, el panel lo indica. Estos controles no garantizan que el modelo interprete bien todos los encargos.

La última prueba real con Qwen3 4B creó personajes y un GLB, pero dejó un borrador pendiente, duplicó un personaje y no completó todos los cambios y exportaciones. La secuencia completa sigue sin superar la aceptación con ese modelo. Los adaptadores API y LM Studio tienen pruebas de protocolo; no se presenta esa cobertura como una validación de su calidad con un servicio real.

Los ejemplos están en [la galería local](../artifacts/llm-character-control/index.html) y [el paquete descargable](../artifacts/llm-character-control/personajes-demo.zip). Las recetas pequeñas permanecen en [docs/examples/character-design](examples/character-design/). Las sesiones recuperables y la evaluación de parecido con referencias quedan para una fase posterior.
