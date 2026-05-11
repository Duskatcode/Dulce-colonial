import { useMemo, useState } from 'react';
import useDrive from '../../hooks/useDrive';
import DriveStatusBadge from './DriveStatusBadge';

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : undefined;

export default function DriveSettingsPanel() {
  const {
    accessTokenExpiresAt,
    connect,
    email,
    folderConfigured,
    folderWarning,
    hasRefreshToken,
    isConnected,
    isExpired,
    isLoading,
    refresh,
    refreshTokenExpiresAt,
    refreshTokenExpiresInSeconds,
    refreshTokenIssuedAt,
    refreshTokenStatus,
    revoke,
  } = useDrive();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const normalizedEmail = email && email !== 'desconocida' ? email : undefined;
  const formattedIssuedAt = useMemo(() => formatDate(refreshTokenIssuedAt ?? undefined), [refreshTokenIssuedAt]);
  const formattedRefreshExpiry = useMemo(() => formatDate(refreshTokenExpiresAt ?? undefined), [refreshTokenExpiresAt]);
  const formattedAccessExpiry = useMemo(() => formatDate(accessTokenExpiresAt ?? undefined), [accessTokenExpiresAt]);
  const formattedRefreshTimeLeft = useMemo(
    () => formatDuration(refreshTokenExpiresInSeconds),
    [refreshTokenExpiresInSeconds],
  );
  const isReady = isConnected && !isExpired && folderConfigured;
  const isIncomplete = isConnected && !isExpired && !folderConfigured;
  const isPendingRenewal = isConnected && isExpired;

  const status = (() => {
    if (isLoading) {
      return {
        className: '',
        title: 'Verificando estado...',
        description: 'Consultando el estado actual de Google Drive.',
      };
    }

    if (isReady) {
      return {
        className: 'connected',
        title: 'Drive operativo',
        description:
          'Tu cuenta está autorizada y los reportes se guardarán automáticamente en Google Drive.',
      };
    }

    if (isIncomplete) {
      return {
        className: 'expired',
        title: 'Drive conectado, configuración incompleta',
        description:
          'La autorización OAuth está activa, pero falta configurar la carpeta base para subir reportes.',
      };
    }

    if (isPendingRenewal) {
      return {
        className: 'expired',
        title: 'Autorización vencida',
        description:
          'No hay refresh token disponible. Debes volver a autorizar Google Drive para reanudar respaldos.',
      };
    }

    return {
      className: 'disconnected',
      title: 'Drive desconectado',
      description:
        'Autoriza Google Drive para subir reportes diarios, semanales y respaldos manuales.',
    };
  })();

  const handleConfirmDisconnect = async () => {
    try {
      await revoke();
    } finally {
      setShowDisconnectConfirm(false);
    }
  };

  return (
    <section className="dc-drive-card">
      <header className="dc-drive-card-header">
        <h2 className="dc-drive-card-title">Estado de conexión</h2>
        <DriveStatusBadge />
      </header>

      <div className="dc-drive-card-body">
        <div className="dc-drive-status-center">
          <span className={`dc-drive-led ${status.className}`} />
          <h3 className="dc-drive-status-title">{status.title}</h3>
          {normalizedEmail && <span className="dc-drive-status-email">{normalizedEmail}</span>}
        </div>

        <p className="dc-drive-description">{status.description}</p>

        {(normalizedEmail || isConnected) && (
          <div className="dc-drive-info-list">
            {normalizedEmail && (
              <InfoRow label="Cuenta autorizada" value={normalizedEmail} />
            )}

            {isConnected && (
              <>
                <InfoRow
                  label="Refresh token"
                  value={getRefreshTokenLabel(hasRefreshToken, refreshTokenStatus)}
                />

                {formattedIssuedAt && (
                  <InfoRow label="Autorizado desde" value={formattedIssuedAt} />
                )}

                {hasRefreshToken && (
                  <InfoRow label="Renovación automática" value="Activa" />
                )}

                {formattedRefreshExpiry ? (
                  <>
                    <InfoRow
                      label="Refresh token válido hasta"
                      value={formattedRefreshExpiry}
                    />
                    {formattedRefreshTimeLeft && (
                      <InfoRow label="Tiempo restante" value={formattedRefreshTimeLeft} />
                    )}
                  </>
                ) : hasRefreshToken ? (
                  <InfoRow
                    label="Vencimiento del refresh token"
                    value="Sin vencimiento fijo detectado"
                  />
                ) : (
                  <InfoRow label="Acción requerida" value="Volver a autorizar Drive" />
                )}

                {formattedAccessExpiry && (
                  <InfoRow
                    label="Access token técnico"
                    value={`${formattedAccessExpiry} (renovable automáticamente)`}
                  />
                )}
              </>
            )}
          </div>
        )}

        {!isLoading && isConnected && hasRefreshToken && !formattedRefreshExpiry && (
          <div className="dc-drive-note-box">
            El acceso puede requerir renovación si Google revoca permisos o si la app está en modo testing.
          </div>
        )}

        {!isLoading && folderWarning && (
          <div className="dc-drive-danger-box">
            <p className="dc-drive-danger-text">
              Drive está autorizado, pero falta configurar la carpeta base.
              Los reportes quedarán como PENDIENTE_DRIVE hasta configurar GOOGLE_DRIVE_FOLDER_ID.
            </p>
            <p className="dc-drive-danger-text" style={{ margin: 0 }}>
              {folderWarning}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="dc-empty-state">Consultando Google Drive...</div>
        )}

        {!isLoading && (isReady || isIncomplete) && (
          <>
            {showDisconnectConfirm ? (
              <DisconnectConfirm
                onCancel={() => setShowDisconnectConfirm(false)}
                onConfirm={handleConfirmDisconnect}
              />
            ) : (
              <div className="dc-drive-actions">
                <button
                  className="dc-button-secondary"
                  type="button"
                  style={{ padding: '12px 16px' }}
                  onClick={() => refresh()}
                >
                  Refrescar estado
                </button>

                <button
                  className="dc-button-secondary"
                  type="button"
                  style={{
                    padding: '12px 16px',
                    color: 'var(--dc-error)',
                    borderColor: 'rgba(186, 26, 26, 0.35)',
                  }}
                  onClick={() => setShowDisconnectConfirm(true)}
                >
                  Desconectar Drive
                </button>
              </div>
            )}
          </>
        )}

        {!isLoading && isPendingRenewal && (
          <div className="dc-drive-actions">
            <button
              className="dc-button-primary"
              type="button"
              style={{ padding: '12px 16px' }}
              onClick={() => connect()}
            >
              Renovar autorización
            </button>

            <button
              className="dc-button-secondary"
              type="button"
              style={{ padding: '12px 16px' }}
              onClick={() => refresh()}
            >
              Forzar refresh del token
            </button>

            {showDisconnectConfirm ? (
              <DisconnectConfirm
                onCancel={() => setShowDisconnectConfirm(false)}
                onConfirm={handleConfirmDisconnect}
              />
            ) : (
              <button
                className="dc-button-secondary"
                type="button"
                style={{
                  padding: '12px 16px',
                  color: 'var(--dc-error)',
                  borderColor: 'rgba(186, 26, 26, 0.35)',
                }}
                onClick={() => setShowDisconnectConfirm(true)}
              >
                Desconectar Drive
              </button>
            )}
          </div>
        )}

        {!isLoading && !isConnected && (
          <div className="dc-drive-actions">
            <button
              className="dc-button-primary"
              type="button"
              style={{ padding: '12px 16px' }}
              onClick={() => connect()}
            >
              Iniciar autorización
            </button>

            <p className="dc-drive-description" style={{ fontSize: 12, margin: 0 }}>
              Serás redirigido a Google para iniciar sesión y aprobar acceso a Drive.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dc-drive-info-row">
      <span className="dc-drive-info-label">{label}</span>
      <strong className="dc-drive-info-value">{value}</strong>
    </div>
  );
}

function getRefreshTokenLabel(
  hasRefreshToken: boolean,
  status?: string,
) {
  if (!hasRefreshToken) return 'No disponible';
  if (status === 'EXPIRES_AT_KNOWN') return 'Activo con expiración conocida';
  return 'Activo';
}

function formatDuration(value?: number | null) {
  if (value === undefined || value === null) return undefined;

  const days = Math.floor(value / 86_400);
  const hours = Math.floor((value % 86_400) / 3_600);

  if (days > 0) return `${days} días, ${hours} horas`;
  return `${hours} horas`;
}

function DisconnectConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="dc-drive-danger-box">
      <p className="dc-drive-danger-text">
        ¿Deseas desconectar Google Drive? Los reportes dejarán de subirse automáticamente.
      </p>

      <div className="dc-drive-danger-actions">
        <button
          className="dc-button-secondary"
          type="button"
          style={{ padding: '11px 14px' }}
          onClick={onCancel}
        >
          Cancelar
        </button>

        <button
          className="dc-button-primary"
          type="button"
          style={{
            padding: '11px 14px',
            background: 'var(--dc-error)',
            color: 'var(--dc-on-error)',
          }}
          onClick={onConfirm}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
