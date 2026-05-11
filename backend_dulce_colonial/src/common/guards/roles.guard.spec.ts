import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const buildContext = (role: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, role },
        }),
      }),
    }) as any;

  it('bloquea a OPERADOR en acciones solo ADMIN', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(buildContext('OPERADOR'))).toThrow(
      ForbiddenException,
    );
  });

  it('permite a ADMIN en acciones solo ADMIN', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext('ADMIN'))).toBe(true);
  });
});
