import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { reportsService } from '../services/reports.service';
import { getApiErrorMessage } from '../utils/errorMessage';

type ReportTab = 'stock' | 'movements' | 'lowstock';

interface ProductReportItem {
  id: number;
  name: string;
  category: string;
  price: number | string;
  stock: number;
  status: string;
}

interface IngredientReportItem {
  id: number;
  name: string;
  unit: string;
  quantity: number | string;
  minStock?: number | string;
  min_stock?: number | string;
}

interface StockReport {
  generatedAt: string;
  products: {
    total: number;
    active: number;
    outOfStock: number;
    data: ProductReportItem[];
  };
  ingredients: {
    total: number;
    belowMinStock: number;
    data: IngredientReportItem[];
  };
}

interface MovementReportItem {
  id: number;
  type: string;
  referenceType: string;
  quantity: number | string;
  reason?: string;
  notes?: string;
  createdAt: string;
  user?: { name: string };
  product?: { name: string; category?: string };
  ingredient?: { name: string; unit?: string };
}

interface MovementsReport {
  generatedAt: string;
  total: number;
  data: MovementReportItem[];
}

interface LowStockReport {
  generatedAt: string;
  lowProducts: {
    total: number;
    data: ProductReportItem[];
  };
  lowIngredients: {
    total: number;
    data: IngredientReportItem[];
  };
}

interface GeneratedReport {
  id: number;
  type: string;
  fileName: string;
  status: string;
  driveUrl?: string | null;
  createdAt?: string;
  uploadedAt?: string | null;
}

const tabs: Array<{
  key: ReportTab;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'stock',
    label: 'Stock actual',
    description: 'Productos, insumos y disponibilidad general.',
    icon: 'inventory_2',
  },
  {
    key: 'movements',
    label: 'Movimientos',
    description: 'Entradas, salidas, ajustes y mermas por rango.',
    icon: 'swap_vert',
  },
  {
    key: 'lowstock',
    label: 'Bajo inventario',
    description: 'Productos e insumos que requieren reposición.',
    icon: 'warning',
  },
];

