import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const statuses = [
  "new",
  "contacted",
  "quoted",
  "accepted",
  "in_progress",
  "completed",
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

function formatMoney(amount, currency = "NGN") {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }

  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return String(amount);
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function getQuoteStatus(quote) {
  if (
    quote?.expiry_date &&
    !["accepted", "rejected", "cancelled", "expired"].includes(
      quote.status
    ) &&
    new Date(quote.expiry_date).getTime() < Date.now()
  ) {
    return "expired";
  }

  return quote?.status || "draft";
}

function formatQuoteStatus(status) {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [relatedQuotes, setRelatedQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Unable to load service requests.");
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  }

  async function loadCustomers() {
    setCustomersLoading(true);

    const { data, error } = await supabase
      .from("crm_customers")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Unable to load CRM customers.");
    } else {
      setCustomers(data || []);
    }

    setCustomersLoading(false);
  }

  async function loadRelatedQuotes(requestId) {
    if (!requestId) {
      setRelatedQuotes([]);
      return;
    }

    setQuotesLoading(true);

    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("service_request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setRelatedQuotes([]);
      setMessage("Unable to load related quotes.");
    } else {
      setRelatedQuotes(data || []);
    }

    setQuotesLoading(false);
  }

  useEffect(() => {
    loadRequests();
    loadCustomers();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("request");

    if (!requestId || requests.length === 0) {
      return;
    }

    const request = requests.find(
      (item) => String(item.id) === String(requestId)
    );

    if (request) {
      openRequest(request);
    }
  }, [requests]);

  function openRequest(request) {
    setSelected({
      ...request,
      status: request.status || "new",
      quote_amount: request.quote_amount || "",
      admin_notes: request.admin_notes || "",
      customer_id: request.customer_id || "",
    });

    setMessage("");
    loadRelatedQuotes(request.id);
  }

  function createQuoteFromRequest() {
    if (!selected?.id) return;

    const quoteUrl =
      `/admin/quotes?request=${encodeURIComponent(selected.id)}`;

    window.open(
      quoteUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function editQuote(quote) {
    if (!quote?.id) return;

    window.open(
      `/admin/quotes?edit=${encodeURIComponent(quote.id)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function printQuote(quote) {
    if (!quote?.id) return;

    window.open(
      `/admin/quotes/print?id=${encodeURIComponent(quote.id)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function saveRequest() {
    if (!selected) return;

    setSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("service_requests")
      .update({
        status: selected.status,
        quote_amount:
          selected.quote_amount === ""
            ? null
            : Number(selected.quote_amount),
        admin_notes: selected.admin_notes || null,
        customer_id: selected.customer_id || null,
      })
      .eq("id", selected.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      setMessage(error.message);
    } else {
      setSelected(data);

      setRequests((current) =>
        current.map((request) =>
          request.id === data.id ? data : request
        )
      );

      await loadRelatedQuotes(data.id);

      setMessage("Request updated successfully.");
    }

    setSaving(false);
  }

  async function deleteRequest() {
    if (!selected) return;

    const confirmed = window.confirm(
      "Delete this service request permanently?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("service_requests")
      .delete()
      .eq("id", selected.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setRequests((current) =>
      current.filter((request) => request.id !== selected.id)
    );

    setRelatedQuotes([]);
    setSelected(null);
    setMessage("Request deleted.");

    window.history.replaceState(
      {},
      "",
      "/admin/requests"
    );
  }

  function closeRequest() {
    setSelected(null);
    setRelatedQuotes([]);

    window.history.replaceState(
      {},
      "",
      "/admin/requests"
    );
  }

  return (
    <div className="service-requests-admin">
      <style>{`
        .service-requests-admin {
          padding: 30px;
          color: #111827;
        }

        .requests-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .requests-header h1 {
          margin: 0;
          font-size: 28px;
        }

        .requests-header p {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .requests-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 420px;
          gap: 20px;
        }

        .requests-list,
        .request-detail {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: white;
        }

        .requests-list {
          overflow: hidden;
        }

        .request-row {
          width: 100%;
          display: grid;
          grid-template-columns: 1.5fr 1fr 120px 150px;
          gap: 15px;
          align-items: center;
          padding: 17px 18px;
          border: none;
          border-bottom: 1px solid #f0f0f0;
          background: white;
          color: #111827;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
        }

        .request-row:hover {
          background: #f8fafc;
        }

        .request-row:last-child {
          border-bottom: none;
        }

        .request-customer {
          font-weight: 800;
          font-size: 14px;
        }

        .request-email,
        .request-service,
        .request-date {
          color: #6b7280;
          font-size: 12px;
        }

        .request-status {
          display: inline-flex;
          width: fit-content;
          padding: 5px 9px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #374151;
          font-size: 11px;
          font-weight: 800;
        }

        .request-linked-customer {
          margin-top: 4px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 700;
        }

        .request-detail {
          padding: 24px;
          min-height: 500px;
        }

        .request-detail-empty {
          display: grid;
          place-items: center;
          min-height: 450px;
          color: #9ca3af;
          text-align: center;
          font-size: 14px;
        }

        .detail-top {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 22px;
        }

        .detail-top h2 {
          margin: 0;
          font-size: 21px;
        }

        .detail-date {
          margin-top: 5px;
          color: #9ca3af;
          font-size: 11px;
        }

        .detail-top-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .detail-close {
          border: none;
          background: #f3f4f6;
          border-radius: 7px;
          padding: 7px 10px;
          cursor: pointer;
        }

        .create-quote-button {
          border: none;
          background: #111827;
          color: white;
          border-radius: 7px;
          padding: 9px 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
        }

        .create-quote-button:hover {
          background: #000;
        }

        .detail-section {
          margin-bottom: 22px;
        }

        .detail-label {
          margin-bottom: 7px;
          color: #6b7280;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .8px;
          text-transform: uppercase;
        }

        .detail-value {
          color: #374151;
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-line;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .detail-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .detail-field label {
          color: #374151;
          font-size: 12px;
          font-weight: 800;
        }

        .detail-field select,
        .detail-field input,
        .detail-field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 11px;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          background: white;
          font-family: inherit;
          font-size: 13px;
        }

        .detail-field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .customer-link-field {
          margin-bottom: 20px;
        }

        .customer-link-help {
          color: #9ca3af;
          font-size: 11px;
          line-height: 1.5;
        }

        .customer-status-note {
          margin-top: 6px;
          color: #64748b;
          font-size: 11px;
        }

        /* RELATED QUOTES */

        .related-quotes {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .related-quotes-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .related-quotes-title {
          margin: 0;
          font-size: 14px;
          font-weight: 850;
          color: #111827;
        }

        .related-quotes-subtitle {
          margin: 4px 0 0;
          color: #9ca3af;
          font-size: 11px;
          line-height: 1.5;
        }

        .related-quotes-count {
          min-width: 24px;
          height: 24px;
          display: inline-grid;
          place-items: center;
          padding: 0 7px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #374151;
          font-size: 11px;
          font-weight: 850;
        }

        .quote-loading,
        .quote-empty {
          padding: 14px;
          border: 1px solid #f0f0f0;
          border-radius: 8px;
          background: #fafafa;
          color: #9ca3af;
          font-size: 11px;
          text-align: center;
        }

        .related-quote-card {
          padding: 13px;
          margin-bottom: 9px;
          border: 1px solid #e5e7eb;
          border-radius: 9px;
          background: #fff;
        }

        .related-quote-card:last-child {
          margin-bottom: 0;
        }

        .related-quote-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .related-quote-number {
          color: #111827;
          font-size: 12px;
          font-weight: 850;
        }

        .related-quote-title {
          margin-top: 3px;
          color: #6b7280;
          font-size: 11px;
        }

        .related-quote-status {
          display: inline-flex;
          width: fit-content;
          padding: 4px 7px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #374151;
          font-size: 9px;
          font-weight: 850;
          white-space: nowrap;
        }

        .related-quote-info {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          margin-top: 11px;
          color: #64748b;
          font-size: 10px;
        }

        .related-quote-total {
          color: #111827;
          font-size: 12px;
          font-weight: 850;
        }

        .related-quote-actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .quote-action {
          border: 1px solid #e5e7eb;
          background: white;
          color: #374151;
          border-radius: 6px;
          padding: 7px 9px;
          cursor: pointer;
          font-family: inherit;
          font-size: 10px;
          font-weight: 800;
        }

        .quote-action:hover {
          background: #f8fafc;
        }

        .quote-action.primary {
          background: #111827;
          border-color: #111827;
          color: white;
        }

        .quote-action.primary:hover {
          background: #000;
        }

        .detail-actions {
          display: flex;
          gap: 9px;
          margin-top: 22px;
        }

        .detail-save,
        .detail-delete {
          min-height: 40px;
          padding: 0 14px;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
        }

        .detail-save {
          background: #111827;
          color: white;
        }

        .detail-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .detail-delete {
          background: #fee2e2;
          color: #b91c1c;
        }

        .detail-message {
          margin-top: 12px;
          color: #15803d;
          font-size: 12px;
        }

        .requests-empty {
          padding: 60px 20px;
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
        }

        @media (max-width: 1050px) {
          .requests-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .service-requests-admin {
            padding: 20px;
          }

          .request-row {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .request-date {
            display: none;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .detail-top-actions {
            flex-direction: column;
            align-items: flex-end;
          }

          .related-quote-top {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="requests-header">
        <div>
          <h1>Service Requests</h1>
          <p>
            View and manage requests submitted by customers.
          </p>
        </div>
      </div>

      <div className="requests-layout">
        <div className="requests-list">
          {loading ? (
            <div className="requests-empty">
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="requests-empty">
              No service requests yet.
            </div>
          ) : (
            requests.map((request) => {
              const linkedCustomer = customers.find(
                (customer) =>
                  customer.id === request.customer_id
              );

              return (
                <button
                  key={request.id}
                  className="request-row"
                  onClick={() => openRequest(request)}
                >
                  <div>
                    <div className="request-customer">
                      {request.customer_name}
                    </div>

                    <div className="request-email">
                      {request.email ||
                        request.phone ||
                        "No contact supplied"}
                    </div>

                    {linkedCustomer && (
                      <div className="request-linked-customer">
                        CRM: {linkedCustomer.full_name}
                      </div>
                    )}
                  </div>

                  <div className="request-service">
                    {request.service_name ||
                      "General Request"}
                  </div>

                  <div>
                    <span className="request-status">
                      {formatStatus(request.status)}
                    </span>
                  </div>

                  <div className="request-date">
                    {formatDate(request.created_at)}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="request-detail">
          {!selected ? (
            <div className="request-detail-empty">
              Select a request to view its details.
            </div>
          ) : (
            <>
              <div className="detail-top">
                <div>
                  <h2>{selected.customer_name}</h2>

                  <div className="detail-date">
                    Submitted {formatDate(selected.created_at)}
                  </div>
                </div>

                <div className="detail-top-actions">
                  <button
                    className="create-quote-button"
                    onClick={createQuoteFromRequest}
                  >
                    + Create Quote
                  </button>

                  <button
                    className="detail-close"
                    onClick={closeRequest}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-label">
                  CRM Customer
                </div>

                <div className="detail-field">
                  <select
                    value={selected.customer_id || ""}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        customer_id: event.target.value,
                      }))
                    }
                    disabled={customersLoading}
                  >
                    <option value="">
                      {customersLoading
                        ? "Loading customers..."
                        : "Not linked to a CRM customer"}
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.full_name}
                        {customer.company_name
                          ? ` — ${customer.company_name}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  <div className="customer-link-help">
                    Link this request to an existing CRM
                    customer. This does not change the
                    customer's original request information.
                  </div>

                  {selected.customer_id && (
                    <div className="customer-status-note">
                      CRM customer selected. Click
                      "Save Changes" to permanently link
                      this request.
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-label">
                  Contact
                </div>

                <div className="detail-value">
                  {selected.email || "No email"}
                  {"\n"}
                  {selected.phone || "No phone"}
                  {"\n"}
                  {selected.whatsapp
                    ? `WhatsApp: ${selected.whatsapp}`
                    : ""}
                  {selected.company_name
                    ? `\nBusiness: ${selected.company_name}`
                    : ""}
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-label">
                  Service
                </div>

                <div className="detail-value">
                  {selected.service_name ||
                    "General Request"}
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-label">
                  Request
                </div>

                <div className="detail-value">
                  {selected.request_details}
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-grid">
                  <div>
                    <div className="detail-label">
                      Budget
                    </div>

                    <div className="detail-value">
                      {selected.budget ||
                        "Not provided"}
                    </div>
                  </div>

                  <div>
                    <div className="detail-label">
                      Timeline
                    </div>

                    <div className="detail-value">
                      {selected.preferred_timeline ||
                        "Not provided"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-field">
                  <label>Status</label>

                  <select
                    value={selected.status}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
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

                <div className="detail-field">
                  <label>Quote Amount</label>

                  <input
                    type="number"
                    value={selected.quote_amount}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        quote_amount:
                          event.target.value,
                      }))
                    }
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>

              <div
                className="detail-field"
                style={{ marginTop: 15 }}
              >
                <label>Admin Notes</label>

                <textarea
                  value={selected.admin_notes}
                  onChange={(event) =>
                    setSelected((current) => ({
                      ...current,
                      admin_notes: event.target.value,
                    }))
                  }
                  placeholder="Add private notes about this request..."
                />
              </div>

              {/* RELATED QUOTES */}

              <div className="related-quotes">
                <div className="related-quotes-header">
                  <div>
                    <h3 className="related-quotes-title">
                      Related Quotes
                    </h3>

                    <p className="related-quotes-subtitle">
                      Quotes created for this service request.
                    </p>
                  </div>

                  <span className="related-quotes-count">
                    {relatedQuotes.length}
                  </span>
                </div>

                {quotesLoading ? (
                  <div className="quote-loading">
                    Loading quotes...
                  </div>
                ) : relatedQuotes.length === 0 ? (
                  <div className="quote-empty">
                    No quote has been created for this request yet.
                  </div>
                ) : (
                  relatedQuotes.map((quote) => {
                    const effectiveStatus =
                      getQuoteStatus(quote);

                    return (
                      <div
                        key={quote.id}
                        className="related-quote-card"
                      >
                        <div className="related-quote-top">
                          <div>
                            <div className="related-quote-number">
                              {quote.quote_number ||
                                "Quote"}
                            </div>

                            <div className="related-quote-title">
                              {quote.title ||
                                "Service Quote"}
                            </div>
                          </div>

                          <span className="related-quote-status">
                            {formatQuoteStatus(
                              effectiveStatus
                            )}
                          </span>
                        </div>

                        <div className="related-quote-info">
                          <span className="related-quote-total">
                            {formatMoney(
                              quote.total,
                              quote.currency
                            )}
                          </span>

                          <span>
                            Issued{" "}
                            {formatDate(
                              quote.issue_date
                            )}
                          </span>

                          <span>
                            Valid until{" "}
                            {quote.expiry_date
                              ? formatDate(
                                  quote.expiry_date
                                )
                              : "No expiry"}
                          </span>
                        </div>

                        <div className="related-quote-actions">
                          <button
                            type="button"
                            className="quote-action primary"
                            onClick={() =>
                              editQuote(quote)
                            }
                          >
                            Edit Quote
                          </button>

                          <button
                            type="button"
                            className="quote-action"
                            onClick={() =>
                              printQuote(quote)
                            }
                          >
                            Print / PDF
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="detail-actions">
                <button
                  className="detail-save"
                  onClick={saveRequest}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  className="detail-delete"
                  onClick={deleteRequest}
                >
                  Delete
                </button>
              </div>

              {message && (
                <div className="detail-message">
                  {message}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}