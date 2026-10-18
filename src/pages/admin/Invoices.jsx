import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../../lib/supabase';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const paymentMethods = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'pos', label: 'POS' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

function normalizePaymentMethod(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const aliases = {
    cash: 'cash',
    transfer: 'bank_transfer',
    banktransfer: 'bank_transfer',
    bank_transfer: 'bank_transfer',
    card: 'card',
    debit_card: 'card',
    credit_card: 'card',
    pos: 'pos',
    point_of_sale: 'pos',
    mobile_money: 'mobile_money',
    mobilemoney: 'mobile_money',
    cheque: 'cheque',
    check: 'cheque',
    other: 'other',
    paystack: 'other',
    flutterwave: 'other',
  };

  const result = aliases[normalized] || normalized;

  return paymentMethods.some(
    (method) => method.value === result
  )
    ? result
    : 'other';
}

const emptyForm = {
  id: null,
  invoice_number: '',
  customer_id: '',
  job_id: '',
  quote_id: '',

  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_whatsapp: '',
  company_name: '',

  title: 'Service Invoice',
  description: '',

  status: 'draft',

  issue_date: '',
  due_date: '',

  discount: 0,
  tax: 0,

  currency: 'NGN',

  amount_paid: 0,

  customer_notes: '',
  terms: '',
  admin_notes: '',

  items: [
    {
      id: null,
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
    },
  ],
};

const emptyPaymentForm = {
  invoice_id: '',
  amount: '',
  payment_method: 'bank_transfer',
  payment_reference: '',
  payment_date: '',
  receipt_note: '',
  notes: '',
};

function generateInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `VD-INV-${year}${month}-${random}`;
}

function generatePaymentNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `VD-PAY-${year}${month}-${random}`;
}

