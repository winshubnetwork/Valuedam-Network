import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

const PAYMENT_METHODS = [
  {
    value: 'cash',
    label: 'Cash',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
  },
  {
    value: 'card',
    label: 'Card',
  },
  {
    value: 'pos',
    label: 'POS',
  },
  {
    value: 'mobile_money',
    label: 'Mobile Money',
  },
  {
    value: 'cheque',
    label: 'Cheque',
  },
  {
    value: 'other',
    label: 'Other',
  },
];

const STATUS_OPTIONS = [
  {
    value: 'draft',
    label: 'Draft',
  },
  {
    value: 'sent',
    label: 'Sent',
  },
  {
    value: 'partially_paid',
    label: 'Partially Paid',
  },
  {
    value: 'paid',
    label: 'Paid',
  },
  {
    value: 'overdue',
    label: 'Overdue',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
  },
];

function generatePaymentNumber() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `VD-PAY-${year}${month}-${random}`;
}

function generateReceiptNumber() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `VD-REC-${year}${month}-${random}`;
}

function normalizePaymentMethod(value) {
  if (!value) {
    return 'cash';
  }

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const aliases = {
    cash: 'cash',

    transfer: 'bank_transfer',
    banktransfer: 'bank_transfer',
    bank_transfer: 'bank_transfer',
    'bank transfer': 'bank_transfer',

    card: 'card',
    debit_card: 'card',
    credit_card: 'card',

    pos: 'pos',
    point_of_sale: 'pos',
    'point of sale': 'pos',

    mobile_money: 'mobile_money',
    mobilemoney: 'mobile_money',
    'mobile money': 'mobile_money',

    cheque: 'cheque',
    check: 'cheque',

    other: 'other',
  };

  return aliases[normalized] || 'other';
}

function getPaymentMethodLabel(value) {
  const normalized = normalizePaymentMethod(value);

  return (
    PAYMENT_METHODS.find(
      (method) => method.value === normalized
    )?.label || 'Other'
  );
}

function getSupabaseErrorMessage(error) {
  if (!error) {
    return 'Unknown Supabase error.';
  }

  const parts = [
    error.message,
    error.code
      ? `Code: ${error.code}`
      : '',
    error.details
      ? `Details: ${error.details}`
      : '',
    error.hint
      ? `Hint: ${error.hint}`
      : '',
  ].filter(Boolean);

  return parts.join(' | ');
}

function formatMoney(
  amount,
  currency = 'NGN'
) {
  const numericAmount = Number(amount || 0);

  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }
  ).format(numericAmount);
}

function formatDate(date) {
  if (!date) {
    return '—';
  }

  return new Date(date).toLocaleDateString(
    'en-NG',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );
}

