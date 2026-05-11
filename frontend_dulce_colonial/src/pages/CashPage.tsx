import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import InvoiceModal from '../components/invoices/InvoiceModal';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { cashService } from '../services/cash.service';
import { productsService } from '../services/products.service';
import type { CashTransaction, TransactionType } from '../types';
import type { Invoice } from '../types/invoice.types';
import { getApiErrorMessage } from '../utils/errorMessage';

interface CashStatusResponse {
  status: 'ABIERTA' | 'CERRADA';
  balance: number;
  register?: {
    id: number;
    openedBy?: {
      name: string;
    };
  } | null;
}

interface CashSummaryUser {
  name: string;
  count: number;
  total: number;
}

interface CashSummaryResponse {
  currentBalance: number;
  transactionCount: number;
  totals: Partial<Record<TransactionType, number>>;
  byUser: CashSummaryUser[];
}

interface CashTransactionsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CashTransactionsResponse {
  data: CashTransaction[];
  meta: CashTransactionsMeta;
}

interface ProductCashItem {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface ProductsCashResponse {
  data: ProductCashItem[];
}

interface OpenCashForm {
  openingBalance: string;
  notes: string;
}

interface CloseCashForm {
  closingBalance: string;
  notes: string;
}

interface TxFormState {
  type: TransactionType;
  amount: string;
  description: string;
  reference: string;
  productId: number;
  productQty: string;
  generateInvoice: boolean;
}

interface TxFilterState {
  type: '' | TransactionType;
  page: number;
}

interface CreateTransactionPayload {
  type: TransactionType;
  amount: number;
  description: string;
  reference?: string;
  productId?: number;
  productQty?: number;
  generateInvoice?: boolean;
}

interface CloseRegisterResponse {
  differenceLabel?: string;
  reportUpload?: {
    success: boolean;
    destination?: string;
    fileName?: string;
    error?: string;
  };
}

interface CreateTransactionResponse {
  transaction?: CashTransaction;
  invoice?: Invoice;
}

const TX_META: Record<
  TransactionType,
  {
    label: string;
    helper: string;
    icon: string;
  }
> = {
  VENTA: {
    label: 'Venta',
    helper: 'Ingreso por producto o monto manual',
    icon: 'point_of_sale',
  },
  GASTO: {
    label: 'Gasto',
    helper: 'Salida de dinero de caja',
    icon: 'payments',
  },
  INGRESO: {
    label: 'Ingreso',
    helper: 'Entrada adicional de dinero',
    icon: 'savings',
  },
  DEVOLUCION: {
    label: 'Devolución',
    helper: 'Dinero devuelto al cliente',
    icon: 'undo',
  },
  COTIZACION: {
    label: 'Cotización',
    helper: 'Registro administrativo sin venta real',
    icon: 'receipt_long',
  },
};

const DEBIT_TYPES: TransactionType[] = ['GASTO', 'DEVOLUCION', 'COTIZACION'];

const emptyTx: TxFormState = {
  type: 'VENTA',
  amount: '',
  description: '',
  reference: '',
  productId: 0,
  productQty: '1',
  generateInvoice: false,
};

const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function formatMoney(value: number | string | undefined | null) {
  const numeric = Number(value ?? 0);
  return moneyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDateTime(value: string) {
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

function getProductTotal(
  products: ProductsCashResponse | undefined,
  productId: number,
  productQty: string,
): number | null {
  const product = products?.data?.find((item) => item.id === productId);
  if (!product) return null;

  const quantity = Number(productQty || 1);
  return Number(product.price) * (Number.isFinite(quantity) ? quantity : 1);
}

function isDebit(type: TransactionType) {
  return DEBIT_TYPES.includes(type);
}

function getTransactionSign(type: TransactionType) {
  return isDebit(type) ? '-' : '+';
}

export default function CashPage() {
  const qc = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [txModal, setTxModal] = useState(false);
  const [invoiceToShow, setInvoiceToShow] = useState<Invoice | null>(null);

  const [openForm, setOpenForm] = useState<OpenCashForm>({
    openingBalance: '',
    notes: '',
  });

  const [closeForm, setCloseForm] = useState<CloseCashForm>({
    closingBalance: '',
    notes: '',
  });

  const [txForm, setTxForm] = useState<TxFormState>(emptyTx);

  const [txFilter, setTxFilter] = useState<TxFilterState>({
    type: '',
    page: 1,
  });

  const { data: status } = useQuery<CashStatusResponse>({
    queryKey: ['cash-status'],
    queryFn: cashService.getStatus,
    refetchInterval: 15_000,
  });

  const { data: summary } = useQuery<CashSummaryResponse>({
    queryKey: ['cash-summary'],
    queryFn: () => cashService.getSummary(),
    enabled: status?.status === 'ABIERTA',
  });

  const { data: transactions, isLoading: loadTx } = useQuery<CashTransactionsResponse>({
    queryKey: ['cash-transactions', txFilter],
    queryFn: () =>
      cashService.getTransactions({
        type: txFilter.type || undefined,
        page: txFilter.page,
        limit: 20,
      }),
  });

  const { data: products } = useQuery<ProductsCashResponse>({
    queryKey: ['products-cash'],
    queryFn: () => productsService.getAll({ limit: 100, status: 'ACTIVO' }),
  });

  const openMutation = useMutation({
    mutationFn: (data: OpenCashForm) => {
      const openingBalance = Number(data.openingBalance || 0);

      if (!Number.isFinite(openingBalance) || openingBalance < 0) {
        throw new Error('El saldo inicial debe ser un número válido mayor o igual a 0.');
      }

      return cashService.openRegister({
        openingBalance,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-status'] });
      qc.invalidateQueries({ queryKey: ['cash-summary'] });
      toast.success('Caja abierta correctamente');
      setOpenModal(false);
      setOpenForm({ openingBalance: '', notes: '' });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al abrir caja'));
    },
  });

  const closeMutation = useMutation<CloseRegisterResponse, unknown, CloseCashForm>({
    mutationFn: (data: CloseCashForm) => {
      const closingBalance = Number(data.closingBalance || 0);

      if (!Number.isFinite(closingBalance) || closingBalance < 0) {
        throw new Error('El dinero físico contado debe ser un número válido mayor o igual a 0.');
      }

      return cashService.closeRegister({
        closingBalance,
        notes: data.notes,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['cash-status'] });
      qc.invalidateQueries({ queryKey: ['cash-summary'] });
      toast.success(data?.differenceLabel || 'Caja cerrada');

      if (data?.reportUpload && !data.reportUpload.success) {
        toast.error(
          data.reportUpload.error ||
            'Caja cerrada correctamente, pero el reporte no pudo subirse a Google Drive. Revisa la autorización de Drive.',
          { duration: 7000 },
        );
      }

      setCloseModal(false);
      setCloseForm({ closingBalance: '', notes: '' });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al cerrar caja'));
    },
  });

  const txMutation = useMutation<
    CreateTransactionResponse | CashTransaction,
    unknown,
    CreateTransactionPayload
  >({
    mutationFn: (payload: CreateTransactionPayload) => cashService.createTransaction(payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['cash-status'] });
      qc.invalidateQueries({ queryKey: ['cash-summary'] });
      qc.invalidateQueries({ queryKey: ['cash-transactions'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-cash'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });

      toast.success('Movimiento registrado');
      setTxModal(false);
      setTxForm(emptyTx);

      const invoice = 'invoice' in result && result.invoice ? result.invoice : undefined;
      if (invoice) setInvoiceToShow(invoice);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al registrar movimiento'));
    },
  });

  const isOpen = status?.status === 'ABIERTA';
  const balance = status?.balance ?? 0;
  const isNeg = balance < 0;
  const totalPages = transactions?.meta?.totalPages ?? 0;
  const txRows = transactions?.data ?? [];

  const selectedProductTotal = useMemo(
    () => getProductTotal(products, txForm.productId, txForm.productQty),
    [products, txForm.productId, txForm.productQty],
  );

  const handleSubmitTransaction = () => {
    const isProductSale = txForm.type === 'VENTA' && txForm.productId > 0;
    const manualAmount = Number(txForm.amount || 0);
    const productQty = Number(txForm.productQty || 1);

    if (!isProductSale && (!Number.isFinite(manualAmount) || manualAmount < 0)) {
      toast.error('El monto debe ser un número válido mayor o igual a 0.');
      return;
    }

    if (isProductSale && (!Number.isFinite(productQty) || productQty <= 0)) {
      toast.error('La cantidad debe ser un número válido mayor a 0.');
      return;
    }

    if (isProductSale && (selectedProductTotal === null || selectedProductTotal <= 0)) {
      toast.error('No se pudo calcular el total de la venta');
      return;
    }

    txMutation.mutate({
      type: txForm.type,
      amount: Number(isProductSale ? selectedProductTotal : manualAmount),
      description: txForm.description,
      reference: txForm.reference || undefined,
      productId: isProductSale ? Number(txForm.productId) : undefined,
      productQty: isProductSale ? productQty : undefined,
      generateInvoice: isProductSale ? txForm.generateInvoice : false,
    });
  };

  const resetTxFilter = () => {
    setTxFilter({ type: '', page: 1 });
  };

  return (
    <AppLayout title="Caja">
      <section className="dc-page-header">
        <div>
          <p className="dc-page-eyebrow">Control de efectivo</p>
          <h1 className="dc-page-title">Caja</h1>
          <p className="dc-page-subtitle">
            Gestiona apertura, cierre, ventas, ingresos, gastos, devoluciones y cotizaciones.
          </p>
        </div>

        <div className="dc-inventory-header-actions">
          {!isOpen ? (
            <button
              className="dc-button-primary"
              style={{ padding: '12px 18px' }}
              type="button"
              onClick={() => setOpenModal(true)}
            >
              Abrir caja
            </button>
          ) : (
            <>
              <button
                className="dc-button-primary"
                style={{ padding: '12px 18px' }}
                type="button"
                onClick={() => setTxModal(true)}
              >
                Registrar movimiento
              </button>

              <button
                className="dc-button-secondary"
                style={{ padding: '12px 16px' }}
                type="button"
                onClick={() => setCloseModal(true)}
              >
                Cerrar caja
              </button>
            </>
          )}
        </div>
      </section>

      <section className={`dc-cash-status-card ${isOpen ? 'open' : 'closed'}`}>
        <div className="dc-cash-status-left">
          <span className="dc-cash-status-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 34 }}>
              {isOpen ? 'lock_open' : 'lock'}
            </span>
          </span>

          <div>
            <h2 className="dc-cash-status-title">
              Caja {isOpen ? 'abierta' : 'cerrada'}
            </h2>

            <p className="dc-cash-status-subtitle">
              {isOpen && status?.register?.openedBy
                ? `Abierta por ${status.register.openedBy.name}`
                : isOpen
                  ? 'Turno activo'
                  : 'Debes abrir caja para registrar movimientos'}
            </p>
          </div>
        </div>

        <div className="dc-cash-balance-wrap">
          <p className={`dc-cash-balance ${isNeg ? 'negative' : ''}`}>
            {formatMoney(balance)}
          </p>
          <div className="dc-cash-balance-label">Saldo actual</div>
        </div>
      </section>

      {isOpen && summary && (
        <section className="dc-cash-summary-grid" aria-label="Resumen de caja">
          <StatCard
            icon="point_of_sale"
            iconType="material"
            label="Ventas"
            value={formatMoney(summary.totals?.VENTA || 0)}
            subtitle="Ventas del turno"
            accent="secondary"
          />

          <StatCard
            icon="payments"
            iconType="material"
            label="Gastos"
            value={formatMoney(summary.totals?.GASTO || 0)}
            subtitle="Salidas de caja"
            accent="error"
          />

          <StatCard
            icon="savings"
            iconType="material"
            label="Ingresos"
            value={formatMoney(summary.totals?.INGRESO || 0)}
            subtitle="Entradas adicionales"
            accent="primary"
          />

          <StatCard
            icon="receipt_long"
            iconType="material"
            label="Cotizaciones"
            value={formatMoney(summary.totals?.COTIZACION || 0)}
            subtitle="Registros administrativos"
            accent="warning"
          />

          <StatCard
            icon="undo"
            iconType="material"
            label="Devoluciones"
            value={formatMoney(summary.totals?.DEVOLUCION || 0)}
            subtitle="Retornos al cliente"
            accent="error"
          />
        </section>
      )}

      {isOpen && (summary?.byUser?.length ?? 0) > 0 && (
        <section className="dc-dashboard-panel" style={{ marginBottom: 24 }}>
          <header className="dc-dashboard-panel-header">
            <h2 className="dc-dashboard-panel-title">Movimientos por usuario</h2>
            <span className="material-symbols-outlined" style={{ color: 'var(--dc-primary)' }}>
              group
            </span>
          </header>

          <div className="dc-dashboard-panel-body">
            <div className="dc-cash-user-grid">
              {summary!.byUser.map((userItem) => (
                <article className="dc-cash-user-card" key={userItem.name}>
                  <div className="dc-cash-user-name">{userItem.name}</div>
                  <div className="dc-cash-user-meta">
                    {userItem.count} movimiento{userItem.count === 1 ? '' : 's'}
                  </div>
                  <div className={`dc-cash-user-total ${userItem.total < 0 ? 'negative' : ''}`}>
                    {userItem.total >= 0 ? '+' : ''}
                    {formatMoney(userItem.total)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="dc-inventory-panel">
        <div className="dc-inventory-toolbar">
          <div className="dc-inventory-toolbar-left">
            <h2 className="dc-dashboard-panel-title" style={{ fontSize: 20 }}>
              Historial de movimientos
            </h2>
          </div>

          <div className="dc-inventory-toolbar-left">
            <select
              className="dc-select-filter"
              value={txFilter.type}
              onChange={(event) =>
                setTxFilter({
                  type: event.target.value as TxFilterState['type'],
                  page: 1,
                })
              }
            >
              <option value="">Todos los tipos</option>
              {Object.entries(TX_META).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>

            <button
              className="dc-button-secondary"
              style={{ padding: '10px 14px' }}
              type="button"
              onClick={resetTxFilter}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="dc-inventory-table-wrap">
          <table className="dc-inventory-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Referencia</th>
                <th>Usuario</th>
                <th>Monto</th>
                <th>Saldo</th>
              </tr>
            </thead>

            <tbody>
              {loadTx ? (
                <tr>
                  <td colSpan={7}>
                    <div className="dc-empty-state">Cargando movimientos de caja...</div>
                  </td>
                </tr>
              ) : txRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="dc-empty-state">Sin movimientos registrados</div>
                  </td>
                </tr>
              ) : (
                txRows.map((transaction) => {
                  const formatted = formatDateTime(transaction.createdAt);
                  const debit = isDebit(transaction.type);

                  return (
                    <tr key={transaction.id}>
                      <td>
                        <div className="dc-movement-date">{formatted.date}</div>
                        <div className="dc-movement-time">{formatted.time}</div>
                      </td>

                      <td>
                        <span className="dc-cash-transaction-type" data-type={transaction.type}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            {TX_META[transaction.type].icon}
                          </span>
                          {TX_META[transaction.type].label}
                        </span>
                      </td>

                      <td>
                        <div className="dc-inventory-name">{transaction.description}</div>
                        {transaction.product && (
                          <div className="dc-cash-product-note">
                            {transaction.product.name} × {transaction.productQty}
                          </div>
                        )}
                      </td>

                      <td>{transaction.reference || '—'}</td>

                      <td>
                        <span className="dc-movement-user">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            person
                          </span>
                          {transaction.user.name}
                        </span>
                      </td>

                      <td>
                        <span className={`dc-cash-amount ${debit ? 'debit' : 'credit'}`}>
                          {getTransactionSign(transaction.type)}
                          {formatMoney(transaction.amount)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`dc-cash-balance-after ${
                            Number(transaction.balanceAfter) < 0 ? 'negative' : ''
                          }`}
                        >
                          {formatMoney(transaction.balanceAfter)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <footer className="dc-inventory-footer">
            <span>
              Página {txFilter.page} de {totalPages}
            </span>

            <div className="dc-pagination">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index}
                  className="dc-pagination-button"
                  type="button"
                  onClick={() =>
                    setTxFilter({
                      ...txFilter,
                      page: index + 1,
                    })
                  }
                  style={{
                    background:
                      txFilter.page === index + 1
                        ? 'var(--dc-primary)'
                        : 'var(--dc-surface-container-lowest)',
                    color:
                      txFilter.page === index + 1
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

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir caja">
        <div className="dc-form-stack">
          <Field
            label="Saldo inicial (COP)"
            type="number"
            value={openForm.openingBalance}
            numeric
            placeholder="Ej: 100000"
            onChange={(value) =>
              setOpenForm({
                ...openForm,
                openingBalance: value,
              })
            }
          />

          <Field
            label="Notas (opcional)"
            value={openForm.notes}
            placeholder="Ej: Caja del turno mañana"
            onChange={(value) =>
              setOpenForm({
                ...openForm,
                notes: value,
              })
            }
          />

          <button
            className="dc-login-button"
            type="button"
            onClick={() => openMutation.mutate(openForm)}
            disabled={openMutation.isPending}
          >
            {openMutation.isPending ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </div>
      </Modal>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Cerrar caja">
        <div className="dc-form-stack">
          {summary && (
            <div className="dc-cash-close-summary">
              <div className="dc-cash-info-row">
                <span>Saldo esperado en sistema</span>
                <strong>{formatMoney(summary.currentBalance)}</strong>
              </div>

              <div className="dc-cash-info-row">
                <span>Transacciones</span>
                <strong>{summary.transactionCount}</strong>
              </div>
            </div>
          )}

          <Field
            label="Dinero físico contado (COP)"
            type="number"
            value={closeForm.closingBalance}
            numeric
            placeholder="Ej: 125000"
            onChange={(value) =>
              setCloseForm({
                ...closeForm,
                closingBalance: value,
              })
            }
          />

          <Field
            label="Notas de cierre (opcional)"
            value={closeForm.notes}
            onChange={(value) =>
              setCloseForm({
                ...closeForm,
                notes: value,
              })
            }
          />

          <button
            className="dc-login-button"
            type="button"
            onClick={() => closeMutation.mutate(closeForm)}
            disabled={closeMutation.isPending}
          >
            {closeMutation.isPending ? 'Cerrando...' : 'Cerrar caja'}
          </button>
        </div>
      </Modal>

      <Modal
        open={txModal}
        onClose={() => setTxModal(false)}
        title="Registrar movimiento"
        width={720}
      >
        <div className="dc-form-stack">
          <div>
            <label className="dc-form-label">Tipo de movimiento</label>

            <div className="dc-cash-type-grid">
              {Object.entries(TX_META).map(([key, meta]) => {
                const typedKey = key as TransactionType;

                return (
                  <button
                    key={typedKey}
                    className={`dc-cash-type-card ${txForm.type === typedKey ? 'active' : ''}`}
                    data-type={typedKey}
                    type="button"
                    onClick={() =>
                      setTxForm({
                        ...txForm,
                        type: typedKey,
                        productId: 0,
                        productQty: '1',
                        generateInvoice: false,
                      })
                    }
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                      {meta.icon}
                    </span>
                    <strong>{meta.label}</strong>
                    <span>{meta.helper}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {txForm.type === 'VENTA' && (
            <>
              <div>
                <label className="dc-form-label">Producto (opcional)</label>
                <select
                  className="dc-form-input"
                  value={txForm.productId}
                  onChange={(event) =>
                    setTxForm({
                      ...txForm,
                      productId: Number(event.target.value),
                    })
                  }
                >
                  <option value={0}>Sin producto — monto manual</option>

                  {products?.data?.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — {formatMoney(product.price)} c/u — stock: {product.stock}
                    </option>
                  ))}
                </select>
              </div>

              {txForm.productId > 0 && (
                <Field
                  label="Cantidad"
                  type="number"
                  value={txForm.productQty}
                  numeric
                  placeholder="1"
                  onChange={(value) =>
                    setTxForm({
                      ...txForm,
                      productQty: value,
                    })
                  }
                />
              )}

              {txForm.productId > 0 && selectedProductTotal !== null && (
                <div className="dc-cash-product-total">
                  Total calculado: {formatMoney(selectedProductTotal)}
                </div>
              )}

              {txForm.productId > 0 && (
                <label className="dc-cash-checkbox">
                  <input
                    type="checkbox"
                    checked={txForm.generateInvoice}
                    onChange={(event) =>
                      setTxForm({
                        ...txForm,
                        generateInvoice: event.target.checked,
                      })
                    }
                  />
                  Generar factura con esta venta
                </label>
              )}
            </>
          )}

          {(txForm.type !== 'VENTA' || txForm.productId === 0) && (
            <Field
              label="Monto (COP)"
              type="number"
              value={txForm.amount}
              numeric
              placeholder="Ej: 25000"
              onChange={(value) =>
                setTxForm({
                  ...txForm,
                  amount: value,
                })
              }
            />
          )}

          <Field
            label="Descripción"
            value={txForm.description}
            placeholder={
              txForm.type === 'GASTO'
                ? 'Ej: Pago arriendo local'
                : txForm.type === 'VENTA'
                  ? 'Ej: Venta 5 helados'
                  : txForm.type === 'INGRESO'
                    ? 'Ej: Abono cliente'
                    : txForm.type === 'COTIZACION'
                      ? 'Ej: Cotización pedido especial'
                      : 'Ej: Devolución pedido #12'
            }
            onChange={(value) =>
              setTxForm({
                ...txForm,
                description: value,
              })
            }
          />

          <Field
            label="Referencia (opcional)"
            value={txForm.reference}
            placeholder="Ej: FAC-001, recibo, etc."
            onChange={(value) =>
              setTxForm({
                ...txForm,
                reference: value,
              })
            }
          />

          <button
            className="dc-login-button"
            type="button"
            onClick={handleSubmitTransaction}
            disabled={txMutation.isPending || !txForm.description}
          >
            {txMutation.isPending ? 'Registrando...' : 'Registrar movimiento'}
          </button>
        </div>
      </Modal>

      {invoiceToShow && (
        <InvoiceModal invoice={invoiceToShow} onClose={() => setInvoiceToShow(null)} />
      )}
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  numeric = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  numeric?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="dc-form-label">{label}</label>
      <input
        className="dc-form-input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={numeric ? (event) => event.currentTarget.select() : undefined}
        inputMode={numeric ? 'decimal' : undefined}
        min={numeric ? 0 : undefined}
        placeholder={placeholder ?? (numeric ? '0' : undefined)}
      />
    </div>
  );
}
