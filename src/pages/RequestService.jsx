import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function RequestService() {
  const [searchParams] = useSearchParams();

  const [services, setServices] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customer_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    company_name: "",
    service_id: "",
    service_name: "",
    budget: "",
    preferred_timeline: "",
    request_details: "",
    source: "",
  });

  useEffect(() => {
    async function loadServices() {
      const { data, error: servicesError } = await supabase
        .from("services")
        .select("id, title, slug")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (servicesError) {
        console.error("Services loading error:", servicesError);
        return;
      }

      if (data) {
        setServices(data);

        const requestedService = searchParams.get("service");

        if (requestedService) {
          const match = data.find(
            (service) =>
              service.title.toLowerCase() ===
              requestedService.toLowerCase()
          );

          if (match) {
            setForm((current) => ({
              ...current,
              service_id: match.id,
              service_name: match.title,
            }));
          }
        }
      }
    }

    loadServices();
  }, [searchParams]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleServiceChange(event) {
    const selectedId = event.target.value;

    const selectedService = services.find(
      (service) => service.id === selectedId
    );

    setForm((current) => ({
      ...current,
      service_id: selectedId,
      service_name: selectedService?.title || "",
    }));
  }

  async function submitRequest(event) {
    event.preventDefault();

    setError("");

    if (!form.customer_name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!form.request_details.trim()) {
      setError("Please tell us what you need help with.");
      return;
    }

    setSubmitting(true);

    try {
      /*
       * The service_requests table contains some legacy required
       * fields as well as the newer CRM/request fields.
       *
       * Legacy required fields:
       * - name
       * - phone
       * - service
       * - description
       *
       * Newer fields:
       * - customer_name
       * - service_id
       * - service_name
       * - request_details
       * - etc.
       *
       * We send both versions so the existing database structure,
       * admin Service Requests page and CRM system continue working
       * together without changing the page design.
       */
      const requestPayload = {
        // Legacy required fields
        name: form.customer_name.trim(),
        phone: form.phone.trim(),
        service: form.service_name?.trim() || "General Service",
        description: form.request_details.trim(),

        // Current CRM/request fields
        customer_name: form.customer_name.trim(),
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        company_name: form.company_name.trim() || null,

        service_id: form.service_id || null,
        service_name: form.service_name?.trim() || null,

        budget: form.budget.trim() || null,
        preferred_timeline:
          form.preferred_timeline.trim() || null,

        request_details: form.request_details.trim(),

        source: form.source || null,
      };

      console.log(
        "Submitting service request:",
        requestPayload
      );

      const { data, error: submitError } = await supabase
        .from("service_requests")
        .insert(requestPayload)
        .select()
        .single();

      if (submitError) {
        console.error(
          "Service request error:",
          submitError
        );
        console.error(
          "Error message:",
          submitError?.message
        );
        console.error(
          "Error details:",
          submitError?.details
        );
        console.error(
          "Error hint:",
          submitError?.hint
        );
        console.error(
          "Error code:",
          submitError?.code
        );

        throw submitError;
      }

      console.log(
        "Service request submitted successfully:",
        data
      );

      setSubmitted(true);

      setForm({
        customer_name: "",
        email: "",
        phone: "",
        whatsapp: "",
        company_name: "",
        service_id: "",
        service_name: "",
        budget: "",
        preferred_timeline: "",
        request_details: "",
        source: "",
      });
    } catch (submitError) {
      console.error(
        "Full service request error:",
        submitError
      );

      const errorMessage =
        submitError?.message ||
        submitError?.details ||
        submitError?.hint ||
        "Unknown Supabase error.";

      setError(
        `We could not submit your request. ${errorMessage}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="request-success">
        <style>{`
          .request-success {
            min-height: 70vh;
            display: grid;
            place-items: center;
            padding: 70px 20px;
            background: #f8fafc;
          }

          .request-success-box {
            max-width: 650px;
            padding: 45px;
            border: 1px solid #e5e7eb;
            border-radius: 20px;
            background: white;
            text-align: center;
            box-shadow: 0 20px 50px rgba(15,23,42,.08);
          }

          .request-success-icon {
            display: grid;
            place-items: center;
            width: 65px;
            height: 65px;
            margin: 0 auto 22px;
            border-radius: 50%;
            background: #dcfce7;
            color: #15803d;
            font-size: 28px;
            font-weight: 900;
          }

          .request-success h1 {
            margin: 0;
            color: #111827;
            font-size: 35px;
          }

          .request-success p {
            margin: 15px auto 27px;
            color: #6b7280;
            line-height: 1.8;
          }

          .request-success a {
            display: inline-flex;
            min-height: 49px;
            align-items: center;
            padding: 0 20px;
            border-radius: 8px;
            background: #111827;
            color: white;
            text-decoration: none;
            font-weight: 800;
          }
        `}</style>

        <div className="request-success-box">
          <div className="request-success-icon">✓</div>

          <h1>Request Received</h1>

          <p>
            Thank you for contacting ValueDam Network. We have
            received your request and will review the details and
            contact you using the information you provided.
          </p>

          <Link to="/">Back to Homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="request-page">
      <style>{`
        .request-page {
          background: #f8fafc;
          padding: 70px 0 90px;
          color: #111827;
        }

        .request-container {
          width: min(1050px, calc(100% - 40px));
          margin: 0 auto;
        }

        .request-header {
          max-width: 720px;
          margin-bottom: 35px;
        }

        .request-kicker {
          margin-bottom: 12px;
          color: #16a34a;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 1.6px;
          text-transform: uppercase;
        }

        .request-header h1 {
          margin: 0;
          font-size: clamp(40px, 6vw, 58px);
          line-height: 1;
          letter-spacing: -2px;
        }

        .request-header p {
          margin: 18px 0 0;
          color: #6b7280;
          font-size: 17px;
          line-height: 1.75;
        }

        .request-card {
          padding: 35px;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          background: white;
          box-shadow: 0 20px 50px rgba(15,23,42,.06);
        }

        .request-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .request-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .request-field-full {
          grid-column: 1 / -1;
        }

        .request-field label {
          color: #374151;
          font-size: 13px;
          font-weight: 800;
        }

        .request-field input,
        .request-field select,
        .request-field textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          padding: 13px 14px;
          background: white;
          color: #111827;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }

        .request-field input:focus,
        .request-field select:focus,
        .request-field textarea:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22,163,74,.1);
        }

        .request-field textarea {
          min-height: 170px;
          resize: vertical;
        }

        .request-required {
          color: #dc2626;
        }

        .request-error {
          margin-bottom: 20px;
          padding: 13px 15px;
          border: 1px solid #fecaca;
          border-radius: 8px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
          line-height: 1.6;
          word-break: break-word;
        }

        .request-submit-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-top: 28px;
        }

        .request-note {
          max-width: 560px;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.6;
        }

        .request-submit {
          flex-shrink: 0;
          min-height: 51px;
          padding: 0 24px;
          border: none;
          border-radius: 8px;
          background: #111827;
          color: white;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 800;
        }

        .request-submit:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        @media (max-width: 700px) {
          .request-container {
            width: min(100% - 28px, 1050px);
          }

          .request-grid {
            grid-template-columns: 1fr;
          }

          .request-field-full {
            grid-column: auto;
          }

          .request-card {
            padding: 25px 20px;
          }

          .request-submit-row {
            display: block;
          }

          .request-submit {
            width: 100%;
            margin-top: 18px;
          }
        }
      `}</style>

      <div className="request-container">
        <div className="request-header">
          <div className="request-kicker">
            Request a Service
          </div>

          <h1>Tell us what you need.</h1>

          <p>
            Give us some details about the task, project or support
            you need. We'll review it and get back to you.
          </p>
        </div>

        <form
          className="request-card"
          onSubmit={submitRequest}
        >
          {error && (
            <div className="request-error">
              {error}
            </div>
          )}

          <div className="request-grid">
            <div className="request-field">
              <label>
                Your Name{" "}
                <span className="request-required">*</span>
              </label>

              <input
                name="customer_name"
                value={form.customer_name}
                onChange={updateField}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="request-field">
              <label>Email Address</label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
              />
            </div>

            <div className="request-field">
              <label>Phone Number</label>

              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                placeholder="Phone number"
              />
            </div>

            <div className="request-field">
              <label>WhatsApp Number</label>

              <input
                name="whatsapp"
                value={form.whatsapp}
                onChange={updateField}
                placeholder="WhatsApp number"
              />
            </div>

            <div className="request-field">
              <label>Business / Company</label>

              <input
                name="company_name"
                value={form.company_name}
                onChange={updateField}
                placeholder="Business name (optional)"
              />
            </div>

            <div className="request-field">
              <label>Service Needed</label>

              <select
                value={form.service_id}
                onChange={handleServiceChange}
              >
                <option value="">
                  Select a service
                </option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="request-field">
              <label>Estimated Budget</label>

              <input
                name="budget"
                value={form.budget}
                onChange={updateField}
                placeholder="e.g. ₦50,000"
              />
            </div>

            <div className="request-field">
              <label>Preferred Timeline</label>

              <input
                name="preferred_timeline"
                value={form.preferred_timeline}
                onChange={updateField}
                placeholder="e.g. Within 1 week"
              />
            </div>

            <div className="request-field request-field-full">
              <label>
                Tell Us What You Need{" "}
                <span className="request-required">*</span>
              </label>

              <textarea
                name="request_details"
                value={form.request_details}
                onChange={updateField}
                placeholder="Describe the task, project or problem you need help with..."
                required
              />
            </div>

            <div className="request-field">
              <label>How Did You Hear About Us?</label>

              <select
                name="source"
                value={form.source}
                onChange={updateField}
              >
                <option value="">
                  Select an option
                </option>

                <option value="Google">
                  Google
                </option>

                <option value="Facebook">
                  Facebook
                </option>

                <option value="Instagram">
                  Instagram
                </option>

                <option value="WhatsApp">
                  WhatsApp
                </option>

                <option value="Referral">
                  Referral
                </option>

                <option value="ValueDam Network">
                  ValueDam Network
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>
          </div>

          <div className="request-submit-row">
            <div className="request-note">
              Your information will only be used to review and
              respond to your service request.
            </div>

            <button
              type="submit"
              className="request-submit"
              disabled={submitting}
            >
              {submitting
                ? "Sending Request..."
                : "Submit Request →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}