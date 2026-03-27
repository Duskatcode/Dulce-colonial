import { useAuth } from '../context/AuthContext';
import { useStockAlerts } from '../hooks/useStockAlerts';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { alerts } = useStockAlerts();

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🍰 Dulce Colonial</h1>
        <div>
          <span style={{ marginRight: 16 }}>👤 {user?.name} ({user?.role})</span>
          <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
      <p>Panel principal — Fase 3 completará este módulo.</p>

      {alerts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>⚠️ Alertas de stock activas ({alerts.length})</h3>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 8 }}>
              <strong>{a.entityName}</strong> ({a.entityType}) —
              Stock: {a.currentStock} / Mínimo: {a.minStock}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
