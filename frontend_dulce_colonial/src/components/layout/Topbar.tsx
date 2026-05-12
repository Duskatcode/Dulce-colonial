import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStockAlerts } from '../../hooks/useStockAlerts';
import DriveStatusBadge from '../drive/DriveStatusBadge';

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const { alerts } = useStockAlerts();
  const { logout, user } = useAuth();
  const [openMenu, setOpenMenu] = useState<'alerts' | 'user' | null>(null);

  return (
    <header className="dc-topbar">
      <div>
        <h2 className="dc-topbar-title">{title}</h2>
      </div>

      <div className="dc-topbar-actions">
        <DriveStatusBadge />

        {alerts.length > 0 && (
          <div className="dc-alert-pill">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              warning
            </span>
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''} de stock
          </div>
        )}

        <div className="dc-topbar-menu">
          <button
            className="dc-topbar-icon-button"
            type="button"
            aria-label="Ver alertas"
            title="Ver alertas"
            aria-expanded={openMenu === 'alerts'}
            onClick={() => setOpenMenu(openMenu === 'alerts' ? null : 'alerts')}
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          {openMenu === 'alerts' && (
            <div className="dc-topbar-dropdown" role="dialog" aria-label="Alertas del sistema">
              <p className="dc-topbar-dropdown-title">Alertas del sistema</p>
              <p className="dc-topbar-dropdown-text">
                Revisa productos con bajo stock e insumos bajo mínimo desde el panel de inicio.
              </p>
              {alerts.length > 0 && (
                <p className="dc-topbar-dropdown-note">
                  Hay {alerts.length} alerta{alerts.length > 1 ? 's' : ''} de stock activa
                  {alerts.length > 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}
        </div>

        <Link
          className="dc-topbar-icon-button"
          to="/drive/settings"
          aria-label="Configurar Google Drive"
          title="Configurar Google Drive"
        >
          <span className="material-symbols-outlined">cloud_sync</span>
        </Link>

        <div className="dc-topbar-menu">
          <button
            className="dc-topbar-icon-button"
            type="button"
            aria-label="Abrir menú de usuario"
            title="Abrir menú de usuario"
            aria-expanded={openMenu === 'user'}
            onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>

          {openMenu === 'user' && (
            <div className="dc-topbar-dropdown dc-topbar-user-menu" role="dialog" aria-label="Usuario">
              <p className="dc-topbar-dropdown-title">{user?.name ?? 'Usuario'}</p>
              <p className="dc-topbar-dropdown-text">{user?.role ?? 'Sin rol asignado'}</p>
              <button className="dc-topbar-logout" type="button" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
