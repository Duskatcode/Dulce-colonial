import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Acepta strings directamente sin depender del enum de Prisma
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
