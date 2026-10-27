
import StoreAffiliateRecurringPayments from './StoreAffiliateRecurringPayments';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  RefreshCw,
  Search,
  PlusCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LoaderCircle,
  Wallet,
  ReceiptText,
} from 'lucide-react';

const money = (amount, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency || 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const localDateTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const initialForm = () => ({
  affiliate_id: '',
  sale_type: 'offline',
  sale_amount: '',
  commission_type: 'percentage',
  commission_rate: '5',
  commission_amount: '0',
  manual_commission: false,
  sale_reference: '',
  customer_reference: '',
  notes: '',
  sale_date: localDateTime(),
  order_id: '',
  target_type: 'none',
  target_id: '',
});

const styles = {
  page: {
    padding: '24px',
    maxWidth: '1500px',
    margin: '0 auto',
    color: '#111827',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '22px',
  },
  heading: { margin: 0, fontSize: '25px', fontWeight: 800 },
  muted: { color: '#6b7280', fontSize: '13px', lineHeight: 1.6 },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '15px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '7px',
    color: '#374151',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    background: '#fff',
    color: '#111827',
    fontSize: '14px',
    minHeight: '42px',
  },
  button: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px 13px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    background: '#fff',
    color: '#111827',
  },
  primary: {
    background: '#f5b82e',
    borderColor: '#f5b82e',
    color: '#111827',
  },
  tableWrap: { width: '100%', overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1000px',
    fontSize: '13px',
  },
  th: {
    padding: '12px 10px',
    textAlign: 'left',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    color: '#4b5563',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '13px 10px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
  },
};

const badgeColors = {
  pending: { background: '#fef3c7', color: '#92400e' },
  approved: { background: '#d1fae5', color: '#065f46' },
  rejected: { background: '#fee2e2', color: '#991b1b' },
  paid: { background: '#dbeafe', color: '#1e40af' },
  reversed: { background: '#f3e8ff', color: '#6b21a8' },
};

