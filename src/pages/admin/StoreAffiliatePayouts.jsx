
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  ClipboardCheck,
  ShieldCheck,
  Clock3,
  AlertCircle,
} from 'lucide-react';

export default function StoreAffiliatePayouts() {
  return (
    <div className="affiliate-payouts-page">
      <style>{`
        .affiliate-payouts-page {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          color: #172033;
          font-family: inherit;
        }

        .affiliate-payouts-page * {
          box-sizing: border-box;
        }

        .ap-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 22px;
          color: #5c6678;
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
        }

        .ap-back:hover {
          color: #111827;
        }

        .ap-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .ap-heading h2 {
          margin: 0;
          color: #111827;
          font-size: clamp(23px, 3vw, 30px);
          font-weight: 850;
          letter-spacing: -0.8px;
          line-height: 1.25;
        }

        .ap-heading p {
          max-width: 650px;
          margin: 9px 0 0;
          color: #667085;
          font-size: 14px;
          line-height: 1.7;
        }

        .ap-status {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border: 1px solid #e7d9ae;
          border-radius: 999px;
          background: #fff9e8;
          color: #805b08;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .ap-notice {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-bottom: 23px;
          padding: 17px;
          border: 1px solid #f0dfb1;
          border-radius: 13px;
          background: #fffbef;
        }

        .ap-notice-icon {
          display: grid;
          flex: 0 0 38px;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 10px;
          background: #fff0c2;
          color: #946b0c;
        }

        .ap-notice h3 {
          margin: 0 0 5px;
          color: #684d0b;
          font-size: 14px;
          font-weight: 800;
        }

        .ap-notice p {
          margin: 0;
          color: #806d3e;
          font-size: 12px;
          line-height: 1.7;
        }

        .ap-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 23px;
        }

        .ap-card {
          min-width: 0;
          padding: 19px;
          border: 1px solid #e5e9f0;
          border-radius: 13px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(16, 24, 40, 0.025);
        }

        .ap-card-icon {
          display: grid;
          width: 40px;
          height: 40px;
          place-items: center;
          margin-bottom: 15px;
          border-radius: 11px;
          background: #f3f5f9;
          color: #344054;
        }

        .ap-card-label {
          margin-bottom: 7px;
          color: #667085;
          font-size: 12px;
          font-weight: 650;
        }

        .ap-card-value {
          color: #111827;
          font-size: 19px;
          font-weight: 850;
          letter-spacing: -0.4px;
        }

        .ap-card-description {
          margin-top: 8px;
          color: #858d9b;
          font-size: 11px;
          line-height: 1.6;
        }

        .ap-panel {
          overflow: hidden;
          border: 1px solid #e5e9f0;
          border-radius: 13px;
          background: #fff;
        }

        .ap-panel-header {
          padding: 19px 20px;
          border-bottom: 1px solid #edf0f4;
        }

        .ap-panel-header h3 {
          margin: 0;
          color: #172033;
          font-size: 16px;
          font-weight: 800;
        }

        .ap-panel-header p {
          margin: 6px 0 0;
          color: #667085;
          font-size: 12px;
          line-height: 1.6;
        }

        .ap-steps {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0;
          padding: 7px 20px;
        }

        .ap-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 17px 8px;
        }

        .ap-step-icon {
          display: grid;
          flex: 0 0 34px;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 9px;
          background: #f4f6f9;
          color: #475467;
        }

        .ap-step h4 {
          margin: 1px 0 5px;
          color: #263246;
          font-size: 13px;
          font-weight: 750;
        }

        .ap-step p {
          margin: 0;
          color: #7b8495;
          font-size: 12px;
          line-height: 1.65;
        }

        .ap-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-top: 20px;
        }

        .ap-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 10px 14px;
          border: 1px solid #dce2ea;
          border-radius: 9px;
          background: #fff;
          color: #263246;
          text-decoration: none;
          font-size: 12px;
          font-weight: 750;
        }

        .ap-button:hover {
          background: #f8fafc;
        }

        .ap-button-primary {
          border-color: #111827;
          background: #111827;
          color: #fff;
        }

        .ap-button-primary:hover {
          background: #293449;
          color: #fff;
        }

        .ap-footnote {
          margin: 15px 0 0;
          color: #858d9b;
          font-size: 11px;
          line-height: 1.7;
        }

        @media (max-width: 760px) {
          .ap-heading {
            flex-direction: column;
            gap: 13px;
          }

          .ap-card-grid {
            grid-template-columns: 1fr;
            gap: 11px;
          }

          .ap-card {
            padding: 16px;
          }

          .ap-card-icon {
            margin-bottom: 10px;
          }

          .ap-steps {
            grid-template-columns: 1fr;
            padding: 6px 12px;
          }

          .ap-panel-header {
            padding: 16px;
          }

          .ap-notice {
            padding: 13px;
          }
        }
      `}</style>

      <Link className="ap-back" to="/admin/store/affiliate-ledger">
        <ArrowLeft size={16} />
        Back to Affiliate Ledger
      </Link>

      <div className="ap-heading">
        <div>
          <h2>Affiliate Payouts</h2>
          <p>
            Review the payout management workflow for Valuedam Store
            affiliates. This page is prepared for the next stage of
            implementation.
          </p>
        </div>

        <span className="ap-status">
          <Clock3 size={14} />
          Setup in progress
        </span>
      </div>

      <div className="ap-notice">
        <div className="ap-notice-icon">
          <ShieldCheck size={21} />
        </div>

        <div>
          <h3>Payout processing is not enabled</h3>
          <p>
            No transfers, payout approvals, or ledger changes can be
            initiated from this page. We will connect the payout
            workflow after reviewing the existing affiliate records
            and designing the appropriate audit and duplicate-payment
            protections.
          </p>
        </div>
      </div>

      <div className="ap-card-grid">
        <div className="ap-card">
          <div className="ap-card-icon">
            <Banknote size={20} />
          </div>
          <div className="ap-card-label">Payout balance</div>
          <div className="ap-card-value">Not calculated</div>
          <div className="ap-card-description">
            Requires verified commission and ledger eligibility rules.
          </div>
        </div>

        <div className="ap-card">
          <div className="ap-card-icon">
            <ClipboardCheck size={20} />
          </div>
          <div className="ap-card-label">Payout requests</div>
          <div className="ap-card-value">Not available yet</div>
          <div className="ap-card-description">
            A dedicated payout record and review workflow are still
            required.
          </div>
        </div>

        <div className="ap-card">
          <div className="ap-card-icon">
            <ShieldCheck size={20} />
          </div>
          <div className="ap-card-label">Payment safety</div>
          <div className="ap-card-value">Review required</div>
          <div className="ap-card-description">
            Payment references, duplicate prevention, and audit
            history must be implemented before live use.
          </div>
        </div>
      </div>

      <section className="ap-panel">
        <div className="ap-panel-header">
          <h3>Planned payout workflow</h3>
          <p>
            The following steps describe the intended process. They
            are not active payment actions.
          </p>
        </div>

        <div className="ap-steps">
          <div className="ap-step">
            <div className="ap-step-icon">
              <ClipboardCheck size={18} />
            </div>
            <div>
              <h4>1. Review eligible earnings</h4>
              <p>
                Identify approved commissions and adjustments, while
                excluding void, reversed, or otherwise ineligible
                entries.
              </p>
            </div>
          </div>

          <div className="ap-step">
            <div className="ap-step-icon">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4>2. Verify affiliate details</h4>
              <p>
                Confirm the affiliate, payout amount, payment method,
                and authorised destination details.
              </p>
            </div>
          </div>

          <div className="ap-step">
            <div className="ap-step-icon">
              <Banknote size={18} />
            </div>
            <div>
              <h4>3. Record the payment</h4>
              <p>
                Record an actual manual transfer with its reference,
                date, amount, currency, and responsible administrator.
              </p>
            </div>
          </div>

          <div className="ap-step">
            <div className="ap-step-icon">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4>4. Reconcile and audit</h4>
              <p>
                Prevent duplicate payouts and preserve a traceable
                record of every payout and related ledger change.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="ap-footer">
        <Link
          to="/admin/store/affiliate-ledger"
          className="ap-button ap-button-primary"
        >
          View Affiliate Ledger
        </Link>

        <Link
          to="/admin/store/affiliate-sales"
          className="ap-button"
        >
          View Affiliate Sales
        </Link>

        <Link
          to="/admin/store/affiliates"
          className="ap-button"
        >
          Manage Affiliates
        </Link>
      </div>

      <p className="ap-footnote">
        This page currently displays setup information only. It does
        not read, approve, or modify payout balances, affiliate
        transactions, or bank transfer records.
      </p>
    </div>
  );
}
