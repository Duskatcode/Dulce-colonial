'use strict';

const fs = require('fs');
const path = require('path');

function walkDir(dirPath, callback) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDir(entryPath, callback);
    } else if (entry.isFile()) {
      callback(entryPath);
    }
  });
}

function removeIf(predicate) {
  return (filePath) => {
    if (predicate(filePath) && fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  };
}

function cleanupBackendArtifacts(packageDir) {
  const backendDist = path.join(packageDir, 'resources', 'backend', 'dist');
  walkDir(
    backendDist,
    removeIf(
      (filePath) =>
        filePath.endsWith('.map') ||
        filePath.endsWith('.d.ts') ||
        filePath.endsWith('.tsbuildinfo'),
    ),
  );
}

function cleanupPackage(packageDir) {
  cleanupBackendArtifacts(packageDir);
}

module.exports = {
  cleanupPackage,
};
