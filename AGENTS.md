# Repository Guidelines

## Project Structure & Module Organization
Two apps drive this repo: `backend_dulce_colonial` (NestJS + Prisma) and `frontend_dulce_colonial` (React + Vite). Backend code is split into `src/modules/` for features, `src/common/` for guards/filters, `prisma/` for schema plus seeds, and `test/` for API specs. The frontend keeps route-focused folders inside `src/`, while build artifacts and operational exports land in `dist/` and `reports/` respectively.

## Build, Test, and Development Commands
API work starts with `cd backend_dulce_colonial && npm run start:dev`; `npm run build && npm run start:prod` mirrors deployment. Database changes must flow through `npm run prisma:migrate`, with `npm run prisma:generate` and `npm run prisma:seed` handled in the same branch. The dashboard runs via `cd frontend_dulce_colonial && npm run dev`, and releases are checked with `npm run build && npm run preview`. Run each app's `npm run lint` before opening a PR.

## Coding Style & Naming Conventions
Use TypeScript, 2-space indentation, and single quotes throughout. Classes/components stay PascalCase, variables and hooks use camelCase, and environment keys use UPPER_SNAKE_CASE. ESLint + Prettier are authoritative (`npm run lint`, `npm run format`), React slices should colocate component, hook, and style files, and default exports are reserved for Vite entry points only.

## Testing Guidelines
Backend tests rely on Jest with `.spec.ts` files next to the implementation; run `npm run test` for units, `npm run test:cov` when touching services, and `npm run test:e2e` before merging schema changes. Prisma dependencies should be mocked through DI to keep suites deterministic. The frontend lacks automated coverage, so new Vitest or RTL suites should live in `src/__tests__/` and mirror component names.

## Commit & Pull Request Guidelines
Follow Conventional Commits as shown in history (`feat: módulo de caja completo`, `fix: corregir DriveService`), optionally scoping by app (`feat(frontend): resumen diario`). Keep subjects under 72 characters and describe schema or config changes in the body. PRs must state the problem, solution, linked issue, migrations run, manual test evidence (screenshots or logs), and any new environment variables or seeds.

## Security & Configuration Tips
Do not commit `.env`; rely on Nest ConfigModule and update docs whenever keys change. After editing `prisma/schema.prisma`, regenerate the client, include the migration SQL, and highlight breaking changes in the PR. Validate Google Drive credentials under `backend_dulce_colonial/config/`, keep DTO validation strict, refresh Swagger decorators when endpoints change, and scrub sensitive data before storing files in `reports/`.
