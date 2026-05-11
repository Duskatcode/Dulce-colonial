import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { movementsService } from '../services/movements.service';
import { productsService } from '../services/products.service';
import { inventoryService } from '../services/inventory.service';
import { Movement, MovementType, ReferenceType } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errorMessage';

const emptyForm = { type: 'ENTRADA', entityType: 'PRODUCTO', entityId: 0, quantity: '1', notes: '' };

export default function MovementsPage() {
  const { isOperador } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ type: '', entityType: '', page: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['movements', filters],
    queryFn: () => movementsService.getAll({
      type: filters.type as MovementType || undefined,
      entityType: filters.entityType as ReferenceType || undefined,
      page: filters.page,
      limit: 20,
    }),
  });

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsService.getAll({ limit: 100 }),
  });

  const { data: ingredients } = useQuery({
    queryKey: ['inventory-all'],
    queryFn: () => inventoryService.getAll({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      {
        const quantity = Number(data.quantity || 0);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error('La cantidad debe ser un número válido mayor a 0.');
        }
        return movementsService.create({
          ...data,
          quantity,
        });
      },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Movimiento registrado');
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Error al registrar')),
  });

  const columns = [
    { key: 'createdAt', label: 'Fecha', render: (r: Movement) =>
      new Date(r.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) },
    { key: 'type', label: 'Tipo', render: (r: Movement) => <Badge label={r.type} /> },
    { key: 'entity', label: 'Entidad', render: (r: Movement) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.product?.name || r.ingredient?.name || '—'}</div>
        <div style={{ fontSize: 12, color: '#888' }}>{r.referenceType}</div>
      </div>
    )},
    { key: 'quantity', label: 'Cantidad', render: (r: Movement) => (
      <span style={{ fontWeight: 700, color: r.type === 'ENTRADA' ? '#155724' : '#c0392b' }}>
        {r.type === 'ENTRADA' ? '+' : '-'}{r.quantity}
      </span>
    )},
    { key: 'notes', label: 'Motivo', render: (r: Movement) => r.notes || '—' },
    { key: 'user', label: 'Usuario', render: (r: Movement) => r.user?.name },
  ];

  const refOptions = form.entityType === 'PRODUCTO'
    ? products?.data || []
    : ingredients?.data || [];

  return (
    <AppLayout title="Movimientos">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value, page: 1 })} style={{ ...inputStyle, width: 150 }}>
            <option value="">Todos los tipos</option>
            {['ENTRADA','SALIDA','AJUSTE','MERMA'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.entityType} onChange={e => setFilters({ ...filters, entityType: e.target.value, page: 1 })} style={{ ...inputStyle, width: 160 }}>
            <option value="">Productos e insumos</option>
            <option value="PRODUCTO">Solo productos</option>
            <option value="INGREDIENTE">Solo insumos</option>
          </select>
        </div>
        {isOperador && (
          <button onClick={() => setModalOpen(true)}
            style={{ padding: '9px 20px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            + Registrar movimiento
          </button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <Table columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No hay movimientos" />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar movimiento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Tipo de movimiento</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              {['ENTRADA','SALIDA','AJUSTE','MERMA'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Aplica a</label>
            <select value={form.entityType}
              onChange={e => setForm({ ...form, entityType: e.target.value, entityId: 0 })}
              style={inputStyle}>
              <option value="PRODUCTO">Producto</option>
              <option value="INGREDIENTE">Insumo</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{form.entityType === 'PRODUCTO' ? 'Producto' : 'Insumo'}</label>
            <select value={form.entityId}
              onChange={e => setForm({ ...form, entityId: +e.target.value })}
              style={inputStyle}>
              <option value={0}>Seleccionar...</option>
              {refOptions.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name} (disponible: {form.entityType === 'PRODUCTO' ? item.stock : Number(item.quantity).toFixed(2)} {item.unit || ''})
                </option>
              ))}
            </select>
          </div>
          <Field label="Cantidad" type="number" value={form.quantity} onChange={(v: string) => setForm({ ...form, quantity: v })} numeric />
          <Field label="Motivo" value={form.notes} onChange={(v: string) => setForm({ ...form, notes: v })} />
          <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.entityId}
            style={{ padding: '11px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, opacity: !form.entityId ? 0.5 : 1 }}>
            {createMutation.isPending ? 'Registrando...' : 'Registrar'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}

const Field = ({ label, value, onChange, type = 'text', numeric = false }: any) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={numeric ? e => e.currentTarget.select() : undefined}
      inputMode={numeric ? 'decimal' : undefined}
      min={numeric ? 0 : undefined}
      placeholder={numeric ? '0' : undefined}
      style={inputStyle}
    />
  </div>
);

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, color: '#555', marginBottom: 4, fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e0d5cc', fontSize: 14, boxSizing: 'border-box' };
