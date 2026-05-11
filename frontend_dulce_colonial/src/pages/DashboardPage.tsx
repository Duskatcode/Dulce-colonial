import { useQuery } from '@tanstack/react-query';
import AppLayout from '../components/layout/AppLayout';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import { movementsService } from '../services/movements.service';
import { reportsService } from '../services/reports.service';

type MovementsSummary = {
  total: number;
  byType: Record<string, number>;
};

type LowStockProduct = {
  id: number;
  name: string;
  stock: number;
  status: string;
};

type LowStockIngredient = {
  id: number;
  name: string;
  quantity: number | string;
  unit: string;
  min_stock: number | string;
};

function formatNumber(value: unknown) {
  if (typeof value === 'number') return value.toLocaleString('es-CO');
  if (typeof value === 'string') return value;
  return '—';
}

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

  const lowStockTotal = lowStock
    ? lowStock.lowProducts.total + lowStock.lowIngredients.total
    : '—';

  return (
    <AppLayout title="Panel de control">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Dulce Colonial</p>
          <h1 className="dc-page-title">Resumen del negocio</h1>
          <p className="dc-page-subtitle">
            Vista general de productos, inventario, alertas y movimientos del sistema.
          </p>
        </div>

        <div className="dc-dashboard-actions">
          <button className="dc-button-secondary" style={{ padding: '12px 16px' }} type="button">
            Ver reportes
          </button>
          <button className="dc-button-primary" style={{ padding: '12px 18px' }} type="button">
            Nuevo movimiento
          </button>
        </div>
      </section>

      <section className="dc-dashboard-grid" aria-label="Métricas principales">
        <StatCard
          icon="bakery_dining"
          iconType="material"
          label="Productos activos"
          value={formatNumber(stock?.products?.active)}
          subtitle="Productos disponibles"
          accent="primary"
        />

        <StatCard
          icon="inventory_2"
          iconType="material"
          label="Tipos de insumos"
          value={formatNumber(stock?.ingredients?.total)}
          subtitle="Insumos registrados"
          accent="secondary"
        />

        <StatCard
          icon="warning"
          iconType="material"
          label="Bajo stock"
          value={lowStockTotal}
          subtitle="Productos + insumos"
          accent="error"
        />

        <StatCard
          icon="swap_vert"
          iconType="material"
          label="Movimientos totales"
          value={formatNumber(summary?.total)}
          subtitle="Entradas y salidas"
          accent="warning"
        />
      </section>

      <section className="dc-dashboard-content-grid">
        <article className="dc-dashboard-panel">
          <header className="dc-dashboard-panel-header">
            <h2 className="dc-dashboard-panel-title">Productos con bajo stock</h2>
            <span className="material-symbols-outlined" style={{ color: 'var(--dc-error)' }}>
              warning
            </span>
          </header>

          <div className="dc-dashboard-panel-body">
            {lowStock?.lowProducts?.data?.length === 0 ? (
              <div className="dc-empty-state">Todo en orden</div>
            ) : (
              <div className="dc-stock-list">
                {lowStock?.lowProducts?.data?.map((product: LowStockProduct) => (
                  <div className="dc-stock-row" key={product.id}>
                    <div>
                      <div className="dc-stock-name">{product.name}</div>
                      <div className="dc-stock-detail">Producto terminado</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="dc-stock-value">{product.stock}</span>
                      <Badge label={product.status} />
                    </div>
                  </div>
                )) ?? <div className="dc-empty-state">Cargando productos...</div>}
              </div>
            )}
          </div>
        </article>

        <article className="dc-dashboard-panel">
          <header className="dc-dashboard-panel-header">
            <h2 className="dc-dashboard-panel-title">Insumos bajo mínimo</h2>
            <span className="material-symbols-outlined" style={{ color: 'var(--dc-secondary)' }}>
              inventory_2
            </span>
          </header>

          <div className="dc-dashboard-panel-body">
            {lowStock?.lowIngredients?.data?.length === 0 ? (
              <div className="dc-empty-state">Todo en orden</div>
            ) : (
              <div className="dc-stock-list">
                {lowStock?.lowIngredients?.data?.map((ingredient: LowStockIngredient) => (
                  <div className="dc-stock-row" key={ingredient.id}>
                    <div>
                      <div className="dc-stock-name">{ingredient.name}</div>
                      <div className="dc-stock-detail">
                        Mínimo: {Number(ingredient.min_stock).toFixed(2)} {ingredient.unit}
                      </div>
                    </div>

                    <span className="dc-stock-value">
                      {Number(ingredient.quantity).toFixed(2)} {ingredient.unit}
                    </span>
                  </div>
                )) ?? <div className="dc-empty-state">Cargando insumos...</div>}
              </div>
            )}
          </div>
        </article>

        <article className="dc-dashboard-panel dc-dashboard-wide">
          <header className="dc-dashboard-panel-header">
            <h2 className="dc-dashboard-panel-title">Resumen de movimientos</h2>
            <span className="material-symbols-outlined" style={{ color: 'var(--dc-primary)' }}>
              analytics
            </span>
          </header>

          <div className="dc-dashboard-panel-body">
            {Object.keys(summary?.byType ?? {}).length === 0 ? (
              <div className="dc-empty-state">Sin movimientos registrados</div>
            ) : (
              <div className="dc-movement-chip-grid">
                {Object.entries(summary?.byType ?? {}).map(([type, count]) => (
                  <div className="dc-movement-chip" key={type}>
                    <Badge label={type} />
                    <span className="dc-movement-count">{count}</span>
                    <span className="dc-movement-label">movimientos</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>
    </AppLayout>
  );
}
