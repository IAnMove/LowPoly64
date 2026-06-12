import { state } from './state.js';
import { deselectAll, selectMesh } from './selection.js';
import { refreshObjectList, updateSelectedOverlay } from './object-list.js';
import { t } from './i18n.js';
import { createSceneObjectListDomAdapter } from './scene-object-list-dom.js';
import { createSceneObjectListController } from './scene-object-list-controller.js';

export function createBrowserSceneObjectListController({
  getSceneState = () => state,
  getRoot = () => globalThis.document,
  createFacadeController = createSceneObjectListController,
  createSceneObjectListDom = createSceneObjectListDomAdapter,
} = {}) {
  const getRootDocument = () => getRoot();
  const sceneObjectListDom = createSceneObjectListDom({ root: getRootDocument() });

  return createFacadeController({
    getSceneState,
    getContainer: () => getRootDocument()?.getElementById('scene-object-list'),
    translate: t,
    renderList: sceneObjectListDom.renderList,
    deselectAllCommand: deselectAll,
    selectMeshCommand: selectMesh,
    updateSelectedOverlayCommand: updateSelectedOverlay,
    refreshObjectListCommand: refreshObjectList,
  });
}
