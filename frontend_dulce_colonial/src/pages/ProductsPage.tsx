import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { productsService } from '../services/products.service';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errorMessage';

const emptyForm = { name: '', category: '', description: '', price: '', stock: '', status: 'ACTIVO' };

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page],
    queryFn: () => productsService.getAll({ search, page, limit: 15 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: productsService.getCategories,
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) => {
      const price = Number(d.price || 0);
      const stock = Number(d.stock || 0);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('El precio debe ser un número válido mayor o igual a 0.');
      }
      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error('El stock debe ser un número válido mayor o igual a 0.');
      }
      const payload = {
        ...d,
        price,
        stock,
      };
      return editing ? productsService.update(editing.id, payload) : productsService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Error al guardar')),
  });

  const deactivateMutation = useMutation({
    mutationFn: productsService.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto desactivado');
    },
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ ...p, price: String(p.price ?? ''), stock: String(p.stock ?? '') });
    setModalOpen(true);
  };

  const columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'category', label: 'Categoría' },
    { key: 'price', label: 'Precio', render: (r: Product) => `$${Number(r.price).toLocaleString()}` },
    { key: 'stock', label: 'Stock', render: (r: Product) => (
      <span style={{ color: r.stock <= 2 ? '#c0392b' : '#155724', fontWeight: 600 }}>{r.stock}</span>
    )},
    { key: 'status', label: 'Estado', render: (r: Product) => <Badge label={r.status} /> },
    { key: 'actions', label: '', render: (r: Product) => (
      <div style={{ display: 'flex', gap: 6 }}>
        {isAdmin && (
          <button onClick={() => openEdit(r)} style={btnStyle('#3d1a00')}>Editar</button>
        )}
        {isAdmin && r.status !== 'INACTIVO' && (
          <button onClick={() => deactivateMutation.mutate(r.id)} style={btnStyle('#c0392b')}>
            Desactivar
          </button>
        )}
      </div>
    )},
  ];

  return (
    <AppLayout title="Productos">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar producto..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={inputStyle}
        />
        {isAdmin && (
          <button onClick={openCreate} style={{ padding: '9px 20px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            + Nuevo producto
          </button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <Table columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No hay productos" />
      </div>

      {/* Paginación */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: data.meta.totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: page === i + 1 ? '#c0392b' : '#f0e6dc',
              color: page === i + 1 ? '#fff' : '#333',
            }}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nombre" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <div>
            <label style={labelStyle}>Categoría</label>
            <input list="cats" value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              style={inputStyle} placeholder="Ej: Tortas" />
            <datalist id="cats">
              {categories?.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <Field label="Descripción" value={form.description} onChange={v => setForm({ ...form, description: v })} />
          <Field label="Precio" type="number" value={form.price} onChange={v => setForm({ ...form, price: v })} numeric />
          <Field label="Stock inicial" type="number" value={form.stock} onChange={v => setForm({ ...form, stock: v })} numeric />
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            style={{ padding: '11px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  numeric?: boolean;
}

const Field = ({ label, value, onChange, type = 'text', numeric = false }: FieldProps) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={numeric ? (e) => e.currentTarget.select() : undefined}
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
