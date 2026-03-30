import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3, Auth } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

@Injectable()
export class DriveService implements OnModuleInit {
  private readonly logger = new Logger(DriveService.name);
  private drive: drive_v3.Drive;
  private auth: Auth.OAuth2Client;
  private isReady = false;
  private folderIds: Record<string, string> = {};

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

      if (!fs.existsSync(credentialsPath)) {
        this.logger.warn('⚠️  google-credentials.json no encontrado. Drive desactivado.');
        this.logger.warn('    Sigue las instrucciones del README para configurarlo.');
        return;
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed;

      this.auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0],
      );

      const tokenPath = path.resolve(
        process.cwd(),
        this.config.get<string>(
          'GOOGLE_TOKEN_PATH',
          './config/google-token.json',
        ),
      );

      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        this.auth.setCredentials(token);

        // Auto-refresh: cuando el token se renueva se persiste en disco
        this.auth.on('tokens', (newTokens) => {
          const updated = { ...token, ...newTokens };
          fs.writeFileSync(tokenPath, JSON.stringify(updated, null, 2));
          this.logger.log('🔄 Token de Drive actualizado automáticamente');
        });

        this.drive = google.drive({ version: 'v3', auth: this.auth });
        this.isReady = true;
        this.logger.log('✅ Google Drive conectado correctamente');

        await this.ensureFolderStructure();
      } else {
        await this.getNewToken(tokenPath);
      }
    } catch (error) {
      this.logger.error(
        '❌ Error inicializando Drive:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  // ─── Primer token — autorización manual por terminal ─────────────────────
  private async getNewToken(tokenPath: string): Promise<void> {
    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.logger.warn('');
    this.logger.warn('══════════════════════════════════════════════════════');
    this.logger.warn('  AUTORIZACIÓN DE GOOGLE DRIVE REQUERIDA');
    this.logger.warn('  Abre esta URL en tu navegador y autoriza la app:');
    this.logger.warn(`  ${authUrl}`);
    this.logger.warn('══════════════════════════════════════════════════════');
    this.logger.warn('');

    if (process.env.NODE_ENV !== 'production') {
      await this.promptForCode(tokenPath);
    }
  }

  private promptForCode(tokenPath: string): Promise<void> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('Pega aquí el código de autorización: ', async (code) => {
        rl.close();
        try {
          const { tokens } = await this.auth.getToken(code.trim());
          this.auth.setCredentials(tokens);
          fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

          this.drive = google.drive({ version: 'v3', auth: this.auth });
          this.isReady = true;
          this.logger.log('✅ Google Drive autorizado y listo');

          await this.ensureFolderStructure();
        } catch (err) {
          this.logger.error(
            '❌ Error obteniendo token:',
            err instanceof Error ? err.message : err,
          );
        } finally {
          resolve();
        }
      });
    });
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

  // ─── Subir archivo ────────────────────────────────────────────────────────
  async uploadFile(
    localPath: string,
    fileName: string,
    folderKey: 'reportes-diarios' | 'reportes-semanales' | 'respaldos-manuales',
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
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: { mimeType, body: fileStream },
      fields: 'id, webViewLink',
    });

    const id          = response.data.id          ?? '';
    const webViewLink = response.data.webViewLink  ?? '';

    if (!id) {
      throw new Error(`Drive no retornó ID para el archivo: ${fileName}`);
    }

    this.logger.log(`☁️  Subido a Drive: ${fileName} → ${folderKey}`);
    return { id, webViewLink };
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

  // ─── Estado de la conexión ────────────────────────────────────────────────
  get ready(): boolean {
    return this.isReady;
  }
}