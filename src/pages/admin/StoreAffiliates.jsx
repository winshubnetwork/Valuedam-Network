
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock3,
  Ban,
  Copy,
  AlertCircle,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
];

const initialForm = {
  full_name: '',
  email: '',
  phone: '',
  referral_code: '',
};

const colors = {
  ink: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  yellow: '#f5b82e',
  green: '#047857',
  red: '#b91c1c',
};

function statusStyle(status) {
  const styles = {
    approved: { background: '#d1fae5', color: '#065f46' },
    pending: { background: '#fef3c7', color: '#92400e' },
    suspended: { background: '#fee2e2', color: '#991b1b' },
    rejected: { background: '#f3f4f6', color: '#4b5563' },
  };

  return styles[status] || styles.pending;
}

function StatusBadge({ status }) {
  const style = statusStyle(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {STATUS_OPTIONS.find((item) => item.value === status)?.label || status}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, color }) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 13,
        padding: 17,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 43,
          height: 43,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          background: `${color}15`,
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={21} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: colors.muted }}>{label}</div>
        <div
          style={{
            fontSize: 25,
            lineHeight: 1.25,
            fontWeight: 850,
            color: colors.ink,
            marginTop: 3,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  border: `1px solid ${colors.border}`,
  borderRadius: 9,
  padding: '11px 12px',
  background: '#fff',
  color: colors.ink,
  fontSize: 13,
  outlineColor: colors.yellow,
};

const buttonStyle = {
  border: 'none',
  borderRadius: 9,
  padding: '10px 13px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
};

export default function StoreAffiliates() {
  const [affiliates, setAffiliates] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [savingCodeId, setSavingCodeId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAffiliates = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data, error: queryError } = await supabase
      .from('store_affiliates')
      .select(
        'id, full_name, email, phone, referral_code, status, notes, created_at, approved_at'
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setAffiliates([]);
    } else {
      setAffiliates(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAffiliates();
  }, [loadAffiliates]);

  const counts = useMemo(
    () => ({
      total: affiliates.length,
      approved: affiliates.filter((a) => a.status === 'approved').length,
      pending: affiliates.filter((a) => a.status === 'pending').length,
      suspended: affiliates.filter((a) => a.status === 'suspended').length,
    }),
    [affiliates]
  );

  const filteredAffiliates = useMemo(() => {
    const term = search.trim().toLowerCase();

    return affiliates.filter((affiliate) => {
      const matchesStatus =
        statusFilter === 'all' || affiliate.status === statusFilter;

      const searchable = [
        affiliate.full_name,
        affiliate.email,
        affiliate.phone,
        affiliate.referral_code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!term || searchable.includes(term));
    });
  }, [affiliates, search, statusFilter]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]:
        field === 'referral_code'
          ? value.toLowerCase().replace(/\s+/g, '_')
          : value,
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const fullName = form.full_name.trim();
    const email = form.email.trim().toLowerCase() || null;
    const phone = form.phone.trim() || null;
    const referralCode = form.referral_code.trim().toLowerCase();

    if (!fullName) {
      setError('Enter the affiliate’s full name.');
      return;
    }

    if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(referralCode)) {
      setError(
        'Referral IDs must be 3–40 characters and use lowercase letters, numbers, underscores, or hyphens. They cannot start with a symbol.'
      );
      return;
    }

    setSaving(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const { error: insertError } = await supabase
        .from('store_affiliates')
        .insert({
          full_name: fullName,
          email,
          phone,
          referral_code: referralCode,
          status: 'pending',
          created_by: authData.user?.id || null,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(
            'That referral ID or email is already in use. Choose a unique value.'
          );
        }

        if (insertError.code === '42501') {
          throw new Error(
            'Permission denied. Check that you are signed in as a store administrator.'
          );
        }

        throw insertError;
      }

      setForm(initialForm);
      setSuccess(
        'Affiliate created successfully with Pending status. Approve the affiliate when you are ready.'
      );

      await loadAffiliates();
    } catch (err) {
      setError(err.message || 'Could not create the affiliate.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(affiliate, nextStatus) {
    if (affiliate.status === nextStatus) return;

    const confirmed = window.confirm(
      `Change ${affiliate.full_name}'s status to ${nextStatus}?`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');
    setUpdatingId(affiliate.id);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const update = {
        status: nextStatus,
        approved_at:
          nextStatus === 'approved' ? new Date().toISOString() : null,
        approved_by:
          nextStatus === 'approved' ? authData.user?.id || null : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('store_affiliates')
        .update(update)
        .eq('id', affiliate.id);

      if (updateError) throw updateError;

      setSuccess(
        `${affiliate.full_name}'s status is now ${nextStatus}.`
      );

      await loadAffiliates();
    } catch (err) {
      setError(err.message || 'Could not update affiliate status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function copyReferralCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setSuccess(`Referral ID "${code}" copied.`);
      setError('');
    } catch {
      setError(
        'Clipboard access was unavailable. Select and copy the referral ID manually.'
      );
    }
  }

  function startEditingReferralCode(affiliate) {
    setError('');
    setSuccess('');
    setEditingId(affiliate.id);
    setEditCode(affiliate.referral_code || '');
  }

  function cancelEditingReferralCode() {
    setEditingId(null);
    setEditCode('');
  }

  async function saveReferralCode(affiliate) {
    setError('');
    setSuccess('');

    const normalizedCode = editCode.trim().toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(normalizedCode)) {
      setError(
        'Referral IDs must be 3–40 characters and use letters, numbers, underscores, or hyphens. They must start with a letter or number.'
      );
      return;
    }

    if (normalizedCode === affiliate.referral_code) {
      cancelEditingReferralCode();
      return;
    }

    const confirmed = window.confirm(
      `Change ${affiliate.full_name}'s referral ID from "${affiliate.referral_code}" to "${normalizedCode}"? Any old links using the previous ID may stop working once referral tracking is enabled.`
    );
    if (!confirmed) return;

    setSavingCodeId(affiliate.id);
    try {
      const { error: updateError } = await supabase
        .from('store_affiliates')
        .update({
          referral_code: normalizedCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', affiliate.id);

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('That referral ID is already in use. Choose a different ID.');
        }
        if (updateError.code === '23514') {
          throw new Error('That referral ID format is not allowed. Use 3–40 letters, numbers, underscores, or hyphens.');
        }
        throw updateError;
      }

      setSuccess(`Referral ID updated to "${normalizedCode}".`);
      cancelEditingReferralCode();
      await loadAffiliates();
    } catch (err) {
      setError(err.message || 'Could not update the referral ID.');
    } finally {
      setSavingCodeId(null);
    }
  }

  async function copyReferralLink(code) {
    const link = `https://valuedam.com.ng/store?ref=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(link);
      setSuccess('Referral URL copied. Referral tracking still needs to be connected before this link can attribute sales.');
      setError('');
    } catch {
      setError('Clipboard access was unavailable. Copy this URL manually: ' + link);
    }
  }

  return (
    <div
      style={{
        maxWidth: 1500,
        margin: '0 auto',
        padding: 'clamp(14px, 3vw, 28px)',
        color: colors.ink,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              color: '#92400e',
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              marginBottom: 8,
            }}
          >
            <Users size={16} />
            Valuedam Store
          </div>

          <h1
            style={{
              fontSize: 'clamp(24px, 3vw, 32px)',
              lineHeight: 1.2,
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-.04em',
            }}
          >
            Affiliate Management
          </h1>

          <p
            style={{
              color: colors.muted,
              fontSize: 13,
              lineHeight: 1.7,
              margin: '9px 0 0',
              maxWidth: 650,
            }}
          >
            Create affiliate accounts, assign unique referral IDs, and manage
            approval status. Referral tracking and commission processing will
            be connected in later steps.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAffiliates}
          disabled={loading}
          style={{
            ...buttonStyle,
            background: '#fff',
            color: colors.ink,
            border: `1px solid ${colors.border}`,
            minHeight: 40,
          }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: 13,
            borderRadius: 10,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 12,
            lineHeight: 1.6,
            marginBottom: 16,
            overflowWrap: 'anywhere',
          }}
        >
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            padding: 13,
            borderRadius: 10,
            border: '1px solid #a7f3d0',
            background: '#ecfdf5',
            color: '#065f46',
            fontSize: 12,
            lineHeight: 1.6,
            marginBottom: 16,
            overflowWrap: 'anywhere',
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        <MetricCard
          label="Total affiliates"
          value={counts.total}
          icon={Users}
          color="#4f46e5"
        />
        <MetricCard
          label="Approved"
          value={counts.approved}
          icon={CheckCircle2}
          color="#059669"
        />
        <MetricCard
          label="Awaiting review"
          value={counts.pending}
          icon={Clock3}
          color="#d97706"
        />
        <MetricCard
          label="Suspended"
          value={counts.suspended}
          icon={Ban}
          color="#dc2626"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 0.8fr))',
          gap: 18,
          alignItems: 'start',
        }}
      >
        <section
          style={{
            background: '#fff',
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: '20px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: 'grid',
                placeItems: 'center',
                background: '#fef3c7',
                color: '#92400e',
              }}
            >
              <UserPlus size={19} />
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 850 }}>
                Add an affiliate
              </h2>
              <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 11 }}>
                New affiliates start as Pending.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} style={{ marginTop: 21 }}>
            <label
              htmlFor="affiliate-full-name"
              style={{ display: 'block', fontSize: 12, fontWeight: 750, marginBottom: 7 }}
            >
              Full name *
            </label>
            <input
              id="affiliate-full-name"
              autoComplete="name"
              required
              maxLength={150}
              value={form.full_name}
              onChange={(event) => updateField('full_name', event.target.value)}
              placeholder="Affiliate's full name"
              style={{ ...inputStyle, marginBottom: 15 }}
            />

            <label
              htmlFor="affiliate-email"
              style={{ display: 'block', fontSize: 12, fontWeight: 750, marginBottom: 7 }}
            >
              Email address
            </label>
            <input
              id="affiliate-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="name@example.com"
              style={{ ...inputStyle, marginBottom: 15 }}
            />

            <label
              htmlFor="affiliate-phone"
              style={{ display: 'block', fontSize: 12, fontWeight: 750, marginBottom: 7 }}
            >
              Phone number
            </label>
            <input
              id="affiliate-phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="Phone number"
              style={{ ...inputStyle, marginBottom: 15 }}
            />

            <label
              htmlFor="affiliate-referral-code"
              style={{ display: 'block', fontSize: 12, fontWeight: 750, marginBottom: 7 }}
            >
              Unique referral ID *
            </label>
            <input
              id="affiliate-referral-code"
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9][a-z0-9_-]{2,39}"
              value={form.referral_code}
              onChange={(event) => updateField('referral_code', event.target.value)}
              placeholder="e.g. john123 or tech_deals2026"
              style={{ ...inputStyle, marginBottom: 7 }}
            />
            <p
              style={{
                color: colors.muted,
                fontSize: 11,
                lineHeight: 1.6,
                margin: '0 0 18px',
              }}
            >
              Use 3–40 lowercase letters, numbers, underscores, or hyphens.
              Spaces are converted to underscores. Referral IDs must be unique.
            </p>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                width: '100%',
                padding: '12px 15px',
                background: saving ? '#e5e7eb' : colors.yellow,
                color: colors.ink,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              <UserPlus size={16} />
              {saving ? 'Creating affiliate…' : 'Create affiliate'}
            </button>
          </form>
        </section>

        <section
          style={{
            background: '#fff',
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: 20,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: 17,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 850 }}>
                Affiliate records
              </h2>
              <p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 11 }}>
                {filteredAffiliates.length} displayed
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
              gap: 9,
              marginBottom: 16,
            }}
          >
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                }}
              />
              <input
                aria-label="Search affiliates"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or referral ID"
                style={{ ...inputStyle, paddingLeft: 35 }}
              />
            </div>

            <select
              aria-label="Filter by affiliate status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div
              style={{
                padding: '44px 12px',
                textAlign: 'center',
                color: colors.muted,
                fontSize: 13,
              }}
            >
              <RefreshCw size={22} style={{ marginBottom: 10 }} />
              <div>Loading affiliate records…</div>
            </div>
          ) : error && affiliates.length === 0 ? (
            <div
              style={{
                padding: '25px 12px',
                textAlign: 'center',
                color: colors.muted,
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              Affiliate records could not be loaded. Check the database error
              above and confirm that the admin account has permission.
            </div>
          ) : filteredAffiliates.length === 0 ? (
            <div
              style={{
                padding: '45px 12px',
                textAlign: 'center',
                border: `1px dashed ${colors.border}`,
                borderRadius: 12,
              }}
            >
              <Users size={28} color="#9ca3af" />
              <p style={{ margin: '12px 0 4px', fontWeight: 800, fontSize: 13 }}>
                No affiliates found
              </p>
              <p style={{ margin: 0, color: colors.muted, fontSize: 12 }}>
                Create your first affiliate or change your search filters.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 11 }}>
              {filteredAffiliates.map((affiliate) => (
                <article
                  key={affiliate.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 14,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 170px' }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 850,
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {affiliate.full_name}
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 11,
                          lineHeight: 1.6,
                          color: colors.muted,
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {affiliate.email || 'No email provided'}
                        {affiliate.phone ? ` · ${affiliate.phone}` : ''}
                      </div>
                    </div>

                    <StatusBadge status={affiliate.status} />
                  </div>

                  <div
                    style={{
                      marginTop: 13,
                      padding: '10px 11px',
                      borderRadius: 9,
                      background: '#f9fafb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 160px' }}>
                      <div
                        style={{
                          color: colors.muted,
                          fontSize: 10,
                          marginBottom: 4,
                        }}
                      >
                        Referral ID
                      </div>
                      {editingId === affiliate.id ? (
                        <input
                          aria-label={`Edit referral ID for ${affiliate.full_name}`}
                          autoFocus
                          minLength={3}
                          maxLength={40}
                          value={editCode}
                          onChange={(event) =>
                            setEditCode(event.target.value.toLowerCase().replace(/\s+/g, '_'))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              saveReferralCode(affiliate);
                            }
                            if (event.key === 'Escape') cancelEditingReferralCode();
                          }}
                          style={{ ...inputStyle, maxWidth: 320, padding: '8px 9px' }}
                        />
                      ) : (
                        <code
                          style={{
                            color: '#92400e',
                            fontSize: 12,
                            fontWeight: 800,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {affiliate.referral_code}
                        </code>
                      )}
                    </div>

                    {editingId === affiliate.id ? (
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={savingCodeId === affiliate.id}
                          onClick={() => saveReferralCode(affiliate)}
                          style={{ ...buttonStyle, background: colors.yellow, color: colors.ink, padding: 9 }}
                        >
                          <Save size={14} />
                          {savingCodeId === affiliate.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          disabled={savingCodeId === affiliate.id}
                          onClick={cancelEditingReferralCode}
                          style={{ ...buttonStyle, background: '#fff', border: `1px solid ${colors.border}`, color: colors.ink, padding: 9 }}
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          title="Edit referral ID"
                          aria-label={`Edit referral ID for ${affiliate.full_name}`}
                          onClick={() => startEditingReferralCode(affiliate)}
                          disabled={savingCodeId !== null}
                          style={{ ...buttonStyle, background: '#fff', border: `1px solid ${colors.border}`, color: colors.ink, padding: 9 }}
                        >
                          <Pencil size={14} />
                          Edit ID
                        </button>
                        <button
                          type="button"
                          title="Copy referral ID"
                          aria-label={`Copy ${affiliate.referral_code}`}
                          onClick={() => copyReferralCode(affiliate.referral_code)}
                          style={{ ...buttonStyle, background: '#fff', border: `1px solid ${colors.border}`, color: colors.ink, padding: 9 }}
                        >
                          <Copy size={14} />
                          Copy ID
                        </button>
                        <button
                          type="button"
                          title="Copy referral URL; tracking activation is still required"
                          onClick={() => copyReferralLink(affiliate.referral_code)}
                          style={{ ...buttonStyle, background: '#fff', border: `1px solid ${colors.border}`, color: colors.ink, padding: 9 }}
                        >
                          <Copy size={14} />
                          Copy URL
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 9,
                    }}
                  >
                    <span style={{ color: colors.muted, fontSize: 10 }}>
                      Added{' '}
                      {affiliate.created_at
                        ? new Date(affiliate.created_at).toLocaleDateString()
                        : '—'}
                    </span>

                    <select
                      aria-label={`Change status for ${affiliate.full_name}`}
                      value={affiliate.status}
                      disabled={updatingId === affiliate.id}
                      onChange={(event) =>
                        changeStatus(affiliate, event.target.value)
                      }
                      style={{
                        ...inputStyle,
                        width: 'auto',
                        maxWidth: '100%',
                        padding: '8px 10px',
                        fontSize: 11,
                        fontWeight: 750,
                        cursor: updatingId === affiliate.id ? 'wait' : 'pointer',
                      }}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {updatingId === affiliate.id
                            ? 'Updating…'
                            : `Set ${option.label}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 11,
          border: '1px solid #fde68a',
          background: '#fffbeb',
          color: '#78350f',
          fontSize: 11,
          lineHeight: 1.7,
        }}
      >
        <strong>Tracking status:</strong> Referral IDs can now be edited and referral URLs can be copied. The URL format is prepared, but referral tracking is not active yet, so do not use these URLs for live affiliate campaigns until tracking is connected.
      </div>
    </div>
  );
}
