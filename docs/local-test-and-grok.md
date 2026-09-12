# Probar la candidata local y encargar la revisión a Grok

Instancia preparada en este equipo el 8 de septiembre de 2026, desde `I:\retrovisor`.

- Editor: [http://127.0.0.1:5176/](http://127.0.0.1:5176/).
- Bocas y voz: [http://127.0.0.1:5176/?studio=speech](http://127.0.0.1:5176/?studio=speech).
- Companion y MCP local: puerto `47831`. Mantener abierta la pestaña principal del editor para que pueda recibir acciones.
- Rhubarb 1.14.0 instalado; se ha comprobado cargar y analizar una grabación nueva.

El panel AGENT interno no tiene claves de OpenAI/xAI configuradas en esta instancia. Para usar el modelo de Grok por MCP basta la sesión de Grok: no hay que poner esas claves en Retrovisor. El MCP por sí mismo no incluye un modelo.

## Volver a arrancarla

En PowerShell, desde `I:\retrovisor`:

```powershell
& .\artifacts\local-server\start-retrovisor.ps1
```

Este lanzador local inicia los servicios que no estén escuchando y evita duplicar los que siguen activos. Los logs y los auxiliares de esta instalación están bajo `artifacts/local-server/`, fuera del código versionado. Si esa carpeta se elimina al limpiar artefactos, habrá que recrear esta configuración local o seguir el arranque estándar de [README-MCP](../README-MCP.md).

## Grok ya configurado para este proyecto

Se ha añadido `retrovisor` a `.grok/config.toml`, conservando la configuración de otros servidores. El auxiliar local comparte el token con el companion sin tener que copiarlo en el prompt. Ni el token ni esta configuración específica del equipo deben publicarse.

```powershell
cd I:\retrovisor
grok --trust mcp doctor retrovisor
grok --trust
```

`--trust` permite ejecutar los servidores MCP definidos en este proyecto. La comprobación de esta instancia pasó arranque, negociación y descubrimiento de **31 herramientas**; el servidor informa versión 0.9.0, tomada de la versión del proyecto.

## Qué puede hacer un LLM mediante este MCP

| Área | Disponible hoy |
| --- | --- |
| Escena | Inspeccionar objetos/selección, crear primitivas y plantillas, importar definiciones JSON. |
| Edición | Posición, giro, escala, nombre, color, material, opacidad; agrupar, desagrupar y duplicar. Eliminar exige confirmación; Undo/Redo comparte el historial del editor. |
| Personajes | Consultar capacidades/catálogo y recetas PSX/N64; crear borradores, cambiar cuerpo, cabeza, pelo, ropa, espada y hombrera según el esquema. Forge por este contrato tiene edición más limitada: nombre y escala de cabeza. |
| Revisión | Capturar viewport, renderizar frente/perfil/3⁄4 y evaluar geometría, articulaciones y anclajes. Ver las imágenes requiere un cliente y modelo con visión. |
| Entrega | Elegir revisión y hacer commit en una acción deshacible; exportar el personaje como JSON, GLB o receta. |

Ejemplo: «Crea un espadachín PSX, haz la cabeza más pequeña, ensancha la espada, muéstrame tres vistas y exporta JSON y GLB».

El parecido artístico depende del generador, la receta y las correcciones. El MCP no añade controles que aún no tiene la app ni garantiza que un LLM complete bien cualquier encargo.

Todavía faltan herramientas MCP específicas para el laboratorio de voz, la transferencia de rigs, edición/reproducción de clips, Motion Ripper y pintura de texturas. Esas funciones se usan desde la interfaz. La ampliación lógica es conectar esas acciones al MCP existente, con el mismo historial y validación.

## Mensaje para Grok

Trabaja en `I:\retrovisor`. Lee `docs/grok-release-review-roadmap.md`, `docs/release-0.9.0-review.md` y `docs/local-test-and-grok.md`. La candidata funciona en `http://127.0.0.1:5176/`; su MCP `retrovisor` está configurado en este proyecto. Mantén abierta la pestaña del editor.

Ejecuta la revisión completa de la hoja de ruta: combina herramientas MCP y controles visibles del navegador, comprueba guardado/reapertura, personajes, Forge, texturas, PNG/SVG, animaciones, rigs, agente y Bocas y voz. Registra evidencia y distingue aprobado, fallo y no probado. Corrige los fallos que bloqueen el uso conservando el trabajo ajeno. No trates los tests simulados como pruebas de un proveedor real.

Cuando los recorridos sean correctos, graba un vídeo de la aplicación de 8–12 minutos, en español y 1080p, explicando los pasos para crear, editar, animar, hacer hablar y exportar un personaje. Destaca las bocas SVG, por capas y 3D, el análisis local y el sonido separado del GLB. Entrega MP4, subtítulos SRT, capítulos, informe y archivos usados en `artifacts/grok-release-review/`. No publiques la release ni el vídeo automáticamente.

## Estado de GitHub y comprobaciones

En el momento de preparar esta instancia, `origin/main` apunta a `2891cbb` y no existe la etiqueta remota `v0.9.0`. Los cambios de la candidata continúan en la copia local.

Prueba de la instancia: 4 tests MCP correctos, negociación real de Grok y 31 herramientas. Después se comprobó contra un navegador aislado crear/mover/capturar/deshacer, leer capacidades de personajes y analizar un audio nuevo. Informe local: `artifacts/local-server/verification.json`. No se modificó ninguna escena del usuario.
