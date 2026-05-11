import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { inventoryService } from '../services/inventory.service';
import { Ingredient } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errorMessage';

const emptyForm = { name: '', unit: 'kg', quantity: '', minStock: '', observations: '' };

export default function InventoryPage() {
  const { isOperador, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [belowMin, setBelowMin] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, belowMin, page],
    queryFn: () => inventoryService.getAll({ search, belowMinStock: belowMin, page, limit: 15 }),
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) => {
      const quantity = Number(d.quantity || 0);
      const minStock = Number(d.minStock || 0);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error('La cantidad debe ser un número válido mayor o igual a 0.');
      }
      if (!Number.isFinite(minStock) || minStock < 0) {
        throw new Error('El stock mínimo debe ser un número válido mayor o igual a 0.');
      }
      const payload = {
        ...d,
        quantity,
        minStock,
      };
      return editing ? inventoryService.update(editing.id, payload) : inventoryService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(editing ? 'Insumo actualizado' : 'Insumo registrado');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Error al guardar')),
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Insumo eliminado'); },
  });

  const openEdit = (i: Ingredient) => {
    setEditing(i);
    setForm({
      ...i,
      quantity: String(i.quantity ?? ''),
      minStock: String(i.minStock ?? ''),
    });
    setModalOpen(true);
  };

  const columns = [
    { key: 'name', label: 'Insumo' },
    { key: 'quantity', label: 'Cantidad', render: (r: Ingredient) => (
      <span style={{ color: Number(r.quantity) <= Number(r.minStock) ? '#c0392b' : '#155724', fontWeight: 600 }}>
        {Number(r.quantity).toFixed(2)} {r.unit}
      </span>
    )},
    { key: 'minStock', label: 'Stock mín.', render: (r: Ingredient) => `${Number(r.minStock).toFixed(2)} ${r.unit}` },
    { key: 'observations', label: 'Observaciones', render: (r: Ingredient) => r.observations || '—' },
    { key: 'actions', label: '', render: (r: Ingredient) => (
      <div style={{ display: 'flex', gap: 6 }}>
        {isOperador && <button onClick={() => openEdit(r)} style={btnStyle('#3d1a00')}>Editar</button>}
        {isAdmin && <button onClick={() => deleteMutation.mutate(r.id)} style={btnStyle('#c0392b')}>Eliminar</button>}
      </div>
    )},
  ];

  return (
    <AppLayout title="Inventario de insumos">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input placeholder="Buscar insumo..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inputStyle, width: 220 }} />
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={belowMin} onChange={e => setBelowMin(e.target.checked)} />
            Solo bajo mínimo
          </label>
        </div>
        {isOperador && (
          <button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }}
            style={{ padding: '9px 20px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            + Nuevo insumo
          </button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <Table columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No hay insumos" />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar insumo' : 'Nuevo insumo'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nombre" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
          <div>
            <label style={labelStyle}>Unidad de medida</label>
            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={inputStyle}>
              {['kg', 'gr', 'lt', 'ml', 'unidad', 'caja', 'bolsa'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <Field label="Cantidad disponible" type="number" value={form.quantity} onChange={(v: string) => setForm({ ...form, quantity: v })} numeric />
          <Field label="Stock mínimo" type="number" value={form.minStock} onChange={(v: string) => setForm({ ...form, minStock: v })} numeric />
          <Field label="Observaciones" value={form.observations} onChange={(v: string) => setForm({ ...form, observations: v })} />
          <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
            style={{ padding: '11px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
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
const btnStyle = (bg: string): React.CSSProperties => ({ padding: '5px 12px', background: bg, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 });
