import { state } from './state.js';
import { selectMesh, deselectAll } from './selection.js';
import { t } from './i18n.js';
import {
  createObjectListDomAdapter,
} from './object-list-dom.js';
import { createObjectListController } from './object-list-controller.js';

export function createBrowserObjectListController({
  getObjectListState = () => state,
  getRoot = () => globalThis.document,
  createFacadeController = createObjectListController,
  createObjectListDom = createObjectListDomAdapter,
} = {}) {
  const getRootDocument = () => getRoot();
  const objectListDom = createObjectListDom({ root: getRootDocument() });
  const getElement = (id) => getRootDocument()?.getElementById(id);

  return createFacadeController({
    getObjectListState,
    getContent: () => getElement('object-list-content'),
    getCountElement: () => getElement('object-list-count'),
    getArrow: () => getElement('object-list-arrow'),
    getOverlay: () => getElement('selected-overlay'),
    translate: t,
    renderList: objectListDom.renderList,
    renderToggle: objectListDom.renderToggle,
    renderOverlay: objectListDom.renderOverlay,
    deselectAllCommand: deselectAll,
    selectMeshCommand: selectMesh,
  });
}
