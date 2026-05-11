import { type CSSProperties } from 'react';
import useDrive from '../../hooks/useDrive';

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const textStyle: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  fontWeight: 500,
};

const dotBaseStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
};

export default function DriveStatusBadge() {
  const { isConnected, isExpired, isLoading } = useDrive();

  const { color, label } = (() => {
    if (isLoading) {
      return { color: '#d1d5db', label: 'Verificando Drive...' };
    }
    if (isConnected && !isExpired) {
      return { color: '#22c55e', label: 'Drive conectado' };
    }
    if (isExpired) {
      return { color: '#f59e0b', label: 'Autorización vencida' };
    }
    return { color: '#ef4444', label: 'Drive desconectado' };
  })();

  return (
    <div style={containerStyle}>
      <div style={{ ...dotBaseStyle, backgroundColor: color }} />
      <span style={textStyle}>{label}</span>
    </div>
  );
}
