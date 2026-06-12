import {
  addTemplateFromRegistry,
  buildTemplateGroupForRuntime,
  getTemplateCategoriesFromRegistry,
} from './template-runtime-flow.js';

function noopRenderTemplateList() {}

export function createTemplateController({
  registry,
  createMaterial,
  getTemplateState,
  getMaterialType = () => undefined,
  getSelectedMesh = () => undefined,
  getUserObjects = () => undefined,
  selectMesh,
  deselect,
  pushAction,
  compileAnimation,
  translate = (key) => key,
  onMissingTemplate = () => {},
  renderTemplateListCommand = noopRenderTemplateList,
  addTemplateFromRegistryCommand = addTemplateFromRegistry,
  buildTemplateGroupForRuntimeCommand = buildTemplateGroupForRuntime,
  getTemplateCategoriesFromRegistryCommand = getTemplateCategoriesFromRegistry,
} = {}) {
  const getRuntimeState = createTemplateRuntimeStateGetter({
    getTemplateState,
    getMaterialType,
    getSelectedMesh,
    getUserObjects,
  });

  function buildGroupFromDefinition(definition, { compileAnimations = true } = {}) {
    return buildTemplateGroupForRuntimeCommand(definition, {
      compileAnimations,
      compileAnimation,
      createMaterial,
      getMaterialType: () => getRuntimeState().currentMaterialType,
    });
  }

  function addTemplate(id) {
    const runtimeState = getRuntimeState();
    return addTemplateFromRegistryCommand(id, {
      registry,
      buildGroup: buildGroupFromDefinition,
      userObjects: runtimeState.userObjects,
      getSelectedMesh: () => getRuntimeState().selectedMesh,
      selectMesh,
      deselect,
      pushAction,
      actionType: translate('actionCreateTemplate'),
      onMissingTemplate,
    });
  }

  function getCategories() {
    return getTemplateCategoriesFromRegistryCommand(registry);
  }

  function generateTemplateListUI(container, onTemplateSelected = addTemplate) {
    return renderTemplateListCommand(container, getCategories(), {
      onTemplateSelected,
      translate,
    });
  }

  return {
    addTemplate,
    buildGroupFromDefinition,
    generateTemplateListUI,
    getCategories,
  };
}

export function createTemplateRuntimeStateGetter({
  getTemplateState,
  getMaterialType = () => undefined,
  getSelectedMesh = () => undefined,
  getUserObjects = () => undefined,
} = {}) {
  return () => {
    const templateState = getTemplateState?.() || {};
    return {
      currentMaterialType: templateState.currentMaterialType
        ?? templateState.materialType
        ?? getMaterialType(),
      selectedMesh: templateState.selectedMesh ?? getSelectedMesh(),
      userObjects: templateState.userObjects ?? getUserObjects(),
    };
  };
}
