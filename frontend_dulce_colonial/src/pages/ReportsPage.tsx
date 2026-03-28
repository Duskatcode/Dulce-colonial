import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../components/layout/AppLayout';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import { reportsService } from '../services/reports.service';

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'lowstock'>('stock');

  const { data: stock, isLoading: loadStock } = useQuery({
    queryKey: ['report-stock'],
    queryFn: reportsService.getStock,
    enabled: activeTab === 'stock',
  });

  const { data: movements, isLoading: loadMov } = useQuery({
    queryKey: ['report-movements', dateFrom, dateTo],
    queryFn: () => reportsService.getMovements(dateFrom || undefined, dateTo || undefined),
    enabled: activeTab === 'movements',
  });

  const { data: lowStock, isLoading: loadLow } = useQuery({
    queryKey: ['report-lowstock'],
    queryFn: reportsService.getLowStock,
    enabled: activeTab === 'lowstock',
  });

  const tabs = [
    { key: 'stock', label: '📦 Stock actual' },
    { key: 'movements', label: '↕️ Movimientos' },
    { key: 'lowstock', label: '⚠️ Bajo inventario' },
  ];

  return (
    <AppLayout title="Reportes">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 14,
              background: activeTab === t.key ? '#c0392b' : '#f0e6dc',
              color: activeTab === t.key ? '#fff' : '#3d1a00' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Stock */}
      {activeTab === 'stock' && (
        <div>
          {loadStock ? <p>Cargando...</p> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                <StatCard icon="🍰" label="Productos activos" value={stock?.products?.active ?? 0} color="#c0392b" />
                <StatCard icon="🚫" label="Agotados" value={stock?.products?.outOfStock ?? 0} color="#e74c3c" />
                <StatCard icon="📦" label="Total insumos" value={stock?.ingredients?.total ?? 0} color="#3d1a00" />
                <StatCard icon="⚠️" label="Bajo mínimo" value={stock?.ingredients?.belowMinStock ?? 0} color="#e67e22" />
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Productos</h3>
                <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#faf5f0' }}>
                      {['Nombre','Categoría','Precio','Stock','Estado'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #f0e6dc' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stock?.products?.data?.map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f5f0eb' }}>
                        <td style={{ padding: '8px 12px' }}>{p.name}</td>
                        <td style={{ padding: '8px 12px', color: '#888' }}>{p.category}</td>
                        <td style={{ padding: '8px 12px' }}>${Number(p.price).toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: p.stock <= 2 ? '#c0392b' : '#155724' }}>{p.stock}</td>
                        <td style={{ padding: '8px 12px' }}><Badge label={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Movimientos */}
      {activeTab === 'movements' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Desde</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hasta</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
            </div>
          </div>
          {loadMov ? <p>Cargando...</p> : (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <p style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>Total: <strong>{movements?.total}</strong> movimientos</p>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#faf5f0' }}>
                    {['Fecha','Tipo','Entidad','Cantidad','Motivo','Usuario'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #f0e6dc' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements?.data?.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f5f0eb' }}>
                      <td style={{ padding: '8px 12px', color: '#888' }}>{new Date(m.createdAt).toLocaleDateString('es-CO')}</td>
                      <td style={{ padding: '8px 12px' }}><Badge label={m.type} /></td>
                      <td style={{ padding: '8px 12px' }}>{m.product?.name || m.ingredient?.name}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: m.type === 'ENTRADA' ? '#155724' : '#c0392b' }}>
                        {m.type === 'ENTRADA' ? '+' : '-'}{m.quantity}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#888' }}>{m.reason || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{m.user?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Bajo inventario */}
      {activeTab === 'lowstock' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {loadLow ? <p>Cargando...</p> : (
            <>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>🍰 Productos ({lowStock?.lowProducts?.total})</h3>
                {lowStock?.lowProducts?.data?.map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f0eb', fontSize: 14 }}>
                    <span>{p.name}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: '#c0392b', fontWeight: 700 }}>{p.stock}</span>
                      <Badge label={p.status} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>📦 Insumos ({lowStock?.lowIngredients?.total})</h3>
                {lowStock?.lowIngredients?.data?.map((i: any) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f0eb', fontSize: 14 }}>
                    <span>{i.name}</span>
                    <span style={{ color: '#c0392b', fontWeight: 700 }}>
                      {Number(i.quantity).toFixed(2)} / {Number(i.min_stock).toFixed(2)} {i.unit}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, color: '#555', marginBottom: 4, fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e0d5cc', fontSize: 14 };