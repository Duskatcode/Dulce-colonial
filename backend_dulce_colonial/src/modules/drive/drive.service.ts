import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3, Auth } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Readable } from 'stream';

interface GoogleCredentials {
  client_secret: string;
  client_id: string;
  redirect_uris?: string[];
}

interface GoogleCredentialsFile {
  installed?: GoogleCredentials;
  web?: GoogleCredentials;
}

type RefreshTokenStatus =
  | 'ACTIVE'
  | 'MISSING'
  | 'EXPIRES_AT_KNOWN'
  | 'UNKNOWN_EXPIRATION';

interface StoredGoogleToken extends Auth.Credentials {
  created_at?: string;
  refresh_token_expires_at?: string | null;
  refresh_token_expires_in?: number;
}

export interface DriveStatusResponse {
  connected: boolean;
  email?: string | null;
  accessTokenExpiresAt?: string | null;
  accessTokenExpiresInSeconds?: number | null;
  hasRefreshToken: boolean;
  refreshTokenIssuedAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  refreshTokenExpiresInSeconds?: number | null;
  refreshTokenStatus: RefreshTokenStatus;
  requiresReauth: boolean;
  folderConfigured: boolean;
  folderWarning?: string | null;
}

@Injectable()
export class DriveService implements OnModuleInit {
  private readonly logger = new Logger(DriveService.name);
  private drive: drive_v3.Drive;
  private auth: Auth.OAuth2Client;
  private isReady = false;
  private folderIds: Record<string, string> = {};
  private tokenPath: string;
  private redirectUri: string;
  private consoleAuthEnabled = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.initializeAuth();
  }

  // ─── Autenticación OAuth2 ─────────────────────────────────────────────────
  private async initializeAuth() {
    try {
      const credentialsPath = path.resolve(
        process.cwd(),
        this.config.get<string>(
          'GOOGLE_CREDENTIALS_PATH',
          './config/google-credentials.json',
        ),
      );

      let clientId: string | undefined;
      let clientSecret: string | undefined;
      let redirectUri: string | undefined;

      if (fs.existsSync(credentialsPath)) {
        const credentialsFile = JSON.parse(
          fs.readFileSync(credentialsPath, 'utf8'),
        ) as GoogleCredentialsFile;
        const credentials = credentialsFile.web ?? credentialsFile.installed;

        if (!credentials) {
          this.logger.warn(
            '⚠️  google-credentials.json no tiene formato válido. Drive desactivado.',
          );
          return;
        }

        clientId = credentials.client_id;
        clientSecret = credentials.client_secret;
        redirectUri =
          this.config.get<string>('GOOGLE_REDIRECT_URI') ??
          credentials.redirect_uris?.[0] ??
          'http://localhost:3000/google/callback';
      } else {
        this.logger.warn(
          '⚠️  google-credentials.json no encontrado. Usando variables de entorno para Drive.',
        );
        clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
        clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
        redirectUri =
          this.config.get<string>('GOOGLE_REDIRECT_URI') ??
          'http://localhost:3000/google/callback';
      }

      if (!clientId || !clientSecret) {
        this.logger.warn(
          '⚠️  Google Drive no configurado — falta client_id o client_secret',
        );
        this.logger.warn(
          '    Verifica config/google-credentials.json o las variables de entorno.',
        );
        return;
      }

      this.redirectUri = redirectUri;

      this.auth = new google.auth.OAuth2(
        clientId,
        clientSecret,
        this.redirectUri,
      );
      this.logger.log('✅ Google OAuth2 client inicializado correctamente');

      this.tokenPath = path.resolve(
        process.cwd(),
        this.config.get<string>(
          'GOOGLE_TOKEN_PATH',
          './config/google-token.json',
        ),
      );

      this.consoleAuthEnabled =
        this.config.get<string>('GOOGLE_DRIVE_CONSOLE_AUTH', 'false') ===
        'true';

      if (fs.existsSync(this.tokenPath)) {
        await this.loadToken(this.tokenPath);
      } else {
        await this.getNewToken(this.tokenPath);
      }
    } catch (error) {
      this.logger.error(
        '❌ Error inicializando Drive:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ─── Cargar token existente y verificarlo ─────────────────────────────────
  private async loadToken(tokenPath = this.tokenPath) {
    if (!tokenPath) {
      throw new Error('Ruta de token de Google no configurada');
    }
    const token = JSON.parse(
      fs.readFileSync(tokenPath, 'utf8'),
    ) as StoredGoogleToken;

    const tokenWithMetadata = this.ensureTokenMetadata(token, tokenPath);

    // Verificar que el token guardado tenga refresh_token
    // Google solo lo envía la primera vez; si no está, hay que re-autorizar
    if (!tokenWithMetadata.refresh_token) {
      this.logger.warn(
        '⚠️  Token sin refresh_token. Se requiere re-autorización.',
      );
      fs.unlinkSync(tokenPath);
      await this.getNewToken(tokenPath);
      return;
    }

    this.auth.setCredentials(tokenWithMetadata);

    // Auto-refresh: cuando googleapis renueva el access_token, se persiste en disco
    // IMPORTANTE: siempre preservar el refresh_token original porque Google
    // no lo reenvía en cada renovación
    this.auth.on('tokens', (newTokens) => {
      const updated = {
        ...tokenWithMetadata,
        ...newTokens,
        // Conservar el refresh_token existente si el nuevo no lo trae
        refresh_token:
          newTokens.refresh_token ?? tokenWithMetadata.refresh_token,
        created_at: tokenWithMetadata.created_at,
        refresh_token_expires_at: this.getRefreshTokenExpiresAt(
          newTokens as StoredGoogleToken,
          tokenWithMetadata.refresh_token_expires_at,
        ),
      } satisfies StoredGoogleToken;
      fs.writeFileSync(tokenPath, JSON.stringify(updated, null, 2));
      this.logger.log('🔄 Token de Drive renovado automáticamente');
    });

    // Verificar que el token funciona haciendo una llamada real
    // Esto detecta invalid_grant antes de que falle en producción
    try {
      await this.auth.getAccessToken();
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.isReady = true;
      this.logger.log('✅ Google Drive conectado correctamente');
      await this.ensureFolderStructure();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      const responseError =
        typeof error === 'object' && error !== null && 'response' in error
          ? (
              error as {
                response?: { data?: { error?: string } };
              }
            ).response?.data?.error
          : undefined;
      const isInvalidGrant =
        message.includes('invalid_grant') || responseError === 'invalid_grant';

      if (isInvalidGrant) {
        this.logger.warn(
          '⚠️  Refresh token inválido o revocado. Eliminando token guardado...',
        );
        fs.unlinkSync(tokenPath);
        this.logger.warn(
          '    Reinicia el servidor para re-autorizar, o ejecuta el flujo manual.',
        );
        // En producción no podemos abrir readline, solo advertimos
        if (process.env.NODE_ENV !== 'production') {
          await this.getNewToken(tokenPath);
        }
      } else {
        throw error;
      }
    }
  }

  // ─── Primer token — autorización manual por terminal ─────────────────────
  private async getNewToken(tokenPath = this.tokenPath): Promise<void> {
    if (!this.auth) {
      throw new Error('Cliente OAuth2 no inicializado');
    }
    if (!tokenPath) {
      throw new Error('Ruta de token de Google no configurada');
    }
    // prompt: 'consent' fuerza a Google a devolver siempre el refresh_token
    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.logger.warn('');
    this.logger.warn('══════════════════════════════════════════════════════');
    this.logger.warn('  AUTORIZACIÓN DE GOOGLE DRIVE REQUERIDA');
    this.logger.warn('  Abre esta URL en tu navegador y autoriza la app:');
    this.logger.warn(`  ${authUrl}`);
    this.logger.warn('  Después de autorizar Google redirigirá a:');
    this.logger.warn(`  ${this.redirectUri}`);
    this.logger.warn('══════════════════════════════════════════════════════');
    this.logger.warn('');

    if (this.consoleAuthEnabled) {
      await this.promptForCode(tokenPath);
    }
  }

  private promptForCode(tokenPath = this.tokenPath): Promise<void> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('Pega aquí el código de autorización: ', (code) => {
        rl.close();
        void this.processAuthorizationCode(code, tokenPath)
          .catch((err) => {
            this.logger.error(
              '❌ Error obteniendo token:',
              err instanceof Error ? err.message : String(err),
            );
          })
          .finally(() => {
            resolve();
          });
      });
    });
  }

  async handleOAuthCallback(code: string): Promise<void> {
    await this.processAuthorizationCode(code);
  }

  private async processAuthorizationCode(
    code: string,
    tokenPath = this.tokenPath,
  ): Promise<void> {
    if (!this.auth) {
      throw new Error('Cliente OAuth2 no inicializado');
    }
    if (!tokenPath) {
      throw new Error('Ruta de token de Google no configurada');
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      throw new Error('Código de autorización vacío');
    }

    const { tokens } = await this.auth.getToken(trimmedCode);
    const storedToken = this.withTokenMetadata(tokens as StoredGoogleToken);

    if (!storedToken.refresh_token) {
      this.logger.warn(
        '⚠️  Google no devolvió refresh_token. Asegúrate de que la app tenga acceso offline y prompt=consent.',
      );
    }

    fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
    fs.writeFileSync(tokenPath, JSON.stringify(storedToken, null, 2));

    await this.loadToken(tokenPath);

    this.logger.log('✅ Google Drive autorizado y listo');
  }

  // ─── Estructura de carpetas en Drive ─────────────────────────────────────
  private async ensureFolderStructure(): Promise<void> {
    const rootFolderId = this.config.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    if (!rootFolderId) {
      this.logger.warn(
        '⚠️  GOOGLE_DRIVE_FOLDER_ID no configurado en .env — carpetas no creadas',
      );
      return;
    }

    const subfolders = [
      'reportes-diarios',
      'reportes-semanales',
      'reportes-mensuales',
      'respaldos-manuales',
    ];

    for (const name of subfolders) {
      const id = await this.getOrCreateFolder(name, rootFolderId);
      this.folderIds[name] = id;
    }

    this.logger.log('📁 Estructura de carpetas en Drive verificada');
  }

  private async getOrCreateFolder(
    name: string,
    parentId: string,
  ): Promise<string> {
    const res = await this.drive.files.list({
      q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    const files = res.data.files ?? [];

    if (files.length > 0 && files[0].id) {
      return files[0].id;
    }

    const folder = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });

    if (!folder.data.id) {
      throw new Error(`No se pudo crear la carpeta "${name}" en Drive`);
    }

    return folder.data.id;
  }

  // ─── Subir archivo desde disco ────────────────────────────────────────────
  async uploadFileToFolder(
    localPath: string,
    fileName: string,
    folderKey:
      | 'reportes-diarios'
      | 'reportes-semanales'
      | 'reportes-mensuales'
      | 'respaldos-manuales',
    mimeType: string,
  ): Promise<{ id: string; webViewLink: string }> {
    if (!this.isReady) {
      throw new Error('Google Drive no está configurado o autorizado');
    }

    const folderId = this.folderIds[folderKey];
    if (!folderId) {
      throw new Error(`Carpeta "${folderKey}" no encontrada en Drive`);
    }

    if (!fs.existsSync(localPath)) {
      throw new Error(`Archivo local no encontrado: ${localPath}`);
    }

    const fileStream = fs.createReadStream(localPath);

    const response = await this.drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType, body: fileStream },
      fields: 'id, webViewLink',
    });

    const id = response.data.id ?? '';
    const webViewLink = response.data.webViewLink ?? '';

    if (!id) {
      throw new Error(`Drive no retornó ID para el archivo: ${fileName}`);
    }

    this.logger.log(`☁️  Subido a Drive: ${fileName} → ${folderKey}`);
    return { id, webViewLink };
  }

  async uploadBufferToFolder(
    fileName: string,
    buffer: Buffer,
    folderKey:
      | 'reportes-diarios'
      | 'reportes-semanales'
      | 'reportes-mensuales'
      | 'respaldos-manuales',
    mimeType: string,
  ): Promise<{ id: string; webViewLink: string; folderKey: string }> {
    if (!this.isReady) {
      throw new Error('Google Drive no está configurado o autorizado');
    }

    const folderId = this.folderIds[folderKey];
    if (!folderId) {
      throw new Error(`Carpeta "${folderKey}" no encontrada en Drive`);
    }

    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink',
    });

    const id = response.data.id ?? '';
    const webViewLink = response.data.webViewLink ?? '';

    if (!id) {
      throw new Error(`Drive no retornó ID para el archivo: ${fileName}`);
    }

    this.logger.log(`☁️  Subido a Drive: ${fileName} → ${folderKey}`);
    return { id, webViewLink, folderKey };
  }

  // ─── Subir buffer temporal ────────────────────────────────────────────────
  async uploadFile(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string | null> {
    const auth = this.auth;
    if (!this.hasValidCredentials() || !auth) {
      console.log(
        '[DriveService] Upload skipped — no credentials for:',
        fileName,
      );
      return null;
    }

    const drive = google.drive({ version: 'v3', auth });
    const stream = Readable.from(buffer);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType,
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id',
    });

    return response.data.id ?? '';
  }

  // ─── Listar archivos ──────────────────────────────────────────────────────
  async listFiles(folderKey: string): Promise<drive_v3.Schema$File[]> {
    if (!this.isReady) return [];

    const folderId = this.folderIds[folderKey];
    if (!folderId) return [];

    const res = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, size, webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 20,
    });

    return res.data.files ?? [];
  }

  getConnectionStatus(): DriveStatusResponse {
    const token = this.readStoredToken();
    const now = Date.now();
    const accessTokenExpiresAt = this.auth?.credentials?.expiry_date
      ? new Date(this.auth.credentials.expiry_date).toISOString()
      : null;
    const accessTokenExpiresInSeconds = this.auth?.credentials?.expiry_date
      ? Math.max(0, Math.floor((this.auth.credentials.expiry_date - now) / 1000))
      : null;
    const refreshTokenExpiresAt = token?.refresh_token_expires_at ?? null;
    const refreshTokenExpiresInSeconds = refreshTokenExpiresAt
      ? Math.max(
          0,
          Math.floor((new Date(refreshTokenExpiresAt).getTime() - now) / 1000),
        )
      : null;
    const hasRefreshToken = Boolean(token?.refresh_token);
    const folderConfigured = this.isFolderConfigured();
    const refreshTokenStatus: RefreshTokenStatus = !hasRefreshToken
      ? 'MISSING'
      : refreshTokenExpiresAt
        ? 'EXPIRES_AT_KNOWN'
        : 'UNKNOWN_EXPIRATION';

    return {
      connected: this.isReady,
      email: null,
      accessTokenExpiresAt,
      accessTokenExpiresInSeconds,
      hasRefreshToken,
      refreshTokenIssuedAt: token?.created_at ?? null,
      refreshTokenExpiresAt,
      refreshTokenExpiresInSeconds,
      refreshTokenStatus,
      requiresReauth: !hasRefreshToken,
      folderConfigured,
      folderWarning: folderConfigured
        ? null
        : 'GOOGLE_DRIVE_FOLDER_ID no está configurado. Los reportes no podrán subirse a Drive.',
    };
  }

  getAuthUrl() {
    if (!this.auth) {
      throw new HttpException(
        'Google Drive no está configurado. Verifica las credenciales en config/google-credentials.json',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = this.auth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });

    return { url };
  }

  async revokeAccess() {
    if (this.auth) {
      try {
        await this.auth.revokeCredentials();
      } catch (error) {
        this.logger.warn(
          `No se pudo revocar el token en Google: ${error instanceof Error ? error.message : error}`,
        );
      }
      this.auth.setCredentials({});
    }

    if (this.tokenPath && fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }

    this.isReady = false;
    this.folderIds = {};

    return { connected: false };
  }

  async refreshToken() {
    if (!this.tokenPath || !fs.existsSync(this.tokenPath)) {
      throw new Error(
        'No existe token almacenado. Autoriza Google Drive nuevamente.',
      );
    }

    await this.loadToken(this.tokenPath);

    return this.getConnectionStatus();
  }

  private hasValidCredentials() {
    return this.isReady && !!this.auth;
  }

  private isFolderConfigured() {
    return Boolean(this.config.get<string>('GOOGLE_DRIVE_FOLDER_ID'));
  }

  private readStoredToken(): StoredGoogleToken | null {
    if (!this.tokenPath || !fs.existsSync(this.tokenPath)) return null;

    try {
      return JSON.parse(fs.readFileSync(this.tokenPath, 'utf8')) as StoredGoogleToken;
    } catch {
      return null;
    }
  }

  private ensureTokenMetadata(
    token: StoredGoogleToken,
    tokenPath: string,
  ): StoredGoogleToken {
    const tokenWithMetadata = this.withTokenMetadata(token, tokenPath);

    if (
      tokenWithMetadata.created_at !== token.created_at ||
      tokenWithMetadata.refresh_token_expires_at !== token.refresh_token_expires_at
    ) {
      fs.writeFileSync(tokenPath, JSON.stringify(tokenWithMetadata, null, 2));
    }

    return tokenWithMetadata;
  }

  private withTokenMetadata(
    token: StoredGoogleToken,
    tokenPath?: string,
  ): StoredGoogleToken {
    const createdAt =
      token.created_at ??
      (tokenPath && fs.existsSync(tokenPath)
        ? fs.statSync(tokenPath).birthtime.toISOString()
        : new Date().toISOString());

    return {
      ...token,
      created_at: createdAt,
      refresh_token_expires_at: this.getRefreshTokenExpiresAt(
        token,
        token.refresh_token_expires_at ?? null,
      ),
    };
  }

  private getRefreshTokenExpiresAt(
    token: StoredGoogleToken,
    currentValue: string | null = null,
  ): string | null {
    const expiresIn = Number(token.refresh_token_expires_in);

    if (Number.isFinite(expiresIn) && expiresIn > 0) {
      return new Date(Date.now() + expiresIn * 1000).toISOString();
    }

    return currentValue;
  }

  // ─── Estado de la conexión ────────────────────────────────────────────────
  get ready(): boolean {
    return this.isReady;
  }
}
