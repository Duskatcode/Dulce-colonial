'use strict';

const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(name, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n[release:ready] ${name}`);
    const child = spawn(npmCmd, args, {
      cwd: repoRoot,
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${name} falló con código ${code}`),
        );
      }
    });
  });
}

async function main() {
  const verifyArgs = process.argv.slice(2);
  const steps = [
    { name: 'Prisma generate', command: ['run', 'prisma:generate'] },
    { name: 'Build backend', command: ['run', 'build:backend'] },
    { name: 'Package client', command: ['run', 'package:client'] },
    {
      name: 'Verify client',
      command:
        verifyArgs.length > 0
          ? ['run', 'verify:client', '--', ...verifyArgs]
          : ['run', 'verify:client'],
    },
  ];

  for (const step of steps) {
    await runStep(step.name, step.command);
  }

  console.log('\n[release:ready] Release listo para evaluación final.');
}

main().catch((err) => {
  console.error('[release:ready] ERROR:', err.message);
  process.exit(1);
});
