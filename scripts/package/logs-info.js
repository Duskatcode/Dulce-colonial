'use strict';

const os = require('os');
const path = require('path');

function getDefaultLogsDir() {
  if (process.platform === 'win32') {
    const appData =
      process.env.APPDATA ??
      path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Dulce Colonial', 'logs');
  }
  if (process.platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Dulce Colonial',
      'logs',
    );
  }
  return path.join(os.homedir(), '.config', 'Dulce Colonial', 'logs');
}

function getKnownLogPaths() {
  const logsDir = getDefaultLogsDir();
  return {
    logsDir,
    backendLogsPath: path.join(logsDir, 'backend-*.log'),
    mainLogsPath: path.join(logsDir, 'electron-*.log'),
  };
}

module.exports = {
  getKnownLogPaths,
};
