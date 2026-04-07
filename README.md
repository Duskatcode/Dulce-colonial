# 🍰 Dulce Colonial — Sistema de Administración

Aplicación administrativa local para negocio de repostería con PostgreSQL,
NestJS, React y respaldo automático en Google Drive.

---

## Stack tecnológico

| Capa          | Tecnología                        |
|---------------|-----------------------------------|
| Backend       | NestJS 10 + TypeScript            |
| Base de datos | PostgreSQL 15 (local)             |
| ORM           | Prisma 5                          |
| Frontend      | React 18 + Vite 5                 |
| Auth          | JWT + bcrypt + Roles              |
| Tiempo real   | WebSockets (Socket.io)            |
| Reportes      | ExcelJS + PDFKit                  |
| Drive         | googleapis OAuth2                 |
| Gestor        | npm                               |

---

## Requisitos previos

- Node.js 18 o superior
- PostgreSQL 15 instalado y corriendo en localhost
- npm 9 o superior
- Cuenta Gmail para Google Drive (opcional)

---

## Instalación y configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/dulce-colonial.git
cd dulce-colonial
```

### 2. Configurar el backend
```bash
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env` con tus valores:
```env
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/dulce_colonial?schema=public"
JWT_SECRET=genera_un_string_de_64_chars
JWT_REFRESH_SECRET=otro_string_diferente_de_64_chars
```

### 3. Configurar la base de datos PostgreSQL

Abre psql o pgAdmin y crea la base de datos:
```sql
CREATE DATABASE dulce_colonial;
```

Luego corre las migraciones y el seed:
```bash
# Desde la carpeta backend/
npx prisma migrate dev --name init
npm run prisma:seed
```

Esto crea todas las tablas y carga los datos de prueba:

| Usuario    | Email                          | Contraseña    | Rol      |
|------------|--------------------------------|---------------|----------|
| Admin      | admin@dulcecolonial.com        | Admin1234!    | ADMIN    |
| Operadora  | operador@dulcecolonial.com     | Operador123!  | OPERADOR |

### 4. Configurar el frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

El `.env` del frontend solo necesita:
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

---

## Configurar Google Drive (opcional)

Si no configuras Drive el sistema funciona igual,
solo los reportes no se subirán a la nube.

### Paso a paso

1. Ve a https://console.cloud.google.com
2. Crea un proyecto nuevo → nómbralo `dulce-colonial`
3. Menú → **APIs y servicios** → **Biblioteca**
   → Busca `Google Drive API` → **Habilitar**
4. Menú → **APIs y servicios** → **Credenciales**
   → **Crear credencial** → **ID de cliente OAuth 2.0**
   → Tipo de aplicación: **Aplicación de escritorio**
   → Descarga el JSON → guárdalo en:
   `backend/config/google-credentials.json`
5. Menú → **Pantalla de consentimiento OAuth**
   → Tipo: **Externo**
   → Agrega tu Gmail como **usuario de prueba**
6. En tu Google Drive crea una carpeta llamada `Dulce Colonial`
   → Ábrela → copia el ID de la URL:
   `https://drive.google.com/drive/folders/`**ESTE_ES_EL_ID**
7. Pégalo en `backend/.env`:
```env
   GOOGLE_DRIVE_FOLDER_ID=ESTE_ES_EL_ID
```
8. Arranca el backend → en el terminal aparecerá una URL
   → ábrela en el navegador → autoriza con tu Gmail
   → copia el código que aparece → pégalo en el terminal
9. Listo. El token se guarda en
   `backend/config/google-token.json` y no vuelve a pedir autorización.

---

## Arrancar el sistema

### Backend
```bash
cd backend
npm run start:dev
```

API disponible en: `http://localhost:3000/api/v1`
Swagger disponible en: `http://localhost:3000/api/docs`

### Frontend
```bash
cd frontend
npm run dev
```

App disponible en: `http://localhost:5173`

---

## Pruebas con Swagger

1. Abre `http://localhost:3000/api/docs`
2. Busca el endpoint `POST /auth/login`
3. Haz clic en **Try it out**
4. Pega el body:
```json
{
  "email": "admin@dulcecolonial.com",
  "password": "Admin1234!"
}
```
5. Copia el `accessToken` de la respuesta
6. Haz clic en el botón **Authorize** (candado arriba a la derecha)
7. Escribe `Bearer TU_ACCESS_TOKEN` y confirma
8. Ahora todos los endpoints están autenticados

### Flujo de prueba recomendado en Swagger
```
1. POST /auth/login               → obtener token
2. GET  /products                 → listar productos del seed
3. POST /products                 → crear producto nuevo
4. GET  /inventory                → listar insumos del seed
5. POST /movements                → registrar entrada de stock
6. GET  /movements/summary        → ver resumen de movimientos
7. GET  /reports/stock            → reporte de stock actual
8. POST /reports/manual           → generar reporte y subir a Drive
9. GET  /drive/status             → verificar conexión con Drive
10. GET /activity                 → ver log de actividad
```

---

