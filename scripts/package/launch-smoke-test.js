'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForHealth(healthUrl, timeoutMs, intervalMs = 1000) {
  const endTime = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (Date.now() > endTime) {
        reject(new Error('Timeout esperando healthcheck'));
        return;
      }
      http
        .get(healthUrl, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            wait(intervalMs).then(attempt);
          }
        })
        .on('error', () => {
          wait(intervalMs).then(attempt);
        });
    };
    attempt();
  });
}

async function launchSmokeTest({
  executablePath,
  cwd,
  logDir,
  healthUrl = 'http://localhost:3000/api/v1/health',
  timeoutMs = 60000,
}) {
  const stdoutPath = path.join(logDir, 'smoke-test-stdout.log');
  const stderrPath = path.join(logDir, 'smoke-test-stderr.log');
  const stdoutStream = fs.createWriteStream(stdoutPath, { flags: 'a' });
  const stderrStream = fs.createWriteStream(stderrPath, { flags: 'a' });

  const child = spawn(executablePath, [], {
    cwd,
    stdio: 'pipe',
    windowsHide: true,
  });

  child.stdout?.on('data', (chunk) => {
    stdoutStream.write(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    stderrStream.write(chunk);
  });

  const killApp = () => {
    if (!child.killed) {
      try {
        child.kill();
      } catch (_) {
        // ignore
      }
    }
  };

  try {
    await waitForHealth(healthUrl, timeoutMs);
    killApp();
    return {
      stdoutPath,
      stderrPath,
    };
  } catch (error) {
    killApp();
    throw error;
  } finally {
    stdoutStream.end();
    stderrStream.end();
  }
}

module.exports = {
  launchSmokeTest,
};
