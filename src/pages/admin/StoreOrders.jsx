import '../../store/store.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Package,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Printer,
  FileText,
  X,
  CreditCard,
  User,
  Truck,
  Eye,
  FileCheck,
  FileWarning,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const PAYMENT_STATUSES = [
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
];

const money = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const readableStatus = (value) =>
  String(value || 'pending')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusClass = (value) =>
  String(value || 'pending')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

const rpcMessage = (error) => {
  if (!error) return '';
  return error.message || error.details || 'An unexpected error occurred.';
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getOrderNumber = (order) =>
  order?.order_number ||
  order?.order_code ||
  order?.reference ||
  (order?.id ? String(order.id).slice(0, 8).toUpperCase() : 'ORDER');

const getCustomerName = (order) =>
  order?.customer_name ||
  order?.full_name ||
  order?.shipping_name ||
  order?.name ||
  'Customer';

const getCustomerEmail = (order) =>
  order?.customer_email || order?.email || '';

const getCustomerPhone = (order) =>
  order?.customer_phone ||
  order?.phone ||
  order?.phone_number ||
  '';

const getDeliveryAddress = (order) =>
  order?.shipping_address ||
  order?.delivery_address ||
  order?.customer_address ||
  order?.address ||
  '';

const getOrderItems = (order) =>
  Array.isArray(order?.store_order_items)
    ? order.store_order_items
    : Array.isArray(order?.order_items)
      ? order.order_items
      : [];

const getItemName = (item) =>
  item?.product_name ||
  item?.name ||
  item?.title ||
  item?.product_title ||
  'Product';

const getItemQuantity = (item) =>
  Number(item?.quantity ?? item?.qty ?? 1);

const getItemPrice = (item) =>
  Number(
    item?.unit_price ??
      item?.price ??
      item?.product_price ??
      0
  );

const getItemTotal = (item) => {
  const explicitTotal =
    item?.line_total ??
    item?.item_total ??
    item?.total_price ??
    item?.subtotal;

  if (explicitTotal !== undefined && explicitTotal !== null) {
    return Number(explicitTotal);
  }

  return getItemQuantity(item) * getItemPrice(item);
};

const getSubtotal = (order) => {
  if (order?.subtotal !== undefined && order?.subtotal !== null) {
    return Number(order.subtotal);
  }

  return getOrderItems(order).reduce(
    (total, item) => total + getItemTotal(item),
    0
  );
};

const getDeliveryFee = (order) =>
  Number(
    order?.delivery_fee ??
      order?.shipping_fee ??
      order?.delivery_cost ??
      0
  );

const getOrderTotal = (order) => {
  if (order?.total !== undefined && order?.total !== null) {
    return Number(order.total);
  }

  if (order?.total_amount !== undefined && order?.total_amount !== null) {
    return Number(order.total_amount);
  }

  if (order?.grand_total !== undefined && order?.grand_total !== null) {
    return Number(order.grand_total);
  }

  return getSubtotal(order) + getDeliveryFee(order);
};

function printOrder(order, documentType = 'receipt') {
  const orderNumber = getOrderNumber(order);
  const isInvoice = documentType === 'invoice';
  const items = getOrderItems(order);

  const customerName = getCustomerName(order);
  const customerEmail = getCustomerEmail(order);
  const customerPhone = getCustomerPhone(order);
  const deliveryAddress = getDeliveryAddress(order);

  const subtotal = getSubtotal(order);
  const deliveryFee = getDeliveryFee(order);
  const total = getOrderTotal(order);

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td class="product-cell">
            <span class="product-name">${escapeHtml(getItemName(item))}</span>
            <span class="mobile-price">${money(getItemPrice(item))} each</span>
          </td>
          <td class="number-cell">${getItemQuantity(item)}</td>
          <td class="price-cell">${money(getItemPrice(item))}</td>
          <td class="total-cell">${money(getItemTotal(item))}</td>
        </tr>
      `
    )
    .join('');

  const documentTitle = isInvoice ? 'INVOICE' : 'PAYMENT RECEIPT';

  const printWindow = window.open(
    '',
    '_blank',
    'width=900,height=750'
  );

  if (!printWindow) {
    window.alert(
      'The print window was blocked. Allow pop-ups for this website and try again.'
    );
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(documentTitle)} - ${escapeHtml(orderNumber)}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          html {
            background: #f3f4f6;
          }

          body {
            margin: 0;
            padding: 24px;
            background: #f3f4f6;
            color: #171717;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            line-height: 1.45;
          }

          .toolbar {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
            margin: 0 auto 20px;
          }

          .toolbar button {
            padding: 10px 15px;
            border: 1px solid #d1d5db;
            border-radius: 7px;
            background: #fff;
            color: #171717;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          }

          .toolbar button.primary {
            border-color: #f5b82e;
            background: #f5b82e;
          }

          .toolbar button:hover {
            filter: brightness(.97);
          }

          .sheet {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
            padding: 30px;
            background: #fff;
            box-shadow: 0 3px 18px rgba(0, 0, 0, .08);
          }

          .brand {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f5b82e;
          }

          .brand-name {
            margin: 0;
            font-size: 25px;
            font-weight: 900;
            letter-spacing: -.7px;
          }

          .brand-name span {
            color: #d69b00;
          }

          .brand-caption {
            margin-top: 4px;
            color: #525252;
            font-size: 11px;
          }

          .document-label {
            text-align: right;
          }

          .document-label h2 {
            margin: 0 0 6px;
            font-size: 20px;
            letter-spacing: .4px;
          }

          .document-label p {
            margin: 3px 0;
            color: #525252;
            overflow-wrap: anywhere;
          }

          .document-number {
            color: #171717 !important;
            font-weight: 700;
          }

          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 22px;
            margin: 22px 0;
          }

          .detail-box {
            min-width: 0;
          }

          .detail-heading {
            margin: 0 0 8px;
            color: #737373;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .8px;
            text-transform: uppercase;
          }

          .detail-box p {
            margin: 4px 0;
            overflow-wrap: anywhere;
          }

          .detail-name {
            font-size: 13px;
            font-weight: 800;
          }

          .items-heading {
            margin: 20px 0 10px;
            font-size: 13px;
            font-weight: 800;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          thead {
            display: table-header-group;
          }

          th {
            padding: 10px 7px;
            background: #f5b82e;
            color: #171717;
            text-align: left;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }

          td {
            padding: 10px 7px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            overflow-wrap: anywhere;
          }

          tbody tr {
            page-break-inside: avoid;
          }

          th:first-child,
          td:first-child {
            width: 43%;
          }

          th:nth-child(2),
          td:nth-child(2) {
            width: 12%;
            text-align: center;
          }

          th:nth-child(3),
          td:nth-child(3) {
            width: 21%;
            text-align: right;
          }

          th:nth-child(4),
          td:nth-child(4) {
            width: 24%;
            text-align: right;
          }

          .product-name {
            display: block;
            font-weight: 700;
          }

          .mobile-price {
            display: none;
          }

          .totals {
            width: 100%;
            max-width: 310px;
            margin: 18px 0 0 auto;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            padding: 6px 0;
          }

          .total-row span:last-child {
            text-align: right;
            overflow-wrap: anywhere;
          }

          .grand-total {
            margin-top: 5px;
            padding-top: 12px;
            border-top: 2px solid #171717;
            font-size: 16px;
            font-weight: 900;
          }

          .status-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 20px;
          }

          .status-pill {
            padding: 6px 9px;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            font-size: 10px;
            font-weight: 700;
          }

          .notes {
            margin-top: 20px;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
          }

          .notes strong {
            display: block;
            margin-bottom: 4px;
          }

          .footer {
            margin-top: 28px;
            padding-top: 14px;
            border-top: 1px solid #e5e7eb;
            color: #525252;
            text-align: center;
            font-size: 10px;
          }

          .footer strong {
            display: block;
            margin-bottom: 4px;
            color: #171717;
          }

          .paper-80 {
            width: 80mm;
            max-width: 80mm;
            margin: 0;
            padding: 0;
            background: #fff;
            font-size: 10px;
            line-height: 1.35;
          }

          .paper-80 .sheet {
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            padding: 2mm 0;
            box-shadow: none;
          }

          .paper-80 .brand {
            display: block;
            padding-bottom: 10px;
            text-align: center;
          }

          .paper-80 .brand-name {
            font-size: 19px;
            letter-spacing: -.4px;
          }

          .paper-80 .brand-caption {
            font-size: 9px;
          }

          .paper-80 .document-label {
            margin-top: 10px;
            text-align: center;
          }

          .paper-80 .document-label h2 {
            margin-bottom: 4px;
            font-size: 15px;
          }

          .paper-80 .document-label p {
            margin: 2px 0;
            font-size: 9px;
          }

          .paper-80 .details {
            display: block;
            margin: 12px 0;
          }

          .paper-80 .detail-box {
            margin-bottom: 10px;
          }

          .paper-80 .detail-heading {
            margin-bottom: 4px;
            font-size: 9px;
          }

          .paper-80 .detail-box p {
            margin: 2px 0;
            font-size: 10px;
          }

          .paper-80 .detail-name {
            font-size: 11px;
          }

          .paper-80 .items-heading {
            margin: 12px 0 6px;
            font-size: 11px;
          }

          .paper-80 table {
            font-size: 9px;
          }

          .paper-80 th {
            padding: 5px 2px;
            font-size: 8px;
          }

          .paper-80 td {
            padding: 6px 2px;
          }

          .paper-80 th:first-child,
          .paper-80 td:first-child {
            width: 43%;
          }

          .paper-80 th:nth-child(2),
          .paper-80 td:nth-child(2) {
            width: 11%;
          }

          .paper-80 th:nth-child(3),
          .paper-80 td:nth-child(3) {
            width: 23%;
          }

          .paper-80 th:nth-child(4),
          .paper-80 td:nth-child(4) {
            width: 23%;
          }

          .paper-80 .totals {
            max-width: none;
            margin-top: 12px;
          }

          .paper-80 .total-row {
            gap: 8px;
            padding: 4px 0;
          }

          .paper-80 .grand-total {
            font-size: 13px;
          }

          .paper-80 .status-row {
            display: block;
            margin-top: 12px;
          }

          .paper-80 .status-pill {
            display: block;
            margin: 4px 0;
            padding: 5px;
            font-size: 9px;
          }

          .paper-80 .notes {
            margin-top: 12px;
            padding: 8px;
          }

          .paper-80 .footer {
            margin-top: 16px;
            padding-top: 10px;
            font-size: 9px;
          }

          .paper-80 .mobile-price {
            display: block;
            margin-top: 2px;
            color: #525252;
            font-size: 8px;
          }

          .paper-80 .price-cell {
            display: none;
          }

          .paper-80 th:nth-child(3) {
            display: none;
          }

          .paper-80 th:first-child,
          .paper-80 td:first-child {
            width: 58%;
          }

          .paper-80 th:nth-child(2),
          .paper-80 td:nth-child(2) {
            width: 13%;
          }

          .paper-80 th:nth-child(4),
          .paper-80 td:nth-child(4) {
            width: 29%;
          }

          @page {
            size: auto;
            margin: 8mm;
          }

          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }

            .toolbar {
              display: none !important;
            }

            .sheet {
              max-width: none;
              margin: 0;
              box-shadow: none;
            }

            .paper-80 {
              width: 72mm !important;
              max-width: 72mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .paper-80 .sheet {
              width: 72mm !important;
              max-width: 72mm !important;
              padding: 0 !important;
            }

            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }

          @media screen and (max-width: 600px) {
            body {
              padding: 10px;
            }

            .sheet {
              padding: 18px;
            }

            .brand {
              display: block;
            }

            .document-label {
              margin-top: 15px;
              text-align: left;
            }

            .details {
              grid-template-columns: 1fr;
              gap: 12px;
            }
          }
        </style>
      </head>

      <body class="paper-a4">
        <div class="toolbar">
          <button type="button" class="primary" onclick="printAs('80')">
            Print 80mm Thermal
          </button>
          <button type="button" onclick="printAs('a4')">
            Print A4
          </button>
          <button type="button" class="primary" onclick="window.print()">
            Print / Save as PDF
          </button>
          <button type="button" onclick="window.close()">
            Close
          </button>
        </div>

        <main class="sheet">
          <header class="brand">
            <div>
              <h1 class="brand-name">Valuedam<span>.</span></h1>
              <div class="brand-caption">
                Connecting, Informing, and Empowering
              </div>
            </div>

            <div class="document-label">
              <h2>${documentTitle}</h2>
              <p class="document-number">
                Order: ${escapeHtml(orderNumber)}
              </p>
              <p>Date: ${escapeHtml(formatDate(order?.created_at))}</p>
            </div>
          </header>

          <section class="details">
            <div class="detail-box">
              <h3 class="detail-heading">Customer details</h3>
              <p class="detail-name">${escapeHtml(customerName)}</p>
              ${
                customerPhone
                  ? `<p>Phone: ${escapeHtml(customerPhone)}</p>`
                  : ''
              }
              ${
                customerEmail
                  ? `<p>Email: ${escapeHtml(customerEmail)}</p>`
                  : ''
              }
            </div>

            <div class="detail-box">
              <h3 class="detail-heading">Delivery details</h3>
              <p>${escapeHtml(deliveryAddress || 'No delivery address supplied')}</p>
              ${
                order?.delivery_method
                  ? `<p>Method: ${escapeHtml(order.delivery_method)}</p>`
                  : ''
              }
            </div>
          </section>

          <h3 class="items-heading">Order items</h3>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              ${
                itemRows ||
                '<tr><td colspan="4">No order items found.</td></tr>'
              }
            </tbody>
          </table>

          <section class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${money(subtotal)}</span>
            </div>

            <div class="total-row">
              <span>Delivery</span>
              <span>${money(deliveryFee)}</span>
            </div>

            <div class="total-row grand-total">
              <span>Total</span>
              <span>${money(total)}</span>
            </div>
          </section>

          <section class="status-row">
            <div class="status-pill">
              Order status: ${escapeHtml(
                readableStatus(order?.order_status)
              )}
            </div>

            <div class="status-pill">
              Payment status: ${escapeHtml(
                readableStatus(order?.payment_status)
              )}
            </div>
          </section>

          ${
            order?.notes || order?.customer_note
              ? `
                <section class="notes">
                  <strong>Order note</strong>
                  ${escapeHtml(order?.notes || order?.customer_note)}
                </section>
              `
              : ''
          }

          <footer class="footer">
            <strong>Thank you for shopping with Valuedam.</strong>
            ${
              isInvoice
                ? 'Please keep this invoice for your records.'
                : 'Please keep this receipt as proof of your transaction.'
            }
            <div>Valuedam Online Store</div>
          </footer>
        </main>

        <script>
          function printAs(size) {
            document.body.classList.toggle('paper-80', size === '80');
            document.body.classList.toggle('paper-a4', size === 'a4');

            document.title =
              (size === '80' ? '80mm Receipt' : 'A4 Document') +
              ' - ${escapeHtml(orderNumber)}';

            window.setTimeout(function () {
              window.print();
            }, 250);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export default function StoreOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState({});
  const [updatingOrders, setUpdatingOrders] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentProofs, setPaymentProofs] = useState([]);
  const [proofFilter, setProofFilter] = useState('pending');
  const [proofLoading, setProofLoading] = useState(false);
  const [reviewingProofs, setReviewingProofs] = useState({});
  const [proofNotes, setProofNotes] = useState({});
  const [openingProofs, setOpeningProofs] = useState({});

  const loadOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('store_orders')
        .select('*, store_order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error loading store orders:', error);
      setErrorMessage(
        rpcMessage(error) || 'Unable to load store orders.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);


  const loadPaymentProofs = useCallback(async () => {
    setProofLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'store_admin_list_payment_proofs',
        { p_review_status: proofFilter === 'all' ? null : proofFilter }
      );
      if (error) throw error;
      setPaymentProofs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading payment proofs:', error);
      setErrorMessage(
        `Could not load payment proofs: ${rpcMessage(error)}`
      );
    } finally {
      setProofLoading(false);
    }
  }, [proofFilter]);

  useEffect(() => {
    loadPaymentProofs();
  }, [loadPaymentProofs]);

  const openPaymentProof = async (proof) => {
    if (!proof?.storage_path) {
      setErrorMessage('This payment proof has no stored file path.');
      return;
    }

    setOpeningProofs((current) => ({ ...current, [proof.id]: true }));
    setErrorMessage('');
    // Open a blank tab synchronously inside the click handler to reduce popup-blocker issues.
    const receiptWindow = window.open('about:blank', '_blank');
    if (receiptWindow) {
      try {
        receiptWindow.opener = null;
        receiptWindow.document.title = 'Opening secure Valuedam receipt…';
        receiptWindow.document.body.textContent = 'Opening secure receipt…';
      } catch {
        // Some browsers restrict access to a newly opened tab; navigation can still work.
      }
    }
    try {
      const { data, error } = await supabase.storage
        .from('store-payment-proofs')
        .createSignedUrl(proof.storage_path, 300);
      if (error) throw error;
      if (!data?.signedUrl) {
        throw new Error('Supabase did not return a secure receipt link.');
      }
      if (receiptWindow) {
        receiptWindow.location.href = data.signedUrl;
      } else {
        throw new Error('Your browser blocked the receipt tab. Allow pop-ups and click View receipt again.');
      }
    } catch (error) {
      if (receiptWindow && !receiptWindow.closed) receiptWindow.close();
      console.error('Error opening payment proof:', error);
      setErrorMessage(`Could not open receipt: ${rpcMessage(error)}`);
    } finally {
      setOpeningProofs((current) => ({ ...current, [proof.id]: false }));
    }
  };

  const reviewPaymentProof = async (entry, decision) => {
    const proof = entry?.proof;
    const order = entry?.order;
    if (!proof?.id) {
      setErrorMessage('The selected payment proof is missing its ID.');
      return;
    }

    const orderNumber = getOrderNumber(order || {});
    if (decision === 'approved') {
      const confirmed = window.confirm(
        `Approve the bank-transfer proof for order ${orderNumber}?\n\nOnly continue if you have independently confirmed the money has arrived in the Valuedam bank account. Approval will mark the order as PAID.`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        `Reject the payment proof for order ${orderNumber}? The order will not be marked as paid.`
      );
      if (!confirmed) return;
    }

    setReviewingProofs((current) => ({ ...current, [proof.id]: true }));
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { data, error } = await supabase.rpc(
        'store_admin_review_payment_proof',
        {
          p_proof_id: proof.id,
          p_decision: decision,
          p_review_notes: String(proofNotes[proof.id] || '').trim() || null,
        }
      );
      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.message || 'The proof review was not completed.');
      }

      setSuccessMessage(
        decision === 'approved'
          ? `Payment proof approved. Order ${orderNumber} has been marked paid.`
          : `Payment proof rejected for order ${orderNumber}.`
      );
      setProofNotes((current) => ({ ...current, [proof.id]: '' }));
      await Promise.all([loadPaymentProofs(), loadOrders(true)]);
    } catch (error) {
      console.error('Error reviewing payment proof:', error);
      setErrorMessage(`Could not ${decision} payment proof: ${rpcMessage(error)}`);
    } finally {
      setReviewingProofs((current) => ({ ...current, [proof.id]: false }));
    }
  };

  useEffect(() => {
    if (!successMessage && !errorMessage) return undefined;

    const timeout = window.setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [successMessage, errorMessage]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const orderNumber = getOrderNumber(order).toLowerCase();
      const customerName = getCustomerName(order).toLowerCase();
      const customerEmail = getCustomerEmail(order).toLowerCase();
      const customerPhone = getCustomerPhone(order).toLowerCase();

      const matchesSearch =
        !query ||
        orderNumber.includes(query) ||
        customerName.includes(query) ||
        customerEmail.includes(query) ||
        customerPhone.includes(query);

      const matchesOrderStatus =
        statusFilter === 'all' ||
        String(order.order_status || 'pending').toLowerCase() ===
          statusFilter;

      const matchesPaymentStatus =
        paymentFilter === 'all' ||
        String(order.payment_status || 'unpaid').toLowerCase() ===
          paymentFilter;

      return (
        matchesSearch &&
        matchesOrderStatus &&
        matchesPaymentStatus
      );
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;

    const pendingOrders = orders.filter(
      (order) =>
        String(order.order_status || 'pending').toLowerCase() ===
        'pending'
    ).length;

    const processingOrders = orders.filter((order) =>
      ['confirmed', 'processing', 'shipped'].includes(
        String(order.order_status || '').toLowerCase()
      )
    ).length;

    const deliveredOrders = orders.filter(
      (order) =>
        String(order.order_status || '').toLowerCase() === 'delivered'
    ).length;

    const paidRevenue = orders
      .filter(
        (order) =>
          String(order.payment_status || '').toLowerCase() === 'paid' &&
          String(order.order_status || '').toLowerCase() !== 'cancelled'
      )
      .reduce((sum, order) => sum + getOrderTotal(order), 0);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      paidRevenue,
    };
  }, [orders]);

  const toggleExpanded = (orderId) => {
    setExpandedOrders((current) => ({
      ...current,
      [orderId]: !current[orderId],
    }));
  };

  const updateOrderStatus = async (order, nextStatus) => {
    if (!order?.id || !nextStatus) return;

    const currentStatus = String(
      order.order_status || 'pending'
    ).toLowerCase();

    if (currentStatus === nextStatus) return;

    const orderLabel = getOrderNumber(order);

    if (
      nextStatus === 'cancelled' &&
      !window.confirm(
        `Cancel order ${orderLabel}? This action may restore stock tracked for this order.`
      )
    ) {
      return;
    }

    setUpdatingOrders((current) => ({
      ...current,
      [order.id]: true,
    }));
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (nextStatus === 'cancelled') {
        const { error } = await supabase.rpc('store_cancel_order', {
          p_order_id: order.id,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.rpc(
          'store_admin_update_order_status',
          {
            p_order_id: order.id,
            p_order_status: nextStatus,
          }
        );

        if (error) throw error;
      }

      setSuccessMessage(
        `Order ${orderLabel} updated to ${readableStatus(nextStatus)}.`
      );

      await loadOrders(true);
    } catch (error) {
      console.error('Error updating order status:', error);
      setErrorMessage(
        `Could not update order ${orderLabel}: ${rpcMessage(error)}`
      );
    } finally {
      setUpdatingOrders((current) => ({
        ...current,
        [order.id]: false,
      }));
    }
  };

  const updatePaymentStatus = async (order, nextStatus) => {
    if (!order?.id || !nextStatus) return;

    const currentStatus = String(
      order.payment_status || 'unpaid'
    ).toLowerCase();

    if (currentStatus === nextStatus) return;

    const orderLabel = getOrderNumber(order);

    if (
      nextStatus === 'refunded' &&
      !window.confirm(
        `Mark payment for order ${orderLabel} as refunded?`
      )
    ) {
      return;
    }

    setUpdatingOrders((current) => ({
      ...current,
      [order.id]: true,
    }));
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.rpc(
        'store_admin_update_payment_status',
        {
          p_order_id: order.id,
          p_payment_status: nextStatus,
        }
      );

      if (error) throw error;

      setSuccessMessage(
        `Payment for order ${orderLabel} updated to ${readableStatus(nextStatus)}.`
      );

      await loadOrders(true);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setErrorMessage(
        `Could not update payment for order ${orderLabel}: ${rpcMessage(error)}`
      );
    } finally {
      setUpdatingOrders((current) => ({
        ...current,
        [order.id]: false,
      }));
    }
  };

  return (
    <div className="valuedam-orders-page">
      <style>{`
        .valuedam-orders-page {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 22px;
          color: #111827;
        }

        .valuedam-orders-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .valuedam-orders-heading {
          margin: 0;
          font-size: clamp(23px, 3vw, 31px);
          font-weight: 850;
          letter-spacing: -.6px;
        }

        .valuedam-orders-subtitle {
          margin: 7px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .valuedam-orders-refresh {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 10px 15px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          color: #111827;
          font-weight: 750;
          cursor: pointer;
        }

        .valuedam-orders-refresh:disabled {
          cursor: wait;
          opacity: .6;
        }

        .valuedam-orders-stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .valuedam-orders-stat {
          min-width: 0;
          padding: 17px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #fff;
        }

        .valuedam-orders-stat-label {
          display: block;
          color: #6b7280;
          font-size: 12px;
          font-weight: 700;
        }

        .valuedam-orders-stat-value {
          display: block;
          margin-top: 8px;
          font-size: clamp(18px, 2vw, 25px);
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        .valuedam-orders-filters {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(150px, 210px));
          gap: 12px;
          margin-bottom: 18px;
        }

        .valuedam-orders-search {
          position: relative;
        }

        .valuedam-orders-search svg {
          position: absolute;
          top: 50%;
          left: 13px;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }

        .valuedam-orders-input,
        .valuedam-orders-select {
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          background: #fff;
          color: #111827;
          font: inherit;
          font-size: 13px;
        }

        .valuedam-orders-search .valuedam-orders-input {
          padding-left: 40px;
        }

        .valuedam-orders-message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 0 0 16px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .valuedam-orders-message-error {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
        }

        .valuedam-orders-message-success {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .valuedam-proof-panel {
          margin: 0 0 24px;
          padding: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 2px 6px rgba(17, 24, 39, .025);
        }
        .valuedam-proof-heading-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 14px;
        }
        .valuedam-proof-heading {
          margin: 0;
          font-size: 18px;
          font-weight: 850;
        }
        .valuedam-proof-help {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.5;
        }
        .valuedam-proof-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .valuedam-proof-toolbar select {
          min-height: 40px;
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          font: inherit;
          font-size: 12px;
        }
        .valuedam-proof-list {
          display: grid;
          gap: 12px;
        }
        .valuedam-proof-card {
          min-width: 0;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 11px;
          background: #fcfcfd;
        }
        .valuedam-proof-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
        }
        .valuedam-proof-order {
          margin: 0;
          font-size: 14px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }
        .valuedam-proof-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 12px;
          margin-top: 6px;
          color: #6b7280;
          font-size: 12px;
          overflow-wrap: anywhere;
        }
        .valuedam-proof-amount {
          font-size: 15px;
          font-weight: 850;
          white-space: nowrap;
        }
        .valuedam-proof-note {
          display: block;
          width: 100%;
          min-height: 76px;
          margin-top: 12px;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          resize: vertical;
          font: inherit;
          font-size: 13px;
        }
        .valuedam-proof-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 11px;
        }
        .valuedam-proof-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 9px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }
        .valuedam-proof-action:disabled {
          cursor: wait;
          opacity: .55;
        }
        .valuedam-proof-approve {
          border-color: #15803d;
          background: #15803d;
          color: #fff;
        }
        .valuedam-proof-reject {
          border-color: #fecaca;
          background: #fff1f2;
          color: #9f1239;
        }
        .valuedam-proof-status {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          background: #f9fafb;
          color: #374151;
          font-size: 11px;
          font-weight: 800;
        }
        .valuedam-proof-status.pending {
          border-color: #fde68a;
          background: #fffbeb;
          color: #92400e;
        }
        .valuedam-proof-status.approved {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }
        .valuedam-proof-status.rejected {
          border-color: #fecaca;
          background: #fef2f2;
          color: #991b1b;
        }
        .valuedam-proof-empty {
          padding: 25px 12px;
          color: #6b7280;
          text-align: center;
          font-size: 13px;
        }

        .valuedam-orders-list {
          display: grid;
          gap: 14px;
        }

        .valuedam-order-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 2px 6px rgba(17, 24, 39, .025);
        }

        .valuedam-order-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
        }

        .valuedam-order-main {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          min-width: 0;
        }

        .valuedam-order-icon {
          display: flex;
          flex: 0 0 42px;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: #fff7df;
          color: #8a6200;
        }

        .valuedam-order-heading {
          margin: 0;
          font-size: 15px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        .valuedam-order-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px 13px;
          margin-top: 7px;
          color: #6b7280;
          font-size: 12px;
        }

        .valuedam-order-customer {
          margin-top: 8px;
          font-size: 13px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .valuedam-order-total {
          text-align: right;
          white-space: nowrap;
        }

        .valuedam-order-total strong {
          display: block;
          font-size: 17px;
          font-weight: 850;
        }

        .valuedam-order-total small {
          display: block;
          margin-top: 5px;
          color: #6b7280;
          font-size: 11px;
        }

        .valuedam-order-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 0 18px 15px;
        }

        .valuedam-order-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          background: #f9fafb;
          color: #374151;
          font-size: 11px;
          font-weight: 750;
        }

        .valuedam-order-badge.pending,
        .valuedam-order-badge.unpaid {
          border-color: #fde68a;
          background: #fffbeb;
          color: #92400e;
        }

        .valuedam-order-badge.paid,
        .valuedam-order-badge.delivered,
        .valuedam-order-badge.confirmed {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .valuedam-order-badge.cancelled,
        .valuedam-order-badge.failed,
        .valuedam-order-badge.refunded {
          border-color: #fecaca;
          background: #fef2f2;
          color: #991b1b;
        }

        .valuedam-order-controls {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 16px 18px;
          border-top: 1px solid #f3f4f6;
          background: #fcfcfd;
        }

        .valuedam-order-control label {
          display: block;
          margin-bottom: 6px;
          color: #6b7280;
          font-size: 11px;
          font-weight: 750;
        }

        .valuedam-order-select {
          width: 100%;
          min-height: 39px;
          padding: 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          font: inherit;
          font-size: 12px;
        }

        .valuedam-order-select:disabled {
          cursor: wait;
          opacity: .6;
        }

        .valuedam-order-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 18px 16px;
        }

        .valuedam-order-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 9px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .valuedam-order-action:hover {
          background: #f9fafb;
        }

        .valuedam-order-action-primary {
          border-color: #f5b82e;
          background: #f5b82e;
          color: #171717;
        }

        .valuedam-order-action-primary:hover {
          background: #ffca4d;
        }

        .valuedam-order-details {
          padding: 18px;
          border-top: 1px solid #e5e7eb;
          background: #fff;
        }

        .valuedam-order-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .valuedam-order-detail-heading {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 850;
        }

        .valuedam-order-detail-text {
          margin: 5px 0;
          color: #4b5563;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .valuedam-order-items-title {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 850;
        }

        .valuedam-order-items-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .valuedam-order-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .valuedam-order-items-table th,
        .valuedam-order-items-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
        }

        .valuedam-order-items-table th {
          background: #f9fafb;
          color: #6b7280;
          font-size: 10px;
          text-transform: uppercase;
        }

        .valuedam-order-items-table .numeric {
          text-align: right;
          white-space: nowrap;
        }

        .valuedam-order-breakdown {
          display: grid;
          gap: 8px;
          width: 100%;
          max-width: 300px;
          margin: 16px 0 0 auto;
          font-size: 12px;
        }

        .valuedam-order-breakdown-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .valuedam-order-breakdown-total {
          padding-top: 9px;
          border-top: 1px solid #d1d5db;
          font-size: 14px;
          font-weight: 850;
        }

        .valuedam-orders-empty {
          padding: 48px 18px;
          border: 1px dashed #d1d5db;
          border-radius: 14px;
          background: #fff;
          text-align: center;
        }

        .valuedam-orders-empty svg {
          margin: 0 auto 12px;
          color: #9ca3af;
        }

        .valuedam-orders-empty h3 {
          margin: 0;
          font-size: 16px;
        }

        .valuedam-orders-empty p {
          margin: 7px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .valuedam-orders-loading {
          padding: 45px 16px;
          color: #6b7280;
          text-align: center;
        }

        @media (max-width: 1050px) {
          .valuedam-orders-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .valuedam-orders-page {
            padding: 14px;
          }

          .valuedam-orders-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .valuedam-orders-stat {
            padding: 13px;
          }

          .valuedam-orders-filters {
            grid-template-columns: 1fr;
          }

          .valuedam-order-top {
            padding: 14px;
          }

          .valuedam-order-controls {
            padding: 14px;
          }

          .valuedam-order-actions {
            padding: 0 14px 14px;
          }

          .valuedam-order-badges {
            padding: 0 14px 13px;
          }

          .valuedam-order-detail-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .valuedam-order-details {
            padding: 14px;
          }
        }

        @media (max-width: 460px) {
          .valuedam-order-top {
            flex-direction: column;
          }

          .valuedam-order-total {
            padding-left: 55px;
            text-align: left;
          }

          .valuedam-order-controls {
            grid-template-columns: 1fr;
          }

          .valuedam-order-action {
            flex: 1 1 100%;
          }
        }
      `}</style>

      <header className="valuedam-orders-header">
        <div>
          <h1 className="valuedam-orders-heading">Store Orders</h1>
          <p className="valuedam-orders-subtitle">
            Manage customer orders, payments, delivery and printable documents.
          </p>
        </div>

        <button
          type="button"
          className="valuedam-orders-refresh"
          onClick={() => loadOrders(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />
          {refreshing ? 'Refreshing…' : 'Refresh orders'}
        </button>
      </header>

      {errorMessage && (
        <div className="valuedam-orders-message valuedam-orders-message-error">
          <AlertCircle size={17} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="valuedam-orders-message valuedam-orders-message-success">
          <CheckCircle2 size={17} />
          <span>{successMessage}</span>
        </div>
      )}

      <section className="valuedam-orders-stats">
        <div className="valuedam-orders-stat">
          <span className="valuedam-orders-stat-label">All orders</span>
          <strong className="valuedam-orders-stat-value">
            {stats.totalOrders}
          </strong>
        </div>

        <div className="valuedam-orders-stat">
          <span className="valuedam-orders-stat-label">Pending orders</span>
          <strong className="valuedam-orders-stat-value">
            {stats.pendingOrders}
          </strong>
        </div>

        <div className="valuedam-orders-stat">
          <span className="valuedam-orders-stat-label">In progress</span>
          <strong className="valuedam-orders-stat-value">
            {stats.processingOrders}
          </strong>
        </div>

        <div className="valuedam-orders-stat">
          <span className="valuedam-orders-stat-label">Delivered</span>
          <strong className="valuedam-orders-stat-value">
            {stats.deliveredOrders}
          </strong>
        </div>

        <div className="valuedam-orders-stat">
          <span className="valuedam-orders-stat-label">Paid revenue</span>
          <strong className="valuedam-orders-stat-value">
            {money(stats.paidRevenue)}
          </strong>
        </div>
      </section>

      <section className="valuedam-proof-panel">
        <div className="valuedam-proof-heading-row">
          <div>
            <h2 className="valuedam-proof-heading">Bank-transfer proof review</h2>
            <p className="valuedam-proof-help">
              Open the privately stored receipt, check your bank account independently,
              then approve or reject the proof. Approving marks the order as paid.
            </p>
          </div>
          <div className="valuedam-proof-toolbar">
            <select
              aria-label="Filter payment proofs"
              value={proofFilter}
              onChange={(event) => setProofFilter(event.target.value)}
            >
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All proofs</option>
            </select>
            <button
              type="button"
              className="valuedam-proof-action"
              onClick={loadPaymentProofs}
              disabled={proofLoading}
            >
              <RefreshCw size={15} className={proofLoading ? 'animate-spin' : ''} />
              {proofLoading ? 'Loading…' : 'Refresh proofs'}
            </button>
          </div>
        </div>

        {proofLoading ? (
          <div className="valuedam-proof-empty">Loading payment proofs…</div>
        ) : paymentProofs.length === 0 ? (
          <div className="valuedam-proof-empty">
            <FileWarning size={24} style={{ display: 'block', margin: '0 auto 8px' }} />
            No {proofFilter === 'all' ? '' : `${proofFilter} `}payment proofs found.
          </div>
        ) : (
          <div className="valuedam-proof-list">
            {paymentProofs.map((entry, index) => {
              const proof = entry?.proof || {};
              const proofOrder = entry?.order || {};
              const proofOrderNumber = getOrderNumber(proofOrder);
              const isReviewing = Boolean(reviewingProofs[proof.id]);
              const isOpening = Boolean(openingProofs[proof.id]);
              const reviewStatus = String(proof.review_status || 'pending').toLowerCase();
              const fileName = proof.original_file_name || proof.storage_path?.split('/').pop() || 'Uploaded receipt';
              return (
                <article className="valuedam-proof-card" key={proof.id || `${proofOrderNumber}-${index}`}>
                  <div className="valuedam-proof-card-top">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="valuedam-proof-order">Order #{proofOrderNumber}</h3>
                      <div className="valuedam-proof-meta">
                        <span>{getCustomerName(proofOrder)}</span>
                        {getCustomerPhone(proofOrder) && <span>{getCustomerPhone(proofOrder)}</span>}
                        {getCustomerEmail(proofOrder) && <span>{getCustomerEmail(proofOrder)}</span>}
                        <span>Submitted: {formatDate(proof.created_at)}</span>
                      </div>
                      <div className="valuedam-proof-meta">
                        <span>{fileName}</span>
                        {proof.file_size_bytes ? <span>{(Number(proof.file_size_bytes) / 1024 / 1024).toFixed(2)} MB</span> : null}
                      </div>
                    </div>
                    <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                      <span className={`valuedam-proof-status ${statusClass(reviewStatus)}`}>
                        {readableStatus(reviewStatus)}
                      </span>
                      <strong className="valuedam-proof-amount">{money(getOrderTotal(proofOrder))}</strong>
                      <span className={`valuedam-order-badge ${statusClass(proofOrder.payment_status || 'unpaid')}`}>
                        Payment: {readableStatus(proofOrder.payment_status || 'unpaid')}
                      </span>
                    </div>
                  </div>

                  {proof.customer_note && (
                    <p className="valuedam-proof-help">
                      <strong>Customer note:</strong> {proof.customer_note}
                    </p>
                  )}
                  {proof.review_notes && (
                    <p className="valuedam-proof-help">
                      <strong>Previous review note:</strong> {proof.review_notes}
                    </p>
                  )}

                  {reviewStatus === 'pending' && (
                    <textarea
                      className="valuedam-proof-note"
                      value={proofNotes[proof.id] || ''}
                      onChange={(event) =>
                        setProofNotes((current) => ({ ...current, [proof.id]: event.target.value }))
                      }
                      maxLength={1000}
                      placeholder="Optional review note (required if you want to explain a rejection)…"
                      aria-label={`Review notes for order ${proofOrderNumber}`}
                      disabled={isReviewing}
                    />
                  )}

                  <div className="valuedam-proof-actions">
                    <button
                      type="button"
                      className="valuedam-proof-action"
                      onClick={() => openPaymentProof(proof)}
                      disabled={isOpening || !proof.storage_path}
                    >
                      <Eye size={15} />
                      {isOpening ? 'Opening receipt…' : 'View receipt'}
                    </button>
                    {reviewStatus === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="valuedam-proof-action valuedam-proof-approve"
                          onClick={() => reviewPaymentProof(entry, 'approved')}
                          disabled={isReviewing}
                        >
                          <FileCheck size={15} />
                          {isReviewing ? 'Saving review…' : 'Approve & mark paid'}
                        </button>
                        <button
                          type="button"
                          className="valuedam-proof-action valuedam-proof-reject"
                          onClick={() => reviewPaymentProof(entry, 'rejected')}
                          disabled={isReviewing}
                        >
                          <X size={15} />
                          Reject proof
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="valuedam-orders-filters">
        <div className="valuedam-orders-search">
          <Search size={17} />
          <input
            type="search"
            className="valuedam-orders-input"
            placeholder="Search order number, customer, email or phone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="valuedam-orders-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by order status"
        >
          <option value="all">All order statuses</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {readableStatus(status)}
            </option>
          ))}
        </select>

        <select
          className="valuedam-orders-select"
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
          aria-label="Filter by payment status"
        >
          <option value="all">All payment statuses</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {readableStatus(status)}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="valuedam-orders-loading">
          <RefreshCw
            size={24}
            style={{ margin: '0 auto 12px', display: 'block' }}
          />
          Loading store orders…
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="valuedam-orders-empty">
          <ShoppingBag size={34} />
          <h3>
            {orders.length === 0
              ? 'No orders yet'
              : 'No matching orders'}
          </h3>
          <p>
            {orders.length === 0
              ? 'Customer orders will appear here when they are placed.'
              : 'Try changing your search or filters.'}
          </p>
        </div>
      ) : (
        <section className="valuedam-orders-list">
          {filteredOrders.map((order) => {
            const orderId = order.id;
            const orderNumber = getOrderNumber(order);
            const items = getOrderItems(order);
            const isExpanded = Boolean(expandedOrders[orderId]);
            const isUpdating = Boolean(updatingOrders[orderId]);

            const orderStatus = String(
              order.order_status || 'pending'
            ).toLowerCase();

            const paymentStatus = String(
              order.payment_status || 'unpaid'
            ).toLowerCase();

            return (
              <article
                className="valuedam-order-card"
                key={orderId}
              >
                <div className="valuedam-order-top">
                  <div className="valuedam-order-main">
                    <div className="valuedam-order-icon">
                      <Package size={21} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h2 className="valuedam-order-heading">
                        Order #{orderNumber}
                      </h2>

                      <div className="valuedam-order-meta">
                        <span>
                          <CalendarDays
                            size={12}
                            style={{
                              display: 'inline',
                              verticalAlign: 'middle',
                              marginRight: 4,
                            }}
                          />
                          {formatDate(order.created_at)}
                        </span>

                        <span>
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className="valuedam-order-customer">
                        {getCustomerName(order)}
                      </div>
                    </div>
                  </div>

                  <div className="valuedam-order-total">
                    <strong>{money(getOrderTotal(order))}</strong>
                    <small>{readableStatus(paymentStatus)}</small>
                  </div>
                </div>

                <div className="valuedam-order-badges">
                  <span
                    className={`valuedam-order-badge ${statusClass(orderStatus)}`}
                  >
                    Order: {readableStatus(orderStatus)}
                  </span>

                  <span
                    className={`valuedam-order-badge ${statusClass(paymentStatus)}`}
                  >
                    Payment: {readableStatus(paymentStatus)}
                  </span>
                </div>

                <div className="valuedam-order-controls">
                  <div className="valuedam-order-control">
                    <label htmlFor={`order-status-${orderId}`}>
                      Order status
                    </label>

                    <select
                      id={`order-status-${orderId}`}
                      className="valuedam-order-select"
                      value={orderStatus}
                      disabled={isUpdating}
                      onChange={(event) =>
                        updateOrderStatus(order, event.target.value)
                      }
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {readableStatus(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="valuedam-order-control">
                    <label htmlFor={`payment-status-${orderId}`}>
                      Payment status
                    </label>

                    <select
                      id={`payment-status-${orderId}`}
                      className="valuedam-order-select"
                      value={paymentStatus}
                      disabled={isUpdating}
                      onChange={(event) =>
                        updatePaymentStatus(order, event.target.value)
                      }
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {readableStatus(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="valuedam-order-actions">
                  <button
                    type="button"
                    className="valuedam-order-action"
                    onClick={() => toggleExpanded(orderId)}
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                    {isExpanded ? 'Hide details' : 'View details'}
                  </button>

                  <button
                    type="button"
                    className="valuedam-order-action valuedam-order-action-primary"
                    onClick={() => printOrder(order, 'receipt')}
                  >
                    <Printer size={16} />
                    Print receipt
                  </button>

                  <button
                    type="button"
                    className="valuedam-order-action"
                    onClick={() => printOrder(order, 'invoice')}
                  >
                    <FileText size={16} />
                    Print invoice
                  </button>
                </div>

                {isExpanded && (
                  <div className="valuedam-order-details">
                    <div className="valuedam-order-detail-grid">
                      <div>
                        <h3 className="valuedam-order-detail-heading">
                          <User size={15} />
                          Customer information
                        </h3>

                        <p className="valuedam-order-detail-text">
                          <strong>{getCustomerName(order)}</strong>
                        </p>

                        {getCustomerPhone(order) && (
                          <p className="valuedam-order-detail-text">
                            <Phone
                              size={13}
                              style={{
                                display: 'inline',
                                verticalAlign: 'middle',
                                marginRight: 5,
                              }}
                            />
                            {getCustomerPhone(order)}
                          </p>
                        )}

                        {getCustomerEmail(order) && (
                          <p className="valuedam-order-detail-text">
                            <Mail
                              size={13}
                              style={{
                                display: 'inline',
                                verticalAlign: 'middle',
                                marginRight: 5,
                              }}
                            />
                            {getCustomerEmail(order)}
                          </p>
                        )}
                      </div>

                      <div>
                        <h3 className="valuedam-order-detail-heading">
                          <Truck size={15} />
                          Delivery information
                        </h3>

                        <p className="valuedam-order-detail-text">
                          <MapPin
                            size={13}
                            style={{
                              display: 'inline',
                              verticalAlign: 'middle',
                              marginRight: 5,
                            }}
                          />
                          {getDeliveryAddress(order) ||
                            'No delivery address supplied'}
                        </p>

                        {order.delivery_method && (
                          <p className="valuedam-order-detail-text">
                            Delivery method: {order.delivery_method}
                          </p>
                        )}

                        {order.payment_method && (
                          <p className="valuedam-order-detail-text">
                            <CreditCard
                              size={13}
                              style={{
                                display: 'inline',
                                verticalAlign: 'middle',
                                marginRight: 5,
                              }}
                            />
                            Payment method: {order.payment_method}
                          </p>
                        )}
                      </div>
                    </div>

                    <h3 className="valuedam-order-items-title">
                      Products in this order
                    </h3>

                    <div className="valuedam-order-items-table-wrap">
                      <table className="valuedam-order-items-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th className="numeric">Unit price</th>
                            <th className="numeric">Amount</th>
                          </tr>
                        </thead>

                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={4}>No order items found.</td>
                            </tr>
                          ) : (
                            items.map((item, index) => (
                              <tr key={item.id || `${orderId}-${index}`}>
                                <td>{getItemName(item)}</td>
                                <td>{getItemQuantity(item)}</td>
                                <td className="numeric">
                                  {money(getItemPrice(item))}
                                </td>
                                <td className="numeric">
                                  {money(getItemTotal(item))}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="valuedam-order-breakdown">
                      <div className="valuedam-order-breakdown-row">
                        <span>Subtotal</span>
                        <span>{money(getSubtotal(order))}</span>
                      </div>

                      <div className="valuedam-order-breakdown-row">
                        <span>Delivery fee</span>
                        <span>{money(getDeliveryFee(order))}</span>
                      </div>

                      <div className="valuedam-order-breakdown-row valuedam-order-breakdown-total">
                        <span>Order total</span>
                        <span>{money(getOrderTotal(order))}</span>
                      </div>
                    </div>

                    {(order.notes || order.customer_note) && (
                      <div className="valuedam-order-detail-text" style={{ marginTop: 18 }}>
                        <strong>Customer note:</strong>{' '}
                        {order.notes || order.customer_note}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
