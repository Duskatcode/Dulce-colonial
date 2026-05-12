import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import StatCard from '../components/ui/StatCard';
import { reportsService } from '../services/reports.service';
import type { DriveStatus } from '../types/drive.types';
import { getApiErrorMessage } from '../utils/errorMessage';

type DriveFolderKey = 'daily' | 'weekly' | 'manual';
type ManualReportType = 'stock' | 'movements' | 'lowstock';

interface DriveFile {
  id: string;
  name?: string;
  createdTime?: string;
  size?: number | string;
  webViewLink?: string;
}

const FOLDERS: Array<{
  key: DriveFolderKey;
  label: string;
  subtitle: string;
  icon: string;
}> = [
  {
    key: 'daily',
    label: 'Reportes diarios',
    subtitle: 'Archivos generados por operación diaria',
    icon: 'today',
  },
  {
    key: 'weekly',
    label: 'Reportes semanales',
    subtitle: 'Consolidación periódica de reportes',
    icon: 'calendar_month',
  },
  {
    key: 'manual',
    label: 'Respaldos manuales',
    subtitle: 'Reportes generados bajo demanda',
    icon: 'folder_managed',
  },
];

const MANUAL_REPORTS: Array<{
  type: ManualReportType;
  label: string;
  icon: string;
}> = [
  { type: 'stock', label: 'Stock', icon: 'inventory_2' },
  { type: 'movements', label: 'Movimientos', icon: 'swap_vert' },
  { type: 'lowstock', label: 'Bajo inventario', icon: 'warning' },
];

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function formatSize(value?: number | string) {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric) || numeric <= 0) return '—';

  if (numeric >= 1024 * 1024) {
    return `${(numeric / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${(numeric / 1024).toFixed(1)} KB`;
}

function getFileIcon(fileName?: string) {
  if (fileName?.toLowerCase().endsWith('.pdf')) return 'picture_as_pdf';
  if (fileName?.toLowerCase().endsWith('.xlsx')) return 'table_chart';
  return 'description';
}

