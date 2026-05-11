import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { inventoryService } from '../services/inventory.service';
import { movementsService } from '../services/movements.service';
import { productsService } from '../services/products.service';
import type { Ingredient, Movement, MovementType, Product, ReferenceType } from '../types';
import { getApiErrorMessage } from '../utils/errorMessage';

const movementTypes: Array<{
  value: MovementType;
  label: string;
  helper: string;
  icon: string;
}> = [
  { value: 'ENTRADA', label: 'Entrada', helper: 'Aumenta stock', icon: 'add_circle' },
  { value: 'SALIDA', label: 'Salida', helper: 'Reduce stock', icon: 'remove_circle' },
  { value: 'AJUSTE', label: 'Ajuste', helper: 'Corrección manual', icon: 'tune' },
  { value: 'MERMA', label: 'Merma', helper: 'Pérdida o daño', icon: 'warning' },
];

const emptyForm = {
  type: 'ENTRADA' as MovementType,
  entityType: 'PRODUCTO' as ReferenceType,
  entityId: 0,
  quantity: '1',
  notes: '',
};

type MovementForm = typeof emptyForm;

function formatDate(value: string) {
  const date = new Date(value);

  return {
    date: date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }),
    time: date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function getMovementSign(type: MovementType) {
  if (type === 'ENTRADA') return '+';
  if (type === 'SALIDA' || type === 'MERMA') return '-';
  return '±';
}

function getMovementQuantityClass(type: MovementType) {
  return type === 'ENTRADA' ? 'positive' : 'negative';
}

function getEntityName(movement: Movement) {
  return movement.product?.name || movement.ingredient?.name || 'Sin entidad';
}

function getEntityIcon(entityType: ReferenceType) {
  return entityType === 'PRODUCTO' ? 'cake' : 'grain';
}

function getAvailableLabel(item: Product | Ingredient, entityType: ReferenceType) {
  if (entityType === 'PRODUCTO') {
    return `Disponible: ${(item as Product).stock}`;
  }

  const ingredient = item as Ingredient;
  return `Disponible: ${Number(ingredient.quantity).toFixed(2)} ${ingredient.unit}`;
}

