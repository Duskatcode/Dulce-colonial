import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DriveService } from './drive.service';

@ApiTags('Drive')
@Controller('google')
export class DriveAuthController {
  constructor(private readonly driveService: DriveService) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener URL de autorización de Google Drive' })
  getAuthUrl() {
    return this.driveService.getAuthUrl();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estado de conexión con Google Drive' })
  getStatus() {
    return this.driveService.getConnectionStatus();
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revocar acceso a Google Drive' })
  revoke() {
    return this.driveService.revokeAccess();
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refrescar token de Google Drive' })
  refresh() {
    return this.driveService.refreshToken();
  }

  @Get('callback')
  @ApiOperation({ summary: 'Callback OAuth2 para Google Drive' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost';

    if (error || !code) {
      return res.redirect(`${frontendUrl}/drive/settings?drive=error`);
    }

    await this.driveService.handleOAuthCallback(code);

    return res.redirect(`${frontendUrl}/?drive=connected`);
  }
}
