# Dulce Colonial

Aplicación de escritorio (Electron) que empaqueta un backend NestJS,
frontend React+Vite y scripts de release para entregar un punto de venta
local con base de datos PostgreSQL.

---

## Estructura del monorepo

```
.
├── backend_dulce_colonial/      # API NestJS + Prisma
├── frontend_dulce_colonial/     # UI React + Vite
├── electron/                    # Shell de escritorio + empaquetado
├── scripts/                     # Herramientas de package/verify/release
├── release/                     # (Generado) Paquetes para cliente
└── reports/                     # (Generado) Exportaciones del backend
```

Solo las carpetas de código (`backend_dulce_colonial`, `frontend_dulce_colonial`,
`electron`, `scripts`) se versionan. Los artefactos `release/` y `reports/` se
generan localmente y están listados en `.gitignore`.

---

## Requisitos

| Herramienta      | Versión mínima | Comentario                                    |
|------------------|----------------|-----------------------------------------------|
| Node.js          | 18 LTS         | Instalar también npm 9+                       |
| PostgreSQL       | 14 - 18        | Usado tanto en desarrollo como en producción  |
| Git              | Cualquiera     | Necesario para clonar                        |
| Windows 10/11 x64| Obligatorio    | Para ejecutar la validación final de release  |

> El pipeline de release solo se considera válido cuando se ejecuta en una
> máquina Windows real sin `--skip-smoke-test`.

---

## Preparar el entorno (nueva computadora)

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/TU_USUARIO/dulce-colonial.git
   cd dulce-colonial
   ```

2. **Instalar dependencias del orquestador**
   ```bash
   npm install
   ```

3. **Instalar dependencias por app**
   ```bash
   cd backend_dulce_colonial && npm install && cd ..
   cd frontend_dulce_colonial && npm install && cd ..
   cd electron && npm install && cd ..
   ```

4. **Configurar variables de entorno**
   - Backend:
     ```bash
     cd backend_dulce_colonial
     cp .env.example .env
     ```
     Edita los valores descritos en la sección siguiente.
   - Frontend:
     ```bash
     cd frontend_dulce_colonial
     cp .env.example .env
     ```

5. **Configurar Google Drive (opcional)**
   - Sigue `backend_dulce_colonial/config/README.md` para colocar
     `config/google-credentials.json`.
   - El primer arranque generará `config/google-token.json` automáticamente.

6. **Inicializar PostgreSQL**
   ```sql
   CREATE DATABASE dulce_colonial;
   ```

7. **Migraciones y seed**
   ```bash
   cd backend_dulce_colonial
   npm run prisma:migrate
   npm run prisma:seed   # opcional para datos de ejemplo
   npm run prisma:generate
   ```

8. **Ejecutar en desarrollo**
   ```bash
   # terminal 1
   cd backend_dulce_colonial && npm run start:dev

   # terminal 2
   cd frontend_dulce_colonial && npm run dev

   # opcional (desktop shell)
   cd electron && npm start
   ```

---

## Variables de entorno

### Backend (`backend_dulce_colonial/.env`)

| Clave                       | Descripción                                           |
|-----------------------------|-------------------------------------------------------|
| `NODE_ENV`                  | `development` / `production`                          |
| `PORT`                      | Puerto HTTP del API (default 3000)                    |
| `CORS_ORIGIN`               | URL del frontend permitido                            |
| `DATABASE_URL`              | Cadena Prisma hacia PostgreSQL                        |
| `JWT_SECRET`                | Clave para firmar tokens                              |
| `JWT_EXPIRES_IN`            | Duración de tokens (`8h`, `1d`, etc.)                 |
| `GOOGLE_REDIRECT_URI`       | URI usado durante OAuth                               |
| `GOOGLE_CREDENTIALS_PATH`   | Ruta al JSON descargado de Google Cloud               |
| `GOOGLE_TOKEN_PATH`         | Ruta donde se guardará el token generado              |
| `GOOGLE_DRIVE_FOLDER_ID`    | ID de la carpeta en Drive que recibirá los reportes   |
| `GOOGLE_DRIVE_CONSOLE_AUTH` | `true` para introducir el código por consola          |

### Frontend (`frontend_dulce_colonial/.env`)

| Clave          | Descripción                             |
|----------------|-----------------------------------------|
| `VITE_API_URL` | Base URL del backend (`/api/v1`)        |
| `VITE_WS_URL`  | URL para websockets (`http://localhost`)|

---

## Scripts disponibles

Ejecutados desde la raíz:

| Comando                  | Descripción |
|--------------------------|-------------|
| `npm run prisma:generate`| Regenera el cliente Prisma dentro del backend. |
| `npm run build:backend`  | Compila NestJS a `backend_dulce_colonial/dist`. |
| `npm run build:frontend` | Compila React (Vite).                           |
| `npm run build:electron:win` | Construye artefactos de Electron para Windows. |
| `npm run package:client` | Copia `electron/dist/win-unpacked` + backend y arma `release/<paquete>` + ZIP. |
| `npm run verify:client`  | Valida estructura del paquete y ejecuta smoke test (solo Windows). |
| `npm run release:ready`  | Orquesta `prisma:generate → build:backend → package:client → verify:client`. |

> Los scripts `package:client`, `verify:client` y `release:ready` escriben
> evidencia en `release/verification/<paquete>/final-feedback.{json,md}`.
> Esa carpeta no se versiona; se genera en cada ejecución.

---

## Flujo de release en Windows

La validación oficial debe ejecutarse en un host Windows x64. Consulta
[`WINDOWS_RELEASE.md`](WINDOWS_RELEASE.md) para seguir el paso a paso
incluyendo pre-requisitos, comandos y evidencias esperadas.

Resumen:
1. Preparar `.env` y dependencias como se describe arriba.
2. Ejecutar `npm run release:ready` desde PowerShell o CMD.
3. No usar `--skip-smoke-test`.
4. Revisar `release/verification/Dulce Colonial Cliente/final-feedback.json`.
5. Solo se considera **listo para cliente** si ese archivo indica
   `readyForClient: true` con `smokeTestExecuted`, `smokeTestPassed` y
   `healthcheckPassed` en `true`.

---

## Buenas prácticas para GitHub

- No subas `release/`, `reports/`, `.env`, ni archivos con tokens/credenciales.
- Mantén `package-lock.json` de cada package para reproducibilidad.
- Antes de hacer push:
  1. `npm run lint` en backend y frontend.
  2. `npm run test` (cuando aplique).
  3. Ejecuta `npm run release:ready` en Windows para validar el paquete final.
- Documenta cualquier cambio en `README.md` o en la guía de release.

---

## Recursos adicionales

- `WINDOWS_RELEASE.md`: guía completa para empaquetar y validar en Windows.
- `backend_dulce_colonial/config/README.md`: cómo manejar las credenciales de Google Drive.
- `scripts/`: automatizaciones para copiar, verificar y generar evidencia del paquete.

---
