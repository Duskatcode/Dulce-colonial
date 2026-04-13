'use strict';

const path = require('path');
const archiver = require('archiver');
const {
  assertPathExists,
  ensureDir,
  removeIfExists,
  copyDirectory,
  copyFile,
  verifyMirror,
} = require('./file-utils');
const {
  getWinUnpackedDir,
  getInstallerPath,
  getBackendEnvSource,
  getPackageDir,
} = require('./paths');
const { cleanupPackage } = require('./cleanup');
const { generateClientGuide } = require('./generate-guide');
const { shouldIgnoreForMirror } = require('./ignore-patterns');

async function createZip(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(zipPath));
    const output = require('fs').createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function prepareClientPackage({
  rootDir,
  envFile,
  outDir,
  packageName,
  zip = false,
}) {
  const buildDir = getWinUnpackedDir(rootDir);
  const installerPath = getInstallerPath(rootDir);
  const envSource = envFile ?? getBackendEnvSource(rootDir);

  assertPathExists(buildDir, 'Build win-unpacked');
  assertPathExists(installerPath, 'INSTALAR.bat');
  assertPathExists(envSource, 'Archivo .env');

  ensureDir(outDir);
  const finalDir = getPackageDir(outDir, packageName);
  removeIfExists(finalDir);
  ensureDir(finalDir);

  copyDirectory(buildDir, finalDir);
  copyFile(installerPath, path.join(finalDir, 'INSTALAR.bat'));
  copyFile(envSource, path.join(finalDir, '.env'));

  cleanupPackage(finalDir);
  const packageJson = require(path.join(rootDir, 'electron', 'package.json'));
  const guidePath = generateClientGuide(finalDir, {
    version: packageJson.version,
    logsPathHint: '%APPDATA%/Dulce Colonial/logs',
  });

  const missing = verifyMirror(buildDir, finalDir, {
    ignore: shouldIgnoreForMirror,
  });
  if (missing.length > 0) {
    throw new Error(
      [
        'El paquete final no contiene todos los archivos del build original.',
        'Faltantes:',
        ...missing.map((item) => ` - ${item}`),
      ].join('\n'),
    );
  }

  let zipFile;
  if (zip) {
    zipFile = path.join(outDir, `${packageName}.zip`);
    removeIfExists(zipFile);
    await createZip(finalDir, zipFile);
  }

  return {
    finalDir,
    guidePath,
    zipFile,
  };
}

module.exports = {
  prepareClientPackage,
};
