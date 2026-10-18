import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function formatMoney(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ReceiptPrint() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('id');

  const [payment, setPayment] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [job, setJob] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReceipt();
  }, [paymentId]);

  async function loadReceipt() {
    if (!paymentId) {
      setError('No payment was specified.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const {
      data: paymentData,
      error: paymentError,
    } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError) {
      console.error(
        'Receipt payment error:',
        paymentError
      );

      setError(paymentError.message);
      setLoading(false);
      return;
    }

    setPayment(paymentData);

    if (paymentData.invoice_id) {
      const { data: invoiceData } =
        await supabase
          .from('invoices')
          .select('*')
          .eq('id', paymentData.invoice_id)
          .single();

      setInvoice(invoiceData || null);

      if (invoiceData?.job_id) {
        const { data: jobData } =
          await supabase
            .from('jobs')
            .select('*')
            .eq('id', invoiceData.job_id)
            .single();

        setJob(jobData || null);
      }
    } else if (paymentData.job_id) {
      const { data: jobData } =
        await supabase
          .from('jobs')
          .select('*')
          .eq('id', paymentData.job_id)
          .single();

      setJob(jobData || null);
    }

    setLoading(false);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
          color: '#64748b',
          fontFamily:
            'Arial, Helvetica, sans-serif',
        }}
      >
        Loading receipt...
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
          padding: '30px',
          fontFamily:
            'Arial, Helvetica, sans-serif',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '35px',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow:
              '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          <h2
            style={{
              margin: '0 0 10px',
              color: '#111827',
            }}
          >
            Receipt unavailable
          </h2>

          <p
            style={{
              margin: 0,
              color: '#64748b',
            }}
          >
            {error ||
              'The payment could not be found.'}
          </p>
        </div>
      </div>
    );
  }

  const paymentAmount = Number(
    payment.amount || 0
  );

  const currentBalance = Number(
    invoice?.balance_due || 0
  );

  const invoiceTotal = Number(
    invoice?.total || 0
  );

  const previousBalance =
    currentBalance + paymentAmount;

  const currency =
    payment.currency ||
    invoice?.currency ||
    'NGN';

  const customerName =
    payment.customer_name ||
    invoice?.customer_name ||
    'Customer';

  return (
    <>
      {/* PRINT CONTROLS */}

      <div
        className="receipt-print-controls"
        style={{
          padding: '18px 24px',
          background: '#111827',
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          fontFamily:
            'Arial, Helvetica, sans-serif',
        }}
      >
        <button
          type="button"
          onClick={handlePrint}
          style={{
            border: 0,
            background: '#fff',
            color: '#111827',
            padding: '11px 20px',
            borderRadius: '9px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Print / Save PDF
        </button>

        <button
          type="button"
          onClick={() =>
            window.close()
          }
          style={{
            border:
              '1px solid rgba(255,255,255,0.35)',
            background: 'transparent',
            color: '#fff',
            padding: '11px 20px',
            borderRadius: '9px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>

      {/* RECEIPT */}

      <div
        className="receipt-page"
        style={{
          minHeight: '100vh',
          background: '#f1f5f9',
          padding: '40px 20px',
          fontFamily:
            'Arial, Helvetica, sans-serif',
          color: '#111827',
        }}
      >
        <div
          className="receipt-paper"
          style={{
            maxWidth: '820px',
            margin: '0 auto',
            background: '#fff',
            borderRadius: '8px',
            boxShadow:
              '0 12px 40px rgba(15,23,42,0.10)',
            overflow: 'hidden',
          }}
        >
          {/* BRAND HEADER */}

          <div
            style={{
              padding: '34px 40px',
              borderBottom:
                '1px solid #e5e7eb',
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'flex-start',
              gap: '25px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#111827',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '17px',
                    letterSpacing: '-1px',
                  }}
                >
                  VD
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '21px',
                      fontWeight: 800,
                      color: '#111827',
                    }}
                  >
                    ValueDam Network
                  </div>

                  <div
                    style={{
                      marginTop: '3px',
                      color: '#64748b',
                      fontSize: '12px',
                    }}
                  >
                    Digital Services &
                    Business Solutions
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                textAlign: 'right',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  color: '#64748b',
                  marginBottom: '7px',
                }}
              >
                PAYMENT RECEIPT
              </div>

              <div
                style={{
                  fontSize: '21px',
                  fontWeight: 800,
                  color: '#111827',
                }}
              >
                {payment.payment_number}
              </div>

              <div
                style={{
                  marginTop: '5px',
                  color: '#64748b',
                  fontSize: '12px',
                }}
              >
                {formatDate(
                  payment.payment_date
                )}
              </div>
            </div>
          </div>

          {/* RECEIVED FROM */}

          <div
            style={{
              padding: '30px 40px',
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: '30px',
              borderBottom:
                '1px solid #e5e7eb',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: '#94a3b8',
                  fontWeight: 800,
                  marginBottom: '8px',
                }}
              >
                Received From
              </div>

              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#111827',
                  marginBottom: '6px',
                }}
              >
                {customerName}
              </div>

              {invoice?.company_name && (
                <div
                  style={{
                    color: '#475569',
                    fontSize: '13px',
                    marginBottom: '4px',
                  }}
                >
                  {invoice.company_name}
                </div>
              )}

              {invoice?.customer_email && (
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  {invoice.customer_email}
                </div>
              )}

              {invoice?.customer_phone && (
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    marginTop: '3px',
                  }}
                >
                  {invoice.customer_phone}
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: '#94a3b8',
                  fontWeight: 800,
                  marginBottom: '8px',
                }}
              >
                Payment Details
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '7px',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: '15px',
                  }}
                >
                  <span
                    style={{
                      color: '#64748b',
                    }}
                  >
                    Method
                  </span>

                  <strong>
                    {payment.payment_method ||
                      '—'}
                  </strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: '15px',
                  }}
                >
                  <span
                    style={{
                      color: '#64748b',
                    }}
                  >
                    Reference
                  </span>

                  <strong>
                    {payment.payment_reference ||
                      '—'}
                  </strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: '15px',
                  }}
                >
                  <span
                    style={{
                      color: '#64748b',
                    }}
                  >
                    Invoice
                  </span>

                  <strong>
                    {invoice?.invoice_number ||
                      '—'}
                  </strong>
                </div>

                {job?.job_number && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: '15px',
                    }}
                  >
                    <span
                      style={{
                        color: '#64748b',
                      }}
                    >
                      Job
                    </span>

                    <strong>
                      {job.job_number}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAYMENT SUMMARY */}

          <div
            style={{
              padding: '30px 40px',
            }}
          >
            <div
              style={{
                border:
                  '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr auto',
                  padding: '15px 18px',
                  background: '#f8fafc',
                  borderBottom:
                    '1px solid #e5e7eb',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#475569',
                  textTransform:
                    'uppercase',
                  letterSpacing: '0.7px',
                }}
              >
                <span>Description</span>
                <span>Amount</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr auto',
                  padding: '22px 18px',
                  gap: '20px',
                  borderBottom:
                    '1px solid #e5e7eb',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: '#111827',
                      marginBottom: '5px',
                    }}
                  >
                    Payment Received
                  </div>

                  <div
                    style={{
                      color: '#64748b',
                      fontSize: '13px',
                      lineHeight: 1.5,
                    }}
                  >
                    {invoice?.title ||
                      'Payment toward service invoice'}
                  </div>
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    color: '#047857',
                    fontSize: '18px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatMoney(
                    paymentAmount,
                    currency
                  )}
                </div>
              </div>

              {/* TOTALS */}

              <div
                style={{
                  padding: '18px',
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    maxWidth: '360px',
                    marginLeft: 'auto',
                    display: 'grid',
                    gap: '9px',
                    fontSize: '13px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: '20px',
                    }}
                  >
                    <span
                      style={{
                        color: '#64748b',
                      }}
                    >
                      Invoice Total
                    </span>

                    <strong>
                      {formatMoney(
                        invoiceTotal,
                        currency
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: '20px',
                    }}
                  >
                    <span
                      style={{
                        color: '#64748b',
                      }}
                    >
                      Balance Before Payment
                    </span>

                    <strong>
                      {formatMoney(
                        previousBalance,
                        currency
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: '20px',
                      paddingTop: '10px',
                      marginTop: '3px',
                      borderTop:
                        '1px solid #dbe1e8',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        color: '#111827',
                      }}
                    >
                      Amount Received
                    </span>

                    <strong
                      style={{
                        color: '#047857',
                      }}
                    >
                      {formatMoney(
                        paymentAmount,
                        currency
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: '20px',
                      paddingTop: '10px',
                      fontSize: '15px',
                    }}
                  >
                    <strong>
                      Balance After Payment
                    </strong>

                    <strong
                      style={{
                        color:
                          currentBalance <= 0
                            ? '#047857'
                            : '#c2410c',
                      }}
                    >
                      {formatMoney(
                        currentBalance,
                        currency
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT STATUS */}

            <div
              style={{
                marginTop: '18px',
                padding: '15px 18px',
                borderRadius: '10px',
                background:
                  currentBalance <= 0
                    ? '#ecfdf5'
                    : '#eff6ff',
                color:
                  currentBalance <= 0
                    ? '#047857'
                    : '#1d4ed8',
                border:
                  currentBalance <= 0
                    ? '1px solid #a7f3d0'
                    : '1px solid #bfdbfe',
                fontSize: '13px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {currentBalance <= 0
                ? 'PAID IN FULL'
                : 'PART PAYMENT RECEIVED'}
            </div>

            {/* CUSTOMER RECEIPT NOTE */}

            {payment.receipt_note && (
              <div
                style={{
                  marginTop: '22px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    textTransform:
                      'uppercase',
                    letterSpacing: '1.1px',
                    color: '#94a3b8',
                    fontWeight: 800,
                    marginBottom: '7px',
                  }}
                >
                  Note
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border:
                      '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '14px',
                    color: '#475569',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    whiteSpace:
                      'pre-wrap',
                  }}
                >
                  {payment.receipt_note}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}

          <div
            style={{
              padding: '24px 40px 30px',
              borderTop:
                '1px solid #e5e7eb',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: '#111827',
                fontSize: '14px',
              }}
            >
              Thank you for choosing ValueDam
              Network.
            </div>

            <div
              style={{
                marginTop: '5px',
                color: '#64748b',
                fontSize: '12px',
              }}
            >
              We appreciate your business.
            </div>

            <div
              style={{
                marginTop: '10px',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              valuedam.com.ng
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
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

            .receipt-print-controls {
              display: none !important;
            }

            .receipt-page {
              min-height: auto !important;
              padding: 0 !important;
              background: #fff !important;
            }

            .receipt-paper {
              max-width: none !important;
              width: 100% !important;
              margin: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          }

          @media screen and (max-width: 700px) {
            .receipt-paper {
              border-radius: 0 !important;
            }
          }

          @media screen and (max-width: 620px) {
            .receipt-paper > div:first-child {
              flex-direction: column !important;
            }

            .receipt-paper > div:first-child > div:last-child {
              text-align: left !important;
            }

            .receipt-paper > div:nth-child(2) {
              grid-template-columns: 1fr !important;
            }

            .receipt-page {
              padding: 0 !important;
            }
          }
        `}
      </style>
    </>
  );
}