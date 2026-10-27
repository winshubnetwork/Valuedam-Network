
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LoaderCircle,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const money = (amount, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency || 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const dateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const STATUSES = [
  'all',
  'pending',
  'approved',
  'rejected',
  'paid',
  'reversed',
];

const STATUS_COLORS = {
  pending: { background: '#fff7ed', color: '#9a3412' },
  approved: { background: '#f0fdf4', color: '#166534' },
  rejected: { background: '#fef2f2', color: '#991b1b' },
  paid: { background: '#eff6ff', color: '#1d4ed8' },
  reversed: { background: '#f3f4f6', color: '#4b5563' },
};

const TYPE_LABELS = {
  store_order: 'Store order',
  service: 'Service',
  offline: 'Offline sale',
  manual: 'Manual sale',
};

export default function StoreAffiliateCommissions() {
  const [sales, setSales] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [affiliateFilter, setAffiliateFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [salesResult, affiliatesResult] = await Promise.all([
        supabase
          .from('store_affiliate_sales')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('store_affiliates')
          .select('id, full_name, email, referral_code, status')
          .order('created_at', { ascending: false }),
      ]);

      if (salesResult.error) throw salesResult.error;
      if (affiliatesResult.error) throw affiliatesResult.error;

      setSales(salesResult.data || []);
      setAffiliates(affiliatesResult.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load affiliate commissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const affiliateMap = useMemo(
    () =>
      Object.fromEntries(
        affiliates.map((affiliate) => [affiliate.id, affiliate])
      ),
    [affiliates]
  );

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const affiliate = affiliateMap[sale.affiliate_id];

      const searchable = [
        sale.id,
        sale.sale_reference,
        sale.customer_reference,
        sale.sale_type,
        sale.status,
        sale.notes,
        sale.sale_id,
        sale.commission_amount,
        affiliate?.full_name,
        affiliate?.email,
        affiliate?.referral_code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        (!term || searchable.includes(term)) &&
        (statusFilter === 'all' || sale.status === statusFilter) &&
        (typeFilter === 'all' || sale.sale_type === typeFilter) &&
        (affiliateFilter === 'all' ||
          sale.affiliate_id === affiliateFilter)
      );
    });
  }, [
    sales,
    affiliateMap,
    search,
    statusFilter,
    typeFilter,
    affiliateFilter,
  ]);

  const pendingCount = sales.filter(
    (sale) => sale.status === 'pending'
  ).length;

  const approvedTotal = sales
    .filter((sale) => sale.status === 'approved')
    .reduce(
      (sum, sale) => sum + Number(sale.commission_amount || 0),
      0
    );

  const pendingTotal = sales
    .filter((sale) => sale.status === 'pending')
    .reduce(
      (sum, sale) => sum + Number(sale.commission_amount || 0),
      0
    );

  const changeSaleStatus = async (sale, newStatus) => {
    setError('');
    setNotice('');

    const actionLabels = {
      approved: 'approve this commission',
      rejected: 'reject this commission',
      reversed: 'reverse this approved commission',
    };

    const reason = window.prompt(
      `Enter the reason to ${actionLabels[newStatus] || 'change the status'}.\n\nThis reason will be submitted to the database.`
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }

    const affiliate = affiliateMap[sale.affiliate_id];
    const affiliateName =
      affiliate?.full_name || affiliate?.email || 'this affiliate';

    const confirmed = window.confirm(
      `Confirm: ${actionLabels[newStatus]}?\n\nAffiliate: ${affiliateName}\nCommission: ${money(sale.commission_amount, sale.currency)}\nSale reference: ${sale.sale_reference || sale.id}`
    );

    if (!confirmed) return;

    setBusyId(sale.id);

    try {
      const { error: rpcError } = await supabase.rpc(
        'store_affiliate_admin_set_sale_status',
        {
          p_sale_record_id: sale.id,
          p_new_status: newStatus,
          p_reason: reason.trim(),
        }
      );

      if (rpcError) throw rpcError;

      setNotice(
        `Commission status updated to "${newStatus}".`
      );

      await loadData();
    } catch (err) {
      setError(
        err.message ||
          'Unable to update this commission. Check the database response.'
      );
    } finally {
      setBusyId('');
    }
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    background: '#fff',
    color: '#111827',
    fontSize: 14,
  };

  const panelStyle = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 18,
    minWidth: 0,
  };

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 650,
    whiteSpace: 'nowrap',
  };

  return (
    <main
      style={{
        maxWidth: 1500,
        margin: '0 auto',
        padding: '24px 16px 48px',
        color: '#111827',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div>
          <p
            style={{
              margin: '0 0 6px',
              color: '#b77900',
              fontSize: 12,
              fontWeight: 750,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Valuedam Store
          </p>
          <h1 style={{ margin: 0, fontSize: 27 }}>
            Commission Review
          </h1>
          <p
            style={{
              color: '#6b7280',
              margin: '8px 0 0',
              lineHeight: 1.6,
            }}
          >
            Review recorded affiliate sales and manage commission statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          style={buttonStyle}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            background: '#fef2f2',
            color: '#991b1b',
            borderRadius: 9,
            padding: 13,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'center',
            background: '#f0fdf4',
            color: '#166534',
            borderRadius: 9,
            padding: 13,
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <section style={panelStyle}>
          <div style={{ color: '#6b7280', fontSize: 13 }}>
            Pending commissions
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 9 }}>
            {pendingCount}
          </div>
          <div style={{ color: '#9a3412', fontSize: 12, marginTop: 6 }}>
            Awaiting review
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ color: '#6b7280', fontSize: 13 }}>
            Pending commission value
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              marginTop: 9,
              overflowWrap: 'anywhere',
            }}
          >
            {money(pendingTotal)}
          </div>
          <div style={{ color: '#9a3412', fontSize: 12, marginTop: 6 }}>
            Not yet approved
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ color: '#6b7280', fontSize: 13 }}>
            Approved commission value
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#15803d',
              marginTop: 9,
              overflowWrap: 'anywhere',
            }}
          >
            {money(approvedTotal)}
          </div>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
            Approved status, not proof of payout
          </div>
        </section>
      </div>

      <section style={panelStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 19, margin: 0 }}>
              Recorded affiliate sales
            </h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '6px 0 0' }}>
              Showing {filteredSales.length} of {sales.length} loaded records.
              Latest 1,000 records are loaded.
            </p>
          </div>
          <ClipboardCheck size={24} color="#b77900" />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: 11,
                top: 12,
                color: '#9ca3af',
              }}
            />
            <input
              aria-label="Search sales and affiliates"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sales or affiliates"
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>

          <select
            aria-label="Filter by affiliate"
            value={affiliateFilter}
            onChange={(e) => setAffiliateFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="all">All affiliates</option>
            {affiliates.map((affiliate) => (
              <option key={affiliate.id} value={affiliate.id}>
                {affiliate.full_name || affiliate.email || affiliate.id}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by sale type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={inputStyle}
          >
            <option value="all">All sale types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by commission status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={inputStyle}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === 'all'
                  ? 'All statuses'
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 35, color: '#6b7280' }}>
            <LoaderCircle
              size={24}
              style={{ display: 'inline-block', marginBottom: 8 }}
            />
            <div>Loading commission records…</div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div
            style={{
              padding: 35,
              textAlign: 'center',
              background: '#f9fafb',
              borderRadius: 10,
              color: '#6b7280',
            }}
          >
            No commission records match these filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 1050,
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  {[
                    'Recorded',
                    'Affiliate',
                    'Sale type',
                    'Sale amount',
                    'Commission',
                    'Status',
                    'Sale reference',
                    'Review actions',
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: '12px 10px',
                        borderBottom: '1px solid #e5e7eb',
                        color: '#4b5563',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const affiliate = affiliateMap[sale.affiliate_id];
                  const isBusy = busyId === sale.id;
                  const statusStyle =
                    STATUS_COLORS[sale.status] || {
                      background: '#f3f4f6',
                      color: '#374151',
                    };

                  return (
                    <tr key={sale.id}>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: '1px solid #f3f4f6',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dateTime(sale.sale_date || sale.created_at)}
                      </td>

                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: 700 }}>
                          {affiliate?.full_name || 'Affiliate'}
                        </div>
                        <div style={{ color: '#6b7280', marginTop: 4 }}>
                          {affiliate?.email || ''}
                        </div>
                        <div style={{ color: '#9a6700', marginTop: 4 }}>
                          {affiliate?.referral_code || ''}
                        </div>
                      </td>

                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        {TYPE_LABELS[sale.sale_type] || sale.sale_type || '—'}
                      </td>

                      <td
                        style={{
                          padding: 10,
                          borderBottom: '1px solid #f3f4f6',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {money(sale.sale_amount, sale.currency)}
                      </td>

                      <td
                        style={{
                          padding: 10,
                          borderBottom: '1px solid #f3f4f6',
                          fontWeight: 750,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {money(sale.commission_amount, sale.currency)}
                        <div
                          style={{
                            color: '#6b7280',
                            fontSize: 11,
                            marginTop: 4,
                            fontWeight: 400,
                          }}
                        >
                          {sale.commission_type === 'percentage'
                            ? `${sale.commission_rate || 0}%`
                            : 'Fixed commission'}
                        </div>
                      </td>

                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            borderRadius: 20,
                            padding: '5px 9px',
                            background: statusStyle.background,
                            color: statusStyle.color,
                            fontSize: 11,
                            fontWeight: 750,
                          }}
                        >
                          {sale.status || 'unknown'}
                        </span>
                        {sale.notes && (
                          <div
                            title={sale.notes}
                            style={{
                              maxWidth: 170,
                              color: '#6b7280',
                              marginTop: 5,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {sale.notes}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: 600 }}>
                          {sale.sale_reference || 'No reference'}
                        </div>
                        {sale.customer_reference && (
                          <div style={{ color: '#6b7280', marginTop: 4 }}>
                            Customer: {sale.customer_reference}
                          </div>
                        )}
                        <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
                          Record: {String(sale.id).slice(0, 12)}…
                        </div>
                      </td>

                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            maxWidth: 240,
                          }}
                        >
                          {sale.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy || Boolean(busyId)}
                                onClick={() => changeSaleStatus(sale, 'approved')}
                                style={{
                                  ...buttonStyle,
                                  background: '#f0fdf4',
                                  color: '#166534',
                                  borderColor: '#bbf7d0',
                                }}
                              >
                                {isBusy ? (
                                  <LoaderCircle size={14} />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                Approve
                              </button>

                              <button
                                type="button"
                                disabled={isBusy || Boolean(busyId)}
                                onClick={() => changeSaleStatus(sale, 'rejected')}
                                style={{
                                  ...buttonStyle,
                                  background: '#fef2f2',
                                  color: '#991b1b',
                                  borderColor: '#fecaca',
                                }}
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </>
                          )}

                          {sale.status === 'approved' && (
                            <button
                              type="button"
                              disabled={isBusy || Boolean(busyId)}
                              onClick={() => changeSaleStatus(sale, 'reversed')}
                              style={{
                                ...buttonStyle,
                                background: '#f9fafb',
                                color: '#4b5563',
                              }}
                            >
                              <RotateCcw size={14} />
                              Reverse
                            </button>
                          )}

                          {['rejected', 'reversed', 'paid'].includes(sale.status) && (
                            <span style={{ color: '#6b7280', fontSize: 12 }}>
                              No review action
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
