import {
  renderObjectList,
  renderObjectListToggle,
  renderSelectedOverlay,
} from './object-list-dom.js';

export function createObjectListController({
  getObjectListState = () => ({}),
  getCountElement = () => null,
  getContent = () => null,
  getArrow = () => null,
  getOverlay = () => null,
  translate = (key) => key,
  renderList = renderObjectList,
  renderToggle = renderObjectListToggle,
  renderOverlay = renderSelectedOverlay,
  deselectAllCommand = () => {},
  selectMeshCommand = () => {},
} = {}) {
  let listOpen = false;

  function selectObjectFromList(obj, overrides = {}) {
    const deps = {
      deselectAllCommand,
      selectMeshCommand,
      updateSelectedOverlayCommand: updateSelectedOverlay,
      refreshObjectListCommand: refreshObjectList,
      ...overrides,
    };

    deps.deselectAllCommand();
    deps.selectMeshCommand(obj);
    deps.updateSelectedOverlayCommand();
    deps.refreshObjectListCommand();
  }

  function toggleObjectList(overrides = {}) {
    const deps = {
      getContent,
      getArrow,
      renderToggle,
      refreshList: refreshObjectList,
      ...overrides,
    };

    listOpen = !listOpen;
    const rendered = deps.renderToggle(listOpen, {
      content: deps.getContent(),
      arrow: deps.getArrow(),
    });
    if (listOpen) {
      deps.refreshList();
    }
    return rendered;
  }

  function refreshObjectList(overrides = {}) {
    const deps = {
      getObjectListState,
      getCountElement,
      getContent,
      isOpen: listOpen,
      translate,
      renderList,
      selectObject: (obj) => selectObjectFromList(obj),
      refreshList: refreshObjectList,
      ...overrides,
    };
    const objectListState = deps.getObjectListState() || {};
    const userObjects = objectListState.userObjects;
    const children = userObjects ? userObjects.children : [];

    return deps.renderList({
      content: deps.getContent(),
      countElement: deps.getCountElement(),
      objects: children,
      isOpen: deps.isOpen,
      rootObject: userObjects,
      selectedObject: objectListState.selectedMesh,
      selectedObjects: objectListState.selectedMeshes || new Set(),
      translate: deps.translate,
      onSelect: deps.selectObject,
      onSelectRoot: deps.selectObject,
      onToggleExpanded: (obj) => {
        obj._listExpanded = !obj._listExpanded;
        deps.refreshList();
      },
    });
  }

  function updateSelectedOverlay(overrides = {}) {
    const deps = {
      getObjectListState,
      getOverlay,
      renderOverlay,
      ...overrides,
    };
    const objectListState = deps.getObjectListState() || {};

    return deps.renderOverlay(objectListState.selectedMesh, {
      overlay: deps.getOverlay(),
    });
  }

  return {
    refreshObjectList,
    toggleObjectList,
    updateSelectedOverlay,
  };
}
