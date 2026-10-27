
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  LoaderCircle,
  Save,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const emptySettings = {
  store_name: 'Valuedam Online Store',
  currency: 'NGN',
  bank_transfer_enabled: false,
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_transfer_instructions: '',
  buy_now_button_text: 'Buy Now',
};

export default function StorePaymentSettings() {
  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const { data, error: loadError } = await supabase
          .from('store_settings')
          .select(
            [
              'store_name',
              'currency',
              'bank_transfer_enabled',
              'bank_name',
              'bank_account_name',
              'bank_account_number',
              'bank_transfer_instructions',
              'buy_now_button_text',
            ].join(', ')
          )
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (loadError) throw loadError;

        if (!data) {
          throw new Error(
            'No store settings record was found. Create the store settings record before continuing.'
          );
        }

        if (!active) return;

        setSettings({
          ...emptySettings,
          ...data,
          bank_transfer_enabled: data.bank_transfer_enabled === true,
          bank_name: data.bank_name || '',
          bank_account_name: data.bank_account_name || '',
          bank_account_number: data.bank_account_number || '',
          bank_transfer_instructions:
            data.bank_transfer_instructions || '',
          buy_now_button_text: data.buy_now_button_text || 'Buy Now',
        });
      } catch (err) {
        if (active) {
          setError(
            err?.message || 'Unable to load store payment settings.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function change(event) {
    const { name, value, type, checked } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setMessage('');
    setError('');
  }

  async function save(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    const bankName = settings.bank_name.trim();
    const accountName = settings.bank_account_name.trim();
    const accountNumber = settings.bank_account_number.trim();
    const instructions = settings.bank_transfer_instructions.trim();
    const buttonText =
      settings.buy_now_button_text.trim().slice(0, 40) || 'Buy Now';

    if (
      settings.bank_transfer_enabled &&
      (!bankName || !accountName || !accountNumber)
    ) {
      setError(
        'Enter the bank name, account name, and account number before enabling bank transfer.'
      );
      return;
    }

    setSaving(true);

    try {
      const { data, error: saveError } = await supabase.rpc(
        'store_admin_update_payment_settings',
        {
          p_bank_transfer_enabled: settings.bank_transfer_enabled,
          p_bank_name: bankName,
          p_bank_account_name: accountName,
          p_bank_account_number: accountNumber,
          p_bank_transfer_instructions: instructions,
          p_buy_now_button_text: buttonText,
        }
      );

      if (saveError) throw saveError;

      const saved = Array.isArray(data) ? data[0] : data;

      if (!saved || typeof saved !== 'object') {
        throw new Error(
          'The settings save response was empty. Reload the page and verify the settings.'
        );
      }

      setSettings((current) => ({
        ...current,
        ...saved,
        bank_transfer_enabled:
          saved.bank_transfer_enabled === true,
        bank_name: saved.bank_name || '',
        bank_account_name: saved.bank_account_name || '',
        bank_account_number: saved.bank_account_number || '',
        bank_transfer_instructions:
          saved.bank_transfer_instructions || '',
        buy_now_button_text:
          saved.buy_now_button_text || buttonText,
      }));

      setMessage('Store payment settings saved successfully.');
    } catch (err) {
      setError(
        err?.message || 'Unable to save store payment settings.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-card">
        <LoaderCircle size={22} className="spin" />
        <p>Loading store payment settings...</p>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#fff4cc',
            color: '#8a6200',
            flexShrink: 0,
          }}
        >
          <Wallet size={26} />
        </div>

        <div>
          <h2 style={{ margin: '0 0 5px' }}>
            Store Payment Settings
          </h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Configure bank transfers and checkout button text for the
            Valuedam Online Store.
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={save}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            border: '1px solid #ddd',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            name="bank_transfer_enabled"
            checked={Boolean(settings.bank_transfer_enabled)}
            onChange={change}
            style={{
              width: 20,
              height: 20,
              flexShrink: 0,
            }}
          />

          <span>
            <strong>Enable bank transfer</strong>
            <br />
            <small>
              Allow customers to select bank transfer at checkout.
            </small>
          </span>
        </label>

        {settings.bank_transfer_enabled && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#fff8e1',
              color: '#765600',
              fontSize: 13,
            }}
          >
            Customers may use these details to pay for their orders.
            Verify every account detail before enabling this option.
          </div>
        )}

        <div className="form-two">
          <label>
            Bank name
            <input
              name="bank_name"
              value={settings.bank_name}
              onChange={change}
              placeholder="Enter bank name"
              autoComplete="off"
              maxLength={120}
            />
          </label>

          <label>
            Account name
            <input
              name="bank_account_name"
              value={settings.bank_account_name}
              onChange={change}
              placeholder="Enter account name"
              autoComplete="off"
              maxLength={160}
            />
          </label>
        </div>

        <label>
          Account number
          <input
            name="bank_account_number"
            value={settings.bank_account_number}
            onChange={change}
            placeholder="Enter bank account number"
            inputMode="numeric"
            autoComplete="off"
            maxLength={30}
          />
        </label>

        <label>
          Buy Now button text
          <input
            name="buy_now_button_text"
            value={settings.buy_now_button_text}
            onChange={change}
            maxLength={40}
            placeholder="Buy Now"
          />
          <small>
            The preferred button label for product cards and product
            pages, where the storefront uses this setting. Examples:
            Buy Now, Order Now, Get It Now.
          </small>
        </label>

        <label>
          Transfer instructions
          <textarea
            name="bank_transfer_instructions"
            rows={4}
            value={settings.bank_transfer_instructions}
            onChange={change}
            placeholder="Explain how customers should complete their transfer."
            maxLength={2000}
          />
          <small>
            For example, tell customers to use their order number as
            the transfer reference and submit proof of payment if
            your order process requires it.
          </small>
        </label>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div
            className="form-success"
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        <button
          type="submit"
          className="btn primary"
          disabled={saving}
        >
          {saving ? (
            <>
              <LoaderCircle size={17} className="spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={17} />
              Save payment settings
            </>
          )}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            color: '#64748b',
            fontSize: 12,
            marginTop: 8,
          }}
        >
          <ShieldCheck size={17} style={{ flexShrink: 0 }} />
          <span>
            Settings are saved through an admin-protected database
            function. Only authorized store administrators should be
            able to change payment details.
          </span>
        </div>
      </form>
    </div>
  );
}
