'use strict';

const fs = require('fs');
const path = require('path');
const {
  resolveRoot,
  getReleaseDir,
  getPackageDir,
  getPackageZipPath,
  getWinUnpackedDir,
  getVerificationLogsDir,
} = require('./package/paths');
const { ensureDir } = require('./package/file-utils');
const {
  ensureRequiredFiles,
  reportKeyAssets,
  diffAgainstWinUnpacked,
} = require('./package/verify-structure');
const { launchSmokeTest } = require('./package/launch-smoke-test');
const { writeFinalFeedback } = require('./package/final-feedback');
const { printConsoleSummary } = require('./package/console-summary');
const { getKnownLogPaths } = require('./package/logs-info');

function parseArgs(argv) {
  const args = {
    root: null,
    packageName: 'Dulce Colonial Cliente',
    packageDir: null,
    skipSmokeTest: false,
    healthUrl: 'http://localhost:3000/api/v1/health',
    timeout: 60000,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;
    switch (arg) {
      case '--root':
        args.root = argv[++i];
        break;
      case '--package':
        args.packageName = argv[++i] ?? args.packageName;
        break;
      case '--dir':
        args.packageDir = argv[++i];
        break;
      case '--skip-smoke-test':
        args.skipSmokeTest = true;
        break;
      case '--health-url':
        args.healthUrl = argv[++i] ?? args.healthUrl;
        break;
      case '--timeout':
        args.timeout = parseInt(argv[++i] ?? args.timeout, 10);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.warn(`Argumento desconocido: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Uso:
  node scripts/verify-client-package.js [opciones]

Opciones:
  --root <ruta>      Raíz del repo. Default: carpeta padre de scripts/.
  --package <nombre> Nombre del paquete dentro de release/.
  --dir <ruta>       Ruta directa hacia la carpeta del paquete (ignora --package).
  --skip-smoke-test  Omite la prueba de arranque (solo para diagnósticos).
  --health-url <url> Endpoint de healthcheck. Default: http://localhost:3000/api/v1/health.
  --timeout <ms>     Tiempo máximo para healthcheck. Default: 60000.
  --help             Muestra esta ayuda.
`);
}

function createLogWriters(baseDir, packageName) {
  ensureDir(baseDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const packageLogDir = path.join(baseDir, packageName);
  ensureDir(packageLogDir);
  const logPath = path.join(packageLogDir, `verify-${timestamp}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  const log = (message) => {
    const line = `[${new Date().toISOString()}] ${message}`;
    console.log(line);
    logStream.write(`${line}\n`);
  };
  const close = () =>
    new Promise((resolve) => {
      logStream.end(resolve);
    });
  return { log, close, logPath, packageLogDir, timestamp };
}

function composeSummary(result, { skipReason, errorMessage }) {
  if (result.readyForClient) {
    return {
      summary: `Paquete "${result.packageName}" validado correctamente en ${process.platform}.`,
      nextAction: 'Enviar la carpeta y el ZIP al cliente junto con README_CLIENTE.txt.',
      failureCause: null,
    };
  }

  if (!result.packageBuildExists) {
    return {
      summary: 'No se encontró la carpeta del paquete generado.',
      nextAction:
        'Ejecuta npm run package:client y vuelve a correr npm run verify:client.',
      failureCause: 'Paquete no generado.',
    };
  }

  if (!result.structureCheckPassed) {
    const message =
      errorMessage ||
      'La estructura del paquete no coincide con win-unpacked.';
    return {
      summary: message,
      nextAction:
        'Revisa los faltantes, vuelve a empaquetar y repite la verificación.',
      failureCause: message,
    };
  }

  if (!result.smokeTestExecuted) {
    const message =
      skipReason ||
      'Smoke test pendiente: se requiere ejecutar en Windows sin --skip-smoke-test.';
    return {
      summary: message,
      nextAction:
        'Ejecuta npm run release:ready en una máquina Windows para completar la validación.',
      failureCause: message,
    };
  }

  if (!result.smokeTestPassed || !result.healthcheckPassed) {
    const message =
      errorMessage ||
      'Smoke test falló: healthcheck no respondió dentro del tiempo esperado.';
    return {
      summary: message,
      nextAction:
        'Revisa los logs del backend y del smoke test antes de reenviar al cliente.',
      failureCause: message,
    };
  }

  return {
    summary:
      errorMessage || 'Validación incompleta, revisa los logs de verificación.',
    nextAction: 'Consulta los logs y corrige los hallazgos antes de reintentar.',
    failureCause: errorMessage || 'Validación incompleta.',
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = resolveRoot(args.root);
  const releaseDir = getReleaseDir(rootDir);
  const packageDir = args.packageDir
    ? path.resolve(process.cwd(), args.packageDir)
    : getPackageDir(releaseDir, args.packageName);
  const packageZipPath = getPackageZipPath(releaseDir, args.packageName);
  const verificationBaseDir = getVerificationLogsDir(rootDir);

  const logContext = createLogWriters(
    verificationBaseDir,
    args.packageName,
  );
  const logPaths = getKnownLogPaths();

  const state = {
    packageName: args.packageName,
    packagePath: packageDir,
    packageZipPath,
    packageBuildExists: false,
    structureCheckPassed: false,
    smokeTestExecuted: false,
    smokeTestPassed: false,
    healthcheckPassed: false,
    backendLogsPath: logPaths.backendLogsPath,
    mainLogsPath: logPaths.mainLogsPath,
  };

  let runError = null;
  let skipReason = null;

  try {
    logContext.log(`Verificando paquete en ${packageDir}`);
    state.packageBuildExists = fs.existsSync(packageDir);
    if (!state.packageBuildExists) {
      throw new Error(
        `Carpeta del paquete no encontrada: ${packageDir}`,
      );
    }

    const requiredMissing = ensureRequiredFiles(packageDir);
    if (requiredMissing.length > 0) {
      throw new Error(
        `Faltan archivos obligatorios:\n${requiredMissing
          .map((f) => ` - ${f}`)
          .join('\n')}`,
      );
    }

    const winUnpackedDir = getWinUnpackedDir(rootDir);
    const diff = diffAgainstWinUnpacked(winUnpackedDir, packageDir);
    if (diff.length > 0) {
      throw new Error(
        [
          'El paquete no refleja completamente win-unpacked:',
          ...diff.map((item) => ` - ${item}`),
        ].join('\n'),
      );
    }

    state.structureCheckPassed = true;
    logContext.log('Mirror de win-unpacked verificado correctamente.');

    const assetReport = reportKeyAssets(packageDir);
    logContext.log(
      `ffmpeg.dll: ${assetReport.ffmpegExists ? 'OK' : 'FALTA'}, locales/: ${
        assetReport.localesExists ? 'OK' : 'FALTA'
      }`,
    );
    logContext.log(`DLLs detectadas en raíz: ${assetReport.dlls.join(', ')}`);

    if (args.skipSmokeTest) {
      skipReason = '--skip-smoke-test fue indicado, smoke test pendiente.';
      logContext.log('Smoke test omitido por --skip-smoke-test.');
    } else if (process.platform !== 'win32') {
      skipReason =
        'Smoke test requiere Windows, ejecuta esta verificación en un host Windows real.';
      logContext.log(
        'Smoke test omitido: se requiere Windows para ejecutar Dulce Colonial.exe.',
      );
    } else {
      const smokeLogsDir = path.join(
        logContext.packageLogDir,
        `smoke-${logContext.timestamp}`,
      );
      ensureDir(smokeLogsDir);
      const executablePath = path.join(packageDir, 'Dulce Colonial.exe');
      logContext.log(
        `Iniciando prueba de arranque con ${executablePath}...`,
      );
      state.smokeTestExecuted = true;
      try {
        const smokeResult = await launchSmokeTest({
          executablePath,
          cwd: packageDir,
          logDir: smokeLogsDir,
          healthUrl: args.healthUrl,
          timeoutMs: args.timeout,
        });
        state.smokeTestPassed = true;
        state.healthcheckPassed = true;
        logContext.log(
          `Smoke test completado. Logs: ${smokeResult.stdoutPath}, ${smokeResult.stderrPath}`,
        );
      } catch (error) {
        runError = error;
        throw error;
      }
    }

    logContext.log('Verificación concluida.');
  } catch (error) {
    if (!runError) runError = error;
    logContext.log(`[ERROR] ${error.stack || error.message}`);
  } finally {
    logContext.log(`Log principal: ${logContext.logPath}`);
    await logContext.close();
  }

  state.verificationLogsPath = logContext.logPath;
  state.generatedAt = new Date().toISOString();
  state.readyForClient =
    state.packageBuildExists &&
    state.structureCheckPassed &&
    state.smokeTestExecuted &&
    state.smokeTestPassed &&
    state.healthcheckPassed;

  const { summary, nextAction, failureCause } = composeSummary(state, {
    skipReason,
    errorMessage: runError ? runError.message : null,
  });
  state.summary = summary;
  state.nextAction = nextAction;

  writeFinalFeedback({
    verificationDir: verificationBaseDir,
    packageName: args.packageName,
    payload: state,
  });

  printConsoleSummary({
    packageBuildExists: state.packageBuildExists,
    structureCheckPassed: state.structureCheckPassed,
    smokeTestExecuted: state.smokeTestExecuted,
    smokeTestPassed: state.smokeTestPassed,
    healthcheckPassed: state.healthcheckPassed,
    readyForClient: state.readyForClient,
    logsPath: path.dirname(state.verificationLogsPath),
    failureCause: failureCause || skipReason,
  });

  if (!state.readyForClient) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[ERROR]', err.stack || err.message);
  process.exit(1);
});
