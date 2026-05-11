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
  const { isConnected, isExpired, isLoading, email, expiresAt, connect, refresh, revoke } = useDrive();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const normalizedEmail = email && email !== 'desconocida' ? email : undefined;
  const formattedExpiry = useMemo(() => formatDate(expiresAt), [expiresAt]);
  const isReady = isConnected && !isExpired;
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
        title: 'Drive conectado',
        description:
          'Tu cuenta está autorizada y los reportes se guardarán automáticamente en Google Drive.',
      };
    }

    if (isPendingRenewal) {
      return {
        className: 'expired',
        title: 'Autorización vencida',
        description:
          'Esta autorización venció. Renueva el acceso o fuerza el refresh del token para reanudar respaldos.',
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

        {(normalizedEmail || formattedExpiry) && (
          <div className="dc-drive-info-list">
            {normalizedEmail && (
              <InfoRow label="Cuenta autorizada" value={normalizedEmail} />
            )}

            {formattedExpiry && (
              <InfoRow
                label={isPendingRenewal ? 'Venció el' : 'Válido hasta'}
                value={formattedExpiry}
              />
            )}
          </div>
        )}

        {isLoading && (
          <div className="dc-empty-state">Consultando Google Drive...</div>
        )}

        {!isLoading && isReady && (
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
