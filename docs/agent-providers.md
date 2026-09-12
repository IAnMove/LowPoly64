
# Proveedores del asistente

El compañero local mantiene las URL y credenciales en el proceso servidor. El panel solo recibe los proveedores disponibles, el modelo predeterminado y el resultado de una comprobación; nunca recibe claves API.

## Proveedores y variables

| Proveedor | Transporte | URL predeterminada | Modelo |
| --- | --- | --- | --- |
| OpenAI | Responses API con SSE | https://api.openai.com/v1 | RETROVISOR_OPENAI_MODEL o gpt-5.6-terra |
| xAI | Responses API con SSE | https://api.x.ai/v1 | RETROVISOR_XAI_MODEL o grok-4.5 |
| Ollama | POST /api/chat con NDJSON | http://127.0.0.1:11434 | RETROVISOR_OLLAMA_MODEL (si se omite, COMPROBAR propone el primer modelo disponible) |
| LM Studio | OpenAI-compatible /v1/chat/completions | http://127.0.0.1:1234/v1 | RETROVISOR_LMSTUDIO_MODEL (si se omite, COMPROBAR propone el primer modelo disponible) |

Las URL se pueden cambiar en el entorno del companion:

- RETROVISOR_OPENAI_URL
- RETROVISOR_XAI_URL
- RETROVISOR_OLLAMA_URL
- RETROVISOR_LMSTUDIO_URL
- RETROVISOR_PROVIDER_TIMEOUT_MS para las peticiones normales
- RETROVISOR_OLLAMA_CONTEXT (8192–65536; predeterminado 16384) para el presupuesto de contexto de Ollama

Las claves API son únicamente OPENAI_API_KEY y XAI_API_KEY, leídas por el servidor. Ollama y LM Studio no requieren credenciales en sus servidores locales. No se instalan modelos ni se descargan recursos desde Retrovisor.

## Contrato de transporte

streamProviderResponse(provider, model, input, signal) conserva el contrato que usa assistant-runner.js. Para OpenAI y xAI sigue enviando input y herramientas a /responses. Los adaptadores locales traducen ese input:

- Ollama recibe mensajes system, user, assistant y tool en /api/chat. Las imágenes se envían como base64 en messages[].images.
- LM Studio recibe el formato de Chat Completions en /v1/chat/completions. Las imágenes se envían como partes image_url y las llamadas siguen message.tool_calls.
- Los dos transportes devuelven al runner response.output_text.delta y response.completed. Las llamadas se normalizan como elementos function_call con call_id, name y argumentos JSON.

Una cancelación aborta la petición actual y se propaga como ASSISTANT_CANCELLED. Un timeout produce PROVIDER_TIMEOUT; no existe un fallback automático hacia la nube.

## Comprobación de un modelo

POST /assistant/probe acepta provider, model, checks opcional y timeoutMs opcional. La comprobación no llama al editor ni modifica la escena. Ejecuta, contra el proveedor elegido:

1. conexión y lista de modelos (/api/tags para Ollama, /v1/models para LM Studio);
2. una llamada a retrovisor_probe_echo, una herramienta inocua cuyo resultado se valida;
3. una respuesta con el esquema JSON de prueba, validada después de parsearla;
4. una petición de una imagen PNG mínima con mitad izquierda roja y mitad derecha azul; la respuesta debe identificar ese patrón.

La respuesta devuelve capabilities.tools, capabilities.structuredJson y capabilities.vision. Antes de comprobar un modelo son null; después son booleanos del resultado real de esa combinación servidor/modelo. Una visión fallida incluye manualReviewRequired: true y el panel indica que las capturas necesitan revisión humana. El resultado separa transportAccepted (el servidor aceptó la imagen) de vision (el modelo identificó el patrón); esto no certifica la calidad artística del modelo.

El panel AGENT ofrece selector de proveedor, modelo, botón COMPROBAR y marcas para herramientas, visión y JSON Schema. El botón se puede cancelar y tiene un límite de tiempo; cancelar una prueba no cambia el proveedor seleccionado ni inicia otra petición.

## Artefactos y vistas

Las respuestas de tool_completed pueden incluir artifacts completos. El panel muestra imágenes con mimeType image/* como vista previa y ofrece un enlace para cualquier artifact con filename o encoding base64/json/utf8. Los datos siguen siendo del agente y se mantienen separados del resumen compacto enviado al modelo.

## Fuentes de protocolo

La forma de los adaptadores locales sigue la documentación oficial:

- https://docs.ollama.com/capabilities/structured-outputs
- https://docs.ollama.com/capabilities/tool-calling
- https://docs.ollama.com/capabilities/vision
- https://lmstudio.ai/docs/developer/openai-compat/chat-completions
- https://lmstudio.ai/docs/developer/openai-compat/tools
- https://lmstudio.ai/docs/developer/openai-compat/structured-output
- https://lmstudio.ai/docs/developer/openai-compat/models

## Estado local verificado

La sonda real de Ollama confirmó herramientas y JSON estructurado para Qwen3 `qwen3:4b-instruct-2507-q4_K_M`, pero no confirmó visión. Aún no hay una secuencia real completa de creación, edición, commit y exportación con ese modelo. LM Studio solo tiene validación del transporte simulado; el servicio no está instalado ni disponible en este entorno. Estos datos no implican calidad visual ni equivalencia con un proveedor cloud.


## Límite de contexto de archivos

Para los artifacts JSON, el contenido completo entra en el contexto del proveedor solo hasta 64.000 caracteres. Los JSON mayores se marcan como omitidos en la entrada del modelo, mientras el archivo íntegro continúa disponible en el panel y MCP. Este límite protege el contexto y no altera los bytes del artifact descargable.

