import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function QuotePrint() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const quoteId = searchParams.get('id');

  const [quote, setQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!quoteId) {
      setError('No quote was selected.');
      setLoading(false);
      return;
    }

    loadQuote();
  }, [quoteId]);

  async function loadQuote() {
    setLoading(true);
    setError('');

    const { data: quoteData, error: quoteError } =
      await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .maybeSingle();

    if (quoteError) {
      setError(quoteError.message);
      setLoading(false);
      return;
    }

    if (!quoteData) {
      setError('Quote not found.');
      setLoading(false);
      return;
    }

    const { data: itemData, error: itemError } =
      await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('sort_order', { ascending: true });

    if (itemError) {
      setError(itemError.message);
      setLoading(false);
      return;
    }

    setQuote(quoteData);
    setItems(itemData || []);
    setLoading(false);
  }

  function money(value) {
    const amount = Number(value || 0);

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: quote?.currency || 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  function formatDate(value) {
    if (!value) return '—';

    return new Intl.DateTimeFormat('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(value));
  }

  const calculatedSubtotal = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );
  }, [items]);

  const subtotal =
    quote?.subtotal !== null &&
    quote?.subtotal !== undefined
      ? Number(quote.subtotal)
      : calculatedSubtotal;

  const discount = Number(quote?.discount || 0);
  const tax = Number(quote?.tax || 0);

  const total =
    quote?.total !== null &&
    quote?.total !== undefined
      ? Number(quote.total)
      : subtotal - discount + tax;

  if (loading) {
    return (
      <div className="quote-print-loading">
        <div className="quote-print-loading-card">

          <div className="quote-loading-spinner" />

          <h2>
            Loading quotation…
          </h2>

          <p>
            Please wait while the quote is prepared.
          </p>

        </div>

        <style>{`
          .quote-print-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            background: #f4f7fb;
            font-family: Arial, sans-serif;
          }

          .quote-print-loading-card {
            background: #fff;
            padding: 40px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 15px 45px rgba(0,0,0,.08);
          }

          .quote-loading-spinner {
            width: 34px;
            height: 34px;
            border: 3px solid #e5e7eb;
            border-top-color: #111827;
            border-radius: 50%;
            margin: 0 auto 18px;
            animation: quoteSpin .8s linear infinite;
          }

          @keyframes quoteSpin {
            to {
              transform: rotate(360deg);
            }
          }

          .quote-print-loading-card h2 {
            margin: 0 0 8px;
          }

          .quote-print-loading-card p {
            margin: 0;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="quote-print-loading">

        <div className="quote-print-loading-card">

          <h2>
            Unable to load quote
          </h2>

          <p>
            {error || 'The requested quote could not be found.'}
          </p>

          <button
            type="button"
            onClick={() => navigate('/admin/quotes')}
            className="quote-back-button"
          >
            ← Back to Quotes
          </button>

        </div>

        <style>{`
          .quote-back-button {
            margin-top: 22px;
            border: 0;
            background: #111827;
            color: #fff;
            padding: 12px 18px;
            border-radius: 9px;
            cursor: pointer;
            font-weight: 600;
          }
        `}</style>

      </div>
    );
  }

  return (
    <div className="quote-print-page">

      {/* PRINT CONTROLS */}

      <div className="quote-print-toolbar no-print">

        <button
          type="button"
          className="quote-toolbar-button secondary"
          onClick={() => navigate('/admin/quotes')}
        >
          ← Back to Quotes
        </button>

        <div className="quote-toolbar-right">

          <button
            type="button"
            className="quote-toolbar-button primary"
            onClick={() => window.print()}
          >
            🖨 Print / Save PDF
          </button>

        </div>

      </div>

      {/* QUOTE DOCUMENT */}

      <article className="quote-document">

        {/* HEADER */}

        <header className="quote-header">

          <div className="quote-brand">

            <div className="quote-logo">
              V
            </div>

            <div>

              <h1>
                ValueDam
              </h1>

              <p>
                NETWORK
              </p>

              <span>
                Business & Digital Services
              </span>

            </div>

          </div>

          <div className="quote-heading">

            <span>
              PROFESSIONAL QUOTATION
            </span>

            <h2>
              {quote.quote_number}
            </h2>

            <div
              className={`quote-status quote-status-${quote.status}`}
            >
              {quote.status || 'draft'}
            </div>

          </div>

        </header>

        <div className="quote-header-line" />

        {/* CUSTOMER / QUOTE INFORMATION */}

        <section className="quote-meta">

          <div className="quote-meta-box">

            <span className="quote-meta-label">
              QUOTE FOR
            </span>

            <strong>
              {quote.customer_name || 'Customer'}
            </strong>

            {quote.company_name && (
              <span>
                {quote.company_name}
              </span>
            )}

            {quote.customer_email && (
              <span>
                {quote.customer_email}
              </span>
            )}

            {quote.customer_phone && (
              <span>
                {quote.customer_phone}
              </span>
            )}

            {quote.customer_whatsapp && (
              <span>
                WhatsApp: {quote.customer_whatsapp}
              </span>
            )}

          </div>

          <div className="quote-meta-box quote-meta-right">

            <div>
              <span className="quote-meta-label">
                ISSUE DATE
              </span>

              <strong>
                {formatDate(quote.issue_date)}
              </strong>
            </div>

            <div>
              <span className="quote-meta-label">
                VALID UNTIL
              </span>

              <strong>
                {formatDate(quote.expiry_date)}
              </strong>
            </div>

            <div>
              <span className="quote-meta-label">
                CURRENCY
              </span>

              <strong>
                {quote.currency || 'NGN'}
              </strong>
            </div>

          </div>

        </section>

        {/* QUOTE TITLE */}

        <section className="quote-introduction">

          <h3>
            {quote.title || 'Service Quote'}
          </h3>

          {quote.description && (
            <p>
              {quote.description}
            </p>
          )}

        </section>

        {/* ITEMS */}

        <section className="quote-items-section">

          <table className="quote-items-table">

            <thead>

              <tr>

                <th className="quote-item-number">
                  #
                </th>

                <th>
                  DESCRIPTION
                </th>

                <th className="quote-item-qty">
                  QTY
                </th>

                <th className="quote-item-price">
                  UNIT PRICE
                </th>

                <th className="quote-item-total">
                  AMOUNT
                </th>

              </tr>

            </thead>

            <tbody>

              {items.length === 0 ? (

                <tr>

                  <td
                    colSpan="5"
                    className="quote-empty-items"
                  >
                    No quotation items.
                  </td>

                </tr>

              ) : (

                items.map((item, index) => (

                  <tr key={item.id || index}>

                    <td className="quote-item-number">
                      {index + 1}
                    </td>

                    <td>
                      <strong>
                        {item.description}
                      </strong>
                    </td>

                    <td className="quote-item-qty">
                      {Number(item.quantity || 0)}
                    </td>

                    <td className="quote-item-price">
                      {money(item.unit_price)}
                    </td>

                    <td className="quote-item-total">
                      {money(item.amount)}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </section>

        {/* TOTALS + NOTES */}

        <section className="quote-bottom-grid">

          <div className="quote-notes-column">

            {quote.customer_notes && (

              <div className="quote-note-box">

                <h4>
                  Notes for Customer
                </h4>

                <p>
                  {quote.customer_notes}
                </p>

              </div>

            )}

            {quote.terms && (

              <div className="quote-note-box">

                <h4>
                  Terms & Conditions
                </h4>

                <div className="quote-terms">
                  {quote.terms}
                </div>

              </div>

            )}

          </div>

          <div className="quote-summary">

            <div className="quote-summary-row">

              <span>
                Subtotal
              </span>

              <strong>
                {money(subtotal)}
              </strong>

            </div>

            {discount > 0 && (

              <div className="quote-summary-row">

                <span>
                  Discount
                </span>

                <strong>
                  − {money(discount)}
                </strong>

              </div>

            )}

            {tax > 0 && (

              <div className="quote-summary-row">

                <span>
                  Tax / Additional Charge
                </span>

                <strong>
                  {money(tax)}
                </strong>

              </div>

            )}

            <div className="quote-summary-total">

              <span>
                TOTAL
              </span>

              <strong>
                {money(total)}
              </strong>

            </div>

          </div>

        </section>

        {/* FOOTER */}

        <footer className="quote-footer">

          <div>

            <strong>
              ValueDam Network
            </strong>

            <span>
              Connecting businesses with practical
              digital and business solutions.
            </span>

          </div>

          <div className="quote-footer-contact">

            <span>
              valuedam.com.ng
            </span>

            <span>
              Professional Business & Digital Services
            </span>

          </div>

        </footer>

        <div className="quote-thank-you">
          Thank you for considering ValueDam Network.
        </div>

      </article>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .quote-print-page {
          min-height: 100vh;
          background: #eef2f7;
          padding: 28px;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
          color: #172033;
        }

        .quote-print-toolbar {
          max-width: 920px;
          margin: 0 auto 20px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .quote-toolbar-right {
          display: flex;
          gap: 10px;
        }

        .quote-toolbar-button {
          border: 0;
          border-radius: 9px;
          padding: 12px 17px;
          font-weight: 700;
          cursor: pointer;
          font-size: 14px;
        }

        .quote-toolbar-button.secondary {
          background: #fff;
          color: #172033;
          border: 1px solid #dce2ea;
        }

        .quote-toolbar-button.primary {
          background: #172033;
          color: #fff;
        }

        .quote-toolbar-button:hover {
          transform: translateY(-1px);
        }

        .quote-document {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
          background: #fff;
          min-height: 1120px;
          padding: 58px 64px;
          box-shadow:
            0 18px 55px rgba(15, 23, 42, .10);
        }

        .quote-header {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          align-items: flex-start;
        }

        .quote-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .quote-logo {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #172033;
          color: #fff;
          border-radius: 13px;
          font-size: 29px;
          font-weight: 900;
        }

        .quote-brand h1 {
          margin: 0;
          font-size: 25px;
          line-height: 1;
          letter-spacing: -.7px;
        }

        .quote-brand p {
          margin: 3px 0 2px;
          font-size: 10px;
          letter-spacing: 4px;
          font-weight: 800;
        }

        .quote-brand span {
          display: block;
          color: #6b7280;
          font-size: 11px;
        }

        .quote-heading {
          text-align: right;
        }

        .quote-heading > span {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
          color: #6b7280;
        }

        .quote-heading h2 {
          margin: 7px 0 9px;
          font-size: 25px;
          letter-spacing: -.5px;
        }

        .quote-status {
          display: inline-flex;
          padding: 5px 11px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .6px;
          background: #eef2f7;
          color: #475569;
        }

        .quote-status-accepted {
          background: #dcfce7;
          color: #166534;
        }

        .quote-status-sent {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .quote-status-viewed {
          background: #ede9fe;
          color: #6d28d9;
        }

        .quote-status-rejected,
        .quote-status-cancelled {
          background: #fee2e2;
          color: #b91c1c;
        }

        .quote-status-expired {
          background: #fef3c7;
          color: #92400e;
        }

        .quote-header-line {
          height: 2px;
          background: #172033;
          margin: 28px 0 30px;
        }

        .quote-meta {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 50px;
          padding-bottom: 28px;
          border-bottom: 1px solid #e5e7eb;
        }

        .quote-meta-box {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 12px;
          color: #596273;
        }

        .quote-meta-box strong {
          color: #172033;
          font-size: 14px;
        }

        .quote-meta-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: #8a94a6;
          margin-bottom: 3px;
        }

        .quote-meta-right {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-content: start;
        }

        .quote-meta-right > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .quote-introduction {
          padding: 27px 0 23px;
        }

        .quote-introduction h3 {
          margin: 0 0 8px;
          font-size: 20px;
          letter-spacing: -.3px;
        }

        .quote-introduction p {
          margin: 0;
          color: #687386;
          font-size: 12px;
          line-height: 1.7;
          max-width: 680px;
          white-space: pre-line;
        }

        .quote-items-section {
          margin-top: 5px;
        }

        .quote-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .quote-items-table thead {
          background: #172033;
          color: #fff;
        }

        .quote-items-table th {
          padding: 12px 11px;
          text-align: left;
          font-size: 9px;
          letter-spacing: .9px;
          font-weight: 800;
        }

        .quote-items-table td {
          padding: 14px 11px;
          border-bottom: 1px solid #e8ebf0;
          vertical-align: middle;
        }

        .quote-items-table tbody tr:last-child td {
          border-bottom: 1px solid #cfd5df;
        }

        .quote-item-number {
          width: 42px;
          text-align: center !important;
          color: #7b8494;
        }

        .quote-item-qty {
          width: 65px;
          text-align: center !important;
        }

        .quote-item-price,
        .quote-item-total {
          width: 125px;
          text-align: right !important;
          white-space: nowrap;
        }

        .quote-item-total {
          font-weight: 800;
        }

        .quote-empty-items {
          text-align: center;
          padding: 28px !important;
          color: #8a94a6;
        }

        .quote-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 45px;
          margin-top: 30px;
          align-items: start;
        }

        .quote-notes-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .quote-note-box {
          border-left: 3px solid #172033;
          padding: 2px 0 2px 15px;
        }

        .quote-note-box h4 {
          margin: 0 0 7px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .8px;
        }

        .quote-note-box p,
        .quote-terms {
          margin: 0;
          color: #697386;
          font-size: 11px;
          line-height: 1.7;
          white-space: pre-line;
        }

        .quote-summary {
          border: 1px solid #e1e6ed;
          border-radius: 10px;
          padding: 18px;
        }

        .quote-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 7px 0;
          font-size: 11px;
          color: #687386;
        }

        .quote-summary-row strong {
          color: #172033;
          font-weight: 700;
        }

        .quote-summary-total {
          border-top: 2px solid #172033;
          margin-top: 10px;
          padding-top: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .quote-summary-total span {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .8px;
        }

        .quote-summary-total strong {
          font-size: 20px;
          letter-spacing: -.4px;
        }

        .quote-footer {
          margin-top: 65px;
          padding-top: 20px;
          border-top: 1px solid #dfe4eb;
          display: flex;
          justify-content: space-between;
          gap: 30px;
          color: #70798a;
          font-size: 10px;
          line-height: 1.6;
        }

        .quote-footer > div {
          display: flex;
          flex-direction: column;
        }

        .quote-footer strong {
          color: #172033;
          font-size: 11px;
          margin-bottom: 2px;
        }

        .quote-footer-contact {
          text-align: right;
        }

        .quote-thank-you {
          margin-top: 28px;
          text-align: center;
          font-size: 10px;
          color: #8a94a6;
        }

        @media (max-width: 760px) {

          .quote-print-page {
            padding: 12px;
          }

          .quote-document {
            padding: 35px 25px;
          }

          .quote-header {
            flex-direction: column;
          }

          .quote-heading {
            text-align: left;
          }

          .quote-meta {
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .quote-meta-right {
            grid-template-columns: 1fr 1fr;
          }

          .quote-bottom-grid {
            grid-template-columns: 1fr;
          }

          .quote-footer {
            flex-direction: column;
          }

          .quote-footer-contact {
            text-align: left;
          }

          .quote-items-table {
            min-width: 650px;
          }

          .quote-items-section {
            overflow-x: auto;
          }

          .quote-print-toolbar {
            flex-direction: column;
          }

          .quote-toolbar-right {
            width: 100%;
          }

          .quote-toolbar-button {
            width: 100%;
          }

        }

        @media print {

          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .no-print {
            display: none !important;
          }

          .quote-print-page {
            padding: 0;
            background: #fff;
            min-height: auto;
          }

          .quote-document {
            max-width: none;
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 17mm 16mm;
            box-shadow: none;
          }

          .quote-items-table {
            break-inside: auto;
          }

          .quote-items-table tr {
            break-inside: avoid;
          }

          .quote-note-box,
          .quote-summary {
            break-inside: avoid;
          }

        }

      `}</style>

    </div>
  );
}