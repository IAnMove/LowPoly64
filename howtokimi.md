# Cómo usar Kimi para manejar Retrovisor

Esta configuración conecta Kimi Code con la instancia local de Retrovisor
mediante MCP. Kimi podrá inspeccionar y modificar la escena usando comandos
validados, IDs estables, capturas del viewport y el historial undo/redo.

La configuración del proyecto está en:

```text
.kimi-code/mcp.json
```

No contiene claves ni tokens. Kimi lee el token local desde la variable de
entorno `RETROVISOR_AGENT_TOKEN`.

## 1. Instalar Kimi Code

En Windows, abre PowerShell y ejecuta el instalador oficial:

```powershell
irm https://code.kimi.com/kimi-code/install.ps1 | iex
```

Cierra la terminal, abre una nueva y comprueba:

```powershell
kimi --version
```

Kimi Code necesita Git for Windows porque utiliza Git Bash como entorno de
shell. El instalador oficial no necesita una instalación previa de Node.js.

## 2. Arrancar Retrovisor

Abre una primera terminal:

```powershell
cd I:\retrovisor_codex
npm install
```

`npm install` solamente es necesario la primera vez.

Genera un token local, guárdalo en la terminal y cópialo:

```powershell
$token = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
$env:RETROVISOR_AGENT_TOKEN = $token
$token | Set-Clipboard
```

Arranca el editor y el servicio compañero:

```powershell
npm run agent:dev
```

Abre y mantén visible:

```text
http://127.0.0.1:5173
```

Para utilizar Kimi mediante MCP no hacen falta `OPENAI_API_KEY` ni
`XAI_API_KEY`. Esas claves solamente se usan en el panel `AGENT` interno.

## 3. Arrancar Kimi con el mismo token

Abre una segunda terminal:

```powershell
cd I:\retrovisor_codex
$env:RETROVISOR_AGENT_TOKEN = Get-Clipboard
kimi
```

Si el portapapeles ya no contiene el token, asígnalo manualmente:

```powershell
$env:RETROVISOR_AGENT_TOKEN = "<EL_MISMO_TOKEN_DE_LA_PRIMERA_TERMINAL>"
```

Kimi debe iniciarse desde `I:\retrovisor_codex` para descubrir automáticamente
la configuración `.kimi-code/mcp.json`.

## 4. Iniciar sesión

Dentro de Kimi escribe:

```text
/login
```

Selecciona `Kimi Code (OAuth)` y completa el flujo de código de dispositivo en
el navegador. De este modo se utiliza la cuenta o suscripción de Kimi sin
guardar una API key en Retrovisor.

## 5. Comprobar MCP

Dentro de Kimi escribe:

```text
/mcp
```

Debe aparecer el servidor `retrovisor` conectado y con 20 herramientas. Sus
nombres pueden mostrarse con el prefijo:

```text
mcp__retrovisor__get_application_status
mcp__retrovisor__add_primitive
mcp__retrovisor__capture_viewport
```

Si la configuración se modificó con Kimi abierto, inicia una sesión nueva o
sal con `/exit` y vuelve a ejecutar `kimi`.

## 6. Primera inspección segura

Antes de construir nada, pega este prompt:

```text
Usa exclusivamente las herramientas MCP del servidor retrovisor. No edites
archivos y no ejecutes comandos de shell.

Comprueba la conexión, inspecciona el estado de Retrovisor, resume la escena y
lista como máximo 10 objetos. No modifiques todavía la escena.

Indica:
1. cuántos objetos hay;
2. qué IDs estables rv_* has encontrado;
3. si el viewport está disponible;
4. qué herramientas utilizarías para crear una escena.
```

El resultado esperado es que Kimi llame, como mínimo, a:

```text
get_application_status
get_scene_summary
list_objects
```

## 7. Crear una escena eficientemente

Para escenas puntuales, Kimi debe usar MCP, no editar el código fuente. Pega:

```text
Usa exclusivamente las herramientas MCP del servidor retrovisor para manejar
la escena. No edites archivos y no utilices shell.

Quiero un pequeño diorama low-poly de una cabaña en el bosque.

Proceso obligatorio:
1. Inspecciona primero el estado y la escena.
2. Si ya existen objetos, no borres nada: detente y pregúntame.
3. Si la escena está vacía, construye el diorama.
4. Crea un suelo verde horizontal.
5. Crea una cabaña marrón con tejado rojo, puerta y dos ventanas.
6. Añade tres árboles con tronco marrón y copa verde.
7. Añade rocas grises y un camino delante de la puerta.
8. Pon nombres descriptivos y conserva todos los IDs rv_* devueltos.
9. Agrupa piezas relacionadas cuando resulte adecuado.

Trabaja de forma eficiente:
- reutiliza templates registrados si encajan;
- usa add_primitive para elementos simples;
- para objetos compuestos, prefiere una definición JSON completa importada con
  import_object_definition frente a muchas llamadas diminutas;
- agrupa en una llamada todos los cambios relacionados de transformación o
  apariencia que admita la herramienta;
- no serialices la escena completa salvo que sea necesario.

Después:
1. inspecciona los objetos resultantes;
2. captura el viewport;
3. confirma explícitamente si has podido ver la imagen;
4. corrige posiciones, escalas, objetos flotantes, objetos enterrados o
   solapamientos evidentes;
5. realiza una segunda captura.

No borres ni reemplaces contenido sin mi aprobación explícita.

Al terminar devuelve:
- IDs estables principales;
- herramientas ejecutadas;
- correcciones visuales realizadas;
- limitaciones encontradas.
```

