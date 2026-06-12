export function formatAnimationImportFeedback(result) {
  return result.warnings ? result.warnings.join(' | ') : '';
}

export function submitAnimationImport({
  text,
  group,
  requireGroup = false,
  messages,
  importAnimationToGroup,
}) {
  if (!text) {
    return { success: false, error: messages.missingText };
  }

  if (!group || (requireGroup && !group.isGroup)) {
    return { success: false, error: messages.missingTarget };
  }

  const result = importAnimationToGroup(text, group);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    feedback: formatAnimationImportFeedback(result),
    result,
  };
}

export function runAnimationImportSubmit({
  getText = () => '',
  getGroup = () => null,
  requireGroup = false,
  messages,
  importAnimationToGroup,
  submitImport = submitAnimationImport,
  clearText = () => {},
  setError = () => {},
  refreshAnimationList = () => {},
  showTimelineForGroup = () => {},
} = {}) {
  const group = getGroup();
  const result = submitImport({
    text: getText(),
    group,
    requireGroup,
    messages,
    importAnimationToGroup,
  });

  if (!result.success) {
    setError(result.error);
    return false;
  }

  clearText();
  setError(result.feedback);
  refreshAnimationList();
  showTimelineForGroup(group);
  return true;
}
