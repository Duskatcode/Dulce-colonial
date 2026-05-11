import useDrive from '../../hooks/useDrive';

export default function DriveStatusBadge() {
  const { isConnected, isExpired, isLoading } = useDrive();

  const state = (() => {
    if (isLoading) return { className: '', label: 'Verificando Drive...' };
    if (isConnected && !isExpired) return { className: 'connected', label: 'Drive conectado' };
    if (isExpired) return { className: 'expired', label: 'Autorización vencida' };
    return { className: 'disconnected', label: 'Drive desconectado' };
  })();

  return (
    <div className="dc-drive-badge">
      <span className={`dc-drive-badge-dot ${state.className}`} />
      <span>{state.label}</span>
    </div>
  );
}
