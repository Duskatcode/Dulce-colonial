'use strict';

function yesNo(value) {
  return value ? 'YES' : 'NO';
}

function printConsoleSummary({
  packageBuildExists,
  structureCheckPassed,
  smokeTestExecuted,
  smokeTestPassed,
  healthcheckPassed,
  readyForClient,
  logsPath,
  failureCause,
}) {
  console.log('\nResumen de verificación:');
  console.log(`- PACKAGE_OK=${yesNo(packageBuildExists)}`);
  console.log(`- STRUCTURE_OK=${yesNo(structureCheckPassed)}`);
  console.log(`- SMOKE_TEST_EXECUTED=${yesNo(smokeTestExecuted)}`);
  console.log(`- SMOKE_TEST_OK=${yesNo(smokeTestPassed)}`);
  console.log(`- HEALTHCHECK_OK=${yesNo(healthcheckPassed)}`);
  console.log(`- READY_FOR_CLIENT=${yesNo(readyForClient)}`);

  if (!readyForClient) {
    console.log(`- LOGS_PATH=${logsPath}`);
    console.log(
      `- FAILURE_CAUSE=${failureCause || 'Revisar logs de verificación'}`,
    );
  }
}

module.exports = {
  printConsoleSummary,
};
