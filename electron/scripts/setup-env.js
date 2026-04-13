const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isInstalled =
  __dirname.includes('Program Files') || __dirname.includes('AppData');

const envPath = isInstalled
  ? path.join(__dirname, '..', 'backend', '.env')
  : path.join(__dirname, '../../backend_dulce_colonial/.env');

if (!fs.existsSync(envPath)) {
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const env = `
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dulce_colonial?schema=public"
JWT_SECRET="${jwtSecret}"
JWT_EXPIRES_IN="8h"
PORT=3000
NODE_ENV=production
GOOGLE_REDIRECT_URI=http://localhost:3000/google/callback
`.trim();

  fs.writeFileSync(envPath, env);
  console.log('✓ Archivo .env creado');
} else {
  console.log('✓ Archivo .env ya existe');
}
