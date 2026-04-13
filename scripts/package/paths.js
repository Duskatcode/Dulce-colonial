'use strict';

const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function resolveRoot(customRoot) {
  return customRoot ? path.resolve(process.cwd(), customRoot) : repoRoot;
}

function getWinUnpackedDir(rootDir) {
  return path.join(rootDir, 'electron', 'dist', 'win-unpacked');
}

function getReleaseDir(rootDir) {
  return path.join(rootDir, 'release');
}

function getInstallerPath(rootDir) {
  return path.join(rootDir, 'electron', 'INSTALAR.bat');
}

function getBackendEnvSource(rootDir) {
  return path.join(rootDir, 'backend_dulce_colonial', '.env');
}

function getPackageDir(outDir, packageName) {
  return path.join(outDir, packageName);
}

function getPackageZipPath(outDir, packageName) {
  return path.join(outDir, `${packageName}.zip`);
}

function getResourcesDir(packageDir) {
  return path.join(packageDir, 'resources');
}

function getBackendDir(packageDir) {
  return path.join(getResourcesDir(packageDir), 'backend');
}

function getBackendEnv(packageDir) {
  return path.join(getBackendDir(packageDir), '.env');
}

function getVerificationLogsDir(rootDir) {
  return path.join(getReleaseDir(rootDir), 'verification');
}

module.exports = {
  repoRoot,
  resolveRoot,
  getWinUnpackedDir,
  getReleaseDir,
  getInstallerPath,
  getBackendEnvSource,
  getPackageDir,
  getPackageZipPath,
  getResourcesDir,
  getBackendDir,
  getBackendEnv,
  getVerificationLogsDir,
};
