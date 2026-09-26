// Zips the production build (dist/) plus the source repository into
// release/whiteboard-app.zip, excluding node_modules/dist/release itself.
// Requires the system `zip` binary.
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';

const outDir = 'release';
const outFile = `${outDir}/whiteboard-app.zip`;

if (!existsSync(outDir)) mkdirSync(outDir);

execFileSync(
  'zip',
  [
    '-r',
    outFile,
    '.',
    '-x',
    'node_modules/*',
    '-x',
    'dist/*',
    '-x',
    'release/*',
    '-x',
    '.git/*',
  ],
  { stdio: 'inherit' },
);

console.log(`Wrote ${outFile}`);
