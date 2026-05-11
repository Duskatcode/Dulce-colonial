import { useQuery } from '@tanstack/react-query';
import AppLayout from '../components/layout/AppLayout';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import { reportsService } from '../services/reports.service';
import { movementsService } from '../services/movements.service';

type MovementsSummary = {
  total: number;
  byType: Record<string, number>;
};

export default function DashboardPage() {
  const { data: stock } = useQuery({
    queryKey: ['report-stock'],
    queryFn: reportsService.getStock,
  });

  const { data: lowStock } = useQuery({
    queryKey: ['report-low-stock'],
    queryFn: reportsService.getLowStock,
  });

  const { data: summary } = useQuery<MovementsSummary>({
    queryKey: ['movements-summary'],
    queryFn: () => movementsService.getSummary(),
  });

  return (
    <AppLayout title="Panel de control">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="🍰" label="Productos activos" value={stock?.products?.active ?? '—'} color="#c0392b" />
        <StatCard icon="📦" label="Tipos de insumos" value={stock?.ingredients?.total ?? '—'} color="#3d1a00" />
        <StatCard icon="⚠️" label="Bajo stock" value={lowStock ? (lowStock.lowProducts.total + lowStock.lowIngredients.total) : '—'} color="#e67e22" subtitle="productos + insumos" />
        <StatCard icon="↕️" label="Movimientos totales" value={summary?.total ?? '—'} color="#27ae60" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Bajo stock — productos */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1a0a00' }}>⚠️ Productos con bajo stock</h3>
          {lowStock?.lowProducts?.data?.length === 0
            ? <p style={{ color: '#aaa', fontSize: 14 }}>Todo en orden ✅</p>
            : lowStock?.lowProducts?.data?.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f0eb', fontSize: 14 }}>
                <span>{p.name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#c0392b', fontWeight: 600 }}>{p.stock}</span>
                  <Badge label={p.status} />
                </div>
              </div>
            ))}
        </div>

        {/* Bajo stock — insumos */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1a0a00' }}>📦 Insumos bajo mínimo</h3>
          {lowStock?.lowIngredients?.data?.length === 0
            ? <p style={{ color: '#aaa', fontSize: 14 }}>Todo en orden ✅</p>
            : lowStock?.lowIngredients?.data?.map((i: any) => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f0eb', fontSize: 14 }}>
                <span>{i.name}</span>
                <span style={{ color: '#c0392b', fontWeight: 600 }}>
                  {Number(i.quantity).toFixed(2)} {i.unit} / mín {Number(i.min_stock).toFixed(2)}
                </span>
              </div>
            ))}
        </div>

        {/* Resumen movimientos */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1a0a00' }}>↕️ Resumen de movimientos</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(summary?.byType ?? {}).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#faf5f0', borderRadius: 8 }}>
                <Badge label={type} />
                <span style={{ fontWeight: 700 }}>{count}</span>
                <span style={{ color: '#888', fontSize: 13 }}>movimientos</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
