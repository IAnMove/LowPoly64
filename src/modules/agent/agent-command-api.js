import * as THREE from 'three';
import { state } from '../shared/state.js';
import { pushAction, redo as redoHistory, undo as undoHistory } from '../shared/undo.js';
import { updateMaterialType, setColor, setOpacity } from '../shared/materials.js';
import { getEditableMeshes } from '../shared/ui-helpers.js';
import { addPrimitive } from '../viewport/primitives.js';
import {
  groupSelected,
  insertDuplicatedObjects,
  ungroupSelected,
} from '../viewport/actions.js';
import {
  deselectAll,
  selectMesh,
  toggleMultiSelect,
} from '../viewport/selection.js';
import { refreshObjectList } from '../viewport/object-list.js';
import { updateExportButtonText, updatePropertiesPanel } from '../viewport/ui.js';
import { emit } from '../../event-bus.js';
import {
  ensureAgentId,
  findObjectByAgentId,
  getAddressableObjects,
  normalizeAgentIds,
} from './agent-object-ids.js';
import {
  AgentCommandError,
  getSerializedByteLength,
  makeErrorResult,
  makeSuccessResult,
  validateToolArguments,
} from './tool-validation.js';
import { MAX_CAPTURE_BYTES } from './tool-schema.js';
import {
  getApplicationStatus,
  getSceneSummary,
  getSelectedAgentIds,
  summarizeObject,
} from './agent-scene-query.js';

function requireReady() {
  if (!state.scene || !state.camera || !state.renderer || !state.userObjects) {
    throw new AgentCommandError('APPLICATION_NOT_READY', 'Retrovisor has not finished initializing.');
  }
}

function requireObject(id) {
  const object = findObjectByAgentId(state.userObjects, id);
  if (!object) {
    throw new AgentCommandError('OBJECT_NOT_FOUND', `No scene object exists with ID ${id}.`, { id });
  }
  return object;
}

function syncUi() {
  refreshObjectList();
  updatePropertiesPanel();
  updateExportButtonText();
  emit('scene:objects-changed');
  emit('agent:scene-changed');
}

function applyTransformValues(object, values, relative = false) {
  if (values.position) {
    if (relative) object.position.add(new THREE.Vector3(...values.position));
    else object.position.fromArray(values.position);
  }
  if (values.rotation_degrees) {
    const radians = values.rotation_degrees.map(THREE.MathUtils.degToRad);
    if (relative) {
      object.rotation.x += radians[0];
      object.rotation.y += radians[1];
      object.rotation.z += radians[2];
    } else {
      object.rotation.set(...radians);
    }
  }
  if (values.scale) {
    if (relative) {
      object.scale.multiply(new THREE.Vector3(...values.scale));
    } else {
      object.scale.fromArray(values.scale);
    }
  }
  object.updateMatrixWorld(true);
}

function transformSnapshot(object) {
  return {
    position: object.position.toArray(),
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    scale: object.scale.toArray(),
  };
}

function restoreTransform(object, snapshot) {
  object.position.fromArray(snapshot.position);
  object.rotation.set(...snapshot.rotation);
  object.scale.fromArray(snapshot.scale);
  object.updateMatrixWorld(true);
  syncUi();
}

function setExactSelection(objects) {
  deselectAll();
  if (objects.length === 1) {
    selectMesh(objects[0]);
    return;
  }
  objects.forEach((object) => toggleMultiSelect(object));
}

function resolveSelection(args) {
  const current = new Set(
    (state.selectedMeshes?.size ? [...state.selectedMeshes] : state.selectedMesh ? [state.selectedMesh] : []),
  );
  const requested = args.ids.map(requireObject);
  let next;
  if (args.mode === 'add') {
    next = new Set([...current, ...requested]);
  } else if (args.mode === 'remove') {
    next = new Set(current);
    requested.forEach((object) => next.delete(object));
  } else {
    next = new Set(requested);
  }
  setExactSelection([...next]);
  return [...next];
}

