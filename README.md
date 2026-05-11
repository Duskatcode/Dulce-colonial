# Dulce Colonial

Sistema local de administración interna para una tienda de repostería y productos dulces.

La aplicación está pensada para ejecutarse en una sola PC usando Docker.  
El acceso principal es:

```txt
http://localhost
Arquitectura actual
http://localhost
    |
    v
frontend Nginx :80
    |
    |-- React estático
    |-- /api/v1/*        -> backend:3000/api/v1/*
    |-- /api/docs        -> backend:3000/api/docs
    |-- /google/callback -> backend:3000/google/callback
    |-- /socket.io/*     -> backend:3000/socket.io/*
    |
backend NestJS :3000
    |
PostgreSQL :5432
Módulos principales
Autenticación
Usuarios
Productos
Inventario
Movimientos
Caja
Facturas
Reportes
Alertas de stock
Integración opcional con Google Drive
Estructura
backend_dulce_colonial/    Backend NestJS + Prisma
frontend_dulce_colonial/   Frontend React + Vite
docker-compose.yml         Orquestación local
docs/                      Documentación
Requisitos
Docker Desktop
Docker Compose
Node.js solo si vas a desarrollar localmente fuera de Docker
Levantar la aplicación

Desde la raíz del proyecto:

docker compose up -d --build

Ver contenedores:

docker compose ps

Ver logs:

docker compose logs -f

Abrir la aplicación:

http://localhost

Swagger:

http://localhost/api/docs

Health check:

curl -i http://localhost/api/v1/health
Primer seed

Si la base está vacía, ejecutar:

docker compose exec backend npm run prisma:seed

Usuarios iniciales:

admin@dulcecolonial.com    / Admin1234!
operador@dulcecolonial.com / Operador123!

No ejecutar el seed repetidamente sin revisar, porque los usuarios usan upsert, pero algunos productos e ingredientes pueden duplicarse si el seed no es idempotente.

Comandos útiles
npm run build:backend
npm run build:frontend
npm run build:all
npm run docker:up
npm run docker:down
npm run docker:logs
npm run docker:ps
Detener servicios
docker compose down

Esto detiene los contenedores, pero conserva la base de datos.

Operación destructiva

No usar salvo que quieras borrar la base de datos local:

docker compose down -v

Ese comando elimina el volumen de PostgreSQL.

Persistencia

PostgreSQL usa volumen Docker:

dulce_postgres_data

Los reportes usan volumen Docker:

dulce_reports
Google Drive

Google Drive es opcional.
Si no está configurado, el backend puede mostrar advertencias, pero la app debe seguir funcionando.

Para configurar Drive se deben usar variables de entorno o credenciales locales excluidas de Git.

Nunca commitear:

.env
google-credentials.json
google-token.json
*.pem
*.key
Desarrollo local sin Docker

Backend:

cd backend_dulce_colonial
npm install
npx prisma generate
npm run start:dev

Frontend:

cd frontend_dulce_colonial
npm install
npm run dev

En desarrollo local puedes usar .env propios, pero en Docker el frontend debe trabajar con:

VITE_API_URL=/api/v1
VITE_WS_URL=http://localhost
Validación mínima

Después de levantar Docker:

curl -i http://localhost/api/v1/health

Luego validar en navegador:

http://localhost

Flujo mínimo:

Login
Dashboard
Productos
Inventario
Movimientos
Caja
Facturas
Reportes
Alertas