const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMoney(value: number | string | undefined | null) {
  const numeric = Number(value ?? 0);
  return moneyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDate(value: string | undefined | null) {
  if (!value) return 'No registrado';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No registrado' : dateFormatter.format(date);
}

function getIngredientMinStock(item: IngredientReportItem) {
  return item.minStock ?? item.min_stock ?? 0;
}

function getEntityName(movement: MovementReportItem) {
  return movement.product?.name || movement.ingredient?.name || 'Sin entidad';
}

function getMovementSign(type: string) {
  return type === 'ENTRADA' ? '+' : type === 'AJUSTE' ? '±' : '-';
}

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<ReportTab>('stock');

  const { data: stock, isLoading: loadStock } = useQuery<StockReport>({
    queryKey: ['report-stock'],
    queryFn: reportsService.getStock,
    enabled: activeTab === 'stock',
  });

  const { data: movements, isLoading: loadMovements, refetch: refetchMovements } =
    useQuery<MovementsReport>({
      queryKey: ['report-movements', dateFrom, dateTo],
      queryFn: () => reportsService.getMovements(dateFrom || undefined, dateTo || undefined),
      enabled: activeTab === 'movements',
    });

  const { data: lowStock, isLoading: loadLowStock } = useQuery<LowStockReport>({
    queryKey: ['report-lowstock'],
    queryFn: reportsService.getLowStock,
    enabled: activeTab === 'lowstock',
  });

  const { data: history } = useQuery<GeneratedReport[]>({
    queryKey: ['report-history'],
    queryFn: reportsService.getHistory,
    enabled: isAdmin,
  });

  const manualMutation = useMutation({
    mutationFn: (type: ReportTab) => reportsService.triggerManual(type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-history'] });
      toast.success('Reporte manual generado');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo generar el reporte manual'));
    },
  });

  const visibleProductsValue = useMemo(
    () =>
      stock?.products?.data?.reduce(
        (acc, product) => acc + Number(product.price || 0) * Number(product.stock || 0),
        0,
      ) ?? 0,
    [stock],
  );

  const currentGeneratedAt =
    activeTab === 'stock'
      ? stock?.generatedAt
      : activeTab === 'movements'
        ? movements?.generatedAt
        : lowStock?.generatedAt;

  return (
    <AppLayout title="Reportes">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Análisis operativo</p>
          <h1 className="dc-page-title">Reportes</h1>
          <p className="dc-page-subtitle">
            Consulta stock, movimientos y alertas de bajo inventario. Los administradores pueden generar respaldos manuales en Drive.
          </p>
        </div>

        <div className="dc-inventory-header-actions">
          {isAdmin && (
            <button
              className="dc-button-primary"
              style={{ padding: '12px 18px' }}
              type="button"
              disabled={manualMutation.isPending}
              onClick={() => manualMutation.mutate(activeTab)}
            >
              {manualMutation.isPending ? 'Generando...' : 'Generar reporte manual'}
            </button>
          )}
        </div>
      </section>

      <nav className="dc-report-tabs" aria-label="Tipos de reporte">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`dc-report-tab ${activeTab === tab.key ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="dc-report-tab-icon">
              <span className="material-symbols-outlined">{tab.icon}</span>
            </span>

            <span>
              <span className="dc-report-tab-title">{tab.label}</span>
              <span className="dc-report-tab-subtitle">{tab.description}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="dc-report-toolbar">
        <span className="dc-report-generated">
          Generado: {formatDate(currentGeneratedAt)}
        </span>

        {activeTab === 'movements' && (
          <div className="dc-report-filter-grid">
            <div>
              <label className="dc-form-label">Desde</label>
              <input
                className="dc-form-input"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>

            <div>
              <label className="dc-form-label">Hasta</label>
              <input
                className="dc-form-input"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>

            <button
              className="dc-button-secondary"
              style={{ height: 42, padding: '0 16px' }}
              type="button"
              onClick={() => refetchMovements()}
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {activeTab === 'stock' && (
        <>
          <section className="dc-inventory-stats" aria-label="Resumen de stock">
            <StatCard
              icon="bakery_dining"
              iconType="material"
              label="Productos activos"
              value={stock?.products?.active ?? 0}
              subtitle="Disponibles para venta"
              accent="primary"
            />

            <StatCard
              icon="block"
              iconType="material"
              label="Agotados"
              value={stock?.products?.outOfStock ?? 0}
              subtitle="Sin disponibilidad"
              accent="error"
            />

            <StatCard
              icon="inventory_2"
              iconType="material"
              label="Total insumos"
              value={stock?.ingredients?.total ?? 0}
              subtitle="Materias primas registradas"
              accent="secondary"
            />

            <StatCard
              icon="payments"
              iconType="material"
              label="Valor visible"
              value={formatMoney(visibleProductsValue)}
              subtitle="Precio x stock"
              accent="warning"
            />
          </section>

          <section className="dc-inventory-panel">
            <div className="dc-dashboard-panel-header">
              <h2 className="dc-dashboard-panel-title">Productos reportados</h2>
              <span className="material-symbols-outlined" style={{ color: 'var(--dc-primary)' }}>
                analytics
              </span>
            </div>

            <div className="dc-inventory-table-wrap">
              <table className="dc-inventory-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {loadStock ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="dc-empty-state">Cargando reporte de stock...</div>
                      </td>
                    </tr>
                  ) : (stock?.products?.data?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="dc-empty-state">Sin productos reportados</div>
                      </td>
                    </tr>
                  ) : (
                    stock!.products.data.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="dc-product-card-cell">
                            <span className="dc-product-thumb">
                              <span className="material-symbols-outlined">cake</span>
                            </span>
                            <div>
                              <div className="dc-product-name">{product.name}</div>
                              <div className="dc-product-description">ID #{product.id}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="dc-product-category">{product.category}</span>
                        </td>

                        <td>
                          <span className="dc-product-price">{formatMoney(product.price)}</span>
                        </td>

                        <td>
                          <span className={`dc-product-stock ${product.stock <= 2 ? 'danger' : ''}`}>
                            {product.stock}
                          </span>
                        </td>

                        <td>
                          <Badge label={product.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeTab === 'movements' && (
        <>
          <section className="dc-inventory-stats" aria-label="Resumen de movimientos">
            <StatCard
              icon="swap_vert"
              iconType="material"
              label="Total movimientos"
              value={movements?.total ?? 0}
              subtitle="Según rango seleccionado"
              accent="primary"
            />

            <StatCard
              icon="add_circle"
              iconType="material"
              label="Entradas"
              value={movements?.data?.filter((m) => m.type === 'ENTRADA').length ?? 0}
              subtitle="En el reporte actual"
              accent="secondary"
            />

            <StatCard
              icon="remove_circle"
              iconType="material"
              label="Salidas / mermas"
              value={movements?.data?.filter((m) => ['SALIDA', 'MERMA'].includes(m.type)).length ?? 0}
              subtitle="En el reporte actual"
              accent="error"
            />

            <StatCard
              icon="tune"
              iconType="material"
              label="Ajustes"
              value={movements?.data?.filter((m) => m.type === 'AJUSTE').length ?? 0}
              subtitle="Correcciones manuales"
              accent="warning"
            />
          </section>

          <section className="dc-inventory-panel">
            <div className="dc-dashboard-panel-header">
              <h2 className="dc-dashboard-panel-title">Movimientos reportados</h2>
              <span className="material-symbols-outlined" style={{ color: 'var(--dc-primary)' }}>
                timeline
              </span>
            </div>

            <div className="dc-inventory-table-wrap">
              <table className="dc-inventory-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Entidad</th>
                    <th>Cantidad</th>
                    <th>Motivo</th>
                    <th>Usuario</th>
                  </tr>
                </thead>

                <tbody>
                  {loadMovements ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="dc-empty-state">Cargando reporte de movimientos...</div>
                      </td>
                    </tr>
                  ) : (movements?.data?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="dc-empty-state">Sin movimientos en el rango seleccionado</div>
                      </td>
                    </tr>
                  ) : (
                    movements!.data.map((movement) => (
                      <tr key={movement.id}>
                        <td>{formatDate(movement.createdAt)}</td>

                        <td>
                          <Badge label={movement.type} />
                        </td>

                        <td>
                          <div className="dc-movement-entity-name">{getEntityName(movement)}</div>
                          <div className="dc-movement-entity-type">{movement.referenceType}</div>
                        </td>

                        <td>
                          <span
                            className={`dc-movement-quantity ${
                              movement.type === 'ENTRADA' ? 'positive' : 'negative'
                            }`}
                          >
                            {getMovementSign(movement.type)}
                            {Number(movement.quantity).toLocaleString('es-CO')}
                          </span>
                        </td>

                        <td>
                          <div className="dc-movement-note">
                            {movement.reason || movement.notes || '—'}
                          </div>
                        </td>

                        <td>{movement.user?.name ?? 'Sistema'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeTab === 'lowstock' && (
        <>
          <section className="dc-inventory-stats" aria-label="Resumen bajo inventario">
            <StatCard
              icon="warning"
              iconType="material"
              label="Productos críticos"
              value={lowStock?.lowProducts?.total ?? 0}
              subtitle="Stock menor o igual a 2"
              accent="error"
            />

            <StatCard
              icon="inventory_2"
              iconType="material"
              label="Insumos críticos"
              value={lowStock?.lowIngredients?.total ?? 0}
              subtitle="Cantidad menor o igual al mínimo"
              accent="warning"
            />

            <StatCard
              icon="priority_high"
              iconType="material"
              label="Alertas totales"
              value={(lowStock?.lowProducts?.total ?? 0) + (lowStock?.lowIngredients?.total ?? 0)}
              subtitle="Reposición requerida"
              accent="primary"
            />
          </section>

          <section className="dc-report-panel-grid">
            <article className="dc-dashboard-panel">
              <header className="dc-dashboard-panel-header">
                <h2 className="dc-dashboard-panel-title">Productos críticos</h2>
                <span className="material-symbols-outlined" style={{ color: 'var(--dc-error)' }}>
                  bakery_dining
                </span>
              </header>

              <div className="dc-dashboard-panel-body">
                {loadLowStock ? (
                  <div className="dc-empty-state">Cargando productos...</div>
                ) : (lowStock?.lowProducts?.data?.length ?? 0) === 0 ? (
                  <div className="dc-empty-state">Sin productos críticos</div>
                ) : (
                  <div className="dc-stock-list">
                    {lowStock!.lowProducts.data.map((product) => (
                      <div className="dc-stock-row" key={product.id}>
                        <div>
                          <div className="dc-stock-name">{product.name}</div>
                          <div className="dc-stock-detail">{product.category}</div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span className="dc-stock-value">{product.stock}</span>
                          <Badge label={product.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <article className="dc-dashboard-panel">
              <header className="dc-dashboard-panel-header">
                <h2 className="dc-dashboard-panel-title">Insumos críticos</h2>
                <span className="material-symbols-outlined" style={{ color: 'var(--dc-secondary)' }}>
                  grain
                </span>
              </header>

              <div className="dc-dashboard-panel-body">
                {loadLowStock ? (
                  <div className="dc-empty-state">Cargando insumos...</div>
                ) : (lowStock?.lowIngredients?.data?.length ?? 0) === 0 ? (
                  <div className="dc-empty-state">Sin insumos críticos</div>
                ) : (
                  <div className="dc-stock-list">
                    {lowStock!.lowIngredients.data.map((ingredient) => (
                      <div className="dc-stock-row" key={ingredient.id}>
                        <div>
                          <div className="dc-stock-name">{ingredient.name}</div>
                          <div className="dc-stock-detail">Unidad: {ingredient.unit}</div>
                        </div>

                        <span className="dc-stock-value">
                          {Number(ingredient.quantity).toFixed(2)} /{' '}
                          {Number(getIngredientMinStock(ingredient)).toFixed(2)} {ingredient.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </section>
        </>
      )}

      {isAdmin && (
        <section className="dc-dashboard-panel" style={{ marginTop: 24 }}>
          <header className="dc-dashboard-panel-header">
            <h2 className="dc-dashboard-panel-title">Historial de reportes generados</h2>
            <span className="material-symbols-outlined" style={{ color: 'var(--dc-primary)' }}>
              folder
            </span>
          </header>

          <div className="dc-dashboard-panel-body">
            {(history?.length ?? 0) === 0 ? (
              <div className="dc-empty-state">No hay reportes generados todavía</div>
            ) : (
              <div className="dc-report-history-list">
                {history!.map((report) => (
                  <div className="dc-report-history-item" key={report.id}>
                    <div>
                      <div className="dc-report-file-name">{report.fileName}</div>
                      <div className="dc-report-file-meta">
                        {report.type} · {report.status} · {formatDate(report.createdAt)}
                      </div>
                    </div>

                    {report.driveUrl ? (
                      <a
                        className="dc-report-link"
                        href={report.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir Drive
                      </a>
                    ) : (
                      <Badge label={report.status} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
