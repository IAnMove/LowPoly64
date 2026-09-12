// A static host may return index.html with HTTP 200 for an unknown API route.
// Treat only the explicit service contract as evidence of a local engine.
export async function probeSpeechService({ signal, fetchImpl = fetch } = {}) {
  try {
    const response = await fetchImpl('/api/speech/rhubarb/status', { signal, cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return 'unavailable';
    const data = await response.json();
    if (data.ok !== true || typeof data.installed !== 'boolean') return 'unavailable';
    return data.installed ? 'ready' : 'missing';
  } catch {
    return 'unavailable';
  }
}
