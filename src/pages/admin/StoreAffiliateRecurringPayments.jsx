
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  RefreshCw,
  CheckCircle2,
  Play,
  LoaderCircle,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';

const money = (amount, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency || 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 42,
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#111827',
  fontSize: 14,
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 7,
  color: '#374151',
};

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '10px 13px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#111827',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};

const primaryStyle = {
  ...buttonStyle,
  background: '#f5b82e',
  borderColor: '#f5b82e',
};

const panelStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 20,
  marginBottom: 20,
};

const statusColor = {
  confirmed: { background: '#fef3c7', color: '#92400e' },
  processed: { background: '#d1fae5', color: '#065f46' },
  ineligible: { background: '#fee2e2', color: '#991b1b' },
  failed: { background: '#fee2e2', color: '#991b1b' },
};

function Status({ value }) {
  const colors = statusColor[value] || {
    background: '#f3f4f6',
    color: '#374151',
  };

  return (
    <span
      style={{
        ...colors,
        display: 'inline-block',
        padding: '5px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'capitalize',
      }}
    >
      {value || 'unknown'}
    </span>
  );
}

export default function StoreAffiliateRecurringPayments() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [confirmations, setConfirmations] = useState([]);
  const [settings, setSettings] = useState(null);

  const [orderId, setOrderId] = useState('');
  const [itemId, setItemId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cycleNumber, setCycleNumber] = useState('1');
  const [notes, setNotes] = useState('');
  const [verified, setVerified] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const results = await Promise.all([
        supabase
          .from('store_orders')
          .select(
            'id, order_number, total, order_status, payment_status, created_at, affiliate_referral_id'
          )
          .order('created_at', { ascending: false })
          .limit(500),

        supabase
          .from('store_order_items')
          .select(
            'id, order_id, product_id, product_name, quantity, unit_price, line_total'
          )
          .order('created_at', { ascending: false })
          .limit(2000),

        supabase
          .from('payments')
          .select(
            'id, payment_number, invoice_id, job_id, receipt_number, amount, currency, payment_method, payment_reference, payment_date, notes'
          )
          .order('payment_date', { ascending: false })
          .limit(500),

        supabase
          .from('store_affiliate_recurring_confirmations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),

        supabase
          .from('store_affiliate_settings')
          .select('program_enabled, recurring_commission_enabled, currency')
          .limit(1),
      ]);

      const labels = [
        'Store orders',
        'Store order items',
        'Payment records',
        'Recurring confirmations',
        'Affiliate settings',
      ];

      results.forEach((result, index) => {
        if (result.error) {
          throw new Error(`${labels[index]}: ${result.error.message}`);
        }
      });

      setOrders(results[0].data || []);
      setItems(results[1].data || []);
      setPayments(results[2].data || []);
      setConfirmations(results[3].data || []);
      setSettings(results[4].data?.[0] || null);
    } catch (err) {
      setError(err.message || 'Could not load recurring-payment data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eligibleOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          String(order.payment_status || '').toLowerCase() === 'paid' &&
          Boolean(order.affiliate_referral_id)
      ),
    [orders]
  );

  const selectedOrder = orders.find((order) => order.id === orderId);
  const selectedItem = items.find((item) => item.id === itemId);
  const selectedPayment = payments.find(
    (payment) => payment.id === paymentId
  );

  const orderItems = useMemo(
    () => items.filter((item) => item.order_id === orderId),
    [items, orderId]
  );

  const itemConfirmations = useMemo(
    () =>
      confirmations.filter(
        (confirmation) => confirmation.order_item_id === itemId
      ),
    [confirmations, itemId]
  );

  const nextCycle = useMemo(() => {
    const cycles = itemConfirmations
      .filter(
        (confirmation) =>
          ['confirmed', 'processed'].includes(
            String(confirmation.processing_status).toLowerCase()
          )
      )
      .map((confirmation) => Number(confirmation.cycle_number || 0));

    return Math.max(0, ...cycles) + 1;
  }, [itemConfirmations]);

  const currency = selectedPayment?.currency || settings?.currency || 'NGN';

  const resetForm = () => {
    setOrderId('');
    setItemId('');
    setPaymentId('');
    setPaymentAmount('');
    setCycleNumber('1');
    setNotes('');
    setVerified(false);
  };

  const confirmPayment = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!selectedOrder || !selectedItem || !selectedPayment) {
      setError('Select an eligible order, order item and recorded payment.');
      return;
    }

    if (!selectedOrder.affiliate_referral_id) {
      setError('This order has no recorded affiliate referral.');
      return;
    }

    if (String(selectedOrder.payment_status || '').toLowerCase() !== 'paid') {
      setError('The store order must be marked paid first.');
      return;
    }

    if (!verified) {
      setError(
        'Confirm that you have independently verified the payment and its connection to this order.'
      );
      return;
    }

    const amount = Number(paymentAmount);
    const cycle = Number(cycleNumber);
    const paymentTotal = Number(selectedPayment.amount || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a payment allocation greater than zero.');
      return;
    }

    if (amount > paymentTotal) {
      setError(
        'The allocation cannot exceed the selected payment record amount.'
      );
      return;
    }

    if (!Number.isInteger(cycle) || cycle < 1) {
      setError('Cycle number must be a positive whole number.');
      return;
    }

    if (cycle !== nextCycle) {
      setError(`The next available cycle for this item is ${nextCycle}.`);
      return;
    }

    if (
      !settings?.program_enabled ||
      !settings?.recurring_commission_enabled
    ) {
      setError(
        'Recurring commissions are currently disabled in affiliate settings. The payment cannot be confirmed until the programme is deliberately enabled after testing.'
      );
      return;
    }

    setSaving(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'store_admin_confirm_affiliate_recurring_payment',
        {
          p_order_id: orderId,
          p_order_item_id: itemId,
          p_source_payment_id: paymentId,
          p_payment_amount: amount,
          p_cycle_number: cycle,
          p_notes: notes.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      const confirmationId =
        typeof data === 'string'
          ? data
          : data?.id || data?.confirmation_id;

      if (!confirmationId) {
        throw new Error(
          'The confirmation function returned no confirmation ID. Check the Supabase result before retrying.'
        );
      }

      setMessage(
        `Payment confirmation created: ${String(confirmationId).slice(0, 8)}. Processing will now be attempted.`
      );

      const { data: processResult, error: processError } =
        await supabase.rpc(
          'store_admin_process_affiliate_recurring_confirmation',
          { p_confirmation_id: confirmationId }
        );

      if (processError) throw processError;

      const resultText =
        typeof processResult === 'string'
          ? processResult
          : JSON.stringify(processResult);

      setMessage(
        `Confirmation ${String(confirmationId).slice(0, 8)} processed request returned: ${resultText}`
      );

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        `${err.message || 'Could not confirm or process the recurring payment.'} If confirmation succeeded but processing failed, refresh the list and retry processing the existing confirmation instead of creating another.`
      );
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const processConfirmation = async (confirmation) => {
    setError('');
    setMessage('');

    if (confirmation.processing_status === 'processed') {
      setMessage('This confirmation is already processed.');
      return;
    }

    const confirmed = window.confirm(
      `Process recurring-payment confirmation ${confirmation.id.slice(0, 8)} for cycle ${confirmation.cycle_number}? This should create a pending commission if the confirmation is eligible.`
    );

    if (!confirmed) return;

    setProcessingId(confirmation.id);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'store_admin_process_affiliate_recurring_confirmation',
        { p_confirmation_id: confirmation.id }
      );

      if (rpcError) throw rpcError;

      setMessage(
        `Processing result: ${
          typeof data === 'string' ? data : JSON.stringify(data)
        }`
      );

      await loadData();
    } catch (err) {
      setError(err.message || 'Could not process the confirmation.');
    } finally {
      setProcessingId('');
    }
  };

  const orderLabel = (order) =>
    `${order.order_number || order.id.slice(0, 8)} — ${money(
      order.total,
      currency
    )}`;

  return (
    <section style={panelStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CalendarClock size={22} />
            Recurring affiliate payments
          </h2>
          <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
            Record an admin-verified payment for an eligible paid store order,
            then process its recurring commission.
          </p>
        </div>

        <button
          type="button"
          style={buttonStyle}
          onClick={loadData}
          disabled={loading || saving || Boolean(processingId)}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {!settings?.program_enabled && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: 13,
            borderRadius: 9,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            marginBottom: 16,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <AlertTriangle size={19} />
          <div>
            <strong>Affiliate programme disabled.</strong>
            <div>
              The confirmation form will not submit while the programme is
              disabled. Keep it disabled until the workflow has been fully
              tested.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: 13,
            borderRadius: 9,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            marginBottom: 14,
            fontSize: 13,
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            padding: 13,
            borderRadius: 9,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            marginBottom: 14,
            fontSize: 13,
            overflowWrap: 'anywhere',
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={confirmPayment}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 15,
          }}
        >
          <div>
            <label style={labelStyle}>Eligible paid store order *</label>
            <select
              style={inputStyle}
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value);
                setItemId('');
                setCycleNumber('1');
              }}
              required
            >
              <option value="">Select order</option>
              {eligibleOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_number || order.id.slice(0, 8)} —{' '}
                  {money(order.total, settings?.currency || 'NGN')}
                </option>
              ))}
            </select>
            {eligibleOrders.length === 0 && (
              <small style={{ color: '#6b7280' }}>
                No paid orders with affiliate referrals were found.
              </small>
            )}
          </div>

          <div>
            <label style={labelStyle}>Order item *</label>
            <select
              style={inputStyle}
              value={itemId}
              onChange={(event) => {
                const nextId = event.target.value;
                setItemId(nextId);
                const existing = confirmations.filter(
                  (confirmation) =>
                    confirmation.order_item_id === nextId
                );
                const cycles = existing
                  .filter((confirmation) =>
                    ['confirmed', 'processed'].includes(
                      String(confirmation.processing_status).toLowerCase()
                    )
                  )
                  .map((confirmation) =>
                    Number(confirmation.cycle_number || 0)
                  );
                setCycleNumber(String(Math.max(0, ...cycles) + 1));
              }}
              required
              disabled={!orderId}
            >
              <option value="">Select order item</option>
              {orderItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product_name} — Qty {item.quantity} —{' '}
                  {money(item.line_total, settings?.currency || 'NGN')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Recorded payment *</label>
            <select
              style={inputStyle}
              value={paymentId}
              onChange={(event) => {
                const nextId = event.target.value;
                setPaymentId(nextId);
                const payment = payments.find((p) => p.id === nextId);
                setPaymentAmount(payment ? String(payment.amount) : '');
                setVerified(false);
              }}
              required
            >
              <option value="">Select payment record</option>
              {payments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.payment_number ||
                    payment.receipt_number ||
                    payment.id.slice(0, 8)}{' '}
                  — {money(payment.amount, payment.currency || 'NGN')}
                  {payment.payment_date
                    ? ` — ${new Date(
                        payment.payment_date
                      ).toLocaleDateString()}`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Allocated amount ({currency}) *</label>
            <input
              style={inputStyle}
              type="number"
              min="0.01"
              step="0.01"
              max={selectedPayment?.amount ?? undefined}
              value={paymentAmount}
              onChange={(event) => {
                setPaymentAmount(event.target.value);
                setVerified(false);
              }}
              required
            />
            {selectedPayment && (
              <small style={{ color: '#6b7280', lineHeight: 1.6 }}>
                Payment record amount: {money(selectedPayment.amount, currency)}
              </small>
            )}
          </div>

          <div>
            <label style={labelStyle}>Recurring cycle *</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              step="1"
              value={cycleNumber}
              onChange={(event) => setCycleNumber(event.target.value)}
              required
            />
            {itemId && (
              <small style={{ color: '#6b7280' }}>
                Expected next cycle: {nextCycle}
              </small>
            )}
          </div>
        </div>

        {selectedOrder && selectedItem && selectedPayment && (
          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 9,
              padding: 13,
              marginTop: 15,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <strong>Review before confirming</strong>
            <div>Order: {selectedOrder.order_number || selectedOrder.id}</div>
            <div>Item: {selectedItem.product_name}</div>
            <div>
              Order item value: {money(selectedItem.line_total, currency)}
            </div>
            <div>
              Payment record:{' '}
              {selectedPayment.payment_number ||
                selectedPayment.receipt_number ||
                selectedPayment.id}
            </div>
            <div>
              Payment reference: {selectedPayment.payment_reference || '—'}
            </div>
            <div>
              Payment date:{' '}
              {selectedPayment.payment_date
                ? new Date(selectedPayment.payment_date).toLocaleString()
                : '—'}
            </div>
            <div>
              Allocation: {money(paymentAmount, currency)}
            </div>
            <div style={{ color: '#92400e', marginTop: 7 }}>
              Selecting a payment record does not prove it belongs to this
              order. Verify the receipt, invoice or other source evidence
              before confirming.
            </div>
          </div>
        )}

        <div style={{ marginTop: 15 }}>
          <label style={labelStyle}>Verification notes *</label>
          <textarea
            style={{ ...inputStyle, minHeight: 85, resize: 'vertical' }}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setVerified(false);
            }}
            placeholder="Record how you verified that this payment belongs to this order and what the allocation covers."
            required
          />
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 9,
            marginTop: 15,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <input
            type="checkbox"
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
            style={{ marginTop: 3 }}
          />
          I have independently verified the payment record and confirmed that
          the allocated amount belongs to this order item and recurring cycle.
        </label>

        <div style={{ marginTop: 17 }}>
          <button
            type="submit"
            style={primaryStyle}
            disabled={
              loading ||
              saving ||
              Boolean(processingId) ||
              !settings?.program_enabled ||
              !settings?.recurring_commission_enabled
            }
          >
            {saving ? (
              <LoaderCircle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {saving
              ? 'Confirming payment…'
              : 'Confirm payment and process commission'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 28 }}>
        <h3 style={{ margin: '0 0 7px', fontSize: 17 }}>
          Recent recurring confirmations
        </h3>
        <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
          Processed confirmations create separate pending commission sales.
          Approve those through the existing Affiliate Sales history.
        </p>

        {loading ? (
          <div style={{ padding: 20, color: '#6b7280' }}>
            <LoaderCircle size={18} /> Loading confirmations…
          </div>
        ) : confirmations.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 13 }}>
            No recurring-payment confirmations have been recorded.
          </p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 820,
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {[
                    'Confirmation',
                    'Order item',
                    'Cycle',
                    'Allocation',
                    'Status',
                    'Created',
                    'Action',
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 10,
                        textAlign: 'left',
                        background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confirmations.map((confirmation) => {
                  const item = items.find(
                    (candidate) =>
                      candidate.id === confirmation.order_item_id
                  );
                  const payment = payments.find(
                    (candidate) =>
                      candidate.id === confirmation.source_payment_id
                  );
                  const busy = processingId === confirmation.id;

                  return (
                    <tr key={confirmation.id}>
                      <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                        <strong>{confirmation.id.slice(0, 8)}</strong>
                        {confirmation.processing_error && (
                          <div
                            style={{
                              color: '#991b1b',
                              marginTop: 5,
                              maxWidth: 220,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {confirmation.processing_error}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                        {item?.product_name || confirmation.order_item_id.slice(0, 8)}
                        <div style={{ color: '#6b7280', fontSize: 12 }}>
                          Payment:{' '}
                          {payment?.payment_number ||
                            payment?.receipt_number ||
                            confirmation.source_payment_id.slice(0, 8)}
                        </div>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                        {confirmation.cycle_number}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                        {money(
                          confirmation.payment_amount,
                          confirmation.currency || 'NGN'
                        )}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                        <Status value={confirmation.processing_status} />
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                        {confirmation.created_at
                          ? new Date(confirmation.created_at).toLocaleString()
                          : '—'}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                        {confirmation.processing_status !== 'processed' ? (
                          <button
                            type="button"
                            style={buttonStyle}
                            disabled={busy || saving || Boolean(processingId)}
                            onClick={() => processConfirmation(confirmation)}
                          >
                            {busy ? (
                              <LoaderCircle size={14} />
                            ) : (
                              <Play size={14} />
                            )}
                            Retry processing
                          </button>
                        ) : (
                          <span style={{ color: '#065f46', fontWeight: 700 }}>
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