function StatusBadge({ status }) {
  const colors = badgeColors[status] || {
    background: '#f3f4f6',
    color: '#374151',
  };

  return (
    <span
      style={{
        ...colors,
        padding: '5px 9px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 800,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {status || 'unknown'}
    </span>
  );
}

export default function StoreAffiliateSales() {
  const [affiliates, setAffiliates] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [rules, setRules] = useState([]);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const currency = settings?.currency || 'NGN';

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const results = await Promise.all([
        supabase
          .from('store_affiliates')
          .select('id, full_name, email, referral_code, status')
          .eq('status', 'approved')
          .order('full_name'),

        supabase
          .from('store_products')
          .select('id, name, price, status')
          .order('name')
          .limit(1000),

        supabase
          .from('services')
          .select('id, title, active')
          .order('title')
          .limit(1000),

        supabase
          .from('store_orders')
          .select('id, order_number, total, created_at, order_status, payment_status')
          .order('created_at', { ascending: false })
          .limit(200),

        supabase
          .from('store_affiliate_commission_rules')
          .select('*')
          .eq('enabled', true),

        supabase
          .from('store_affiliate_sales')
          .select('*')
          .order('sale_date', { ascending: false })
          .limit(500),

        supabase
          .from('store_affiliate_settings')
          .select('*')
          .limit(1),
      ]);

      const labels = [
        'Approved affiliates',
        'Products',
        'Services',
        'Store orders',
        'Commission rules',
        'Affiliate sales',
        'Affiliate settings',
      ];

      for (let i = 0; i < results.length; i += 1) {
        if (results[i].error) {
          throw new Error(
            `${labels[i]}: ${results[i].error.message}`
          );
        }
      }

      setAffiliates(results[0].data || []);
      setProducts(results[1].data || []);
      setServices(results[2].data || []);
      setOrders(results[3].data || []);
      setRules(results[4].data || []);
      setSales(results[5].data || []);
      setSettings(results[6].data?.[0] || null);
    } catch (err) {
      setError(err.message || 'Could not load affiliate sales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === form.order_id),
    [orders, form.order_id]
  );

  const selectedTarget = useMemo(() => {
    if (form.target_type === 'product') {
      return products.find((item) => item.id === form.target_id);
    }

    if (form.target_type === 'service') {
      return services.find((item) => item.id === form.target_id);
    }

    return null;
  }, [form.target_type, form.target_id, products, services]);

  const applicableRule = useMemo(
    () =>
      rules.find(
        (rule) =>
          rule.target_type === form.target_type &&
          rule.target_id === form.target_id &&
          form.target_type !== 'none'
      ),
    [rules, form.target_type, form.target_id]
  );

  const calculatedCommission = useMemo(() => {
    const amount = Number(form.sale_amount || 0);
    const rate = Number(form.commission_rate || 0);

    if (amount <= 0 || rate < 0) return 0;

    return form.commission_type === 'fixed'
      ? rate
      : (amount * rate) / 100;
  }, [form.sale_amount, form.commission_type, form.commission_rate]);

  useEffect(() => {
    if (form.sale_type === 'store_order' && selectedOrder) {
      setForm((current) => ({
        ...current,
        sale_amount: String(selectedOrder.total ?? ''),
        sale_reference: selectedOrder.order_number || '',
        sale_date: selectedOrder.created_at
          ? new Date(selectedOrder.created_at).toISOString().slice(0, 16)
          : current.sale_date,
      }));
    }
  }, [form.sale_type, selectedOrder]);

  useEffect(() => {
    if (form.manual_commission) return;

    const defaultType = settings?.default_commission_type || 'percentage';
    const defaultRate = Number(settings?.default_commission_rate ?? 5);

    const commissionType = applicableRule?.commission_type || defaultType;
    const commissionRate = Number(
      applicableRule?.commission_rate ?? defaultRate
    );

    setForm((current) => ({
      ...current,
      commission_type: commissionType,
      commission_rate: String(commissionRate),
    }));
  }, [
    settings,
    applicableRule,
    form.manual_commission,
    form.target_type,
    form.target_id,
  ]);

  useEffect(() => {
    if (!form.manual_commission) {
      setForm((current) => ({
        ...current,
        commission_amount: calculatedCommission.toFixed(2),
      }));
    }
  }, [calculatedCommission, form.manual_commission]);

  const filteredSales = useMemo(() => {
    const affiliateById = new Map(
      affiliates.map((affiliate) => [affiliate.id, affiliate])
    );

    // Include names for affiliates who are no longer approved.
    const affiliateIds = new Set(affiliates.map((item) => item.id));

    return sales
      .filter((sale) => filter === 'all' || sale.status === filter)
      .filter((sale) => {
        const affiliate = affiliateById.get(sale.affiliate_id);
        const text = [
          sale.sale_reference,
          sale.customer_reference,
          sale.notes,
          sale.id,
          affiliate?.full_name,
          affiliate?.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return !search.trim() || text.includes(search.trim().toLowerCase());
      })
      .map((sale) => ({
        ...sale,
        affiliateName:
          affiliateById.get(sale.affiliate_id)?.full_name ||
          `Affiliate ${sale.affiliate_id.slice(0, 8)}`,
        affiliateMissingFromApprovedList: !affiliateIds.has(sale.affiliate_id),
      }));
  }, [sales, affiliates, filter, search]);

  const totals = useMemo(() => {
    const pending = sales.filter((sale) => sale.status === 'pending').length;
    const approved = sales
      .filter((sale) => sale.status === 'approved')
      .reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0);
    const pendingCommission = sales
      .filter((sale) => sale.status === 'pending')
      .reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0);

    return { pending, approved, pendingCommission };
  }, [sales]);

  const changeSaleType = (saleType) => {
    setForm((current) => ({
      ...current,
      sale_type: saleType,
      order_id: '',
      target_type: saleType === 'service' ? 'service' : 'none',
      target_id: '',
      sale_reference: '',
      sale_amount: '',
    }));
  };

  const changeTargetType = (targetType) => {
    setForm((current) => ({
      ...current,
      target_type: targetType,
      target_id: '',
    }));
  };

  const handleRecordSale = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.affiliate_id) {
      setError('Select an approved affiliate.');
      return;
    }

    const amount = Number(form.sale_amount);
    const rate = Number(form.commission_rate);
    const commission = Number(form.commission_amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a sale amount greater than zero.');
      return;
    }

    if (!Number.isFinite(rate) || rate < 0) {
      setError('Enter a valid commission rate.');
      return;
    }

    if (!Number.isFinite(commission) || commission < 0) {
      setError('Enter a valid commission amount.');
      return;
    }

    if (form.sale_type === 'store_order' && !form.order_id) {
      setError('Select the existing store order.');
      return;
    }

    if (form.sale_type === 'service' && !form.target_id) {
      setError('Select the service associated with this sale.');
      return;
    }

    if (
      form.target_type !== 'none' &&
      !form.target_id
    ) {
      setError('Select the product or service for the commission rule.');
      return;
    }

    if (form.commission_type === 'percentage' && rate > 100) {
      setError('Percentage commission cannot exceed 100%.');
      return;
    }

    if (
      applicableRule &&
      !form.manual_commission &&
      form.commission_type === 'percentage' &&
      rate > 100
    ) {
      setError('The configured commission percentage is invalid.');
      return;
    }

    setSaving(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'store_affiliate_admin_record_sale',
        {
          p_affiliate_id: form.affiliate_id,
          p_sale_type: form.sale_type,
          p_sale_amount: amount,
          p_commission_type: form.commission_type,
          p_commission_rate: rate,
          p_commission_amount: commission,
          p_sale_reference: form.sale_reference.trim() || null,
          p_customer_reference: form.customer_reference.trim() || null,
          p_notes: form.notes.trim() || null,
          p_sale_date: form.sale_date
            ? new Date(form.sale_date).toISOString()
            : new Date().toISOString(),
          p_sale_id:
            form.sale_type === 'store_order'
              ? form.order_id
              : form.sale_type === 'service'
                ? form.target_id
                : null,
          p_referral_id: null,
          p_currency: currency,
        }
      );

      if (rpcError) throw rpcError;

      setMessage(
        `Sale recorded successfully. Record ID: ${String(data).slice(0, 8)}. It is pending approval.`
      );
      setForm(initialForm());
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not record the sale.');
    } finally {
      setSaving(false);
    }
  };

  const updateSaleStatus = async (sale, nextStatus) => {
    let reason = '';

    if (nextStatus === 'rejected' || nextStatus === 'reversed') {
      reason = window.prompt(
        nextStatus === 'rejected'
          ? 'Enter the reason for rejecting this sale:'
          : 'Enter the reason for reversing this sale:'
      );

      if (reason === null) return;

      if (!reason.trim()) {
        setError('Please provide a reason for this action.');
        return;
      }
    } else {
      const confirmed = window.confirm(
        `Approve this sale and create its commission ledger entry of ${money(
          sale.commission_amount,
          sale.currency
        )}?`
      );

      if (!confirmed) return;
    }

    setWorkingId(sale.id);
    setError('');
    setMessage('');

    try {
      const { error: rpcError } = await supabase.rpc(
        'store_affiliate_admin_set_sale_status',
        {
          p_sale_record_id: sale.id,
          p_new_status: nextStatus,
          p_reason: reason.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      setMessage(`Sale successfully ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setError(err.message || `Could not ${nextStatus} this sale.`);
    } finally {
      setWorkingId('');
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        .va-affiliate-sales-actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }
        .va-affiliate-sales-button:hover {
          filter: brightness(.97);
        }
        .va-affiliate-sales-field:focus {
          outline: 2px solid #f5b82e;
          outline-offset: 1px;
        }
        @media (max-width: 640px) {
          .va-affiliate-sales-page {
            padding: 14px !important;
          }
        }
      `}</style>

      <div className="va-affiliate-sales-page" style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>Affiliate Sales</h1>
            <p style={styles.muted}>
              Record attributed sales, manage commission approvals and review
              the sales history.
            </p>
          </div>

          <div className="va-affiliate-sales-actions">
            <button
              type="button"
              style={styles.button}
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              style={{ ...styles.button, ...styles.primary }}
              onClick={() => {
                setError('');
                setMessage('');
                setShowForm((value) => !value);
              }}
            >
              <PlusCircle size={16} />
              {showForm ? 'Close form' : 'Record sale'}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              ...styles.card,
              background: '#fef2f2',
              borderColor: '#fecaca',
              color: '#991b1b',
              marginBottom: '14px',
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              ...styles.card,
              background: '#ecfdf5',
              borderColor: '#a7f3d0',
              color: '#065f46',
              marginBottom: '14px',
            }}
          >
            {message}
          </div>
        )}

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.muted}>Pending sales</div>
            <div style={{ fontSize: '26px', fontWeight: 800 }}>
              {totals.pending}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.muted}>Pending commissions</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>
              {money(totals.pendingCommission, currency)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.muted}>Approved commissions</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>
              {money(totals.approved, currency)}
            </div>
          </div>
        </div>

        {showForm && (
          <section style={styles.card}>
            <h2 style={{ marginTop: 0, fontSize: '19px' }}>
              Record an affiliate sale
            </h2>

            <p style={styles.muted}>
              New records start as pending. Approval creates the commission
              ledger entry. Check that the sale is genuinely attributable to
              the selected affiliate before recording it.
            </p>

            {affiliates.length === 0 && (
              <div
                style={{
                  padding: '12px',
                  marginBottom: '15px',
                  borderRadius: '8px',
                  background: '#fffbeb',
                  color: '#92400e',
                }}
              >
                No approved affiliates are available. Approve an affiliate
                first on the Affiliates admin page.
                      <StoreAffiliateRecurringPayments />
              </div>
            )}

            <form onSubmit={handleRecordSale}>
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Approved affiliate *</label>
                  <select
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    value={form.affiliate_id}
                    onChange={(event) =>
                      updateForm('affiliate_id', event.target.value)
                    }
                    required
                  >
                    <option value="">Select affiliate</option>
                    {affiliates.map((affiliate) => (
                      <option key={affiliate.id} value={affiliate.id}>
                        {affiliate.full_name} — {affiliate.referral_code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Sale type *</label>
                  <select
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    value={form.sale_type}
                    onChange={(event) => changeSaleType(event.target.value)}
                    required
                  >
                    <option value="offline">Offline sale</option>
                    <option value="manual">Manual attribution</option>
                    <option value="store_order">Existing store order</option>
                    <option value="service">Service sale</option>
                  </select>
                </div>

                {form.sale_type === 'store_order' && (
                  <div>
                    <label style={styles.label}>Existing store order *</label>
                    <select
                      className="va-affiliate-sales-field"
                      style={styles.input}
                      value={form.order_id}
                      onChange={(event) =>
                        updateForm('order_id', event.target.value)
                      }
                      required
                    >
                      <option value="">Select order</option>
                      {orders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.order_number} — {money(order.total, currency)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={styles.label}>Commission rule target</label>
                  <select
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    value={form.target_type}
                    onChange={(event) => changeTargetType(event.target.value)}
                    disabled={form.sale_type === 'service'}
                  >
                    <option value="none">Use global default</option>
                    <option value="product">Specific product rule</option>
                    <option value="service">Specific service rule</option>
                  </select>
                </div>

                {form.target_type !== 'none' && (
                  <div>
                    <label style={styles.label}>
                      {form.target_type === 'product' ? 'Product' : 'Service'} *
                    </label>
                    <select
                      className="va-affiliate-sales-field"
                      style={styles.input}
                      value={form.target_id}
                      onChange={(event) =>
                        updateForm('target_id', event.target.value)
                      }
                      required
                    >
                      <option value="">Select {form.target_type}</option>
                      {(form.target_type === 'product'
                        ? products
                        : services
                      ).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name || item.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={styles.label}>Sale amount ({currency}) *</label>
                  <input
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.sale_amount}
                    onChange={(event) =>
                      updateForm('sale_amount', event.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <label style={styles.label}>Commission type *</label>
                  <select
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    value={form.commission_type}
                    onChange={(event) =>
                      updateForm('commission_type', event.target.value)
                    }
                    disabled={!form.manual_commission && !!applicableRule}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>

                <div>
                  <label style={styles.label}>
                    {form.commission_type === 'percentage'
                      ? 'Commission rate (%)'
                      : `Fixed commission (${currency})`}
                  </label>
                  <input
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    max={
                      form.commission_type === 'percentage' ? '100' : undefined
                    }
                    value={form.commission_rate}
                    onChange={(event) =>
                      updateForm('commission_rate', event.target.value)
                    }
                    disabled={!form.manual_commission && !!applicableRule}
                    required
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Commission amount ({currency}) *
                  </label>
                  <input
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.commission_amount}
                    onChange={(event) => {
                      updateForm('commission_amount', event.target.value);
                      updateForm('manual_commission', true);
                    }}
                    required
                  />
                  <label
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      marginTop: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.manual_commission}
                      onChange={(event) =>
                        updateForm('manual_commission', event.target.checked)
                      }
                    />
                    Manually set commission amount
                  </label>
                </div>

                <div>
                  <label style={styles.label}>Sale reference</label>
                  <input
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    value={form.sale_reference}
                    onChange={(event) =>
                      updateForm('sale_reference', event.target.value)
                    }
                    placeholder="Receipt, order number or invoice"
                  />
                </div>

                <div>
                  <label style={styles.label}>Customer reference</label>
                  <input
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    value={form.customer_reference}
                    onChange={(event) =>
                      updateForm('customer_reference', event.target.value)
                    }
                    placeholder="Optional customer reference"
                  />
                </div>

                <div>
                  <label style={styles.label}>Sale date and time *</label>
                  <input
                    className="va-affiliate-sales-field"
                    style={styles.input}
                    type="datetime-local"
                    value={form.sale_date}
                    onChange={(event) =>
                      updateForm('sale_date', event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <label style={styles.label}>Notes</label>
                <textarea
                  className="va-affiliate-sales-field"
                  style={{ ...styles.input, minHeight: '85px', resize: 'vertical' }}
                  value={form.notes}
                  onChange={(event) => updateForm('notes', event.target.value)}
                  placeholder="Record attribution evidence or other relevant details."
                />
              </div>

              <div
                style={{
                  marginTop: '15px',
                  padding: '14px',
                  background: '#f9fafb',
                  borderRadius: '10px',
                }}
              >
                <div style={styles.muted}>Commission preview</div>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>
                  {money(form.commission_amount, currency)}
                </div>
                <div style={styles.muted}>
                  {applicableRule
                    ? `Enabled ${form.target_type} commission rule selected.`
                    : 'Using the global default unless you manually override it.'}
                  {' '}
                  {form.manual_commission
                    ? 'Manual commission amount is enabled.'
                    : 'The amount is calculated from the selected type and rate.'}
                </div>
              </div>

              <div
                className="va-affiliate-sales-actions"
                style={{ marginTop: '18px' }}
              >
                <button
                  type="submit"
                  style={{ ...styles.button, ...styles.primary }}
                  disabled={saving || affiliates.length === 0}
                >
                  {saving ? (
                    <LoaderCircle size={16} />
                  ) : (
                    <PlusCircle size={16} />
                  )}
                  {saving ? 'Recording sale…' : 'Record pending sale'}
                </button>

                <button
                  type="button"
                  style={styles.button}
                  onClick={() => {
                    setForm(initialForm());
                    setError('');
                  }}
                  disabled={saving}
                >
                  Clear form
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={styles.card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '19px' }}>Sales history</h2>
              <p style={styles.muted}>
                Showing up to 500 most recent affiliate sales.
              </p>
            </div>
            <ReceiptText size={24} color="#6b7280" />
          </div>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Search</label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '13px',
                    color: '#6b7280',
                  }}
                />
                <input
                  className="va-affiliate-sales-field"
                  style={{ ...styles.input, paddingLeft: '35px' }}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Reference, affiliate or notes"
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>Filter by status</label>
              <select
                className="va-affiliate-sales-field"
                style={styles.input}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="reversed">Reversed</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '35px', textAlign: 'center' }}>
              <LoaderCircle size={22} />
              <p style={styles.muted}>Loading affiliate sales…</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div style={{ padding: '35px 10px', textAlign: 'center' }}>
              <Wallet size={30} color="#9ca3af" />
              <p style={{ fontWeight: 700 }}>No sales found</p>
              <p style={styles.muted}>
                Record a sale or change your search and status filters.
              </p>
            </div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Sale</th>
                    <th style={styles.th}>Affiliate</th>
                    <th style={styles.th}>Sale amount</th>
                    <th style={styles.th}>Commission</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 800 }}>
                          {sale.sale_reference || sale.id.slice(0, 8)}
                        </div>
                        <div style={styles.muted}>
                          {String(sale.sale_type).replace('_', ' ')}
                        </div>
                        {sale.customer_reference && (
                          <div style={styles.muted}>
                            Customer: {sale.customer_reference}
                          </div>
                        )}
                        {sale.notes && (
                          <div style={{ ...styles.muted, maxWidth: '230px' }}>
                            {sale.notes}
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        <div style={{ fontWeight: 700 }}>
                          {sale.affiliateName}
                        </div>
                        {sale.affiliateMissingFromApprovedList && (
                          <div style={styles.muted}>
                            Not currently in approved list
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        {money(sale.sale_amount, sale.currency)}
                      </td>

                      <td style={styles.td}>
                        <div style={{ fontWeight: 800 }}>
                          {money(sale.commission_amount, sale.currency)}
                        </div>
                        <div style={styles.muted}>
                          {sale.commission_type === 'percentage'
                            ? `${sale.commission_rate}%`
                            : 'Fixed commission'}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <StatusBadge status={sale.status} />
                      </td>

                      <td style={styles.td}>
                        {sale.sale_date
                          ? new Date(sale.sale_date).toLocaleString()
                          : '—'}
                      </td>

                      <td style={styles.td}>
                        <div className="va-affiliate-sales-actions">
                          {sale.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                style={{
                                  ...styles.button,
                                  background: '#ecfdf5',
                                  borderColor: '#a7f3d0',
                                  color: '#065f46',
                                }}
                                disabled={workingId === sale.id}
                                onClick={() =>
                                  updateSaleStatus(sale, 'approved')
                                }
                                title="Approve sale"
                              >
                                {workingId === sale.id ? (
                                  <LoaderCircle size={14} />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                Approve
                              </button>

                              <button
                                type="button"
                                style={{
                                  ...styles.button,
                                  color: '#991b1b',
                                }}
                                disabled={workingId === sale.id}
                                onClick={() =>
                                  updateSaleStatus(sale, 'rejected')
                                }
                                title="Reject sale"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </>
                          )}

                          {sale.status === 'approved' && (
                            <button
                              type="button"
                              style={{
                                ...styles.button,
                                color: '#6b21a8',
                              }}
                              disabled={workingId === sale.id}
                              onClick={() =>
                                updateSaleStatus(sale, 'reversed')
                              }
                              title="Reverse approved unpaid sale"
                            >
                              <RotateCcw size={14} />
                              Reverse
                            </button>
                          )}

                          {sale.status === 'paid' && (
                            <span style={styles.muted}>
                              Paid — use a separate accounting adjustment if
                              needed.
                            </span>
                          )}

                          {sale.status !== 'pending' &&
                            sale.status !== 'approved' &&
                            sale.status !== 'paid' && (
                              <span style={styles.muted}>No actions</span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