function applyOptionalCreationFields(object, args) {
  if (args.name) object.userData.name = args.name;
  if (args.transform) applyTransformValues(object, args.transform, false);
}

function materialSnapshot(mesh) {
  const material = mesh.material;
  return {
    type: material?.isMeshBasicMaterial
      ? 'Basic'
      : material?.isMeshPhongMaterial
        ? 'Phong'
        : material?.isMeshStandardMaterial
          ? 'Standard'
          : 'Lambert',
    color: material?.color ? `#${material.color.getHexString()}` : null,
    opacity: material?.opacity ?? 1,
  };
}

function applyMaterialSnapshot(mesh, snapshot) {
  updateMaterialType(mesh, snapshot.type);
  if (snapshot.color) setColor(mesh, snapshot.color);
  setOpacity(mesh, snapshot.opacity);
}

function appearanceSnapshot(object) {
  return {
    name: object.userData?.name || '',
    meshes: getEditableMeshes(object).filter((mesh) => mesh.material).map((mesh) => ({
      mesh,
      material: materialSnapshot(mesh),
    })),
  };
}

function applyAppearance(object, args) {
  if (args.name !== null && args.name !== undefined) object.userData.name = args.name;
  getEditableMeshes(object).filter((mesh) => mesh.material).forEach((mesh) => {
    if (args.material) updateMaterialType(mesh, args.material);
    if (args.color) setColor(mesh, args.color);
    if (args.opacity !== null && args.opacity !== undefined) setOpacity(mesh, args.opacity);
  });
}

function restoreAppearance(object, snapshot) {
  object.userData.name = snapshot.name;
  snapshot.meshes.forEach(({ mesh, material }) => applyMaterialSnapshot(mesh, material));
  syncUi();
}

function removeRedundantDescendants(objects) {
  const selected = new Set(objects);
  return objects.filter((object) => {
    let parent = object.parent;
    while (parent && parent !== state.userObjects) {
      if (selected.has(parent)) return false;
      parent = parent.parent;
    }
    return true;
  });
}

function makeSceneResult(command, data, changedIds = [], warnings = []) {
  return makeSuccessResult(command, data, {
    changedIds,
    warnings,
    scene: getSceneSummary({ includeBounds: false }),
    summary: getSceneSummary({ includeBounds: false }),
  });
}

