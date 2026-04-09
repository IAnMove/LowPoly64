import fs from 'node:fs';

const checks = [
  {
    path: 'src/main.js',
    validate: (content) => !/row\.innerHTML\s*=/.test(content) && !/list\.innerHTML\s*=/.test(content),
    message: 'src/main.js still contains unsafe animation list innerHTML usage.',
  },
  {
    path: 'src/modules/viewport/persistence.js',
    validate: (content) => /sceneLoadError/.test(content) && /sceneImportError/.test(content),
    message: 'src/modules/viewport/persistence.js does not appear to handle load/import errors.',
  },
  {
    path: 'help.html',
    validate: (content) => {
      const hasLegacyPromptIds = /id="object-prompt"/.test(content) && /id="animation-prompt"/.test(content);
      const hasExpandedPromptIds =
        /id="object-prompt-light"/.test(content) &&
        /id="object-prompt-full"/.test(content) &&
        /id="animation-prompt-light"/.test(content) &&
        /id="animation-prompt-full"/.test(content);
      return hasLegacyPromptIds || hasExpandedPromptIds;
    },
    message: 'help.html is missing the prompt sections.',
  },
];

const failures = [];

for (const check of checks) {
  if (!fs.existsSync(check.path)) {
    failures.push(`Missing required file: ${check.path}`);
    continue;
  }

  const content = fs.readFileSync(check.path, 'utf8');
  if (!check.validate(content)) {
    failures.push(check.message);
  }
}

if (failures.length > 0) {
  console.error('Release readiness checks failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release readiness checks passed.');
