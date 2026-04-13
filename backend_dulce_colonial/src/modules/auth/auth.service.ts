import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

type TokenSubject = Pick<User, 'id' | 'email' | 'role'>;

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: StringValue | number;
  private readonly refreshExpiresIn: StringValue | number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessTtl = this.configService.get<string>('JWT_EXPIRES_IN');
    const refreshTtl = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN');
    this.accessExpiresIn = accessTtl
      ? (accessTtl as StringValue)
      : ('8h' as const);
    this.refreshExpiresIn = refreshTtl
      ? (refreshTtl as StringValue)
      : ('7d' as const);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    this.ensureActiveUser(user);

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);

    return {
      user: this.toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        { secret: this.refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    let user: Awaited<ReturnType<typeof this.usersService.findById>>;
    try {
      user = await this.usersService.findById(payload.sub);
    } catch {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    this.ensureActiveUser(user);

    const accessToken = await this.signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  private ensureActiveUser(user: { isActive?: boolean }) {
    if (user?.isActive === false) {
      throw new UnauthorizedException('Cuenta desactivada');
    }
  }

  private async signAccessToken(user: TokenSubject) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn,
    });
  }

  private async signRefreshToken(user: TokenSubject) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn,
    });
  }

  private toUserResponse(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
