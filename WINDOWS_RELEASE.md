# Guía de release en Windows

Esta guía describe el flujo completo para generar y validar el paquete del
cliente en una máquina **Windows 10/11 de 64 bits**. Sigue cada paso para que
`release/verification/<paquete>/final-feedback.json` marque
`readyForClient: true`.

---

## 1. Requisitos del host

- Windows 10/11 x64 con permisos de administrador.
- Node.js 18+ y npm 9+ instalados (agregados al PATH).
- PostgreSQL 14-18 instalado y accesible en `localhost:5432`.
- Git para clonar el repositorio.
- Terminal recomendada: PowerShell o Windows Terminal.

---

## 2. Preparar el proyecto

```powershell
git clone https://github.com/TU_USUARIO/dulce-colonial.git
cd dulce-colonial

# Dependencias del orquestador
npm install

# Dependencias por aplicación
cd backend_dulce_colonial; npm install; cd ..
cd frontend_dulce_colonial; npm install; cd ..
cd electron; npm install; cd ..
```

Configura los archivos `.env` desde sus plantillas:

```powershell
cd backend_dulce_colonial; Copy-Item .env.example .env; cd ..
cd frontend_dulce_colonial; Copy-Item .env.example .env; cd ..
```

Edita `backend_dulce_colonial/.env` con tus credenciales reales (ver README).

> Si necesitas Google Drive, coloca `config\google-credentials.json` siguiendo
> `backend_dulce_colonial/config/README.md`.

---

## 3. Base de datos

1. Crea la base `dulce_colonial` en PostgreSQL.
2. Ejecuta desde PowerShell:
   ```powershell
   cd backend_dulce_colonial
   npm run prisma:migrate
   npm run prisma:seed    # opcional
   npm run prisma:generate
   cd ..
   ```

---

## 4. Ejecutar el pipeline de release

Desde la raíz del repo:

```powershell
npm run release:ready
```

El comando ejecuta en secuencia:

1. `npm run prisma:generate`
2. `npm run build:backend`
3. `npm run package:client`
4. `npm run verify:client` (sin `--skip-smoke-test`)

Durante la verificación se lanzará `Dulce Colonial.exe`, se esperará al backend
interno y se consultará `http://localhost:3000/api/v1/health`.

---

## 5. Validar resultados

Al terminar revisa:

- Consola final:
  ```
  - PACKAGE_OK=YES
  - STRUCTURE_OK=YES
  - SMOKE_TEST_EXECUTED=YES
  - SMOKE_TEST_OK=YES
  - HEALTHCHECK_OK=YES
  - READY_FOR_CLIENT=YES
  ```
- Evidencias en `release\verification\Dulce Colonial Cliente\`:
  - `final-feedback.json`
  - `final-feedback.md`
  - `verify-<timestamp>.log`
- Paquete final en:
  - Carpeta: `release\Dulce Colonial Cliente`
  - ZIP: `release\Dulce Colonial Cliente.zip`

Solo se autoriza el envío al cliente cuando `final-feedback.json` contiene:

```json
"smokeTestExecuted": true,
"smokeTestPassed": true,
"healthcheckPassed": true,
"readyForClient": true
```

---

## 6. Fallos comunes

| Problema                         | Acciones sugeridas                                              |
|---------------------------------|------------------------------------------------------------------|
| `PACKAGE_OK=NO`                 | Revisa que `electron/dist/win-unpacked` exista antes del package |
| `SMOKE_TEST_EXECUTED=NO`        | Asegúrate de estar en Windows y no usar `--skip-smoke-test`.     |
| `SMOKE_TEST_OK=NO`              | Consulta los logs dentro de `release\verification\...` y en `%APPDATA%\Dulce Colonial\logs`. |
| `HEALTHCHECK_OK=NO`             | PostgreSQL debe estar disponible; revisa que `INSTALAR.bat` copie `.env` correctamente. |

Si después de corregir repites `npm run release:ready`, la evidencia se
regenerará con el último resultado.

---

## 7. Limpieza y commit

Los directorios `release\` y `reports\` están en `.gitignore`. No los subas a
GitHub; comparte únicamente el código fuente y los scripts. Al finalizar la
validación puedes comprimir el contenido de `release\Dulce Colonial Cliente`
para enviarlo al cliente.
