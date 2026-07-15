export async function settlePromisesWithTimeout(promises, timeoutMs) {
  const pending = Array.from(promises || []);
  if (pending.length === 0) {
    return { count: 0, timedOut: false };
  }

  const requestedTimeout = Number(timeoutMs);
  const boundedTimeout = Number.isFinite(requestedTimeout)
    ? Math.max(0, requestedTimeout)
    : 0;
  let timeoutId = null;
  const timeoutResult = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve({ count: pending.length, timedOut: true }), boundedTimeout);
  });
  const settledResult = Promise.allSettled(pending)
    .then(() => ({ count: pending.length, timedOut: false }));
  const result = await Promise.race([settledResult, timeoutResult]);
  if (timeoutId !== null) clearTimeout(timeoutId);
  return result;
}
