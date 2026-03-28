import { useStockAlerts } from '../../hooks/useStockAlerts';

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const { alerts } = useStockAlerts();

  return (
    <header style={{
      height: 60, background: '#fff',
      borderBottom: '1px solid #f0e6dc',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px', position: 'sticky',
      top: 0, zIndex: 50,
    }}>
      <h2 style={{ margin: 0, fontSize: 18, color: '#1a0a00', fontWeight: 600 }}>
        {title}
      </h2>
      {alerts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#fff3cd', padding: '6px 14px',
          borderRadius: 20, fontSize: 13, color: '#856404',
        }}>
          ⚠️ {alerts.length} alerta{alerts.length > 1 ? 's' : ''} de stock
        </div>
      )}
    </header>
  );
}