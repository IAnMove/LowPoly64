#!/usr/bin/env node
// Dev tool (tasks.md H1.1): dumps generated head meshes as JSON so external
// renderers (e.g. tools/render-head-preview.py) can rasterize previews
// without booting the editor. Usage: node scripts/preview-generated-head.mjs [presetId ...]
import process from 'node:process';
import {
  buildGeneratedHeadById,
  GENERATED_HEAD_PRESETS,
} from '../src/data/avatar/generated-heads.js';

const ids = process.argv.slice(2);
const targets = ids.length > 0 ? ids : GENERATED_HEAD_PRESETS.map((p) => p.id);
process.stdout.write(JSON.stringify(targets.map((id) => buildGeneratedHeadById(id))));
