const { execSync } = require('child_process');
const { Client } = require('pg');
const path = require('path');

async function setup() {
  console.log('🔧 Configurando base de datos...');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('✓ PostgreSQL conectado');

    const dbName = process.env.DB_NAME || 'dulce_colonial';
    const dbNameSafe = dbName.replace(/"/g, '""');
    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );

    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbNameSafe}"`);
      console.log(`✓ Base de datos '${dbName}' creada`);
    } else {
      console.log(`✓ Base de datos '${dbName}' ya existe`);
    }

    const backendPath = path.join(__dirname, '../../backend_dulce_colonial');
    console.log('🔧 Ejecutando migraciones...');
    execSync('npx prisma migrate deploy', {
      cwd: backendPath,
      stdio: 'inherit',
    });
    console.log('✓ Migraciones completadas');

    try {
      execSync('npx prisma db seed', {
        cwd: backendPath,
        stdio: 'inherit',
      });
      console.log('✓ Datos iniciales cargados');
    } catch {
      console.log('ℹ Sin datos semilla definidos');
    }

    console.log('\n✅ Configuración completada exitosamente');
  } catch (err) {
    if (err.code === '28P01') {
      console.error('\n❌ Error: Contraseña de PostgreSQL incorrecta.');
    } else {
      console.error('\n❌ Error:', err.message);
    }
    console.error(
      '\nAsegúrate de que PostgreSQL esté instalado y corriendo,',
      '\ny que la contraseña en el archivo .env sea correcta.',
    );
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (closeErr) {
      if (closeErr) {
        console.warn('Advertencia al cerrar conexión:', closeErr.message);
      }
    }
  }
}

setup();