async function captureViewport(args) {
  state.renderer.render(state.scene, state.camera);
  const source = state.renderer.domElement;
  const scale = Math.min(1, args.max_width / source.width, args.max_height / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  let canvas = source;
  if (width !== source.width || height !== source.height) {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(source, 0, 0, width, height);
  }
  const dataUrl = canvas.toDataURL('image/png');
  if (getSerializedByteLength(dataUrl) > MAX_CAPTURE_BYTES) {
    throw new AgentCommandError(
      'CAPTURE_TOO_LARGE',
      'The viewport capture exceeds the local MCP response limit. Request a smaller image.',
    );
  }
  return { mimeType: 'image/png', width, height, data: dataUrl.split(',')[1] };
}

const handlers = {
  get_application_status: async () => {
    const { getCategories } = await import('../viewport/templates.js');
    const categories = [...getCategories().entries()].map(([category, templates]) => ({
      category,
      ids: templates.map((template) => template.id),
    }));
    return makeSceneResult('get_application_status', {
      ...getApplicationStatus(),
      capabilities: {
        primitives: [
          'cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule',
          'torus', 'wedge', 'pyramid', 'taperedBox', 'limbLoft', 'lathe',
        ],
        materials: ['Basic', 'Lambert', 'Phong', 'Standard'],
        templateCount: categories.reduce((total, category) => total + category.ids.length, 0),
        templateCategories: categories,
      },
    });
  },

  get_scene_summary: (args) => makeSceneResult('get_scene_summary', getSceneSummary(args)),

  list_objects: (args) => {
    let objects = getAddressableObjects(state.userObjects);
    if (!args.include_children) objects = objects.filter((object) => object.parent === state.userObjects);
    const total = objects.length;
    objects = objects.slice(0, args.limit);
    return makeSceneResult('list_objects', {
      objects: objects.map((object) => summarizeObject(object, args.detail)),
      total,
      returned: objects.length,
      truncated: objects.length < total,
    });
  },

  get_object: (args) => makeSceneResult('get_object', summarizeObject(requireObject(args.id), args.detail)),

  get_selection: () => {
    const ids = getSelectedAgentIds();
    return makeSceneResult('get_selection', {
      ids,
      objects: ids.map((id) => summarizeObject(requireObject(id), 'compact')),
    });
  },

  select_objects: (args) => {
    const selection = resolveSelection(args);
    syncUi();
    return makeSceneResult('select_objects', {
      selectedIds: selection.map(ensureAgentId),
    }, selection.map(ensureAgentId));
  },

  add_primitive: (args) => {
    addPrimitive(args.type);
    const object = state.selectedMesh;
    if (!object) throw new AgentCommandError('CREATE_FAILED', `Primitive ${args.type} could not be created.`);
    applyOptionalCreationFields(object, args);
    const id = ensureAgentId(object);
    syncUi();
    return makeSceneResult('add_primitive', summarizeObject(object, 'full'), [id]);
  },

  add_template: async (args) => {
    const { addTemplate } = await import('../viewport/templates.js');
    addTemplate(args.template_id);
    const object = state.selectedMesh;
    if (!object) throw new AgentCommandError('TEMPLATE_NOT_FOUND', `Template ${args.template_id} was not found.`);
    applyOptionalCreationFields(object, args);
    const id = ensureAgentId(object);
    syncUi();
    return makeSceneResult('add_template', summarizeObject(object, 'full'), [id]);
  },

  import_object_definition: async (args) => {
    const { importObjectFromJSON } = await import('../viewport/json-import.js');
    const definition = structuredClone(args.definition);
    if (args.name) definition.name = args.name;
    const result = await importObjectFromJSON(JSON.stringify(definition));
    if (!result?.success || !state.selectedMesh) {
      throw new AgentCommandError('IMPORT_FAILED', result?.error || 'The object definition could not be imported.');
    }
    const object = state.selectedMesh;
    const id = ensureAgentId(object);
    syncUi();
    return makeSceneResult('import_object_definition', summarizeObject(object, 'full'), [id]);
  },

  update_object_transform: (args) => {
    const object = requireObject(args.id);
    const before = transformSnapshot(object);
    applyTransformValues(object, args, args.relative);
    const after = transformSnapshot(object);
    pushAction({
      type: 'Agent transform',
      undo: () => restoreTransform(object, before),
      redo: () => restoreTransform(object, after),
    });
    syncUi();
    return makeSceneResult('update_object_transform', summarizeObject(object, 'full'), [args.id]);
  },

  update_object_appearance: (args) => {
    const object = requireObject(args.id);
    const before = appearanceSnapshot(object);
    applyAppearance(object, args);
    const after = appearanceSnapshot(object);
    pushAction({
      type: 'Agent appearance',
      undo: () => restoreAppearance(object, before),
      redo: () => restoreAppearance(object, after),
    });
    syncUi();
    return makeSceneResult('update_object_appearance', summarizeObject(object, 'full'), [args.id]);
  },

  group_objects: (args) => {
    const objects = args.ids.map(requireObject);
    setExactSelection(objects);
    groupSelected();
    const group = state.selectedMesh;
    if (!group?.isGroup) throw new AgentCommandError('GROUP_FAILED', 'The requested objects could not be grouped.');
    if (args.name) group.userData.name = args.name;
    const id = ensureAgentId(group);
    normalizeAgentIds(state.userObjects);
    syncUi();
    return makeSceneResult('group_objects', summarizeObject(group, 'full'), [id, ...args.ids]);
  },

  ungroup_objects: (args) => {
    const group = requireObject(args.id);
    if (!group.isGroup || group.parent !== state.userObjects) {
      throw new AgentCommandError('NOT_UNGROUPABLE', 'Only a top-level group can be ungrouped.', { id: args.id });
    }
    selectMesh(group);
    ungroupSelected();
    const ids = normalizeAgentIds(state.userObjects).objects
      .filter((object) => object.parent === state.userObjects)
      .map(ensureAgentId);
    syncUi();
    return makeSceneResult('ungroup_objects', { ungroupedId: args.id, topLevelIds: ids }, [args.id, ...ids]);
  },

  duplicate_objects: (args) => {
    const objects = args.ids.map(requireObject);
    const clones = insertDuplicatedObjects(objects, { offset: args.offset || [1, 0, 0] });
    normalizeAgentIds(state.userObjects);
    const ids = clones.map(ensureAgentId);
    syncUi();
    return makeSceneResult('duplicate_objects', {
      objects: clones.map((object) => summarizeObject(object, 'compact')),
    }, ids);
  },

  delete_objects: (args) => {
    const requested = args.ids.map(requireObject);
    const objects = removeRedundantDescendants(requested);
    const warnings = objects.length < requested.length
      ? ['Some nested objects were omitted because an ancestor was also deleted.']
      : [];
    const placements = objects.map((object) => ({
      object,
      parent: object.parent || state.userObjects,
      index: (object.parent || state.userObjects).children.indexOf(object),
    }));
    deselectAll();
    placements.forEach(({ object, parent }) => parent.remove(object));
    pushAction({
      type: 'Agent delete',
      undo: () => {
        placements
          .slice()
          .sort((a, b) => a.index - b.index)
          .forEach(({ object, parent, index }) => {
            parent.add(object);
            const current = parent.children.indexOf(object);
            if (current >= 0 && index >= 0 && current !== index) {
              parent.children.splice(current, 1);
              parent.children.splice(Math.min(index, parent.children.length), 0, object);
            }
          });
        syncUi();
      },
      redo: () => {
        deselectAll();
        placements.forEach(({ object, parent }) => parent.remove(object));
        syncUi();
      },
    });
    syncUi();
    return makeSceneResult('delete_objects', { deletedIds: args.ids }, args.ids, warnings);
  },

  undo: () => {
    const action = undoHistory();
    syncUi();
    return makeSceneResult('undo', { undone: action });
  },

  redo: () => {
    const action = redoHistory();
    syncUi();
    return makeSceneResult('redo', { redone: action });
  },

  capture_viewport: async (args) => {
    const capture = await captureViewport(args);
    return makeSuccessResult('capture_viewport', capture, {
      scene: getSceneSummary({ includeBounds: false }),
      maxBytes: MAX_CAPTURE_BYTES,
    });
  },

  serialize_scene: async (args) => {
    const { serializeScene } = await import('../viewport/persistence.js');
    const scene = serializeScene();
    return makeSceneResult('serialize_scene', args.detail === 'summary' ? getSceneSummary() : scene);
  },

  export_selected_object: async (args) => {
    const { serializeGroupAsImportJSON } = await import('../viewport/persistence.js');
    const selected = state.selectedMesh
      || (state.selectedMeshes?.size === 1 ? [...state.selectedMeshes][0] : null);
    if (!selected) {
      throw new AgentCommandError('SELECTION_REQUIRED', 'Select exactly one object before exporting it.');
    }
    const exported = serializeGroupAsImportJSON(selected, { format: args.format });
    if (!exported) throw new AgentCommandError('EXPORT_FAILED', 'The selected object cannot be exported.');
    return makeSceneResult('export_selected_object', {
      id: ensureAgentId(selected),
      format: args.format,
      definition: exported,
    });
  },
};

export async function executeAgentCommand(name, rawArgs = {}) {
  try {
    requireReady();
    const args = validateToolArguments(name, rawArgs);
    const handler = handlers[name];
    if (!handler) throw new AgentCommandError('UNKNOWN_COMMAND', `Unknown command: ${name}`);
    return await handler(args);
  } catch (error) {
    return makeErrorResult(name, error);
  }
}

export const agentCommandApi = Object.freeze({
  execute: executeAgentCommand,
});
