import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 1,
    name: 'Admin',
    email: 'admin@dulcecolonial.com',
    passwordHash: 'hashed-password',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => `${key}-value`),
      get: jest.fn((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '8h';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      }),
    };

    service = new AuthService(
      usersService as any,
      jwtService as any,
      configService as any,
    );
  });

  it('permite login correcto y no expone passwordHash', async () => {
    const passwordHash = await bcrypt.hash('Admin1234!', 4);
    usersService.findByEmail.mockResolvedValue({ ...user, passwordHash });

    const result = await service.login({
      email: user.email,
      password: 'Admin1234!',
    });

    expect(result).toEqual({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
  });

  it('rechaza login incorrecto', async () => {
    const passwordHash = await bcrypt.hash('Admin1234!', 4);
    usersService.findByEmail.mockResolvedValue({ ...user, passwordHash });

    await expect(
      service.login({ email: user.email, password: 'incorrecta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
