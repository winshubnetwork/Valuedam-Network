import React, { useEffect, useState } from 'react';
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
      setError('No quote ID was provided.');
      setLoading(false);
      return;
    }

    loadQuote();
  }, [quoteId]);

  async function loadQuote() {
    setLoading(true);
    setError('');

    const {
      data: quoteData,
      error: quoteError
    } = await supabase
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

    const {
      data: itemData,
      error: itemError
    } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', {
        ascending: true
      });

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
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return '';

    return new Date(value).toLocaleDateString(
      'en-NG',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }
    );
  }

  function printQuote() {
    window.print();
  }

  if (loading) {
    return (
      <div className="quote-loading">
        Loading quotation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="quote-error-screen">
        <div className="quote-error-card">
          <h2>Unable to load quotation</h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              navigate('/admin/quotes')
            }
          >
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* =====================================================
          SCREEN ACTIONS
          ===================================================== */}

      <div className="quote-screen-actions no-print">

        <button
          type="button"
          className="screen-btn back"
          onClick={() =>
            navigate('/admin/quotes')
          }
        >
          ← Back to Quotes
        </button>

        <button
          type="button"
          className="screen-btn print"
          onClick={printQuote}
        >
          Print / Save PDF
        </button>

      </div>


      {/* =====================================================
          QUOTE DOCUMENT
          ===================================================== */}

      <main className="quote-print-page">

        <div className="quote-paper">

          {/* =================================================
              HEADER
              ================================================= */}

          <header className="quote-header">

            <div className="brand-area">

              <div className="brand-mark">
                V
              </div>

              <div className="brand-text">

                <h1>
                  ValueDam Network
                </h1>

                <p>
                  Digital Business &amp;
                  Technology Services
                </p>

              </div>

            </div>


            <div className="quote-heading">

              <h2>
                QUOTATION
              </h2>

              <div className="quote-number">
                {quote.quote_number}
              </div>

            </div>

          </header>


          {/* Elegant divider */}

          <div className="header-divider" />


          {/* =================================================
              CUSTOMER + QUOTE DETAILS
              ================================================= */}

          <section className="information-grid">

            <div className="customer-information">

              <span className="small-label">
                PREPARED FOR
              </span>

              <h3>
                {quote.customer_name ||
                  'Customer'}
              </h3>

              {quote.company_name && (
                <p>
                  {quote.company_name}
                </p>
              )}

              {quote.customer_email && (
                <p>
                  {quote.customer_email}
                </p>
              )}

              {quote.customer_phone && (
                <p>
                  {quote.customer_phone}
                </p>
              )}

              {quote.customer_whatsapp && (
                <p>
                  WhatsApp:{' '}
                  {quote.customer_whatsapp}
                </p>
              )}

            </div>


            <div className="quote-information">

              <div className="info-row">

                <span>
                  Quote Date
                </span>

                <strong>
                  {formatDate(
                    quote.issue_date
                  )}
                </strong>

              </div>


              {quote.expiry_date && (
                <div className="info-row">

                  <span>
                    Valid Until
                  </span>

                  <strong>
                    {formatDate(
                      quote.expiry_date
                    )}
                  </strong>

                </div>
              )}


              <div className="info-row">

                <span>
                  Status
                </span>

                <strong className="status-text">
                  {String(
                    quote.status || 'draft'
                  ).toUpperCase()}
                </strong>

              </div>

            </div>

          </section>


          {/* =================================================
              INTRODUCTION
              ================================================= */}

          <section className="quote-introduction">

            <h3>
              {quote.title ||
                'Service Quote'}
            </h3>

            {quote.description && (
              <p>
                {quote.description}
              </p>
            )}

          </section>


          {/* =================================================
              ITEMS
              ================================================= */}

          <section className="items-section">

            <table className="quote-table">

              <thead>

                <tr>

                  <th className="description">
                    Description
                  </th>

                  <th className="qty">
                    Qty
                  </th>

                  <th className="price">
                    Unit Price
                  </th>

                  <th className="amount">
                    Amount
                  </th>

                </tr>

              </thead>


              <tbody>

                {items.length === 0 ? (

                  <tr>

                    <td
                      colSpan="4"
                      className="empty-items"
                    >
                      No quotation items.
                    </td>

                  </tr>

                ) : (

                  items.map((item, index) => (

                    <tr key={item.id}>

                      <td className="description-cell">

                        <span className="item-index">
                          {index + 1}
                        </span>

                        <span>
                          {item.description}
                        </span>

                      </td>

                      <td className="number">
                        {Number(
                          item.quantity || 0
                        )}
                      </td>

                      <td className="number">
                        {quote.currency || 'NGN'}{' '}
                        {money(
                          item.unit_price
                        )}
                      </td>

                      <td className="number amount">
                        {quote.currency || 'NGN'}{' '}
                        {money(
                          item.amount
                        )}
                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </section>


          {/* =================================================
              TOTALS
              ================================================= */}

          <section className="totals-section">

            <div className="totals">

              <div className="total-row">

                <span>
                  Subtotal
                </span>

                <strong>
                  {quote.currency || 'NGN'}{' '}
                  {money(
                    quote.subtotal
                  )}
                </strong>

              </div>


              <div className="total-row">

                <span>
                  Discount
                </span>

                <strong>
                  {quote.currency || 'NGN'}{' '}
                  {money(
                    quote.discount
                  )}
                </strong>

              </div>


              <div className="total-row">

                <span>
                  Tax
                </span>

                <strong>
                  {quote.currency || 'NGN'}{' '}
                  {money(
                    quote.tax
                  )}
                </strong>

              </div>


              <div className="total-final">

                <span>
                  Total
                </span>

                <strong>
                  {quote.currency || 'NGN'}{' '}
                  {money(
                    quote.total
                  )}
                </strong>

              </div>

            </div>

          </section>


          {/* =================================================
              NOTES
              ================================================= */}

          {quote.customer_notes && (

            <section className="notes-section">

              <h4>
                Notes
              </h4>

              <p>
                {quote.customer_notes}
              </p>

            </section>

          )}


          {quote.terms && (

            <section className="notes-section">

              <h4>
                Terms &amp; Conditions
              </h4>

              <p>
                {quote.terms}
              </p>

            </section>

          )}


          {/* =================================================
              FOOTER
              ================================================= */}

          <footer className="quote-footer">

            <div>

              <strong>
                ValueDam Network
              </strong>

              <span>
                Digital Business &amp;
                Technology Services
              </span>

            </div>


            <div className="footer-right">

              <strong>
                Thank you for your business.
              </strong>

              <span>
                valuedam.com.ng
              </span>

            </div>

          </footer>

        </div>

      </main>


      {/* =====================================================
          STYLES
          ===================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #eef1f4;
          color: #171717;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }


        /* =====================================================
           SCREEN ACTION BAR
           ===================================================== */

        .quote-screen-actions {
          position: sticky;
          top: 0;
          z-index: 1000;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          padding: 13px;

          background: #161616;

          box-shadow:
            0 4px 18px
            rgba(0, 0, 0, 0.15);
        }

        .screen-btn {
          border: 0;
          border-radius: 7px;

          padding: 11px 18px;

          font-size: 13px;
          font-weight: 700;

          cursor: pointer;
        }

        .screen-btn.back {
          background: #333333;
          color: #ffffff;
        }

        .screen-btn.print {
          background: #ffffff;
          color: #111111;
        }


        /* =====================================================
           PAGE
           ===================================================== */

        .quote-print-page {
          width: 100%;

          padding: 35px 20px 60px;

          background: #eef1f4;
        }


        .quote-paper {
          width: 210mm;
          min-height: 297mm;

          margin: 0 auto;

          padding:
            17mm
            17mm
            14mm;

          background: #ffffff;

          box-shadow:
            0 10px 40px
            rgba(0, 0, 0, 0.10);
        }


        /* =====================================================
           HEADER
           ===================================================== */

        .quote-header {
          display: flex;

          justify-content: space-between;
          align-items: center;

          gap: 30px;
        }


        .brand-area {
          display: flex;

          align-items: center;

          gap: 12px;
        }


        .brand-mark {
          width: 43px;
          height: 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #151515;
          color: #ffffff;

          border-radius: 7px;

          font-size: 22px;
          font-weight: 900;
        }


        .brand-text h1 {
          margin: 0;

          font-size: 21px;
          line-height: 1.1;

          font-weight: 800;

          letter-spacing: -0.3px;
        }


        .brand-text p {
          margin: 4px 0 0;

          font-size: 10px;

          color: #555555;

          font-weight: 600;
        }


        .quote-heading {
          text-align: right;
        }


        .quote-heading h2 {
          margin: 0;

          font-size: 25px;

          line-height: 1;

          font-weight: 800;

          letter-spacing: 0.5px;
        }


        .quote-number {
          margin-top: 6px;

          font-size: 10px;

          font-weight: 700;

          color: #555555;
        }


        /* =====================================================
           DIVIDER
           ===================================================== */

        .header-divider {
          height: 1px;

          margin:
            20px
            0
            25px;

          background: #222222;
        }


        /* =====================================================
           INFORMATION
           ===================================================== */

        .information-grid {
          display: grid;

          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(220px, 0.65fr);

          gap: 45px;

          margin-bottom: 27px;
        }


        .small-label {
          display: block;

          margin-bottom: 7px;

          font-size: 8px;

          font-weight: 800;

          text-transform: uppercase;

          letter-spacing: 1.2px;

          color: #777777;
        }


        .customer-information h3 {
          margin: 0 0 6px;

          font-size: 15px;

          font-weight: 800;
        }


        .customer-information p {
          margin: 3px 0;

          font-size: 10.5px;

          color: #333333;

          font-weight: 500;
        }


        .quote-information {
          border-left: 1px solid #dddddd;

          padding-left: 25px;
        }


        .info-row {
          display: flex;

          justify-content: space-between;

          gap: 20px;

          padding: 6px 0;

          border-bottom:
            1px solid #eeeeee;
        }


        .info-row:last-child {
          border-bottom: none;
        }


        .info-row span {
          font-size: 9px;

          color: #777777;

          font-weight: 600;
        }


        .info-row strong {
          font-size: 10px;

          font-weight: 800;

          text-align: right;
        }


        .status-text {
          letter-spacing: 0.3px;
        }


        /* =====================================================
           INTRODUCTION
           ===================================================== */

        .quote-introduction {
          margin-bottom: 17px;
        }


        .quote-introduction h3 {
          margin: 0 0 5px;

          font-size: 16px;

          font-weight: 800;
        }


        .quote-introduction p {
          margin: 0;

          font-size: 10.5px;

          line-height: 1.55;

          color: #444444;
        }


        /* =====================================================
           TABLE
           ===================================================== */

        .items-section {
          width: 100%;
        }


        .quote-table {
          width: 100%;

          border-collapse: collapse;

          table-layout: fixed;

          border-top:
            2px solid #222222;

          font-size: 10.5px;
        }


        .quote-table th {
          padding:
            10px
            9px;

          background: #f1f2f3;

          border-bottom:
            1px solid #222222;

          color: #171717;

          font-size: 9px;

          font-weight: 800;

          text-align: left;
        }


        .quote-table th.description {
          width: 52%;
        }


        .quote-table th.qty {
          width: 10%;

          text-align: center;
        }


        .quote-table th.price {
          width: 19%;

          text-align: right;
        }


        .quote-table th.amount {
          width: 19%;

          text-align: right;
        }


        .quote-table td {
          padding:
            11px
            9px;

          border-bottom:
            1px solid #dddddd;

          color: #222222;

          font-weight: 500;

          line-height: 1.45;

          vertical-align: middle;
        }


        .quote-table tbody tr:last-child td {
          border-bottom:
            1.5px solid #222222;
        }


        .description-cell {
          display: flex;

          align-items: flex-start;

          gap: 9px;

          font-weight: 600 !important;
        }


        .item-index {
          display: inline-flex;

          align-items: center;
          justify-content: center;

          width: 19px;
          height: 19px;

          flex-shrink: 0;

          border: 1px solid #cccccc;

          border-radius: 50%;

          font-size: 8px;

          font-weight: 700;

          color: #555555;
        }


        .number {
          text-align: right;

          white-space: nowrap;
        }


        .amount {
          font-weight: 800 !important;
        }


        .empty-items {
          padding: 25px !important;

          text-align: center;

          color: #666666 !important;
        }


        /* =====================================================
           TOTALS
           ===================================================== */

        .totals-section {
          display: flex;

          justify-content: flex-end;

          margin-top: 20px;
        }


        .totals {
          width: 290px;
        }


        .total-row {
          display: flex;

          justify-content: space-between;

          gap: 20px;

          padding: 6px 0;

          font-size: 10.5px;

          border-bottom:
            1px solid #eeeeee;
        }


        .total-row span {
          color: #555555;

          font-weight: 500;
        }


        .total-row strong {
          font-weight: 700;
        }


        .total-final {
          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 20px;

          margin-top: 5px;

          padding:
            12px
            0;

          border-top:
            2px solid #222222;

          font-size: 14px;
        }


        .total-final span {
          font-weight: 800;
        }


        .total-final strong {
          font-size: 15px;

          font-weight: 900;
        }


        /* =====================================================
           NOTES
           ===================================================== */

        .notes-section {
          margin-top: 23px;

          padding-top: 12px;

          border-top:
            1px solid #dddddd;
        }


        .notes-section h4 {
          margin: 0 0 6px;

          font-size: 9px;

          font-weight: 800;

          text-transform: uppercase;

          letter-spacing: 0.8px;
        }


        .notes-section p {
          margin: 0;

          white-space: pre-wrap;

          font-size: 10px;

          line-height: 1.55;

          color: #444444;
        }


        /* =====================================================
           FOOTER
           ===================================================== */

        .quote-footer {
          display: flex;

          justify-content: space-between;

          gap: 30px;

          margin-top: 42px;

          padding-top: 12px;

          border-top:
            1px solid #cccccc;
        }


        .quote-footer > div {
          display: flex;

          flex-direction: column;

          gap: 3px;
        }


        .quote-footer strong {
          font-size: 9px;

          font-weight: 800;
        }


        .quote-footer span {
          font-size: 8px;

          color: #666666;

          font-weight: 500;
        }


        .footer-right {
          text-align: right;
        }


        /* =====================================================
           LOADING / ERROR
           ===================================================== */

        .quote-loading {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          font-weight: 700;
        }


        .quote-error-screen {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #f3f4f6;
        }


        .quote-error-card {
          width: min(450px, 90%);

          padding: 30px;

          background: #ffffff;

          text-align: center;

          border: 1px solid #dddddd;
        }


        .quote-error-card h2 {
          margin-top: 0;
        }


        .quote-error-card button {
          padding: 11px 18px;

          border: 0;

          background: #151515;

          color: #ffffff;

          font-weight: 700;

          cursor: pointer;
        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 700px) {

          .quote-print-page {
            padding: 10px;
          }


          .quote-paper {
            width: 100%;

            min-height: auto;

            padding: 25px 18px;
          }


          .quote-header {
            align-items: flex-start;

            flex-direction: column;
          }


          .quote-heading {
            text-align: left;
          }


          .information-grid {
            grid-template-columns: 1fr;

            gap: 20px;
          }


          .quote-information {
            border-left: none;

            border-top: 1px solid #dddddd;

            padding:
              15px
              0
              0;
          }


          .quote-table {
            font-size: 9px;
          }


          .quote-table th,
          .quote-table td {
            padding: 8px 5px;
          }


          .item-index {
            display: none;
          }


          .totals {
            width: 100%;
          }


          .quote-footer {
            flex-direction: column;
          }


          .footer-right {
            text-align: left;
          }

        }


        /* =====================================================
           PRINT / PDF
           ===================================================== */

        @media print {

          @page {
            size: A4 portrait;

            margin: 0;
          }


          html {
            width: 210mm;

            background:
              #ffffff !important;
          }


          body {
            width: 210mm;

            margin: 0 !important;

            padding: 0 !important;

            background:
              #ffffff !important;

            color:
              #111111 !important;

            -webkit-print-color-adjust:
              exact !important;

            print-color-adjust:
              exact !important;
          }


          /*
           * Hide website/admin layout.
           */

          body > * {
            visibility:
              hidden !important;
          }


          /*
           * Show quotation only.
           */

          .quote-print-page,
          .quote-print-page * {
            visibility:
              visible !important;
          }


          .quote-print-page {
            position:
              absolute !important;

            top: 0 !important;
            left: 0 !important;

            width: 210mm !important;

            margin: 0 !important;

            padding: 0 !important;

            background:
              #ffffff !important;
          }


          .quote-paper {
            width: 210mm !important;

            min-height: 297mm !important;

            margin: 0 !important;

            padding:
              17mm
              17mm
              14mm !important;

            box-shadow:
              none !important;

            background:
              #ffffff !important;

            color:
              #111111 !important;

            -webkit-print-color-adjust:
              exact !important;

            print-color-adjust:
              exact !important;
          }


          .no-print {
            display:
              none !important;

            visibility:
              hidden !important;
          }


          /*
           * Make sure important borders
           * remain visible in PDF.
           */

          .header-divider {
            display:
              block !important;

            height:
              1px !important;

            background:
              #222222 !important;
          }


          .quote-table {
            border-top:
              2px solid #222222 !important;
          }


          .quote-table th {
            background:
              #f1f2f3 !important;

            color:
              #111111 !important;

            border-bottom:
              1px solid #222222 !important;
          }


          .quote-table td {
            border-bottom:
              1px solid #dddddd !important;

            color:
              #111111 !important;
          }


          .quote-table tbody tr:last-child td {
            border-bottom:
              1.5px solid #222222 !important;
          }


          .total-final {
            border-top:
              2px solid #222222 !important;
          }


          .quote-footer {
            border-top:
              1px solid #cccccc !important;
          }


          /*
           * Prevent important sections
           * from splitting.
           */

          .quote-header,
          .information-grid,
          .quote-introduction,
          .totals-section,
          .notes-section,
          .quote-footer {
            page-break-inside:
              avoid !important;
          }


          .quote-table thead {
            display:
              table-header-group;
          }


          .quote-table tr {
            page-break-inside:
              avoid !important;

            page-break-after:
              auto !important;
          }


          /*
           * Keep all text sharp/dark.
           */

          .brand-text h1,
          .quote-heading h2,
          .customer-information h3,
          .quote-introduction h3,
          .total-final strong {
            color:
              #111111 !important;
          }


          a {
            color:
              #111111 !important;

            text-decoration:
              none !important;
          }

        }

      `}</style>
    </>
  );
}