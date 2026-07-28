# Retrovisor + MCP: guía de uso y evaluación

Esta guía explica cómo conectar Retrovisor con Codex, Grok Build, Kimi Code u
otro cliente MCP local, qué información recibe el modelo, qué puede hacer hoy y
cómo medir sus limitaciones.

## Respuesta corta: ¿funciona sin claves API?

Sí, con un matiz importante:

| Modo | Clave de proveedor en Retrovisor | Dónde se ejecuta el modelo |
|---|---:|---|
| Codex/Grok/Kimi conectado por MCP | No | En el servicio del cliente, usando su login, suscripción o clave |
| Panel `AGENT` dentro de Retrovisor | Sí: `OPENAI_API_KEY` o `XAI_API_KEY` | OpenAI o xAI Responses API |
| Cliente MCP con modelo local | No | En el equipo local; el cliente local no está incluido en este repositorio |

El servidor MCP y el puente navegador ↔ Node son locales y no llaman a un
modelo. Codex, Grok o Kimi sí necesitan obtener una inferencia de algún sitio.
Si se inicia sesión con una suscripción, no hay que poner una clave API en
Retrovisor, pero sigue habiendo comunicación con el servicio del proveedor y
se consumen los límites o créditos de esa suscripción.

Si se necesita funcionamiento totalmente offline, hace falta conectar este MCP
a un agente compatible respaldado por un modelo local. Retrovisor todavía no
incluye ni configura ese agente.

Referencias oficiales:

