
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Search,
  Wallet,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Copy,
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

const ENTRY_TYPES = [
  { value: 'all', label: 'All transaction types' },
  { value: 'commission', label: 'Commission' },
  { value: 'credit', label: 'Manual credit' },
  { value: 'debit', label: 'Manual deduction' },
  { value: 'payout', label: 'Payout' },
  { value: 'reversal', label: 'Reversal' },
];

const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

const ENTRY_LABELS = {
  commission: 'Commission',
  credit: 'Manual credit',
  debit: 'Manual deduction',
  payout: 'Payout',
  reversal: 'Reversal',
};

const STATUS_COLORS = {
  pending: '#b45309',
  approved: '#15803d',
  paid: '#1d4ed8',
  void: '#6b7280',
};

function entrySignedAmount(entry) {
  const amount = Number(entry.amount || 0);

  if (['debit', 'payout', 'reversal'].includes(entry.entry_type)) {
    return -amount;
  }

  return amount;
}

export default function StoreAffiliateLedger() {
  const [entries, setEntries] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [affiliateFilter, setAffiliateFilter] = useState('all');

  const [form, setForm] = useState({
    affiliate_id: '',
    entry_type: 'credit',
    amount: '',
    description: '',
    reason: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [ledgerResult, affiliatesResult] = await Promise.all([
        supabase
          .from('store_affiliate_ledger')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('store_affiliates')
          .select('id, full_name, email, referral_code, status')
          .order('created_at', { ascending: false }),
      ]);

      if (ledgerResult.error) throw ledgerResult.error;
      if (affiliatesResult.error) throw affiliatesResult.error;

      setEntries(ledgerResult.data || []);
      setAffiliates(affiliatesResult.data || []);

      setForm((current) => {
        if (
          current.affiliate_id &&
          (affiliatesResult.data || []).some(
            (affiliate) => affiliate.id === current.affiliate_id
          )
        ) {
          return current;
        }

        return {
          ...current,
          affiliate_id: affiliatesResult.data?.[0]?.id || '',
        };
      });
    } catch (err) {
      setError(err.message || 'Unable to load the affiliate ledger.');
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
        affiliates.map((affiliate) => [
          affiliate.id,
          affiliate,
        ])
      ),
    [affiliates]
  );

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const affiliate = affiliateMap[entry.affiliate_id];
      const searchable = [
        affiliate?.full_name,
        affiliate?.email,
        affiliate?.referral_code,
        entry.description,
        entry.reason,
        entry.entry_type,
        entry.status,
        entry.sale_id,
        entry.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        (!term || searchable.includes(term)) &&
        (typeFilter === 'all' || entry.entry_type === typeFilter) &&
        (statusFilter === 'all' || entry.status === statusFilter) &&
        (affiliateFilter === 'all' ||
          entry.affiliate_id === affiliateFilter)
      );
    });
  }, [
    entries,
    affiliateMap,
    search,
    typeFilter,
    statusFilter,
    affiliateFilter,
  ]);

  const summary = useMemo(() => {
    return filteredEntries.reduce(
      (totals, entry) => {
        // Pending and void entries are excluded from this summary.
        if (!['approved', 'paid'].includes(entry.status)) return totals;

        const amount = Number(entry.amount || 0);

        if (entry.entry_type === 'credit' || entry.entry_type === 'commission') {
          totals.credits += amount;
        } else if (
          ['debit', 'payout', 'reversal'].includes(entry.entry_type)
        ) {
          totals.deductions += amount;
        }

        totals.net += entrySignedAmount(entry);
        return totals;
      },
      { credits: 0, deductions: 0, net: 0 }
    );
  }, [filteredEntries]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const recordAdjustment = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const amount = Number(form.amount);

    if (!form.affiliate_id) {
      setError('Select an affiliate first.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    if (!form.description.trim()) {
      setError('Enter a transaction description.');
      return;
    }

    if (!form.reason.trim()) {
      setError('Enter a reason for the audit trail.');
      return;
    }

    const confirmed = window.confirm(
      `Record a ${form.entry_type === 'credit' ? 'CREDIT' : 'DEDUCTION'} of ${money(amount)}?\n\nThis will create a permanent ledger entry.`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        'store_affiliate_admin_adjust_balance',
        {
          p_affiliate_id: form.affiliate_id,
          p_entry_type: form.entry_type,
          p_amount: amount,
          p_description: form.description.trim(),
          p_reason: form.reason.trim(),
        }
      );

      if (rpcError) throw rpcError;

      setNotice(
        `The ${form.entry_type === 'credit' ? 'credit' : 'deduction'} was recorded successfully.`
      );

      setForm((current) => ({
        ...current,
        amount: '',
        description: '',
        reason: '',
      }));

      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to record the adjustment.');
    } finally {
      setSaving(false);
    }
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      setNotice('Copied to clipboard.');
    } catch {
      setError('Could not copy automatically. Select and copy the value manually.');
    }
  };

  const selectStyle = {
    width: '100%',
    padding: '11px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    background: '#fff',
    color: '#111827',
    fontSize: 14,
  };

  const inputStyle = {
    ...selectStyle,
    boxSizing: 'border-box',
  };

  const panelStyle = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 18,
    minWidth: 0,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 7,
    color: '#374151',
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
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div>
          <p
            style={{
              color: '#b77900',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              margin: '0 0 6px',
            }}
          >
            Valuedam Store
          </p>
          <h1 style={{ fontSize: 27, margin: 0 }}>
            Affiliate Transaction Ledger
          </h1>
          <p style={{ color: '#6b7280', margin: '8px 0 0', lineHeight: 1.6 }}>
            Review recorded transactions and make documented manual adjustments.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #d1d5db',
            borderRadius: 9,
            padding: '10px 14px',
            background: '#fff',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            color: '#991b1b',
            padding: 13,
            borderRadius: 9,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 9,
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
            background: '#f0fdf4',
            color: '#166534',
            padding: 13,
            borderRadius: 9,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
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
        {[
          {
            label: 'Approved credits',
            value: money(summary.credits),
            color: '#15803d',
            icon: ArrowUpCircle,
          },
          {
            label: 'Approved deductions',
            value: money(summary.deductions),
            color: '#b91c1c',
            icon: ArrowDownCircle,
          },
          {
            label: 'Net ledger movement',
            value: money(summary.net),
            color: '#111827',
            icon: Wallet,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <section key={item.label} style={panelStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  color: '#6b7280',
                  fontSize: 13,
                }}
              >
                <Icon size={18} color={item.color} />
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 23,
                  fontWeight: 750,
                  color: item.color,
                  marginTop: 12,
                  overflowWrap: 'anywhere',
                }}
              >
                {item.value}
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0' }}>
                Based on the currently filtered entries
              </p>
            </section>
          );
        })}
      </div>

      <section style={{ ...panelStyle, marginBottom: 22 }}>
        <h2 style={{ fontSize: 19, margin: '0 0 6px' }}>
          Record a manual adjustment
        </h2>
        <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
          Each adjustment is recorded by the database with the administrator,
          description, reason, amount, and timestamp.
        </p>

        {affiliates.length === 0 ? (
          <p style={{ color: '#92400e', background: '#fffbeb', padding: 12, borderRadius: 8 }}>
            No affiliates exist yet. Create an affiliate before recording an adjustment.
          </p>
        ) : (
          <form onSubmit={recordAdjustment}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 15,
              }}
            >
              <div>
                <label style={labelStyle} htmlFor="ledger-affiliate">
                  Affiliate
                </label>
                <select
                  id="ledger-affiliate"
                  value={form.affiliate_id}
                  onChange={(e) => updateForm('affiliate_id', e.target.value)}
                  style={selectStyle}
                  required
                >
                  <option value="">Select affiliate</option>
                  {affiliates.map((affiliate) => (
                    <option key={affiliate.id} value={affiliate.id}>
                      {affiliate.full_name || affiliate.email || 'Unnamed affiliate'}
                      {affiliate.referral_code ? ` — ${affiliate.referral_code}` : ''}
                      {affiliate.status ? ` (${affiliate.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle} htmlFor="ledger-type">
                  Adjustment type
                </label>
                <select
                  id="ledger-type"
                  value={form.entry_type}
                  onChange={(e) => updateForm('entry_type', e.target.value)}
                  style={selectStyle}
                >
                  <option value="credit">Credit — add value</option>
                  <option value="debit">Deduction — subtract value</option>
                </select>
              </div>

              <div>
                <label style={labelStyle} htmlFor="ledger-amount">
                  Amount (₦)
                </label>
                <input
                  id="ledger-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => updateForm('amount', e.target.value)}
                  placeholder="e.g. 5000"
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="ledger-description">
                  Description
                </label>
                <input
                  id="ledger-description"
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="e.g. Promotional bonus"
                  style={inputStyle}
                  maxLength={300}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle} htmlFor="ledger-reason">
                  Reason / audit note
                </label>
                <textarea
                  id="ledger-reason"
                  value={form.reason}
                  onChange={(e) => updateForm('reason', e.target.value)}
                  placeholder="Explain why this adjustment is necessary."
                  style={{
                    ...inputStyle,
                    minHeight: 85,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  maxLength={2000}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !form.affiliate_id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                marginTop: 16,
                padding: '12px 18px',
                border: 0,
                borderRadius: 9,
                background: saving ? '#9ca3af' : '#f5b82e',
                color: '#111827',
                fontWeight: 750,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? (
                <LoaderCircle size={17} />
              ) : (
                <Wallet size={17} />
              )}
              {saving ? 'Recording…' : 'Record adjustment'}
            </button>
          </form>
        )}
      </section>

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
            <h2 style={{ fontSize: 19, margin: 0 }}>Transaction history</h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '6px 0 0' }}>
              Showing {filteredEntries.length} of {entries.length} loaded entries.
              The latest 1,000 entries are loaded.
            </p>
          </div>
          <Wallet size={24} color="#b77900" />
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search affiliate or transaction"
              aria-label="Search ledger"
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>

          <select
            value={affiliateFilter}
            onChange={(e) => setAffiliateFilter(e.target.value)}
            aria-label="Filter by affiliate"
            style={selectStyle}
          >
            <option value="all">All affiliates</option>
            {affiliates.map((affiliate) => (
              <option key={affiliate.id} value={affiliate.id}>
                {affiliate.full_name || affiliate.email || affiliate.id}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by transaction type"
            style={selectStyle}
          >
            {ENTRY_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            style={selectStyle}
          >
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 35, textAlign: 'center', color: '#6b7280' }}>
            <LoaderCircle
              size={25}
              style={{ display: 'inline-block', marginBottom: 8 }}
            />
            <div>Loading ledger…</div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div
            style={{
              padding: 35,
              textAlign: 'center',
              background: '#f9fafb',
              borderRadius: 10,
              color: '#6b7280',
            }}
          >
            No transactions match these filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: 850,
              }}
            >
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  {[
                    'Date',
                    'Affiliate',
                    'Type',
                    'Amount',
                    'Status',
                    'Description / reason',
                    'Reference',
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
                {filteredEntries.map((entry) => {
                  const affiliate = affiliateMap[entry.affiliate_id];
                  const signed = entrySignedAmount(entry);

                  return (
                    <tr key={entry.id}>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: '1px solid #f3f4f6',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dateTime(entry.created_at)}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: 650 }}>
                          {affiliate?.full_name || 'Affiliate'}
                        </div>
                        <div style={{ color: '#6b7280', marginTop: 4 }}>
                          {affiliate?.email || affiliate?.referral_code || ''}
                        </div>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        {ENTRY_LABELS[entry.entry_type] || entry.entry_type || '—'}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: '1px solid #f3f4f6',
                          fontWeight: 750,
                          color: signed < 0 ? '#b91c1c' : '#15803d',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {signed < 0 ? '−' : '+'}
                        {money(Math.abs(signed), entry.currency)}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: '#f3f4f6',
                            color: STATUS_COLORS[entry.status] || '#374151',
                          }}
                        >
                          {entry.status || 'unknown'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: '1px solid #f3f4f6',
                          maxWidth: 300,
                          overflowWrap: 'anywhere',
                        }}
                      >
                        <div>{entry.description || '—'}</div>
                        {entry.reason && (
                          <div
                            style={{
                              color: '#6b7280',
                              marginTop: 5,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            Reason: {entry.reason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f3f4f6' }}>
                        <button
                          type="button"
                          onClick={() => copyText(entry.id)}
                          title="Copy transaction ID"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 8px',
                            border: '1px solid #e5e7eb',
                            borderRadius: 7,
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          <Copy size={13} />
                          Copy ID
                        </button>
                        {entry.sale_id && (
                          <div
                            style={{
                              marginTop: 6,
                              color: '#6b7280',
                              fontSize: 11,
                            }}
                          >
                            Sale: {String(entry.sale_id).slice(0, 12)}…
                          </div>
                        )}
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
