'use strict';

const fs = require('fs');
const path = require('path');
const { verifyMirror } = require('./file-utils');
const { shouldIgnoreForMirror } = require('./ignore-patterns');

function ensureRequiredFiles(packageDir) {
  const required = [
    'Dulce Colonial.exe',
    'INSTALAR.bat',
    '.env',
    'README_CLIENTE.txt',
    path.join('resources', 'backend'),
  ];
  const missing = required.filter((relativePath) => {
    const absolute = path.join(packageDir, relativePath);
    return !fs.existsSync(absolute);
  });
  return missing;
}

function reportKeyAssets(packageDir) {
  const rootFiles = fs.existsSync(packageDir)
    ? fs.readdirSync(packageDir)
    : [];
  const dlls = rootFiles.filter(
    (file) => file.toLowerCase().endsWith('.dll'),
  );
  const ffmpegPath = path.join(packageDir, 'ffmpeg.dll');
  const localesPath = path.join(packageDir, 'locales');

  return {
    ffmpegExists: fs.existsSync(ffmpegPath),
    localesExists: fs.existsSync(localesPath),
    dlls,
  };
}

function diffAgainstWinUnpacked(sourceDir, packageDir) {
  return verifyMirror(sourceDir, packageDir, {
    ignore: shouldIgnoreForMirror,
  });
}

module.exports = {
  ensureRequiredFiles,
  reportKeyAssets,
  diffAgainstWinUnpacked,
};
