import { useStockAlerts } from '../../hooks/useStockAlerts';
import DriveStatusBadge from '../drive/DriveStatusBadge';

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const { alerts } = useStockAlerts();

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

        <button className="dc-topbar-icon-button" type="button" aria-label="Notificaciones">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <button className="dc-topbar-icon-button" type="button" aria-label="Caja">
          <span className="material-symbols-outlined">account_balance_wallet</span>
        </button>

        <button className="dc-topbar-icon-button" type="button" aria-label="Perfil">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
}
