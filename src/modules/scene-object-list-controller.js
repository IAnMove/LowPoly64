import { renderSceneObjectList } from './scene-object-list-dom.js';

export function createSceneObjectListController({
  getSceneState = () => ({}),
  getContainer = () => null,
  translate = (key) => key,
  renderList = renderSceneObjectList,
  deselectAllCommand = () => {},
  selectMeshCommand = () => {},
  updateSelectedOverlayCommand = () => {},
  refreshObjectListCommand = () => {},
} = {}) {
  function selectSceneObject(obj, overrides = {}) {
    const deps = {
      deselectAllCommand,
      selectMeshCommand,
      updateSelectedOverlayCommand,
      refreshObjectListCommand,
      ...overrides,
    };

    deps.deselectAllCommand();
    deps.selectMeshCommand(obj);
    deps.updateSelectedOverlayCommand();
    deps.refreshObjectListCommand();
  }

  function refreshSceneObjectList(overrides = {}) {
    const deps = {
      getSceneState,
      getContainer,
      translate,
      renderList,
      onSelect: (obj) => selectSceneObject(obj),
      ...overrides,
    };
    const sceneState = deps.getSceneState() || {};
    const children = sceneState.userObjects ? sceneState.userObjects.children : [];

    return deps.renderList(children, {
      container: deps.getContainer(),
      translate: deps.translate,
      onSelect: deps.onSelect,
    });
  }

  return {
    refreshSceneObjectList,
  };
}
