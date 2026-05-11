import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getStatus, getAuthUrl } from '../services/drive.service';
import { DriveStatus } from '../types/drive.types';

const spinner = (
  <div className="flex flex-col items-center gap-3 text-slate-600">
    <svg className="h-10 w-10 animate-spin text-red-600" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <p className="text-sm font-medium">Confirmando la conexión con Google Drive...</p>
  </div>
);

export default function DriveCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        const data = await getStatus();
        if (!active) return;
        setStatus(data);
        setError(data.connected ? null : 'No pudimos confirmar la conexión.');
      } catch (err) {
        if (!active) return;
        const message = typeof err === 'string' ? err : 'Error inesperado';
        setError(message);
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    };
    verify();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status?.connected) {
      const timeout = setTimeout(() => {
        navigate('/drive/settings', { replace: true });
      }, 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [status?.connected, navigate]);

  const handleRetry = async () => {
    try {
      const { url } = await getAuthUrl();
      window.location.href = url;
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Error inesperado';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">{spinner}</div>
      </div>
    );
  }

  const primaryBtn = 'mt-6 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        {status?.connected ? (
          <>
            <h1 className="text-2xl font-semibold text-green-700">¡Conexión exitosa!</h1>
            <p className="mt-3 text-sm text-slate-600">
              {status.email
                ? `La cuenta ${status.email} quedó autorizada para guardar reportes.`
                : 'Tu cuenta quedó autorizada para guardar reportes.'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Serás redirigido automáticamente a la configuración de Drive.
            </p>
            <button type="button" className={primaryBtn} onClick={() => navigate('/drive/settings', { replace: true })}>
              Ir a la configuración
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-red-600">No pudimos conectar Google Drive</h1>
            <p className="mt-3 text-sm text-slate-600">
              {error || 'Intenta nuevamente y asegúrate de completar la autorización.'}
            </p>
            <button type="button" className={primaryBtn} onClick={handleRetry}>
              Reintentar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
