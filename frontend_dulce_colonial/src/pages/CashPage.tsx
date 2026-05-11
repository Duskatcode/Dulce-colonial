import { useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { cashService } from '../services/cash.service';
import { productsService } from '../services/products.service';
import InvoiceModal from '../components/invoices/InvoiceModal';
import type { Invoice } from '../types/invoice.types';
import { CashTransaction, TransactionType } from '../types';
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

const TYPE_LABELS: Record<TransactionType, string> = {
  VENTA: '🛒 Venta',
  GASTO: '💸 Gasto',
  INGRESO: '💰 Ingreso',
  DEVOLUCION: '↩️ Devolución',
  COTIZACION: '📋 Cotización',
};

const TYPE_COLORS: Record<TransactionType, string> = {
  VENTA: '#155724',
  GASTO: '#721c24',
  INGRESO: '#0c5460',
  DEVOLUCION: '#856404',
  COTIZACION: '#383d41',
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
    mutationFn: (data: OpenCashForm) =>
      {
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
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Error al abrir caja'));
    },
  });

  const closeMutation = useMutation<CloseRegisterResponse, any, CloseCashForm>({
    mutationFn: (data: CloseCashForm) =>
      {
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
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Error al cerrar caja'));
    },
  });

  const txMutation = useMutation<CreateTransactionResponse | CashTransaction, unknown, CreateTransactionPayload>({
    mutationFn: (payload: CreateTransactionPayload) =>
      cashService.createTransaction(payload),
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
      const invoice =
        'invoice' in result && result.invoice ? result.invoice : undefined;
      if (invoice) setInvoiceToShow(invoice);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Error al registrar movimiento'));
    },
  });

  const isOpen = status?.status === 'ABIERTA';
  const balance = status?.balance ?? 0;
  const isNeg = balance < 0;

  const totalPages = transactions?.meta?.totalPages ?? 0;

  const handleSubmitTransaction = () => {
    const isProductSale = txForm.type === 'VENTA' && txForm.productId > 0;
    const manualAmount = Number(txForm.amount || 0);
    const productQty = Number(txForm.productQty || 1);
    const productTotal = isProductSale
      ? getProductTotal(products, txForm.productId, txForm.productQty)
      : null;

    if (!isProductSale && (!Number.isFinite(manualAmount) || manualAmount < 0)) {
      toast.error('El monto debe ser un número válido mayor o igual a 0.');
      return;
    }

    if (isProductSale && (!Number.isFinite(productQty) || productQty <= 0)) {
      toast.error('La cantidad debe ser un número válido mayor a 0.');
      return;
    }

    if (isProductSale && (productTotal === null || productTotal <= 0)) {
      toast.error('No se pudo calcular el total de la venta');
      return;
    }

    txMutation.mutate({
      type: txForm.type,
      amount: Number(isProductSale ? productTotal : manualAmount),
      description: txForm.description,
      reference: txForm.reference || undefined,
      productId: isProductSale ? Number(txForm.productId) : undefined,
      productQty: isProductSale ? productQty : undefined,
      generateInvoice: isProductSale ? txForm.generateInvoice : false,
    });
  };

  return (
    <AppLayout title="Caja">
      <div
        style={{
          background: isOpen ? '#d4edda' : '#f8d7da',
          border: `2px solid ${isOpen ? '#28a745' : '#dc3545'}`,
          borderRadius: 12,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{isOpen ? '🔓' : '🔒'}</span>

          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a0a00' }}>
              Caja {isOpen ? 'ABIERTA' : 'CERRADA'}
            </div>

            {isOpen && status?.register?.openedBy && (
              <div style={{ fontSize: 13, color: '#555' }}>
                Abierta por {status.register.openedBy.name}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: isNeg ? '#c0392b' : '#1a0a00',
            }}
          >
            {isNeg ? '⚠️ ' : ''}
            ${Number(balance).toLocaleString('es-CO')} COP
          </div>

          <div style={{ fontSize: 12, color: '#888' }}>Saldo actual</div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {!isOpen ? (
            <button onClick={() => setOpenModal(true)} style={btnPrimary}>
              Abrir caja
            </button>
          ) : (
            <>
              <button onClick={() => setTxModal(true)} style={btnPrimary}>
                + Movimiento
              </button>

              <button
                onClick={() => setCloseModal(true)}
                style={{ ...btnPrimary, background: '#3d1a00' }}
              >
                Cerrar caja
              </button>
            </>
          )}
        </div>
      </div>

      {isOpen && summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 14,
            marginBottom: 24,
          }}
        >
          <StatCard
            icon="🛒"
            label="Ventas"
            value={`$${(summary.totals?.VENTA || 0).toLocaleString('es-CO')}`}
            color="#27ae60"
          />

          <StatCard
            icon="💸"
            label="Gastos"
            value={`$${(summary.totals?.GASTO || 0).toLocaleString('es-CO')}`}
            color="#c0392b"
          />

          <StatCard
            icon="💰"
            label="Ingresos"
            value={`$${(summary.totals?.INGRESO || 0).toLocaleString('es-CO')}`}
            color="#2980b9"
          />          <StatCard
            icon="📋"
            label="Cotizaciones"
            value={`$${(summary.totals?.COTIZACION || 0).toLocaleString('es-CO')}`}
            color="#8e44ad"
          />

          <StatCard
            icon="↩️"
            label="Devoluciones"
            value={`$${(summary.totals?.DEVOLUCION || 0).toLocaleString('es-CO')}`}
            color="#e67e22"
          />
        </div>
      )}

      {isOpen && (summary?.byUser?.length ?? 0) > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 14px', fontSize: 15, color: '#1a0a00' }}>
            👤 Movimientos por usuario
          </h3>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {summary!.byUser.map((userItem) => (
              <div
                key={userItem.name}
                style={{
                  background: '#faf5f0',
                  borderRadius: 8,
                  padding: '10px 16px',
                  minWidth: 160,
                }}
              >
                <div style={{ fontWeight: 600, color: '#1a0a00' }}>
                  {userItem.name}
                </div>

                <div style={{ fontSize: 13, color: '#888' }}>
                  {userItem.count} movimientos
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: userItem.total >= 0 ? '#27ae60' : '#c0392b',
                    marginTop: 4,
                  }}
                >
                  {userItem.total >= 0 ? '+' : ''}
                  ${userItem.total.toLocaleString('es-CO')} COP
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f0e6dc',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, color: '#1a0a00' }}>
            Historial de movimientos
          </h3>

          <select
            value={txFilter.type}
            onChange={(e) =>
              setTxFilter({
                ...txFilter,
                type: e.target.value as TxFilterState['type'],
                page: 1,
              })
            }
            style={{ ...inputStyle, width: 160, marginLeft: 'auto' }}
          >
            <option value="">Todos los tipos</option>

            {Object.entries(TYPE_LABELS).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {loadTx ? (
          <p style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
            Cargando...
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#faf5f0' }}>
                {['Fecha', 'Tipo', 'Descripción', 'Referencia', 'Usuario', 'Monto', 'Saldo'].map(
                  (header) => (
                    <th
                      key={header}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        borderBottom: '2px solid #f0e6dc',
                        color: '#1a0a00',
                        fontWeight: 600,
                      }}
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {!transactions?.data?.length ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
                    Sin movimientos
                  </td>
                </tr>
              ) : (
                transactions.data.map((transaction) => {
                  const isDebit = DEBIT_TYPES.includes(transaction.type);

                  return (
                    <tr key={transaction.id} style={{ borderBottom: '1px solid #f5f0eb' }}>
                      <td style={{ padding: '10px 14px', color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(transaction.createdAt).toLocaleString('es-CO', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            background: `${TYPE_COLORS[transaction.type]}22`,
                            color: TYPE_COLORS[transaction.type],
                            padding: '2px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {TYPE_LABELS[transaction.type]}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <div>{transaction.description}</div>

                        {transaction.product && (
                          <div style={{ fontSize: 12, color: '#888' }}>
                            {transaction.product.name} × {transaction.productQty}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', color: '#888' }}>
                        {transaction.reference || '—'}
                      </td>

                      <td style={{ padding: '10px 14px' }}>{transaction.user.name}</td>

                      <td
                        style={{
                          padding: '10px 14px',
                          fontWeight: 700,
                          color: isDebit ? '#c0392b' : '#27ae60',
                        }}
                      >
                        {isDebit ? '-' : '+'}${Number(transaction.amount).toLocaleString('es-CO')}
                      </td>

                      <td
                        style={{
                          padding: '10px 14px',
                          color:
                            Number(transaction.balanceAfter) < 0 ? '#c0392b' : '#1a0a00',
                          fontWeight: 600,
                        }}
                      >
                        ${Number(transaction.balanceAfter).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() =>
                  setTxFilter({
                    ...txFilter,
                    page: index + 1,
                  })
                }
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: txFilter.page === index + 1 ? '#c0392b' : '#f0e6dc',
                  color: txFilter.page === index + 1 ? '#fff' : '#333',
                }}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir caja">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Saldo inicial (COP)</label>
            <input
              type="number"
              value={openForm.openingBalance}
              onChange={(e) =>
                setOpenForm({
                  ...openForm,
                  openingBalance: e.target.value,
                })
              }
              onFocus={(e) => e.currentTarget.select()}
              inputMode="decimal"
              style={inputStyle}
              placeholder="Ej: 100000"
            />
          </div>

          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <input
              value={openForm.notes}
              onChange={(e) =>
                setOpenForm({
                  ...openForm,
                  notes: e.target.value,
                })
              }
              style={inputStyle}
              placeholder="Ej: Caja del turno mañana"
            />
          </div>

          <button
            onClick={() => openMutation.mutate(openForm)}
            disabled={openMutation.isPending}
            style={btnPrimary}
          >
            {openMutation.isPending ? 'Abriendo...' : '🔓 Abrir caja'}
          </button>
        </div>
      </Modal>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Cerrar caja">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {summary && (
            <div style={{ background: '#faf5f0', borderRadius: 8, padding: 14, fontSize: 14 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ color: '#888' }}>Saldo esperado en sistema:</span>
                <strong>${Number(summary.currentBalance).toLocaleString('es-CO')} COP</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Transacciones:</span>
                <strong>{summary.transactionCount}</strong>
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Dinero físico contado (COP)</label>
            <input
              type="number"
              value={closeForm.closingBalance}
              onChange={(e) =>
                setCloseForm({
                  ...closeForm,
                  closingBalance: e.target.value,
                })
              }
              onFocus={(e) => e.currentTarget.select()}
              inputMode="decimal"
              style={inputStyle}
              placeholder="Ej: 125000"
            />
          </div>

          <div>
            <label style={labelStyle}>Notas de cierre (opcional)</label>
            <input
              value={closeForm.notes}
              onChange={(e) =>
                setCloseForm({
                  ...closeForm,
                  notes: e.target.value,
                })
              }
              style={inputStyle}
            />
          </div>

          <button
            onClick={() => closeMutation.mutate(closeForm)}
            disabled={closeMutation.isPending}
            style={{ ...btnPrimary, background: '#3d1a00' }}
          >
            {closeMutation.isPending ? 'Cerrando...' : '🔒 Cerrar caja'}
          </button>
        </div>
      </Modal>

      <Modal
        open={txModal}
        onClose={() => setTxModal(false)}
        title="Registrar movimiento"
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Tipo de movimiento</label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.entries(TYPE_LABELS).map(([key, label]) => {
                const typedKey = key as TransactionType;

                return (
                  <button
                    key={typedKey}
                    onClick={() =>
                      setTxForm({
                        ...txForm,
                        type: typedKey,
                        productId: 0,
                        productQty: '1',
                        generateInvoice: false,
                      })
                    }
                    style={{
                      padding: '8px',
                      borderRadius: 8,
                      border: '2px solid',
                      borderColor:
                        txForm.type === typedKey ? TYPE_COLORS[typedKey] : '#e0d5cc',
                      background:
                        txForm.type === typedKey
                          ? `${TYPE_COLORS[typedKey]}15`
                          : '#fff',
                      color: txForm.type === typedKey ? TYPE_COLORS[typedKey] : '#555',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {txForm.type === 'VENTA' && (
            <>
              <div>
                <label style={labelStyle}>Producto (opcional)</label>
                <select
                  value={txForm.productId}
                  onChange={(e) =>
                    setTxForm({
                      ...txForm,
                      productId: Number(e.target.value),
                    })
                  }
                  style={inputStyle}
                >
                  <option value={0}>Sin producto — monto manual</option>

                  {products?.data?.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — ${Number(product.price).toLocaleString('es-CO')} c/u
                      {' '} (stock: {product.stock})
                    </option>
                  ))}
                </select>
              </div>

              {txForm.productId > 0 && (
                <div>
                  <label style={labelStyle}>Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={txForm.productQty}
                    onChange={(e) =>
                      setTxForm({
                        ...txForm,
                        productQty: e.target.value,
                      })
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    style={inputStyle}
                  />

                  {(() => {
                    const total = getProductTotal(products, txForm.productId, txForm.productQty);

                    if (total === null) return null;

                    return (
                      <div
                        style={{
                          fontSize: 13,
                          color: '#27ae60',
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        Total: ${total.toLocaleString('es-CO')} COP
                      </div>
                    );
                  })()}
                </div>
              )}

              {txForm.productId > 0 && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    color: '#3d1a00',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={txForm.generateInvoice}
                    onChange={(e) =>
                      setTxForm({
                        ...txForm,
                        generateInvoice: e.target.checked,
                      })
                    }
                  />
                  Generar factura con esta venta
                </label>
              )}
            </>
          )}

          {(txForm.type !== 'VENTA' || txForm.productId === 0) && (
            <div>
              <label style={labelStyle}>Monto (COP)</label>
              <input
              type="number"
              value={txForm.amount}
              onChange={(e) =>
                setTxForm({
                  ...txForm,
                  amount: e.target.value,
                })
              }
              onFocus={(e) => e.currentTarget.select()}
              inputMode="decimal"
              style={inputStyle}
              placeholder="Ej: 25000"
            />
            </div>
          )}

          <div>
            <label style={labelStyle}>Descripción</label>
            <input
              value={txForm.description}
              onChange={(e) =>
                setTxForm({
                  ...txForm,
                  description: e.target.value,
                })
              }
              style={inputStyle}
              placeholder={
                txForm.type === 'GASTO'
                  ? 'Ej: Pago arriendo local'
                  : txForm.type === 'VENTA'
                    ? 'Ej: Venta 5 helados'
                    : txForm.type === 'INGRESO'
                      ? 'Ej: Abono cliente'
                      : txForm.type === 'COTIZACION'
                        ? 'Ej: Retiro caja chica'
                        : 'Ej: Devolución pedido #12'
              }
            />
          </div>

          <div>
            <label style={labelStyle}>Referencia (opcional)</label>
            <input
              value={txForm.reference}
              onChange={(e) =>
                setTxForm({
                  ...txForm,
                  reference: e.target.value,
                })
              }
              style={inputStyle}
              placeholder="Ej: FAC-001, recibo, etc."
            />
          </div>

          <button
            onClick={handleSubmitTransaction}
            disabled={txMutation.isPending || !txForm.description}
            style={{
              ...btnPrimary,
              opacity: !txForm.description ? 0.5 : 1,
            }}
          >
            {txMutation.isPending ? 'Registrando...' : '✅ Registrar movimiento'}
          </button>
        </div>
      </Modal>

      {invoiceToShow && (
        <InvoiceModal invoice={invoiceToShow} onClose={() => setInvoiceToShow(null)} />
      )}
    </AppLayout>
  );
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#555',
  marginBottom: 4,
  fontWeight: 500,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #e0d5cc',
  fontSize: 14,
  boxSizing: 'border-box',
};

const btnPrimary: CSSProperties = {
  padding: '11px 20px',
  background: '#c0392b',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 15,
  width: '100%',
};