export default function MovementsPage() {
  const { isOperador } = useAuth();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<{
    type: '' | MovementType;
    entityType: '' | ReferenceType;
    page: number;
  }>({
    type: '',
    entityType: '',
    page: 1,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MovementForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['movements', filters],
    queryFn: () =>
      movementsService.getAll({
        type: filters.type || undefined,
        entityType: filters.entityType || undefined,
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

  const movements = data?.data ?? [];
  const meta = data?.meta;

  const visibleEntries = useMemo(
    () => movements.filter((movement) => movement.type === 'ENTRADA').length,
    [movements],
  );

  const visibleOutputs = useMemo(
    () =>
      movements.filter((movement) =>
        ['SALIDA', 'MERMA'].includes(movement.type),
      ).length,
    [movements],
  );

  const visibleAdjustments = useMemo(
    () => movements.filter((movement) => movement.type === 'AJUSTE').length,
    [movements],
  );

  const createMutation = useMutation({
    mutationFn: (dataToSave: MovementForm) => {
      const quantity = Number(dataToSave.quantity || 0);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('La cantidad debe ser un número válido mayor a 0.');
      }

      return movementsService.create({
        ...dataToSave,
        quantity,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-all'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-all'] });
      toast.success('Movimiento registrado');
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al registrar'));
    },
  });

  const refOptions: Array<Product | Ingredient> =
    form.entityType === 'PRODUCTO'
      ? products?.data ?? []
      : ingredients?.data ?? [];

  const canGoPrev = filters.page > 1;
  const canGoNext = meta ? filters.page < meta.totalPages : false;

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const updateFilter = (
    nextFilters: Partial<{ type: '' | MovementType; entityType: '' | ReferenceType }>,
  ) => {
    setFilters((current) => ({
      ...current,
      ...nextFilters,
      page: 1,
    }));
  };

  return (
    <AppLayout title="Movimientos">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Trazabilidad</p>
          <h1 className="dc-page-title">Movimientos</h1>
          <p className="dc-page-subtitle">
            Registra entradas, salidas, ajustes y mermas para mantener inventario y productos sincronizados.
          </p>
        </div>

        <div className="dc-inventory-header-actions">
          <button
            className="dc-button-secondary"
            style={{ padding: '12px 16px' }}
            type="button"
            onClick={() => updateFilter({ type: '', entityType: '' })}
          >
            Limpiar filtros
          </button>

          {isOperador && (
            <button
              className="dc-button-primary"
              style={{ padding: '12px 18px' }}
              type="button"
              onClick={openCreate}
            >
              Registrar movimiento
            </button>
          )}
        </div>
      </section>

      <section className="dc-inventory-stats" aria-label="Resumen de movimientos">
        <StatCard
          icon="swap_vert"
          iconType="material"
          label="Movimientos visibles"
          value={meta?.total ?? movements.length}
          subtitle="Según filtros actuales"
          accent="primary"
        />

        <StatCard
          icon="add_circle"
          iconType="material"
          label="Entradas visibles"
          value={visibleEntries}
          subtitle="En esta página"
          accent="secondary"
        />

        <StatCard
          icon="remove_circle"
          iconType="material"
          label="Salidas / mermas"
          value={visibleOutputs}
          subtitle="En esta página"
          accent="error"
        />

        <StatCard
          icon="tune"
          iconType="material"
          label="Ajustes visibles"
          value={visibleAdjustments}
          subtitle="En esta página"
          accent="warning"
        />
      </section>

      <section className="dc-inventory-panel">
        <div className="dc-inventory-toolbar">
          <div className="dc-inventory-toolbar-left">
            <select
              className="dc-select-filter"
              value={filters.type}
              onChange={(event) =>
                updateFilter({ type: event.target.value as '' | MovementType })
              }
            >
              <option value="">Todos los tipos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="MERMA">Merma</option>
            </select>

            <select
              className="dc-select-filter"
              value={filters.entityType}
              onChange={(event) =>
                updateFilter({ entityType: event.target.value as '' | ReferenceType })
              }
            >
              <option value="">Productos e insumos</option>
              <option value="PRODUCTO">Solo productos</option>
              <option value="INGREDIENTE">Solo insumos</option>
            </select>
          </div>

          <span style={{ color: 'var(--dc-on-surface-variant)', fontSize: 14, fontWeight: 800 }}>
            Página {filters.page}{meta ? ` de ${meta.totalPages}` : ''}
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
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="dc-empty-state">Cargando movimientos...</div>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="dc-empty-state">No hay movimientos registrados</div>
                  </td>
                </tr>
              ) : (
                movements.map((movement) => {
                  const formatted = formatDate(movement.createdAt);

                  return (
                    <tr key={movement.id}>
                      <td>
                        <div className="dc-movement-date">{formatted.date}</div>
                        <div className="dc-movement-time">{formatted.time}</div>
                      </td>

                      <td>
                        <Badge label={movement.type} />
                      </td>

                      <td>
                        <div className="dc-movement-entity-cell">
                          <span
                            className="dc-movement-entity-icon"
                            data-type={movement.referenceType}
                          >
                            <span className="material-symbols-outlined">
                              {getEntityIcon(movement.referenceType)}
                            </span>
                          </span>

                          <div>
                            <div className="dc-movement-entity-name">
                              {getEntityName(movement)}
                            </div>
                            <div className="dc-movement-entity-type">
                              {movement.referenceType === 'PRODUCTO' ? 'Producto' : 'Insumo'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`dc-movement-quantity ${getMovementQuantityClass(
                            movement.type,
                          )}`}
                        >
                          {getMovementSign(movement.type)}
                          {Number(movement.quantity).toLocaleString('es-CO')}
                        </span>
                      </td>

                      <td>
                        <div className="dc-movement-note">
                          {movement.notes || movement.reason || '—'}
                        </div>
                      </td>

                      <td>
                        <span className="dc-movement-user">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            person
                          </span>
                          {movement.user?.name ?? 'Sistema'}
                        </span>
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
              ? `Mostrando ${movements.length} de ${meta.total} movimientos`
              : `Mostrando ${movements.length} movimientos`}
          </span>

          <div className="dc-pagination">
            <button
              className="dc-pagination-button"
              type="button"
              disabled={!canGoPrev}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.max(1, current.page - 1),
                }))
              }
            >
              ‹
            </button>

            <button
              className="dc-pagination-button"
              type="button"
              disabled={!canGoNext}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: current.page + 1,
                }))
              }
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar movimiento"
        width={680}
      >
        <div className="dc-form-stack">
          <p className="dc-movement-form-help">
            Selecciona el tipo de movimiento y la entidad afectada. La cantidad debe ser mayor a cero.
          </p>

          <div className="dc-movement-type-grid">
            {movementTypes.map((type) => (
              <button
                key={type.value}
                className={`dc-movement-type-card ${form.type === type.value ? 'active' : ''}`}
                type="button"
                onClick={() => setForm({ ...form, type: type.value })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                  {type.icon}
                </span>
                <strong>{type.label}</strong>
                <span>{type.helper}</span>
              </button>
            ))}
          </div>

          <div className="dc-form-grid">
            <div>
              <label className="dc-form-label">Aplica a</label>
              <select
                className="dc-form-input"
                value={form.entityType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    entityType: event.target.value as ReferenceType,
                    entityId: 0,
                  })
                }
              >
                <option value="PRODUCTO">Producto</option>
                <option value="INGREDIENTE">Insumo</option>
              </select>
            </div>

            <div>
              <label className="dc-form-label">
                {form.entityType === 'PRODUCTO' ? 'Producto' : 'Insumo'}
              </label>
              <select
                className="dc-form-input"
                value={form.entityId}
                onChange={(event) =>
                  setForm({ ...form, entityId: Number(event.target.value) })
                }
              >
                <option value={0}>Seleccionar...</option>
                {refOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {getAvailableLabel(item, form.entityType)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Field
            label="Cantidad"
            type="number"
            value={form.quantity}
            numeric
            onChange={(value) => setForm({ ...form, quantity: value })}
          />

          <Field
            label="Motivo / notas"
            value={form.notes}
            multiline
            onChange={(value) => setForm({ ...form, notes: value })}
          />

          <button
            className="dc-login-button"
            type="button"
            disabled={createMutation.isPending || !form.entityId}
            onClick={() => createMutation.mutate(form)}
          >
            {createMutation.isPending ? 'Registrando...' : 'Registrar movimiento'}
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
