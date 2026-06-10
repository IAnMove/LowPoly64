## Why

LowPoly64 ya compila para producción, pero todavía tiene huecos que no convienen en una publicación pública: datos importados que acaban en `innerHTML`, carga frágil de JSON/localStorage, validación insuficiente de entradas y ausencia de una ayuda integrada para usuarios finales. Además, el selector de idioma usa un indicador poco claro para inglés y no existe una página que explique el flujo de uso ni cómo pedir JSON válidos a distintos LLMs.

## What Changes

- Hardening del frontend contra XSS y datos corruptos en importaciones, animaciones y persistencia
- Validación más estricta de JSON de objetos y escenas, con límites razonables para evitar bloqueos por geometrías absurdas
- Manejo de errores visible y recuperable al cargar desde archivo o `localStorage`
- Nueva página de ayuda bilingüe (`EN` / `ES`) con:
  - guía de uso del editor
  - explicación del formato JSON de objetos y animaciones
  - prompts listos para pedir JSON a distintos LLMs
- Ajuste del selector de idioma para mostrar `EN` + bandera y `ES` + bandera
- Calidad mínima de release con scripts de verificación y build final comprobado

## Capabilities

### New Capabilities
- `help-center`: página de ayuda pública, enlazada desde la app, con documentación bilingüe para usuarios finales

### Modified Capabilities
- `json-object-import`: sanitización de UI, validación numérica y límites de importación
- `scene-persistence`: recuperación segura ante JSON corrupto o incompatible
- `scene-management`: acceso visible a ayuda y selector de idioma más claro

## Impact

- Módulos modificados: `main.js`, `json-import.js`, `animation-import.js`, `persistence.js`, `i18n.js`, `templates.js`
- HTML/UI: `index.html` y nueva `help.html`
- Nuevos archivos de soporte para la ayuda y prompts reutilizables
- `package.json`: scripts de calidad básicos para producción
