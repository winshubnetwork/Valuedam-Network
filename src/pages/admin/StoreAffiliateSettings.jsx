
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Save,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DEFAULT_SETTINGS = {
  programme_enabled: false,
  default_commission_type: 'percentage',
  default_commission_rate: 5,
  recurring_commissions_enabled: false,
  max_recurring_cycles: 12,
  cookie_days: 30,
  allow_self_referrals: false,
  auto_approve_affiliates: false,
  minimum_payout: 5000,
  currency: 'NGN',
};

const FIELD_STYLE = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 9,
  background: '#fff',
  color: '#111827',
  fontSize: 14,
};

const LABEL_STYLE = {
  display: 'block',
  fontSize: 13,
  fontWeight: 650,
  color: '#374151',
  marginBottom: 7,
};

function Toggle({ label, description, checked, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 0',
        borderBottom: '1px solid #f0f1f3',
        cursor: 'pointer',
      }}
    >
      <span style={{ flex: 1 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 650,
            color: '#111827',
          }}
        >
          {label}
        </span>

        <span
          style={{
            display: 'block',
            marginTop: 4,
            fontSize: 12,
            lineHeight: 1.6,
            color: '#6b7280',
          }}
        >
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        style={{
          width: 19,
          height: 19,
          marginTop: 2,
          accentColor: '#b88708',
          flexShrink: 0,
        }}
      />
    </label>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {children}

      {hint && (
        <div
          style={{
            marginTop: 6,
            color: '#6b7280',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export default function StoreAffiliateSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error: loadError } = await supabase
      .from('store_affiliate_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (loadError) {
      setError(`Could not load settings: ${loadError.message}`);
      setLoading(false);
      return;
    }

    if (data) {
      setSettings({
        ...DEFAULT_SETTINGS,

        // Map the UI names to the actual database columns.
        programme_enabled: data.program_enabled ?? false,
        default_commission_type:
          data.default_commission_type ?? 'percentage',
        default_commission_rate:
          data.default_commission_rate ?? 5,
        recurring_commissions_enabled:
          data.recurring_commission_enabled ?? false,
        max_recurring_cycles:
          data.max_recurring_cycles ?? 12,
        cookie_days: data.cookie_duration_days ?? 30,
        allow_self_referrals: data.allow_self_referrals ?? false,
        auto_approve_affiliates:
          data.auto_approve_affiliates ?? false,
        minimum_payout: data.minimum_payout ?? 5000,
        currency: data.currency ?? 'NGN',
      });
    }

    setLoading(false);
  }

  function updateField(name, value) {
    setSettings((current) => ({
      ...current,
      [name]: value,
    }));

    setSuccess('');
    setError('');
  }

  async function saveSettings(event) {
    event.preventDefault();

    setError('');
    setSuccess('');

    const rate = Number(settings.default_commission_rate);
    const cycles = Number(settings.max_recurring_cycles);
    const cookieDays = Number(settings.cookie_days);
    const payout = Number(settings.minimum_payout);
    const currency = String(settings.currency || '')
      .trim()
      .toUpperCase();

    if (!Number.isFinite(rate) || rate < 0) {
      setError('Enter a valid default commission rate.');
      return;
    }

    if (
      settings.default_commission_type === 'percentage' &&
      rate > 100
    ) {
      setError('A percentage commission cannot exceed 100%.');
      return;
    }

    if (!Number.isInteger(cycles) || cycles < 1 || cycles > 120) {
      setError('Maximum recurring cycles must be between 1 and 120.');
      return;
    }

    if (
      !Number.isInteger(cookieDays) ||
      cookieDays < 1 ||
      cookieDays > 365
    ) {
      setError('Cookie duration must be between 1 and 365 days.');
      return;
    }

    if (!Number.isFinite(payout) || payout < 0) {
      setError('Enter a valid minimum payout amount.');
      return;
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      setError('Enter a three-letter currency code, such as NGN.');
      return;
    }

    // Use the exact column names from the existing Supabase table.
    // Do not include "id": it is a Boolean column in this schema.
    const payload = {
      program_enabled: Boolean(settings.programme_enabled),
      default_commission_type: settings.default_commission_type,
      default_commission_rate: rate,
      recurring_commission_enabled: Boolean(
        settings.recurring_commissions_enabled
      ),
      max_recurring_cycles: cycles,
      cookie_duration_days: cookieDays,
      allow_self_referrals: Boolean(settings.allow_self_referrals),
      auto_approve_affiliates: Boolean(
        settings.auto_approve_affiliates
      ),
      minimum_payout: payout,
      currency,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    try {
      /*
       * This settings table has a Boolean "id", not a normal record ID.
       * Update the existing single settings row without filtering on id.
       * If no row exists yet, insert the settings instead.
       */
      const { data: existing, error: lookupError } = await supabase
        .from('store_affiliate_settings')
        .select('program_enabled')
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        setError(`Could not check existing settings: ${lookupError.message}`);
        return;
      }

      let result;

      if (existing) {
        result = await supabase
          .from('store_affiliate_settings')
          .update(payload)
          .eq('program_enabled', existing.program_enabled)
          .select('program_enabled')
          .limit(1);
      } else {
        result = await supabase
          .from('store_affiliate_settings')
          .insert(payload)
          .select('program_enabled')
          .limit(1);
      }

      if (result.error) {
        setError(`Could not save settings: ${result.error.message}`);
        return;
      }

      if (!result.data || result.data.length === 0) {
        setError(
          'No settings row was updated. Check your admin permissions and try again.'
        );
        return;
      }

      setSettings((current) => ({
        ...current,
        programme_enabled: payload.program_enabled,
        default_commission_type: payload.default_commission_type,
        default_commission_rate: payload.default_commission_rate,
        recurring_commissions_enabled:
          payload.recurring_commission_enabled,
        max_recurring_cycles: payload.max_recurring_cycles,
        cookie_days: payload.cookie_duration_days,
        allow_self_referrals: payload.allow_self_referrals,
        auto_approve_affiliates: payload.auto_approve_affiliates,
        minimum_payout: payload.minimum_payout,
        currency: payload.currency,
      }));

      setSuccess('Affiliate programme settings saved successfully.');
    } catch (saveError) {
      setError(
        `Could not save settings: ${
          saveError?.message || 'An unexpected error occurred.'
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = FIELD_STYLE;

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          color: '#6b7280',
        }}
      >
        <LoaderCircle size={20} />
        Loading affiliate settings...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '20px 16px 48px',
        color: '#111827',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div>
          <Link
            to="/admin/store/affiliates"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 14,
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            <ArrowLeft size={15} />
            Back to affiliates
          </Link>

          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: 0,
              fontSize: 26,
              letterSpacing: '-0.6px',
            }}
          >
            <Settings2 size={27} color="#b88708" />
            Affiliate Settings
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              color: '#6b7280',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Configure the global rules for the Valuedam affiliate programme.
          </p>
        </div>

        <Link
          to="/admin/store/affiliates"
          style={{
            padding: '10px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: 9,
            textDecoration: 'none',
            color: '#374151',
            fontSize: 13,
            fontWeight: 600,
            background: '#fff',
          }}
        >
          Manage affiliates
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 18,
            padding: 13,
            borderRadius: 9,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 13,
            overflowWrap: 'anywhere',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginBottom: 18,
            padding: 13,
            borderRadius: 9,
            border: '1px solid #bbf7d0',
            background: '#f0fdf4',
            color: '#166534',
            fontSize: 13,
          }}
        >
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <form onSubmit={saveSettings}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 330px), 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <section
            style={{
              padding: 22,
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              background: '#fff',
              boxShadow: '0 3px 12px rgba(17,24,39,0.035)',
            }}
          >
            <h2 style={{ margin: '0 0 5px', fontSize: 17 }}>
              Programme controls
            </h2>

            <p style={{ margin: '0 0 10px', color: '#6b7280', fontSize: 12 }}>
              Control access and affiliate approval.
            </p>

            <Toggle
              label="Enable affiliate programme"
              description="Allows the programme to be activated. Referral tracking and commissions still require their implementation."
              checked={settings.programme_enabled}
              onChange={(value) =>
                updateField('programme_enabled', value)
              }
            />

            <Toggle
              label="Automatically approve affiliates"
              description="Sets the intended approval policy for new applications. The application workflow must enforce this setting."
              checked={settings.auto_approve_affiliates}
              onChange={(value) =>
                updateField('auto_approve_affiliates', value)
              }
            />

            <Toggle
              label="Allow self-referrals"
              description="Defines whether affiliates may earn commission on their own purchases. The attribution logic must enforce this."
              checked={settings.allow_self_referrals}
              onChange={(value) =>
                updateField('allow_self_referrals', value)
              }
            />
          </section>

          <section
            style={{
              padding: 22,
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              background: '#fff',
              boxShadow: '0 3px 12px rgba(17,24,39,0.035)',
            }}
          >
            <h2 style={{ margin: '0 0 5px', fontSize: 17 }}>
              Default commission
            </h2>

            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 12 }}>
              Used as the global default when a more specific rule is not set.
            </p>

            <div style={{ display: 'grid', gap: 18 }}>
              <Field label="Commission type">
                <select
                  value={settings.default_commission_type}
                  onChange={(event) =>
                    updateField(
                      'default_commission_type',
                      event.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="percentage">Percentage of sale</option>
                  <option value="fixed">Fixed amount per eligible sale</option>
                </select>
              </Field>

              <Field
                label={
                  settings.default_commission_type === 'percentage'
                    ? 'Default commission rate (%)'
                    : `Default commission amount (${settings.currency || 'NGN'})`
                }
                hint={
                  settings.default_commission_type === 'percentage'
                    ? 'Example: 5 means 5% of the eligible sale amount.'
                    : 'Enter the commission amount in the selected currency.'
                }
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.default_commission_rate}
                  onChange={(event) =>
                    updateField(
                      'default_commission_rate',
                      event.target.value
                    )
                  }
                  style={inputStyle}
                  required
                />
              </Field>

              <Field
                label="Currency code"
                hint="For example, NGN for Nigerian naira."
              >
                <input
                  value={settings.currency || ''}
                  onChange={(event) =>
                    updateField(
                      'currency',
                      event.target.value.toUpperCase()
                    )
                  }
                  maxLength={3}
                  placeholder="NGN"
                  style={inputStyle}
                  required
                />
              </Field>
            </div>
          </section>

          <section
            style={{
              padding: 22,
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              background: '#fff',
              boxShadow: '0 3px 12px rgba(17,24,39,0.035)',
            }}
          >
            <h2 style={{ margin: '0 0 5px', fontSize: 17 }}>
              Recurring commissions
            </h2>

            <p style={{ margin: '0 0 10px', color: '#6b7280', fontSize: 12 }}>
              Configure the default policy for eligible recurring sales.
            </p>

            <Toggle
              label="Allow recurring commissions"
              description="Enables recurring commissions in the programme policy. Subscription billing and commission processing must be connected separately."
              checked={settings.recurring_commissions_enabled}
              onChange={(value) =>
                updateField('recurring_commissions_enabled', value)
              }
            />

            <div style={{ marginTop: 20 }}>
              <Field
                label="Maximum recurring commission cycles"
                hint="Enter a value from 1 to 120. The commission engine must enforce this limit."
              >
                <input
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  value={settings.max_recurring_cycles}
                  onChange={(event) =>
                    updateField('max_recurring_cycles', event.target.value)
                  }
                  style={inputStyle}
                  required
                />
              </Field>
            </div>
          </section>

          <section
            style={{
              padding: 22,
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              background: '#fff',
              boxShadow: '0 3px 12px rgba(17,24,39,0.035)',
            }}
          >
            <h2 style={{ margin: '0 0 5px', fontSize: 17 }}>
              Referral and payout rules
            </h2>

            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 12 }}>
              Set attribution duration and the minimum payout threshold.
            </p>

            <div style={{ display: 'grid', gap: 20 }}>
              <Field
                label="Referral cookie duration (days)"
                hint="How long a referral may remain eligible for attribution after a visit. Tracking code must enforce this."
              >
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={settings.cookie_days}
                  onChange={(event) =>
                    updateField('cookie_days', event.target.value)
                  }
                  style={inputStyle}
                  required
                />
              </Field>

              <Field
                label={`Minimum payout (${settings.currency || 'NGN'})`}
                hint="This is a policy setting only. It does not initiate a bank transfer."
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.minimum_payout}
                  onChange={(event) =>
                    updateField('minimum_payout', event.target.value)
                  }
                  style={inputStyle}
                  required
                />
              </Field>
            </div>
          </section>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 11,
            border: '1px solid #fde68a',
            borderRadius: 12,
            background: '#fffbeb',
            color: '#92400e',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <ShieldCheck size={19} style={{ flexShrink: 0, marginTop: 1 }} />

          <div>
            <strong>Important:</strong> Saving these settings stores the
            programme rules. It does not yet implement referral tracking,
            commission calculations, subscription billing, eligibility checks,
            or payouts. Those features will be connected in later development
            stages.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 20,
          }}
        >
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              minWidth: 175,
              padding: '12px 18px',
              border: 'none',
              borderRadius: 10,
              background: saving ? '#d1d5db' : '#f5b82e',
              color: '#111827',
              fontWeight: 750,
              fontSize: 14,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? (
              <LoaderCircle size={17} />
            ) : (
              <Save size={17} />
            )}

            {saving ? 'Saving settings...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
