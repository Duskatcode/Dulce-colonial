'use strict';

const fs = require('fs');
const path = require('path');

function assertPathExists(targetPath, description) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${description} no encontrado: ${targetPath}`);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stats = fs.lstatSync(targetPath);
  if (stats.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.rmSync(targetPath, { force: true });
  }
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyDirectory(source, target) {
  assertPathExists(source, `Directorio origen ${source}`);
  ensureDir(target);
  const entries = fs.readdirSync(source, { withFileTypes: true });
  entries.forEach((entry) => {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(sourcePath);
      fs.symlinkSync(link, targetPath);
    } else {
      copyFile(sourcePath, targetPath);
    }
  });
}

function collectEntries(rootDir) {
  const entries = [];
  const queue = ['.'];
  while (queue.length > 0) {
    const current = queue.pop();
    const absoluteCurrent =
      current === '.' ? rootDir : path.join(rootDir, current);
    const relativeBase = current === '.' ? '' : current;
    const dirEntries = fs.readdirSync(absoluteCurrent, {
      withFileTypes: true,
    });
    dirEntries.forEach((entry) => {
      const relPath = relativeBase
        ? path.join(relativeBase, entry.name)
        : entry.name;
      const absolutePath = path.join(rootDir, relPath);
      const isDirectory = entry.isDirectory();
      entries.push({
        relativePath: relPath,
        absolutePath,
        isDirectory,
        isFile: entry.isFile(),
        isSymbolicLink: entry.isSymbolicLink(),
      });
      if (isDirectory) queue.push(relPath);
    });
  }
  return entries;
}

function verifyMirror(sourceDir, targetDir, options = {}) {
  const { ignore } = options;
  const missing = [];
  const entries = collectEntries(sourceDir);
  entries.forEach(({ relativePath, isDirectory, isFile, isSymbolicLink }) => {
    if (ignore && ignore(relativePath)) return;
    const targetPath = path.join(targetDir, relativePath);
    if (!fs.existsSync(targetPath)) {
      missing.push(relativePath);
      return;
    }
    const targetStats = fs.lstatSync(targetPath);
    if (isSymbolicLink && !targetStats.isSymbolicLink()) {
      missing.push(`${relativePath} (esperado enlace simbolico)`);
    }
    if (isDirectory && !targetStats.isDirectory()) {
      missing.push(`${relativePath} (esperado directorio)`);
    }
    if (isFile && !targetStats.isFile()) {
      missing.push(`${relativePath} (esperado archivo)`);
    }
  });
  return missing;
}

module.exports = {
  assertPathExists,
  ensureDir,
  removeIfExists,
  copyFile,
  copyDirectory,
  collectEntries,
  verifyMirror,
};
