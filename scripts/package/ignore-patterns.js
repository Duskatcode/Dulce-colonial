'use strict';

function normalize(relativePath) {
  return relativePath.replace(/\\/g, '/');
}

function shouldIgnoreForMirror(relativePath) {
  const normalized = normalize(relativePath);
  if (
    normalized.startsWith('resources/backend/dist/') &&
    (normalized.endsWith('.d.ts') || normalized.endsWith('.js.map'))
  ) {
    return true;
  }
  if (
    normalized.startsWith('resources/backend/dist/') &&
    normalized.endsWith('.tsbuildinfo')
  ) {
    return true;
  }
  return false;
}

module.exports = {
  shouldIgnoreForMirror,
};
