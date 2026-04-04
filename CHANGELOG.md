# Changelog

## [0.6.0] — 2026-04-04

### AI Texture Generation — Prompt Templates & Ollama

#### Nuevas funcionalidades
- **20+ prompt templates** para generación de texturas PS1, organizados en 5 categorías:
  - CHARACTER FACE: Goblin, Human Warrior, Skeleton, Orc, Elf, Dwarf
  - CHARACTER BODY: Plate Armor, Wizard Robe, Leather Armor, Barbarian
  - ENVIRONMENT GROUND: Asphalt, Grass, Stone Floor, Dirt, Sand, Water, Lava, Snow
  - ENVIRONMENT WALLS: Stone Brick, Wood Planks, Metal Panel, Mud Brick, Dungeon
  - PROPS: Treasure Chest, Barrel, Iron Sword
- **Editor de prompt expandido**: click en la textarea del panel o en el botón ⤢ abre un modal full-size con selector de templates, textarea grande y botones ENHANCE/GENERATE
- **Integración con Ollama**: nueva sección en CONFIG para conectar un servidor Ollama local
  - Botón "Load Models" descubre automáticamente los modelos instalados
  - Botón ENHANCE en el editor de prompt usa el LLM seleccionado para mejorar el prompt con estilo PS1/retro
  - El botón solo aparece si hay un modelo Ollama configurado

#### Cambios
- La textarea de prompt del panel lateral ahora es de solo lectura — funciona como preview y abre el editor al hacer click
- Los prompts se sincronizan entre el panel y el modal expandido

---

## [0.5.0] — 2026-04-03

### AI Texture Generation — Base

#### Nuevas funcionalidades
- **Botón CONFIG** en la top bar (morado) para configurar la generación de texturas
- **Modal de configuración** con:
  - Selector de método: OpenAI / Local Stable Diffusion
  - OpenAI: campo API key (`type="password"`, guardada solo en el browser via localStorage, nunca en servidor), modelo configurable, tamaño, calidad
  - Stable Diffusion: URL del servidor (compatible con Forge/AUTOMATIC1111), width, height, steps
- **Generación de texturas por prompt** en el editor de texturas:
  - Nueva sección "AI GENERATE" en el panel izquierdo
  - La imagen generada se aplica directamente al canvas de pintura y al mesh seleccionado
  - El resultado puede editarse con las herramientas normales (brush, eraser) tras la generación
- Soporte para **OpenAI Images API** (`gpt-image-1`, parámetros configurables)
- Soporte para **Stable Diffusion local** via `POST /sdapi/v1/txt2img`

#### Seguridad
- La API key de OpenAI sale del browser directamente hacia `api.openai.com`, no pasa por ningún servidor intermedio
- El campo de API key muestra `••••••••••••••••••••` como placeholder si hay una key guardada; nunca se pre-rellena

---

## [0.4.0] — 2026-04-03

### Archetype Slot Rig System

- Sistema de arquetipos (HUMANOID, BIRD, CAR, PROP) con slots disponibles por tipo
- Formato `CharacterModel` con `archetype`, `slots`, `animationProfile`, `skeletonId`
- Registro de esqueletos reutilizables con jerarquía de bones y bindings slot→bone
- Perfiles de animación referenciados por nombre
- Panel UI de Rig/Animaciones con vista dual (modelo + esqueleto), selector de skeleton, tabla de bindings
- Compatibilidad con formato JSON legacy (`pieces[]`)

---

## [0.3.0] — 2026-03-29

### Pivot, Hierarchy & Animations

- Pivotes configurables por pieza
- Jerarquía de piezas padre/hijo
- Sistema de animaciones keyframe con importación JSON independiente

---

## [0.2.0] — 2026-03-28

### Groups, Textures & Templates

- Agrupación y desagrupación de objetos
- Sistema de texturas mejorado con arrastrar y soltar
- Librería de templates de personajes/vehículos
- Importación de objetos desde JSON

---

## [0.1.0] — 2026-03-28

### LowPoly64 Editor — Initial Release

- Editor 3D de modelos low-poly estilo N64/PS1
- Primitivas, transformaciones, materiales, colores
- Editor de texturas con pintura por píxel y UV mapping
- Efectos PSX (vertex jitter, dithering, low-res, affine texture)
- Exportación GLB y persistencia en localStorage
