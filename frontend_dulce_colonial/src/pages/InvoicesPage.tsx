import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Table from '../components/ui/Table';
import InvoiceModal from '../components/invoices/InvoiceModal';
import { invoicesService } from '../services/invoices.service';
import type { Invoice } from '../types/invoice.types';
import { getApiErrorMessage } from '../utils/errorMessage';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
});

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

  const totalPages = (() => {
    if (!data?.meta) return 1;
    if (data.meta.totalPages) return data.meta.totalPages;
    const { total = 0, limit = 1 } = data.meta;
    return Math.max(1, Math.ceil(total / Math.max(1, limit)));
  })();

  const columns = [
    { key: 'number', label: 'Número' },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (invoice: Invoice) => dateFormatter.format(new Date(invoice.createdAt)),
    },
    {
      key: 'items',
      label: 'Productos',
      render: (invoice: Invoice) =>
        invoice.items
          .map((item) => `${item.productName} x${item.quantity}`)
          .join(', ') || '—',
    },
    {
      key: 'total',
      label: 'Total',
      render: (invoice: Invoice) => (
        <span style={{ fontWeight: 600, color: '#3d1a00' }}>
          {currencyFormatter.format(invoice.total)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (invoice: Invoice) => (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            background: invoice.status === 'ANULADA' ? '#f8d7da' : '#e8f5e9',
            color: invoice.status === 'ANULADA' ? '#721c24' : '#155724',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {invoice.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (invoice: Invoice) => (
        <button
          onClick={() => openInvoice(invoice.id)}
          disabled={loadingInvoice && viewingId === invoice.id}
          style={{
            padding: '6px 14px',
            background: '#c0392b',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
            opacity: loadingInvoice && viewingId === invoice.id ? 0.7 : 1,
          }}
        >
          {loadingInvoice && viewingId === invoice.id ? 'Cargando...' : 'Ver'}
        </button>
      ),
    },
  ];

  return (
    <AppLayout title="Facturas">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
          <label style={labelStyle}>Desde</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
          <label style={labelStyle}>Hasta</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
          <label style={labelStyle}>Número de factura</label>
          <input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
          />
        </div>
        <button
          onClick={() => refetch()}
          style={{
            padding: '10px 18px',
            background: '#3d1a00',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            alignSelf: 'flex-end',
            height: 42,
            fontWeight: 600,
          }}
        >
          Aplicar
        </button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}
      >
        <Table
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          emptyMessage="No hay facturas registradas"
        />
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              onClick={() => setPage(index + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: page === index + 1 ? '#c0392b' : '#f0e6dc',
                color: page === index + 1 ? '#fff' : '#333',
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}

      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </AppLayout>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: '#6b4f3b',
  marginBottom: 4,
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1.5px solid #e0d5cc',
  fontSize: 14,
  color: '#2f1b0c',
};
