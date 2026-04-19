import {
  buildAvatarStyleLibraryAudit,
  formatAvatarStyleLibraryAudit,
} from '../src/data/avatar/catalog.js';

const args = new Set(process.argv.slice(2));
const report = buildAvatarStyleLibraryAudit();

if (args.has('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatAvatarStyleLibraryAudit(report));
}

if (args.has('--strict') && report.summary.blockingIssueCount > 0) {
  process.exitCode = 1;
}