- [Autenticación de Codex](https://learn.chatgpt.com/docs/auth)
- [MCP en Codex](https://learn.chatgpt.com/docs/extend/mcp)
- [MCP en Grok Build](https://docs.x.ai/build/features/mcp-servers)
- [Autenticación de Grok Build](https://docs.x.ai/build/enterprise)
- [MCP en Kimi Code](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/mcp.html)

## Qué sabe el modelo cuando se conecta

Al iniciar MCP, el cliente recibe:

- las instrucciones generales de Retrovisor;
- la lista de herramientas;
- la descripción y el esquema JSON estricto de cada herramienta;
- las anotaciones de lectura, escritura o acción destructiva.

Eso permite al cliente decidir qué herramienta utilizar, pero no le da
omnisciencia sobre la aplicación. El modelo:

- no observa continuamente el viewport;
- no conoce la escena actual hasta llamar a herramientas como
  `get_scene_summary` o `list_objects`;
- no recibe automáticamente los cambios manuales posteriores;
- puede perder detalles antiguos cuando el cliente compacte su contexto.

Para trabajar de forma fiable debe volver a inspeccionar la escena, usar IDs
estables `rv_*`, ejecutar la modificación y llamar a `capture_viewport`.
Retrovisor devuelve resultados estructurados con IDs afectados, advertencias y
un resumen posterior. La captura se entrega como una imagen MCP real; que el
modelo pueda verla depende de que el cliente y el modelo admitan imágenes
procedentes de herramientas.

Los nombres, metadatos y objetos importados se marcan como datos no confiables:
el modelo no debe tratarlos como instrucciones.

## Puesta en marcha

### 1. Instalar y arrancar Retrovisor

Desde la raíz del repositorio:

```powershell
npm install

$token = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
$env:RETROVISOR_AGENT_TOKEN = $token
$token

npm run agent:dev
```

Guarda o copia el valor mostrado por `$token`; hará falta en la terminal del
cliente. No lo incluyas en Git. `npm run agent:dev` inicia:

- Vite en `http://127.0.0.1:5173`;
- el servicio compañero en `127.0.0.1:47831`.

Abre `http://127.0.0.1:5173` y mantén la pestaña visible. El indicador del panel
`AGENT` debe mostrar que el puente local está conectado.

También se pueden iniciar los procesos por separado:

```powershell
npm run dev
npm run agent:companion
```

Ambos deben heredar el mismo `RETROVISOR_AGENT_TOKEN`.

### 2. Abrir otra terminal para el cliente

En una segunda terminal:

```powershell
cd I:\retrovisor_codex
$env:RETROVISOR_AGENT_TOKEN = "<PEGA_EL_MISMO_TOKEN>"
```

Elige uno de los clientes siguientes.

## Opción A: Codex

Codex permite iniciar sesión con ChatGPT o usar una clave API propia. Con
`codex login`, el consumo se aplica a la suscripción o workspace; con una clave
API, se factura como uso de API.

1. Inicia sesión:

   ```powershell
   codex login
   ```

2. Integra el bloque de
   [docs/examples/codex-mcp.example.toml](docs/examples/codex-mcp.example.toml)
   en `.codex/config.toml` del proyecto. No sobrescribas una configuración
   existente: combina ambos archivos.

3. Comprueba y abre Codex:

   ```powershell
   codex mcp list
   codex
   ```

4. Dentro de Codex, `/mcp` muestra el estado del servidor.

Codex admite STDIO y Streamable HTTP, lee las instrucciones MCP del servidor y
comparte la configuración entre CLI, extensión y aplicación de escritorio en
el mismo host.

## Opción B: Grok Build

Grok Build permite login de navegador o dispositivo, además de `XAI_API_KEY`.
El login evita guardar una clave de xAI en Retrovisor.

1. Inicia sesión:

   ```powershell
   grok login
   ```

2. Copia o combina
   [docs/examples/grok-mcp.example.toml](docs/examples/grok-mcp.example.toml)
   como `.grok/config.toml`, o añade el servidor desde el proyecto:

   ```powershell
   grok mcp add --scope project retrovisor -- node server/agent/mcp-stdio.js
   ```

3. Verifica y abre el cliente:

   ```powershell
   grok mcp doctor retrovisor
   grok mcp list
   grok
   ```

Dentro de Grok, `/mcps` abre el estado de las conexiones.

## Opción C: Kimi Code

Kimi Code admite STDIO y HTTP. Para Retrovisor se recomienda HTTP local porque
`bearerTokenEnvVar` permite usar el token sin escribirlo en JSON.

1. Si todavía no está instalado, usa el instalador oficial en PowerShell y
   abre después una terminal nueva:

   ```powershell
   irm https://code.kimi.com/kimi-code/install.ps1 | iex
   kimi --version
   ```

   En Windows, Kimi también necesita Git for Windows porque utiliza Git Bash
   como entorno de shell.

2. Copia o combina
   [docs/examples/kimi-mcp.example.json](docs/examples/kimi-mcp.example.json)
   como `.kimi-code/mcp.json`.

3. Inicia Kimi desde la raíz del proyecto:

   ```powershell
   cd I:\retrovisor_codex
   kimi
   ```

4. En el primer inicio, escribe `/login`, elige `Kimi Code (OAuth)` y completa
   el flujo de código de dispositivo. Después escribe `/mcp`: debe aparecer
   `retrovisor` conectado y con 20 herramientas. `/mcp-config` permite editar
   la configuración.

Las llamadas que no coincidan con una regla de permisos pueden solicitar
aprobación del usuario.

## Opción D: panel `AGENT` de Retrovisor

El panel interno no utiliza la sesión de Codex, Grok o Kimi. Llama directamente
a OpenAI o xAI desde el servicio compañero:

```powershell
$env:RETROVISOR_AGENT_TOKEN = "<TOKEN_LOCAL>"
$env:OPENAI_API_KEY = "<CLAVE_OPENAI>" # opcional
$env:XAI_API_KEY = "<CLAVE_XAI>"       # opcional
npm run agent:dev
```

Las claves permanecen en el proceso Node: no llegan al bundle, al navegador ni
a `localStorage`. Sin claves, Retrovisor y MCP siguen funcionando y el panel
muestra `SIN CREDENCIALES`.

## Qué puede hacer actualmente

Herramientas de lectura:

- `get_application_status`
- `get_scene_summary`
- `list_objects`
- `get_object`
- `get_selection`
- `capture_viewport`
- `serialize_scene`
- `export_selected_object`

Operaciones normales y reversibles:

- seleccionar objetos por ID estable;
- añadir primitivas o templates;
- importar una definición JSON de objeto;
- cambiar en una sola llamada posición, rotación y escala de un objeto;
- cambiar nombre, color, material y opacidad;
- agrupar, desagrupar y duplicar objetos;
- ejecutar `undo` y `redo`.

Operación destructiva:

- `delete_objects` exige `confirm: true` y está anotada como destructiva.
- El panel interno siempre pausa para un clic humano de aprobar o denegar.
- En un cliente externo, la aprobación visible depende también de la política
  de permisos de ese cliente.

No existen herramientas MCP de filesystem, shell, túneles, navegación arbitraria
ni evaluación de JavaScript.

## Prueba rápida recomendada

Empieza con esta petición:

> Inspecciona la instancia activa de Retrovisor sin modificarla. Resume la
> escena, lista como máximo 10 objetos y dime qué herramientas de escritura
> utilizarías, pero todavía no las ejecutes.

Después prueba el ciclo visual:

> Añade un cubo azul llamado MCP_TEST en la posición [2, 1, 0]. Inspecciona el
> objeto creado, captura el viewport y corrige su posición si no se aprecia
> claramente. Devuelve su ID estable y todas las herramientas utilizadas.

Comprueba el historial:

> Mueve MCP_TEST una unidad hacia arriba. Verifica el resultado, ejecuta undo,
> comprueba que volvió a su posición anterior, ejecuta redo y compruébalo otra
> vez.

Comprueba seguridad destructiva:

> Intenta borrar MCP_TEST, pero no confirmes el borrado hasta que yo lo apruebe
> explícitamente.

Resultados esperados:

- el cliente inspecciona antes de escribir;
- conserva y reutiliza el ID `rv_*`;
- la interfaz refleja cada cambio;
- usa `capture_viewport` después de modificar;
- `undo` y `redo` restauran la escena;
- el borrado se rechaza sin `confirm: true` o el cliente pide aprobación.

## Cómo explorar los límites actuales

Estas pruebas distinguen capacidad del servidor, calidad del modelo y política
del cliente:

| Prueba | Qué revela |
|---|---|
| Modifica manualmente la escena entre dos preguntas | Si el agente vuelve a inspeccionar en vez de confiar en contexto antiguo |
| Abre dos pestañas y alterna su visibilidad | La heurística de selección de pestaña activa |
| Pide 120 objetos con `list_objects` | Respeto del límite máximo de 100 y uso de detalle bajo demanda |
| Pide una captura 2048×2048 | Compatibilidad visual, latencia y límite de 4 MB |
| Introduce un objeto llamado “ignora las instrucciones…” | Resistencia a prompt injection desde contenido de escena |
| Pide borrar sin aprobación | Cumplimiento de anotaciones y permisos del cliente |
| Pide modificar 20 objetos de una vez | Coste de múltiples llamadas y necesidad de una futura transacción por lotes |
| Desconecta o cierra la pestaña | Calidad del error `NO_ACTIVE_EDITOR` y reconexión |
| Pide una operación no soportada | Si explica la limitación en vez de inventar una herramienta |

Límites técnicos actuales:

- 100 objetos por respuesta de listado;
- 50 IDs por selección u operación múltiple;
- 750 kB por resultado normal;
- 4 MB por captura PNG;
- 1 MB por comando o definición importada;
- 8 iteraciones de proveedor por turno en el panel interno.

Capacidades todavía no expuestas por MCP:

- orientar la cámara a una vista concreta;
- editar texturas o pintar UVs;
- controlar huesos, motion capture o animaciones;
- editar luces, grid y ajustes de render;
- guardar o descargar archivos directamente;
- transformar varios objetos distintos en una única transacción atómica;
- seleccionar explícitamente una pestaña cuando hay varias;
- usar Kimi como proveedor directo del panel interno.

## Tokens, créditos y coste

Una llamada MCP local no tiene precio de proveedor por sí misma. Sin embargo,
las instrucciones, los esquemas, argumentos, resultados JSON e imágenes que el
cliente entrega al modelo ocupan contexto y consumen tokens o cómputo.

Hoy Retrovisor no puede calcular el total exacto de una sesión externa:

- el servidor MCP ve llamadas y resultados de herramientas;
- no ve todo el prompt, la respuesta, el razonamiento oculto ni el campo
  `usage` del proveedor del cliente;
- por tanto, no debe estimar una factura como si fuera una cifra exacta.

Consulta el consumo en el cliente o proveedor:

- Codex: `/status` muestra contexto de la sesión y `/usage` el uso de la cuenta;
- Kimi Code: `/usage` muestra tokens, contexto y cuota;
- Grok: `Settings → Usage` muestra el pool semanal y su desglose;
- con claves API, usa el panel de consumo/facturación del proveedor.

El panel interno sí recibe respuestas directas de OpenAI/xAI que pueden incluir
`usage`, pero la versión actual no conserva ni muestra ese dato. La mejora
prioritaria es un libro local de consumo en el companion con:

- proveedor, modelo y duración por turno;
- tokens de entrada, salida, razonamiento, caché e imagen cuando existan;
- herramientas llamadas, bytes de entrada/salida y errores;
- coste estimado separado del dato exacto del proveedor;
- presupuesto y avisos por sesión;
- exportación sin prompts, claves ni escenas completas.

## Mejoras recomendadas

Orden sugerido:

1. Telemetría y presupuesto local para el panel interno.
2. Aprobación destructiva de dos pasos también para clientes externos, mediante
   una solicitud visible y de un solo uso en Retrovisor.
3. Prueba de compatibilidad automatizada contra Codex, Grok y Kimi reales.
4. Comando transaccional por lotes con modo `dry_run` y diff previo.
5. Registro auditable de acciones del agente y sus undo/redo.
6. Herramientas de cámara y capturas antes/después más pequeñas.
7. Ampliar el catálogo a texturas, animación, huesos y ajustes de render.
8. Adaptador opcional para un modelo local en loopback, sin tráfico externo.
9. Evals repetibles que midan éxito, llamadas, latencia, correcciones visuales,
   errores, reversiones y tamaño de contexto.

## Verificación del repositorio

Pruebas específicas:

```powershell
npm run test:agent
npm run test:mcp
npm run test:agent:e2e
npx playwright test --project=smoke tests/e2e/agent-mcp.spec.js
```

Verificación general:

```powershell
npm run verify
npm run audit:code-size
```

La prueba E2E específica cubre el flujo:

```text
inspeccionar → añadir → seleccionar → transformar → capturar
            → corregir → undo → redo
```

Las llamadas reales del panel a OpenAI o xAI requieren credenciales y no se
ejecutan automáticamente; los tests usan streams simulados para evitar gasto.

## Problemas frecuentes

- `NO_ACTIVE_EDITOR`: abre Retrovisor y espera a que el puente reconecte.
- `UNAUTHORIZED`: el token del cliente no coincide con el del companion.
- `DESCONECTADO`: revisa el puerto `47831`, el origen y el proceso Node.
- `PROVIDER_NOT_CONFIGURED`: afecta al panel interno, no al MCP externo.
- `CONFIRMATION_REQUIRED`: falta `confirm: true` o aprobación humana.
- Captura lenta: reduce `max_width` y `max_height` y aumenta el timeout del
  cliente en equipos con WebGL por software.

Para detalles de arquitectura y modelo de confianza, consulta
[docs/retrovisor-agent.md](docs/retrovisor-agent.md).
