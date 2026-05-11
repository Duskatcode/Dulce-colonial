import { useMemo } from 'react';
import toast from 'react-hot-toast';
import type { Invoice } from '../../types/invoice.types';

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const clean = (value: unknown, fallback = 'No registrado') => {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 'undefined' ||
    value === 'null' ||
    value === 'NaN' ||
    value === '[object Object]'
  ) {
    return fallback;
  }

  return String(value);
};

const money = (value: unknown) => {
  const numeric = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
};

const escapeHtml = (value: unknown) =>
  clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export default function InvoiceModal({ invoice, onClose }: Props) {
  const issuedAt = useMemo(() => {
    const date = new Date(invoice.createdAt);
    return Number.isNaN(date.getTime()) ? 'No registrado' : dateFormatter.format(date);
  }, [invoice.createdAt]);

  const items = invoice.items ?? [];
  const subtotal = Number(invoice.subtotal ?? invoice.total ?? 0);
  const discount = Number(invoice.discount ?? 0);
  const tax = Number(invoice.tax ?? 0);
  const total = Number(invoice.total ?? subtotal - discount + tax);
  const customerName = clean(invoice.customerName, 'Consumidor final');
  const customerDocument = clean(invoice.customerDocument, 'No registrado');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=860,height=1100');

    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión. Revisa el bloqueador de ventanas.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableHtml(invoice));
    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      try {
        printWindow.print();
      } catch {
        toast.error('No se pudo imprimir la factura.');
      }
    }, 250);
  };

  return (
    <div className="dc-invoice-overlay" role="dialog" aria-modal="true">
      <div className="dc-invoice-card">
        <div id="invoice-document" className="dc-invoice-document">
          <header className="dc-invoice-document-header">
            <div>
              <div className="dc-invoice-brand-row">
                <span className="dc-invoice-brand-mark">
                  <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
                    bakery_dining
                  </span>
                </span>

                <div>
                  <div className="dc-invoice-brand">Dulce Colonial</div>
                  <div className="dc-invoice-document-subtitle">Recibo interno de venta</div>
                </div>
              </div>

              <div className="dc-invoice-legal">
                Comprobante interno. No corresponde a factura electrónica DIAN.
              </div>
            </div>

            <div className="dc-invoice-number-box">
              <div className="dc-invoice-muted">Número</div>
              <strong>{clean(invoice.number)}</strong>

              <div className="dc-invoice-muted" style={{ marginTop: 10 }}>
                Fecha y hora
              </div>
              <span>{issuedAt}</span>
            </div>
          </header>

          <section className="dc-invoice-info-grid">
            <InfoBlock
              title="Datos del negocio"
              rows={[
                ['Nombre', 'Dulce Colonial'],
                ['Identificación', 'No registrado'],
                ['Dirección', 'No registrado'],
                ['Teléfono / correo', 'No registrado'],
              ]}
            />

            <InfoBlock
              title="Datos del cliente"
              rows={[
                ['Cliente', customerName],
                ['Documento', customerDocument],
              ]}
            />

            <InfoBlock
              title="Caja"
              rows={[
                ['Cajero', clean(invoice.userName)],
                ['Método de pago', clean(invoice.paymentMethod, 'No aplica')],
                ['Referencia', clean(invoice.reference ?? invoice.number, 'No aplica')],
              ]}
            />
          </section>

          <section style={{ marginTop: 22 }}>
            <h3 className="dc-invoice-section-title">Productos</h3>

            <table className="dc-invoice-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: 'center' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Precio unitario</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Sin productos registrados</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{clean(item.productName ?? item.description)}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{money(item.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}>{money(item.subtotal ?? item.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="dc-invoice-totals">
            <TotalRow label="Subtotal" value={money(subtotal)} />
            <TotalRow label="Descuento" value={discount > 0 ? money(discount) : 'No aplica'} />
            <TotalRow label="Impuesto" value={tax > 0 ? money(tax) : 'No aplica'} />
            <div className="dc-invoice-grand-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
          </section>

          <footer className="dc-invoice-footer">
            <div>{clean(invoice.notes, 'Gracias por su compra.')}</div>
            <strong>Documento generado por Dulce Colonial.</strong>
          </footer>
        </div>

        <div className="dc-invoice-actions">
          <button className="dc-button-secondary" type="button" onClick={onClose} style={{ padding: '11px 16px' }}>
            Cerrar
          </button>

          <button className="dc-button-primary" type="button" onClick={handlePrint} style={{ padding: '11px 16px' }}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="dc-invoice-info-block">
      <h3 className="dc-invoice-section-title">{title}</h3>

      {rows.map(([label, value]) => (
        <div key={label} className="dc-invoice-info-row">
          <span className="dc-invoice-muted">{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dc-invoice-total-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildPrintableHtml(invoice: Invoice) {
  const date = new Date(invoice.createdAt);
  const issuedAt = Number.isNaN(date.getTime()) ? 'No registrado' : dateFormatter.format(date);
  const items = invoice.items ?? [];
  const subtotal = Number(invoice.subtotal ?? invoice.total ?? 0);
  const discount = Number(invoice.discount ?? 0);
  const tax = Number(invoice.tax ?? 0);
  const total = Number(invoice.total ?? subtotal - discount + tax);

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName ?? item.description)}</td>
          <td class="center">${escapeHtml(item.quantity)}</td>
          <td class="right">${escapeHtml(money(item.unitPrice))}</td>
          <td class="right">${escapeHtml(money(item.subtotal ?? item.total))}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(invoice.number)} - Dulce Colonial</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; color: #1c1c18; background: #fff; }
          .invoice { width: 100%; max-width: 760px; margin: 0 auto; border: 1px solid #d8c1c4; padding: 28px; }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #400019; padding-bottom: 18px; }
          .brand { font-size: 30px; font-weight: 800; color: #400019; }
          .subtitle { font-size: 15px; font-weight: 700; color: #a04100; margin-top: 4px; }
          .note { margin-top: 8px; font-size: 11px; color: #534246; }
          .number { min-width: 210px; border: 1px solid #d8c1c4; padding: 12px; text-align: right; }
          .muted { color: #534246; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
          .block { border: 1px solid #d8c1c4; padding: 12px; min-height: 112px; }
          h3 { margin: 0 0 10px; font-size: 13px; color: #400019; }
          .info-row { margin-bottom: 8px; }
          .info-row strong { display: block; font-size: 13px; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #400019; color: #fff; padding: 9px; font-size: 12px; text-align: left; }
          td { border-bottom: 1px solid #d8c1c4; padding: 9px; font-size: 12px; }
          .right { text-align: right; }
          .center { text-align: center; }
          .totals { width: 310px; margin: 18px 0 0 auto; border: 1px solid #d8c1c4; }
          .total-row { display: flex; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid #d8c1c4; }
          .grand { display: flex; justify-content: space-between; padding: 12px; background: #400019; color: #fff; font-size: 18px; font-weight: 800; }
          .footer { margin-top: 22px; padding-top: 14px; border-top: 1px solid #d8c1c4; text-align: center; color: #534246; font-size: 12px; }
          @media print { .invoice { border: none; padding: 0; } }
        </style>
      </head>
      <body>
        <main class="invoice">
          <header class="header">
            <div>
              <div class="brand">Dulce Colonial</div>
              <div class="subtitle">Recibo interno de venta</div>
              <div class="note">Comprobante interno. No corresponde a factura electrónica DIAN.</div>
            </div>

            <div class="number">
              <div class="muted">Número</div>
              <strong>${escapeHtml(invoice.number)}</strong>
              <div class="muted" style="margin-top: 8px;">Fecha y hora</div>
              <span>${escapeHtml(issuedAt)}</span>
            </div>
          </header>

          <section class="grid">
            <div class="block">
              <h3>Datos del negocio</h3>
              <div class="info-row"><span class="muted">Nombre</span><strong>Dulce Colonial</strong></div>
              <div class="info-row"><span class="muted">Identificación</span><strong>No registrado</strong></div>
              <div class="info-row"><span class="muted">Dirección</span><strong>No registrado</strong></div>
            </div>

            <div class="block">
              <h3>Datos del cliente</h3>
              <div class="info-row"><span class="muted">Cliente</span><strong>${escapeHtml(clean(invoice.customerName, 'Consumidor final'))}</strong></div>
              <div class="info-row"><span class="muted">Documento</span><strong>${escapeHtml(clean(invoice.customerDocument))}</strong></div>
            </div>

            <div class="block">
              <h3>Caja</h3>
              <div class="info-row"><span class="muted">Cajero</span><strong>${escapeHtml(clean(invoice.userName))}</strong></div>
              <div class="info-row"><span class="muted">Método de pago</span><strong>${escapeHtml(clean(invoice.paymentMethod, 'No aplica'))}</strong></div>
              <div class="info-row"><span class="muted">Referencia</span><strong>${escapeHtml(clean(invoice.reference ?? invoice.number, 'No aplica'))}</strong></div>
            </div>
          </section>

          <section style="margin-top: 18px;">
            <h3>Productos</h3>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="center">Cantidad</th>
                  <th class="right">Precio unitario</th>
                  <th class="right">Subtotal</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="4">Sin productos registrados</td></tr>'}</tbody>
            </table>
          </section>

          <section class="totals">
            <div class="total-row"><span>Subtotal</span><strong>${escapeHtml(money(subtotal))}</strong></div>
            <div class="total-row"><span>Descuento</span><strong>${discount > 0 ? escapeHtml(money(discount)) : 'No aplica'}</strong></div>
            <div class="total-row"><span>Impuesto</span><strong>${tax > 0 ? escapeHtml(money(tax)) : 'No aplica'}</strong></div>
            <div class="grand"><span>Total</span><strong>${escapeHtml(money(total))}</strong></div>
          </section>

          <footer class="footer">
            <div>${escapeHtml(clean(invoice.notes, 'Gracias por su compra.'))}</div>
            <strong>Documento generado por Dulce Colonial.</strong>
          </footer>
        </main>
      </body>
    </html>
  `;
}
