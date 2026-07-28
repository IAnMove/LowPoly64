import crypto from 'node:crypto';
import { CompanionError } from './session-registry.js';

export class ApprovalManager {
  constructor(options = {}) {
    this.pending = new Map();
    this.timeoutMs = options.timeoutMs || 120_000;
  }

  request(data, signal) {
    const id = crypto.randomUUID();
    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    const timer = setTimeout(() => {
      this.pending.delete(id);
      rejectPromise(new CompanionError('APPROVAL_TIMEOUT', 'Destructive action approval timed out.', { approvalId: id }));
    }, this.timeoutMs);
    const abort = () => {
      clearTimeout(timer);
      this.pending.delete(id);
      rejectPromise(new CompanionError('ASSISTANT_CANCELLED', 'Assistant request was cancelled.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    this.pending.set(id, {
      id,
      data,
      createdAt: Date.now(),
      settle: (approved) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        this.pending.delete(id);
        resolvePromise(Boolean(approved));
      },
    });
    return { id, promise };
  }

  resolve(id, approved) {
    const pending = this.pending.get(id);
    if (!pending) {
      throw new CompanionError('APPROVAL_NOT_FOUND', 'This approval is no longer pending.', { approvalId: id });
    }
    pending.settle(approved);
    return { id, approved: Boolean(approved) };
  }

  list() {
    return [...this.pending.values()].map(({ id, data, createdAt }) => ({ id, data, createdAt }));
  }
}
