import { useState } from 'react';
import { useStockAlerts } from '../../hooks/useStockAlerts';

export default function AlertsPanel() {
  const { alerts } = useStockAlerts();
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <>
      {/* Badge flotante */}
      <button onClick={() => setOpen(!open)} style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        gap: 8, width: '100%', padding: '10px 16px', borderRadius: 8,
        background: 'rgba(192,57,43,0.2)', border: '1px solid rgba(192,57,43,0.4)',
        color: '#ff9f85', cursor: 'pointer', fontSize: 14, fontWeight: 500,
        marginBottom: 4,
      }}>
        ⚠️ Alertas de stock
        <span style={{
          background: '#c0392b', color: '#fff', borderRadius: 20,
          padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 'auto',
        }}>
          {alerts.length}
        </span>
      </button>

      {/* Panel desplegable */}
      {open && (
        <div style={{
          background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 8,
          marginBottom: 8, maxHeight: 200, overflowY: 'auto',
        }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              padding: '6px 8px', borderRadius: 6, marginBottom: 4,
              background: 'rgba(192,57,43,0.15)', fontSize: 12,
            }}>
              <div style={{ color: '#ff9f85', fontWeight: 600 }}>{a.entityName}</div>
              <div style={{ color: '#c8a99a' }}>
                {a.entityType} — {a.currentStock} / mín {a.minStock}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}