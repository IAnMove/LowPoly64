// A pending design never becomes a scene object until commit succeeds.
export class CharacterDraftError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export class CharacterDraftStore {
  constructor({ maxDrafts = 6, maxCorrections = 3, dispose = () => {} } = {}) {
    this.drafts = new Map();
    this.operations = new Map();
    this.maxDrafts = maxDrafts;
    this.maxCorrections = maxCorrections;
    this.dispose = dispose;
  }

  async once(command, args, action) {
    const key = args.operation_id;
    if (typeof key !== 'string' || key.trim().length < 1) {
      throw new CharacterDraftError('OPERATION_ID_REQUIRED', 'Use a nonempty unique operation_id. Reuse it only when retrying the identical request.');
    }
    const signature = JSON.stringify([command, args]);
    const previous = this.operations.get(key);
    if (previous) {
      if (previous.signature !== signature) throw new CharacterDraftError('OPERATION_ID_REUSED', 'This operation_id belongs to a different request. Use a new operation_id.');
      return previous.promise;
    }
    // Keep rejected operations too: a retry cannot silently acquire new meaning.
    const promise = Promise.resolve().then(action);
    this.operations.set(key, { signature, promise });
    if (this.operations.size > 256) this.operations.delete(this.operations.keys().next().value);
    return promise;
  }

  create({ group, recipe, engine = 'studio', sourceId = null, sourceFingerprint = null }) {
    if (this.drafts.size >= this.maxDrafts) {
      throw new CharacterDraftError('DRAFT_LIMIT', `At most ${this.maxDrafts} drafts may be open. Commit or discard an existing draft.`, { draftIds: [...this.drafts.keys()] });
    }
    const id = `draft_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
    const draft = { id, engine, sourceId, sourceFingerprint, revision: 0, versions: [{ group, recipe }], createdAt: Date.now() };
    this.drafts.set(id, draft);
    return draft;
  }

  get(id, expectedRevision) {
    const draft = this.drafts.get(id);
    if (!draft) throw new CharacterDraftError('DRAFT_NOT_FOUND', 'This draft has been committed, discarded or belongs to a different editor session.', { draftId: id });
    if (expectedRevision !== undefined && draft.revision !== expectedRevision) {
      throw new CharacterDraftError('REVISION_CONFLICT', 'The draft changed. Read get_character_recipe and retry with its revision and a new operation_id.', { expectedRevision, actualRevision: draft.revision });
    }
    return draft;
  }

  version(draft, revision = draft.revision) {
    const version = draft.versions[revision];
    if (!version) throw new CharacterDraftError('REVISION_NOT_FOUND', 'Choose an existing draft revision.', { revisions: draft.versions.map((_, i) => i) });
    return version;
  }

  append(draft, { group, recipe }) {
    if (draft.revision >= this.maxCorrections) {
      throw new CharacterDraftError('CORRECTION_LIMIT', 'This draft has reached three corrections. Review and commit the best revision, or discard it.');
    }
    draft.versions.push({ group, recipe });
    draft.revision += 1;
    return draft;
  }

  release(id, retainedGroup = null) {
    const draft = this.get(id);
    this.drafts.delete(id);
    draft.versions.forEach(({ group }) => { if (group !== retainedGroup) this.dispose(group); });
  }

  clear() {
    for (const id of this.drafts.keys()) this.release(id);
    this.operations.clear();
  }

  describe(draft) {
    return {
      draftId: draft.id, engine: draft.engine, sourceId: draft.sourceId,
      revision: draft.revision, revisions: draft.versions.map((_, revision) => revision),
      correctionsRemaining: this.maxCorrections - draft.revision,
      recipe: this.version(draft).recipe,
      inScene: false,
    };
  }
}
