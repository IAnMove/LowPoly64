// Keep the comparison prototype available for regression tools, while old
// user bookmarks now lead to the real editor workspace.
if (new URLSearchParams(window.location.search).get('comparison') === '1') {
  document.documentElement.dataset.speechComparison = '';
  await import('./speech-lab.js');
} else {
  window.location.replace('/?studio=speech');
}
