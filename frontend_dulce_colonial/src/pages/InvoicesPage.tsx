import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import InvoiceModal from '../components/invoices/InvoiceModal';
import AppLayout from '../components/layout/AppLayout';
import StatCard from '../components/ui/StatCard';
import { invoicesService } from '../services/invoices.service';
import type { Invoice } from '../types/invoice.types';
import { getApiErrorMessage } from '../utils/errorMessage';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMoney(value: number | string | undefined | null) {
  const numeric = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

function getInvoiceItemsSummary(invoice: Invoice) {
  const items = invoice.items ?? [];

  if (items.length === 0) return 'Sin productos registrados';

  return items
    .slice(0, 3)
    .map((item) => `${item.productName ?? item.description ?? 'Producto'} × ${item.quantity}`)
    .join(', ')
    .concat(items.length > 3 ? ` +${items.length - 3} más` : '');
}

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoices', page, startDate, endDate, search],
    queryFn: () =>
      invoicesService.getInvoices({
        page,
        limit: 15,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        number: search || undefined,
      }),
  });

  const invoices = data?.data ?? [];

  const totalPages = (() => {
    if (!data?.meta) return 1;
    if (data.meta.totalPages) return data.meta.totalPages;
    const { total = 0, limit = 1 } = data.meta;
    return Math.max(1, Math.ceil(total / Math.max(1, limit)));
  })();

  const visibleTotal = useMemo(
    () => invoices.reduce((acc, invoice) => acc + Number(invoice.total || 0), 0),
    [invoices],
  );

  const emittedCount = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'EMITIDA').length,
    [invoices],
  );

  const cancelledCount = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'ANULADA').length,
    [invoices],
  );

  const openInvoice = async (id: number) => {
    setViewingId(id);
    setLoadingInvoice(true);

    try {
      const invoice = await invoicesService.getInvoice(id);
      setSelectedInvoice(invoice);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Error al cargar factura'));
    } finally {
      setLoadingInvoice(false);
      setViewingId(null);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  return (
    <AppLayout title="Facturas">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Comprobantes internos</p>
          <h1 className="dc-page-title">Facturas</h1>
          <p className="dc-page-subtitle">
            Consulta recibos internos generados desde caja y revisa detalle de productos vendidos.
          </p>
        </div>

        <div className="dc-inventory-header-actions">
          <button
            className="dc-button-secondary"
            style={{ padding: '12px 16px' }}
            type="button"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>

          <button
            className="dc-button-primary"
            style={{ padding: '12px 18px' }}
            type="button"
            onClick={() => refetch()}
          >
            Aplicar filtros
          </button>
        </div>
      </section>

      <section className="dc-inventory-stats" aria-label="Resumen de facturas">
        <StatCard
          icon="receipt_long"
          iconType="material"
          label="Facturas listadas"
          value={data?.meta?.total ?? invoices.length}
          subtitle="Según filtros actuales"
          accent="primary"
        />

        <StatCard
          icon="check_circle"
          iconType="material"
          label="Emitidas visibles"
          value={emittedCount}
          subtitle="En esta página"
          accent="secondary"
        />

        <StatCard
          icon="cancel"
          iconType="material"
          label="Anuladas visibles"
          value={cancelledCount}
          subtitle="En esta página"
          accent="error"
        />

        <StatCard
          icon="payments"
          iconType="material"
          label="Total visible"
          value={formatMoney(visibleTotal)}
          subtitle="Suma de esta página"
          accent="warning"
        />
      </section>

      <section className="dc-inventory-panel" style={{ marginBottom: 24 }}>
        <div className="dc-inventory-toolbar">
          <div className="dc-invoice-filter-grid" style={{ width: '100%' }}>
            <div>
              <label className="dc-form-label">Desde</label>
              <input
                className="dc-form-input"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="dc-form-label">Hasta</label>
              <input
                className="dc-form-input"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="dc-form-label">Número de factura</label>
              <input
                className="dc-form-input"
                placeholder="Buscar por número..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <button
              className="dc-button-secondary"
              style={{ height: 42, padding: '0 16px' }}
              type="button"
              onClick={() => refetch()}
            >
              Buscar
            </button>
          </div>
        </div>

        <div className="dc-inventory-table-wrap">
          <table className="dc-inventory-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="dc-empty-state">Cargando facturas...</div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="dc-empty-state">No hay facturas registradas</div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="dc-invoice-number-cell">
                        <span className="dc-invoice-icon">
                          <span className="material-symbols-outlined">receipt_long</span>
                        </span>

                        <div>
                          <div className="dc-invoice-number">{invoice.number}</div>
                          <div className="dc-invoice-sub">Caja #{invoice.cashRegisterId}</div>
                        </div>
                      </div>
                    </td>

                    <td>{dateFormatter.format(new Date(invoice.createdAt))}</td>

                    <td>
                      <div className="dc-invoice-products">{getInvoiceItemsSummary(invoice)}</div>
                    </td>

                    <td>
                      <span className="dc-invoice-total">{formatMoney(invoice.total)}</span>
                    </td>

                    <td>
                      <span
                        className={`dc-invoice-status ${
                          invoice.status === 'ANULADA' ? 'cancelled' : 'emitted'
                        }`}
                      >
                        {invoice.status === 'ANULADA' ? 'Anulada' : 'Emitida'}
                      </span>
                    </td>

                    <td>
                      <div className="dc-inventory-actions">
                        <button
                          className="dc-icon-action"
                          type="button"
                          title="Ver factura"
                          disabled={loadingInvoice && viewingId === invoice.id}
                          onClick={() => openInvoice(invoice.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                            {loadingInvoice && viewingId === invoice.id ? 'hourglass_top' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <footer className="dc-inventory-footer">
            <span>
              Página {page} de {totalPages}
            </span>

            <div className="dc-pagination">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index}
                  className="dc-pagination-button"
                  type="button"
                  onClick={() => setPage(index + 1)}
                  style={{
                    background:
                      page === index + 1
                        ? 'var(--dc-primary)'
                        : 'var(--dc-surface-container-lowest)',
                    color:
                      page === index + 1
                        ? 'var(--dc-on-primary)'
                        : 'var(--dc-primary)',
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </footer>
        )}
      </section>

      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </AppLayout>
  );
}
