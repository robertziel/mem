import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const outputDirs = [
  path.join(repoRoot, 'web', 'public'),
  path.join(repoRoot, 'web', 'assets', 'generated'),
];
const sourceDir = path.join(repoRoot, 'data');

function run(command) {
  return spawnSync(
    command,
    [
      '-m',
      'mem.seed_export',
      '--source',
      sourceDir,
      ...outputDirs.flatMap((outputDir) => ['--output', outputDir]),
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        PYTHONPATH: repoRoot,
      },
    },
  );
}

let result = run(process.env.PYTHON || 'python');
if (result.error || result.status !== 0) {
  result = run('python3');
}

if (result.error || result.status !== 0) {
  process.exit(result.status ?? 1);
}
