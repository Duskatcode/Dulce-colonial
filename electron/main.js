process.on('uncaughtException', (err) => {
  if (err && err.code === 'EPIPE') return;
  console.error('[Electron] Uncaught exception:', err?.message ?? err);
});

const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let backendProcess;
const isDev = !app.isPackaged;
let logContext;

function initLogStreams() {
  const logsDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const electronLogPath = path.join(logsDir, `electron-${timestamp}.log`);
  const backendStdoutPath = path.join(logsDir, `backend-${timestamp}.log`);
  const backendStderrPath = path.join(
    logsDir,
    `backend-error-${timestamp}.log`,
  );
  logContext = {
    logsDir,
    timestamp,
    electronStream: fs.createWriteStream(electronLogPath, { flags: 'a' }),
    backendStdoutStream: fs.createWriteStream(backendStdoutPath, {
      flags: 'a',
    }),
    backendStderrStream: fs.createWriteStream(backendStderrPath, {
      flags: 'a',
    }),
    electronLogPath,
    backendStdoutPath,
    backendStderrPath,
  };
  logElectron(`Logs inicializados en ${logsDir}`);
  return logContext;
}

function logElectron(message) {
  const formatted = `[Electron] ${message}`;
  console.log(formatted);
  if (logContext?.electronStream) {
    logContext.electronStream.write(
      `${new Date().toISOString()} ${formatted}\n`,
    );
  }
}

function writeBackendLog(type, chunk) {
  const stream =
    type === 'stderr'
      ? logContext?.backendStderrStream
      : logContext?.backendStdoutStream;
  if (stream) {
    stream.write(chunk);
  }
}

function closeLogStreams() {
  if (logContext?.electronStream) logContext.electronStream.end();
  if (logContext?.backendStdoutStream) logContext.backendStdoutStream.end();
  if (logContext?.backendStderrStream) logContext.backendStderrStream.end();
}

function ensureEnv() {
  const envPath = isDev
    ? path.join(__dirname, '../backend_dulce_colonial/.env')
    : path.join(process.resourcesPath, 'backend/.env');

  if (!fs.existsSync(envPath)) {
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const content = [
      'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dulce_colonial?schema=public"',
      `JWT_SECRET="${jwtSecret}"`,
      'JWT_EXPIRES_IN="8h"',
      'PORT=3000',
      'NODE_ENV=production',
      'GOOGLE_REDIRECT_URI=http://localhost:3000/google/callback',
    ].join('\n');
    fs.writeFileSync(envPath, content);
    console.log('[Electron] .env creado automáticamente');
  }
}

// ─── Launch NestJS backend ────────────────────────────────────────
function startBackend() {
  const backendRoot = isDev
    ? path.join(__dirname, '../backend_dulce_colonial')
    : path.join(process.resourcesPath, 'backend');
  const backendEnv = {
    ...process.env,
    NODE_ENV: 'production',
    NODE_PATH: path.join(backendRoot, 'node_modules'),
  };

  if (isDev) {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    backendProcess = spawn(command, ['run', 'start:prod'], {
      cwd: backendRoot,
      env: backendEnv,
      stdio: 'pipe',
    });
  } else {
    const backendEntry = path.join(backendRoot, 'dist/main.js');
    backendProcess = spawn(process.execPath, [backendEntry], {
      cwd: backendRoot,
      env: backendEnv,
      stdio: 'pipe',
    });
  }

  backendProcess.stdout?.on('data', (data) => {
    try {
      process.stdout.write('[Backend] ' + data.toString());
    } catch (_) {}
    writeBackendLog('stdout', data);
  });

  backendProcess.stderr?.on('data', (data) => {
    try {
      process.stderr.write('[Backend Error] ' + data.toString());
    } catch (_) {}
    writeBackendLog('stderr', data);
  });

  backendProcess.stdout?.on('error', () => {});
  backendProcess.stderr?.on('error', () => {});

  backendProcess.on('close', (code) => {
    logElectron(`[Backend] proceso finalizado con código ${code}`);
  });
}

// ─── Wait for backend to be ready ────────────────────────────────
function waitForBackend(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      if (remaining <= 0) {
        reject(new Error('Backend did not start in time'));
        return;
      }
      http
        .get('http://localhost:3000/api/v1/health', (res) => {
          if (res.statusCode === 200) resolve();
          else setTimeout(() => check(remaining - 1), 1000);
        })
        .on('error', () => {
          setTimeout(() => check(remaining - 1), 1000);
        });
    };
    check(retries);
  });
}

// ─── Create main window ───────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'Dulce Colonial',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  const frontendPath = isDev
    ? 'http://localhost:5173'
    : url.format({
        pathname: path.join(process.resourcesPath, 'frontend/index.html'),
        protocol: 'file:',
        slashes: true,
      });

  mainWindow.loadURL(frontendPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────
app.whenReady().then(async () => {
  initLogStreams();
  ensureEnv();
  startBackend();

  try {
    await waitForBackend();
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      'Error al iniciar Dulce Colonial',
      [
        'No se pudo iniciar el servidor interno en el tiempo esperado.',
        'Verifica PostgreSQL, vuelve a ejecutar INSTALAR.bat',
        'y revisa los logs en:',
        logContext?.logsDir ?? 'Ver README_CLIENTE',
      ].join('\n'),
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
  closeLogStreams();
});

app.on('will-quit', () => {
  closeLogStreams();
});