function formatMoney(amount, currency = 'NGN') {
  const value = Number(amount || 0);

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function formatDate(date) {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date) {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate.toISOString().slice(0, 16);
}

function statusLabel(status) {
  return (
    statusOptions.find(
      (option) => option.value === status
    )?.label ||
    status ||
    'Draft'
  );
}

function isOverdue(invoice) {
  if (
    invoice.status === 'paid' ||
    invoice.status === 'cancelled'
  ) {
    return false;
  }

  if (!invoice.due_date) return false;

  return (
    new Date(invoice.due_date).getTime() <
    Date.now()
  );
}

function effectiveStatus(invoice) {
  if (
    invoice.status !== 'paid' &&
    invoice.status !== 'cancelled' &&
    isOverdue(invoice)
  ) {
    return 'overdue';
  }

  return invoice.status;
}

function StatusBadge({ status }) {
  const styles = {
    draft: {
      background: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
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
      background: '#f8fafc',
      color: '#64748b',
      border: '#cbd5e1',
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
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        fontSize: '11px',
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

function getPaymentNumber(payment) {
  return (
    payment.payment_number ||
    payment.receipt_number ||
    `PAY-${String(
      payment.id || ''
    )
      .slice(0, 8)
      .toUpperCase()}`
  );
}

function getPaymentDate(payment) {
  return (
    payment.payment_date ||
    payment.created_at
  );
}

function getPaymentMethod(payment) {
  return (
    payment.payment_method ||
    'Not specified'
  );
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] =
    useState(false);

  const [expandedInvoices, setExpandedInvoices] =
    useState({});

  const [form, setForm] = useState(emptyForm);

  const [
    paymentModalOpen,
    setPaymentModalOpen,
  ] = useState(false);

  const [
    paymentForm,
    setPaymentForm,
  ] = useState(emptyPaymentForm);

  const [
    paymentSaving,
    setPaymentSaving,
  ] = useState(false);

  const [paymentTarget, setPaymentTarget] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  async function loadPayments() {
    setPaymentsLoading(true);

    const {
      data,
      error: paymentsError,
    } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', {
        ascending: false,
      });

    if (paymentsError) {
      console.error(
        'Payments loading error:',
        paymentsError
      );

      setPayments([]);
      setPaymentsLoading(false);

      return;
    }

    setPayments(data || []);
    setPaymentsLoading(false);
  }

  async function loadData() {
    setLoading(true);
    setError('');

    const [
      invoicesResult,
      customersResult,
      jobsResult,
      quotesResult,
    ] = await Promise.all([
      supabase
        .from('invoices')
        .select('*')
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('crm_customers')
        .select('*')
        .order('full_name', {
          ascending: true,
        }),

      supabase
        .from('jobs')
        .select('*')
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('quotes')
        .select('*')
        .order('created_at', {
          ascending: false,
        }),
    ]);

    if (invoicesResult.error) {
      setError(
        invoicesResult.error.message
      );
    }

    if (customersResult.error) {
      setError(
        customersResult.error.message
      );
    }

    if (jobsResult.error) {
      setError(
        jobsResult.error.message
      );
    }

    if (quotesResult.error) {
      setError(
        quotesResult.error.message
      );
    }

    setInvoices(
      invoicesResult.data || []
    );

    setCustomers(
      customersResult.data || []
    );

    setJobs(
      jobsResult.data || []
    );

    setQuotes(
      quotesResult.data || []
    );

    setLoading(false);

    await loadPayments();
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const editId = params.get('edit');
    const jobId = params.get('job');
    const quoteId = params.get('quote');
    const customerId = params.get(
      'customer'
    );

    if (editId && invoices.length) {
      const invoice = invoices.find(
        (item) => item.id === editId
      );

      if (invoice) {
        editInvoice(invoice);
      }

      return;
    }

    if (quoteId && quotes.length) {
      prepareFromQuote(quoteId);
      return;
    }

    if (jobId && jobs.length) {
      prepareFromJob(jobId);
      return;
    }

    if (
      customerId &&
      customers.length
    ) {
      prepareFromCustomer(customerId);
    }
  }, [
    invoices,
    jobs,
    quotes,
    customers,
  ]);

  function resetMessage() {
    setMessage('');
    setError('');
  }

  function newInvoice() {
    resetMessage();

    setForm({
      ...emptyForm,
      invoice_number:
        generateInvoiceNumber(),
      issue_date:
        toDateTimeLocal(
          new Date().toISOString()
        ),
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function updateField(
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(
    index,
    field,
    value
  ) {
    setForm((current) => {
      const items = [...current.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      const quantity = Number(
        items[index].quantity || 0
      );

      const unitPrice = Number(
        items[index].unit_price || 0
      );

      items[index].amount =
        quantity * unitPrice;

      return {
        ...current,
        items,
      };
    });
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: null,
          description: '',
          quantity: 1,
          unit_price: 0,
          amount: 0,
        },
      ],
    }));
  }

  function removeItem(index) {
    setForm((current) => {
      if (current.items.length === 1) {
        return current;
      }

      return {
        ...current,
        items: current.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      };
    });
  }

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) =>
          customer.id ===
          form.customer_id
      ) || null,
    [customers, form.customer_id]
  );

  const filteredJobs = useMemo(() => {
    if (!form.customer_id) {
      return jobs;
    }

    return jobs.filter(
      (job) =>
        job.customer_id ===
        form.customer_id
    );
  }, [jobs, form.customer_id]);

  const filteredQuotes = useMemo(() => {
    if (!form.customer_id) {
      return quotes;
    }

    return quotes.filter(
      (quote) =>
        quote.customer_id ===
        form.customer_id
    );
  }, [quotes, form.customer_id]);

  const subtotal = useMemo(
    () =>
      form.items.reduce(
        (total, item) =>
          total +
          Number(item.amount || 0),
        0
      ),
    [form.items]
  );

  const discount = Number(
    form.discount || 0
  );

  const tax = Number(
    form.tax || 0
  );

  const total = Math.max(
    0,
    subtotal - discount + tax
  );

  function populateCustomer(
    customer
  ) {
    if (!customer) return;

    setForm((current) => ({
      ...current,

      customer_id: customer.id,

      customer_name:
        customer.full_name || '',

      customer_email:
        customer.email || '',

      customer_phone:
        customer.phone || '',

      customer_whatsapp:
        customer.whatsapp || '',

      company_name:
        customer.company_name || '',
    }));
  }

  function prepareFromCustomer(
    customerId
  ) {
    const customer =
      customers.find(
        (item) =>
          item.id === customerId
      );

    if (!customer) return;

    resetMessage();

    setForm({
      ...emptyForm,

      invoice_number:
        generateInvoiceNumber(),

      issue_date:
        toDateTimeLocal(
          new Date().toISOString()
        ),

      customer_id:
        customer.id,

      customer_name:
        customer.full_name || '',

      customer_email:
        customer.email || '',

      customer_phone:
        customer.phone || '',

      customer_whatsapp:
        customer.whatsapp || '',

      company_name:
        customer.company_name || '',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function prepareFromJob(
    jobId
  ) {
    const job = jobs.find(
      (item) => item.id === jobId
    );

    if (!job) return;

    const customer =
      customers.find(
        (item) =>
          item.id === job.customer_id
      );

    resetMessage();

    setForm((current) => ({
      ...current,

      invoice_number:
        current.invoice_number ||
        generateInvoiceNumber(),

      issue_date:
        current.issue_date ||
        toDateTimeLocal(
          new Date().toISOString()
        ),

      job_id: job.id,

      customer_id:
        job.customer_id || '',

      title:
        job.title
          ? `${job.title} - Invoice`
          : 'Service Invoice',

      description:
        job.description || '',

      items:
        job.agreed_amount
          ? [
              {
                id: null,
                description:
                  job.title ||
                  'Service',
                quantity: 1,
                unit_price:
                  Number(
                    job.agreed_amount
                  ),
                amount:
                  Number(
                    job.agreed_amount
                  ),
              },
            ]
          : current.items,
    }));

    if (customer) {
      populateCustomer(customer);
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function prepareFromQuote(
    quoteId
  ) {
    const quote = quotes.find(
      (item) => item.id === quoteId
    );

    if (!quote) return;

    const customer =
      customers.find(
        (item) =>
          item.id ===
          quote.customer_id
      );

    const relatedJob = jobs.find(
      (job) =>
        job.quote_id === quote.id
    );

    resetMessage();

    setForm((current) => ({
      ...current,

      invoice_number:
        current.invoice_number ||
        generateInvoiceNumber(),

      issue_date:
        current.issue_date ||
        toDateTimeLocal(
          new Date().toISOString()
        ),

      quote_id: quote.id,

      job_id:
        relatedJob?.id ||
        current.job_id ||
        '',

      customer_id:
        quote.customer_id || '',

      customer_name:
        quote.customer_name || '',

      customer_email:
        quote.customer_email || '',

      customer_phone:
        quote.customer_phone || '',

      customer_whatsapp:
        quote.customer_whatsapp || '',

      company_name:
        quote.company_name || '',

      title:
        quote.title
          ? `${quote.title} - Invoice`
          : 'Service Invoice',

      description:
        quote.description || '',

      discount:
        Number(
          quote.discount || 0
        ),

      tax:
        Number(
          quote.tax || 0
        ),

      items: [
        {
          id: null,
          description:
            quote.title ||
            'Quoted Service',
          quantity: 1,
          unit_price:
            Number(
              quote.total || 0
            ),
          amount:
            Number(
              quote.total || 0
            ),
        },
      ],

      customer_notes:
        quote.customer_notes || '',

      terms:
        quote.terms || '',
    }));

    if (customer) {
      populateCustomer(customer);
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function editInvoice(
    invoice
  ) {
    resetMessage();

    setForm({
      ...emptyForm,

      ...invoice,

      issue_date:
        toDateTimeLocal(
          invoice.issue_date
        ),

      due_date:
        toDateTimeLocal(
          invoice.due_date
        ),

      discount:
        Number(
          invoice.discount || 0
        ),

      tax:
        Number(
          invoice.tax || 0
        ),

      amount_paid:
        Number(
          invoice.amount_paid || 0
        ),

      items: [],
    });

    loadInvoiceItems(
      invoice.id
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function loadInvoiceItems(
    invoiceId
  ) {
    const {
      data,
      error: itemsError,
    } = await supabase
      .from('invoice_items')
      .select('*')
      .eq(
        'invoice_id',
        invoiceId
      )
      .order('sort_order', {
        ascending: true,
      });

    if (itemsError) {
      setError(
        itemsError.message
      );
      return;
    }

    setForm((current) => ({
      ...current,

      items:
        data && data.length
          ? data.map((item) => ({
              id: item.id,

              description:
                item.description ||
                '',

              quantity:
                Number(
                  item.quantity || 1
                ),

              unit_price:
                Number(
                  item.unit_price ||
                    0
                ),

              amount:
                Number(
                  item.amount || 0
                ),
            }))
          : [
              {
                id: null,
                description: '',
                quantity: 1,
                unit_price: 0,
                amount: 0,
              },
            ],
    }));
  }

  function handleCustomerChange(
    customerId
  ) {
    const customer =
      customers.find(
        (item) =>
          item.id === customerId
      );

    setForm((current) => ({
      ...current,

      customer_id:
        customerId,

      job_id: '',
      quote_id: '',

      customer_name:
        customer?.full_name || '',

      customer_email:
        customer?.email || '',

      customer_phone:
        customer?.phone || '',

      customer_whatsapp:
        customer?.whatsapp || '',

      company_name:
        customer?.company_name || '',
    }));
  }

  function handleJobChange(
    jobId
  ) {
    const job = jobs.find(
      (item) => item.id === jobId
    );

    if (!job) {
      updateField(
        'job_id',
        ''
      );
      return;
    }

    if (
      form.customer_id &&
      job.customer_id !==
        form.customer_id
    ) {
      setError(
        'This job belongs to a different customer.'
      );
      return;
    }

    const customer =
      customers.find(
        (item) =>
          item.id ===
          job.customer_id
      );

    setForm((current) => ({
      ...current,

      job_id: job.id,

      customer_id:
        job.customer_id ||
        current.customer_id,

      title:
        current.title ===
          'Service Invoice' ||
        !current.title
          ? `${
              job.title || 'Service'
            } - Invoice`
          : current.title,

      description:
        job.description ||
        current.description,

      items:
        Number(
          job.agreed_amount || 0
        ) > 0
          ? [
              {
                id: null,
                description:
                  job.title ||
                  'Service',
                quantity: 1,
                unit_price:
                  Number(
                    job.agreed_amount
                  ),
                amount:
                  Number(
                    job.agreed_amount
                  ),
              },
            ]
          : current.items,
    }));

    if (customer) {
      populateCustomer(customer);
    }
  }

  function handleQuoteChange(
    quoteId
  ) {
    const quote = quotes.find(
      (item) => item.id === quoteId
    );

    if (!quote) {
      updateField(
        'quote_id',
        ''
      );
      return;
    }

    if (
      form.customer_id &&
      quote.customer_id !==
        form.customer_id
    ) {
      setError(
        'This quote belongs to a different customer.'
      );
      return;
    }

    const customer =
      customers.find(
        (item) =>
          item.id ===
          quote.customer_id
      );

    const relatedJob = jobs.find(
      (job) =>
        job.quote_id === quote.id
    );

    setForm((current) => ({
      ...current,

      quote_id: quote.id,

      job_id:
        relatedJob?.id ||
        current.job_id,

      customer_id:
        quote.customer_id ||
        current.customer_id,

      customer_name:
        quote.customer_name ||
        current.customer_name,

      customer_email:
        quote.customer_email ||
        current.customer_email,

      customer_phone:
        quote.customer_phone ||
        current.customer_phone,

      customer_whatsapp:
        quote.customer_whatsapp ||
        current.customer_whatsapp,

      company_name:
        quote.company_name ||
        current.company_name,

      title:
        quote.title
          ? `${quote.title} - Invoice`
          : current.title,

      description:
        quote.description ||
        current.description,

      discount:
        Number(
          quote.discount || 0
        ),

      tax:
        Number(
          quote.tax || 0
        ),

      items: [
        {
          id: null,
          description:
            quote.title ||
            'Quoted Service',
          quantity: 1,
          unit_price:
            Number(
              quote.total || 0
            ),
          amount:
            Number(
              quote.total || 0
            ),
        },
      ],

      customer_notes:
        quote.customer_notes ||
        current.customer_notes,

      terms:
        quote.terms ||
        current.terms,
    }));

    if (customer) {
      populateCustomer(customer);
    }
  }

  async function saveInvoice(
    e
  ) {
    e.preventDefault();

    resetMessage();

    if (!form.customer_id) {
      setError(
        'Please select a customer.'
      );
      return;
    }

    if (!form.customer_name.trim()) {
      setError(
        'Customer name is required.'
      );
      return;
    }

    if (!form.title.trim()) {
      setError(
        'Invoice title is required.'
      );
      return;
    }

    if (!form.issue_date) {
      setError(
        'Issue date is required.'
      );
      return;
    }

    if (
      form.due_date &&
      new Date(form.due_date) <
        new Date(form.issue_date)
    ) {
      setError(
        'Due date cannot be earlier than the issue date.'
      );
      return;
    }

    const validItems =
      form.items.filter(
        (item) =>
          item.description.trim() &&
          Number(item.quantity) > 0
      );

    if (!validItems.length) {
      setError(
        'Add at least one invoice item.'
      );
      return;
    }

    setSaving(true);

    try {
      const userResult =
        await supabase.auth.getUser();

      const userId =
        userResult.data?.user?.id ||
        null;

      const existingAmountPaid =
        form.id
          ? Number(
              form.amount_paid || 0
            )
          : 0;

      const calculatedBalance =
        Math.max(
          0,
          total - existingAmountPaid
        );

      let calculatedStatus =
        form.status;

      if (
        calculatedBalance <= 0 &&
        total > 0 &&
        form.status !==
          'cancelled'
      ) {
        calculatedStatus =
          'paid';
      } else if (
        existingAmountPaid > 0 &&
        calculatedBalance > 0 &&
        form.status !==
          'cancelled' &&
        form.status !== 'draft'
      ) {
        calculatedStatus =
          'partially_paid';
      }

      const invoiceData = {
        invoice_number:
          form.invoice_number.trim() ||
          generateInvoiceNumber(),

        customer_id:
          form.customer_id || null,

        job_id:
          form.job_id || null,

        quote_id:
          form.quote_id || null,

        customer_name:
          form.customer_name.trim(),

        customer_email:
          form.customer_email.trim() ||
          null,

        customer_phone:
          form.customer_phone.trim() ||
          null,

        customer_whatsapp:
          form.customer_whatsapp.trim() ||
          null,

        company_name:
          form.company_name.trim() ||
          null,

        title:
          form.title.trim(),

        description:
          form.description.trim() ||
          null,

        status:
          calculatedStatus,

        issue_date:
          new Date(
            form.issue_date
          ).toISOString(),

        due_date:
          form.due_date
            ? new Date(
                form.due_date
              ).toISOString()
            : null,

        subtotal,

        discount,

        tax,

        total,

        amount_paid:
          existingAmountPaid,

        balance_due:
          calculatedBalance,

        currency:
          form.currency || 'NGN',

        customer_notes:
          form.customer_notes.trim() ||
          null,

        terms:
          form.terms.trim() ||
          null,

        admin_notes:
          form.admin_notes.trim() ||
          null,

        created_by:
          form.id
            ? form.created_by ||
              userId
            : userId,

        updated_at:
          new Date().toISOString(),
      };

      let savedInvoice;

      if (form.id) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', form.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        savedInvoice = data;

        const {
          error:
            deleteItemsError,
        } = await supabase
          .from('invoice_items')
          .delete()
          .eq(
            'invoice_id',
            form.id
          );

        if (deleteItemsError) {
          throw deleteItemsError;
        }
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        savedInvoice = data;
      }

      const itemPayload =
        validItems.map(
          (item, index) => ({
            invoice_id:
              savedInvoice.id,

            description:
              item.description.trim(),

            quantity:
              Number(item.quantity),

            unit_price:
              Number(
                item.unit_price || 0
              ),

            amount:
              Number(
                item.quantity || 0
              ) *
              Number(
                item.unit_price || 0
              ),

            sort_order: index,

            updated_at:
              new Date().toISOString(),
          })
        );

      const {
        error:
          itemsInsertError,
      } = await supabase
        .from('invoice_items')
        .insert(itemPayload);

      if (itemsInsertError) {
        throw itemsInsertError;
      }

      setMessage(
        form.id
          ? 'Invoice updated successfully.'
          : 'Invoice created successfully.'
      );

      setForm(emptyForm);

      await loadData();

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (saveError) {
      console.error(
        'Invoice save error:',
        saveError
      );

      setError(
        saveError.message ||
          'Unable to save invoice.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteInvoice(
    invoice
  ) {
    const confirmed =
      window.confirm(
        `Delete invoice ${invoice.invoice_number}? This cannot be undone.`
      );

    if (!confirmed) return;

    resetMessage();

    const {
      error: deleteError,
    } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice.id);

    if (deleteError) {
      setError(
        deleteError.message
      );
      return;
    }

    setMessage(
      'Invoice deleted successfully.'
    );

    if (
      form.id === invoice.id
    ) {
      setForm(emptyForm);
    }

    await loadData();
  }

  async function updateInvoiceStatus(
    invoice,
    status
  ) {
    resetMessage();

    const amountPaid =
      Number(
        invoice.amount_paid || 0
      );

    let nextStatus = status;

    if (
      status === 'sent' &&
      amountPaid > 0 &&
      amountPaid <
        Number(
          invoice.total || 0
        )
    ) {
      nextStatus =
        'partially_paid';
    }

    if (
      status === 'sent' &&
      amountPaid >=
        Number(
          invoice.total || 0
        ) &&
      Number(
        invoice.total || 0
      ) > 0
    ) {
      nextStatus = 'paid';
    }

    const {
      error: updateError,
    } = await supabase
      .from('invoices')
      .update({
        status: nextStatus,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        invoice.id
      );

    if (updateError) {
      setError(
        updateError.message
      );
      return;
    }

    setMessage(
      `Invoice marked as ${statusLabel(
        nextStatus
      )}.`
    );

    await loadData();
  }

  function openCustomer(
    customerId
  ) {
    if (!customerId) return;

    window.location.href =
      `/admin/customers?customer=${customerId}`;
  }

  function openJob(jobId) {
    if (!jobId) return;

    window.location.href =
      `/admin/jobs?edit=${jobId}`;
  }

  function openQuote(
    quoteId
  ) {
    if (!quoteId) return;

    window.location.href =
      `/admin/quotes?edit=${quoteId}`;
  }

  function printInvoice(
    invoiceId
  ) {
    window.open(
      `/admin/invoices/print?id=${invoiceId}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function printPaymentReceipt(
    paymentId
  ) {
    if (!paymentId) return;

    window.open(
      `/admin/receipts/print?id=${paymentId}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function openPayment(
    payment
  ) {
    if (!payment?.id) return;

    window.location.href =
      `/admin/payments?edit=${payment.id}`;
  }

  function togglePaymentHistory(
    invoiceId
  ) {
    setExpandedInvoices(
      (current) => ({
        ...current,
        [invoiceId]:
          !current[invoiceId],
      })
    );
  }

  function getInvoicePayments(
    invoiceId
  ) {
    return payments.filter(
      (payment) =>
        payment.invoice_id ===
        invoiceId
    );
  }

  function getInvoicePaymentTotal(
    invoiceId
  ) {
    return getInvoicePayments(
      invoiceId
    ).reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );
  }

  function getInvoiceOutstanding(
    invoice
  ) {
    const paymentTotal =
      getInvoicePaymentTotal(
        invoice.id
      );

    const invoiceTotal =
      Number(
        invoice.total || 0
      );

    const storedBalance =
      Number(
        invoice.balance_due || 0
      );

    if (
      paymentTotal > 0 ||
      storedBalance === 0
    ) {
      return Math.max(
        0,
        invoiceTotal -
          paymentTotal
      );
    }

    return Math.max(
      0,
      storedBalance
    );
  }

  function closePaymentModal() {
    if (paymentSaving) return;

    setPaymentModalOpen(false);
    setPaymentTarget(null);
    setPaymentForm(
      emptyPaymentForm
    );
  }

  function updatePaymentField(
    field,
    value
  ) {
    setPaymentForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function openRecordPayment(
    invoice,
    options = {}
  ) {
    resetMessage();

    if (!invoice?.id) return;

    if (
      invoice.status ===
      'cancelled'
    ) {
      setError(
        'Cancelled invoices cannot receive payments.'
      );
      return;
    }

    const outstanding =
      getInvoiceOutstanding(
        invoice
      );

    if (outstanding <= 0) {
      setMessage(
        'This invoice has no outstanding balance.'
      );
      return;
    }

    const defaultAmount =
      options.fullAmount
        ? outstanding
        : '';

    setPaymentTarget(invoice);

    setPaymentForm({
      ...emptyPaymentForm,

      invoice_id:
        invoice.id,

      amount:
        defaultAmount,

      payment_method:
        normalizePaymentMethod(
          options.paymentMethod ||
          'bank_transfer'
        ),

      payment_reference: '',

      payment_date:
        toDateTimeLocal(
          new Date().toISOString()
        ),

      receipt_note:
        options.receiptNote ||
        '',

      notes: '',
    });

    setPaymentModalOpen(true);
  }

  async function refreshInvoiceAfterPayment(
    invoiceId
  ) {
    const {
      data: paymentRows,
      error: paymentError,
    } = await supabase
      .from('payments')
      .select('*')
      .eq(
        'invoice_id',
        invoiceId
      );

    if (paymentError) {
      throw paymentError;
    }

    const paymentTotal =
      (paymentRows || []).reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

    const invoice =
      invoices.find(
        (item) =>
          item.id === invoiceId
      ) || null;

    if (!invoice) {
      return;
    }

    const invoiceTotal =
      Number(
        invoice.total || 0
      );

    const balanceDue =
      Math.max(
        0,
        invoiceTotal -
          paymentTotal
      );

    let nextStatus =
      invoice.status;

    if (
      invoice.status !==
      'cancelled'
    ) {
      if (
        balanceDue <= 0 &&
        invoiceTotal > 0
      ) {
        nextStatus = 'paid';
      } else if (
        paymentTotal > 0
      ) {
        nextStatus =
          'partially_paid';
      } else if (
        invoice.status ===
          'partially_paid' ||
        invoice.status === 'paid'
      ) {
        nextStatus = 'sent';
      }
    }

    const {
      data: updatedInvoice,
      error: invoiceError,
    } = await supabase
      .from('invoices')
      .update({
        amount_paid:
          paymentTotal,

        balance_due:
          balanceDue,

        status:
          nextStatus,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        invoiceId
      )
      .select()
      .single();

    if (invoiceError) {
      throw invoiceError;
    }

    setInvoices(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            invoiceId
              ? updatedInvoice
              : item
        )
    );

    setPayments(
      paymentRows || []
    );

    return updatedInvoice;
  }

  async function savePayment() {
    if (!paymentTarget) return;

    setPaymentSaving(true);
    resetMessage();

    try {
      const amount =
        Number(
          paymentForm.amount || 0
        );

      const outstanding =
        getInvoiceOutstanding(
          paymentTarget
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setError(
          'Enter a valid payment amount.'
        );
        setPaymentSaving(false);
        return;
      }

      if (
        amount >
        outstanding + 0.01
      ) {
        setError(
          `Payment cannot be greater than the outstanding balance of ${formatMoney(
            outstanding,
            paymentTarget.currency
          )}.`
        );
        setPaymentSaving(false);
        return;
      }

      const safePaymentMethod =
        normalizePaymentMethod(
          paymentForm.payment_method
        );

      if (!safePaymentMethod) {
        setError(
          'Please select a payment method.'
        );
        setPaymentSaving(false);
        return;
      }

      if (
        !paymentForm.payment_date
      ) {
        setError(
          'Payment date is required.'
        );
        setPaymentSaving(false);
        return;
      }

      const userResult =
        await supabase.auth.getUser();

      const userId =
        userResult.data?.user?.id ||
        null;

      const paymentData = {
        payment_number:
          generatePaymentNumber(),

        invoice_id:
          paymentTarget.id,

        customer_id:
          paymentTarget.customer_id ||
          null,

        job_id:
          paymentTarget.job_id ||
          null,

        amount,

        currency:
          paymentTarget.currency ||
          'NGN',

        payment_method:
          safePaymentMethod,

        payment_reference:
          paymentForm.payment_reference.trim() ||
          null,

        payment_date:
          new Date(
            paymentForm.payment_date
          ).toISOString(),

        notes:
          paymentForm.notes.trim() ||
          null,

        receipt_note:
          paymentForm.receipt_note.trim() ||
          null,

        received_by:
          userId,
      };

      const {
        data: createdPayment,
        error: paymentError,
      } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        throw paymentError;
      }

      await refreshInvoiceAfterPayment(
        paymentTarget.id
      );

      setExpandedInvoices(
        (current) => ({
          ...current,
          [paymentTarget.id]:
            true,
        })
      );

      setMessage(
        `Payment of ${formatMoney(
          amount,
          paymentTarget.currency
        )} recorded successfully.`
      );

      setPaymentModalOpen(false);
      setPaymentTarget(null);
      setPaymentForm(
        emptyPaymentForm
      );

      if (
        createdPayment?.id
      ) {
        setTimeout(() => {
          printPaymentReceipt(
            createdPayment.id
          );
        }, 250);
      }

      await loadData();
    } catch (paymentError) {
      console.error(
        'Payment save error:',
        paymentError
      );

      setError(
        paymentError.message ||
          'Unable to record payment.'
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  async function markInvoicePaid(
    invoice
  ) {
    resetMessage();

    if (!invoice?.id) return;

    const outstanding =
      getInvoiceOutstanding(
        invoice
      );

    if (outstanding <= 0) {
      await refreshInvoiceAfterPayment(
        invoice.id
      );

      setMessage(
        'This invoice is already fully paid.'
      );

      return;
    }

    openRecordPayment(
      invoice,
      {
        fullAmount: true,
        paymentMethod:
          'Other',
        receiptNote:
          `Full payment recorded for invoice ${invoice.invoice_number}.`,
      }
    );
  }

  const filteredInvoices =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return invoices.filter(
        (invoice) => {
          const actualStatus =
            effectiveStatus(
              invoice
            );

          const matchesStatus =
            statusFilter === 'all' ||
            actualStatus ===
              statusFilter;

          if (!matchesStatus) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            invoice.invoice_number,
            invoice.customer_name,
            invoice.company_name,
            invoice.customer_email,
            invoice.customer_phone,
            invoice.title,
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
      invoices,
      search,
      statusFilter,
    ]);

  const stats = useMemo(() => {
    const totalInvoiced =
      invoices.reduce(
        (sum, invoice) =>
          sum +
          Number(
            invoice.total || 0
          ),
        0
      );

    const totalPaid =
      invoices.reduce(
        (sum, invoice) =>
          sum +
          Number(
            invoice.amount_paid ||
              0
          ),
        0
      );

    const outstanding =
      invoices.reduce(
        (sum, invoice) =>
          sum +
          Number(
            invoice.balance_due ||
              0
          ),
        0
      );

    const overdue =
      invoices
        .filter(
          (invoice) =>
            effectiveStatus(
              invoice
            ) === 'overdue'
        )
        .reduce(
          (sum, invoice) =>
            sum +
            Number(
              invoice.balance_due ||
                0
            ),
          0
        );

    return {
      count: invoices.length,
      totalInvoiced,
      totalPaid,
      outstanding,
      overdue,
    };
  }, [invoices]);

  return (
    <section className="invoice-page">

      <style>{`
        .invoice-page {
          min-height: 100vh;
          padding: 28px;
          background: #f7f8fb;
          color: #172033;
        }

        .invoice-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .invoice-eyebrow {
          display: inline-block;
          margin-bottom: 8px;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .invoice-header h1 {
          margin: 0;
          color: #111827;
          font-size: 30px;
          line-height: 1.15;
        }

        .invoice-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .invoice-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 5px 20px rgba(15, 23, 42, 0.045);
        }

        .invoice-btn {
          border: 1px solid #d1d5db;
          background: #fff;
          color: #374151;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .invoice-btn:hover {
          border-color: #94a3b8;
          transform: translateY(-1px);
        }

        .invoice-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .invoice-btn.primary {
          border-color: #111827;
          background: #111827;
          color: #fff;
        }

        .invoice-btn.success {
          border-color: #a7f3d0;
          background: #ecfdf5;
          color: #047857;
        }

        .invoice-btn.danger {
          border-color: #fecaca;
          background: #fff1f2;
          color: #be123c;
        }

        .invoice-btn.small {
          padding: 7px 10px;
          font-size: 11px;
          border-radius: 8px;
        }

        .invoice-stats {
          display: grid;
          grid-template-columns: repeat(
            5,
            minmax(0, 1fr)
          );
          gap: 13px;
          margin-bottom: 20px;
        }

        .invoice-stat {
          padding: 18px;
        }

        .invoice-stat-label {
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          margin-bottom: 8px;
        }

        .invoice-stat-value {
          color: #111827;
          font-size: 20px;
          font-weight: 850;
        }

        .invoice-stat-sub {
          margin-top: 5px;
          color: #94a3b8;
          font-size: 11px;
        }

        .invoice-toolbar {
          padding: 14px;
          margin-bottom: 18px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .invoice-input,
        .invoice-select,
        .invoice-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          background: #fff;
          color: #111827;
          padding: 11px 12px;
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .invoice-input:focus,
        .invoice-select:focus,
        .invoice-textarea:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.08);
        }

        .invoice-search {
          flex: 1 1 320px;
        }

        .invoice-filter {
          flex: 0 1 190px;
        }

        .invoice-message {
          padding: 12px 14px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          font-size: 13px;
          font-weight: 650;
        }

        .invoice-error {
          padding: 12px 14px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
          font-size: 13px;
        }

        .invoice-form-card {
          padding: 24px;
          margin-bottom: 20px;
        }

        .invoice-section {
          padding: 24px 0;
          border-bottom: 1px solid #edf0f4;
        }

        .invoice-section:first-child {
          padding-top: 0;
        }

        .invoice-section:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .invoice-section-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }

        .invoice-section-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 9px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 850;
        }

        .invoice-section-header h2 {
          margin: 0;
          color: #111827;
          font-size: 17px;
        }

        .invoice-section-header p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .invoice-grid {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 15px;
        }

        .invoice-grid.three {
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
        }

        .invoice-field label {
          display: block;
          margin-bottom: 7px;
          color: #334155;
          font-size: 12px;
          font-weight: 750;
        }

        .invoice-field small {
          display: block;
          margin-top: 6px;
          color: #94a3b8;
          font-size: 11px;
        }

        .invoice-full {
          grid-column: 1 / -1;
        }

        .customer-preview {
          margin-top: 15px;
          padding: 15px;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
        }

        .customer-preview strong {
          display: block;
          color: #111827;
          font-size: 14px;
        }

        .customer-preview span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
        }

        .items-table th {
          padding: 10px;
          text-align: left;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          font-size: 11px;
          font-weight: 800;
        }

        .items-table td {
          padding: 9px;
          border-bottom: 1px solid #edf0f4;
          vertical-align: middle;
        }

        .item-description {
          min-width: 260px;
        }

        .item-number {
          width: 80px;
        }

        .item-price {
          width: 150px;
        }

        .item-amount {
          width: 150px;
          color: #111827;
          font-weight: 800;
          white-space: nowrap;
        }

        .invoice-add-item {
          margin-top: 12px;
        }

        .invoice-summary {
          margin-left: auto;
          width: min(390px, 100%);
          margin-top: 20px;
          padding: 17px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          border-radius: 12px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 7px 0;
          color: #64748b;
          font-size: 13px;
        }

        .summary-row strong {
          color: #334155;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding-top: 13px;
          margin-top: 8px;
          border-top: 1px solid #dbe0e7;
          color: #111827;
          font-size: 17px;
          font-weight: 850;
        }

        .invoice-save-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding-top: 22px;
          margin-top: 22px;
          border-top: 1px solid #edf0f4;
        }

        .invoice-save-copy strong {
          display: block;
          color: #111827;
          font-size: 13px;
        }

        .invoice-save-copy span {
          display: block;
          margin-top: 4px;
          color: #94a3b8;
          font-size: 11px;
        }

        .invoice-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .invoice-list-card {
          overflow: hidden;
        }

        .invoice-list-header {
          padding: 20px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid #edf0f4;
          flex-wrap: wrap;
        }

        .invoice-list-header h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
        }

        .invoice-list-header p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .invoice-list {
          display: grid;
        }

        .invoice-row {
          padding: 18px 22px;
          border-bottom: 1px solid #edf0f4;
          transition: 0.16s ease;
        }

        .invoice-row:last-child {
          border-bottom: 0;
        }

        .invoice-row:hover {
          background: #fafbfc;
        }

        .invoice-row-main {
          display: grid;
          grid-template-columns:
            minmax(220px, 1.5fr)
            minmax(150px, 1fr)
            minmax(130px, .8fr)
            minmax(110px, .7fr)
            minmax(230px, 1.4fr);
          gap: 18px;
          align-items: center;
        }

        .invoice-number {
          color: #111827;
          font-size: 14px;
          font-weight: 850;
        }

        .invoice-title {
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
        }

        .invoice-customer {
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }

        .invoice-company {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 11px;
        }

        .invoice-amount {
          color: #111827;
          font-size: 14px;
          font-weight: 800;
        }

        .invoice-balance {
          margin-top: 4px;
          color: #be123c;
          font-size: 11px;
          font-weight: 700;
        }

        .invoice-date {
          color: #64748b;
          font-size: 12px;
        }

        .invoice-row-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* PAYMENT HISTORY */

        .payment-history-toggle {
          margin-top: 14px;
          padding-top: 13px;
          border-top: 1px solid #edf0f4;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .payment-history-summary {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .payment-history-count {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          font-size: 11px;
          font-weight: 800;
        }

        .payment-history-total {
          color: #047857;
          font-size: 12px;
          font-weight: 800;
        }

        .payment-history-list {
          margin-top: 13px;
          padding: 13px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: grid;
          gap: 9px;
        }

        .payment-history-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 11px;
          padding: 13px;
        }

        .payment-history-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .payment-number {
          color: #111827;
          font-size: 12px;
          font-weight: 850;
        }

        .payment-title {
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
        }

        .payment-amount {
          color: #047857;
          font-size: 15px;
          font-weight: 850;
        }

        .payment-history-details {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 10px;
          margin-top: 12px;
          padding-top: 11px;
          border-top: 1px solid #edf0f4;
        }

        .payment-history-detail-label {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .5px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .payment-history-detail-value {
          color: #334155;
          font-size: 11px;
          font-weight: 650;
          word-break: break-word;
        }

        .payment-receipt-note {
          margin-top: 11px;
          padding: 9px 10px;
          border-radius: 8px;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .payment-history-actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .payment-history-empty {
          padding: 18px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }

        .payment-loading {
          padding: 12px;
          color: #94a3b8;
          font-size: 11px;
        }

        .empty-invoices {
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        .empty-invoices-icon {
          font-size: 38px;
          margin-bottom: 12px;
        }

        /* PAYMENT MODAL */

        .payment-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15, 23, 42, 0.62);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }

        .payment-modal {
          width: min(620px, 100%);
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.25);
          overflow: hidden;
        }

        .payment-modal-header {
          padding: 21px 22px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .payment-modal-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.3px;
        }

        .payment-modal-header h2 {
          margin: 0;
          color: #111827;
          font-size: 20px;
        }

        .payment-modal-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .payment-modal-close {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #374151;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }

        .payment-modal-body {
          padding: 22px;
        }

        .payment-invoice-summary {
          padding: 15px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          margin-bottom: 19px;
        }

        .payment-invoice-summary-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          flex-wrap: wrap;
        }

        .payment-invoice-number {
          color: #111827;
          font-size: 14px;
          font-weight: 850;
        }

        .payment-invoice-customer {
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
        }

        .payment-outstanding {
          text-align: right;
        }

        .payment-outstanding-label {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .payment-outstanding-value {
          margin-top: 3px;
          color: #be123c;
          font-size: 18px;
          font-weight: 850;
        }

        .payment-form-grid {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 15px;
        }

        .payment-form-field label {
          display: block;
          margin-bottom: 7px;
          color: #334155;
          font-size: 12px;
          font-weight: 750;
        }

        .payment-form-full {
          grid-column: 1 / -1;
        }

        .payment-modal-footer {
          padding: 17px 22px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          flex-wrap: wrap;
        }

        .payment-amount-helper {
          margin-top: 6px;
          color: #94a3b8;
          font-size: 11px;
        }

        @media (max-width: 1050px) {
          .invoice-stats {
            grid-template-columns: repeat(3, 1fr);
          }

          .invoice-row-main {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .invoice-row-actions {
            justify-content: flex-start;
          }

          .payment-history-details {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .invoice-page {
            padding: 18px 13px 40px;
          }

          .invoice-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .invoice-grid,
          .invoice-grid.three,
          .payment-form-grid {
            grid-template-columns: 1fr;
          }

          .invoice-form-card {
            padding: 18px;
          }

          .invoice-section {
            padding: 20px 0;
          }

          .invoice-row {
            padding: 17px;
          }

          .invoice-row-main {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .invoice-save-bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .invoice-actions {
            justify-content: flex-start;
          }

          .invoice-summary {
            width: 100%;
          }

          .items-table-wrapper {
            overflow-x: auto;
          }

          .items-table {
            min-width: 850px;
          }

          .payment-history-details {
            grid-template-columns: 1fr 1fr;
          }

          .payment-outstanding {
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .invoice-stats {
            grid-template-columns: 1fr;
          }

          .invoice-header h1 {
            font-size: 25px;
          }

          .invoice-row-actions {
            width: 100%;
          }

          .invoice-row-actions .invoice-btn {
            flex: 1 1 auto;
          }

          .payment-history-details {
            grid-template-columns: 1fr;
          }

          .payment-history-actions .invoice-btn {
            flex: 1 1 auto;
          }

          .payment-modal-overlay {
            padding: 10px;
          }

          .payment-modal-body {
            padding: 17px;
          }

          .payment-modal-header {
            padding: 17px;
          }

          .payment-modal-footer {
            padding: 14px 17px;
          }
        }
      `}</style>

      <div className="invoice-container">

        {/* HEADER */}
        <div className="invoice-header">

          <div>
            <span className="invoice-eyebrow">
              FINANCE / BILLING
            </span>

            <h1>
              Invoices
            </h1>

            <p>
              Create, manage and track customer
              invoices.
            </p>
          </div>

          <button
            type="button"
            className="invoice-btn primary"
            onClick={newInvoice}
          >
            + New Invoice
          </button>

        </div>

        {message && (
          <div className="invoice-message">
            {message}
          </div>
        )}

        {error && (
          <div className="invoice-error">
            {error}
          </div>
        )}

        {/* STATS */}
        <div className="invoice-stats">

          <div className="invoice-card invoice-stat">
            <div className="invoice-stat-label">
              TOTAL INVOICES
            </div>

            <div className="invoice-stat-value">
              {stats.count}
            </div>

            <div className="invoice-stat-sub">
              All invoices
            </div>
          </div>

          <div className="invoice-card invoice-stat">
            <div className="invoice-stat-label">
              TOTAL INVOICED
            </div>

            <div className="invoice-stat-value">
              {formatMoney(
                stats.totalInvoiced
              )}
            </div>

            <div className="invoice-stat-sub">
              Invoice value
            </div>
          </div>

          <div className="invoice-card invoice-stat">
            <div className="invoice-stat-label">
              RECEIVED
            </div>

            <div className="invoice-stat-value">
              {formatMoney(
                stats.totalPaid
              )}
            </div>

            <div className="invoice-stat-sub">
              Payments recorded
            </div>
          </div>

          <div className="invoice-card invoice-stat">
            <div className="invoice-stat-label">
              OUTSTANDING
            </div>

            <div className="invoice-stat-value">
              {formatMoney(
                stats.outstanding
              )}
            </div>

            <div className="invoice-stat-sub">
              Balance due
            </div>
          </div>

          <div className="invoice-card invoice-stat">
            <div className="invoice-stat-label">
              OVERDUE
            </div>

            <div className="invoice-stat-value">
              {formatMoney(
                stats.overdue
              )}
            </div>

            <div className="invoice-stat-sub">
              Overdue balance
            </div>
          </div>

        </div>

        {/* SEARCH / FILTER */}
        <div className="invoice-card invoice-toolbar">

          <div className="invoice-search">
            <input
              className="invoice-input"
              type="search"
              placeholder="Search invoice number, customer, company or title..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />
          </div>

          <div className="invoice-filter">
            <select
              className="invoice-select"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >
              <option value="all">
                All Statuses
              </option>

              {statusOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>

          <button
            type="button"
            className="invoice-btn"
            onClick={loadData}
            disabled={
              loading ||
              paymentsLoading
            }
          >
            {loading ||
            paymentsLoading
              ? 'Refreshing...'
              : '↻ Refresh'}
          </button>

        </div>

        {/* CREATE / EDIT */}
        <div className="invoice-card invoice-form-card">

          {/* 01 */}
          <div className="invoice-section">

            <div className="invoice-section-header">
              <span className="invoice-section-number">
                01
              </span>

              <div>
                <h2>
                  Invoice Information
                </h2>

                <p>
                  Basic details and customer
                  relationship.
                </p>
              </div>
            </div>

            <div className="invoice-grid three">

              <div className="invoice-field">
                <label>
                  Invoice Number
                </label>

                <input
                  className="invoice-input"
                  value={
                    form.invoice_number
                  }
                  onChange={(e) =>
                    updateField(
                      'invoice_number',
                      e.target.value
                    )
                  }
                  placeholder="VD-INV-202609-0001"
                />
              </div>

              <div className="invoice-field">
                <label>
                  Issue Date
                </label>

                <input
                  className="invoice-input"
                  type="datetime-local"
                  value={
                    form.issue_date
                  }
                  onChange={(e) =>
                    updateField(
                      'issue_date',
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>
                  Due Date
                </label>

                <input
                  className="invoice-input"
                  type="datetime-local"
                  value={
                    form.due_date
                  }
                  onChange={(e) =>
                    updateField(
                      'due_date',
                      e.target.value
                    )
                  }
                />

                <small>
                  Leave empty if there is
                  no payment deadline.
                </small>
              </div>

              <div className="invoice-field">
                <label>
                  Customer
                </label>

                <select
                  className="invoice-select"
                  value={
                    form.customer_id
                  }
                  onChange={(e) =>
                    handleCustomerChange(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {
                          customer.full_name
                        }
                        {customer.company_name
                          ? ` — ${customer.company_name}`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="invoice-field">
                <label>
                  Related Job
                </label>

                <select
                  className="invoice-select"
                  value={
                    form.job_id
                  }
                  onChange={(e) =>
                    handleJobChange(
                      e.target.value
                    )
                  }
                  disabled={
                    !form.customer_id
                  }
                >
                  <option value="">
                    {form.customer_id
                      ? 'Select job'
                      : 'Select customer first'}
                  </option>

                  {filteredJobs.map(
                    (job) => (
                      <option
                        key={job.id}
                        value={job.id}
                      >
                        {
                          job.job_number
                        }
                        {' — '}
                        {job.title}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="invoice-field">
                <label>
                  Related Quote
                </label>

                <select
                  className="invoice-select"
                  value={
                    form.quote_id
                  }
                  onChange={(e) =>
                    handleQuoteChange(
                      e.target.value
                    )
                  }
                  disabled={
                    !form.customer_id
                  }
                >
                  <option value="">
                    {form.customer_id
                      ? 'Select quote'
                      : 'Select customer first'}
                  </option>

                  {filteredQuotes.map(
                    (quote) => (
                      <option
                        key={quote.id}
                        value={quote.id}
                      >
                        {
                          quote.quote_number
                        }
                        {' — '}
                        {quote.title ||
                          'Service Quote'}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="invoice-field invoice-full">
                <label>
                  Invoice Title
                </label>

                <input
                  className="invoice-input"
                  value={
                    form.title
                  }
                  onChange={(e) =>
                    updateField(
                      'title',
                      e.target.value
                    )
                  }
                  placeholder="Service Invoice"
                />
              </div>

            </div>

            {selectedCustomer && (
              <div className="customer-preview">

                <div>
                  <strong>
                    {
                      selectedCustomer.full_name
                    }
                  </strong>

                  <span>
                    {
                      selectedCustomer.email ||
                      'No email'
                    }
                    {selectedCustomer.phone
                      ? ` • ${selectedCustomer.phone}`
                      : ''}
                  </span>
                </div>

                <div>
                  <span>
                    {
                      selectedCustomer.company_name ||
                      'Individual customer'
                    }
                  </span>

                  <span>
                    Customer relationship linked
                  </span>
                </div>

                <button
                  type="button"
                  className="invoice-btn small"
                  onClick={() =>
                    openCustomer(
                      selectedCustomer.id
                    )
                  }
                >
                  View Customer
                </button>

              </div>
            )}

          </div>

          {/* 02 */}
          <div className="invoice-section">

            <div className="invoice-section-header">
              <span className="invoice-section-number">
                02
              </span>

              <div>
                <h2>
                  Billing Details
                </h2>

                <p>
                  Information that will appear
                  on the invoice.
                </p>
              </div>
            </div>

            <div className="invoice-grid">

              <div className="invoice-field">
                <label>
                  Customer Name
                </label>

                <input
                  className="invoice-input"
                  value={
                    form.customer_name
                  }
                  onChange={(e) =>
                    updateField(
                      'customer_name',
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>
                  Company
                </label>

                <input
                  className="invoice-input"
                  value={
                    form.company_name
                  }
                  onChange={(e) =>
                    updateField(
                      'company_name',
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>
                  Email
                </label>

                <input
                  className="invoice-input"
                  type="email"
                  value={
                    form.customer_email
                  }
                  onChange={(e) =>
                    updateField(
                      'customer_email',
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>
                  Phone
                </label>

                <input
                  className="invoice-input"
                  value={
                    form.customer_phone
                  }
                  onChange={(e) =>
                    updateField(
                      'customer_phone',
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>
                  WhatsApp
                </label>

                <input
                  className="invoice-input"
                  value={
                    form.customer_whatsapp
                  }
                  onChange={(e) =>
                    updateField(
                      'customer_whatsapp',
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="invoice-field">
                <label>
                  Currency
                </label>

                <select
                  className="invoice-select"
                  value={
                    form.currency
                  }
                  onChange={(e) =>
                    updateField(
                      'currency',
                      e.target.value
                    )
                  }
                >
                  <option value="NGN">
                    Nigerian Naira (NGN)
                  </option>

                  <option value="USD">
                    US Dollar (USD)
                  </option>

                  <option value="GBP">
                    British Pound (GBP)
                  </option>

                  <option value="EUR">
                    Euro (EUR)
                  </option>
                </select>
              </div>

            </div>

          </div>

          {/* 03 */}
          <div className="invoice-section">

            <div className="invoice-section-header">
              <span className="invoice-section-number">
                03
              </span>

              <div>
                <h2>
                  Invoice Items
                </h2>

                <p>
                  Add the services or products
                  being billed.
                </p>
              </div>
            </div>

            <div className="items-table-wrapper">

              <table className="items-table">

                <thead>
                  <tr>
                    <th>
                      Description
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Unit Price
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {form.items.map(
                    (item, index) => (
                      <tr
                        key={index}
                      >

                        <td className="item-description">
                          <input
                            className="invoice-input"
                            value={
                              item.description
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            placeholder="Website design and development"
                          />
                        </td>

                        <td className="item-number">
                          <input
                            className="invoice-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.quantity
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                'quantity',
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="item-price">
                          <input
                            className="invoice-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.unit_price
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                'unit_price',
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="item-amount">
                          {formatMoney(
                            item.amount,
                            form.currency
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="invoice-btn danger small"
                            onClick={() =>
                              removeItem(
                                index
                              )
                            }
                            disabled={
                              form.items
                                .length ===
                              1
                            }
                          >
                            Remove
                          </button>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            <div className="invoice-add-item">

              <button
                type="button"
                className="invoice-btn"
                onClick={addItem}
              >
                + Add Item
              </button>

            </div>

            <div className="invoice-summary">

              <div className="summary-row">
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatMoney(
                    subtotal,
                    form.currency
                  )}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Discount
                </span>

                <input
                  className="invoice-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.discount
                  }
                  onChange={(e) =>
                    updateField(
                      'discount',
                      e.target.value
                    )
                  }
                  style={{
                    width: '150px',
                    textAlign:
                      'right',
                  }}
                />
              </div>

              <div className="summary-row">
                <span>
                  Tax
                </span>

                <input
                  className="invoice-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.tax
                  }
                  onChange={(e) =>
                    updateField(
                      'tax',
                      e.target.value
                    )
                  }
                  style={{
                    width: '150px',
                    textAlign:
                      'right',
                  }}
                />
              </div>

              <div className="summary-total">
                <span>
                  Total
                </span>

                <span>
                  {formatMoney(
                    total,
                    form.currency
                  )}
                </span>
              </div>

            </div>

          </div>

          {/* 04 */}
          <div className="invoice-section">

            <div className="invoice-section-header">
              <span className="invoice-section-number">
                04
              </span>

              <div>
                <h2>
                  Notes & Terms
                </h2>

                <p>
                  Additional information for the
                  customer and your team.
                </p>
              </div>
            </div>

            <div className="invoice-grid">

              <div className="invoice-field">
                <label>
                  Customer Notes
                </label>

                <textarea
                  className="invoice-textarea"
                  rows="5"
                  value={
                    form.customer_notes
                  }
                  onChange={(e) =>
                    updateField(
                      'customer_notes',
                      e.target.value
                    )
                  }
                  placeholder="Thank you for your business."
                />
              </div>

              <div className="invoice-field">
                <label>
                  Payment Terms
                </label>

                <textarea
                  className="invoice-textarea"
                  rows="5"
                  value={
                    form.terms
                  }
                  onChange={(e) =>
                    updateField(
                      'terms',
                      e.target.value
                    )
                  }
                  placeholder="Payment is due by the stated due date."
                />
              </div>

              <div className="invoice-field invoice-full">
                <label>
                  Internal Admin Notes
                </label>

                <textarea
                  className="invoice-textarea"
                  rows="4"
                  value={
                    form.admin_notes
                  }
                  onChange={(e) =>
                    updateField(
                      'admin_notes',
                      e.target.value
                    )
                  }
                  placeholder="Private notes for the ValueDam team..."
                />
              </div>

            </div>

          </div>

          {/* 05 */}
          <div className="invoice-section">

            <div className="invoice-section-header">
              <span className="invoice-section-number">
                05
              </span>

              <div>
                <h2>
                  Invoice Status
                </h2>

                <p>
                  Control the current billing
                  state of this invoice.
                </p>
              </div>
            </div>

            <div className="invoice-grid">

              <div className="invoice-field">
                <label>
                  Status
                </label>

                <select
                  className="invoice-select"
                  value={
                    form.status
                  }
                  onChange={(e) =>
                    updateField(
                      'status',
                      e.target.value
                    )
                  }
                >
                  {statusOptions.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="invoice-field">
                <label>
                  Current Balance
                </label>

                <input
                  className="invoice-input"
                  value={formatMoney(
                    Math.max(
                      0,
                      total -
                        Number(
                          form.amount_paid ||
                            0
                        )
                    ),
                    form.currency
                  )}
                  readOnly
                />
              </div>

            </div>

          </div>

          {/* SAVE */}
          <div className="invoice-save-bar">

            <div className="invoice-save-copy">

              <strong>
                {form.id
                  ? 'Ready to update this invoice?'
                  : 'Ready to save this invoice?'}
              </strong>

              <span>
                {form.status ===
                'draft'
                  ? 'This invoice will remain a draft.'
                  : `Invoice status: ${statusLabel(
                      form.status
                    )}.`}
              </span>

            </div>

            <div className="invoice-actions">

              {form.id && (
                <button
                  type="button"
                  className="invoice-btn"
                  onClick={newInvoice}
                >
                  + New Invoice
                </button>
              )}

              {form.id && (
                <button
                  type="button"
                  className="invoice-btn"
                  onClick={() =>
                    printInvoice(
                      form.id
                    )
                  }
                >
                  Print / PDF
                </button>
              )}

              <button
                type="submit"
                className="invoice-btn primary"
                onClick={
                  saveInvoice
                }
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : form.id
                    ? 'Update Invoice'
                    : 'Save Invoice'}
              </button>

            </div>

          </div>

        </div>

        {/* EXISTING INVOICES */}
        <div className="invoice-card invoice-list-card">

          <div className="invoice-list-header">

            <div>
              <h2>
                Existing Invoices
              </h2>

              <p>
                View and manage invoices
                already created.
              </p>
            </div>

            <strong
              style={{
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              {filteredInvoices.length}{' '}
              invoice
              {filteredInvoices.length ===
              1
                ? ''
                : 's'}
            </strong>

          </div>

          {loading ? (
            <div className="empty-invoices">
              Loading invoices...
            </div>
          ) : filteredInvoices.length ===
            0 ? (
            <div className="empty-invoices">

              <div className="empty-invoices-icon">
                🧾
              </div>

              <strong
                style={{
                  display:
                    'block',
                  color: '#111827',
                  fontSize: '16px',
                  marginBottom:
                    '6px',
                }}
              >
                No invoices found
              </strong>

              <span>
                Create your first invoice
                using the form above.
              </span>

            </div>
          ) : (
            <div className="invoice-list">

              {filteredInvoices.map(
                (invoice) => {
                  const invoicePayments =
                    getInvoicePayments(
                      invoice.id
                    );

                  const paymentTotal =
                    getInvoicePaymentTotal(
                      invoice.id
                    );

                  const outstanding =
                    getInvoiceOutstanding(
                      invoice
                    );

                  const isExpanded =
                    Boolean(
                      expandedInvoices[
                        invoice.id
                      ]
                    );

                  return (
                    <div
                      key={invoice.id}
                      className="invoice-row"
                    >

                      <div className="invoice-row-main">

                        <div>
                          <div className="invoice-number">
                            {
                              invoice.invoice_number
                            }
                          </div>

                          <div className="invoice-title">
                            {invoice.title ||
                              'Service Invoice'}
                          </div>
                        </div>

                        <div>
                          <div className="invoice-customer">
                            {
                              invoice.customer_name ||
                              'Unknown customer'
                            }
                          </div>

                          <div className="invoice-company">
                            {
                              invoice.company_name ||
                              invoice.customer_email ||
                              '—'
                            }
                          </div>
                        </div>

                        <div>
                          <div className="invoice-amount">
                            {formatMoney(
                              invoice.total,
                              invoice.currency
                            )}
                          </div>

                          {outstanding >
                            0 && (
                            <div className="invoice-balance">
                              Balance:{' '}
                              {formatMoney(
                                outstanding,
                                invoice.currency
                              )}
                            </div>
                          )}
                        </div>

                        <div>

                          <StatusBadge
                            status={effectiveStatus(
                              invoice
                            )}
                          />

                          <div
                            className="invoice-date"
                            style={{
                              marginTop:
                                '7px',
                            }}
                          >
                            Due:{' '}
                            {formatDate(
                              invoice.due_date
                            )}
                          </div>

                        </div>

                        <div className="invoice-row-actions">

                          {invoice.customer_id && (
                            <button
                              type="button"
                              className="invoice-btn small"
                              onClick={() =>
                                openCustomer(
                                  invoice.customer_id
                                )
                              }
                            >
                              Customer
                            </button>
                          )}

                          {invoice.job_id && (
                            <button
                              type="button"
                              className="invoice-btn small"
                              onClick={() =>
                                openJob(
                                  invoice.job_id
                                )
                              }
                            >
                              Job
                            </button>
                          )}

                          {invoice.quote_id && (
                            <button
                              type="button"
                              className="invoice-btn small"
                              onClick={() =>
                                openQuote(
                                  invoice.quote_id
                                )
                              }
                            >
                              Quote
                            </button>
                          )}

                          <button
                            type="button"
                            className="invoice-btn small"
                            onClick={() =>
                              printInvoice(
                                invoice.id
                              )
                            }
                          >
                            PDF
                          </button>

                          <button
                            type="button"
                            className="invoice-btn small"
                            onClick={() =>
                              editInvoice(
                                invoice
                              )
                            }
                          >
                            Edit
                          </button>

                          {invoice.status !==
                            'sent' &&
                            invoice.status !==
                              'paid' &&
                            invoice.status !==
                              'cancelled' && (
                              <button
                                type="button"
                                className="invoice-btn small"
                                onClick={() =>
                                  updateInvoiceStatus(
                                    invoice,
                                    'sent'
                                  )
                                }
                              >
                                Mark Sent
                              </button>
                            )}

                          {outstanding >
                            0 &&
                            invoice.status !==
                              'cancelled' && (
                              <>
                                <button
                                  type="button"
                                  className="invoice-btn success small"
                                  onClick={() =>
                                    openRecordPayment(
                                      invoice
                                    )
                                  }
                                >
                                  Record Payment
                                </button>

                                <button
                                  type="button"
                                  className="invoice-btn small"
                                  onClick={() =>
                                    markInvoicePaid(
                                      invoice
                                    )
                                  }
                                >
                                  Mark Paid
                                </button>
                              </>
                            )}

                          <button
                            type="button"
                            className="invoice-btn danger small"
                            onClick={() =>
                              deleteInvoice(
                                invoice
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                      {/* PAYMENT HISTORY */}
                      <div className="payment-history-toggle">

                        <div className="payment-history-summary">

                          <span className="payment-history-count">
                            {invoicePayments.length}{' '}
                            {invoicePayments.length ===
                            1
                              ? 'payment'
                              : 'payments'}
                          </span>

                          {invoicePayments.length >
                            0 && (
                            <span className="payment-history-total">
                              Recorded:{' '}
                              {formatMoney(
                                paymentTotal,
                                invoice.currency
                              )}
                            </span>
                          )}

                          {invoicePayments.length ===
                            0 && (
                            <span
                              style={{
                                color:
                                  '#94a3b8',
                                fontSize:
                                  '11px',
                              }}
                            >
                              No payments recorded
                              for this invoice yet.
                            </span>
                          )}

                        </div>

                        <button
                          type="button"
                          className="invoice-btn small"
                          onClick={() =>
                            togglePaymentHistory(
                              invoice.id
                            )
                          }
                        >
                          {isExpanded
                            ? 'Hide Payments ↑'
                            : 'View Payments ↓'}
                        </button>

                      </div>

                      {isExpanded && (
                        <div className="payment-history-list">

                          {paymentsLoading ? (
                            <div className="payment-loading">
                              Loading payment history...
                            </div>
                          ) : invoicePayments.length ===
                            0 ? (
                            <div className="payment-history-empty">
                              No payment has been
                              recorded against this
                              invoice yet.
                            </div>
                          ) : (
                            invoicePayments.map(
                              (payment) => (
                                <div
                                  key={
                                    payment.id
                                  }
                                  className="payment-history-card"
                                >

                                  <div className="payment-history-top">

                                    <div>
                                      <div className="payment-number">
                                        {
                                          getPaymentNumber(
                                            payment
                                          )
                                        }
                                      </div>

                                      <div className="payment-title">
                                        {
                                          getPaymentMethod(
                                            payment
                                          )
                                        }
                                        {' • '}
                                        {
                                          formatDateTime(
                                            getPaymentDate(
                                              payment
                                            )
                                          )
                                        }
                                      </div>
                                    </div>

                                    <div className="payment-amount">
                                      {formatMoney(
                                        payment.amount,
                                        payment.currency ||
                                          invoice.currency ||
                                          'NGN'
                                      )}
                                    </div>

                                  </div>

                                  <div className="payment-history-details">

                                    <div>
                                      <div className="payment-history-detail-label">
                                        Method
                                      </div>

                                      <div className="payment-history-detail-value">
                                        {
                                          getPaymentMethod(
                                            payment
                                          )
                                        }
                                      </div>
                                    </div>

                                    <div>
                                      <div className="payment-history-detail-label">
                                        Reference
                                      </div>

                                      <div className="payment-history-detail-value">
                                        {
                                          payment.payment_reference ||
                                          '—'
                                        }
                                      </div>
                                    </div>

                                    <div>
                                      <div className="payment-history-detail-label">
                                        Payment Date
                                      </div>

                                      <div className="payment-history-detail-value">
                                        {formatDate(
                                          getPaymentDate(
                                            payment
                                          )
                                        )}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="payment-history-detail-label">
                                        Customer
                                      </div>

                                      <div className="payment-history-detail-value">
                                        {
                                          invoice.customer_name ||
                                          '—'
                                        }
                                      </div>
                                    </div>

                                  </div>

                                  {payment.receipt_note && (
                                    <div className="payment-receipt-note">
                                      <strong>
                                        Receipt note:
                                      </strong>{' '}
                                      {
                                        payment.receipt_note
                                      }
                                    </div>
                                  )}

                                  <div className="payment-history-actions">

                                    <button
                                      type="button"
                                      className="invoice-btn small"
                                      onClick={() =>
                                        printPaymentReceipt(
                                          payment.id
                                        )
                                      }
                                    >
                                      Receipt / PDF
                                    </button>

                                    <button
                                      type="button"
                                      className="invoice-btn small"
                                      onClick={() =>
                                        openPayment(
                                          payment
                                        )
                                      }
                                    >
                                      View Payment
                                    </button>

                                    {invoice.customer_id && (
                                      <button
                                        type="button"
                                        className="invoice-btn small"
                                        onClick={() =>
                                          openCustomer(
                                            invoice.customer_id
                                          )
                                        }
                                      >
                                        Customer
                                      </button>
                                    )}

                                  </div>

                                </div>
                              )
                            )
                          )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOpen &&
        paymentTarget && (
          <div
            className="payment-modal-overlay"
            onClick={closePaymentModal}
          >
            <div
              className="payment-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="payment-modal-header">

                <div>
                  <span className="payment-modal-eyebrow">
                    FINANCE / PAYMENT
                  </span>

                  <h2>
                    Record Payment
                  </h2>

                  <p>
                    Record an actual payment against
                    this invoice.
                  </p>
                </div>

                <button
                  type="button"
                  className="payment-modal-close"
                  onClick={
                    closePaymentModal
                  }
                  disabled={
                    paymentSaving
                  }
                >
                  ×
                </button>

              </div>

              <div className="payment-modal-body">

                <div className="payment-invoice-summary">

                  <div className="payment-invoice-summary-top">

                    <div>
                      <div className="payment-invoice-number">
                        {
                          paymentTarget.invoice_number
                        }
                      </div>

                      <div className="payment-invoice-customer">
                        {
                          paymentTarget.customer_name ||
                          'Customer'
                        }

                        {paymentTarget.company_name
                          ? ` • ${paymentTarget.company_name}`
                          : ''}
                      </div>
                    </div>

                    <div className="payment-outstanding">

                      <div className="payment-outstanding-label">
                        Outstanding
                      </div>

                      <div className="payment-outstanding-value">
                        {formatMoney(
                          getInvoiceOutstanding(
                            paymentTarget
                          ),
                          paymentTarget.currency
                        )}
                      </div>

                    </div>

                  </div>

                </div>

                <div className="payment-form-grid">

                  <div className="payment-form-field">
                    <label>
                      Payment Amount
                    </label>

                    <input
                      className="invoice-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        paymentForm.amount
                      }
                      onChange={(e) =>
                        updatePaymentField(
                          'amount',
                          e.target.value
                        )
                      }
                      placeholder="Enter payment amount"
                    />

                    <div className="payment-amount-helper">
                      Maximum:
                      {' '}
                      {formatMoney(
                        getInvoiceOutstanding(
                          paymentTarget
                        ),
                        paymentTarget.currency
                      )}
                    </div>
                  </div>

                  <div className="payment-form-field">
                    <label>
                      Payment Method
                    </label>

                    <select
                      className="invoice-select"
                      value={
                        paymentForm.payment_method
                      }
                      onChange={(e) =>
                        updatePaymentField(
                          'payment_method',
                          e.target.value
                        )
                      }
                    >
                      {paymentMethods.map(
                        (method) => (
                          <option
                            key={method.value}
                            value={method.value}
                          >
                            {method.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="payment-form-field">
                    <label>
                      Payment Date
                    </label>

                    <input
                      className="invoice-input"
                      type="datetime-local"
                      value={
                        paymentForm.payment_date
                      }
                      onChange={(e) =>
                        updatePaymentField(
                          'payment_date',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="payment-form-field">
                    <label>
                      Payment Reference
                    </label>

                    <input
                      className="invoice-input"
                      value={
                        paymentForm.payment_reference
                      }
                      onChange={(e) =>
                        updatePaymentField(
                          'payment_reference',
                          e.target.value
                        )
                      }
                      placeholder="Bank reference, POS receipt, etc."
                    />
                  </div>

                  <div className="payment-form-field payment-form-full">
                    <label>
                      Receipt Note
                    </label>

                    <textarea
                      className="invoice-textarea"
                      rows="3"
                      value={
                        paymentForm.receipt_note
                      }
                      onChange={(e) =>
                        updatePaymentField(
                          'receipt_note',
                          e.target.value
                        )
                      }
                      placeholder="Note that may appear on the customer receipt..."
                    />
                  </div>

                  <div className="payment-form-field payment-form-full">
                    <label>
                      Internal Payment Note
                    </label>

                    <textarea
                      className="invoice-textarea"
                      rows="3"
                      value={
                        paymentForm.notes
                      }
                      onChange={(e) =>
                        updatePaymentField(
                          'notes',
                          e.target.value
                        )
                      }
                      placeholder="Private note for the ValueDam team..."
                    />
                  </div>

                </div>

              </div>

              <div className="payment-modal-footer">

                <button
                  type="button"
                  className="invoice-btn"
                  onClick={
                    closePaymentModal
                  }
                  disabled={
                    paymentSaving
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="invoice-btn primary"
                  onClick={
                    savePayment
                  }
                  disabled={
                    paymentSaving
                  }
                >
                  {paymentSaving
                    ? 'Recording...'
                    : 'Record Payment'}
                </button>

              </div>

            </div>
          </div>
        )}

    </section>
  );
}
