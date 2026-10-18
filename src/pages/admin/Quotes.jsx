import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' }
];

const emptyForm = {
  id: null,

  customer_id: '',
  service_request_id: '',

  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_whatsapp: '',
  company_name: '',

  title: 'Service Quote',
  description: '',

  status: 'draft',

  issue_date: new Date()
    .toISOString()
    .slice(0, 10),

  expiry_date: '',

  discount: 0,
  tax: 0,

  currency: 'NGN',

  customer_notes: '',
  terms: '',
  admin_notes: '',

  items: [
    {
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0
    }
  ]
};

function generateQuoteNumber() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `VD-Q-${year}${month}${day}-${random}`;
}

function money(value, currency = 'NGN') {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat(
      'en-NG',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
      }
    ).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function statusLabel(status) {
  return (
    STATUS_OPTIONS.find(
      item => item.value === status
    )?.label || status
  );
}

function statusClass(status) {
  return `quote-status quote-status-${status}`;
}

function isQuoteExpired(quote) {
  if (
    !quote?.expiry_date ||
    ['accepted', 'rejected', 'cancelled', 'expired'].includes(
      quote.status
    )
  ) {
    return false;
  }

  return (
    new Date(quote.expiry_date).getTime() <
    Date.now()
  );
}

function getEffectiveStatus(quote) {
  if (isQuoteExpired(quote)) {
    return 'expired';
  }

  return quote.status;
}

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [requests, setRequests] = useState([]);

  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState('all');

  const [editing, setEditing] = useState(false);

  const queryHandled = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [
      quotesResult,
      customersResult,
      requestsResult
    ] = await Promise.all([
      supabase
        .from('quotes')
        .select(`
          *,
          crm_customers (
            id,
            full_name,
            company_name,
            email,
            phone
          ),
          service_requests (
            id,
            service_name,
            service,
            status
          )
        `)
        .order('created_at', {
          ascending: false
        }),

      supabase
        .from('crm_customers')
        .select('*')
        .order('full_name', {
          ascending: true
        }),

      supabase
        .from('service_requests')
        .select('*')
        .order('created_at', {
          ascending: false
        })
    ]);

    if (quotesResult.error) {
      setMessage(
        quotesResult.error.message
      );
    }

    if (customersResult.error) {
      setMessage(
        customersResult.error.message
      );
    }

    if (requestsResult.error) {
      setMessage(
        requestsResult.error.message
      );
    }

    setQuotes(
      quotesResult.data || []
    );

    setCustomers(
      customersResult.data || []
    );

    setRequests(
      requestsResult.data || []
    );

    setLoading(false);
  }

  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  }

  function updateItem(index, field, value) {
    setForm(prev => {
      const items = [...prev.items];

      items[index] = {
        ...items[index],
        [field]: value
      };

      if (
        field === 'quantity' ||
        field === 'unit_price'
      ) {
        const quantity =
          Number(items[index].quantity) || 0;

        const unitPrice =
          Number(items[index].unit_price) || 0;

        items[index].amount =
          quantity * unitPrice;
      }

      return {
        ...prev,
        items
      };
    });
  }

  function addItem() {
    setForm(prev => ({
      ...prev,

      items: [
        ...prev.items,

        {
          description: '',
          quantity: 1,
          unit_price: 0,
          amount: 0
        }
      ]
    }));
  }

  function removeItem(index) {
    setForm(prev => {
      if (prev.items.length === 1) {
        return prev;
      }

      return {
        ...prev,

        items: prev.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
      };
    });
  }

  function handleCustomerChange(
    customerId
  ) {
    const customer =
      customers.find(
        item => item.id === customerId
      );

    if (!customer) {
      updateField(
        'customer_id',
        customerId
      );

      return;
    }

    setForm(prev => ({
      ...prev,

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
        customer.company_name || ''
    }));
  }

  function handleRequestChange(
    requestId
  ) {
    const request =
      requests.find(
        item => item.id === requestId
      );

    if (!request) {
      updateField(
        'service_request_id',
        requestId
      );

      return;
    }

    let customer =
      request.customer_id
        ? customers.find(
            item =>
              item.id ===
              request.customer_id
          )
        : null;

    setForm(prev => ({
      ...prev,

      service_request_id:
        request.id,

      customer_id:
        request.customer_id ||
        customer?.id ||
        prev.customer_id,

      customer_name:
        customer?.full_name ||
        request.customer_name ||
        request.name ||
        prev.customer_name,

      customer_email:
        customer?.email ||
        request.email ||
        prev.customer_email,

      customer_phone:
        customer?.phone ||
        request.phone ||
        prev.customer_phone,

      customer_whatsapp:
        customer?.whatsapp ||
        request.whatsapp ||
        prev.customer_whatsapp,

      company_name:
        customer?.company_name ||
        request.company_name ||
        prev.company_name,

      description:
        request.request_details ||
        request.description ||
        prev.description,

      title:
        request.service_name ||
        request.service ||
        prev.title
    }));
  }

  function prepareFromCustomer(
    customerId
  ) {
    const customer =
      customers.find(
        item => item.id === customerId
      );

    if (!customer) {
      return;
    }

    setForm({
      ...emptyForm,

      issue_date:
        new Date()
          .toISOString()
          .slice(0, 10),

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
        customer.company_name || ''
    });

    setEditing(false);
    setMessage(
      'New quote started for this customer.'
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function prepareFromRequest(
    requestId
  ) {
    const request =
      requests.find(
        item => item.id === requestId
      );

    if (!request) {
      return;
    }

    const customer =
      request.customer_id
        ? customers.find(
            item =>
              item.id ===
              request.customer_id
          )
        : null;

    setForm({
      ...emptyForm,

      issue_date:
        new Date()
          .toISOString()
          .slice(0, 10),

      customer_id:
        request.customer_id ||
        customer?.id ||
        '',

      service_request_id:
        request.id,

      customer_name:
        customer?.full_name ||
        request.customer_name ||
        request.name ||
        '',

      customer_email:
        customer?.email ||
        request.email ||
        '',

      customer_phone:
        customer?.phone ||
        request.phone ||
        '',

      customer_whatsapp:
        customer?.whatsapp ||
        request.whatsapp ||
        '',

      company_name:
        customer?.company_name ||
        request.company_name ||
        '',

      title:
        request.service_name ||
        request.service ||
        'Service Quote',

      description:
        request.request_details ||
        request.description ||
        ''
    });

    setEditing(false);

    setMessage(
      'New quote started from the selected service request.'
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  const subtotal = useMemo(() => {
    return form.items.reduce(
      (sum, item) =>
        sum +
        (
          Number(item.quantity) || 0
        ) *
        (
          Number(item.unit_price) || 0
        ),
      0
    );
  }, [form.items]);

  const discount =
    Number(form.discount) || 0;

  const tax =
    Number(form.tax) || 0;

  const total = Math.max(
    0,
    subtotal - discount + tax
  );

  function newQuote() {
    setForm({
      ...emptyForm,

      issue_date:
        new Date()
          .toISOString()
          .slice(0, 10)
    });

    setEditing(false);
    setMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function editQuote(quote) {
    const {
      data: items,
      error
    } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('sort_order', {
        ascending: true
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      id: quote.id,

      customer_id:
        quote.customer_id || '',

      service_request_id:
        quote.service_request_id || '',

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
        quote.title ||
        'Service Quote',

      description:
        quote.description || '',

      status:
        quote.status || 'draft',

      issue_date:
        quote.issue_date
          ? new Date(
              quote.issue_date
            )
              .toISOString()
              .slice(0, 10)
          : '',

      expiry_date:
        quote.expiry_date
          ? new Date(
              quote.expiry_date
            )
              .toISOString()
              .slice(0, 10)
          : '',

      discount:
        quote.discount || 0,

      tax:
        quote.tax || 0,

      currency:
        quote.currency || 'NGN',

      customer_notes:
        quote.customer_notes || '',

      terms:
        quote.terms || '',

      admin_notes:
        quote.admin_notes || '',

      items:
        items?.length
          ? items.map(item => ({
              id: item.id,

              description:
                item.description,

              quantity:
                Number(item.quantity),

              unit_price:
                Number(
                  item.unit_price
                ),

              amount:
                Number(item.amount)
            }))
          : [
              {
                description: '',
                quantity: 1,
                unit_price: 0,
                amount: 0
              }
            ]
    });

    setEditing(true);
    setMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function printQuote(quoteId) {
    if (!quoteId) {
      setMessage(
        'Unable to print this quote because its ID is missing.'
      );

      return;
    }

    const printUrl =
      `/admin/quotes/print?id=${encodeURIComponent(
        quoteId
      )}`;

    window.open(
      printUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function saveQuote(event) {
    event.preventDefault();

    if (!form.customer_name.trim()) {
      setMessage(
        'Customer name is required.'
      );

      return;
    }

    if (!form.title.trim()) {
      setMessage(
        'Quote title is required.'
      );

      return;
    }

    const validItems =
      form.items.filter(
        item =>
          item.description.trim() &&
          Number(item.quantity) > 0
      );

    if (!validItems.length) {
      setMessage(
        'Add at least one quote item.'
      );

      return;
    }

    if (
      form.expiry_date &&
      form.issue_date &&
      new Date(
        `${form.expiry_date}T23:59:59`
      ).getTime() <
        new Date(
          `${form.issue_date}T00:00:00`
        ).getTime()
    ) {
      setMessage(
        'Valid Until cannot be earlier than the Issue Date.'
      );

      return;
    }

    setSaving(true);
    setMessage('');

    const existingQuote =
      editing && form.id
        ? quotes.find(
            quote =>
              quote.id === form.id
          )
        : null;

    const quoteNumber =
      existingQuote?.quote_number ||
      generateQuoteNumber();

    const quotePayload = {
      quote_number:
        quoteNumber,

      customer_id:
        form.customer_id || null,

      service_request_id:
        form.service_request_id ||
        null,

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
        form.status,

      issue_date:
        form.issue_date
          ? new Date(
              `${form.issue_date}T00:00:00`
            ).toISOString()
          : new Date().toISOString(),

      expiry_date:
        form.expiry_date
          ? new Date(
              `${form.expiry_date}T23:59:59`
            ).toISOString()
          : null,

      subtotal,

      discount,

      tax,

      total,

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
        null
    };

    let quoteId = form.id;

    if (editing && form.id) {
      const {
        error
      } = await supabase
        .from('quotes')
        .update(quotePayload)
        .eq('id', form.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      const {
        error: deleteItemsError
      } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', form.id);

      if (deleteItemsError) {
        setMessage(
          deleteItemsError.message
        );
        setSaving(false);
        return;
      }
    } else {
      const {
        data,
        error
      } = await supabase
        .from('quotes')
        .insert(quotePayload)
        .select('id')
        .single();

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      quoteId = data.id;
    }

    const itemPayload =
      validItems.map(
        (item, index) => ({
          quote_id:
            quoteId,

          description:
            item.description.trim(),

          quantity:
            Number(item.quantity) || 0,

          unit_price:
            Number(item.unit_price) || 0,

          amount:
            (
              Number(item.quantity) || 0
            ) *
            (
              Number(
                item.unit_price
              ) || 0
            ),

          sort_order:
            index
        })
      );

    const {
      error: itemsError
    } = await supabase
      .from('quote_items')
      .insert(
        itemPayload
      );

    if (itemsError) {
      setMessage(
        itemsError.message
      );

      setSaving(false);
      return;
    }

    setMessage(
      editing
        ? 'Quote updated successfully.'
        : 'Quote created successfully.'
    );

    setForm({
      ...emptyForm,

      issue_date:
        new Date()
          .toISOString()
          .slice(0, 10)
    });

    setEditing(false);

    await loadData();

    setSaving(false);
  }

  async function deleteQuote(id) {
    const confirmed =
      window.confirm(
        'Delete this quote? This cannot be undone.'
      );

    if (!confirmed) {
      return;
    }

    const {
      error
    } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      'Quote deleted successfully.'
    );

    if (form.id === id) {
      newQuote();
    }

    await loadData();
  }

  async function updateQuoteStatus(
    id,
    status
  ) {
    const {
      error
    } = await supabase
      .from('quotes')
      .update({
        status
      })
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      `Quote marked as ${statusLabel(
        status
      ).toLowerCase()}.`
    );

    await loadData();
  }

  async function markExpired(
    quote
  ) {
    if (!quote?.id) {
      return;
    }

    const {
      error
    } = await supabase
      .from('quotes')
      .update({
        status: 'expired'
      })
      .eq('id', quote.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      'Quote marked as expired.'
    );

    await loadData();
  }

  function openCustomer(customerId) {
    if (!customerId) {
      return;
    }

    window.location.href =
      `/admin/customers?customer=${encodeURIComponent(
        customerId
      )}`;
  }

  function openRequest(requestId) {
    if (!requestId) {
      return;
    }

    window.location.href =
      `/admin/requests?request=${encodeURIComponent(
        requestId
      )}`;
  }

  useEffect(() => {
    if (
      loading ||
      queryHandled.current
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const editId =
      params.get('edit');

    const requestId =
      params.get('request');

    const customerId =
      params.get('customer');

    if (
      editId &&
      quotes.length
    ) {
      const quote =
        quotes.find(
          item =>
            item.id === editId
        );

      if (quote) {
        queryHandled.current =
          true;

        editQuote(quote);
        return;
      }
    }

    if (
      requestId &&
      requests.length
    ) {
      const request =
        requests.find(
          item =>
            item.id === requestId
        );

      if (request) {
        queryHandled.current =
          true;

        prepareFromRequest(
          requestId
        );

        return;
      }
    }

    if (
      customerId &&
      customers.length
    ) {
      const customer =
        customers.find(
          item =>
            item.id === customerId
        );

      if (customer) {
        queryHandled.current =
          true;

        prepareFromCustomer(
          customerId
        );
      }
    }
  }, [
    loading,
    quotes,
    requests,
    customers
  ]);

  const filteredQuotes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return quotes.filter(
        quote => {
          const effectiveStatus =
            getEffectiveStatus(
              quote
            );

          const matchesSearch =
            !query ||
            quote.quote_number
              ?.toLowerCase()
              .includes(query) ||
            quote.customer_name
              ?.toLowerCase()
              .includes(query) ||
            quote.company_name
              ?.toLowerCase()
              .includes(query) ||
            quote.title
              ?.toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === 'all' ||
            effectiveStatus ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      quotes,
      search,
      statusFilter
    ]);

  const stats = useMemo(() => {
    const expired =
      quotes.filter(
        quote =>
          getEffectiveStatus(
            quote
          ) === 'expired'
      ).length;

    return {
      total: quotes.length,

      draft: quotes.filter(
        quote =>
          getEffectiveStatus(
            quote
          ) === 'draft'
      ).length,

      sent: quotes.filter(
        quote =>
          ['sent', 'viewed'].includes(
            getEffectiveStatus(
              quote
            )
          )
      ).length,

      accepted: quotes.filter(
        quote =>
          getEffectiveStatus(
            quote
          ) === 'accepted'
      ).length,

      expired,

      value: quotes
        .filter(
          quote =>
            getEffectiveStatus(
              quote
            ) === 'accepted'
        )
        .reduce(
          (sum, quote) =>
            sum +
            Number(
              quote.total || 0
            ),
          0
        )
    };
  }, [quotes]);

  return (
    <section className="admin-section quotes-page">

      <style>{`
        .quotes-page {
          --quote-border: #e8e8ee;
          --quote-muted: #747582;
          --quote-dark: #17181c;
          --quote-soft: #f7f7f9;
        }

        .quotes-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .quotes-hero h2 {
          margin: 6px 0 8px;
          font-size: 32px;
        }

        .quotes-hero p {
          margin: 0;
          color: var(--quote-muted);
        }

        .quote-stats {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .quote-stat {
          border: 1px solid var(--quote-border);
          border-radius: 16px;
          padding: 18px;
          background: #fff;
        }

        .quote-stat span {
          display: block;
          color: var(--quote-muted);
          font-size: 13px;
          margin-bottom: 8px;
        }

        .quote-stat strong {
          font-size: 23px;
        }

        .quote-card {
          background: #fff;
          border: 1px solid var(--quote-border);
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .quote-card-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .quote-card-header h3 {
          margin: 4px 0 6px;
          font-size: 21px;
        }

        .quote-card-header p {
          margin: 0;
          color: var(--quote-muted);
        }

        .quote-form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .quote-full {
          grid-column: 1 / -1;
        }

        .quote-field label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .quote-field input,
        .quote-field select,
        .quote-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dddde5;
          border-radius: 10px;
          padding: 11px 12px;
          background: #fff;
          color: var(--quote-dark);
          outline: none;
        }

        .quote-field textarea {
          resize: vertical;
          min-height: 100px;
        }

        .quote-field input:focus,
        .quote-field select:focus,
        .quote-field textarea:focus {
          border-color: #9c9da8;
        }

        .quote-items {
          margin-top: 26px;
          border-top: 1px solid var(--quote-border);
          padding-top: 22px;
        }

        .quote-items-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .quote-items-head h4 {
          margin: 0;
          font-size: 16px;
        }

        .quote-item {
          display: grid;
          grid-template-columns:
            minmax(0, 2fr)
            100px
            150px
            150px
            44px;
          gap: 10px;
          align-items: end;
          margin-bottom: 10px;
        }

        .quote-item-amount {
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 10px;
          border-radius: 10px;
          background: var(--quote-soft);
          font-weight: 700;
        }

        .quote-remove {
          height: 42px;
          width: 42px;
          border: 0;
          border-radius: 10px;
          background: #fff0f0;
          color: #b42318;
          cursor: pointer;
          font-size: 18px;
        }

        .quote-summary {
          margin-top: 20px;
          margin-left: auto;
          max-width: 390px;
          border-top: 1px solid var(--quote-border);
          padding-top: 18px;
        }

        .quote-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 7px 0;
        }

        .quote-summary-row.total {
          border-top: 1px solid var(--quote-border);
          margin-top: 8px;
          padding-top: 14px;
          font-size: 18px;
          font-weight: 800;
        }

        .quote-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--quote-border);
        }

        .quotes-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
        }

        .quotes-toolbar input {
          flex: 1;
          border: 1px solid var(--quote-border);
          border-radius: 10px;
          padding: 12px;
        }

        .quotes-toolbar select {
          min-width: 170px;
          border: 1px solid var(--quote-border);
          border-radius: 10px;
          padding: 12px;
          background: #fff;
        }

        .quote-list {
          display: grid;
          gap: 10px;
        }

        .quote-row {
          display: grid;
          grid-template-columns:
            1.05fr
            1.35fr
            .9fr
            .95fr
            .9fr
            .9fr
            auto;
          gap: 14px;
          align-items: center;
          padding: 17px;
          border: 1px solid var(--quote-border);
          border-radius: 14px;
        }

        .quote-row-main strong {
          display: block;
          margin-bottom: 5px;
        }

        .quote-row-main small {
          color: var(--quote-muted);
        }

        .quote-row-label {
          display: block;
          color: var(--quote-muted);
          font-size: 11px;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .quote-status {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .quote-status-draft {
          background: #f0f1f3;
          color: #555;
        }

        .quote-status-sent,
        .quote-status-viewed {
          background: #eef5ff;
          color: #245ea8;
        }

        .quote-status-accepted {
          background: #eaf8ef;
          color: #19713a;
        }

        .quote-status-rejected,
        .quote-status-cancelled {
          background: #fff0f0;
          color: #a92727;
        }

        .quote-status-expired {
          background: #fff6df;
          color: #8b6100;
        }

        .quote-expiry-warning {
          display: inline-block;
          margin-top: 5px;
          color: #8b6100;
          font-size: 11px;
          font-weight: 700;
        }

        .quote-expiry-ok {
          display: inline-block;
          margin-top: 5px;
          color: var(--quote-muted);
          font-size: 11px;
        }

        .quote-row-actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .quote-quick-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .quote-quick-actions button {
          font-size: 11px;
          padding: 6px 8px;
        }

        .quote-empty {
          text-align: center;
          padding: 45px 20px;
          color: var(--quote-muted);
        }

        .quote-source-note {
          margin-top: 8px;
          color: var(--quote-muted);
          font-size: 12px;
        }

        .quote-source-note strong {
          color: var(--quote-dark);
        }

        @media (max-width: 1250px) {
          .quote-stats {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .quote-row {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .quote-row-actions {
            justify-content: flex-start;
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .quotes-hero,
          .quote-card-header,
          .quotes-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .quote-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .quote-form-grid {
            grid-template-columns: 1fr;
          }

          .quote-full {
            grid-column: auto;
          }

          .quote-item {
            grid-template-columns: 1fr 1fr;
          }

          .quote-item .quote-item-description {
            grid-column: 1 / -1;
          }

          .quote-item-amount {
            justify-content: flex-start;
          }

          .quote-row {
            grid-template-columns: 1fr;
          }

          .quote-row-actions {
            grid-column: auto;
          }
        }

        @media (max-width: 480px) {
          .quote-stats {
            grid-template-columns: 1fr;
          }

          .quote-card {
            padding: 17px;
          }
        }
      `}</style>

      <div className="quotes-hero">

        <div>
          <span className="eyebrow">
            SALES & PROPOSALS
          </span>

          <h2>
            Quotes
          </h2>

          <p>
            Create, manage and track
            professional service quotations.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={newQuote}
        >
          + New Quote
        </button>

      </div>

      {message && (
        <div className="admin-message">
          {message}
        </div>
      )}

      <div className="quote-stats">

        <div className="quote-stat">
          <span>Total Quotes</span>

          <strong>
            {stats.total}
          </strong>
        </div>

        <div className="quote-stat">
          <span>Drafts</span>

          <strong>
            {stats.draft}
          </strong>
        </div>

        <div className="quote-stat">
          <span>Sent / Viewed</span>

          <strong>
            {stats.sent}
          </strong>
        </div>

        <div className="quote-stat">
          <span>Accepted</span>

          <strong>
            {stats.accepted}
          </strong>
        </div>

        <div className="quote-stat">
          <span>Expired</span>

          <strong>
            {stats.expired}
          </strong>
        </div>

        <div className="quote-stat">
          <span>Accepted Value</span>

          <strong>
            {money(stats.value)}
          </strong>
        </div>

      </div>

      {/* =====================================================
          QUOTE EDITOR
          ===================================================== */}

      <div className="quote-card">

        <div className="quote-card-header">

          <div>
            <span className="eyebrow">
              {editing
                ? 'EDIT QUOTE'
                : 'NEW QUOTE'}
            </span>

            <h3>
              {editing
                ? 'Update Quote'
                : 'Create a Quote'}
            </h3>

            <p>
              Build a detailed quotation
              for a customer or service request.
            </p>

            {!editing &&
              form.customer_id && (
                <div className="quote-source-note">
                  Customer:
                  {' '}
                  <strong>
                    {form.customer_name}
                  </strong>
                </div>
              )}

            {!editing &&
              form.service_request_id && (
                <div className="quote-source-note">
                  Linked service request:
                  {' '}
                  <strong>
                    {
                      requests.find(
                        request =>
                          request.id ===
                          form.service_request_id
                      )?.service_name ||
                      'Service Request'
                    }
                  </strong>
                </div>
              )}
          </div>

          {editing && (
            <button
              type="button"
              className="btn secondary"
              onClick={newQuote}
            >
              + New Quote
            </button>
          )}

        </div>

        <form onSubmit={saveQuote}>

          <div className="quote-form-grid">

            <div className="quote-field">

              <label>
                Customer
              </label>

              <select
                value={
                  form.customer_id
                }
                onChange={e =>
                  handleCustomerChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select customer
                </option>

                {customers.map(
                  customer => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.full_name}

                      {customer.company_name
                        ? ` — ${customer.company_name}`
                        : ''}
                    </option>
                  )
                )}
              </select>

              <small>
                Selecting a customer
                automatically fills their
                contact information.
              </small>

            </div>

            <div className="quote-field">

              <label>
                Service Request
              </label>

              <select
                value={
                  form.service_request_id
                }
                onChange={e =>
                  handleRequestChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  No linked request
                </option>

                {requests.map(
                  request => (
                    <option
                      key={request.id}
                      value={request.id}
                    >
                      {request.service_name ||
                        request.service ||
                        'Service Request'}
                      {' — '}
                      {request.customer_name ||
                        request.name}
                    </option>
                  )
                )}
              </select>

              <small>
                Selecting a request fills
                the customer and service
                information where available.
              </small>

            </div>

            <div className="quote-field">

              <label>
                Customer Name
              </label>

              <input
                value={
                  form.customer_name
                }
                onChange={e =>
                  updateField(
                    'customer_name',
                    e.target.value
                  )
                }
                placeholder="Customer name"
              />

            </div>

            <div className="quote-field">

              <label>
                Company
              </label>

              <input
                value={
                  form.company_name
                }
                onChange={e =>
                  updateField(
                    'company_name',
                    e.target.value
                  )
                }
                placeholder="Company name"
              />

            </div>

            <div className="quote-field">

              <label>
                Email
              </label>

              <input
                type="email"
                value={
                  form.customer_email
                }
                onChange={e =>
                  updateField(
                    'customer_email',
                    e.target.value
                  )
                }
                placeholder="customer@example.com"
              />

            </div>

            <div className="quote-field">

              <label>
                Phone
              </label>

              <input
                value={
                  form.customer_phone
                }
                onChange={e =>
                  updateField(
                    'customer_phone',
                    e.target.value
                  )
                }
                placeholder="Phone number"
              />

            </div>

            <div className="quote-field">

              <label>
                Quote Title
              </label>

              <input
                value={form.title}
                onChange={e =>
                  updateField(
                    'title',
                    e.target.value
                  )
                }
                placeholder="Website Development Quote"
              />

            </div>

            <div className="quote-field">

              <label>
                Status
              </label>

              <select
                value={form.status}
                onChange={e =>
                  updateField(
                    'status',
                    e.target.value
                  )
                }
              >
                {STATUS_OPTIONS.map(
                  status => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="quote-field">

              <label>
                Issue Date
              </label>

              <input
                type="date"
                value={
                  form.issue_date
                }
                onChange={e =>
                  updateField(
                    'issue_date',
                    e.target.value
                  )
                }
              />

            </div>

            <div className="quote-field">

              <label>
                Valid Until
              </label>

              <input
                type="date"
                value={
                  form.expiry_date
                }
                onChange={e =>
                  updateField(
                    'expiry_date',
                    e.target.value
                  )
                }
              />

              <small>
                Quotes past this date are
                automatically displayed as expired.
              </small>

            </div>

            <div className="quote-field">

              <label>
                Currency
              </label>

              <select
                value={form.currency}
                onChange={e =>
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

            <div className="quote-field quote-full">

              <label>
                Description
              </label>

              <textarea
                value={
                  form.description
                }
                onChange={e =>
                  updateField(
                    'description',
                    e.target.value
                  )
                }
                placeholder="Briefly describe what this quotation covers..."
              />

            </div>

          </div>

          {/* =================================================
              ITEMS
              ================================================= */}

          <div className="quote-items">

            <div className="quote-items-head">

              <h4>
                Quote Items
              </h4>

              <button
                type="button"
                className="btn secondary"
                onClick={addItem}
              >
                + Add Item
              </button>

            </div>

            {form.items.map(
              (item, index) => (

                <div
                  className="quote-item"
                  key={index}
                >

                  <div className="quote-field quote-item-description">

                    <label>
                      Description
                    </label>

                    <input
                      value={
                        item.description
                      }
                      onChange={e =>
                        updateItem(
                          index,
                          'description',
                          e.target.value
                        )
                      }
                      placeholder="Service or product"
                    />

                  </div>

                  <div className="quote-field">

                    <label>
                      Qty
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        item.quantity
                      }
                      onChange={e =>
                        updateItem(
                          index,
                          'quantity',
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="quote-field">

                    <label>
                      Unit Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        item.unit_price
                      }
                      onChange={e =>
                        updateItem(
                          index,
                          'unit_price',
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div>

                    <label>
                      Amount
                    </label>

                    <div className="quote-item-amount">
                      {money(
                        Number(
                          item.quantity
                        ) *
                          Number(
                            item.unit_price
                          ),
                        form.currency
                      )}
                    </div>

                  </div>

                  <button
                    type="button"
                    className="quote-remove"
                    onClick={() =>
                      removeItem(index)
                    }
                    title="Remove item"
                  >
                    ×
                  </button>

                </div>
              )
            )}

          </div>

          {/* =================================================
              TOTALS
              ================================================= */}

          <div className="quote-summary">

            <div className="quote-summary-row">

              <span>
                Subtotal
              </span>

              <strong>
                {money(
                  subtotal,
                  form.currency
                )}
              </strong>

            </div>

            <div className="quote-form-grid">

              <div className="quote-field">

                <label>
                  Discount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.discount
                  }
                  onChange={e =>
                    updateField(
                      'discount',
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="quote-field">

                <label>
                  Tax / Additional Charge
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.tax
                  }
                  onChange={e =>
                    updateField(
                      'tax',
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            <div className="quote-summary-row">

              <span>
                Discount
              </span>

              <strong>
                -{' '}
                {money(
                  discount,
                  form.currency
                )}
              </strong>

            </div>

            <div className="quote-summary-row">

              <span>
                Tax / Charge
              </span>

              <strong>
                {money(
                  tax,
                  form.currency
                )}
              </strong>

            </div>

            <div className="quote-summary-row total">

              <span>
                Total
              </span>

              <strong>
                {money(
                  total,
                  form.currency
                )}
              </strong>

            </div>

          </div>

          {/* =================================================
              NOTES
              ================================================= */}

          <div
            className="quote-form-grid"
            style={{
              marginTop: '28px'
            }}
          >

            <div className="quote-field">

              <label>
                Customer Notes
              </label>

              <textarea
                value={
                  form.customer_notes
                }
                onChange={e =>
                  updateField(
                    'customer_notes',
                    e.target.value
                  )
                }
                placeholder="Notes visible to the customer..."
              />

            </div>

            <div className="quote-field">

              <label>
                Terms & Conditions
              </label>

              <textarea
                value={form.terms}
                onChange={e =>
                  updateField(
                    'terms',
                    e.target.value
                  )
                }
                placeholder="Payment terms, validity, delivery terms, etc."
              />

            </div>

            <div className="quote-field quote-full">

              <label>
                Internal Admin Notes
              </label>

              <textarea
                value={
                  form.admin_notes
                }
                onChange={e =>
                  updateField(
                    'admin_notes',
                    e.target.value
                  )
                }
                placeholder="Private notes for your team..."
              />

            </div>

          </div>

          <div className="quote-actions">

            {editing && (
              <button
                type="button"
                className="btn secondary"
                onClick={newQuote}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="btn primary"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editing
                  ? 'Update Quote'
                  : 'Create Quote'}
            </button>

          </div>

        </form>

      </div>

      {/* =====================================================
          EXISTING QUOTES
          ===================================================== */}

      <div className="quote-card">

        <div className="quote-card-header">

          <div>
            <span className="eyebrow">
              QUOTE HISTORY
            </span>

            <h3>
              Existing Quotes
            </h3>

            <p>
              Search and manage quotations
              already created.
            </p>
          </div>

          <strong>
            {filteredQuotes.length}{' '}
            quote
            {filteredQuotes.length === 1
              ? ''
              : 's'}
          </strong>

        </div>

        <div className="quotes-toolbar">

          <input
            value={search}
            onChange={e =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search quote number, customer, company or title..."
          />

          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              All statuses
            </option>

            {STATUS_OPTIONS.map(
              status => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              )
            )}

          </select>

        </div>

        {loading ? (
          <div className="quote-empty">
            Loading quotes...
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="quote-empty">

            <strong>
              No quotes found.
            </strong>

            <p>
              Create your first quotation
              using the form above.
            </p>

          </div>
        ) : (

          <div className="quote-list">

            {filteredQuotes.map(
              quote => {
                const effectiveStatus =
                  getEffectiveStatus(
                    quote
                  );

                const expired =
                  effectiveStatus ===
                  'expired';

                return (
                  <div
                    className="quote-row"
                    key={quote.id}
                  >

                    <div className="quote-row-main">

                      <span className="quote-row-label">
                        Quote
                      </span>

                      <strong>
                        {quote.quote_number}
                      </strong>

                      <small>
                        {quote.title}
                      </small>

                    </div>

                    <div>

                      <span className="quote-row-label">
                        Customer
                      </span>

                      <strong>
                        {quote.customer_name}
                      </strong>

                      {quote.company_name && (
                        <small
                          style={{
                            display:
                              'block',
                            color:
                              '#747582'
                          }}
                        >
                          {quote.company_name}
                        </small>
                      )}

                      {quote.customer_id && (
                        <button
                          type="button"
                          className="btn secondary"
                          style={{
                            marginTop:
                              '7px',
                            padding:
                              '5px 8px',
                            fontSize:
                              '11px'
                          }}
                          onClick={() =>
                            openCustomer(
                              quote.customer_id
                            )
                          }
                        >
                          View Customer
                        </button>
                      )}

                    </div>

                    <div>

                      <span className="quote-row-label">
                        Status
                      </span>

                      <span
                        className={statusClass(
                          effectiveStatus
                        )}
                      >
                        {statusLabel(
                          effectiveStatus
                        )}
                      </span>

                    </div>

                    <div>

                      <span className="quote-row-label">
                        Total
                      </span>

                      <strong>
                        {money(
                          quote.total,
                          quote.currency
                        )}
                      </strong>

                    </div>

                    <div>

                      <span className="quote-row-label">
                        Created
                      </span>

                      <small>
                        {quote.created_at
                          ? new Date(
                              quote.created_at
                            ).toLocaleDateString()
                          : '—'}
                      </small>

                    </div>

                    <div>

                      <span className="quote-row-label">
                        Valid Until
                      </span>

                      <small>
                        {quote.expiry_date
                          ? new Date(
                              quote.expiry_date
                            ).toLocaleDateString()
                          : 'No expiry'}
                      </small>

                      {expired ? (
                        <span className="quote-expiry-warning">
                          Expired
                        </span>
                      ) : quote.expiry_date ? (
                        <span className="quote-expiry-ok">
                          Valid
                        </span>
                      ) : null}

                    </div>

                    <div className="quote-row-actions">

                      {/* PRINT / PDF */}

                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() =>
                          printQuote(
                            quote.id
                          )
                        }
                      >
                        Print / PDF
                      </button>

                      {/* EDIT */}

                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() =>
                          editQuote(
                            quote
                          )
                        }
                      >
                        Edit
                      </button>

                      {/* LINKED REQUEST */}

                      {quote.service_request_id && (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() =>
                            openRequest(
                              quote.service_request_id
                            )
                          }
                        >
                          Request
                        </button>
                      )}

                      {/* QUICK STATUS ACTIONS */}

                      {effectiveStatus ===
                        'draft' && (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() =>
                            updateQuoteStatus(
                              quote.id,
                              'sent'
                            )
                          }
                        >
                          Mark Sent
                        </button>
                      )}

                      {['sent', 'viewed'].includes(
                        effectiveStatus
                      ) && (
                        <>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() =>
                              updateQuoteStatus(
                                quote.id,
                                'accepted'
                              )
                            }
                          >
                            Accepted
                          </button>

                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() =>
                              updateQuoteStatus(
                                quote.id,
                                'rejected'
                              )
                            }
                          >
                            Rejected
                          </button>
                        </>
                      )}

                      {expired &&
                        quote.status !==
                          'expired' && (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() =>
                            markExpired(
                              quote
                            )
                          }
                        >
                          Mark Expired
                        </button>
                      )}

                      {effectiveStatus !==
                        'cancelled' &&
                        effectiveStatus !==
                          'accepted' &&
                        effectiveStatus !==
                          'rejected' &&
                        effectiveStatus !==
                          'expired' && (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() =>
                            updateQuoteStatus(
                              quote.id,
                              'cancelled'
                            )
                          }
                        >
                          Cancel
                        </button>
                      )}

                      {/* DELETE */}

                      <button
                        type="button"
                        className="btn danger"
                        onClick={() =>
                          deleteQuote(
                            quote.id
                          )
                        }
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

    </section>
  );
}