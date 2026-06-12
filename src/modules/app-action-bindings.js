export function bindDeclarativeActions(root, {
  clickActions = {},
  changeActions = {},
  inputActions = {},
  onError = console.error,
} = {}) {
  const cleanups = [
    bindActionEvent(root, 'click', '[data-action]', 'action', clickActions, onError),
    bindActionEvent(root, 'change', '[data-change-action]', 'changeAction', changeActions, onError),
    bindActionEvent(root, 'input', '[data-input-action]', 'inputAction', inputActions, onError),
  ];

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

function bindActionEvent(root, eventName, selector, datasetKey, actions, onError) {
  const handler = (event) => {
    const element = event.target?.closest?.(selector);
    if (!element) return;
    const action = actions[element.dataset[datasetKey]];
    if (!action) return;
    Promise.resolve(action(element, event)).catch(onError);
  };

  root.addEventListener(eventName, handler);
  return () => root.removeEventListener(eventName, handler);
}
