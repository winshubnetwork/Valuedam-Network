import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function JobDetails() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');

  const [job, setJob] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [request, setRequest] = useState(null);
  const [quote, setQuote] = useState(null);
  const [activities, setActivities] = useState([]);
  const [assignedAdmin, setAssignedAdmin] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [note, setNote] = useState('');

  useEffect(() => {
    if (jobId) {
      loadJob();
    } else {
      setLoading(false);
      setMessage('No job was selected.');
    }
  }, [jobId]);

  async function loadJob() {
    setLoading(true);
    setMessage('');

    const { data: jobData, error: jobError } =
      await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

    if (jobError) {
      setMessage(jobError.message);
      setLoading(false);
      return;
    }

    setJob(jobData);

    const [
      customerResult,
      requestResult,
      quoteResult,
      activitiesResult,
      adminResult
    ] = await Promise.all([
      jobData.customer_id
        ? supabase
            .from('crm_customers')
            .select('*')
            .eq('id', jobData.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      jobData.service_request_id
        ? supabase
            .from('service_requests')
            .select('*')
            .eq(
              'id',
              jobData.service_request_id
            )
            .maybeSingle()
        : Promise.resolve({ data: null }),

      jobData.quote_id
        ? supabase
            .from('quotes')
            .select('*')
            .eq('id', jobData.quote_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      supabase
        .from('job_activities')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', {
          ascending: false
        }),

      jobData.assigned_to
        ? supabase
            .from('admin_profiles')
            .select('*')
            .or(
              `id.eq.${jobData.assigned_to},user_id.eq.${jobData.assigned_to}`
            )
            .maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    if (customerResult.error) {
      console.error(customerResult.error);
    }

    if (requestResult.error) {
      console.error(requestResult.error);
    }

    if (quoteResult.error) {
      console.error(quoteResult.error);
    }

    if (activitiesResult.error) {
      setMessage(
        activitiesResult.error.message
      );
    }

    if (adminResult.error) {
      console.error(adminResult.error);
    }

    setCustomer(
      customerResult.data || null
    );

    setRequest(
      requestResult.data || null
    );

    setQuote(
      quoteResult.data || null
    );

    setActivities(
      activitiesResult.data || []
    );

    setAssignedAdmin(
      adminResult.data || null
    );

    setLoading(false);
  }

  function formatMoney(
    amount,
    currency = 'NGN'
  ) {
    if (
      amount === null ||
      amount === undefined ||
      amount === ''
    ) {
      return '—';
    }

    try {
      return new Intl.NumberFormat(
        'en-NG',
        {
          style: 'currency',
          currency,
          maximumFractionDigits: 2
        }
      ).format(Number(amount));
    } catch {
      return `${currency} ${Number(
        amount
      ).toLocaleString()}`;
    }
  }

  function formatDate(value) {
    if (!value) {
      return '—';
    }

    return new Date(
      value
    ).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  }

  function formatDateTime(value) {
    if (!value) {
      return '—';
    }

    return new Date(
      value
    ).toLocaleString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }
    );
  }

  function formatStatus(status) {
    return (status || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter =>
        letter.toUpperCase()
      );
  }

  function formatActivityType(type) {
    return (type || 'note')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter =>
        letter.toUpperCase()
      );
  }

  function getStatusClass(status) {
    return `job-detail-status status-${status}`;
  }

  function isOverdue() {
    if (
      !job?.due_date ||
      job.status === 'completed' ||
      job.status === 'cancelled'
    ) {
      return false;
    }

    return (
      new Date(job.due_date) <
      new Date()
    );
  }

  async function addActivity({
    activityType,
    title,
    description = null,
    oldStatus = null,
    newStatus = null
  }) {
    const {
      data: userData
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('job_activities')
      .insert({
        job_id: job.id,
        activity_type:
          activityType || 'note',
        title,
        description,
        old_status: oldStatus,
        new_status: newStatus,
        created_by:
          userData?.user?.id || null
      });

    if (error) {
      setMessage(error.message);
      return false;
    }

    return true;
  }

  async function changeStatus(
    newStatus
  ) {
    if (!job) {
      return;
    }

    if (
      job.status === newStatus
    ) {
      return;
    }

    setSaving(true);
    setMessage('');

    const oldStatus =
      job.status;

    const updates = {
      status: newStatus,
      updated_at:
        new Date().toISOString()
    };

    if (
      newStatus === 'completed'
    ) {
      updates.completed_at =
        new Date().toISOString();
    } else if (
      oldStatus === 'completed'
    ) {
      updates.completed_at = null;
    }

    const { error } =
      await supabase
        .from('jobs')
        .update(updates)
        .eq('id', job.id);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    const activityTitles = {
      scheduled:
        'Job scheduled',
      in_progress:
        'Job started',
      on_hold:
        'Job placed on hold',
      completed:
        'Job completed',
      cancelled:
        'Job cancelled',
      pending:
        'Job moved back to pending'
    };

    await addActivity({
      activityType:
        'status_change',
      title:
        activityTitles[
          newStatus
        ] ||
        `Job status changed to ${formatStatus(
          newStatus
        )}`,
      oldStatus,
      newStatus
    });

    setMessage(
      `Job moved to ${formatStatus(
        newStatus
      )}.`
    );

    await loadJob();

    setSaving(false);
  }

  async function saveNote(e) {
    e.preventDefault();

    if (!note.trim()) {
      return;
    }

    setSaving(true);
    setMessage('');

    const success =
      await addActivity({
        activityType: 'note',
        title: 'Internal note added',
        description:
          note.trim()
      });

    if (!success) {
      setSaving(false);
      return;
    }

    setNote('');

    setMessage(
      'Internal note added.'
    );

    await loadJob();

    setSaving(false);
  }

  function openCustomer() {
    if (!customer?.id) {
      return;
    }

    window.location.href =
      `/admin/customers?customer=${customer.id}`;
  }

  function openRequest() {
    if (!request?.id) {
      return;
    }

    window.location.href =
      `/admin/requests?request=${request.id}`;
  }

  function openQuote() {
    if (!quote?.id) {
      return;
    }

    window.location.href =
      `/admin/quotes?edit=${quote.id}`;
  }

  function printQuote() {
    if (!quote?.id) {
      return;
    }

    window.open(
      `/admin/quotes/print?id=${quote.id}`,
      '_blank'
    );
  }

  const workflowActions = useMemo(() => {
    if (!job) {
      return [];
    }

    switch (job.status) {
      case 'pending':
        return [
          {
            label: 'Schedule Job',
            status: 'scheduled',
            primary: true
          }
        ];

      case 'scheduled':
        return [
          {
            label: 'Start Job',
            status: 'in_progress',
            primary: true
          },
          {
            label: 'Cancel Job',
            status: 'cancelled',
            danger: true
          }
        ];

      case 'in_progress':
        return [
          {
            label: 'Complete Job',
            status: 'completed',
            primary: true
          },
          {
            label: 'Put On Hold',
            status: 'on_hold'
          },
          {
            label: 'Cancel Job',
            status: 'cancelled',
            danger: true
          }
        ];

      case 'on_hold':
        return [
          {
            label: 'Resume Job',
            status: 'in_progress',
            primary: true
          },
          {
            label: 'Complete Job',
            status: 'completed'
          },
          {
            label: 'Cancel Job',
            status: 'cancelled',
            danger: true
          }
        ];

      case 'completed':
        return [
          {
            label: 'Reopen Job',
            status: 'in_progress'
          }
        ];

      case 'cancelled':
        return [
          {
            label: 'Reopen Job',
            status: 'pending'
          }
        ];

      default:
        return [];
    }
  }, [job]);

  if (loading) {
    return (
      <section className="job-details-page">
        <style>{styles}</style>

        <div className="job-details-loading">
          <div className="job-loading-spinner">
            ...
          </div>

          <strong>
            Loading job...
          </strong>

          <p>
            Getting the job information and activity history.
          </p>
        </div>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="job-details-page">
        <style>{styles}</style>

        <div className="job-details-empty">
          <h2>
            Job not found
          </h2>

          <p>
            {message ||
              'The requested job could not be found.'}
          </p>

          <Link
            to="/admin/jobs"
            className="job-details-button primary"
          >
            Back to Jobs
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="job-details-page">

      <style>{styles}</style>

      {/* HEADER */}

      <div className="job-details-header">

        <div>

          <Link
            to="/admin/jobs"
            className="job-back"
          >
            ← Back to Jobs
          </Link>

          <div className="job-heading-row">

            <div>
              <span className="job-details-eyebrow">
                JOB WORKSPACE
              </span>

              <h1>
                {job.title}
              </h1>

              <div className="job-heading-meta">
                <span>
                  {job.job_number}
                </span>

                <span>
                  •
                </span>

                <span>
                  Created{' '}
                  {formatDate(
                    job.created_at
                  )}
                </span>
              </div>
            </div>

            <span
              className={getStatusClass(
                job.status
              )}
            >
              {formatStatus(
                job.status
              )}
            </span>

          </div>

        </div>

        <Link
          to={`/admin/jobs?edit=${job.id}`}
          className="job-details-button secondary"
        >
          Edit Job
        </Link>

      </div>

      {message && (
        <div className="job-details-message">
          {message}
        </div>
      )}

      {/* WORKFLOW */}

      <div className="job-workflow-card">

        <div className="job-section-heading">

          <div>
            <span className="job-section-number">
              01
            </span>

            <div>
              <h2>
                Job Workflow
              </h2>

              <p>
                Move this job through its current stage.
              </p>
            </div>
          </div>

          <span className="job-current-stage">
            Current:{' '}
            {formatStatus(
              job.status
            )}
          </span>

        </div>

        <div className="job-workflow-actions">

          {workflowActions.map(
            action => (
              <button
                key={action.status}
                type="button"
                disabled={saving}
                className={
                  action.danger
                    ? 'job-details-button danger'
                    : action.primary
                      ? 'job-details-button primary'
                      : 'job-details-button secondary'
                }
                onClick={() =>
                  changeStatus(
                    action.status
                  )
                }
              >
                {action.label}
              </button>
            )
          )}

        </div>

      </div>

      {/* OVERVIEW */}

      <div className="job-details-grid">

        <div className="job-details-main">

          {/* JOB INFORMATION */}

          <div className="job-detail-card">

            <div className="job-section-heading">
              <div>
                <span className="job-section-number">
                  02
                </span>

                <div>
                  <h2>
                    Job Information
                  </h2>

                  <p>
                    Main information about this project.
                  </p>
                </div>
              </div>
            </div>

            <div className="job-info-grid">

              <InfoItem
                label="Job Number"
                value={
                  job.job_number
                }
              />

              <InfoItem
                label="Status"
                value={
                  formatStatus(
                    job.status
                  )
                }
              />

              <InfoItem
                label="Priority"
                value={
                  formatStatus(
                    job.priority
                  )
                }
              />

              <InfoItem
                label="Assigned To"
                value={
                  assignedAdmin?.full_name ||
                  assignedAdmin?.email ||
                  'Unassigned'
                }
              />

              <InfoItem
                label="Agreed Amount"
                value={
                  formatMoney(
                    job.agreed_amount,
                    job.currency
                  )
                }
              />

              <InfoItem
                label="Start Date"
                value={
                  formatDate(
                    job.start_date
                  )
                }
              />

              <InfoItem
                label="Due Date"
                value={
                  formatDate(
                    job.due_date
                  )
                }
                danger={
                  isOverdue()
                }
              />

              <InfoItem
                label="Completed"
                value={
                  formatDate(
                    job.completed_at
                  )
                }
              />

            </div>

            {job.description && (
              <div className="job-description-box">

                <span>
                  DESCRIPTION
                </span>

                <p>
                  {job.description}
                </p>

              </div>
            )}

          </div>

          {/* CUSTOMER */}

          <div className="job-detail-card">

            <div className="job-section-heading">

              <div>
                <span className="job-section-number">
                  03
                </span>

                <div>
                  <h2>
                    Customer
                  </h2>

                  <p>
                    Customer connected to this job.
                  </p>
                </div>
              </div>

              {customer && (
                <button
                  type="button"
                  className="job-link-button"
                  onClick={openCustomer}
                >
                  Open Customer →
                </button>
              )}

            </div>

            {customer ? (
              <div className="customer-detail-box">

                <div className="customer-avatar">
                  {customer.full_name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    'C'}
                </div>

                <div className="customer-detail-content">

                  <strong>
                    {customer.full_name}
                  </strong>

                  {customer.company_name && (
                    <span>
                      {customer.company_name}
                    </span>
                  )}

                  <div className="customer-contact-row">

                    {customer.email && (
                      <span>
                        {customer.email}
                      </span>
                    )}

                    {customer.phone && (
                      <span>
                        {customer.phone}
                      </span>
                    )}

                    {customer.whatsapp && (
                      <span>
                        WhatsApp: {customer.whatsapp}
                      </span>
                    )}

                  </div>

                </div>

              </div>
            ) : (
              <div className="job-muted-box">
                No customer is connected to this job.
              </div>
            )}

          </div>

          {/* SERVICE REQUEST */}

          <div className="job-detail-card">

            <div className="job-section-heading">

              <div>
                <span className="job-section-number">
                  04
                </span>

                <div>
                  <h2>
                    Service Request
                  </h2>

                  <p>
                    Original customer request connected to this job.
                  </p>
                </div>
              </div>

              {request && (
                <button
                  type="button"
                  className="job-link-button"
                  onClick={openRequest}
                >
                  Open Request →
                </button>
              )}

            </div>

            {request ? (
              <div className="related-record">

                <div>
                  <span className="related-label">
                    SERVICE
                  </span>

                  <strong>
                    {request.service_name ||
                      request.service ||
                      'Service Request'}
                  </strong>
                </div>

                <div>
                  <span className="related-label">
                    STATUS
                  </span>

                  <strong>
                    {formatStatus(
                      request.status ||
                        'new'
                    )}
                  </strong>
                </div>

                <div>
                  <span className="related-label">
                    DATE
                  </span>

                  <strong>
                    {formatDate(
                      request.created_at
                    )}
                  </strong>
                </div>

                {(
                  request.request_details ||
                  request.description
                ) && (
                  <div className="related-description">
                    {
                      request.request_details ||
                      request.description
                    }
                  </div>
                )}

              </div>
            ) : (
              <div className="job-muted-box">
                No service request is connected to this job.
              </div>
            )}

          </div>

          {/* QUOTE */}

          <div className="job-detail-card">

            <div className="job-section-heading">

              <div>
                <span className="job-section-number">
                  05
                </span>

                <div>
                  <h2>
                    Quote
                  </h2>

                  <p>
                    Quote connected to this job.
                  </p>
                </div>
              </div>

              {quote && (
                <div className="job-heading-actions">

                  <button
                    type="button"
                    className="job-link-button"
                    onClick={openQuote}
                  >
                    Edit Quote
                  </button>

                  <button
                    type="button"
                    className="job-link-button"
                    onClick={printQuote}
                  >
                    PDF
                  </button>

                </div>
              )}

            </div>

            {quote ? (
              <div className="quote-summary">

                <div>
                  <span>
                    QUOTE NUMBER
                  </span>

                  <strong>
                    {quote.quote_number ||
                      'Quote'}
                  </strong>
                </div>

                <div>
                  <span>
                    TOTAL
                  </span>

                  <strong>
                    {formatMoney(
                      quote.total,
                      quote.currency
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    STATUS
                  </span>

                  <strong>
                    {formatStatus(
                      quote.status ||
                        'draft'
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    ISSUE DATE
                  </span>

                  <strong>
                    {formatDate(
                      quote.issue_date
                    )}
                  </strong>
                </div>

              </div>
            ) : (
              <div className="job-muted-box">
                No quote is connected to this job.
              </div>
            )}

          </div>

          {/* INTERNAL NOTES */}

          <div className="job-detail-card">

            <div className="job-section-heading">

              <div>
                <span className="job-section-number">
                  06
                </span>

                <div>
                  <h2>
                    Add Internal Note
                  </h2>

                  <p>
                    Keep a record of important information about this job.
                  </p>
                </div>
              </div>

            </div>

            <form
              onSubmit={saveNote}
            >

              <textarea
                className="job-note-input"
                value={note}
                onChange={e =>
                  setNote(
                    e.target.value
                  )
                }
                placeholder="Write an internal note about this job..."
              />

              <div className="job-note-actions">

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !note.trim()
                  }
                  className="job-details-button primary"
                >
                  Add Note
                </button>

              </div>

            </form>

          </div>

        </div>

        {/* SIDEBAR */}

        <aside className="job-details-sidebar">

          <div className="job-detail-card">

            <div className="job-section-heading compact">

              <div>
                <h2>
                  Job Timeline
                </h2>

                <p>
                  Activity and status history.
                </p>
              </div>

            </div>

            {activities.length === 0 ? (
              <div className="timeline-empty">
                <div className="timeline-empty-icon">
                  +
                </div>

                <strong>
                  No activity yet
                </strong>

                <p>
                  Job activity will appear here as work progresses.
                </p>
              </div>
            ) : (
              <div className="job-timeline">

                {activities.map(
                  activity => (
                    <div
                      key={
                        activity.id
                      }
                      className="timeline-item"
                    >

                      <div className="timeline-dot" />

                      <div className="timeline-content">

                        <div className="timeline-title-row">

                          <strong>
                            {activity.title}
                          </strong>

                          <span>
                            {formatActivityType(
                              activity.activity_type
                            )}
                          </span>

                        </div>

                        {activity.description && (
                          <p>
                            {
                              activity.description
                            }
                          </p>
                        )}

                        {(
                          activity.old_status &&
                          activity.new_status
                        ) && (
                          <div className="timeline-status-change">
                            {formatStatus(
                              activity.old_status
                            )}
                            <span>
                              →
                            </span>
                            {formatStatus(
                              activity.new_status
                            )}
                          </div>
                        )}

                        <small>
                          {formatDateTime(
                            activity.created_at
                          )}
                        </small>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* QUICK LINKS */}

          <div className="job-detail-card">

            <div className="job-section-heading compact">

              <div>
                <h2>
                  Quick Links
                </h2>

                <p>
                  Open related records.
                </p>
              </div>

            </div>

            <div className="quick-links">

              {customer && (
                <button
                  type="button"
                  onClick={
                    openCustomer
                  }
                >
                  <span>
                    Customer
                  </span>

                  <strong>
                    →
                  </strong>
                </button>
              )}

              {request && (
                <button
                  type="button"
                  onClick={
                    openRequest
                  }
                >
                  <span>
                    Service Request
                  </span>

                  <strong>
                    →
                  </strong>
                </button>
              )}

              {quote && (
                <button
                  type="button"
                  onClick={
                    openQuote
                  }
                >
                  <span>
                    Quote
                  </span>

                  <strong>
                    →
                  </strong>
                </button>
              )}

              <Link
                to={`/admin/jobs?edit=${job.id}`}
              >
                <span>
                  Edit Job
                </span>

                <strong>
                  →
                </strong>
              </Link>

            </div>

          </div>

        </aside>

      </div>

    </section>
  );
}

function InfoItem({
  label,
  value,
  danger = false
}) {
  return (
    <div className="job-info-item">

      <span>
        {label}
      </span>

      <strong
        className={
          danger
            ? 'danger-text'
            : ''
        }
      >
        {value || '—'}
      </strong>

    </div>
  );
}

const styles = `
  .job-details-page {
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
    padding: 28px;
    color: #182230;
  }

  .job-details-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 25px;
    margin-bottom: 25px;
  }

  .job-back {
    display: inline-block;
    margin-bottom: 18px;
    color: #667085;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
  }

  .job-back:hover {
    color: #111827;
  }

  .job-heading-row {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .job-details-eyebrow {
    display: block;
    margin-bottom: 7px;
    color: #6b7280;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }

  .job-heading-row h1 {
    margin: 0;
    font-size: 30px;
    line-height: 1.15;
    letter-spacing: -0.03em;
  }

  .job-heading-meta {
    display: flex;
    gap: 8px;
    margin-top: 7px;
    color: #667085;
    font-size: 11px;
  }

  .job-details-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #d9dee7;
    border-radius: 9px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;
    cursor: pointer;
    transition: 0.18s ease;
    white-space: nowrap;
  }

  .job-details-button:hover {
    transform: translateY(-1px);
  }

  .job-details-button.primary {
    border-color: #111827;
    background: #111827;
    color: #fff;
  }

  .job-details-button.secondary {
    background: #fff;
    color: #344054;
  }

  .job-details-button.danger {
    background: #fff;
    color: #b42318;
    border-color: #f1c7c3;
  }

  .job-details-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  .job-details-message {
    margin-bottom: 20px;
    padding: 13px 15px;
    border: 1px solid #e3e8ef;
    border-radius: 10px;
    background: #f8fafc;
    color: #344054;
    font-size: 13px;
  }

  .job-workflow-card,
  .job-detail-card {
    border: 1px solid #e5e7eb;
    border-radius: 15px;
    background: #fff;
    box-shadow:
      0 4px 18px
      rgba(16, 24, 40, 0.04);
  }

  .job-workflow-card {
    margin-bottom: 22px;
    padding: 20px 22px;
  }

  .job-section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
  }

  .job-section-heading > div:first-child {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .job-section-heading.compact {
    margin-bottom: 17px;
  }

  .job-section-heading h2 {
    margin: 0;
    font-size: 17px;
    letter-spacing: -0.02em;
  }

  .job-section-heading p {
    margin: 4px 0 0;
    color: #667085;
    font-size: 12px;
  }

  .job-section-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: #f2f4f7;
    color: #475467;
    font-size: 10px;
    font-weight: 850;
  }

  .job-current-stage {
    padding: 7px 10px;
    border-radius: 999px;
    background: #f2f4f7;
    color: #475467;
    font-size: 10px;
    font-weight: 800;
  }

  .job-workflow-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  .job-details-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 1.65fr)
      minmax(320px, 0.75fr);
    gap: 22px;
    align-items: start;
  }

  .job-details-main {
    display: grid;
    gap: 20px;
  }

  .job-detail-card {
    padding: 22px;
  }

  .job-info-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 1px;
    border: 1px solid #edf0f4;
    border-radius: 11px;
    overflow: hidden;
    background: #edf0f4;
  }

  .job-info-item {
    min-width: 0;
    padding: 14px;
    background: #fff;
  }

  .job-info-item span {
    display: block;
    margin-bottom: 6px;
    color: #98a2b3;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .job-info-item strong {
    color: #344054;
    font-size: 12px;
  }

  .danger-text {
    color: #b42318 !important;
  }

  .job-description-box {
    margin-top: 17px;
    padding: 15px;
    border-radius: 10px;
    background: #f8fafc;
  }

  .job-description-box span {
    color: #98a2b3;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.08em;
  }

  .job-description-box p {
    margin: 8px 0 0;
    color: #475467;
    font-size: 13px;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  .job-link-button {
    border: 0;
    padding: 0;
    background: transparent;
    color: #344054;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  .job-link-button:hover {
    color: #111827;
  }

  .job-heading-actions {
    display: flex;
    gap: 12px;
  }

  .customer-detail-box {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 15px;
    border: 1px solid #edf0f4;
    border-radius: 11px;
  }

  .customer-avatar {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: #f2f4f7;
    color: #344054;
    font-size: 15px;
    font-weight: 850;
  }

  .customer-detail-content {
    min-width: 0;
  }

  .customer-detail-content strong {
    display: block;
    color: #101828;
    font-size: 14px;
  }

  .customer-detail-content > span {
    display: block;
    margin-top: 3px;
    color: #667085;
    font-size: 11px;
  }

  .customer-contact-row {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 15px;
    margin-top: 9px;
    color: #667085;
    font-size: 10px;
  }

  .job-muted-box {
    padding: 15px;
    border-radius: 10px;
    background: #f8fafc;
    color: #667085;
    font-size: 12px;
  }

  .related-record {
    display: grid;
    grid-template-columns:
      1.4fr 0.8fr 0.8fr;
    gap: 16px;
    padding: 16px;
    border: 1px solid #edf0f4;
    border-radius: 11px;
  }

  .related-label,
  .quote-summary span {
    display: block;
    margin-bottom: 6px;
    color: #98a2b3;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.08em;
  }

  .related-record strong,
  .quote-summary strong {
    color: #344054;
    font-size: 12px;
  }

  .related-description {
    grid-column: 1 / -1;
    padding-top: 13px;
    border-top: 1px solid #edf0f4;
    color: #667085;
    font-size: 12px;
    line-height: 1.6;
  }

  .quote-summary {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 1px;
    border: 1px solid #edf0f4;
    border-radius: 11px;
    overflow: hidden;
    background: #edf0f4;
  }

  .quote-summary > div {
    padding: 14px;
    background: #fff;
  }

  .job-note-input {
    width: 100%;
    box-sizing: border-box;
    min-height: 115px;
    resize: vertical;
    border: 1px solid #d9dee7;
    border-radius: 10px;
    padding: 12px;
    color: #182230;
    font-size: 13px;
    outline: none;
  }

  .job-note-input:focus {
    border-color: #98a2b3;
    box-shadow:
      0 0 0 3px
      rgba(16, 24, 40, 0.05);
  }

  .job-note-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
  }

  .job-timeline {
    position: relative;
  }

  .timeline-item {
    position: relative;
    display: flex;
    gap: 12px;
    padding-bottom: 22px;
  }

  .timeline-item:last-child {
    padding-bottom: 0;
  }

  .timeline-item:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 11px;
    bottom: 0;
    width: 1px;
    background: #e5e7eb;
  }

  .timeline-dot {
    position: relative;
    z-index: 2;
    width: 9px;
    height: 9px;
    flex: 0 0 9px;
    margin-top: 4px;
    border-radius: 50%;
    background: #667085;
  }

  .timeline-content {
    min-width: 0;
    flex: 1;
  }

  .timeline-title-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .timeline-title-row strong {
    color: #344054;
    font-size: 12px;
  }

  .timeline-title-row span {
    color: #98a2b3;
    font-size: 9px;
    font-weight: 800;
    white-space: nowrap;
  }

  .timeline-content p {
    margin: 6px 0 0;
    color: #667085;
    font-size: 11px;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  .timeline-content small {
    display: block;
    margin-top: 7px;
    color: #98a2b3;
    font-size: 9px;
  }

  .timeline-status-change {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 7px;
    color: #667085;
    font-size: 9px;
    font-weight: 700;
  }

  .timeline-empty {
    padding: 25px 10px;
    text-align: center;
  }

  .timeline-empty-icon {
    width: 38px;
    height: 38px;
    margin: 0 auto 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #f2f4f7;
    color: #667085;
    font-size: 17px;
  }

  .timeline-empty strong {
    display: block;
    color: #344054;
    font-size: 12px;
  }

  .timeline-empty p {
    margin: 5px 0 0;
    color: #98a2b3;
    font-size: 10px;
    line-height: 1.5;
  }

  .quick-links {
    display: grid;
    gap: 7px;
  }

  .quick-links button,
  .quick-links a {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #edf0f4;
    border-radius: 9px;
    padding: 11px 12px;
    background: #fff;
    color: #344054;
    text-decoration: none;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  .quick-links button:hover,
  .quick-links a:hover {
    background: #f8fafc;
  }

  .quick-links strong {
    color: #98a2b3;
  }

  .job-details-loading,
  .job-details-empty {
    min-height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .job-details-loading strong,
  .job-details-empty h2 {
    margin: 10px 0 0;
  }

  .job-details-loading p,
  .job-details-empty p {
    margin: 7px 0 20px;
    color: #667085;
    font-size: 13px;
  }

  .job-loading-spinner {
    color: #667085;
    font-size: 13px;
    font-weight: 800;
  }

  @media (max-width: 1100px) {
    .job-details-grid {
      grid-template-columns: 1fr;
    }

    .job-details-sidebar {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 20px;
    }

    .job-info-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .job-details-page {
      padding: 18px 12px;
    }

    .job-details-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .job-heading-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .job-heading-row h1 {
      font-size: 26px;
    }

    .job-workflow-card,
    .job-detail-card {
      padding: 17px;
    }

    .job-section-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .job-section-heading > div:first-child {
      align-items: flex-start;
    }

    .job-info-grid {
      grid-template-columns: 1fr 1fr;
    }

    .related-record,
    .quote-summary {
      grid-template-columns: 1fr;
    }

    .related-description {
      grid-column: auto;
    }

    .job-details-sidebar {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .job-info-grid {
      grid-template-columns: 1fr;
    }

    .customer-detail-box {
      align-items: flex-start;
    }

    .customer-contact-row {
      flex-direction: column;
      gap: 4px;
    }

    .job-workflow-actions {
      flex-direction: column;
    }

    .job-workflow-actions .job-details-button {
      width: 100%;
    }
  }
`;
