import { useState } from 'react';
import { useStockAlerts } from '../../hooks/useStockAlerts';

function formatStock(value: number) {
  return Number(value).toLocaleString('es-CO', {
    maximumFractionDigits: 2,
  });
}

export default function AlertsPanel() {
  const { alerts } = useStockAlerts();
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <>
      <button className="dc-alert-toggle" type="button" onClick={() => setOpen(!open)}>
        <span className="material-symbols-outlined">warning</span>
        Alertas de stock
        <span className="dc-alert-count">{alerts.length}</span>
      </button>

      {open && (
        <div className="dc-alert-panel">
          {alerts.map((alert, index) => (
            <div key={`${alert.entityName}-${index}`} className="dc-alert-item">
              <div className="dc-alert-name">{alert.entityName}</div>
              <div className="dc-alert-detail">
                {alert.entityType} — {formatStock(alert.currentStock)} / mínimo{' '}
                {formatStock(alert.minStock)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
