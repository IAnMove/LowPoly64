## 1. Avatar data model and preset libraries

- [x] 1.1 Crear `src/data/avatar/` con catalogos curados para cuerpos, formas de cabeza, peinados, ojos, cejas, bocas, accesorios simples y paletas.
- [x] 1.2 Anadir el perfil `HUMANOID_AVATAR_BASE` en `src/data/animation-profiles/` usando un subset neutral del esqueleto `HUMANOID_DEFAULT`.
- [x] 1.3 Crear `src/modules/avatar/avatar-recipe.js` con defaults, validacion, versionado y helpers para mergear cambios de la ficha.
- [x] 1.4 Crear `src/modules/avatar/avatar-head-svg.js` para compilar una receta a un SVG final `inflated-head` con ids y `data-rv-role` estables.

## 2. Avatar builder runtime

- [x] 2.1 Crear `src/modules/avatar/avatar-builder.js` que parta de un body mold humanoide valido, genere la cabeza SVG y devuelva un grupo listo para escena.
- [x] 2.2 Reusar `buildGroupWithSvgHead` o una variante equivalente para reemplazar el slot `HEAD` del molde sin romper `slotMap`, `slotSvgSources` ni el rig.
- [x] 2.3 Guardar `userData.avatarRecipe`, `animationProfile`, `skeletonId` y la metadata SVG necesaria para re-edicion.
- [x] 2.4 Resolver flujo de crear nuevo avatar y editar avatar existente reemplazando el grupo completo en confirmacion.

## 3. Avatar Forge UI

- [x] 3.1 Anadir entrada `AVATAR FORGE` al editor y crear el modal/workbench siguiendo el patron de `svg-workbench`.
- [x] 3.2 Implementar controles para cuerpo, cabeza, pelo, ojos, cejas, boca, accesorios y paleta, mas una ficha compacta del personaje actual.
- [x] 3.3 Implementar preview vivo del avatar ensamblado con limpieza de grupos temporales y feedback de carga cuando toque reconstruir.
- [x] 3.4 Permitir abrir el modo sobre un grupo con `userData.avatarRecipe` para recargar la ficha existente.
- [x] 3.5 Conectar confirm/cancel/undo con seleccion, object list y estado general del editor.

## 4. Persistence and roundtrip

- [x] 4.1 Extender `scene-persistence` para serializar y restaurar `avatarRecipe` en grupos creados por `Avatar Forge`.
- [x] 4.2 Verificar que `SAVE`/`LOAD` conserva tanto la geometria final como la capacidad de reabrir la ficha del avatar.
- [x] 4.3 Confirmar que grupos sin `avatarRecipe` siguen cargando exactamente igual que antes.

## 5. Validation and follow-up

- [x] 5.1 Validar combinaciones representativas sobre al menos dos moldes de cuerpo y varias combinaciones de ojos/cejas/pelo para asegurar que todas siguen siendo humanoides.
- [x] 5.2 Verificar panel de rig, preview de animaciones y export GLB con `HUMANOID_AVATAR_BASE`.
- [x] 5.3 Actualizar ayuda o notas de release con el flujo `Avatar Forge` y su alcance real.
