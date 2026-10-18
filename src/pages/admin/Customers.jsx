import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const statuses = ["active", "prospect", "inactive"];

const requestStatuses = [
  "new",
  "contacted",
  "quoted",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const quoteStatuses = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
];

function formatStatus(status) {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleString();
}

function formatShortDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString();
}

function formatAmount(amount, currency = "NGN") {
  if (
    amount === null ||
    amount === undefined ||
    amount === ""
  ) {
    return "—";
  }

  const number = Number(amount);

  if (Number.isNaN(number)) {
    return String(amount);
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return `₦${number.toLocaleString()}`;
  }
}

function isQuoteExpired(quote) {
  if (
    !quote?.expiry_date ||
    ["accepted", "rejected", "cancelled", "expired"].includes(
      quote.status
    )
  ) {
    return false;
  }

  return new Date(quote.expiry_date).getTime() < Date.now();
}

function getEffectiveQuoteStatus(quote) {
  if (isQuoteExpired(quote)) {
    return "expired";
  }

  return quote.status || "draft";
}

function getQuoteStatusClass(status) {
  const safeStatus = String(status || "draft").replace(
    /[^a-z0-9_-]/gi,
    ""
  );

  return `quote-status-${safeStatus}`;
}

function getPaymentStatusClass(status) {
  const safeStatus = String(status || "unpaid")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gi, "");

  return `payment-status-${safeStatus}`;
}