## Estructura del proyecto
```
dulce-colonial/
├── backend/
│   ├── src/
│   │   ├── common/
│   │   │   ├── decorators/       @Roles, @CurrentUser
│   │   │   ├── filters/          GlobalExceptionFilter
│   │   │   ├── guards/           JwtAuthGuard, RolesGuard
│   │   │   └── interceptors/     ActivityInterceptor
│   │   ├── config/
│   │   │   └── prisma/           PrismaService, PrismaModule
│   │   └── modules/
│   │       ├── activity/         Logs de actividad
│   │       ├── alerts/           WebSocket Gateway + cron
│   │       ├── auth/             JWT + Passport
│   │       ├── drive/            Google Drive OAuth2
│   │       ├── inventory/        Ingredientes e insumos
│   │       ├── movements/        Movimientos de stock
│   │       ├── products/         Productos
│   │       ├── reports/          Reportes + cron jobs
│   │       └── users/            Usuarios y roles
│   ├── prisma/
│   │   ├── schema.prisma         Modelos de BD
│   │   └── seed.ts               Datos de prueba
│   ├── config/
│   │   ├── google-credentials.json  (no subir al repo)
│   │   └── google-token.json        (no subir al repo)
│   ├── .env                      (no subir al repo)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           AppLayout, Sidebar, Topbar
│   │   │   └── ui/               Table, Modal, Badge, StatCard, AlertsPanel
│   │   ├── context/              AuthContext
│   │   ├── hooks/                useStockAlerts
│   │   ├── pages/                Dashboard, Products, Inventory,
│   │   │                         Movements, Reports, Users, Drive
│   │   ├── services/             api, socket, por módulo
│   │   └── types/                index.ts
│   ├── .env                      (no subir al repo)
│   └── .env.example
├── database/
├── reports/                      Archivos locales antes de subir
├── backups/
└── README.md
```

---

## Roles y permisos

| Acción                  | ADMIN | OPERADOR | VISOR |
|-------------------------|-------|----------|-------|
| Ver productos           | ✅    | ✅       | ✅    |
| Crear / editar producto | ✅    | ✅       | ❌    |
| Desactivar producto     | ✅    | ❌       | ❌    |
| Ver inventario          | ✅    | ✅       | ✅    |
| Crear / editar insumo   | ✅    | ✅       | ❌    |
| Eliminar insumo         | ✅    | ❌       | ❌    |
| Registrar movimiento    | ✅    | ✅       | ❌    |
| Ver reportes            | ✅    | ✅       | ❌    |
| Generar reporte manual  | ✅    | ❌       | ❌    |
| Gestionar usuarios      | ✅    | ❌       | ❌    |
| Ver Drive               | ✅    | ❌       | ❌    |
| Ver actividad           | ✅    | ❌       | ❌    |

---

## Cron jobs automáticos

| Job                    | Frecuencia          | Acción                              |
|------------------------|---------------------|-------------------------------------|
| Reporte diario         | 11:00 PM todos días | Stock Excel → Drive diarios         |
| Reporte semanal        | 11:30 PM domingos   | Movimientos Excel → Drive semanales |
| Verificación de stock  | Cada 30 minutos     | Emite alertas WebSocket si hay bajo stock |
| Reintento Drive        | Cada hora           | Sube reportes pendientes            |
| Reporte de cierre      | Al apagar servidor  | Bajo inventario PDF → Drive manual  |

---

## Variables de entorno

### backend/.env

| Variable                  | Descripción                              | Requerida |
|---------------------------|------------------------------------------|-----------|
| DATABASE_URL              | Conexión PostgreSQL local                | ✅        |
| JWT_SECRET                | Secret para access tokens (64+ chars)   | ✅        |
| JWT_REFRESH_SECRET        | Secret para refresh tokens (diferente)  | ✅        |
| JWT_EXPIRES_IN            | Duración del access token               | ✅        |
| JWT_REFRESH_EXPIRES_IN    | Duración del refresh token              | ✅        |
| CORS_ORIGIN               | URL del frontend                        | ✅        |
| GOOGLE_CREDENTIALS_PATH   | Ruta al JSON de credenciales Drive      | ⚠️ Drive  |
| GOOGLE_TOKEN_PATH         | Ruta al token generado                  | ⚠️ Drive  |
| GOOGLE_DRIVE_FOLDER_ID    | ID de la carpeta raíz en Drive          | ⚠️ Drive  |

### frontend/.env

| Variable       | Descripción              | Requerida |
|----------------|--------------------------|-----------|
| VITE_API_URL   | URL base del backend     | ✅        |
| VITE_WS_URL    | URL para WebSocket       | ✅        |
```

---

## Orden de integración Fase 5
```
Backend:
1. backend/src/modules/activity/activity.module.ts
2. backend/src/modules/activity/activity.service.ts
3. backend/src/modules/activity/activity.controller.ts
4. backend/src/common/interceptors/activity.interceptor.ts
5. backend/src/app.module.ts        → agregar ActivityModule
6. backend/src/main.ts              → agregar ActivityInterceptor

Frontend:
7.  frontend/src/services/users.service.ts
8.  frontend/src/services/activity.service.ts
9.  frontend/src/components/ui/AlertsPanel.tsx
10. frontend/src/components/layout/Sidebar.tsx  → agregar AlertsPanel + ruta Drive
11. frontend/src/pages/UsersPage.tsx
12. frontend/src/pages/DrivePage.tsx
13. frontend/src/App.tsx            → agregar rutas /users y /drive

Documentación:
14. README.md                       → reemplazar con versión completa