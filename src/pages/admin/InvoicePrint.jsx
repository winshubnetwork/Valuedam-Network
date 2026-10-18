import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function formatMoney(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getInvoiceStatus(invoice) {
  if (!invoice) return 'draft';

  if (
    invoice.status !== 'paid' &&
    invoice.due_date &&
    new Date(invoice.due_date) < new Date() &&
    Number(invoice.balance_due || 0) > 0
  ) {
    return 'overdue';
  }

  return invoice.status || 'draft';
}

function getStatusLabel(status) {
  const labels = {
    draft: 'Draft',
    sent: 'Sent',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };

  return labels[status] || status;
}

export default function InvoicePrint() {
  const [searchParams] = useSearchParams();

  const invoiceId = searchParams.get('id');

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    if (!invoiceId) {
      setError('No invoice ID was provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: invoiceData, error: invoiceError } =
      await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

    if (invoiceError) {
      console.error(
        'Invoice loading error:',
        invoiceError
      );

      setError(invoiceError.message);
      setLoading(false);
      return;
    }

    const { data: itemData, error: itemError } =
      await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order', {
          ascending: true,
        });

    if (itemError) {
      console.error(
        'Invoice items loading error:',
        itemError
      );

      setError(itemError.message);
      setLoading(false);
      return;
    }

    setInvoice(invoiceData);
    setItems(itemData || []);
    setLoading(false);
  }

  function printInvoice() {
    window.print();
  }

  if (loading) {
    return (
      <div className="invoice-print-loading">
        Loading invoice...
      </div>
    );
  }

  if (error) {
    return (
      <div className="invoice-print-error">
        <div className="invoice-error-card">

          <h2>
            Unable to load invoice
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                '/admin/invoices')
            }
          >
            Back to Invoices
          </button>

        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="invoice-print-error">
        <div className="invoice-error-card">

          <h2>
            Invoice not found
          </h2>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                '/admin/invoices')
            }
          >
            Back to Invoices
          </button>

        </div>
      </div>
    );
  }

  const currency =
    invoice.currency || 'NGN';

  const subtotal =
    Number(invoice.subtotal || 0);

  const discount =
    Number(invoice.discount || 0);

  const tax =
    Number(invoice.tax || 0);

  const total =
    Number(invoice.total || 0);

  const amountPaid =
    Number(invoice.amount_paid || 0);

  const balanceDue =
    Number(
      invoice.balance_due ??
        Math.max(
          total - amountPaid,
          0
        )
    );

  const status =
    getInvoiceStatus(invoice);

  return (
    <>
      <style>
        {`

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #f1f5f9;
          }

          body {
            color: #111827;
            font-family:
              Inter,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          button {
            font-family: inherit;
          }

          /* ==========================================
             PAGE
             ========================================== */

          .invoice-print-page {
            min-height: 100vh;
            padding: 35px 20px 60px;
          }

          /* ==========================================
             TOOLBAR
             ========================================== */

          .invoice-toolbar {
            width: 100%;
            max-width: 920px;
            margin: 0 auto 18px;

            display: flex;
            justify-content: space-between;
            align-items: center;

            gap: 15px;
          }

          .invoice-toolbar button {
            border: 1px solid #d1d5db;
            background: #fff;
            color: #374151;

            padding: 10px 15px;

            border-radius: 9px;

            font-size: 13px;
            font-weight: 700;

            cursor: pointer;
          }

          .invoice-toolbar .print-button {
            background: #111827;
            color: #fff;
            border-color: #111827;
          }

          /* ==========================================
             PAPER
             ========================================== */

          .invoice-paper {
            width: 100%;
            max-width: 920px;

            margin: 0 auto;

            background: #fff;

            min-height: 1120px;

            padding: 55px;

            box-shadow:
              0 10px 40px
              rgba(15, 23, 42, 0.10);
          }

          /* ==========================================
             BRAND HEADER
             ========================================== */

          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;

            gap: 35px;

            padding-bottom: 30px;

            border-bottom: 2px solid #111827;
          }

          .company-block {
            min-width: 0;
            flex: 1;
          }

          .brand-lockup {
            display: flex;
            align-items: center;
            gap: 13px;
          }

          .brand-mark {
            width: 48px;
            height: 48px;

            flex: 0 0 48px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 12px;

            background: #111827;
            color: #fff;

            font-size: 18px;
            font-weight: 900;

            letter-spacing: -1px;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .brand-text {
            min-width: 0;
          }

          .company-name {
            margin: 0;

            color: #111827;

            font-size: 27px;
            line-height: 1.1;

            font-weight: 900;

            letter-spacing: -0.7px;
          }

          .company-tagline {
            margin: 5px 0 0;

            color: #64748b;

            font-size: 12px;
            font-weight: 600;
          }

          .company-contact {
            margin-top: 15px;

            color: #64748b;

            font-size: 11px;
            line-height: 1.7;
          }

          .invoice-heading {
            min-width: 230px;

            text-align: right;
          }

          .invoice-heading h1 {
            margin: 0;

            color: #111827;

            font-size: 37px;
            line-height: 1;

            font-weight: 900;

            letter-spacing: 1px;
          }

          .invoice-number {
            margin-top: 8px;

            color: #64748b;

            font-size: 13px;
            font-weight: 700;
          }

          .status-badge {
            display: inline-flex;

            margin-top: 13px;

            padding: 6px 12px;

            border-radius: 999px;

            font-size: 11px;
            font-weight: 800;

            text-transform: uppercase;
            letter-spacing: 0.5px;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .status-draft {
            background: #f1f5f9;
            color: #475569;
          }

          .status-sent {
            background: #eff6ff;
            color: #1d4ed8;
          }

          .status-partially_paid {
            background: #fff7ed;
            color: #c2410c;
          }

          .status-paid {
            background: #ecfdf5;
            color: #047857;
          }

          .status-overdue {
            background: #fff1f2;
            color: #be123c;
          }

          .status-cancelled {
            background: #f5f5f5;
            color: #737373;
          }

          /* ==========================================
             META
             ========================================== */

          .invoice-meta-grid {
            display: grid;

            grid-template-columns: 1fr 1fr;

            gap: 40px;

            padding: 30px 0;
          }

          .invoice-meta-title {
            margin-bottom: 9px;

            color: #94a3b8;

            font-size: 10px;
            font-weight: 850;

            letter-spacing: 1.3px;

            text-transform: uppercase;
          }

          .invoice-meta-name {
            margin: 0 0 4px;

            color: #111827;

            font-size: 15px;
            font-weight: 800;
          }

          .invoice-meta-text {
            margin: 0;

            color: #64748b;

            font-size: 12px;
            line-height: 1.7;
          }

          .invoice-reference {
            display: grid;

            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 15px;
          }

          .reference-box {
            padding: 12px 14px;

            background: #f8fafc;

            border: 1px solid #e2e8f0;

            border-radius: 8px;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .reference-label {
            display: block;

            margin-bottom: 4px;

            color: #94a3b8;

            font-size: 9px;
            font-weight: 800;

            letter-spacing: 1px;

            text-transform: uppercase;
          }

          .reference-value {
            color: #334155;

            font-size: 12px;
            font-weight: 700;
          }

          /* ==========================================
             DESCRIPTION
             ========================================== */

          .invoice-description {
            margin-bottom: 22px;

            color: #64748b;

            font-size: 12px;
            line-height: 1.7;
          }

          /* ==========================================
             ITEMS
             ========================================== */

          .invoice-table-wrapper {
            width: 100%;
          }

          .invoice-table {
            width: 100%;

            border-collapse: collapse;

            margin-top: 10px;
          }

          .invoice-table thead th {
            padding: 12px 10px;

            background: #111827;

            color: #fff;

            font-size: 10px;

            text-align: left;

            text-transform: uppercase;

            letter-spacing: 0.6px;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-table thead th:first-child {
            border-radius: 7px 0 0 7px;
          }

          .invoice-table thead th:last-child {
            border-radius: 0 7px 7px 0;
          }

          .invoice-table tbody td {
            padding: 15px 10px;

            border-bottom: 1px solid #e5e7eb;

            color: #334155;

            font-size: 12px;

            vertical-align: top;
          }

          .item-description {
            color: #111827;

            font-weight: 700;
          }

          .number-cell {
            text-align: right !important;

            white-space: nowrap;
          }

          /* ==========================================
             TOTALS
             ========================================== */

          .invoice-bottom {
            display: grid;

            grid-template-columns:
              1fr 300px;

            gap: 50px;

            margin-top: 30px;
          }

          .invoice-note-section {
            margin-bottom: 25px;
          }

          .invoice-note-title {
            margin: 0 0 8px;

            color: #111827;

            font-size: 11px;
            font-weight: 850;

            text-transform: uppercase;

            letter-spacing: 0.8px;
          }

          .invoice-note-text {
            margin: 0;

            color: #64748b;

            font-size: 11px;

            line-height: 1.7;

            white-space: pre-wrap;
          }

          .summary-row {
            display: flex;

            justify-content: space-between;

            gap: 20px;

            padding: 7px 0;

            color: #64748b;

            font-size: 12px;
          }

          .summary-row strong {
            color: #334155;
          }

          .summary-total {
            display: flex;

            justify-content: space-between;

            gap: 20px;

            padding: 15px 0;

            margin-top: 7px;

            border-top: 2px solid #111827;

            color: #111827;

            font-size: 16px;

            font-weight: 850;
          }

          .summary-paid {
            color: #047857 !important;
          }

          .summary-balance {
            margin-top: 9px;

            padding: 14px;

            background: #111827;

            color: #fff;

            border-radius: 9px;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .summary-balance-label {
            display: block;

            margin-bottom: 5px;

            font-size: 9px;
            font-weight: 800;

            letter-spacing: 1px;

            text-transform: uppercase;

            opacity: 0.7;
          }

          .summary-balance-amount {
            font-size: 19px;
            font-weight: 900;
          }

          /* ==========================================
             FOOTER
             ========================================== */

          .invoice-footer {
            margin-top: 55px;

            padding-top: 20px;

            border-top: 1px solid #e5e7eb;

            display: flex;

            justify-content: space-between;

            align-items: flex-end;

            gap: 25px;
          }

          .footer-message {
            color: #64748b;

            font-size: 11px;

            line-height: 1.7;
          }

          .footer-message strong {
            color: #334155;

            font-weight: 800;
          }

          .footer-url {
            display: inline-block;

            margin-top: 3px;

            color: #111827;

            font-size: 11px;

            font-weight: 800;

            text-decoration: none;
          }

          .footer-number {
            color: #94a3b8;

            font-size: 10px;

            text-align: right;

            line-height: 1.7;
          }

          /* ==========================================
             LOADING / ERROR
             ========================================== */

          .invoice-print-loading,
          .invoice-print-error {
            min-height: 100vh;

            display: flex;

            justify-content: center;

            align-items: center;

            padding: 25px;

            background: #f1f5f9;
          }

          .invoice-error-card {
            width: 100%;
            max-width: 480px;

            padding: 35px;

            background: #fff;

            border-radius: 16px;

            text-align: center;

            box-shadow:
              0 10px 40px
              rgba(15, 23, 42, 0.08);
          }

          .invoice-error-card h2 {
            margin: 0 0 10px;
          }

          .invoice-error-card p {
            color: #64748b;

            font-size: 14px;

            line-height: 1.6;
          }

          .invoice-error-card button {
            margin-top: 10px;

            border: 0;

            background: #111827;

            color: #fff;

            padding: 11px 18px;

            border-radius: 9px;

            font-weight: 700;

            cursor: pointer;
          }

          /* ==========================================
             MOBILE
             ========================================== */

          @media (max-width: 720px) {

            .invoice-print-page {
              padding: 15px 8px 30px;
            }

            .invoice-paper {
              padding: 28px 20px;

              min-height: auto;
            }

            .invoice-header {
              flex-direction: column;

              gap: 25px;
            }

            .invoice-heading {
              text-align: left;
            }

            .invoice-heading h1 {
              font-size: 31px;
            }

            .invoice-meta-grid {
              grid-template-columns: 1fr;

              gap: 25px;
            }

            .invoice-reference {
              grid-template-columns: 1fr;
            }

            .invoice-bottom {
              grid-template-columns: 1fr;

              gap: 25px;
            }

            .invoice-table-wrapper {
              overflow-x: auto;
            }

            .invoice-table {
              min-width: 650px;
            }

            .invoice-footer {
              flex-direction: column;

              align-items: flex-start;
            }

            .footer-number {
              text-align: left;
            }
          }

          /* ==========================================
             PRINT
             ========================================== */

          @media print {

            @page {
              size: A4;

              margin: 10mm;
            }

            html,
            body {
              background: #fff !important;
            }

            /*
              IMPORTANT:
              Do NOT hide generic header/footer elements here.
              The invoice itself uses a header and footer.
            */

            .invoice-toolbar {
              display: none !important;
            }

            /*
              Hide only known application/admin UI wrappers.
              This prevents the dashboard menu from appearing
              without hiding the invoice header/footer.
            */

            .admin-sidebar,
            .admin-header,
            .admin-topbar,
            .admin-navigation,
            .admin-shell-header,
            .admin-shell-sidebar,
            .site-header,
            .site-footer,
            .main-navigation {
              display: none !important;
            }

            .invoice-print-page {
              padding: 0 !important;

              margin: 0 !important;

              min-height: auto !important;

              background: #fff !important;
            }

            .invoice-paper {
              display: block !important;

              width: 100% !important;

              max-width: none !important;

              margin: 0 !important;

              padding: 20px !important;

              min-height: auto !important;

              background: #fff !important;

              box-shadow: none !important;
            }

            /*
              Keep the actual invoice header visible.
            */

            .invoice-header {
              display: flex !important;

              visibility: visible !important;

              opacity: 1 !important;
            }

            .brand-lockup,
            .brand-mark,
            .brand-text,
            .company-name,
            .company-tagline,
            .company-contact,
            .invoice-heading,
            .invoice-heading h1,
            .invoice-number,
            .status-badge {
              visibility: visible !important;

              opacity: 1 !important;
            }

            .brand-mark {
              background: #111827 !important;

              color: #fff !important;

              -webkit-print-color-adjust: exact !important;

              print-color-adjust: exact !important;
            }

            .company-name {
              color: #111827 !important;
            }

            .company-tagline,
            .company-contact {
              color: #64748b !important;
            }

            .invoice-heading h1 {
              color: #111827 !important;
            }

            .invoice-number {
              color: #64748b !important;
            }

            /*
              Keep the invoice footer visible.
            */

            .invoice-footer {
              display: flex !important;

              visibility: visible !important;

              opacity: 1 !important;

              border-top: 1px solid #e5e7eb !important;
            }

            .footer-message,
            .footer-url,
            .footer-number {
              visibility: visible !important;

              opacity: 1 !important;
            }

            .footer-message {
              color: #64748b !important;
            }

            .footer-message strong,
            .footer-url {
              color: #111827 !important;
            }

            .footer-number {
              color: #64748b !important;
            }

            /*
              Keep invoice backgrounds/colors in PDF.
            */

            .status-badge,
            .reference-box,
            .invoice-table thead th,
            .summary-balance {
              -webkit-print-color-adjust: exact !important;

              print-color-adjust: exact !important;
            }

            .invoice-table thead th {
              background: #111827 !important;

              color: #fff !important;
            }

            .summary-balance {
              background: #111827 !important;

              color: #fff !important;
            }

            .reference-box {
              background: #f8fafc !important;
            }

            .invoice-table {
              page-break-inside: auto;
            }

            .invoice-table tr {
              page-break-inside: avoid;

              page-break-after: auto;
            }

            .invoice-header,
            .invoice-meta-grid,
            .invoice-bottom,
            .invoice-footer {
              page-break-inside: avoid;
            }

            /*
              Prevent accidental browser-generated
              page content from interfering with the invoice.
            */

            a {
              color: inherit !important;

              text-decoration: none !important;
            }
          }

        `}
      </style>

      <div className="invoice-print-page">

        {/* SCREEN-ONLY TOOLBAR */}

        <div className="invoice-toolbar">

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                '/admin/invoices')
            }
          >
            ← Back to Invoices
          </button>

          <button
            type="button"
            className="print-button"
            onClick={printInvoice}
          >
            🖨 Print / Save PDF
          </button>

        </div>

        {/* ==========================================
            INVOICE PAPER
            ========================================== */}

        <main className="invoice-paper">

          {/* ========================================
              VALUE DAM NETWORK BRAND
              ======================================== */}

          <header className="invoice-header">

            <div className="company-block">

              <div className="brand-lockup">

                <div className="brand-mark">
                  VD
                </div>

                <div className="brand-text">

                  <h2 className="company-name">
                    ValueDam Network
                  </h2>

                  <p className="company-tagline">
                    Digital Services & Business Solutions
                  </p>

                </div>

              </div>

              <div className="company-contact">

                Professional digital and business
                support services.

              </div>

            </div>

            <div className="invoice-heading">

              <h1>
                INVOICE
              </h1>

              <div className="invoice-number">
                #{invoice.invoice_number}
              </div>

              <span
                className={`status-badge status-${status}`}
              >
                {getStatusLabel(status)}
              </span>

            </div>

          </header>

          {/* ========================================
              CUSTOMER + INVOICE DETAILS
              ======================================== */}

          <section className="invoice-meta-grid">

            <div>

              <div className="invoice-meta-title">
                Bill To
              </div>

              <h3 className="invoice-meta-name">
                {invoice.customer_name ||
                  'Customer'}
              </h3>

              <p className="invoice-meta-text">

                {invoice.company_name && (
                  <>
                    {invoice.company_name}
                    <br />
                  </>
                )}

                {invoice.customer_email && (
                  <>
                    {invoice.customer_email}
                    <br />
                  </>
                )}

                {invoice.customer_phone && (
                  <>
                    {invoice.customer_phone}
                    <br />
                  </>
                )}

                {invoice.customer_whatsapp && (
                  <>
                    WhatsApp:{' '}
                    {invoice.customer_whatsapp}
                  </>
                )}

              </p>

            </div>

            <div>

              <div className="invoice-meta-title">
                Invoice Details
              </div>

              <div className="invoice-reference">

                <div className="reference-box">

                  <span className="reference-label">
                    Issue Date
                  </span>

                  <span className="reference-value">
                    {formatDate(
                      invoice.issue_date
                    )}
                  </span>

                </div>

                <div className="reference-box">

                  <span className="reference-label">
                    Due Date
                  </span>

                  <span className="reference-value">
                    {formatDate(
                      invoice.due_date
                    )}
                  </span>

                </div>

                {invoice.job_id && (
                  <div className="reference-box">

                    <span className="reference-label">
                      Job
                    </span>

                    <span className="reference-value">
                      Linked Job
                    </span>

                  </div>
                )}

                {invoice.quote_id && (
                  <div className="reference-box">

                    <span className="reference-label">
                      Quote
                    </span>

                    <span className="reference-value">
                      Linked Quote
                    </span>

                  </div>
                )}

              </div>

            </div>

          </section>

          {/* DESCRIPTION */}

          {invoice.description && (
            <div className="invoice-description">
              {invoice.description}
            </div>
          )}

          {/* ========================================
              ITEMS
              ======================================== */}

          <section>

            <div className="invoice-table-wrapper">

              <table className="invoice-table">

                <thead>

                  <tr>

                    <th
                      style={{
                        width: '48%',
                      }}
                    >
                      Description
                    </th>

                    <th className="number-cell">
                      Qty
                    </th>

                    <th className="number-cell">
                      Unit Price
                    </th>

                    <th className="number-cell">
                      Amount
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {items.length === 0 ? (

                    <tr>

                      <td
                        colSpan="4"
                        style={{
                          textAlign: 'center',
                          padding: '30px',
                          color: '#94a3b8',
                        }}
                      >
                        No invoice items.
                      </td>

                    </tr>

                  ) : (

                    items.map((item) => (

                      <tr key={item.id}>

                        <td>

                          <div className="item-description">
                            {item.description}
                          </div>

                        </td>

                        <td className="number-cell">

                          {Number(
                            item.quantity || 0
                          ).toLocaleString(
                            'en-NG'
                          )}

                        </td>

                        <td className="number-cell">

                          {formatMoney(
                            item.unit_price,
                            currency
                          )}

                        </td>

                        <td
                          className="number-cell"
                          style={{
                            fontWeight: 800,
                            color: '#111827',
                          }}
                        >

                          {formatMoney(
                            item.amount,
                            currency
                          )}

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </section>

          {/* ========================================
              TOTALS + CUSTOMER NOTES
              ======================================== */}

          <section className="invoice-bottom">

            <div>

              {invoice.customer_notes && (
                <div className="invoice-note-section">

                  <h3 className="invoice-note-title">
                    Notes
                  </h3>

                  <p className="invoice-note-text">
                    {invoice.customer_notes}
                  </p>

                </div>
              )}

              {invoice.terms && (
                <div className="invoice-note-section">

                  <h3 className="invoice-note-title">
                    Terms & Conditions
                  </h3>

                  <p className="invoice-note-text">
                    {invoice.terms}
                  </p>

                </div>
              )}

            </div>

            <div>

              <div className="summary-row">

                <span>
                  Subtotal
                </span>

                <strong>
                  {formatMoney(
                    subtotal,
                    currency
                  )}
                </strong>

              </div>

              {discount > 0 && (
                <div className="summary-row">

                  <span>
                    Discount
                  </span>

                  <strong>
                    -
                    {formatMoney(
                      discount,
                      currency
                    )}
                  </strong>

                </div>
              )}

              {tax > 0 && (
                <div className="summary-row">

                  <span>
                    Tax
                  </span>

                  <strong>
                    {formatMoney(
                      tax,
                      currency
                    )}
                  </strong>

                </div>
              )}

              <div className="summary-total">

                <span>
                  Total
                </span>

                <span>
                  {formatMoney(
                    total,
                    currency
                  )}
                </span>

              </div>

              <div className="summary-row">

                <span>
                  Amount Paid
                </span>

                <strong className="summary-paid">
                  {formatMoney(
                    amountPaid,
                    currency
                  )}
                </strong>

              </div>

              <div className="summary-balance">

                <span className="summary-balance-label">
                  Balance Due
                </span>

                <div className="summary-balance-amount">
                  {formatMoney(
                    balanceDue,
                    currency
                  )}
                </div>

              </div>

            </div>

          </section>

          {/* ========================================
              CUSTOMER-FACING FOOTER
              ======================================== */}

          <footer className="invoice-footer">

            <div className="footer-message">

              <strong>
                Thank you for choosing ValueDam Network.
              </strong>

              <br />

              We appreciate your business.

              <br />

              <a
                href="https://valuedam.com.ng"
                className="footer-url"
              >
                valuedam.com.ng
              </a>

            </div>

            <div className="footer-number">

              Invoice #{invoice.invoice_number}

              <br />

              Generated{' '}
              {formatDate(new Date())}

            </div>

          </footer>

        </main>

      </div>
    </>
  );
}