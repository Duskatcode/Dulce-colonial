import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { inventoryService } from '../services/inventory.service';
import type { Ingredient } from '../types';
import { getApiErrorMessage } from '../utils/errorMessage';

const emptyForm = {
  name: '',
  unit: 'kg',
  quantity: '',
  minStock: '',
  observations: '',
};

type IngredientForm = typeof emptyForm;

function isBelowMin(ingredient: Ingredient) {
  return Number(ingredient.quantity) <= Number(ingredient.minStock);
}

function formatQuantity(value: number | string, unit: string) {
  return `${Number(value).toFixed(2)} ${unit}`;
}

export default function InventoryPage() {
  const { isOperador, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [belowMin, setBelowMin] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState<IngredientForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, belowMin, page],
    queryFn: () =>
      inventoryService.getAll({
        search,
        belowMinStock: belowMin,
        page,
        limit: 15,
      }),
  });

  const ingredients = data?.data ?? [];
  const meta = data?.meta;

  const currentPageLowStock = useMemo(
    () => ingredients.filter(isBelowMin).length,
    [ingredients],
  );

  const totalQuantity = useMemo(
    () => ingredients.reduce((acc, item) => acc + Number(item.quantity || 0), 0),
    [ingredients],
  );

  const saveMutation = useMutation({
    mutationFn: (d: IngredientForm) => {
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

      return editing
        ? inventoryService.update(editing.id, payload)
        : inventoryService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(editing ? 'Insumo actualizado' : 'Insumo registrado');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al guardar'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Insumo eliminado');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al eliminar'));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (ingredient: Ingredient) => {
    setEditing(ingredient);
    setForm({
      name: ingredient.name,
      unit: ingredient.unit,
      quantity: String(ingredient.quantity ?? ''),
      minStock: String(ingredient.minStock ?? ''),
      observations: ingredient.observations ?? '',
    });
    setModalOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleBelowMinChange = (checked: boolean) => {
    setBelowMin(checked);
    setPage(1);
  };

  const canGoPrev = page > 1;
  const canGoNext = meta ? page < meta.totalPages : false;

  return (
    <AppLayout title="Inventario">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Stock interno</p>
          <h1 className="dc-page-title">Inventario de insumos</h1>
          <p className="dc-page-subtitle">
            Controla materias primas, unidades de medida, mínimos y alertas de reposición.
          </p>
        </div>

        <div className="dc-inventory-header-actions">
          <button className="dc-button-secondary" style={{ padding: '12px 16px' }} type="button">
            Exportar lista
          </button>

          {isOperador && (
            <button
              className="dc-button-primary"
              style={{ padding: '12px 18px' }}
              type="button"
              onClick={openCreate}
            >
              Nuevo insumo
            </button>
          )}
        </div>
      </section>

      <section className="dc-inventory-stats" aria-label="Resumen de inventario">
        <StatCard
          icon="inventory_2"
          iconType="material"
          label="Insumos listados"
          value={meta?.total ?? ingredients.length}
          subtitle="Según filtros actuales"
          accent="primary"
        />

        <StatCard
          icon="warning"
          iconType="material"
          label="Bajo mínimo"
          value={currentPageLowStock}
          subtitle="En esta página"
          accent="error"
        />

        <StatCard
          icon="scale"
          iconType="material"
          label="Cantidad acumulada"
          value={Number(totalQuantity).toFixed(2)}
          subtitle="Suma visible en pantalla"
          accent="secondary"
        />
      </section>

      <section className="dc-inventory-panel">
        <div className="dc-inventory-toolbar">
          <div className="dc-inventory-toolbar-left">
            <div className="dc-search-field">
              <span className="material-symbols-outlined">search</span>
              <input
                className="dc-search-input"
                placeholder="Buscar insumo..."
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
              />
            </div>

            <label className="dc-filter-toggle">
              <input
                type="checkbox"
                checked={belowMin}
                onChange={(event) => handleBelowMinChange(event.target.checked)}
              />
              Solo bajo mínimo
            </label>
          </div>

          <span style={{ color: 'var(--dc-on-surface-variant)', fontSize: 14, fontWeight: 800 }}>
            Página {page}{meta ? ` de ${meta.totalPages}` : ''}
          </span>
        </div>

        <div className="dc-inventory-table-wrap">
          <table className="dc-inventory-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Unidad</th>
                <th>Cantidad</th>
                <th>Stock mínimo</th>
                <th>Estado</th>
                <th>Observaciones</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="dc-empty-state">Cargando inventario...</div>
                  </td>
                </tr>
              ) : ingredients.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="dc-empty-state">No hay insumos registrados</div>
                  </td>
                </tr>
              ) : (
                ingredients.map((ingredient) => {
                  const danger = isBelowMin(ingredient);

                  return (
                    <tr key={ingredient.id}>
                      <td>
                        <div className="dc-inventory-name-cell">
                          <span className="dc-inventory-icon">
                            <span className="material-symbols-outlined">grain</span>
                          </span>

                          <div>
                            <div className="dc-inventory-name">{ingredient.name}</div>
                            <div className="dc-inventory-sub">
                              Actualizado: {new Date(ingredient.updatedAt).toLocaleDateString('es-CO')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>{ingredient.unit}</td>

                      <td>
                        <span className={`dc-inventory-quantity ${danger ? 'danger' : ''}`}>
                          {formatQuantity(ingredient.quantity, ingredient.unit)}
                        </span>
                      </td>

                      <td>{formatQuantity(ingredient.minStock, ingredient.unit)}</td>

                      <td>
                        <Badge label={danger ? 'BAJO_MINIMO' : 'OPTIMO'} />
                      </td>

                      <td>{ingredient.observations || '—'}</td>

                      <td>
                        <div className="dc-inventory-actions">
                          {isOperador && (
                            <button
                              className="dc-icon-action"
                              type="button"
                              title="Editar"
                              onClick={() => openEdit(ingredient)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                                edit
                              </span>
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              className="dc-icon-action danger"
                              type="button"
                              title="Eliminar"
                              onClick={() => deleteMutation.mutate(ingredient.id)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                                delete
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
              ? `Mostrando ${ingredients.length} de ${meta.total} insumos`
              : `Mostrando ${ingredients.length} insumos`}
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
        title={editing ? 'Editar insumo' : 'Nuevo insumo'}
      >
        <div className="dc-form-stack">
          <Field
            label="Nombre"
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
          />

          <div className="dc-form-grid">
            <div>
              <label className="dc-form-label">Unidad de medida</label>
              <select
                className="dc-form-input"
                value={form.unit}
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
              >
                {['kg', 'gr', 'lt', 'ml', 'unidad', 'caja', 'bolsa'].map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Cantidad disponible"
              type="number"
              value={form.quantity}
              numeric
              onChange={(value) => setForm({ ...form, quantity: value })}
            />
          </div>

          <Field
            label="Stock mínimo"
            type="number"
            value={form.minStock}
            numeric
            onChange={(value) => setForm({ ...form, minStock: value })}
          />

          <Field
            label="Observaciones"
            value={form.observations}
            multiline
            onChange={(value) => setForm({ ...form, observations: value })}
          />

          <button
            className="dc-login-button"
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar insumo'}
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
  value: string;
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
