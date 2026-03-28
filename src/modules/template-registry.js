// Declarative template format:
// { id, name, category, pieces: [{ geometry: { type, params }, color, name, position, rotation?, scale? }] }
// Supported geometry types: cube, sphere, cylinder, cone, plane, capsule, torus

export const TEMPLATE_REGISTRY = [
  // ============ MOBILIARIO ============
  {
    id: 'chair',
    name: 'Silla',
    category: 'Mobiliario',
    pieces: [
      { geometry: { type: 'cube', params: { width: 3, height: 0.3, depth: 3 } }, color: '#ffcc00', name: 'SEAT', position: [0, 1, 0] },
      { geometry: { type: 'cube', params: { width: 0.4, height: 3, depth: 3 } }, color: '#ffcc00', name: 'BACKREST', position: [-1.3, 2.5, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 1, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_1', position: [-1.2, 0.5, -1.2] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 1, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_2', position: [1.2, 0.5, -1.2] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 1, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_3', position: [-1.2, 0.5, 1.2] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 1, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_4', position: [1.2, 0.5, 1.2] },
    ],
  },
  {
    id: 'table',
    name: 'Mesa',
    category: 'Mobiliario',
    pieces: [
      { geometry: { type: 'cube', params: { width: 5, height: 0.4, depth: 5 } }, color: '#ffcc00', name: 'TABLETOP', position: [0, 2.5, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.25, radiusBottom: 0.25, height: 2.5, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_1', position: [-2, 1.25, -2] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.25, radiusBottom: 0.25, height: 2.5, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_2', position: [2, 1.25, -2] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.25, radiusBottom: 0.25, height: 2.5, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_3', position: [-2, 1.25, 2] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.25, radiusBottom: 0.25, height: 2.5, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_4', position: [2, 1.25, 2] },
    ],
  },
  {
    id: 'bookshelf',
    name: 'Estanteria',
    category: 'Mobiliario',
    pieces: [
      { geometry: { type: 'cube', params: { width: 0.3, height: 4, depth: 1.5 } }, color: '#8b4513', name: 'SIDE_L', position: [-1.5, 2, 0] },
      { geometry: { type: 'cube', params: { width: 0.3, height: 4, depth: 1.5 } }, color: '#8b4513', name: 'SIDE_R', position: [1.5, 2, 0] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.2, depth: 1.5 } }, color: '#a0522d', name: 'SHELF_1', position: [0, 0.5, 0] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.2, depth: 1.5 } }, color: '#a0522d', name: 'SHELF_2', position: [0, 1.5, 0] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.2, depth: 1.5 } }, color: '#a0522d', name: 'SHELF_3', position: [0, 2.5, 0] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.2, depth: 1.5 } }, color: '#a0522d', name: 'SHELF_4', position: [0, 3.5, 0] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.2, depth: 1.5 } }, color: '#8b4513', name: 'TOP', position: [0, 4, 0] },
    ],
  },
  {
    id: 'bed',
    name: 'Cama',
    category: 'Mobiliario',
    pieces: [
      { geometry: { type: 'cube', params: { width: 3, height: 0.8, depth: 5 } }, color: '#ffffff', name: 'MATTRESS', position: [0, 1.2, 0] },
      { geometry: { type: 'cube', params: { width: 3.2, height: 0.4, depth: 5.2 } }, color: '#8b4513', name: 'FRAME', position: [0, 0.6, 0] },
      { geometry: { type: 'cube', params: { width: 3.2, height: 2, depth: 0.3 } }, color: '#8b4513', name: 'HEADBOARD', position: [0, 1.4, -2.5] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.4, radialSegments: 6 } }, color: '#555555', name: 'LEG_1', position: [-1.4, 0.2, -2.3] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.4, radialSegments: 6 } }, color: '#555555', name: 'LEG_2', position: [1.4, 0.2, -2.3] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.4, radialSegments: 6 } }, color: '#555555', name: 'LEG_3', position: [-1.4, 0.2, 2.3] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.4, radialSegments: 6 } }, color: '#555555', name: 'LEG_4', position: [1.4, 0.2, 2.3] },
    ],
  },
  {
    id: 'desk',
    name: 'Escritorio',
    category: 'Mobiliario',
    pieces: [
      { geometry: { type: 'cube', params: { width: 4, height: 0.3, depth: 2 } }, color: '#a0522d', name: 'TOP', position: [0, 2.2, 0] },
      { geometry: { type: 'cube', params: { width: 0.3, height: 2, depth: 2 } }, color: '#8b4513', name: 'SIDE_L', position: [-1.85, 1.2, 0] },
      { geometry: { type: 'cube', params: { width: 0.3, height: 2, depth: 2 } }, color: '#8b4513', name: 'SIDE_R', position: [1.85, 1.2, 0] },
      { geometry: { type: 'cube', params: { width: 1.5, height: 0.6, depth: 1.8 } }, color: '#8b4513', name: 'DRAWER', position: [1, 1.5, 0] },
    ],
  },
  {
    id: 'stool',
    name: 'Taburete',
    category: 'Mobiliario',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 1, radiusBottom: 1, height: 0.3, radialSegments: 8 } }, color: '#a0522d', name: 'SEAT', position: [0, 1.5, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 1.5, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_1', position: [-0.6, 0.75, -0.6] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 1.5, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_2', position: [0.6, 0.75, -0.6] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 1.5, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_3', position: [-0.6, 0.75, 0.6] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 1.5, radialSegments: 6 } }, color: '#8b4513', name: 'LEG_4', position: [0.6, 0.75, 0.6] },
    ],
  },

  // ============ NATURALEZA ============
  {
    id: 'tree',
    name: 'Arbol',
    category: 'Naturaleza',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 0.3, radiusBottom: 0.5, height: 3, radialSegments: 6 } }, color: '#8b4513', name: 'TRUNK', position: [0, 1.5, 0] },
      { geometry: { type: 'cone', params: { radius: 2, height: 3, radialSegments: 8 } }, color: '#228b22', name: 'CANOPY_BOT', position: [0, 3.5, 0] },
      { geometry: { type: 'cone', params: { radius: 1.5, height: 2.5, radialSegments: 8 } }, color: '#2e8b2e', name: 'CANOPY_TOP', position: [0, 5.5, 0] },
    ],
  },
  {
    id: 'rock',
    name: 'Roca',
    category: 'Naturaleza',
    pieces: [
      { geometry: { type: 'sphere', params: { radius: 1.2, widthSegments: 6, heightSegments: 5 } }, color: '#808080', name: 'ROCK', position: [0, 0.6, 0], scale: [1.3, 0.7, 1.1] },
    ],
  },
  {
    id: 'bush',
    name: 'Arbusto',
    category: 'Naturaleza',
    pieces: [
      { geometry: { type: 'sphere', params: { radius: 1, widthSegments: 6, heightSegments: 5 } }, color: '#2e8b2e', name: 'BUSH_1', position: [0, 0.7, 0] },
      { geometry: { type: 'sphere', params: { radius: 0.7, widthSegments: 6, heightSegments: 5 } }, color: '#228b22', name: 'BUSH_2', position: [0.8, 0.5, 0.3] },
      { geometry: { type: 'sphere', params: { radius: 0.6, widthSegments: 6, heightSegments: 5 } }, color: '#3cb371', name: 'BUSH_3', position: [-0.5, 0.4, 0.5] },
    ],
  },
  {
    id: 'mushroom',
    name: 'Seta',
    category: 'Naturaleza',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.3, height: 1.2, radialSegments: 6 } }, color: '#fffacd', name: 'STEM', position: [0, 0.6, 0] },
      { geometry: { type: 'sphere', params: { radius: 0.8, widthSegments: 8, heightSegments: 4 } }, color: '#ff0000', name: 'CAP', position: [0, 1.3, 0], scale: [1, 0.5, 1] },
    ],
  },
  {
    id: 'flower',
    name: 'Flor',
    category: 'Naturaleza',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 0.08, radiusBottom: 0.1, height: 1.5, radialSegments: 6 } }, color: '#228b22', name: 'STEM', position: [0, 0.75, 0] },
      { geometry: { type: 'sphere', params: { radius: 0.3, widthSegments: 6, heightSegments: 4 } }, color: '#ff69b4', name: 'PETAL_1', position: [0.25, 1.6, 0] },
      { geometry: { type: 'sphere', params: { radius: 0.3, widthSegments: 6, heightSegments: 4 } }, color: '#ff69b4', name: 'PETAL_2', position: [-0.25, 1.6, 0] },
      { geometry: { type: 'sphere', params: { radius: 0.3, widthSegments: 6, heightSegments: 4 } }, color: '#ff69b4', name: 'PETAL_3', position: [0, 1.6, 0.25] },
      { geometry: { type: 'sphere', params: { radius: 0.3, widthSegments: 6, heightSegments: 4 } }, color: '#ff69b4', name: 'PETAL_4', position: [0, 1.6, -0.25] },
      { geometry: { type: 'sphere', params: { radius: 0.2, widthSegments: 6, heightSegments: 4 } }, color: '#ffcc00', name: 'CENTER', position: [0, 1.65, 0] },
    ],
  },

  // ============ ARQUITECTURA ============
  {
    id: 'house',
    name: 'Casa',
    category: 'Arquitectura',
    pieces: [
      { geometry: { type: 'cube', params: { width: 6, height: 3, depth: 5 } }, color: '#d2b48c', name: 'WALLS', position: [0, 1.5, 0] },
      { geometry: { type: 'cone', params: { radius: 4.5, height: 2.5, radialSegments: 4 } }, color: '#8b0000', name: 'ROOF', position: [0, 4.25, 0], rotation: [0, 0.785, 0] },
      { geometry: { type: 'cube', params: { width: 1.2, height: 2, depth: 0.1 } }, color: '#8b4513', name: 'DOOR', position: [0, 1, 2.5] },
      { geometry: { type: 'cube', params: { width: 1, height: 1, depth: 0.1 } }, color: '#87ceeb', name: 'WINDOW_L', position: [-1.8, 2, 2.5] },
      { geometry: { type: 'cube', params: { width: 1, height: 1, depth: 0.1 } }, color: '#87ceeb', name: 'WINDOW_R', position: [1.8, 2, 2.5] },
    ],
  },
  {
    id: 'door',
    name: 'Puerta',
    category: 'Arquitectura',
    pieces: [
      { geometry: { type: 'cube', params: { width: 0.2, height: 3, depth: 0.2 } }, color: '#8b4513', name: 'FRAME_L', position: [-0.7, 1.5, 0] },
      { geometry: { type: 'cube', params: { width: 0.2, height: 3, depth: 0.2 } }, color: '#8b4513', name: 'FRAME_R', position: [0.7, 1.5, 0] },
      { geometry: { type: 'cube', params: { width: 1.6, height: 0.2, depth: 0.2 } }, color: '#8b4513', name: 'FRAME_TOP', position: [0, 3, 0] },
      { geometry: { type: 'cube', params: { width: 1.2, height: 2.8, depth: 0.15 } }, color: '#a0522d', name: 'PANEL', position: [0, 1.4, 0] },
      { geometry: { type: 'sphere', params: { radius: 0.08, widthSegments: 6, heightSegments: 4 } }, color: '#ffcc00', name: 'KNOB', position: [0.4, 1.4, 0.1] },
    ],
  },
  {
    id: 'window',
    name: 'Ventana',
    category: 'Arquitectura',
    pieces: [
      { geometry: { type: 'cube', params: { width: 1.6, height: 1.6, depth: 0.1 } }, color: '#87ceeb', name: 'GLASS', position: [0, 0, 0] },
      { geometry: { type: 'cube', params: { width: 1.8, height: 0.15, depth: 0.15 } }, color: '#8b4513', name: 'FRAME_TOP', position: [0, 0.8, 0] },
      { geometry: { type: 'cube', params: { width: 1.8, height: 0.15, depth: 0.15 } }, color: '#8b4513', name: 'FRAME_BOT', position: [0, -0.8, 0] },
      { geometry: { type: 'cube', params: { width: 0.15, height: 1.6, depth: 0.15 } }, color: '#8b4513', name: 'FRAME_L', position: [-0.82, 0, 0] },
      { geometry: { type: 'cube', params: { width: 0.15, height: 1.6, depth: 0.15 } }, color: '#8b4513', name: 'FRAME_R', position: [0.82, 0, 0] },
      { geometry: { type: 'cube', params: { width: 0.1, height: 1.6, depth: 0.12 } }, color: '#8b4513', name: 'CROSS_V', position: [0, 0, 0] },
      { geometry: { type: 'cube', params: { width: 1.6, height: 0.1, depth: 0.12 } }, color: '#8b4513', name: 'CROSS_H', position: [0, 0, 0] },
    ],
  },
  {
    id: 'stairs',
    name: 'Escalera',
    category: 'Arquitectura',
    pieces: [
      { geometry: { type: 'cube', params: { width: 3, height: 0.4, depth: 1 } }, color: '#808080', name: 'STEP_1', position: [0, 0.2, 0] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.4, depth: 1 } }, color: '#808080', name: 'STEP_2', position: [0, 0.6, -1] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.4, depth: 1 } }, color: '#808080', name: 'STEP_3', position: [0, 1.0, -2] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.4, depth: 1 } }, color: '#808080', name: 'STEP_4', position: [0, 1.4, -3] },
      { geometry: { type: 'cube', params: { width: 3, height: 0.4, depth: 1 } }, color: '#808080', name: 'STEP_5', position: [0, 1.8, -4] },
    ],
  },
  {
    id: 'fence',
    name: 'Valla',
    category: 'Arquitectura',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 0.12, radiusBottom: 0.12, height: 2, radialSegments: 6 } }, color: '#8b4513', name: 'POST_1', position: [-2, 1, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.12, radiusBottom: 0.12, height: 2, radialSegments: 6 } }, color: '#8b4513', name: 'POST_2', position: [0, 1, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.12, radiusBottom: 0.12, height: 2, radialSegments: 6 } }, color: '#8b4513', name: 'POST_3', position: [2, 1, 0] },
      { geometry: { type: 'cube', params: { width: 4.2, height: 0.15, depth: 0.15 } }, color: '#a0522d', name: 'RAIL_TOP', position: [0, 1.6, 0] },
      { geometry: { type: 'cube', params: { width: 4.2, height: 0.15, depth: 0.15 } }, color: '#a0522d', name: 'RAIL_BOT', position: [0, 0.6, 0] },
    ],
  },
  {
    id: 'bridge',
    name: 'Puente',
    category: 'Arquitectura',
    pieces: [
      { geometry: { type: 'cube', params: { width: 3, height: 0.3, depth: 6 } }, color: '#8b4513', name: 'DECK', position: [0, 1, 0] },
      { geometry: { type: 'cube', params: { width: 0.2, height: 1.2, depth: 6 } }, color: '#a0522d', name: 'RAIL_L', position: [-1.5, 1.7, 0] },
      { geometry: { type: 'cube', params: { width: 0.2, height: 1.2, depth: 6 } }, color: '#a0522d', name: 'RAIL_R', position: [1.5, 1.7, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.15, height: 1.2, radialSegments: 6 } }, color: '#8b4513', name: 'POST_1', position: [-1.5, 1.7, -2.5] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.15, height: 1.2, radialSegments: 6 } }, color: '#8b4513', name: 'POST_2', position: [1.5, 1.7, -2.5] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.15, height: 1.2, radialSegments: 6 } }, color: '#8b4513', name: 'POST_3', position: [-1.5, 1.7, 2.5] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.15, height: 1.2, radialSegments: 6 } }, color: '#8b4513', name: 'POST_4', position: [1.5, 1.7, 2.5] },
    ],
  },

  // ============ PROPS ============
  {
    id: 'crate',
    name: 'Caja',
    category: 'Props',
    pieces: [
      { geometry: { type: 'cube', params: { width: 2, height: 2, depth: 2 } }, color: '#8b4513', name: 'BODY', position: [0, 1, 0] },
      { geometry: { type: 'cube', params: { width: 2.05, height: 0.15, depth: 0.15 } }, color: '#ffcc00', name: 'STRIP_H', position: [0, 1, 1.01] },
      { geometry: { type: 'cube', params: { width: 0.15, height: 2.05, depth: 0.15 } }, color: '#ffcc00', name: 'STRIP_V', position: [0, 1, 1.01] },
    ],
  },
  {
    id: 'barrel',
    name: 'Barril',
    category: 'Props',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 1.2, radiusBottom: 1, height: 2.5, radialSegments: 8 } }, color: '#8b4513', name: 'BODY', position: [0, 1.25, 0] },
      { geometry: { type: 'torus', params: { radius: 1.15, tube: 0.08, radialSegments: 4, tubularSegments: 8 } }, color: '#555555', name: 'TOP_RING', position: [0, 2.3, 0], rotation: [1.5708, 0, 0] },
      { geometry: { type: 'torus', params: { radius: 1.18, tube: 0.08, radialSegments: 4, tubularSegments: 8 } }, color: '#555555', name: 'MID_RING', position: [0, 1.25, 0], rotation: [1.5708, 0, 0] },
      { geometry: { type: 'torus', params: { radius: 1.05, tube: 0.08, radialSegments: 4, tubularSegments: 8 } }, color: '#555555', name: 'BOT_RING', position: [0, 0.2, 0], rotation: [1.5708, 0, 0] },
    ],
  },
  {
    id: 'chest',
    name: 'Cofre',
    category: 'Props',
    pieces: [
      { geometry: { type: 'cube', params: { width: 2, height: 1.2, depth: 1.5 } }, color: '#8b4513', name: 'BODY', position: [0, 0.6, 0] },
      { geometry: { type: 'cube', params: { width: 2, height: 0.6, depth: 1.5 } }, color: '#a0522d', name: 'LID', position: [0, 1.5, 0] },
      { geometry: { type: 'cube', params: { width: 0.4, height: 0.3, depth: 0.1 } }, color: '#ffcc00', name: 'LOCK', position: [0, 1.2, 0.76] },
      { geometry: { type: 'cube', params: { width: 2.1, height: 0.1, depth: 1.6 } }, color: '#555555', name: 'RIM_TOP', position: [0, 1.2, 0] },
    ],
  },
  {
    id: 'potion',
    name: 'Pocion',
    category: 'Props',
    pieces: [
      { geometry: { type: 'sphere', params: { radius: 0.5, widthSegments: 8, heightSegments: 6 } }, color: '#ff00ff', name: 'BOTTLE', position: [0, 0.5, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 0.5, radialSegments: 6 } }, color: '#808080', name: 'NECK', position: [0, 1.1, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.15, radialSegments: 6 } }, color: '#8b4513', name: 'CORK', position: [0, 1.4, 0] },
    ],
  },
  {
    id: 'sword',
    name: 'Espada',
    category: 'Props',
    pieces: [
      { geometry: { type: 'cube', params: { width: 0.15, height: 3, depth: 0.05 } }, color: '#c0c0c0', name: 'BLADE', position: [0, 2.5, 0] },
      { geometry: { type: 'cube', params: { width: 0.8, height: 0.2, depth: 0.15 } }, color: '#ffcc00', name: 'GUARD', position: [0, 0.9, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.12, radiusBottom: 0.12, height: 0.8, radialSegments: 6 } }, color: '#8b4513', name: 'HANDLE', position: [0, 0.4, 0] },
      { geometry: { type: 'sphere', params: { radius: 0.15, widthSegments: 6, heightSegments: 4 } }, color: '#ff0000', name: 'POMMEL', position: [0, 0, 0] },
    ],
  },
  {
    id: 'shield',
    name: 'Escudo',
    category: 'Props',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 1, radiusBottom: 1, height: 0.15, radialSegments: 6 } }, color: '#0088ff', name: 'BODY', position: [0, 1, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.3, radiusBottom: 0.3, height: 0.2, radialSegments: 6 } }, color: '#ffcc00', name: 'BOSS', position: [0, 1, 0.1] },
      { geometry: { type: 'cube', params: { width: 0.15, height: 0.6, depth: 0.3 } }, color: '#8b4513', name: 'GRIP', position: [0, 1, -0.15] },
    ],
  },
  {
    id: 'torch',
    name: 'Antorcha',
    category: 'Props',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 0.1, radiusBottom: 0.15, height: 2, radialSegments: 6 } }, color: '#8b4513', name: 'HANDLE', position: [0, 1, 0] },
      { geometry: { type: 'sphere', params: { radius: 0.25, widthSegments: 6, heightSegments: 4 } }, color: '#ff8800', name: 'FLAME_1', position: [0, 2.2, 0] },
      { geometry: { type: 'cone', params: { radius: 0.2, height: 0.5, radialSegments: 6 } }, color: '#ff0000', name: 'FLAME_2', position: [0, 2.6, 0] },
    ],
  },
  {
    id: 'lamp-post',
    name: 'Farola',
    category: 'Props',
    pieces: [
      { geometry: { type: 'cylinder', params: { radiusTop: 0.15, radiusBottom: 0.25, height: 4, radialSegments: 6 } }, color: '#555555', name: 'POLE', position: [0, 2, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.5, radiusBottom: 0.5, height: 0.15, radialSegments: 8 } }, color: '#555555', name: 'BASE', position: [0, 0.075, 0] },
      { geometry: { type: 'cube', params: { width: 1, height: 0.8, depth: 1 } }, color: '#ffcc66', name: 'LAMP', position: [0, 4.4, 0] },
      { geometry: { type: 'cone', params: { radius: 0.7, height: 0.4, radialSegments: 4 } }, color: '#555555', name: 'TOP', position: [0, 5, 0] },
    ],
  },

  // ============ PERSONAJES ============
  {
    id: 'character',
    name: 'Personaje',
    category: 'Personajes',
    pieces: [
      { geometry: { type: 'sphere', params: { radius: 1, widthSegments: 8, heightSegments: 6 } }, color: '#ffddaa', name: 'HEAD', position: [0, 5, 0] },
      { geometry: { type: 'cube', params: { width: 1.8, height: 2.5, depth: 1.2 } }, color: '#ff0000', name: 'TORSO', position: [0, 2.8, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.4, radiusBottom: 0.3, height: 2.2, radialSegments: 6 } }, color: '#ffaa88', name: 'LEFT_ARM', position: [-1.4, 3.5, 0], rotation: [0, 0, 1.047] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.4, radiusBottom: 0.3, height: 2.2, radialSegments: 6 } }, color: '#ffaa88', name: 'RIGHT_ARM', position: [1.4, 3.5, 0], rotation: [0, 0, -1.047] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.4, radiusBottom: 0.3, height: 2.5, radialSegments: 6 } }, color: '#3366ff', name: 'LEFT_LEG', position: [-0.6, 0.75, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.4, radiusBottom: 0.3, height: 2.5, radialSegments: 6 } }, color: '#3366ff', name: 'RIGHT_LEG', position: [0.6, 0.75, 0] },
    ],
  },
  {
    id: 'npc-villager',
    name: 'NPC Aldeano',
    category: 'Personajes',
    pieces: [
      { geometry: { type: 'sphere', params: { radius: 0.8, widthSegments: 8, heightSegments: 6 } }, color: '#ffddaa', name: 'HEAD', position: [0, 4.2, 0] },
      { geometry: { type: 'cone', params: { radius: 1, height: 0.8, radialSegments: 6 } }, color: '#228b22', name: 'HAT', position: [0, 5.2, 0] },
      { geometry: { type: 'cube', params: { width: 1.6, height: 2.2, depth: 1 } }, color: '#228b22', name: 'TORSO', position: [0, 2.5, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.3, radiusBottom: 0.25, height: 1.8, radialSegments: 6 } }, color: '#ffaa88', name: 'LEFT_ARM', position: [-1.2, 3, 0], rotation: [0, 0, 0.3] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.3, radiusBottom: 0.25, height: 1.8, radialSegments: 6 } }, color: '#ffaa88', name: 'RIGHT_ARM', position: [1.2, 3, 0], rotation: [0, 0, -0.3] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.35, radiusBottom: 0.3, height: 2, radialSegments: 6 } }, color: '#8b4513', name: 'LEFT_LEG', position: [-0.5, 0.7, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.35, radiusBottom: 0.3, height: 2, radialSegments: 6 } }, color: '#8b4513', name: 'RIGHT_LEG', position: [0.5, 0.7, 0] },
    ],
  },
  {
    id: 'enemy-placeholder',
    name: 'Enemigo',
    category: 'Personajes',
    pieces: [
      { geometry: { type: 'sphere', params: { radius: 0.9, widthSegments: 8, heightSegments: 6 } }, color: '#990000', name: 'HEAD', position: [0, 4.5, 0] },
      { geometry: { type: 'cone', params: { radius: 0.3, height: 0.5, radialSegments: 4 } }, color: '#990000', name: 'HORN_L', position: [-0.5, 5.5, 0] },
      { geometry: { type: 'cone', params: { radius: 0.3, height: 0.5, radialSegments: 4 } }, color: '#990000', name: 'HORN_R', position: [0.5, 5.5, 0] },
      { geometry: { type: 'cube', params: { width: 2, height: 2.5, depth: 1.3 } }, color: '#440000', name: 'TORSO', position: [0, 2.5, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.45, radiusBottom: 0.35, height: 2.2, radialSegments: 6 } }, color: '#660000', name: 'LEFT_ARM', position: [-1.5, 3.2, 0], rotation: [0, 0, 0.5] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.45, radiusBottom: 0.35, height: 2.2, radialSegments: 6 } }, color: '#660000', name: 'RIGHT_ARM', position: [1.5, 3.2, 0], rotation: [0, 0, -0.5] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.4, radiusBottom: 0.35, height: 2, radialSegments: 6 } }, color: '#440000', name: 'LEFT_LEG', position: [-0.6, 0.7, 0] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.4, radiusBottom: 0.35, height: 2, radialSegments: 6 } }, color: '#440000', name: 'RIGHT_LEG', position: [0.6, 0.7, 0] },
    ],
  },
  {
    id: 'animal',
    name: 'Animal',
    category: 'Personajes',
    pieces: [
      { geometry: { type: 'cube', params: { width: 1.5, height: 1.2, depth: 2.5 } }, color: '#d2b48c', name: 'BODY', position: [0, 1.4, 0] },
      { geometry: { type: 'cube', params: { width: 1, height: 0.8, depth: 1 } }, color: '#d2b48c', name: 'HEAD', position: [0, 1.8, 1.5] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.8, radialSegments: 6 } }, color: '#c4a882', name: 'LEG_FL', position: [-0.5, 0.4, 0.8] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.8, radialSegments: 6 } }, color: '#c4a882', name: 'LEG_FR', position: [0.5, 0.4, 0.8] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.8, radialSegments: 6 } }, color: '#c4a882', name: 'LEG_BL', position: [-0.5, 0.4, -0.8] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.8, radialSegments: 6 } }, color: '#c4a882', name: 'LEG_BR', position: [0.5, 0.4, -0.8] },
      { geometry: { type: 'cylinder', params: { radiusTop: 0.08, radiusBottom: 0.05, height: 0.6, radialSegments: 4 } }, color: '#d2b48c', name: 'TAIL', position: [0, 1.6, -1.5], rotation: [0.5, 0, 0] },
    ],
  },
];
