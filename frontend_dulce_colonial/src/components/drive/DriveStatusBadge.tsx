import useDrive from '../../hooks/useDrive';

export default function DriveStatusBadge() {
  const { folderConfigured, isConnected, isExpired, isLoading } = useDrive();

  const state = (() => {
    if (isLoading) return { className: '', label: 'Verificando Drive...' };
    if (!isConnected) return { className: 'disconnected', label: 'Drive desconectado' };
    if (isExpired) return { className: 'expired', label: 'Autorización vencida' };
    if (isConnected && !folderConfigured) {
      return { className: 'expired', label: 'Drive incompleto' };
    }
    if (isConnected) return { className: 'connected', label: 'Drive operativo' };
    return { className: 'disconnected', label: 'Drive desconectado' };
  })();

  return (
    <div className="dc-drive-badge">
      <span className={`dc-drive-badge-dot ${state.className}`} />
      <span>{state.label}</span>
    </div>
  );
}
