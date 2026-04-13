import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import { reportsService } from '../services/reports.service';
import { getApiErrorMessage } from '../utils/errorMessage';

const FOLDERS = [
  { key: 'daily',  label: '📅 Reportes diarios',   folder: 'reportes-diarios'   },
  { key: 'weekly', label: '📆 Reportes semanales',  folder: 'reportes-semanales' },
  { key: 'manual', label: '🖐 Respaldos manuales',  folder: 'respaldos-manuales' },
];

export default function DrivePage() {
  const qc = useQueryClient();
  const [activeFolder, setActiveFolder] = useState<'daily' | 'weekly' | 'manual'>('daily');

  const { data: status } = useQuery({
    queryKey: ['drive-status'],
    queryFn:  reportsService.getDriveStatus,
    refetchInterval: 30_000,
  });

  const { data: files, isLoading } = useQuery({
    queryKey: ['drive-files', activeFolder],
    queryFn:  () => reportsService.getDriveFiles(activeFolder),
    enabled:  status?.connected === true,
  });

  const manualMutation = useMutation({
    mutationFn: (type: 'stock' | 'movements' | 'lowstock') =>
      reportsService.triggerManual(type),
    onSuccess: () => {
      toast.success('Reporte generado y subido a Drive');
      qc.invalidateQueries({ queryKey: ['drive-files'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Error al generar reporte')),
  });

  return (
    <AppLayout title="Google Drive">
      {/* Estado de conexión */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', borderRadius: 12, padding: '14px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 24,
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: status?.connected ? '#27ae60' : '#e74c3c',
          }} />
          <span style={{ fontWeight: 600, color: '#1a0a00' }}>
            Google Drive — {status?.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        {status?.connected && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { type: 'stock'     as const, label: '📦 Stock'       },
              { type: 'movements' as const, label: '↕️ Movimientos' },
              { type: 'lowstock'  as const, label: '⚠️ Bajo stock'  },
            ].map(btn => (
              <button key={btn.type}
                onClick={() => manualMutation.mutate(btn.type)}
                disabled={manualMutation.isPending}
                style={{
                  padding: '7px 14px', border: 'none', borderRadius: 6,
                  background: '#3d1a00', color: '#fff', cursor: 'pointer', fontSize: 13,
                  opacity: manualMutation.isPending ? 0.6 : 1,
                }}>
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!status?.connected ? (
        <div style={{ background: '#fff3cd', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#856404', margin: 0, fontSize: 15 }}>
            ⚠️ Google Drive no está configurado.<br />
            Sigue las instrucciones del README para autorizar la aplicación.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs de carpetas */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {FOLDERS.map(f => (
              <button key={f.key}
                onClick={() => setActiveFolder(f.key as any)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 500, fontSize: 14,
                  background: activeFolder === f.key ? '#c0392b' : '#f0e6dc',
                  color:      activeFolder === f.key ? '#fff'    : '#3d1a00',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista de archivos */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {isLoading ? (
              <p style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Cargando archivos...</p>
            ) : !files || files.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>No hay archivos en esta carpeta</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#faf5f0' }}>
                    {['Archivo', 'Fecha', 'Tamaño', 'Ver en Drive'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '2px solid #f0e6dc', color: '#1a0a00' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {files.map((f: any) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #f5f0eb' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 16, marginRight: 8 }}>
                          {f.name?.endsWith('.pdf') ? '📄' : '📊'}
                        </span>
                        {f.name}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#888' }}>
                        {f.createdTime
                          ? new Date(f.createdTime).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#888' }}>
                        {f.size ? `${(f.size / 1024).toFixed(1)} KB` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {f.webViewLink ? (
                          <a href={f.webViewLink} target="_blank" rel="noreferrer"
                            style={{ color: '#c0392b', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
                            Abrir ↗
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
