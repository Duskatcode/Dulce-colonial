'use strict';

const fs = require('fs');
const path = require('path');

function generateClientGuide(destinationDir, { version, logsPathHint }) {
  const guidePath = path.join(destinationDir, 'README_CLIENTE.txt');
  const content = [
    'Dulce Colonial - Guía del Cliente',
    '=================================',
    '',
    `Versión del paquete: ${version}`,
    '',
    'Sistema soportado:',
    '- Windows 10 u 11 (64 bits) con las últimas actualizaciones.',
    '',
    'Requisitos de base de datos:',
    '- PostgreSQL 14, 15, 16, 17 u 18 funcionando en el puerto 5432.',
    '- Usuario con permisos para crear y actualizar el esquema dulce_colonial.',
    '',
    'Otros requisitos:',
    '- Permisos de Administrador para ejecutar INSTALAR.bat.',
    '- Conectividad estable a la red donde vive PostgreSQL.',
    '',
    'Cómo iniciar Dulce Colonial:',
    '1. Copia la carpeta completa en el equipo destino sin modificar su contenido.',
    '2. Haz clic derecho sobre INSTALAR.bat y selecciona "Ejecutar como administrador".',
    '3. Verifica que el script reporte conexión exitosa a PostgreSQL.',
    '4. Abre "Dulce Colonial.exe" (se abrirá automático al terminar el instalador).',
    '',
    '¿Qué hacer si falla?',
    '- Ejecuta nuevamente INSTALAR.bat para regenerar el archivo .env.',
    '- Asegúrate de que PostgreSQL está activo y accesible en el puerto 5432.',
    '- Revisa los logs en: ' + logsPathHint + ' (backend-*.log y electron-*.log).',
    '- Adjunta los logs y captura de pantalla cuando notifiques el incidente.',
    '',
    'Dónde revisar los logs:',
    `- Carpeta: ${logsPathHint}`,
    '- backend-*.log captura la salida del servidor NestJS.',
    '- electron-*.log registra eventos del proceso principal de Electron.',
    '',
    'Advertencias importantes:',
    '- No muevas ni elimines archivos dentro de la carpeta del cliente.',
    '- No saques recursos de resources/backend, todos los binarios deben permanecer juntos.',
    '- Trabaja siempre desde la carpeta completa entregada; cambiar los nombres rompe las rutas internas.',
    '',
    'Soporte:',
    '- Envía capturas de pantalla y el archivo README_CLIENTE.txt con las modificaciones anotadas.',
  ].join('\n');
  fs.writeFileSync(guidePath, content, 'utf8');
  return guidePath;
}

module.exports = {
  generateClientGuide,
};
