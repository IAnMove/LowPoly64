let actionContext = null;

export function getActionContext() {
  if (!actionContext) {
    throw new Error('Action context has not been configured');
  }
  return actionContext;
}

export function configureActionContext(context = {}) {
  actionContext = createActionContext(context);
  return actionContext;
}

export function createActionContext(context = {}) {
  const getActionState = context.getActionState || (() => context.state);
  return {
    ...context,
    getActionState,
  };
}

export function resetActionContext() {
  actionContext = null;
}
