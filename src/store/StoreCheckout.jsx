
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  AlertCircle,
  Upload,
  FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { refreshStoredAffiliateReferral } from './affiliateTracking';
import './store.css';

const CART_KEY = 'valuedam_store_cart';

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

    if (!Array.isArray(saved)) return [];

    return saved.filter(
      (item) =>
        item &&
        typeof item.product_id === 'string' &&
        Number.isInteger(Number(item.quantity)) &&
        Number(item.quantity) > 0
    );
  } catch {
    return [];
  }
}

function formatNaira(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function StoreCheckout() {
  const [cart] = useState(readCart);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [copied, setCopied] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofNote, setProofNote] = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofError, setProofError] = useState('');
  const [proofSubmitted, setProofSubmitted] = useState(false);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    customer_notes: '',
  });

  const estimatedSubtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + (Number(item.price) || 0) * Number(item.quantity),
        0
      ),
    [cart]
  );

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setSettingsLoading(true);

      try {
        if (!supabase) throw new Error('Store connection is not configured.');

        const { data, error: settingsError } = await supabase.rpc(
          'store_public_payment_settings'
        );

        if (settingsError) throw settingsError;

        const row = Array.isArray(data) ? data[0] : data;
        const normalized = row
          ? {
              ...row,
              bank_transfer_enabled:
                row.bank_transfer_enabled === true ||
                row.bank_transfer_enabled === 'true',
            }
          : null;

        if (active) setSettings(normalized);
      } catch {
        if (active) {
          setSettings(null);
          setError(
            'We could not load payment settings. Please refresh the page and try again.'
          );
        }
      } finally {
        if (active) setSettingsLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function copyText(value, label) {
    if (!value) {
      setError('There is no payment information available to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(label);
      setError('');
    } catch {
      setError(
        'Copying failed. Please select and copy the payment details manually.'
      );
    }
  }

  async function handleProofSubmit(event) {
    event.preventDefault();
    setProofError('');

    if (!order?.payment_proof_upload_token) {
      setProofError(
        'A receipt-upload authorization is not available for this order. Please contact the store and provide your order reference.'
      );
      return;
    }

    if (!proofFile) {
      setProofError('Please choose your bank-transfer receipt first.');
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedTypes.includes(proofFile.type)) {
      setProofError('Please upload a JPEG, PNG, WebP, or PDF receipt.');
      return;
    }

    if (proofFile.size < 1 || proofFile.size > 5 * 1024 * 1024) {
      setProofError('The receipt file must be no larger than 5 MB.');
      return;
    }

    setProofSubmitting(true);

    try {
      const uploadForm = new FormData();
      uploadForm.append('token', order.payment_proof_upload_token);
      uploadForm.append('file', proofFile);
      uploadForm.append('customer_note', proofNote.trim());

      const { data, error: uploadError } = await supabase.functions.invoke(
        'store-payment-proof-upload',
        { body: uploadForm }
      );

      if (uploadError) {
        let message = uploadError.message || 'Receipt upload failed.';
        try {
          const response = uploadError.context;
          if (response && typeof response.json === 'function') {
            const body = await response.json();
            if (body?.error) message = body.error;
          }
        } catch {
          // Keep the original upload error if the response is not readable.
        }
        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'The receipt could not be submitted.');
      }

      setProofSubmitted(true);
      setProofFile(null);
      setProofNote('');
      setProofError('');
    } catch (err) {
      console.error('Store payment receipt upload failed:', err);
      setProofError(
        err?.message ||
          'We could not submit your receipt. Please try again or contact the store.'
      );
    } finally {
      setProofSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!cart.length) {
      setError('Your cart is empty. Add products before checking out.');
      return;
    }

    if (settingsLoading) {
      setError('Payment settings are still loading. Please try again shortly.');
      return;
    }

    if (!settings) {
      setError('Payment settings are unavailable. Please try again later.');
      return;
    }

    if (!settings.bank_transfer_enabled) {
      setError(
        'Bank transfer is currently unavailable. Please contact the store before placing your order.'
      );
      return;
    }

    if (
      !settings.bank_name ||
      !settings.bank_account_name ||
      !settings.bank_account_number
    ) {
      setError(
        'Bank transfer details are incomplete. Please contact the store before placing your order.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = cart.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
      }));

      // Retrieve a referral only if the stored visitor token still matches
      // the token hash saved with the referral.
      const referral = await refreshStoredAffiliateReferral();

      // Use the referral-aware order function for every checkout.
      // Without a valid referral, both referral arguments are null.
      const { data, error: rpcError } = await supabase.rpc(
        'store_create_order_with_proof_token',
        {
          p_customer_name: form.customer_name.trim(),
          p_customer_phone: form.customer_phone.trim(),
          p_customer_email: form.customer_email.trim() || null,
          p_delivery_address: form.delivery_address.trim(),
          p_delivery_city: form.delivery_city.trim(),
          p_delivery_state: form.delivery_state.trim(),
          p_customer_notes: form.customer_notes.trim() || null,
          p_items: payload,
          p_referral_id: referral?.id || null,
          p_visitor_token_hash: referral?.tokenHash || null,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.success || !data?.order_number) {
        throw new Error(
          'The order could not be confirmed. Please try again.'
        );
      }

      localStorage.removeItem(CART_KEY);

      setOrder({
        ...data,
        payment_status: 'unpaid',
      });

      if (!data.payment_proof_upload_token) {
        setProofError(
          'Your order was created, but receipt upload authorization was not returned. Please save your order reference and contact the store before uploading a receipt.'
        );
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (err) {
      console.error('Store checkout failed:', err);

      setError(
        err?.message ||
          'We could not place your order. Please check your details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (settingsLoading && !settings && !order) {
    return (
      <main className="store-checkout-page">
        <div className="store-checkout-empty">
          <LoaderCircle
            size={32}
            className="store-checkout-spinner"
          />
          <h1>Preparing checkout</h1>
          <p>Loading the store's payment information...</p>
        </div>
      </main>
    );
  }

  if (order) {
    return (
      <main className="store-checkout-page">
        <section className="store-checkout-success">
          <div className="store-checkout-success-icon">
            <CheckCircle2 size={42} />
          </div>

          <p className="store-checkout-eyebrow">ORDER RECEIVED</p>
          <h1>Thank you for your order!</h1>
          <p>
            Your order has been created. Transfer the exact order amount
            using the bank details below. Your order remains unpaid until
            the store confirms receipt.
          </p>

          <div className="store-checkout-order-number">
            <span>Order number / payment reference</span>
            <strong>{order.order_number}</strong>
            <button
              type="button"
              className="store-checkout-copy-button"
              onClick={() =>
                copyText(order.order_number, 'Order reference')
              }
            >
              <Copy size={15} />
              {copied === 'Order reference' ? 'Copied' : 'Copy reference'}
            </button>
          </div>

          <div className="store-checkout-total">
            <span>Order total</span>
            <strong>{formatNaira(order.total)}</strong>
          </div>

          <div className="store-checkout-payment-panel">
            <div className="store-checkout-payment-heading">
              <Wallet size={22} />
              <div>
                <h2>Bank transfer details</h2>
                <p>Use your order number as the transfer narration.</p>
              </div>
            </div>

            <div className="store-checkout-bank-row">
              <span>Bank</span>
              <strong>{settings?.bank_name}</strong>
            </div>

            <div className="store-checkout-bank-row">
              <span>Account name</span>
              <strong>{settings?.bank_account_name}</strong>
            </div>

            <div className="store-checkout-bank-row">
              <span>Account number</span>
              <strong>{settings?.bank_account_number}</strong>
              <button
                type="button"
                className="store-checkout-copy-button"
                aria-label="Copy bank account number"
                onClick={() =>
                  copyText(
                    settings.bank_account_number,
                    'Account number'
                  )
                }
              >
                <Copy size={15} />
                {copied === 'Account number' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {settings?.bank_transfer_instructions && (
              <p className="store-checkout-bank-instructions">
                {settings.bank_transfer_instructions}
              </p>
            )}

            <div className="store-checkout-payment-warning">
              <AlertCircle size={18} />
              <p>
                Keep your transfer receipt. Do not make a second payment
                for the same order. Your order is not marked paid until
                the store verifies your transfer.
              </p>
            </div>
          </div>

          <section className="store-checkout-payment-panel store-checkout-proof-panel">
            <div className="store-checkout-payment-heading">
              <FileText size={22} />
              <div>
                <h2>Upload transfer receipt</h2>
                <p>
                  Submit your proof of payment for the store to review.
                </p>
              </div>
            </div>

            {proofSubmitted ? (
              <div className="store-checkout-proof-success" role="status">
                <CheckCircle2 size={20} />
                <div>
                  <strong>Receipt submitted for review</strong>
                  <p>
                    Your order is still unpaid until an administrator verifies
                    the transfer. Please do not pay again for this order.
                  </p>
                </div>
              </div>
            ) : order.payment_proof_upload_token ? (
              <form onSubmit={handleProofSubmit} className="store-checkout-proof-form">
                <label className="store-checkout-field">
                  Receipt file <span>*</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => {
                      setProofFile(event.target.files?.[0] || null);
                      setProofError('');
                    }}
                    required
                    disabled={proofSubmitting}
                  />
                  <small>JPEG, PNG, WebP or PDF. Maximum size: 5 MB.</small>
                </label>

                {proofFile && (
                  <p className="store-checkout-proof-file">
                    <FileText size={16} />
                    {proofFile.name} · {(proofFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}

                <label className="store-checkout-field">
                  Note for the store <small>Optional</small>
                  <textarea
                    value={proofNote}
                    onChange={(event) => setProofNote(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="For example, transfer time or sender name"
                    disabled={proofSubmitting}
                  />
                </label>

                {proofError && (
                  <div className="store-checkout-error" role="alert">
                    {proofError}
                  </div>
                )}

                <button
                  type="submit"
                  className="store-checkout-primary-button store-checkout-submit"
                  disabled={proofSubmitting || !proofFile}
                >
                  {proofSubmitting ? (
                    <>
                      <LoaderCircle size={18} className="store-checkout-spinner" />
                      Uploading receipt...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Submit receipt for review
                    </>
                  )}
                </button>
                <p className="store-checkout-secure-note">
                  <ShieldCheck size={16} />
                  Your receipt is stored privately and is only for payment verification.
                </p>
              </form>
            ) : (
              <div className="store-checkout-error" role="alert">
                {proofError ||
                  'Receipt upload authorization is unavailable for this order. Please contact the store with your order reference.'}
              </div>
            )}
          </section>

          <Link
            to="/store"
            className="store-checkout-primary-button"
          >
            Continue shopping
          </Link>
        </section>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="store-checkout-page">
        <section className="store-checkout-empty">
          <ShoppingBag size={42} />
          <h1>Your cart is empty</h1>
          <p>Add products to your cart before proceeding to checkout.</p>
          <Link
            to="/store"
            className="store-checkout-primary-button"
          >
            Browse the store
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="store-checkout-page">
      <Link to="/store/cart" className="store-checkout-back">
        <ArrowLeft size={17} />
        Back to cart
      </Link>

      <header className="store-checkout-header">
        <p className="store-checkout-eyebrow">
          {settings?.store_name || 'VALUEDAM ONLINE STORE'}
        </p>
        <h1>Checkout</h1>
        <p>Enter your contact and delivery details to place your order.</p>
      </header>

      {!settings?.bank_transfer_enabled && (
        <div className="store-checkout-error" role="alert">
          Bank transfer is currently disabled. Please contact the store
          before attempting to place an order.
        </div>
      )}

      <div className="store-checkout-layout">
        <form
          className="store-checkout-form"
          onSubmit={handleSubmit}
        >
          <section className="store-checkout-section">
            <div className="store-checkout-section-heading">
              <span className="store-checkout-step">1</span>
              <div>
                <h2>Contact information</h2>
                <p>How can we reach you about your order?</p>
              </div>
            </div>

            <div className="store-checkout-fields">
              <label className="store-checkout-field">
                Full name <span>*</span>
                <input
                  name="customer_name"
                  value={form.customer_name}
                  onChange={updateField}
                  autoComplete="name"
                  maxLength={150}
                  required
                  placeholder="Enter your full name"
                />
              </label>

              <label className="store-checkout-field">
                Phone number <span>*</span>
                <input
                  name="customer_phone"
                  type="tel"
                  value={form.customer_phone}
                  onChange={updateField}
                  autoComplete="tel"
                  maxLength={30}
                  required
                  placeholder="e.g. 08012345678"
                />
              </label>

              <label className="store-checkout-field store-checkout-field-full">
                Email address <small>Optional</small>
                <input
                  name="customer_email"
                  type="email"
                  value={form.customer_email}
                  onChange={updateField}
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </label>
            </div>
          </section>

          <section className="store-checkout-section">
            <div className="store-checkout-section-heading">
              <span className="store-checkout-step">2</span>
              <div>
                <h2>Delivery address</h2>
                <p>
                  <MapPin size={14} />
                  Where should we deliver your order?
                </p>
              </div>
            </div>

            <div className="store-checkout-fields">
              <label className="store-checkout-field store-checkout-field-full">
                Street address / delivery location <span>*</span>
                <textarea
                  name="delivery_address"
                  value={form.delivery_address}
                  onChange={updateField}
                  autoComplete="street-address"
                  maxLength={1000}
                  required
                  rows={3}
                  placeholder="House number, street, area or landmark"
                />
              </label>

              <label className="store-checkout-field">
                City / town <span>*</span>
                <input
                  name="delivery_city"
                  value={form.delivery_city}
                  onChange={updateField}
                  autoComplete="address-level2"
                  maxLength={100}
                  required
                  placeholder="Enter city or town"
                />
              </label>

              <label className="store-checkout-field">
                State <span>*</span>
                <input
                  name="delivery_state"
                  value={form.delivery_state}
                  onChange={updateField}
                  autoComplete="address-level1"
                  maxLength={100}
                  required
                  placeholder="Enter state"
                />
              </label>

              <label className="store-checkout-field store-checkout-field-full">
                Delivery notes <small>Optional</small>
                <textarea
                  name="customer_notes"
                  value={form.customer_notes}
                  onChange={updateField}
                  maxLength={2000}
                  rows={3}
                  placeholder="Directions or other useful delivery instructions"
                />
              </label>
            </div>
          </section>

          <section className="store-checkout-section">
            <div className="store-checkout-section-heading">
              <span className="store-checkout-step">3</span>
              <div>
                <h2>Payment method</h2>
                <p>Select how you will pay for this order.</p>
              </div>
            </div>

            <div className="store-checkout-payment-option">
              <Wallet size={23} />
              <div>
                <strong>Bank transfer</strong>
                <p>
                  Transfer after placing your order. The order will
                  remain unpaid until payment is verified.
                </p>
              </div>
            </div>

            {settings?.bank_transfer_enabled &&
              settings?.bank_name &&
              settings?.bank_account_name &&
              settings?.bank_account_number && (
                <div className="store-checkout-bank-preview">
                  <p>
                    <strong>{settings.bank_name}</strong>
                  </p>
                  <p>{settings.bank_account_name}</p>

                  <div className="store-checkout-bank-row store-checkout-preview-account">
                    <div className="store-checkout-preview-account-details">
                      <span>Account number</span>
                      <strong>{settings.bank_account_number}</strong>
                    </div>

                    <button
                      type="button"
                      className="store-checkout-copy-button"
                      aria-label="Copy bank account number before checkout"
                      onClick={() =>
                        copyText(
                          settings.bank_account_number,
                          'Account number'
                        )
                      }
                    >
                      <Copy size={15} />
                      {copied === 'Account number' ? 'Copied!' : 'Copy account'}
                    </button>
                  </div>

                  {copied === 'Account number' && (
                    <p className="store-checkout-copy-feedback" role="status">
                      <CheckCircle2 size={15} />
                      Account number copied. You can paste it into your banking app.
                    </p>
                  )}

                  <p className="store-checkout-summary-note">
                    Your order reference will be displayed after checkout.
                  </p>
                </div>
              )}
          </section>

          {error && (
            <div className="store-checkout-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="store-checkout-primary-button store-checkout-submit"
            disabled={
              submitting ||
              settingsLoading ||
              !settings?.bank_transfer_enabled
            }
          >
            {submitting ? (
              <>
                <LoaderCircle
                  size={18}
                  className="store-checkout-spinner"
                />
                Placing your order...
              </>
            ) : (
              <>Place order · {formatNaira(estimatedSubtotal)}</>
            )}
          </button>

          <p className="store-checkout-secure-note">
            <ShieldCheck size={16} />
            Product prices and stock are checked by the server when
            your order is placed.
          </p>
        </form>

        <aside className="store-checkout-summary">
          <h2>Order summary</h2>
          <p className="store-checkout-summary-count">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </p>

          <div className="store-checkout-items">
            {cart.map((item) => (
              <div
                className="store-checkout-item"
                key={item.product_id}
              >
                <div className="store-checkout-item-image">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name || 'Product'}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <ShoppingBag size={22} />
                  )}
                </div>

                <div className="store-checkout-item-info">
                  <strong>{item.name || 'Store product'}</strong>
                  <span>Qty: {Number(item.quantity)}</span>
                </div>

                <strong className="store-checkout-item-price">
                  {formatNaira(
                    (Number(item.price) || 0) *
                      Number(item.quantity)
                  )}
                </strong>
              </div>
            ))}
          </div>

          <div className="store-checkout-summary-line">
            <span>Estimated subtotal</span>
            <strong>{formatNaira(estimatedSubtotal)}</strong>
          </div>

          <div className="store-checkout-summary-line">
            <span>Delivery</span>
            <span>Confirmed after order</span>
          </div>

          <p className="store-checkout-summary-note">
            This is an estimate. The server checks current prices and
            stock. Delivery charges are currently set to ₦0 in the
            checkout function.
          </p>
        </aside>
      </div>
    </main>
  );
}