function getPaymentStatus(payment, invoices) {
  const invoice = invoices.find(
    (item) => item.id === payment.invoice_id
  );

  if (!invoice) {
    return "recorded";
  }

  const total = Number(invoice.total || 0);
  const paid = Number(invoice.amount_paid || 0);

  if (paid >= total && total > 0) {
    return "paid";
  }

  if (paid > 0) {
    return "partially_paid";
  }

  return "unpaid";
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [customerRequests, setCustomerRequests] = useState([]);
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customerJobs, setCustomerJobs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    company_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    status: "active",
    notes: "",
  });

  async function loadCustomers() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("crm_customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Unable to load customers.");
      setCustomers([]);
    } else {
      setCustomers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        [
          customer.full_name,
          customer.company_name,
          customer.email,
          customer.phone,
          customer.whatsapp,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );

      const matchesStatus =
        statusFilter === "all" ||
        customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: customers.length,
      active: customers.filter(
        (customer) => customer.status === "active"
      ).length,
      prospects: customers.filter(
        (customer) => customer.status === "prospect"
      ).length,
      inactive: customers.filter(
        (customer) => customer.status === "inactive"
      ).length,
    };
  }, [customers]);

  const paymentSummary = useMemo(() => {
    const totalPaid = customerPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

    const outstanding = customerInvoices.reduce(
      (sum, invoice) =>
        sum + Number(invoice.balance_due || 0),
      0
    );

    return {
      totalPaid,
      outstanding,
      count: customerPayments.length,
    };
  }, [customerPayments, customerInvoices]);

  function resetForm() {
    setForm({
      full_name: "",
      company_name: "",
      email: "",
      phone: "",
      whatsapp: "",
      status: "active",
      notes: "",
    });
  }

  function clearCustomerHistory() {
    setCustomerRequests([]);
    setCustomerQuotes([]);
    setCustomerPayments([]);
    setCustomerInvoices([]);
    setCustomerJobs([]);
  }

  function openAddCustomer() {
    resetForm();
    setSelectedCustomer(null);
    clearCustomerHistory();
    setMessage("");
    setShowForm(true);
  }

  function openEditCustomer(customer) {
    setSelectedCustomer(customer);
    clearCustomerHistory();
    setMessage("");

    setForm({
      full_name: customer.full_name || "",
      company_name: customer.company_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      whatsapp: customer.whatsapp || "",
      status: customer.status || "active",
      notes: customer.notes || "",
    });

    setShowForm(true);

    loadCustomerRequests(customer.id);
    loadCustomerQuotes(customer.id);
    loadCustomerPayments(customer.id);
  }

  async function loadCustomerRequests(customerId) {
    if (!customerId) {
      setCustomerRequests([]);
      return;
    }

    setRequestsLoading(true);

    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(
        "Customer loaded, but request history could not be loaded."
      );
      setCustomerRequests([]);
    } else {
      setCustomerRequests(data || []);
    }

    setRequestsLoading(false);
  }

  async function loadCustomerQuotes(customerId) {
    if (!customerId) {
      setCustomerQuotes([]);
      return;
    }

    setQuotesLoading(true);

    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(
        "Customer loaded, but quote history could not be loaded."
      );
      setCustomerQuotes([]);
    } else {
      setCustomerQuotes(data || []);
    }

    setQuotesLoading(false);
  }

  async function loadCustomerPayments(customerId) {
    if (!customerId) {
      setCustomerPayments([]);
      setCustomerInvoices([]);
      setCustomerJobs([]);
      return;
    }

    setPaymentsLoading(true);

    const [
      paymentsResult,
      invoicesResult,
      jobsResult,
    ] = await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("customer_id", customerId)
        .order("payment_date", {
          ascending: false,
        }),

      supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("jobs")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (paymentsResult.error) {
      console.error(
        "Customer payment history error:",
        paymentsResult.error
      );

      setMessage(
        "Customer loaded, but payment history could not be loaded."
      );

      setCustomerPayments([]);
    } else {
      setCustomerPayments(
        paymentsResult.data || []
      );
    }

    if (invoicesResult.error) {
      console.error(
        "Customer invoice history error:",
        invoicesResult.error
      );

      setCustomerInvoices([]);
    } else {
      setCustomerInvoices(
        invoicesResult.data || []
      );
    }

    if (jobsResult.error) {
      console.error(
        "Customer job history error:",
        jobsResult.error
      );

      setCustomerJobs([]);
    } else {
      setCustomerJobs(
        jobsResult.data || []
      );
    }

    setPaymentsLoading(false);
  }

  async function saveCustomer(event) {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setMessage("Customer name is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      full_name: form.full_name.trim(),
      company_name: form.company_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    let result;

    if (selectedCustomer?.id) {
      result = await supabase
        .from("crm_customers")
        .update(payload)
        .eq("id", selectedCustomer.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("crm_customers")
        .insert(payload)
        .select()
        .single();
    }

    const { data, error } = result;

    if (error) {
      console.error(error);
      setMessage(error.message);
      setSaving(false);
      return;
    }

    if (selectedCustomer?.id) {
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === data.id ? data : customer
        )
      );

      setSelectedCustomer(data);

      setMessage("Customer updated successfully.");

      await Promise.all([
        loadCustomerRequests(data.id),
        loadCustomerQuotes(data.id),
        loadCustomerPayments(data.id),
      ]);
    } else {
      setCustomers((current) => [data, ...current]);
      setSelectedCustomer(data);
      setCustomerRequests([]);
      setCustomerQuotes([]);
      setCustomerPayments([]);
      setCustomerInvoices([]);
      setCustomerJobs([]);

      setMessage("Customer created successfully.");
    }

    setSaving(false);
  }

  async function deleteCustomer(customer) {
    const confirmed = window.confirm(
      `Delete ${customer.full_name} permanently?\n\nThis removes the CRM customer record. Existing service requests and quotes will remain, but their CRM customer link may be cleared according to the database relationships.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage("");

    const { error } = await supabase
      .from("crm_customers")
      .delete()
      .eq("id", customer.id);

    if (error) {
      console.error(error);
      setMessage(error.message);
      setDeleting(false);
      return;
    }

    setCustomers((current) =>
      current.filter((item) => item.id !== customer.id)
    );

    if (selectedCustomer?.id === customer.id) {
      setSelectedCustomer(null);
      clearCustomerHistory();
      setShowForm(false);
    }

    setMessage("Customer deleted.");
    setDeleting(false);
  }

  function closeForm() {
    setShowForm(false);
    setMessage("");
    setSelectedCustomer(null);
    clearCustomerHistory();
    resetForm();
  }

  function openRequest(request) {
    window.location.href = `/admin/requests?request=${request.id}`;
  }

  function editQuote(quote) {
    window.location.href = `/admin/quotes?edit=${encodeURIComponent(
      quote.id
    )}`;
  }

  function printQuote(quote) {
    window.open(
      `/admin/quotes/print?id=${encodeURIComponent(quote.id)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function createQuoteForCustomer(customer) {
    if (!customer?.id) return;

    window.location.href = `/admin/quotes?customer=${encodeURIComponent(
      customer.id
    )}`;
  }

  function openInvoice(invoice) {
    if (!invoice?.id) return;

    window.location.href = `/admin/invoices?edit=${encodeURIComponent(
      invoice.id
    )}`;
  }

  function openJob(job) {
    if (!job?.id) return;

    window.location.href = `/admin/jobs/view?id=${encodeURIComponent(
      job.id
    )}`;
  }

  function printReceipt(payment) {
    if (!payment?.id) return;

    window.open(
      `/admin/receipts/print?id=${encodeURIComponent(
        payment.id
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function getPaymentInvoice(payment) {
    return customerInvoices.find(
      (invoice) =>
        invoice.id === payment.invoice_id
    );
  }

  function getPaymentJob(payment) {
    return customerJobs.find(
      (job) =>
        job.id === payment.job_id
    );
  }

  return (
    <div className="customers-admin">
      <style>{`
        .customers-admin {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          color: #172033;
        }

        .customers-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }

        .customers-header h1 {
          margin: 0 0 6px;
          font-size: 28px;
          line-height: 1.2;
        }

        .customers-header p {
          margin: 0;
          color: #667085;
        }

        .primary-button,
        .secondary-button,
        .danger-button {
          border: 0;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .primary-button {
          background: #111827;
          color: white;
        }

        .primary-button:hover {
          background: #000000;
        }

        .secondary-button {
          background: #eef2f7;
          color: #172033;
        }

        .secondary-button:hover {
          background: #e2e8f0;
        }

        .danger-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        .danger-button:hover {
          background: #fecaca;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        }

        .stat-label {
          color: #667085;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
        }

        .toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .search-input,
        .filter-select {
          height: 44px;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          padding: 0 13px;
          font-size: 14px;
          background: white;
          color: #172033;
          outline: none;
        }

        .search-input {
          flex: 1;
          min-width: 240px;
        }

        .search-input:focus,
        .filter-select:focus,
        .form-input:focus,
        .form-textarea:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }

        .customers-table-wrap {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        }

        .customers-table {
          width: 100%;
          border-collapse: collapse;
        }

        .customers-table th,
        .customers-table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid #eef0f3;
          vertical-align: top;
        }

        .customers-table th {
          background: #f8fafc;
          color: #667085;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .customers-table td {
          font-size: 14px;
        }

        .customer-name {
          font-weight: 700;
          color: #111827;
        }

        .customer-company {
          color: #667085;
          font-size: 12px;
          margin-top: 3px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 700;
        }

        .status-active {
          background: #dcfce7;
          color: #166534;
        }

        .status-prospect {
          background: #fef3c7;
          color: #92400e;
        }

        .status-inactive {
          background: #f1f5f9;
          color: #475569;
        }

        .table-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .small-button {
          border: 0;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .small-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .edit-button {
          background: #eef2ff;
          color: #3730a3;
        }

        .delete-button {
          background: #fee2e2;
          color: #b91c1c;
        }

        .empty-state,
        .loading-state {
          padding: 40px 20px;
          text-align: center;
          color: #667085;
        }

        .message {
          margin-bottom: 18px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #f1f5f9;
          color: #334155;
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal {
          width: min(1000px, 100%);
          max-height: 92vh;
          overflow-y: auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.25);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 22px;
          border-bottom: 1px solid #eef0f3;
          position: sticky;
          top: 0;
          background: white;
          z-index: 2;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .modal-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .close-button {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 50%;
          background: #f1f5f9;
          cursor: pointer;
          font-size: 18px;
        }

        .modal-body {
          padding: 22px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 13px;
          font-weight: 700;
          color: #344054;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }

        .form-textarea {
          min-height: 110px;
          resize: vertical;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 18px 22px;
          border-top: 1px solid #eef0f3;
          background: #fafafa;
          position: sticky;
          bottom: 0;
        }

        .history-section {
          margin-top: 28px;
          border-top: 1px solid #eef0f3;
          padding-top: 24px;
        }

        .history-section + .history-section {
          margin-top: 32px;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .history-header h3 {
          margin: 0;
          font-size: 17px;
        }

        .history-count {
          color: #667085;
          font-size: 13px;
        }

        .history-list {
          display: grid;
          gap: 12px;
        }

        .history-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 15px;
          background: #fff;
        }

        .history-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .history-service {
          font-weight: 700;
          color: #111827;
        }

        .history-date {
          color: #667085;
          font-size: 12px;
          margin-top: 4px;
        }

        .history-details {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .history-detail {
          background: #f8fafc;
          border-radius: 9px;
          padding: 10px;
        }

        .history-detail-label {
          color: #667085;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .history-detail-value {
          color: #172033;
          font-size: 13px;
          font-weight: 600;
          word-break: break-word;
        }

        .history-request {
          margin-top: 12px;
          color: #475467;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .history-open {
          margin-top: 12px;
          background: #eef2ff;
          color: #3730a3;
        }

        .history-empty {
          padding: 22px;
          text-align: center;
          border: 1px dashed #d0d5dd;
          border-radius: 12px;
          color: #667085;
          font-size: 14px;
        }

        .quote-history-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          background: #ffffff;
        }

        .quote-history-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .quote-number {
          color: #667085;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          margin-bottom: 4px;
        }

        .quote-title {
          color: #111827;
          font-size: 15px;
          font-weight: 800;
        }

        .quote-status {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .quote-status-draft {
          background: #f1f5f9;
          color: #475569;
        }

        .quote-status-sent {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .quote-status-viewed {
          background: #ede9fe;
          color: #6d28d9;
        }

        .quote-status-accepted {
          background: #dcfce7;
          color: #166534;
        }

        .quote-status-rejected {
          background: #fee2e2;
          color: #b91c1c;
        }

        .quote-status-expired {
          background: #ffedd5;
          color: #c2410c;
        }

        .quote-status-cancelled {
          background: #e2e8f0;
          color: #475569;
        }

        .quote-history-details {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .quote-history-detail {
          background: #f8fafc;
          border-radius: 9px;
          padding: 10px;
        }

        .quote-history-detail-label {
          color: #667085;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .quote-history-detail-value {
          color: #172033;
          font-size: 13px;
          font-weight: 700;
          word-break: break-word;
        }

        .quote-history-actions {
          margin-top: 14px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .quote-edit-button {
          background: #eef2ff;
          color: #3730a3;
        }

        .quote-print-button {
          background: #ecfdf3;
          color: #047857;
        }

        .quote-create-button {
          background: #111827;
          color: white;
        }

        .quote-create-button:hover {
          background: #000000;
        }

        /* PAYMENT HISTORY */

        .payment-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .payment-summary-card {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px;
        }

        .payment-summary-label {
          color: #667085;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .payment-summary-value {
          color: #111827;
          font-size: 16px;
          font-weight: 800;
          word-break: break-word;
        }

        .payment-history-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          background: #ffffff;
        }

        .payment-history-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .payment-number {
          color: #667085;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.03em;
          margin-bottom: 4px;
        }

        .payment-amount {
          color: #047857;
          font-size: 18px;
          font-weight: 900;
        }

        .payment-date {
          color: #667085;
          font-size: 12px;
          margin-top: 4px;
        }

        .payment-status {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .payment-status-paid {
          background: #dcfce7;
          color: #166534;
        }

        .payment-status-partially_paid {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .payment-status-unpaid {
          background: #ffedd5;
          color: #c2410c;
        }

        .payment-status-recorded {
          background: #f1f5f9;
          color: #475569;
        }

        .payment-history-details {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .payment-history-detail {
          background: #f8fafc;
          border-radius: 9px;
          padding: 10px;
        }

        .payment-history-detail-label {
          color: #667085;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .payment-history-detail-value {
          color: #172033;
          font-size: 13px;
          font-weight: 700;
          word-break: break-word;
        }

        .payment-receipt-note {
          margin-top: 12px;
          padding: 11px 12px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 9px;
          color: #475467;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .payment-history-actions {
          margin-top: 14px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .payment-receipt-button {
          background: #ecfdf3;
          color: #047857;
        }

        .payment-invoice-button {
          background: #eef2ff;
          color: #3730a3;
        }

        .payment-job-button {
          background: #fef3c7;
          color: #92400e;
        }

        .customer-summary {
          margin-bottom: 22px;
          padding: 15px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .customer-summary-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .customer-summary-name {
          font-weight: 800;
          color: #111827;
          font-size: 16px;
        }

        .customer-summary-company {
          margin-top: 3px;
          color: #667085;
          font-size: 13px;
        }

        .customer-summary-contact {
          margin-top: 8px;
          color: #475467;
          font-size: 13px;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .customers-table-wrap {
            overflow-x: auto;
          }

          .customers-table {
            min-width: 850px;
          }

          .history-details {
            grid-template-columns: 1fr;
          }

          .quote-history-details,
          .payment-history-details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .payment-summary-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .customers-admin {
            padding: 16px;
          }

          .customers-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .customers-header .primary-button {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .stat-card {
            padding: 14px;
          }

          .stat-value {
            font-size: 23px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full-width {
            grid-column: auto;
          }

          .modal-overlay {
            padding: 10px;
          }

          .modal {
            max-height: 96vh;
          }

          .modal-body {
            padding: 16px;
          }

          .modal-footer {
            padding: 14px 16px;
          }

          .modal-header {
            align-items: flex-start;
          }

          .modal-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .customer-summary-top,
          .quote-history-top,
          .payment-history-top {
            flex-direction: column;
          }

          .quote-history-details,
          .payment-history-details {
            grid-template-columns: 1fr;
          }

          .quote-history-actions,
          .payment-history-actions {
            flex-direction: column;
          }

          .quote-history-actions .small-button,
          .payment-history-actions .small-button,
          .customer-summary-top .small-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="customers-header">
        <div>
          <h1>Customers</h1>

          <p>
            Manage customers, prospects, service requests and
            quotations.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddCustomer}
        >
          + Add Customer
        </button>
      </div>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            Total Customers
          </div>

          <div className="stat-value">
            {stats.total}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Active
          </div>

          <div className="stat-value">
            {stats.active}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Prospects
          </div>

          <div className="stat-value">
            {stats.prospects}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Inactive
          </div>

          <div className="stat-value">
            {stats.inactive}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Search by name, company, email, phone or WhatsApp..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="all">
            All Statuses
          </option>

          {statuses.map((status) => (
            <option
              key={status}
              value={status}
            >
              {formatStatus(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="customers-table-wrap">
        {loading ? (
          <div className="loading-state">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            {customers.length === 0
              ? "No customers have been added yet."
              : "No customers match your search or filter."}
          </div>
        ) : (
          <table className="customers-table">
            <thead>
              <tr>
                <th>
                  Customer
                </th>

                <th>
                  Contact
                </th>

                <th>
                  Status
                </th>

                <th>
                  Created
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map(
                (customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-name">
                        {customer.full_name}
                      </div>

                      {customer.company_name && (
                        <div className="customer-company">
                          {customer.company_name}
                        </div>
                      )}
                    </td>

                    <td>
                      <div>
                        {customer.email ||
                          "—"}
                      </div>

                      {customer.phone && (
                        <div>
                          {customer.phone}
                        </div>
                      )}

                      {customer.whatsapp && (
                        <div>
                          {customer.whatsapp}
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${customer.status}`}
                      >
                        {formatStatus(
                          customer.status
                        )}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        customer.created_at
                      )}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="small-button edit-button"
                          onClick={() =>
                            openEditCustomer(
                              customer
                            )
                          }
                        >
                          View / Edit
                        </button>

                        <button
                          type="button"
                          className="small-button delete-button"
                          onClick={() =>
                            deleteCustomer(
                              customer
                            )
                          }
                          disabled={deleting}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {selectedCustomer
                    ? "Customer Details"
                    : "Add Customer"}
                </h2>
              </div>

              {selectedCustomer ? (
                <div className="modal-header-actions">
                  <button
                    type="button"
                    className="small-button quote-create-button"
                    onClick={() =>
                      createQuoteForCustomer(
                        selectedCustomer
                      )
                    }
                  >
                    + New Quote
                  </button>

                  <button
                    type="button"
                    className="close-button"
                    onClick={closeForm}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="close-button"
                  onClick={closeForm}
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>

            <form onSubmit={saveCustomer}>
              <div className="modal-body">

                {selectedCustomer && (
                  <div className="customer-summary">
                    <div className="customer-summary-top">
                      <div>
                        <div className="customer-summary-name">
                          {selectedCustomer.full_name}
                        </div>

                        {selectedCustomer.company_name && (
                          <div className="customer-summary-company">
                            {selectedCustomer.company_name}
                          </div>
                        )}

                        <div className="customer-summary-contact">
                          {selectedCustomer.email ||
                            "No email"}
                          {" • "}
                          {selectedCustomer.phone ||
                            "No phone"}
                          {selectedCustomer.whatsapp
                            ? ` • ${selectedCustomer.whatsapp}`
                            : ""}
                        </div>
                      </div>

                      <span
                        className={`status-badge status-${selectedCustomer.status}`}
                      >
                        {formatStatus(
                          selectedCustomer.status
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      Full Name *
                    </label>

                    <input
                      className="form-input"
                      value={form.full_name}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            full_name:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="Customer full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Company Name
                    </label>

                    <input
                      className="form-input"
                      value={form.company_name}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            company_name:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="Company or business name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Email
                    </label>

                    <input
                      type="email"
                      className="form-input"
                      value={form.email}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            email:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Phone
                    </label>

                    <input
                      className="form-input"
                      value={form.phone}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            phone:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      WhatsApp
                    </label>

                    <input
                      className="form-input"
                      value={form.whatsapp}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            whatsapp:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="WhatsApp number"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Status
                    </label>

                    <select
                      className="form-input"
                      value={form.status}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            status:
                              event.target.value,
                          })
                        )
                      }
                    >
                      {statuses.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {formatStatus(
                              status
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      Notes
                    </label>

                    <textarea
                      className="form-textarea"
                      value={form.notes}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            notes:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="Internal notes about this customer..."
                    />
                  </div>
                </div>

                {selectedCustomer && (
                  <>
                    {/* SERVICE REQUEST HISTORY */}

                    <div className="history-section">
                      <div className="history-header">
                        <h3>
                          Service Request History
                        </h3>

                        <span className="history-count">
                          {customerRequests.length}{" "}
                          {customerRequests.length ===
                          1
                            ? "request"
                            : "requests"}
                        </span>
                      </div>

                      {requestsLoading ? (
                        <div className="history-empty">
                          Loading request history...
                        </div>
                      ) : customerRequests.length ===
                        0 ? (
                        <div className="history-empty">
                          No service requests are linked
                          to this customer yet.
                        </div>
                      ) : (
                        <div className="history-list">
                          {customerRequests.map(
                            (request) => (
                              <div
                                className="history-card"
                                key={request.id}
                              >
                                <div className="history-card-top">
                                  <div>
                                    <div className="history-service">
                                      {request.service_name ||
                                        request.service ||
                                        "Service Request"}
                                    </div>

                                    <div className="history-date">
                                      {formatDate(
                                        request.created_at
                                      )}
                                    </div>
                                  </div>

                                  <span
                                    className={`status-badge status-${request.status}`}
                                  >
                                    {formatStatus(
                                      request.status
                                    )}
                                  </span>
                                </div>

                                <div className="history-details">
                                  <div className="history-detail">
                                    <div className="history-detail-label">
                                      Budget
                                    </div>

                                    <div className="history-detail-value">
                                      {request.budget ||
                                        "—"}
                                    </div>
                                  </div>

                                  <div className="history-detail">
                                    <div className="history-detail-label">
                                      Quote
                                    </div>

                                    <div className="history-detail-value">
                                      {formatAmount(
                                        request.quote_amount
                                      )}
                                    </div>
                                  </div>

                                  <div className="history-detail">
                                    <div className="history-detail-label">
                                      Timeline
                                    </div>

                                    <div className="history-detail-value">
                                      {request.preferred_timeline ||
                                        "—"}
                                    </div>
                                  </div>
                                </div>

                                {request.request_details && (
                                  <div className="history-request">
                                    {request.request_details}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  className="small-button history-open"
                                  onClick={() =>
                                    openRequest(
                                      request
                                    )
                                  }
                                >
                                  Open Service Request
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* QUOTE HISTORY */}

                    <div className="history-section">
                      <div className="history-header">
                        <h3>
                          Quote History
                        </h3>

                        <span className="history-count">
                          {customerQuotes.length}{" "}
                          {customerQuotes.length ===
                          1
                            ? "quote"
                            : "quotes"}
                        </span>
                      </div>

                      {quotesLoading ? (
                        <div className="history-empty">
                          Loading quote history...
                        </div>
                      ) : customerQuotes.length ===
                        0 ? (
                        <div className="history-empty">
                          <div>
                            No quotes have been created
                            for this customer yet.
                          </div>

                          <button
                            type="button"
                            className="small-button quote-create-button"
                            style={{
                              marginTop: "12px",
                            }}
                            onClick={() =>
                              createQuoteForCustomer(
                                selectedCustomer
                              )
                            }
                          >
                            + Create First Quote
                          </button>
                        </div>
                      ) : (
                        <div className="history-list">
                          {customerQuotes.map(
                            (quote) => {
                              const effectiveStatus =
                                getEffectiveQuoteStatus(
                                  quote
                                );

                              return (
                                <div
                                  className="quote-history-card"
                                  key={quote.id}
                                >
                                  <div className="quote-history-top">
                                    <div>
                                      <div className="quote-number">
                                        {quote.quote_number ||
                                          "Quote"}
                                      </div>

                                      <div className="quote-title">
                                        {quote.title ||
                                          "Service Quote"}
                                      </div>
                                    </div>

                                    <span
                                      className={`quote-status ${getQuoteStatusClass(
                                        effectiveStatus
                                      )}`}
                                    >
                                      {formatStatus(
                                        effectiveStatus
                                      )}
                                    </span>
                                  </div>

                                  <div className="quote-history-details">
                                    <div className="quote-history-detail">
                                      <div className="quote-history-detail-label">
                                        Total
                                      </div>

                                      <div className="quote-history-detail-value">
                                        {formatAmount(
                                          quote.total,
                                          quote.currency ||
                                            "NGN"
                                        )}
                                      </div>
                                    </div>

                                    <div className="quote-history-detail">
                                      <div className="quote-history-detail-label">
                                        Issue Date
                                      </div>

                                      <div className="quote-history-detail-value">
                                        {formatShortDate(
                                          quote.issue_date
                                        )}
                                      </div>
                                    </div>

                                    <div className="quote-history-detail">
                                      <div className="quote-history-detail-label">
                                        Valid Until
                                      </div>

                                      <div className="quote-history-detail-value">
                                        {formatShortDate(
                                          quote.expiry_date
                                        )}
                                      </div>
                                    </div>

                                    <div className="quote-history-detail">
                                      <div className="quote-history-detail-label">
                                        Currency
                                      </div>

                                      <div className="quote-history-detail-value">
                                        {quote.currency ||
                                          "NGN"}
                                      </div>
                                    </div>
                                  </div>

                                  {quote.description && (
                                    <div className="history-request">
                                      {quote.description}
                                    </div>
                                  )}

                                  <div className="quote-history-actions">
                                    <button
                                      type="button"
                                      className="small-button quote-edit-button"
                                      onClick={() =>
                                        editQuote(
                                          quote
                                        )
                                      }
                                    >
                                      Edit Quote
                                    </button>

                                    <button
                                      type="button"
                                      className="small-button quote-print-button"
                                      onClick={() =>
                                        printQuote(
                                          quote
                                        )
                                      }
                                    >
                                      Print / PDF
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>

                    {/* PAYMENT HISTORY */}

                    <div className="history-section">
                      <div className="history-header">
                        <h3>
                          Payment History
                        </h3>

                        <span className="history-count">
                          {paymentSummary.count}{" "}
                          {paymentSummary.count ===
                          1
                            ? "payment"
                            : "payments"}
                        </span>
                      </div>

                      {paymentsLoading ? (
                        <div className="history-empty">
                          Loading payment history...
                        </div>
                      ) : (
                        <>
                          <div className="payment-summary-grid">
                            <div className="payment-summary-card">
                              <div className="payment-summary-label">
                                Total Received
                              </div>

                              <div className="payment-summary-value">
                                {formatAmount(
                                  paymentSummary.totalPaid
                                )}
                              </div>
                            </div>

                            <div className="payment-summary-card">
                              <div className="payment-summary-label">
                                Outstanding
                              </div>

                              <div className="payment-summary-value">
                                {formatAmount(
                                  paymentSummary.outstanding
                                )}
                              </div>
                            </div>

                            <div className="payment-summary-card">
                              <div className="payment-summary-label">
                                Payment Records
                              </div>

                              <div className="payment-summary-value">
                                {paymentSummary.count}
                              </div>
                            </div>
                          </div>

                          {customerPayments.length ===
                          0 ? (
                            <div className="history-empty">
                              No payments have been recorded
                              for this customer yet.
                            </div>
                          ) : (
                            <div className="history-list">
                              {customerPayments.map(
                                (payment) => {
                                  const invoice =
                                    getPaymentInvoice(
                                      payment
                                    );

                                  const job =
                                    getPaymentJob(
                                      payment
                                    );

                                  const paymentStatus =
                                    getPaymentStatus(
                                      payment,
                                      customerInvoices
                                    );

                                  return (
                                    <div
                                      className="payment-history-card"
                                      key={payment.id}
                                    >
                                      <div className="payment-history-top">
                                        <div>
                                          <div className="payment-number">
                                            {payment.payment_number ||
                                              "Payment"}
                                          </div>

                                          <div className="payment-amount">
                                            {formatAmount(
                                              payment.amount,
                                              payment.currency ||
                                                invoice?.currency ||
                                                "NGN"
                                            )}
                                          </div>

                                          <div className="payment-date">
                                            {formatDate(
                                              payment.payment_date
                                            )}
                                          </div>
                                        </div>

                                        <span
                                          className={`payment-status ${getPaymentStatusClass(
                                            paymentStatus
                                          )}`}
                                        >
                                          {formatStatus(
                                            paymentStatus
                                          )}
                                        </span>
                                      </div>

                                      <div className="payment-history-details">
                                        <div className="payment-history-detail">
                                          <div className="payment-history-detail-label">
                                            Method
                                          </div>

                                          <div className="payment-history-detail-value">
                                            {payment.payment_method ||
                                              "—"}
                                          </div>
                                        </div>

                                        <div className="payment-history-detail">
                                          <div className="payment-history-detail-label">
                                            Reference
                                          </div>

                                          <div className="payment-history-detail-value">
                                            {payment.payment_reference ||
                                              "—"}
                                          </div>
                                        </div>

                                        <div className="payment-history-detail">
                                          <div className="payment-history-detail-label">
                                            Invoice
                                          </div>

                                          <div className="payment-history-detail-value">
                                            {invoice?.invoice_number ||
                                              "—"}
                                          </div>
                                        </div>

                                        <div className="payment-history-detail">
                                          <div className="payment-history-detail-label">
                                            Job
                                          </div>

                                          <div className="payment-history-detail-value">
                                            {job?.job_number ||
                                              "—"}
                                          </div>
                                        </div>
                                      </div>

                                      {payment.receipt_note && (
                                        <div className="payment-receipt-note">
                                          <strong>
                                            Receipt Note:
                                          </strong>{" "}
                                          {payment.receipt_note}
                                        </div>
                                      )}

                                      <div className="payment-history-actions">
                                        <button
                                          type="button"
                                          className="small-button payment-receipt-button"
                                          onClick={() =>
                                            printReceipt(
                                              payment
                                            )
                                          }
                                        >
                                          Receipt / PDF
                                        </button>

                                        {invoice && (
                                          <button
                                            type="button"
                                            className="small-button payment-invoice-button"
                                            onClick={() =>
                                              openInvoice(
                                                invoice
                                              )
                                            }
                                          >
                                            Open Invoice
                                          </button>
                                        )}

                                        {job && (
                                          <button
                                            type="button"
                                            className="small-button payment-job-button"
                                            onClick={() =>
                                              openJob(
                                                job
                                              )
                                            }
                                          >
                                            Open Job
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                >
                  Close
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : selectedCustomer
                    ? "Save Changes"
                    : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}