export default function DrivePage() {
  const qc = useQueryClient();
  const [activeFolder, setActiveFolder] = useState<DriveFolderKey>('daily');

  const { data: status, isLoading: loadingStatus } = useQuery<DriveStatus>({
    queryKey: ['drive-status'],
    queryFn: reportsService.getDriveStatus,
    refetchInterval: 30_000,
  });

  const isConnected = status?.connected === true;
  const isOperational = isConnected && status?.folderConfigured === true;

  const { data: driveFiles, isLoading: loadingFiles } = useQuery<DriveFile[]>({
    queryKey: ['drive-files', activeFolder],
    queryFn: () => reportsService.getDriveFiles(activeFolder),
    enabled: isOperational,
  });

  const files = driveFiles ?? [];

  const manualMutation = useMutation({
    mutationFn: (type: ManualReportType) => reportsService.triggerManual(type),
    onSuccess: () => {
      toast.success('Reporte generado y subido a Drive');
      qc.invalidateQueries({ queryKey: ['drive-files'] });
      qc.invalidateQueries({ queryKey: ['report-history'] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al generar reporte'));
    },
  });

  const activeFolderMeta = useMemo(
    () => FOLDERS.find((folder) => folder.key === activeFolder) ?? FOLDERS[0],
    [activeFolder],
  );

  return (
    <AppLayout title="Google Drive">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Archivos y respaldos</p>
          <h1 className="dc-page-title">Google Drive</h1>
          <p className="dc-page-subtitle">
            Revisa reportes subidos a Drive y genera respaldos manuales desde el panel administrativo.
          </p>
        </div>

        <div className="dc-inventory-header-actions">
          <Link className="dc-button-secondary" style={{ padding: '12px 16px', textDecoration: 'none' }} to="/drive/settings">
            Configurar Drive
          </Link>
        </div>
      </section>

      <section className="dc-drive-status-strip">
        <div className="dc-drive-status-main">
          <span
            className={`dc-drive-led ${
              loadingStatus ? '' : isConnected ? 'connected' : 'disconnected'
            }`}
          />

          <div>
            <strong>Google Drive</strong>
            <span>
              {loadingStatus
                ? 'Verificando estado...'
                : isOperational
                  ? 'Operativo para subir reportes'
                  : isConnected
                    ? 'Conectado, configuración incompleta'
                  : 'Desconectado'}
            </span>
          </div>
        </div>

        {isConnected && (
          <div className="dc-drive-manual-grid">
            {MANUAL_REPORTS.map((report) => (
              <button
                key={report.type}
                className="dc-drive-manual-button"
                type="button"
                disabled={manualMutation.isPending || !isOperational}
                title={!isOperational ? 'Configura GOOGLE_DRIVE_FOLDER_ID para subir reportes' : undefined}
                onClick={() => manualMutation.mutate(report.type)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {report.icon}
                </span>
                {manualMutation.isPending ? 'Generando...' : report.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {!isConnected ? (
        <section className="dc-drive-warning-card">
          <span className="material-symbols-outlined">cloud_off</span>
          <h2 className="dc-drive-warning-title">Google Drive no está configurado</h2>
          <p className="dc-drive-warning-text">
            Autoriza la integración para habilitar subida automática de reportes y respaldos manuales.
          </p>

          <Link className="dc-button-primary" style={{ padding: '12px 18px', textDecoration: 'none' }} to="/drive/settings">
            Ir a configuración
          </Link>
        </section>
      ) : !isOperational ? (
        <section className="dc-drive-warning-card">
          <span className="material-symbols-outlined">folder_off</span>
          <h2 className="dc-drive-warning-title">Drive conectado, configuración incompleta</h2>
          <p className="dc-drive-warning-text">
            Drive está autorizado, pero falta configurar GOOGLE_DRIVE_FOLDER_ID.
            Los reportes quedarán como PENDIENTE_DRIVE hasta configurar la carpeta base.
          </p>

          <Link className="dc-button-primary" style={{ padding: '12px 18px', textDecoration: 'none' }} to="/drive/settings">
            Revisar configuración
          </Link>
        </section>
      ) : (
        <>
          <section className="dc-inventory-stats" aria-label="Resumen de archivos Drive">
            <StatCard
              icon="folder"
              iconType="material"
              label="Carpeta activa"
              value={activeFolderMeta.label}
              subtitle={activeFolderMeta.subtitle}
              accent="primary"
            />

            <StatCard
              icon="description"
              iconType="material"
              label="Archivos visibles"
              value={files.length}
              subtitle="Según carpeta seleccionada"
              accent="secondary"
            />

            <StatCard
              icon="cloud_done"
              iconType="material"
              label="Estado"
              value="Operativo"
              subtitle="Carpeta configurada"
              accent="warning"
            />
          </section>

          <nav className="dc-drive-folder-tabs" aria-label="Carpetas de Google Drive">
            {FOLDERS.map((folder) => (
              <button
                key={folder.key}
                className={`dc-drive-folder-tab ${activeFolder === folder.key ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveFolder(folder.key)}
              >
                <span className="dc-drive-folder-icon">
                  <span className="material-symbols-outlined">{folder.icon}</span>
                </span>

                <span>
                  <span className="dc-drive-folder-title">{folder.label}</span>
                  <span className="dc-drive-folder-subtitle">{folder.subtitle}</span>
                </span>
              </button>
            ))}
          </nav>

          <section className="dc-inventory-panel">
            <div className="dc-dashboard-panel-header">
              <h2 className="dc-dashboard-panel-title">Archivos en Drive</h2>
              <span className="material-symbols-outlined" style={{ color: 'var(--dc-primary)' }}>
                cloud
              </span>
            </div>

            <div className="dc-inventory-table-wrap">
              <table className="dc-inventory-table">
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Fecha</th>
                    <th>Tamaño</th>
                    <th style={{ textAlign: 'right' }}>Ver en Drive</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingFiles ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="dc-empty-state">Cargando archivos...</div>
                      </td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="dc-empty-state">No hay archivos en esta carpeta</div>
                      </td>
                    </tr>
                  ) : (
                    files.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <div className="dc-drive-file-cell">
                            <span className="dc-drive-file-icon">
                              <span className="material-symbols-outlined">
                                {getFileIcon(file.name)}
                              </span>
                            </span>

                            <div>
                              <div className="dc-drive-file-name">{file.name ?? 'Archivo sin nombre'}</div>
                              <div className="dc-drive-file-meta">ID: {file.id}</div>
                            </div>
                          </div>
                        </td>

                        <td>{formatDate(file.createdTime)}</td>

                        <td>{formatSize(file.size)}</td>

                        <td style={{ textAlign: 'right' }}>
                          {file.webViewLink ? (
                            <a
                              className="dc-drive-open-link"
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir Drive
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppLayout>
  );
}
