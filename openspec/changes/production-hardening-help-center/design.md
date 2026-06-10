## Overview

El cambio se divide en cuatro bloques:

1. Hardening del DOM y de imports
2. Persistencia resiliente
3. Ayuda bilingüe para usuarios
4. Ajustes de shell/UI para idioma y navegación

## 1. Hardening del DOM y de imports

### Problem

- El listado de animaciones usa `innerHTML` con nombres importados desde JSON.
- La validación de objetos y escenas permite valores arbitrarios que pueden producir errores o geometrías demasiado pesadas.

### Decision

- Sustituir renderizado dinámico con `innerHTML` por creación explícita de nodos y `textContent`.
- Añadir sanitización/normalización de datos importados:
  - strings no vacíos con longitud razonable
  - arrays numéricos válidos
  - límites máximos de piezas y segmentos
  - límites de duración y número de tracks/keyframes

### Consequences

- Se elimina la vía directa de XSS por nombres de animación.
- La app rechaza cargas absurdas antes de instanciar geometrías.

## 2. Persistencia resiliente

### Problem

`loadFromLocalStorage()` e `importSceneJSON()` fallan en duro si el JSON es inválido o incompatible.

### Decision

- Encapsular parseo y reconstrucción en `try/catch`.
- Validar forma mínima del documento antes de reconstruir escena.
- Mostrar toast o error de importación legible en vez de romper la app.

## 3. Ayuda bilingüe

### Decision

- Añadir `help.html` como página estática separada para no mezclar la lógica del editor con la documentación.
- Reutilizar el sistema de idioma actual donde sea viable y, para la ayuda, usar un script pequeño dedicado.
- Estructura:
  - qué hace la app
  - flujo básico de uso
  - formato JSON de objetos
  - formato JSON de animaciones
  - prompts listos para LLMs
  - consejos de importación/exportación

## 4. Shell/UI

### Decision

- Añadir un acceso visible a ayuda desde la barra superior.
- Cambiar el toggle de idioma para mostrar:
  - `EN 🇬🇧` o `EN 🇺🇸`
  - `ES 🇪🇸`
- Mantener persistencia de idioma en `localStorage`.

## Verification

- Importar JSON válido e inválido de objeto, animación y escena
- Cargar `localStorage` corrupto
- Verificar que nombres con HTML se muestran como texto literal
- Ejecutar `npm.cmd run build`
- Ejecutar checks básicos desde `package.json`