Los cambios aparecerán en la pestaña de Retrovisor mientras Kimi trabaja.

## 8. Permisos recomendados

Para la primera prueba, no utilices el modo YOLO de Kimi.

Puedes aprobar para la sesión:

- inspección y captura;
- selección;
- creación de primitivas y templates;
- importación validada;
- transformación y apariencia;
- agrupación, duplicado, undo y redo.

Mantén aprobación manual para:

```text
delete_objects
```

El servidor exige `confirm: true`, pero la ventana de aprobación visible para
un cliente externo también depende de la política de permisos de Kimi.

## 9. Comprobar undo y redo

Después de crear la escena:

```text
Usa únicamente MCP de Retrovisor y no edites archivos.

Elige uno de los objetos creados y conserva su ID estable.
1. Inspecciona su transformación actual.
2. Muévelo una unidad hacia arriba.
3. Comprueba la nueva transformación.
4. Ejecuta undo y verifica que volvió a la posición original.
5. Ejecuta redo y verifica que volvió a subir.
6. Ejecuta un último undo para dejar la escena como estaba.
7. Captura el viewport final.

No borres ningún objeto.
```

## 10. Evaluar si Kimi ve realmente la captura

```text
Captura el viewport actual con un máximo de 1024x1024.

Sin modificar la escena, describe:
- composición;
- objetos ocultos o solapados;
- objetos flotantes o enterrados;
- escalas incoherentes;
- tres mejoras visuales concretas.

Aclara si realmente has inspeccionado la imagen o si solamente has recibido
metadatos de anchura, altura y formato.
```

Si Kimi solo puede describir los metadatos, el servidor está devolviendo la
captura, pero esa combinación concreta de cliente y modelo no está pasando la
imagen a visión.

## 11. Mejorar una escena existente

```text
Usa únicamente las herramientas MCP de Retrovisor.

Inspecciona la escena y captura el viewport antes de modificarla. Propón un
máximo de cinco mejoras concretas. Ejecuta solamente cambios normales y
reversibles que no eliminen contenido. Después captura otra vez el viewport,
compara el antes y el después y revierte con undo cualquier cambio que haya
empeorado claramente la composición.

No edites archivos, no uses shell y no borres objetos.
```

## 12. Cuándo sí pedirle que edite código

Editar código es adecuado para añadir una capacidad permanente, corregir un bug
o registrar un template reutilizable. Por ejemplo:

```text
Quiero incorporar permanentemente un template reutilizable llamado
forest_cabin al catálogo de Retrovisor.

Esta tarea sí requiere editar código. Inspecciona la arquitectura existente de
templates, sigue sus convenciones, registra el nuevo template, añade tests y
comprueba que pueda crearse desde la interfaz y mediante add_template por MCP.

No modifiques escenas guardadas ni cambies APIs no relacionadas.
```

Regla práctica:

| Necesidad | Método |
|---|---|
| Crear o retocar una escena | MCP |
| Crear un objeto compuesto puntual | JSON + `import_object_definition` |
| Crear un asset reutilizable | Template en código |
| Añadir cámara, texturas o animación a MCP | Editar el registro de comandos |
| Corregir un bug de Retrovisor | Editar código y ejecutar tests |

## 13. Consultar consumo

Dentro de Kimi:

```text
/usage
```

Kimi muestra tokens, contexto y cuota. Retrovisor solo conoce las herramientas
llamadas y sus resultados; no recibe la conversación completa ni puede calcular
el consumo total del modelo externo.

## 14. Problemas frecuentes

### `retrovisor` aparece desconectado

Comprueba:

1. que `npm run agent:dev` sigue ejecutándose;
2. que la pestaña `http://127.0.0.1:5173` está abierta;
3. que Kimi se inició desde la raíz del repositorio;
4. que `.kimi-code/mcp.json` existe;
5. que ambas terminales tienen el mismo token;
6. que reiniciaste Kimi después de cambiar la configuración.

### `UNAUTHORIZED`

Los tokens no coinciden. Comprueba en ambas terminales:

```powershell
$env:RETROVISOR_AGENT_TOKEN
```

### `NO_ACTIVE_EDITOR`

El companion funciona, pero no hay una pestaña activa conectada. Abre
Retrovisor, mantenlo visible unos segundos y repite la llamada.

### La captura tarda demasiado

Pide a Kimi una captura de `512x512` y vuelve a probar. En equipos con WebGL por
software una captura grande puede superar el timeout.

### Kimi intenta editar el repositorio

Interrumpe la operación y repite el prompt comenzando por:

```text
Usa exclusivamente las herramientas MCP del servidor retrovisor. No edites
archivos y no ejecutes comandos de shell.
```

### Kimi quiere borrar objetos

Rechaza la aprobación y pídele que trabaje sin operaciones destructivas. Para
borrar debe existir una autorización humana explícita.