function formatDateTimeLocal(date) {
  if (!date) {
    return '';
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  const offset =
    value.getTimezoneOffset();

  const localDate = new Date(
    value.getTime() -
      offset * 60 * 1000
  );

  return localDate
    .toISOString()
    .slice(0, 16);
}

function statusLabel(status) {
  return (
    STATUS_OPTIONS.find(
      (item) => item.value === status
    )?.label ||
    status ||
    'Draft'
  );
}

function getEffectiveInvoiceStatus(invoice) {
  if (!invoice) {
    return 'draft';
  }

  const amountPaid = Number(
    invoice.amount_paid || 0
  );

  const total = Number(
    invoice.total || 0
  );

  const balanceDue = Math.max(
    total - amountPaid,
    0
  );

  if (
    invoice.status !== 'cancelled' &&
    balanceDue <= 0 &&
    total > 0
  ) {
    return 'paid';
  }

  if (
    invoice.status !== 'cancelled' &&
    amountPaid > 0 &&
    balanceDue > 0
  ) {
    return 'partially_paid';
  }

  if (
    invoice.due_date &&
    new Date(invoice.due_date) <
      new Date() &&
    balanceDue > 0 &&
    invoice.status !== 'cancelled'
  ) {
    return 'overdue';
  }

  return invoice.status || 'draft';
}

function StatusBadge({ status }) {
  const styles = {
    draft: {
      background: '#f3f4f6',
      color: '#4b5563',
      border: '#d1d5db',
    },

    sent: {
      background: '#eff6ff',
      color: '#1d4ed8',
      border: '#bfdbfe',
    },

    partially_paid: {
      background: '#fff7ed',
      color: '#c2410c',
      border: '#fed7aa',
    },

    paid: {
      background: '#ecfdf5',
      color: '#047857',
      border: '#a7f3d0',
    },

    overdue: {
      background: '#fff1f2',
      color: '#be123c',
      border: '#fecdd3',
    },

    cancelled: {
      background: '#f5f5f5',
      color: '#6b7280',
      border: '#d1d5db',
    },
  };

  const style =
    styles[status] || styles.draft;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        background: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function Payments() {
  const emptyForm = {
    id: null,
    payment_number: '',
    receipt_number: '',
    invoice_id: '',
    customer_id: '',
    job_id: '',
    amount: '',
    currency: 'NGN',
    payment_method: 'cash',
    payment_reference: '',
    payment_date:
      formatDateTimeLocal(new Date()),
    notes: '',
    receipt_note: '',
  };

  const [payments, setPayments] =
    useState([]);

  const [invoices, setInvoices] =
    useState([]);

  const [form, setForm] =
    useState(emptyForm);

  const [selectedPayment, setSelectedPayment] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    const [
      paymentsResult,
      invoicesResult,
    ] = await Promise.all([
      supabase
        .from('payments')
        .select('*')
        .order('payment_date', {
          ascending: false,
        }),

      supabase
        .from('invoices')
        .select('*')
        .order('created_at', {
          ascending: false,
        }),
    ]);

    if (paymentsResult.error) {
      setError(
        getSupabaseErrorMessage(
          paymentsResult.error
        )
      );

      setPayments([]);
    } else {
      setPayments(
        paymentsResult.data || []
      );
    }

    if (invoicesResult.error) {
      setError(
        getSupabaseErrorMessage(
          invoicesResult.error
        )
      );

      setInvoices([]);
    } else {
      setInvoices(
        invoicesResult.data || []
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredPayments = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return payments.filter(
      (payment) => {
        const invoice = invoices.find(
          (item) =>
            item.id === payment.invoice_id
        );

        const invoiceStatus =
          getEffectiveInvoiceStatus(
            invoice
          );

        const matchesStatus =
          statusFilter === 'all' ||
          invoiceStatus === statusFilter;

        if (!matchesStatus) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          payment.payment_number,
          payment.receipt_number,
          payment.payment_reference,
          payment.payment_method,
          payment.notes,
          invoice?.invoice_number,
          invoice?.customer_name,
          invoice?.company_name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          );
      }
    );
  }, [
    payments,
    invoices,
    search,
    statusFilter,
  ]);

  const stats = useMemo(() => {
    const totalPayments =
      payments.reduce(
        (sum, payment) =>
          sum +
          Number(payment.amount || 0),
        0
      );

    const paidInvoices =
      invoices.filter(
        (invoice) =>
          getEffectiveInvoiceStatus(
            invoice
          ) === 'paid'
      ).length;

    const partiallyPaid =
      invoices.filter(
        (invoice) =>
          getEffectiveInvoiceStatus(
            invoice
          ) === 'partially_paid'
      ).length;

    return {
      payments: payments.length,
      totalPayments,
      paidInvoices,
      partiallyPaid,
    };
  }, [payments, invoices]);

  function updateField(
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openNewPayment(
    invoiceId = ''
  ) {
    const invoice =
      invoices.find(
        (item) =>
          item.id === invoiceId
      );

    setSelectedPayment(null);

    setForm({
      ...emptyForm,
      payment_number:
        generatePaymentNumber(),
      receipt_number:
        generateReceiptNumber(),
      invoice_id: invoiceId || '',
      customer_id:
        invoice?.customer_id || '',
      job_id:
        invoice?.job_id || '',
      currency:
        invoice?.currency || 'NGN',
      amount: '',
      payment_method: 'cash',
      payment_date:
        formatDateTimeLocal(new Date()),
    });

    setMessage('');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function openEditPayment(
    payment
  ) {
    setSelectedPayment(payment);

    setForm({
      id: payment.id,
      payment_number:
        payment.payment_number || '',
      receipt_number:
        payment.receipt_number ||
        generateReceiptNumber(),
      invoice_id:
        payment.invoice_id || '',
      customer_id:
        payment.customer_id || '',
      job_id:
        payment.job_id || '',
      amount:
        payment.amount !== null &&
        payment.amount !== undefined
          ? String(payment.amount)
          : '',
      currency:
        payment.currency || 'NGN',
      payment_method:
        normalizePaymentMethod(
          payment.payment_method
        ),
      payment_reference:
        payment.payment_reference ||
        '',
      payment_date:
        formatDateTimeLocal(
          payment.payment_date
        ),
      notes:
        payment.notes || '',
      receipt_note:
        payment.receipt_note || '',
    });

    setMessage('');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function savePayment(
    event
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!form.invoice_id) {
        setError(
          'Please select an invoice.'
        );
        setSaving(false);
        return;
      }

      const invoice =
        invoices.find(
          (item) =>
            item.id === form.invoice_id
        );

      if (!invoice) {
        setError(
          'The selected invoice could not be found.'
        );
        setSaving(false);
        return;
      }

      const amount = Number(
        form.amount
      );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setError(
          'Please enter a valid payment amount greater than zero.'
        );
        setSaving(false);
        return;
      }

      const safePaymentMethod =
        normalizePaymentMethod(
          form.payment_method
        );

      const allowedPaymentMethods =
        PAYMENT_METHODS.map(
          (item) => item.value
        );

      if (
        !allowedPaymentMethods.includes(
          safePaymentMethod
        )
      ) {
        setError(
          'Invalid payment method. Please select one of the available payment methods.'
        );
        setSaving(false);
        return;
      }

      const {
        data: authData,
      } = await supabase.auth.getUser();

      const currentUser =
        authData?.user || null;

      let paymentNumber =
        form.payment_number.trim();

      let receiptNumber =
        form.receipt_number?.trim() || '';

      /*
       * Always generate fresh identifiers
       * for a new payment.
       */
      if (!selectedPayment?.id) {
        paymentNumber =
          generatePaymentNumber();

        receiptNumber =
          generateReceiptNumber();
      }

      /*
       * Safety fallback for old records
       * that don't have a receipt number.
       */
      if (!receiptNumber) {
        receiptNumber =
          generateReceiptNumber();
      }

      if (!paymentNumber) {
        paymentNumber =
          generatePaymentNumber();
      }

      /*
       * Get the amount of this payment
       * before editing it, so the invoice
       * total can be recalculated correctly.
       */
      let previousPaymentAmount = 0;

      if (selectedPayment?.id) {
        previousPaymentAmount =
          Number(
            selectedPayment.amount || 0
          );
      }

      /*
       * Before inserting a new payment,
       * make sure the generated identifiers
       * are not already in use.
       */
      if (!selectedPayment?.id) {
        let identifierIsUnique = false;

        for (
          let attempt = 0;
          attempt < 10;
          attempt += 1
        ) {
          const [
            paymentNumberResult,
            receiptNumberResult,
          ] = await Promise.all([
            supabase
              .from('payments')
              .select('id')
              .eq(
                'payment_number',
                paymentNumber
              )
              .limit(1)
              .maybeSingle(),

            supabase
              .from('payments')
              .select('id')
              .eq(
                'receipt_number',
                receiptNumber
              )
              .limit(1)
              .maybeSingle(),
          ]);

          if (
            paymentNumberResult.error
          ) {
            throw paymentNumberResult.error;
          }

          if (
            receiptNumberResult.error
          ) {
            throw receiptNumberResult.error;
          }

          if (
            !paymentNumberResult.data &&
            !receiptNumberResult.data
          ) {
            identifierIsUnique = true;
            break;
          }

          paymentNumber =
            generatePaymentNumber();

          receiptNumber =
            generateReceiptNumber();
        }

        if (!identifierIsUnique) {
          throw new Error(
            'Could not generate unique payment and receipt numbers. Please try again.'
          );
        }
      }

      const paymentData = {
        payment_number:
          paymentNumber,

        receipt_number:
          receiptNumber,

        invoice_id:
          form.invoice_id,

        customer_id:
          invoice.customer_id ||
          form.customer_id ||
          null,

        job_id:
          invoice.job_id ||
          form.job_id ||
          null,

        amount,

        currency:
          form.currency ||
          invoice.currency ||
          'NGN',

        /*
         * IMPORTANT:
         * This value is guaranteed to match
         * the database CHECK constraint.
         */
        payment_method:
          safePaymentMethod,

        payment_reference:
          form.payment_reference.trim() ||
          null,

        payment_date:
          form.payment_date
            ? new Date(
                form.payment_date
              ).toISOString()
            : new Date().toISOString(),

        notes:
          form.notes.trim() ||
          null,

        receipt_note:
          form.receipt_note.trim() ||
          null,

        received_by:
          selectedPayment?.received_by ||
          null,

        created_by:
          selectedPayment?.created_by ||
          currentUser?.id ||
          null,

        updated_at:
          new Date().toISOString(),
      };

      let savedPayment = null;

      if (selectedPayment?.id) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from('payments')
          .update(paymentData)
          .eq(
            'id',
            selectedPayment.id
          )
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        savedPayment = data;
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from('payments')
          .insert(paymentData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        savedPayment = data;
      }

      /*
       * Recalculate invoice payments from
       * the actual payment records.
       */
      const {
        data: invoicePayments,
        error:
          paymentReloadError,
      } = await supabase
        .from('payments')
        .select('amount')
        .eq(
          'invoice_id',
          form.invoice_id
        );

      if (paymentReloadError) {
        throw paymentReloadError;
      }

      const totalPaid =
        (invoicePayments || []).reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        );

      const invoiceTotal =
        Number(
          invoice.total || 0
        );

      const balanceDue =
        Math.max(
          invoiceTotal -
            totalPaid,
          0
        );

      let invoiceStatus =
        invoice.status;

      if (
        invoice.status !==
        'cancelled'
      ) {
        if (
          invoiceTotal > 0 &&
          balanceDue <= 0
        ) {
          invoiceStatus = 'paid';
        } else if (
          totalPaid > 0
        ) {
          invoiceStatus =
            'partially_paid';
        } else if (
          invoice.due_date &&
          new Date(
            invoice.due_date
          ) < new Date()
        ) {
          invoiceStatus =
            'overdue';
        } else {
          invoiceStatus =
            invoice.status ===
            'draft'
              ? 'draft'
              : 'sent';
        }
      }

      const {
        error:
          invoiceUpdateError,
      } = await supabase
        .from('invoices')
        .update({
          amount_paid:
            totalPaid,

          balance_due:
            balanceDue,

          status:
            invoiceStatus,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          form.invoice_id
        );

      if (invoiceUpdateError) {
        throw invoiceUpdateError;
      }

      setMessage(
        selectedPayment?.id
          ? 'Payment updated successfully.'
          : 'Payment recorded successfully.'
      );

      setSelectedPayment(
        savedPayment
      );

      setForm({
        ...emptyForm,
        id:
          savedPayment.id,
        payment_number:
          savedPayment.payment_number ||
          '',
        receipt_number:
          savedPayment.receipt_number ||
          '',
        invoice_id:
          savedPayment.invoice_id ||
          '',
        customer_id:
          savedPayment.customer_id ||
          '',
        job_id:
          savedPayment.job_id ||
          '',
        amount:
          savedPayment.amount
            ? String(
                savedPayment.amount
              )
            : '',
        currency:
          savedPayment.currency ||
          'NGN',
        payment_method:
          normalizePaymentMethod(
            savedPayment.payment_method
          ),
        payment_reference:
          savedPayment.payment_reference ||
          '',
        payment_date:
          formatDateTimeLocal(
            savedPayment.payment_date
          ),
        notes:
          savedPayment.notes ||
          '',
        receipt_note:
          savedPayment.receipt_note ||
          '',
      });

      await loadData();
    } catch (saveError) {
      console.error(
        'Payment save error:',
        saveError
      );

      setError(
        getSupabaseErrorMessage(
          saveError
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(
    payment
  ) {
    if (!payment) {
      return;
    }

    const confirmed =
      window.confirm(
        'Delete this payment? The related invoice balance will be recalculated. This cannot be undone.'
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError('');
    setMessage('');

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('payments')
        .delete()
        .eq(
          'id',
          payment.id
        );

      if (deleteError) {
        throw deleteError;
      }

      if (payment.invoice_id) {
        const {
          data: remainingPayments,
          error:
            reloadPaymentsError,
        } = await supabase
          .from('payments')
          .select('amount')
          .eq(
            'invoice_id',
            payment.invoice_id
          );

        if (reloadPaymentsError) {
          throw reloadPaymentsError;
        }

        const totalPaid =
          (
            remainingPayments || []
          ).reduce(
            (sum, item) =>
              sum +
              Number(
                item.amount || 0
              ),
            0
          );

        const invoice =
          invoices.find(
            (item) =>
              item.id ===
              payment.invoice_id
          );

        if (invoice) {
          const invoiceTotal =
            Number(
              invoice.total || 0
            );

          const balanceDue =
            Math.max(
              invoiceTotal -
                totalPaid,
              0
            );

          let invoiceStatus =
            invoice.status;

          if (
            invoice.status !==
            'cancelled'
          ) {
            if (
              invoiceTotal > 0 &&
              balanceDue <= 0
            ) {
              invoiceStatus =
                'paid';
            } else if (
              totalPaid > 0
            ) {
              invoiceStatus =
                'partially_paid';
            } else if (
              invoice.due_date &&
              new Date(
                invoice.due_date
              ) < new Date()
            ) {
              invoiceStatus =
                'overdue';
            } else {
              invoiceStatus =
                invoice.status ===
                'draft'
                  ? 'draft'
                  : 'sent';
            }
          }

          const {
            error:
              invoiceUpdateError,
          } = await supabase
            .from('invoices')
            .update({
              amount_paid:
                totalPaid,

              balance_due:
                balanceDue,

              status:
                invoiceStatus,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              payment.invoice_id
            );

          if (
            invoiceUpdateError
          ) {
            throw invoiceUpdateError;
          }
        }
      }

      setMessage(
        'Payment deleted successfully.'
      );

      if (
        selectedPayment?.id ===
        payment.id
      ) {
        setSelectedPayment(null);
        setForm(emptyForm);
      }

      await loadData();
    } catch (deleteError) {
      console.error(
        'Payment delete error:',
        deleteError
      );

      setError(
        getSupabaseErrorMessage(
          deleteError
        )
      );
    } finally {
      setDeleting(false);
    }
  }

  function openInvoice(
    invoiceId
  ) {
    if (!invoiceId) {
      return;
    }

    window.location.href =
      `/admin/invoices?edit=${invoiceId}`;
  }

  function printReceipt(
    payment
  ) {
    if (!payment?.id) {
      return;
    }

    window.open(
      `/admin/receipts/print?id=${payment.id}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function getInvoiceForPayment(
    payment
  ) {
    return invoices.find(
      (invoice) =>
        invoice.id ===
        payment.invoice_id
    );
  }

  return (
    <div
      style={{
        background: '#f8fafc',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          maxWidth: '1250px',
          margin: '0 auto',
          padding:
            '28px 20px 50px',
        }}
      >

        {/* HEADER */}

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'flex-start',
            gap: '20px',
            flexWrap: 'wrap',
            marginBottom: '26px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing:
                  '1.5px',
                color: '#64748b',
                marginBottom:
                  '8px',
              }}
            >
              FINANCE / PAYMENTS
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '32px',
                lineHeight: 1.15,
                color: '#111827',
              }}
            >
              Payments
            </h1>

            <p
              style={{
                margin:
                  '8px 0 0',
                color: '#64748b',
                fontSize: '15px',
              }}
            >
              Record customer payments,
              track receipts and keep
              invoice balances updated.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              openNewPayment()
            }
            style={{
              border: '0',
              background:
                '#111827',
              color: '#fff',
              padding:
                '12px 18px',
              borderRadius:
                '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Record Payment
          </button>
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              marginBottom:
                '18px',
              padding:
                '13px 15px',
              borderRadius:
                '10px',
              background:
                '#ecfdf5',
              color:
                '#047857',
              border:
                '1px solid #a7f3d0',
              fontSize:
                '14px',
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom:
                '18px',
              padding:
                '13px 15px',
              borderRadius:
                '10px',
              background:
                '#fff1f2',
              color:
                '#be123c',
              border:
                '1px solid #fecdd3',
              fontSize:
                '14px',
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* STATS */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '14px',
            marginBottom:
              '22px',
          }}
        >
          {[
            [
              'Payments',
              stats.payments,
              '#111827',
            ],
            [
              'Total Received',
              formatMoney(
                stats.totalPayments
              ),
              '#047857',
            ],
            [
              'Paid Invoices',
              stats.paidInvoices,
              '#2563eb',
            ],
            [
              'Partially Paid',
              stats.partiallyPaid,
              '#c2410c',
            ],
          ].map(
            ([
              label,
              value,
              color,
            ]) => (
              <div
                key={label}
                style={{
                  background:
                    '#fff',
                  border:
                    '1px solid #e5e7eb',
                  borderRadius:
                    '16px',
                  padding:
                    '20px',
                  boxShadow:
                    '0 4px 18px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    color:
                      '#64748b',
                    fontSize:
                      '13px',
                    fontWeight:
                      600,
                    marginBottom:
                      '8px',
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    fontSize:
                      '26px',
                    fontWeight:
                      800,
                    color,
                  }}
                >
                  {value}
                </div>
              </div>
            )
          )}
        </div>

        {/* SEARCH */}

        <div
          style={{
            background:
              '#fff',
            border:
              '1px solid #e5e7eb',
            borderRadius:
              '16px',
            padding:
              '16px',
            marginBottom:
              '18px',
            display:
              'flex',
            gap: '12px',
            flexWrap:
              'wrap',
          }}
        >
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search payment, receipt, invoice, customer or reference..."
            style={{
              flex:
                '1 1 350px',
              minWidth: 0,
              border:
                '1px solid #d1d5db',
              borderRadius:
                '10px',
              padding:
                '12px 14px',
              fontSize:
                '14px',
              outline:
                'none',
            }}
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            style={{
              flex:
                '0 1 210px',
              border:
                '1px solid #d1d5db',
              borderRadius:
                '10px',
              padding:
                '12px 14px',
              background:
                '#fff',
              fontSize:
                '14px',
            }}
          >
            <option value="all">
              All Invoice Statuses
            </option>

            {STATUS_OPTIONS.map(
              (status) => (
                <option
                  key={
                    status.value
                  }
                  value={
                    status.value
                  }
                >
                  {status.label}
                </option>
              )
            )}
          </select>
        </div>

        {/* FORM */}

        <div
          style={{
            background:
              '#fff',
            border:
              '1px solid #e5e7eb',
            borderRadius:
              '16px',
            padding:
              '24px',
            marginBottom:
              '24px',
            boxShadow:
              '0 4px 18px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'flex-start',
              gap: '15px',
              flexWrap:
                'wrap',
              marginBottom:
                '22px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    '21px',
                  color:
                    '#111827',
                }}
              >
                {selectedPayment
                  ? 'Edit Payment'
                  : 'Record Payment'}
              </h2>

              <p
                style={{
                  margin:
                    '6px 0 0',
                  color:
                    '#64748b',
                  fontSize:
                    '14px',
                }}
              >
                Record money received
                against a customer
                invoice.
              </p>
            </div>

            {selectedPayment && (
              <button
                type="button"
                onClick={() =>
                  openNewPayment()
                }
                style={{
                  border:
                    '1px solid #d1d5db',
                  background:
                    '#fff',
                  color:
                    '#374151',
                  padding:
                    '10px 14px',
                  borderRadius:
                    '9px',
                  fontWeight:
                    700,
                  cursor:
                    'pointer',
                }}
              >
                + New Payment
              </button>
            )}
          </div>

          <form
            onSubmit={
              savePayment
            }
          >
            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(240px, 1fr))',
                gap:
                  '16px',
              }}
            >

              {/* INVOICE */}

              <div
                style={{
                  gridColumn:
                    '1 / -1',
                }}
              >
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Invoice
                </label>

                <select
                  value={
                    form.invoice_id
                  }
                  onChange={(event) => {
                    const invoiceId =
                      event.target
                        .value;

                    const invoice =
                      invoices.find(
                        (item) =>
                          item.id ===
                          invoiceId
                      );

                    setForm(
                      (current) => ({
                        ...current,
                        invoice_id:
                          invoiceId,
                        customer_id:
                          invoice?.customer_id ||
                          '',
                        job_id:
                          invoice?.job_id ||
                          '',
                        currency:
                          invoice?.currency ||
                          'NGN',
                      })
                    );
                  }}
                  required
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #d1d5db',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    background:
                      '#fff',
                    fontSize:
                      '14px',
                  }}
                >
                  <option value="">
                    Select invoice
                  </option>

                  {invoices.map(
                    (invoice) => {
                      const status =
                        getEffectiveInvoiceStatus(
                          invoice
                        );

                      return (
                        <option
                          key={
                            invoice.id
                          }
                          value={
                            invoice.id
                          }
                        >
                          {
                            invoice.invoice_number
                          }{' '}
                          —{' '}
                          {
                            invoice.customer_name
                          }{' '}
                          —{' '}
                          {formatMoney(
                            invoice.total,
                            invoice.currency
                          )}{' '}
                          —{' '}
                          {statusLabel(
                            status
                          )}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              {/* PAYMENT NUMBER */}

              <div>
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Payment Number
                </label>

                <input
                  value={
                    form.payment_number
                  }
                  readOnly
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #e5e7eb',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    background:
                      '#f8fafc',
                    color:
                      '#64748b',
                    fontSize:
                      '14px',
                  }}
                />
              </div>

              {/* RECEIPT NUMBER */}

              <div>
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Receipt Number
                </label>

                <input
                  value={
                    form.receipt_number
                  }
                  readOnly
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #e5e7eb',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    background:
                      '#f8fafc',
                    color:
                      '#64748b',
                    fontSize:
                      '14px',
                  }}
                />
              </div>

              {/* AMOUNT */}

              <div>
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Amount
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    form.amount
                  }
                  onChange={(event) =>
                    updateField(
                      'amount',
                      event.target
                        .value
                    )
                  }
                  required
                  placeholder="0.00"
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #d1d5db',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    fontSize:
                      '14px',
                  }}
                />
              </div>

              {/* CURRENCY */}

              <div>
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Currency
                </label>

                <input
                  value={
                    form.currency
                  }
                  onChange={(event) =>
                    updateField(
                      'currency',
                      event.target
                        .value
                        .toUpperCase()
                    )
                  }
                  placeholder="NGN"
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #d1d5db',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    fontSize:
                      '14px',
                  }}
                />
              </div>

              {/* PAYMENT METHOD */}

              <div>
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Payment Method
                </label>

                <select
                  value={normalizePaymentMethod(
                    form.payment_method
                  )}
                  onChange={(event) =>
                    updateField(
                      'payment_method',
                      normalizePaymentMethod(
                        event.target
                          .value
                      )
                    )
                  }
                  required
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #d1d5db',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    background:
                      '#fff',
                    fontSize:
                      '14px',
                  }}
                >
                  {PAYMENT_METHODS.map(
                    (method) => (
                      <option
                        key={
                          method.value
                        }
                        value={
                          method.value
                        }
                      >
                        {method.label}
                      </option>
                    )
                  )}
                </select>

                <small
                  style={{
                    display:
                      'block',
                    marginTop:
                      '6px',
                    color:
                      '#94a3b8',
                    fontSize:
                      '12px',
                  }}
                >
                  Saved as:{' '}
                  {normalizePaymentMethod(
                    form.payment_method
                  )}
                </small>
              </div>

              {/* PAYMENT DATE */}

              <div>
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Payment Date
                </label>

                <input
                  type="datetime-local"
                  value={
                    form.payment_date
                  }
                  onChange={(event) =>
                    updateField(
                      'payment_date',
                      event.target
                        .value
                    )
                  }
                  required
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #d1d5db',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    fontSize:
                      '14px',
                  }}
                />
              </div>

              {/* REFERENCE */}

              <div>
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Payment Reference
                </label>

                <input
                  value={
                    form.payment_reference
                  }
                  onChange={(event) =>
                    updateField(
                      'payment_reference',
                      event.target
                        .value
                    )
                  }
                  placeholder="Bank reference, transaction ID, etc."
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #d1d5db',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    fontSize:
                      '14px',
                  }}
                />
              </div>

              {/* NOTES */}

              <div
                style={{
                  gridColumn:
                    '1 / -1',
                }}
              >
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Internal Notes
                </label>

                <textarea
                  rows="4"
                  value={
                    form.notes
                  }
                  onChange={(event) =>
                    updateField(
                      'notes',
                      event.target
                        .value
                    )
                  }
                  placeholder="Add internal notes about this payment..."
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #d1d5db',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    resize:
                      'vertical',
                    fontFamily:
                      'inherit',
                    fontSize:
                      '14px',
                    lineHeight:
                      1.5,
                  }}
                />
              </div>

              {/* RECEIPT NOTE */}

              <div
                style={{
                  gridColumn:
                    '1 / -1',
                }}
              >
                <label
                  style={{
                    display:
                      'block',
                    fontSize:
                      '13px',
                    fontWeight:
                      700,
                    color:
                      '#374151',
                    marginBottom:
                      '7px',
                  }}
                >
                  Receipt Note
                </label>

                <textarea
                  rows="3"
                  value={
                    form.receipt_note
                  }
                  onChange={(event) =>
                    updateField(
                      'receipt_note',
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional message that will appear on the customer's receipt..."
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    border:
                      '1px solid #d1d5db',
                    borderRadius:
                      '10px',
                    padding:
                      '12px 14px',
                    resize:
                      'vertical',
                    fontFamily:
                      'inherit',
                    fontSize:
                      '14px',
                    lineHeight:
                      1.5,
                  }}
                />
              </div>
            </div>

            {/* SELECTED INVOICE SUMMARY */}

            {form.invoice_id &&
              (() => {
                const invoice =
                  invoices.find(
                    (item) =>
                      item.id ===
                      form.invoice_id
                  );

                if (!invoice) {
                  return null;
                }

                const status =
                  getEffectiveInvoiceStatus(
                    invoice
                  );

                const total =
                  Number(
                    invoice.total ||
                      0
                  );

                const paid =
                  Number(
                    invoice.amount_paid ||
                      0
                  );

                const balance =
                  Math.max(
                    total - paid,
                    0
                  );

                return (
                  <div
                    style={{
                      marginTop:
                        '20px',
                      padding:
                        '16px',
                      borderRadius:
                        '12px',
                      background:
                        '#f8fafc',
                      border:
                        '1px solid #e2e8f0',
                      display:
                        'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(160px, 1fr))',
                      gap:
                        '14px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize:
                            '11px',
                          color:
                            '#94a3b8',
                          fontWeight:
                            700,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Invoice
                      </div>

                      <strong
                        style={{
                          display:
                            'block',
                          marginTop:
                            '4px',
                          color:
                            '#111827',
                        }}
                      >
                        {
                          invoice.invoice_number
                        }
                      </strong>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize:
                            '11px',
                          color:
                            '#94a3b8',
                          fontWeight:
                            700,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Customer
                      </div>

                      <strong
                        style={{
                          display:
                            'block',
                          marginTop:
                            '4px',
                          color:
                            '#111827',
                        }}
                      >
                        {
                          invoice.customer_name
                        }
                      </strong>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize:
                            '11px',
                          color:
                            '#94a3b8',
                          fontWeight:
                            700,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Invoice Total
                      </div>

                      <strong
                        style={{
                          display:
                            'block',
                          marginTop:
                            '4px',
                          color:
                            '#111827',
                        }}
                      >
                        {formatMoney(
                          total,
                          invoice.currency
                        )}
                      </strong>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize:
                            '11px',
                          color:
                            '#94a3b8',
                          fontWeight:
                            700,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Paid
                      </div>

                      <strong
                        style={{
                          display:
                            'block',
                          marginTop:
                            '4px',
                          color:
                            '#047857',
                        }}
                      >
                        {formatMoney(
                          paid,
                          invoice.currency
                        )}
                      </strong>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize:
                            '11px',
                          color:
                            '#94a3b8',
                          fontWeight:
                            700,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Balance
                      </div>

                      <strong
                        style={{
                          display:
                            'block',
                          marginTop:
                            '4px',
                          color:
                            balance >
                            0
                              ? '#c2410c'
                              : '#047857',
                        }}
                      >
                        {formatMoney(
                          balance,
                          invoice.currency
                        )}
                      </strong>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize:
                            '11px',
                          color:
                            '#94a3b8',
                          fontWeight:
                            700,
                          textTransform:
                            'uppercase',
                          marginBottom:
                            '5px',
                        }}
                      >
                        Status
                      </div>

                      <StatusBadge
                        status={
                          status
                        }
                      />
                    </div>
                  </div>
                );
              })()}

            {/* SAVE BAR */}

            <div
              style={{
                marginTop:
                  '24px',
                paddingTop:
                  '18px',
                borderTop:
                  '1px solid #e5e7eb',
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap: '15px',
                flexWrap:
                  'wrap',
              }}
            >
              <div>
                <strong
                  style={{
                    display:
                      'block',
                    color:
                      '#111827',
                    fontSize:
                      '14px',
                  }}
                >
                  {selectedPayment
                    ? 'Update this payment'
                    : 'Ready to record this payment?'}
                </strong>

                <span
                  style={{
                    color:
                      '#94a3b8',
                    fontSize:
                      '12px',
                  }}
                >
                  Payment method is stored using
                  the database-supported value.
                </span>
              </div>

              <div
                style={{
                  display:
                    'flex',
                  gap: '9px',
                  flexWrap:
                    'wrap',
                }}
              >
                {selectedPayment && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        printReceipt(
                          selectedPayment
                        )
                      }
                      style={{
                        border:
                          '1px solid #d1d5db',
                        background:
                          '#fff',
                        color:
                          '#374151',
                        padding:
                          '11px 16px',
                        borderRadius:
                          '9px',
                        fontWeight:
                          700,
                        cursor:
                          'pointer',
                      }}
                    >
                      Print Receipt
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deletePayment(
                          selectedPayment
                        )
                      }
                      disabled={
                        deleting
                      }
                      style={{
                        border:
                          '1px solid #fecaca',
                        background:
                          '#fff1f2',
                        color:
                          '#be123c',
                        padding:
                          '11px 16px',
                        borderRadius:
                          '9px',
                        fontWeight:
                          700,
                        cursor:
                          deleting
                            ? 'not-allowed'
                            : 'pointer',
                      }}
                    >
                      {deleting
                        ? 'Deleting...'
                        : 'Delete'}
                    </button>
                  </>
                )}

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  style={{
                    border: '0',
                    background:
                      '#111827',
                    color:
                      '#fff',
                    padding:
                      '11px 18px',
                    borderRadius:
                      '9px',
                    fontWeight:
                      700,
                    cursor:
                      saving
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {saving
                    ? 'Saving...'
                    : selectedPayment
                      ? 'Update Payment'
                      : 'Record Payment'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* PAYMENT LIST */}

        <div
          style={{
            background:
              '#fff',
            border:
              '1px solid #e5e7eb',
            borderRadius:
              '16px',
            overflow:
              'hidden',
            boxShadow:
              '0 4px 18px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              padding:
                '20px 22px',
              borderBottom:
                '1px solid #e5e7eb',
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              gap: '12px',
              flexWrap:
                'wrap',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    '19px',
                  color:
                    '#111827',
                }}
              >
                Payment History
              </h2>

              <p
                style={{
                  margin:
                    '5px 0 0',
                  color:
                    '#64748b',
                  fontSize:
                    '13px',
                }}
              >
                {filteredPayments.length}{' '}
                payment
                {filteredPayments.length ===
                1
                  ? ''
                  : 's'}{' '}
                found.
              </p>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding:
                  '50px 20px',
                textAlign:
                  'center',
                color:
                  '#64748b',
              }}
            >
              Loading payments...
            </div>
          ) : filteredPayments.length ===
            0 ? (
            <div
              style={{
                padding:
                  '60px 20px',
                textAlign:
                  'center',
              }}
            >
              <div
                style={{
                  fontSize:
                    '42px',
                  marginBottom:
                    '12px',
                }}
              >
                ₦
              </div>

              <h3
                style={{
                  margin:
                    '0 0 7px',
                  color:
                    '#111827',
                }}
              >
                No payments found
              </h3>

              <p
                style={{
                  margin: 0,
                  color:
                    '#64748b',
                }}
              >
                Payments you record
                will appear here.
              </p>
            </div>
          ) : (
            <div
              style={{
                display:
                  'grid',
                gap: '0',
              }}
            >
              {filteredPayments.map(
                (payment) => {
                  const invoice =
                    getInvoiceForPayment(
                      payment
                    );

                  const invoiceStatus =
                    getEffectiveInvoiceStatus(
                      invoice
                    );

                  return (
                    <div
                      key={
                        payment.id
                      }
                      style={{
                        padding:
                          '19px 22px',
                        borderBottom:
                          '1px solid #eef2f7',
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'flex-start',
                          gap:
                            '15px',
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <div
                          style={{
                            flex:
                              '1 1 300px',
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap:
                                '10px',
                              flexWrap:
                                'wrap',
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  '#111827',
                                fontSize:
                                  '15px',
                              }}
                            >
                              {
                                payment.payment_number
                              }
                            </strong>

                            <span
                              style={{
                                color:
                                  '#94a3b8',
                                fontSize:
                                  '12px',
                              }}
                            >
                              {formatDate(
                                payment.payment_date
                              )}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop:
                                '7px',
                              color:
                                '#334155',
                              fontWeight:
                                700,
                              fontSize:
                                '14px',
                            }}
                          >
                            {invoice
                              ?.customer_name ||
                              'Unknown Customer'}
                          </div>

                          <div
                            style={{
                              marginTop:
                                '4px',
                              color:
                                '#64748b',
                              fontSize:
                                '13px',
                            }}
                          >
                            Invoice:{' '}
                            {invoice
                              ?.invoice_number ||
                              '—'}
                            {' • '}
                            Method:{' '}
                            {getPaymentMethodLabel(
                              payment.payment_method
                            )}
                          </div>

                          <div
                            style={{
                              marginTop:
                                '4px',
                              color:
                                '#94a3b8',
                              fontSize:
                                '12px',
                            }}
                          >
                            Receipt:{' '}
                            {payment.receipt_number ||
                              '—'}
                            {payment.payment_reference
                              ? ` • Ref: ${payment.payment_reference}`
                              : ''}
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign:
                              'right',
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                '19px',
                              fontWeight:
                                800,
                              color:
                                '#047857',
                            }}
                          >
                            {formatMoney(
                              payment.amount,
                              payment.currency
                            )}
                          </div>

                          <div
                            style={{
                              marginTop:
                                '6px',
                            }}
                          >
                            <StatusBadge
                              status={
                                invoiceStatus
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          gap:
                            '8px',
                          flexWrap:
                            'wrap',
                          marginTop:
                            '15px',
                        }}
                      >
                        {invoice && (
                          <button
                            type="button"
                            onClick={() =>
                              openInvoice(
                                invoice.id
                              )
                            }
                            style={{
                              border:
                                '1px solid #d1d5db',
                              background:
                                '#fff',
                              color:
                                '#374151',
                              padding:
                                '8px 11px',
                              borderRadius:
                                '8px',
                              fontSize:
                                '12px',
                              fontWeight:
                                700,
                              cursor:
                                'pointer',
                            }}
                          >
                            Invoice
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            openEditPayment(
                              payment
                            )
                          }
                          style={{
                            border:
                              '1px solid #d1d5db',
                            background:
                              '#fff',
                            color:
                              '#374151',
                            padding:
                              '8px 11px',
                            borderRadius:
                              '8px',
                            fontSize:
                              '12px',
                            fontWeight:
                              700,
                            cursor:
                              'pointer',
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            printReceipt(
                              payment
                            )
                          }
                          style={{
                            border:
                              '1px solid #d1d5db',
                            background:
                              '#fff',
                            color:
                              '#374151',
                            padding:
                              '8px 11px',
                            borderRadius:
                              '8px',
                            fontSize:
                              '12px',
                            fontWeight:
                              700,
                            cursor:
                              'pointer',
                          }}
                        >
                          Receipt / PDF
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deletePayment(
                              payment
                            )
                          }
                          style={{
                            border:
                              '1px solid #fecaca',
                            background:
                              '#fff1f2',
                            color:
                              '#be123c',
                            padding:
                              '8px 11px',
                            borderRadius:
                              '8px',
                            fontSize:
                              '12px',
                            fontWeight:
                              700,
                            cursor:
                              'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}