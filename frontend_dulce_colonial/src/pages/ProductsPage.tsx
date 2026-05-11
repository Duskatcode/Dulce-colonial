import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { productsService } from '../services/products.service';
import type { Product, ProductStatus } from '../types';
import { getApiErrorMessage } from '../utils/errorMessage';

const emptyForm = {
  name: '',
  category: '',
  description: '',
  price: '',
  stock: '',
  status: 'ACTIVO' as ProductStatus,
};

type ProductForm = typeof emptyForm;

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function isLowStock(product: Product) {
  return Number(product.stock) <= 2 || product.status === 'AGOTADO';
}

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, statusFilter, page],
    queryFn: () =>
      productsService.getAll({
        search,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: productsService.getCategories,
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const visibleActive = useMemo(
    () => products.filter((product) => product.status === 'ACTIVO').length,
    [products],
  );

  const visibleLowStock = useMemo(
    () => products.filter(isLowStock).length,
    [products],
  );

  const visibleValue = useMemo(
    () =>
      products.reduce(
        (acc, product) =>
          acc + Number(product.price || 0) * Number(product.stock || 0),
        0,
      ),
    [products],
  );

  const saveMutation = useMutation({
    mutationFn: (dataToSave: ProductForm) => {
      const price = Number(dataToSave.price || 0);
      const stock = Number(dataToSave.stock || 0);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error('El precio debe ser un número válido mayor o igual a 0.');
      }

      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error('El stock debe ser un número válido mayor o igual a 0.');
      }

      const payload = {
        ...dataToSave,
        price,
        stock,
      };

      return editing
        ? productsService.update(editing.id, payload)
        : productsService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al guardar'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: productsService.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto desactivado');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al desactivar'));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description ?? '',
      price: String(product.price ?? ''),
      stock: String(product.stock ?? ''),
      status: product.status,
    });
    setModalOpen(true);
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const canGoPrev = page > 1;
  const canGoNext = meta ? page < meta.totalPages : false;

  return (
    <AppLayout title="Productos">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Catálogo interno</p>
          <h1 className="dc-page-title">Productos</h1>
          <p className="dc-page-subtitle">
            Administra postres, tortas, dulces, precios, categorías y disponibilidad.
          </p>
        </div>

        <div className="dc-inventory-header-actions">
          <button
            className="dc-button-secondary"
            style={{ padding: '12px 16px' }}
            type="button"
            onClick={resetFilters}
          >
            Limpiar filtros
          </button>

          {isAdmin && (
            <button
              className="dc-button-primary"
              style={{ padding: '12px 18px' }}
              type="button"
              onClick={openCreate}
            >
              Nuevo producto
            </button>
          )}
        </div>
      </section>

      <section className="dc-inventory-stats" aria-label="Resumen de productos">
        <StatCard
          icon="bakery_dining"
          iconType="material"
          label="Productos listados"
          value={meta?.total ?? products.length}
          subtitle="Según filtros actuales"
          accent="primary"
        />

        <StatCard
          icon="check_circle"
          iconType="material"
          label="Activos visibles"
          value={visibleActive}
          subtitle="En esta página"
          accent="secondary"
        />

        <StatCard
          icon="warning"
          iconType="material"
          label="Stock crítico"
          value={visibleLowStock}
          subtitle="Stock menor o igual a 2"
          accent="error"
        />

        <StatCard
          icon="payments"
          iconType="material"
          label="Valor visible"
          value={formatCurrency(visibleValue)}
          subtitle="Precio x stock"
          accent="warning"
        />
      </section>

      <section className="dc-inventory-panel">
        <div className="dc-inventory-toolbar">
          <div className="dc-inventory-toolbar-left">
            <div className="dc-search-field">
              <span className="material-symbols-outlined">search</span>
              <input
                className="dc-search-input"
                placeholder="Buscar producto..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className="dc-select-filter"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas las categorías</option>
              {categories?.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              className="dc-select-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
              <option value="AGOTADO">Agotado</option>
            </select>
          </div>

          <span style={{ color: 'var(--dc-on-surface-variant)', fontSize: 14, fontWeight: 800 }}>
            Página {page}{meta ? ` de ${meta.totalPages}` : ''}
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
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="dc-empty-state">Cargando productos...</div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="dc-empty-state">No hay productos registrados</div>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const danger = isLowStock(product);

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="dc-product-card-cell">
                          <span className="dc-product-thumb">
                            <span className="material-symbols-outlined">cake</span>
                          </span>

                          <div>
                            <div className="dc-product-name">{product.name}</div>
                            <div className="dc-product-description">
                              {product.description || 'Sin descripción'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="dc-product-category">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            category
                          </span>
                          {product.category}
                        </span>
                      </td>

                      <td>
                        <span className="dc-product-price">{formatCurrency(product.price)}</span>
                      </td>

                      <td>
                        <span className={`dc-product-stock ${danger ? 'danger' : ''}`}>
                          {product.stock}
                        </span>
                      </td>

                      <td>
                        <Badge label={product.status} />
                      </td>

                      <td>
                        <div className="dc-inventory-actions">
                          {isAdmin && (
                            <button
                              className="dc-icon-action"
                              type="button"
                              title="Editar"
                              onClick={() => openEdit(product)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                                edit
                              </span>
                            </button>
                          )}

                          {isAdmin && product.status !== 'INACTIVO' && (
                            <button
                              className="dc-icon-action danger"
                              type="button"
                              title="Desactivar"
                              onClick={() => deactivateMutation.mutate(product.id)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                                block
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="dc-inventory-footer">
          <span>
            {meta
              ? `Mostrando ${products.length} de ${meta.total} productos`
              : `Mostrando ${products.length} productos`}
          </span>

          <div className="dc-pagination">
            <button
              className="dc-pagination-button"
              type="button"
              disabled={!canGoPrev}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              ‹
            </button>

            <button
              className="dc-pagination-button"
              type="button"
              disabled={!canGoNext}
              onClick={() => setPage((value) => value + 1)}
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        width={620}
      >
        <div className="dc-form-stack">
          <Field
            label="Nombre"
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
          />

          <div>
            <label className="dc-form-label">Categoría</label>
            <input
              className="dc-form-input"
              list="product-categories"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              placeholder="Ej: Tortas"
            />
            <datalist id="product-categories">
              {categories?.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <Field
            label="Descripción"
            value={form.description}
            multiline
            onChange={(value) => setForm({ ...form, description: value })}
          />

          <div className="dc-form-grid">
            <Field
              label="Precio"
              type="number"
              value={form.price}
              numeric
              onChange={(value) => setForm({ ...form, price: value })}
            />

            <Field
              label="Stock inicial"
              type="number"
              value={form.stock}
              numeric
              onChange={(value) => setForm({ ...form, stock: value })}
            />
          </div>

          <div>
            <label className="dc-form-label">Estado</label>
            <select
              className="dc-form-input"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as ProductStatus })
              }
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
              <option value="AGOTADO">Agotado</option>
            </select>
          </div>

          <button
            className="dc-login-button"
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  numeric = false,
  multiline = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="dc-form-label">{label}</label>

      {multiline ? (
        <textarea
          className="dc-form-input dc-form-textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="dc-form-input"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={numeric ? (event) => event.currentTarget.select() : undefined}
          inputMode={numeric ? 'decimal' : undefined}
          min={numeric ? 0 : undefined}
          placeholder={numeric ? '0' : undefined}
        />
      )}
    </div>
  );
}
