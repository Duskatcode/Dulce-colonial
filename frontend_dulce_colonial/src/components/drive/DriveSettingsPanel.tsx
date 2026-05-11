import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import useDrive from '../../hooks/useDrive';
import DriveStatusBadge from './DriveStatusBadge';

const cardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '32px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
};

const dividerStyle: CSSProperties = {
  border: 'none',
  borderTop: '1px solid #f3f4f6',
  margin: '0 0 24px 0',
};

const descriptionStyle: CSSProperties = {
  fontSize: 14,
  color: '#6b7280',
  lineHeight: '22px',
  marginBottom: 16,
};

const infoRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '1px solid #f9fafb',
};

const infoLabelStyle: CSSProperties = {
  fontSize: 14,
  color: '#6b7280',
};

const infoValueStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
};

const primaryButtonStyle: CSSProperties = {
  width: '100%',
  padding: '12px',
  marginTop: 20,
  backgroundColor: '#92400e',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  width: '100%',
  padding: '11px',
  marginTop: 12,
  backgroundColor: '#f9fafb',
  color: '#1f2937',
  border: '1.5px solid #e5e7eb',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const dangerButtonStyle: CSSProperties = {
  width: '100%',
  padding: '11px',
  marginTop: 12,
  backgroundColor: 'transparent',
  color: '#dc2626',
  border: '1.5px solid #dc2626',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('drive-led-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'drive-led-pulse-style';
      style.innerHTML = `
        @keyframes drive-led-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70%  { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        .led-pulse {
          animation: drive-led-pulse 2s infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setShowDisconnectConfirm(false);
    }
  }, [isConnected]);

  const handleConfirmDisconnect = async () => {
    try {
      await revoke();
    } catch {
      /* handled in hook */
    } finally {
      setShowDisconnectConfirm(false);
    }
  };

  const ledBaseStyle: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: '50%',
  };

  const statusConfig = (() => {
    if (isReady) {
      return {
        text: 'Drive conectado',
        textColor: '#14532d',
        led: {
          backgroundColor: '#22c55e',
          boxShadow: '0 0 0 4px rgba(34,197,94,0.2)',
          pulse: true,
        },
      };
    }
    if (isPendingRenewal) {
      return {
        text: 'Autorización vencida',
        textColor: '#92400e',
        led: {
          backgroundColor: '#f59e0b',
          boxShadow: '0 0 0 4px rgba(245,158,11,0.2)',
          pulse: false,
        },
      };
    }
    if (isLoading) {
      return {
        text: 'Verificando estado...',
        textColor: '#6b7280',
        led: {
          backgroundColor: '#9ca3af',
          boxShadow: '0 0 0 4px rgba(156,163,175,0.2)',
          pulse: false,
        },
      };
    }
    return {
      text: 'Drive desconectado',
      textColor: '#b91c1c',
      led: {
        backgroundColor: '#ef4444',
        boxShadow: '0 0 0 4px rgba(239,68,68,0.2)',
        pulse: false,
      },
    };
  })();

  const renderConnectedBlock = () => (
    <>
      <p style={descriptionStyle}>
        Tu cuenta está autorizada y los reportes se guardarán automáticamente en Google Drive.
      </p>
      {normalizedEmail && (
        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>Cuenta autorizada</span>
          <span style={infoValueStyle}>{normalizedEmail}</span>
        </div>
      )}
      {formattedExpiry && (
        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>Válido hasta</span>
          <span style={infoValueStyle}>{formattedExpiry}</span>
        </div>
      )}
      {showDisconnectConfirm ? (
        <div style={{ marginTop: 16, backgroundColor: '#fef2f2', borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 13, color: '#991b1b', margin: 0, marginBottom: 12 }}>
            ¿Deseas desconectar Google Drive? Los reportes dejarán de subirse automáticamente.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              style={{ ...secondaryButtonStyle, marginTop: 0 }}
              onClick={() => setShowDisconnectConfirm(false)}
            >
              Cancelar
            </button>
            <button type="button" style={{ ...dangerButtonStyle, marginTop: 0 }} onClick={handleConfirmDisconnect}>
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" style={dangerButtonStyle} onClick={() => setShowDisconnectConfirm(true)}>
          Desconectar Drive
        </button>
      )}
    </>
  );

  const renderExpiredBlock = () => (
    <>
      <p style={{ ...descriptionStyle, color: '#b45309' }}>
        Esta autorización venció. Vuelve a conectar o intenta refrescar el acceso para reanudar los respaldos automáticos.
      </p>
      {formattedExpiry && (
        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>Venció el</span>
          <span style={infoValueStyle}>{formattedExpiry}</span>
        </div>
      )}
      <button type="button" style={primaryButtonStyle} onClick={() => connect()}>
        Renovar autorización
      </button>
      <button type="button" style={secondaryButtonStyle} onClick={() => refresh()}>
        Forzar refresh del token
      </button>
      {showDisconnectConfirm ? (
        <div style={{ marginTop: 16, backgroundColor: '#fef2f2', borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 13, color: '#991b1b', margin: 0, marginBottom: 12 }}>
            ¿Deseas desconectar Google Drive? Podrás volver a conectarlo cuando lo necesites.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              style={{ ...secondaryButtonStyle, marginTop: 0 }}
              onClick={() => setShowDisconnectConfirm(false)}
            >
              Cancelar
            </button>
            <button type="button" style={{ ...dangerButtonStyle, marginTop: 0 }} onClick={handleConfirmDisconnect}>
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" style={dangerButtonStyle} onClick={() => setShowDisconnectConfirm(true)}>
          Desconectar Drive
        </button>
      )}
    </>
  );

  const renderDisconnectedBlock = () => (
    <>
      <p style={descriptionStyle}>
        Para subir reportes diarios y respaldos automáticos debes autorizar el acceso a tu cuenta de Google Drive.
      </p>
      <button type="button" style={primaryButtonStyle} onClick={() => connect()}>
        Iniciar autorización
      </button>
      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
        Serás redirigido a Google para iniciar sesión y aprobar el acceso.
      </p>
    </>
  );

  const renderContent = () => {
    if (isLoading) {
      return <p style={descriptionStyle}>Consultando el estado actual de Google Drive...</p>;
    }
    if (isReady) {
      return renderConnectedBlock();
    }
    if (isPendingRenewal) {
      return renderExpiredBlock();
    }
    return renderDisconnectedBlock();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DriveStatusBadge />
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div
            className={statusConfig.led.pulse ? 'led-pulse' : undefined}
            style={{ ...ledBaseStyle, backgroundColor: statusConfig.led.backgroundColor, boxShadow: statusConfig.led.boxShadow }}
          />
          <span style={{ fontSize: 18, fontWeight: 700, color: statusConfig.textColor }}>{statusConfig.text}</span>
          {normalizedEmail && (
            <span style={{ fontSize: 13, color: '#6b7280' }}>{normalizedEmail}</span>
          )}
        </div>
        <hr style={dividerStyle} />
        {renderContent()}
      </div>
    </div>
  );
}
