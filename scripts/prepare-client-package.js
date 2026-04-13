'use strict';

const path = require('path');
const { prepareClientPackage } = require('./package/copy');
const { resolveRoot, getReleaseDir } = require('./package/paths');

function parseArgs(argv) {
  const args = {
    root: null,
    env: null,
    out: null,
    packageName: 'Dulce Colonial Cliente',
    zip: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;
    switch (arg) {
      case '--root':
        args.root = argv[++i];
        break;
      case '--env':
        args.env = argv[++i];
        break;
      case '--out':
        args.out = argv[++i];
        break;
      case '--package':
        args.packageName = argv[++i] ?? args.packageName;
        break;
      case '--zip':
        args.zip = true;
        break;
      case '--no-zip':
        args.zip = false;
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
  node scripts/prepare-client-package.js [opciones]

Opciones:
  --root <ruta>       Raíz del repo. Default: carpeta padre de scripts/.
  --env <ruta>        Ruta del archivo .env a incluir.
  --out <ruta>        Carpeta donde se generará la entrega. Default: <root>/release.
  --package <nombre>  Nombre de la carpeta final. Default: "Dulce Colonial Cliente".
  --zip               Genera un ZIP junto con la carpeta final.
  --no-zip            Deshabilita la generación del ZIP.
  --help              Muestra esta ayuda.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = resolveRoot(args.root);
  const envFile = args.env ? path.resolve(process.cwd(), args.env) : null;
  const outDir = args.out
    ? path.resolve(process.cwd(), args.out)
    : getReleaseDir(rootDir);

  console.log('> Generando paquete para cliente con opciones:');
  console.log(
    JSON.stringify(
      {
        rootDir,
        envFile: envFile ?? '<default>',
        outDir,
        packageName: args.packageName,
        zip: args.zip,
      },
      null,
      2,
    ),
  );

  const result = await prepareClientPackage({
    rootDir,
    envFile,
    outDir,
    packageName: args.packageName,
    zip: args.zip,
  });

  console.log('\nPaquete generado correctamente en:');
  console.log(`  ${result.finalDir}`);
  if (result.zipFile) {
    console.log(`  ${result.zipFile}`);
  }
  console.log(`Guía del cliente: ${result.guidePath}`);
}

main().catch((err) => {
  console.error('[ERROR]', err.stack || err.message);
  process.exit(1);
});
