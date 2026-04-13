'use strict';

const fs = require('fs');
const path = require('path');
const { ensureDir } = require('./file-utils');

function formatBool(value) {
  return value ? '✅' : '❌';
}

function buildMarkdown(payload) {
  const lines = [
    '# Dulce Colonial - Feedback final',
    '',
    `- Fecha y hora: ${payload.generatedAt}`,
    `- Paquete: ${payload.packageName}`,
    `- Ruta validada: ${payload.packagePath}`,
    `- ZIP generado: ${payload.packageZipPath}`,
    '',
    '## Resultados',
    `- packageBuildExists: ${formatBool(payload.packageBuildExists)}`,
    `- structureCheckPassed: ${formatBool(payload.structureCheckPassed)}`,
    `- smokeTestExecuted: ${formatBool(payload.smokeTestExecuted)}`,
    `- smokeTestPassed: ${formatBool(payload.smokeTestPassed)}`,
    `- healthcheckPassed: ${formatBool(payload.healthcheckPassed)}`,
    `- backendLogsPath: ${payload.backendLogsPath}`,
    `- mainLogsPath: ${payload.mainLogsPath}`,
    `- verificationLogsPath: ${payload.verificationLogsPath}`,
    `- readyForClient: ${formatBool(payload.readyForClient)}`,
    '',
    '## Resumen',
    payload.summary || 'Sin resumen.',
    '',
    '## Próximo paso',
    payload.nextAction || 'Definir acción siguiente.',
  ];
  return lines.join('\n');
}

function writeFinalFeedback({
  verificationDir,
  packageName,
  payload,
}) {
  ensureDir(verificationDir);
  const packageDir = path.join(verificationDir, packageName);
  ensureDir(packageDir);

  const jsonPath = path.join(packageDir, 'final-feedback.json');
  const mdPath = path.join(packageDir, 'final-feedback.md');

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(mdPath, buildMarkdown(payload), 'utf8');

  return { jsonPath, mdPath };
}

module.exports = {
  writeFinalFeedback,
};
