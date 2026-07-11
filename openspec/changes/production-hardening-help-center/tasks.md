## 1. OpenSpec

- [x] 1.1 Crear cambio `production-hardening-help-center`
- [x] 1.2 Redactar propuesta, diseño y tareas
- [x] 1.3 Añadir deltas de spec para hardening de importación, persistencia y ayuda bilingüe

## 2. Hardening del frontend

- [x] 2.1 Eliminar `innerHTML` con datos importados en el listado dinámico de animaciones
- [x] 2.2 Sustituir el estado vacío del listado por creación segura de nodos
- [x] 2.3 Añadir normalización de nombres importados y límites de longitud
- [x] 2.4 Validar arrays numéricos y tipos antes de construir geometrías
- [x] 2.5 Añadir límites razonables para piezas, tracks, keyframes y segmentos geométricos

## 3. Persistencia e importación resilientes

- [x] 3.1 Proteger `loadFromLocalStorage()` con `try/catch`
- [x] 3.2 Proteger `importSceneJSON()` con `try/catch`
- [x] 3.3 Validar forma mínima del JSON de escena antes de deserializar
- [x] 3.4 Mostrar mensajes de error legibles al usuario

## 4. Ayuda bilingüe

- [x] 4.1 Crear `help.html`
- [x] 4.2 Crear contenido EN/ES para funcionamiento general de la web
- [x] 4.3 Documentar formato JSON de objetos y animaciones para usuarios
- [x] 4.4 Incluir prompts listos para varios LLMs
- [x] 4.5 Añadir navegación visible desde la app hacia la ayuda

## 5. Idioma y shell

- [x] 5.1 Cambiar el toggle actual para mostrar `EN` con bandera y `ES` con bandera
- [x] 5.2 Asegurar que el idioma persiste correctamente entre editor y ayuda
- [x] 5.3 Añadir textos nuevos de i18n necesarios para ayuda/navegación

## 6. Calidad y verificación

- [x] 6.1 Añadir scripts de checks mínimos en `package.json`
- [x] 6.2 Ejecutar build de producción
- [x] 6.3 Revisar manualmente flujos críticos de importación/ayuda/i18n
