import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import { supabase } from '../../lib/supabase';

export default function Jobs() {
  const statusOptions = [
    'pending',
    'scheduled',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled'
  ];

  const priorityOptions = [
    'low',
    'normal',
    'high',
    'urgent'
  ];

  const activityTypes = [
    'note',
    'status_change',
    'update',
    'assignment',
    'payment',
    'customer_contact',
    'milestone',
    'other'
  ];

  const emptyForm = {
    id: null,
    job_number: '',
    customer_id: '',
    service_request_id: '',
    quote_id: '',
    title: '',
    description: '',
    agreed_amount: '',
    currency: 'NGN',
    assigned_to: '',
    priority: 'normal',
    status: 'pending',
    start_date: '',
    due_date: '',
    completed_at: '',
    notes: ''
  };

  const emptyActivityForm = {
    activity_type: 'note',
    title: '',
    description: ''
  };

  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [admins, setAdmins] = useState([]);

  const [form, setForm] = useState(emptyForm);

  const [activities, setActivities] = useState([]);
  const [activityForm, setActivityForm] =
    useState(emptyActivityForm);

  const [activityLoading, setActivityLoading] =
    useState(false);

  const [activitySaving, setActivitySaving] =
    useState(false);

  const [showActivityForm, setShowActivityForm] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const editId = params.get('edit');
    const quoteId = params.get('quote');
    const requestId = params.get('request');
    const customerId = params.get('customer');

    if (editId && jobs.length) {
      const job = jobs.find(
        item => item.id === editId
      );

      if (job) {
        editJob(job);
        return;
      }
    }

    if (quoteId && quotes.length) {
      prepareFromQuote(quoteId);
      return;
    }

    if (requestId && requests.length) {
      prepareFromRequest(requestId);
      return;
    }

    if (customerId && customers.length) {
      prepareFromCustomer(customerId);
    }
  }, [
    jobs,
    quotes,
    requests,
    customers
  ]);

  async function loadData() {
    setLoading(true);
    setMessage('');

    const [
      jobsResult,
      customersResult,
      requestsResult,
      quotesResult,
      adminsResult
    ] = await Promise.all([
      supabase
        .from('jobs')
        .select('*')
        .order('created_at', {
          ascending: false
        }),

      supabase
        .from('crm_customers')
        .select('*')
        .order('full_name', {
          ascending: true
        }),

      supabase
        .from('service_requests')
        .select('*')
        .order('created_at', {
          ascending: false
        }),

      supabase
        .from('quotes')
        .select('*')
        .order('created_at', {
          ascending: false
        }),

      supabase
        .from('admin_profiles')
        .select('*')
        .eq('active', true)
        .order('full_name', {
          ascending: true
        })
    ]);

    if (jobsResult.error) {
      setMessage(jobsResult.error.message);
    }

    if (customersResult.error) {
      setMessage(
        customersResult.error.message
      );
    }

    if (requestsResult.error) {
      setMessage(
        requestsResult.error.message
      );
    }

    if (quotesResult.error) {
      setMessage(
        quotesResult.error.message
      );
    }

    if (adminsResult.error) {
      setMessage(
        adminsResult.error.message
      );
    }

    setJobs(jobsResult.data || []);
    setCustomers(
      customersResult.data || []
    );
    setRequests(
      requestsResult.data || []
    );
    setQuotes(
      quotesResult.data || []
    );
    setAdmins(
      adminsResult.data || []
    );

    setLoading(false);
  }

  function generateJobNumber() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    const random = Math.floor(
      1000 + Math.random() * 9000
    );

    return `JOB-${year}${month}${day}-${random}`;
  }

  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  }

  function getCustomer(customerId) {
    return customers.find(
      customer =>
        customer.id === customerId
    );
  }

  function getRequest(requestId) {
    return requests.find(
      request =>
        request.id === requestId
    );
  }

  function getQuote(quoteId) {
    return quotes.find(
      quote =>
        quote.id === quoteId
    );
  }

  function getAdmin(adminId) {
    return admins.find(
      admin =>
        admin.id === adminId ||
        admin.user_id === adminId
    );
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
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter =>
        letter.toUpperCase()
      );
  }

  function formatPriority(priority) {
    return priority
      .replace(/\b\w/g, letter =>
        letter.toUpperCase()
      );
  }

  function formatActivityType(type) {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter =>
        letter.toUpperCase()
      );
  }

  function getStatusClass(status) {
    return `job-status job-status-${status}`;
  }

  function getPriorityClass(priority) {
    return `job-priority job-priority-${priority}`;
  }

  function isOverdue(job) {
    if (
      !job.due_date ||
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

  function newJob() {
    setForm({
      ...emptyForm,
      job_number:
        generateJobNumber()
    });

    setActivities([]);
    setActivityForm(
      emptyActivityForm
    );
    setShowActivityForm(false);
    setMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function editJob(job) {
    setForm({
      ...emptyForm,
      ...job,

      agreed_amount:
        job.agreed_amount === null ||
        job.agreed_amount === undefined
          ? ''
          : job.agreed_amount,

      start_date:
        job.start_date
          ? new Date(
              job.start_date
            )
              .toISOString()
              .slice(0, 16)
          : '',

      due_date:
        job.due_date
          ? new Date(
              job.due_date
            )
              .toISOString()
              .slice(0, 16)
          : '',

      completed_at:
        job.completed_at
          ? new Date(
              job.completed_at
            )
              .toISOString()
              .slice(0, 16)
          : ''
    });

    setMessage('');

    loadActivities(job.id);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function prepareFromCustomer(
    customerId
  ) {
    const customer =
      getCustomer(customerId);

    if (!customer) {
      return;
    }

    setForm({
      ...emptyForm,
      job_number:
        generateJobNumber(),
      customer_id:
        customer.id
    });

    setMessage('');
  }

  function prepareFromRequest(
    requestId
  ) {
    const request =
      getRequest(requestId);

    if (!request) {
      return;
    }

    const customerId =
      request.customer_id || '';

    setForm({
      ...emptyForm,

      job_number:
        generateJobNumber(),

      customer_id:
        customerId,

      service_request_id:
        request.id,

      title:
        request.service_name ||
        request.service ||
        'Service Job',

      description:
        request.request_details ||
        request.description ||
        '',

      agreed_amount:
        request.quote_amount || ''
    });

    setMessage('');
  }

  function prepareFromQuote(
    quoteId
  ) {
    const quote =
      getQuote(quoteId);

    if (!quote) {
      return;
    }

    setForm({
      ...emptyForm,

      job_number:
        generateJobNumber(),

      customer_id:
        quote.customer_id || '',

      service_request_id:
        quote.service_request_id ||
        '',

      quote_id:
        quote.id,

      title:
        quote.title ||
        'Service Job',

      description:
        quote.description ||
        '',

      agreed_amount:
        quote.total || '',

      currency:
        quote.currency || 'NGN'
    });

    setMessage('');
  }

  function handleRequestChange(
    requestId
  ) {
    const request =
      getRequest(requestId);

    if (!request) {
      updateField(
        'service_request_id',
        requestId
      );
      return;
    }

    setForm(prev => ({
      ...prev,

      service_request_id:
        request.id,

      customer_id:
        request.customer_id ||
        prev.customer_id,

      title:
        prev.title ||
        request.service_name ||
        request.service ||
        'Service Job',

      description:
        prev.description ||
        request.request_details ||
        request.description ||
        ''
    }));
  }

  function handleQuoteChange(
    quoteId
  ) {
    const quote =
      getQuote(quoteId);

    if (!quote) {
      updateField(
        'quote_id',
        quoteId
      );
      return;
    }

    setForm(prev => ({
      ...prev,

      quote_id:
        quote.id,

      customer_id:
        quote.customer_id ||
        prev.customer_id,

      service_request_id:
        quote.service_request_id ||
        prev.service_request_id,

      title:
        prev.title ||
        quote.title ||
        'Service Job',

      description:
        prev.description ||
        quote.description ||
        '',

      agreed_amount:
        quote.total ??
        prev.agreed_amount,

      currency:
        quote.currency ||
        prev.currency
    }));
  }

  async function loadActivities(
    jobId
  ) {
    if (!jobId) {
      setActivities([]);
      return;
    }

    setActivityLoading(true);

    const { data, error } =
      await supabase
        .from('job_activities')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', {
          ascending: false
        });

    if (error) {
      setMessage(error.message);
      setActivities([]);
      setActivityLoading(false);
      return;
    }

    setActivities(data || []);
    setActivityLoading(false);
  }

  async function getCurrentUserId() {
    const {
      data: userData
    } = await supabase.auth.getUser();

    return (
      userData?.user?.id || null
    );
  }

  async function createActivity({
    jobId,
    activityType = 'note',
    title,
    description = null,
    oldStatus = null,
    newStatus = null
  }) {
    if (!jobId || !title) {
      return;
    }

    const userId =
      await getCurrentUserId();

    const payload = {
      job_id: jobId,
      activity_type:
        activityType,
      title,
      description:
        description || null,
      old_status:
        oldStatus || null,
      new_status:
        newStatus || null,
      created_by:
        userId
    };

    const { error } =
      await supabase
        .from('job_activities')
        .insert(payload);

    if (error) {
      console.error(
        'Job activity error:',
        error
      );
      return;
    }

    if (form.id === jobId) {
      await loadActivities(jobId);
    }
  }

  async function saveActivity(e) {
    e.preventDefault();

    if (!form.id) {
      setMessage(
        'Save the job first before adding an activity.'
      );
      return;
    }

    if (
      !activityForm.title.trim()
    ) {
      setMessage(
        'Activity title is required.'
      );
      return;
    }

    setActivitySaving(true);
    setMessage('');

    await createActivity({
      jobId: form.id,
      activityType:
        activityForm.activity_type,
      title:
        activityForm.title.trim(),
      description:
        activityForm.description.trim() ||
        null
    });

    setActivityForm(
      emptyActivityForm
    );

    setShowActivityForm(false);

    setActivitySaving(false);

    setMessage(
      'Job activity added successfully.'
    );
  }

  async function saveJob(e) {
    e.preventDefault();

    if (!form.job_number.trim()) {
      setMessage(
        'Job number is required.'
      );
      return;
    }

    if (!form.title.trim()) {
      setMessage(
        'Job title is required.'
      );
      return;
    }

    if (
      form.start_date &&
      form.due_date &&
      new Date(form.due_date) <
        new Date(form.start_date)
    ) {
      setMessage(
        'Due date cannot be before the start date.'
      );
      return;
    }

    setSaving(true);
    setMessage('');

    const {
      data: userData
    } =
      await supabase.auth.getUser();

    const isNewJob =
      !form.id;

    const previousJob =
      form.id
        ? jobs.find(
            job =>
              job.id === form.id
          )
        : null;

    const payload = {
      job_number:
        form.job_number.trim(),

      customer_id:
        form.customer_id ||
        null,

      service_request_id:
        form.service_request_id ||
        null,

      quote_id:
        form.quote_id ||
        null,

      title:
        form.title.trim(),

      description:
        form.description.trim() ||
        null,

      agreed_amount:
        form.agreed_amount === ''
          ? null
          : Number(
              form.agreed_amount
            ),

      currency:
        form.currency || 'NGN',

      assigned_to:
        form.assigned_to ||
        null,

      priority:
        form.priority,

      status:
        form.status,

      start_date:
        form.start_date
          ? new Date(
              form.start_date
            ).toISOString()
          : null,

      due_date:
        form.due_date
          ? new Date(
              form.due_date
            ).toISOString()
          : null,

      completed_at:
        form.status === 'completed'
          ? (
              form.completed_at
                ? new Date(
                    form.completed_at
                  ).toISOString()
                : new Date().toISOString()
            )
          : null,

      notes:
        form.notes.trim() ||
        null,

      updated_at:
        new Date().toISOString()
    };

    if (isNewJob) {
      payload.created_by =
        userData?.user?.id ||
        null;
    }

    let result;

    if (form.id) {
      result =
        await supabase
          .from('jobs')
          .update(payload)
          .eq('id', form.id);
    } else {
      result =
        await supabase
          .from('jobs')
          .insert(payload)
          .select()
          .single();
    }

    if (result.error) {
      setMessage(
        result.error.message
      );
      setSaving(false);
      return;
    }

    const savedJob =
      result.data;

    if (isNewJob) {
      await createActivity({
        jobId: savedJob.id,
        activityType: 'update',
        title: 'Job created',
        description:
          'Job was created in the project management system.'
      });
    } else {
      const statusChanged =
        previousJob &&
        previousJob.status !==
          form.status;

      if (statusChanged) {
        await createActivity({
          jobId: form.id,
          activityType:
            'status_change',
          title:
            `Status changed to ${formatStatus(
              form.status
            )}`,
          description:
            `Job status changed from ${formatStatus(
              previousJob.status
            )} to ${formatStatus(
              form.status
            )}.`,
          oldStatus:
            previousJob.status,
          newStatus:
            form.status
        });
      } else {
        await createActivity({
          jobId: form.id,
          activityType: 'update',
          title: 'Job updated',
          description:
            'Job information was updated.'
        });
      }
    }

    if (
      isNewJob
    ) {
      setMessage(
        'Job created successfully.'
      );
    } else {
      setMessage(
        'Job updated successfully.'
      );
    }

    if (
      savedJob?.id
    ) {
      await loadActivities(
        savedJob.id
      );
    }

    setForm({
      ...emptyForm,
      job_number:
        generateJobNumber()
    });

    await loadData();

    setSaving(false);
  }

  async function updateJobStatus(
    job,
    newStatus
  ) {
    const updates = {
      status:
        newStatus,

      updated_at:
        new Date().toISOString()
    };

    if (
      newStatus ===
      'completed'
    ) {
      updates.completed_at =
        new Date().toISOString();
    } else if (
      job.status ===
      'completed'
    ) {
      updates.completed_at =
        null;
    }

    const {
      error
    } =
      await supabase
        .from('jobs')
        .update(updates)
        .eq(
          'id',
          job.id
        );

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    await createActivity({
      jobId: job.id,
      activityType:
        'status_change',
      title:
        `Status changed to ${formatStatus(
          newStatus
        )}`,
      description:
        `Job status changed from ${formatStatus(
          job.status
        )} to ${formatStatus(
          newStatus
        )}.`,
      oldStatus:
        job.status,
      newStatus
    });

    setMessage(
      `Job moved to ${formatStatus(
        newStatus
      )}.`
    );

    await loadData();

    if (
      form.id === job.id
    ) {
      await loadActivities(
        job.id
      );
    }
  }

  async function deleteJob(
    id
  ) {
    if (
      !window.confirm(
        'Delete this job? This cannot be undone.'
      )
    ) {
      return;
    }

    const {
      error
    } =
      await supabase
        .from('jobs')
        .delete()
        .eq(
          'id',
          id
        );

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    if (
      form.id === id
    ) {
      setForm(
        emptyForm
      );

      setActivities([]);
    }

    setMessage(
      'Job deleted successfully.'
    );

    await loadData();
  }

  function openCustomer(
    customerId
  ) {
    if (!customerId) {
      return;
    }

    window.location.href =
      `/admin/customers?customer=${customerId}`;
  }

  function openRequest(
    requestId
  ) {
    if (!requestId) {
      return;
    }

    window.location.href =
      `/admin/requests?request=${requestId}`;
  }

  function openQuote(
    quoteId
  ) {
    if (!quoteId) {
      return;
    }

    window.location.href =
      `/admin/quotes?edit=${quoteId}`;
  }

  function printQuote(
    quoteId
  ) {
    if (!quoteId) {
      return;
    }

    window.open(
      `/admin/quotes/print?id=${quoteId}`,
      '_blank'
    );
  }

  const filteredRequests =
    useMemo(() => {
      if (!form.customer_id) {
        return requests;
      }

      return requests.filter(
        request =>
          request.customer_id ===
          form.customer_id
      );
    }, [
      requests,
      form.customer_id
    ]);

  const filteredQuotes =
    useMemo(() => {
      if (!form.customer_id) {
        return quotes;
      }

      return quotes.filter(
        quote =>
          quote.customer_id ===
          form.customer_id
      );
    }, [
      quotes,
      form.customer_id
    ]);

  const filteredJobs =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return jobs.filter(
        job => {
          const customer =
            getCustomer(
              job.customer_id
            );

          const matchesSearch =
            !query ||
            job.job_number
              ?.toLowerCase()
              .includes(query) ||
            job.title
              ?.toLowerCase()
              .includes(query) ||
            customer?.full_name
              ?.toLowerCase()
              .includes(query) ||
            customer?.company_name
              ?.toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter ===
              'all' ||
            job.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      jobs,
      customers,
      search,
      statusFilter
    ]);

  const stats =
    useMemo(() => {
      const activeStatuses = [
        'scheduled',
        'in_progress',
        'on_hold'
      ];

      return {
        total:
          jobs.length,

        pending:
          jobs.filter(
            job =>
              job.status ===
              'pending'
          ).length,

        active:
          jobs.filter(
            job =>
              activeStatuses.includes(
                job.status
              )
          ).length,

        completed:
          jobs.filter(
            job =>
              job.status ===
              'completed'
          ).length,

        overdue:
          jobs.filter(
            job =>
              isOverdue(job)
          ).length
      };
    }, [jobs]);

  return (
    <section className="jobs-admin">

      <style>{`
        .jobs-admin {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 28px;
          color: #182230;
        }

        .jobs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 28px;
        }

        .jobs-eyebrow {
          display: block;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #6b7280;
        }

        .jobs-header h1 {
          margin: 0;
          font-size: 32px;
          line-height: 1.15;
          letter-spacing: -0.03em;
        }

        .jobs-header p {
          margin: 8px 0 0;
          color: #667085;
          font-size: 14px;
        }

        .jobs-btn {
          border: 0;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.18s ease;
          white-space: nowrap;
        }

        .jobs-btn:hover {
          transform: translateY(-1px);
        }

        .jobs-btn-primary {
          background: #111827;
          color: #fff;
        }

        .jobs-btn-secondary {
          background: #fff;
          color: #344054;
          border: 1px solid #d9dee7;
        }

        .jobs-btn-danger {
          background: #fff;
          color: #b42318;
          border: 1px solid #f1c7c3;
        }

        .jobs-message {
          margin-bottom: 20px;
          padding: 13px 15px;
          border-radius: 10px;
          background: #f4f7fb;
          border: 1px solid #e3e8ef;
          color: #344054;
          font-size: 13px;
        }

        .jobs-stats {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .jobs-stat {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          padding: 17px;
          box-shadow:
            0 2px 8px
            rgba(16, 24, 40, 0.03);
        }

        .jobs-stat-label {
          color: #667085;
          font-size: 12px;
          font-weight: 600;
        }

        .jobs-stat-value {
          margin-top: 7px;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .jobs-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          box-shadow:
            0 4px 18px
            rgba(16, 24, 40, 0.04);
          margin-bottom: 24px;
          overflow: hidden;
        }

        .jobs-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 20px 22px;
          border-bottom: 1px solid #edf0f4;
        }

        .jobs-card-header h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: -0.02em;
        }

        .jobs-card-header p {
          margin: 5px 0 0;
          color: #667085;
          font-size: 13px;
        }

        .jobs-count {
          padding: 6px 10px;
          border-radius: 999px;
          background: #f2f4f7;
          color: #475467;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .jobs-form {
          padding: 22px;
        }

        .jobs-form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .jobs-field {
          min-width: 0;
        }

        .jobs-field-full {
          grid-column: 1 / -1;
        }

        .jobs-field label {
          display: block;
          margin-bottom: 7px;
          color: #344054;
          font-size: 12px;
          font-weight: 700;
        }

        .jobs-field input,
        .jobs-field select,
        .jobs-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d9dee7;
          border-radius: 9px;
          background: #fff;
          color: #182230;
          padding: 11px 12px;
          font-size: 13px;
          outline: none;
          transition: 0.18s ease;
        }

        .jobs-field textarea {
          min-height: 110px;
          resize: vertical;
        }

        .jobs-field input:focus,
        .jobs-field select:focus,
        .jobs-field textarea:focus {
          border-color: #98a2b3;
          box-shadow:
            0 0 0 3px
            rgba(16, 24, 40, 0.05);
        }

        .jobs-help {
          display: block;
          margin-top: 6px;
          color: #98a2b3;
          font-size: 11px;
        }

        .jobs-customer-preview {
          margin-top: 10px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 9px;
          background: #f8fafc;
        }

        .jobs-customer-preview strong {
          display: block;
          font-size: 13px;
        }

        .jobs-customer-preview span {
          display: block;
          margin-top: 3px;
          color: #667085;
          font-size: 11px;
        }

        .jobs-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid #edf0f4;
        }

        .jobs-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 15px 22px;
          background: #fafbfc;
          border-bottom: 1px solid #edf0f4;
        }

        .jobs-search {
          flex: 1;
          max-width: 480px;
        }

        .jobs-search input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d9dee7;
          border-radius: 9px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
        }

        .jobs-toolbar select {
          border: 1px solid #d9dee7;
          border-radius: 9px;
          padding: 10px 12px;
          background: #fff;
          font-size: 13px;
          color: #344054;
        }

        .jobs-list {
          padding: 12px;
        }

        .job-item {
          border: 1px solid #e6e9ee;
          border-radius: 13px;
          padding: 17px;
          margin-bottom: 10px;
          background: #fff;
          transition: 0.18s ease;
        }

        .job-item:last-child {
          margin-bottom: 0;
        }

        .job-item:hover {
          border-color: #d0d5dd;
          box-shadow:
            0 4px 14px
            rgba(16, 24, 40, 0.05);
        }

        .job-main {
          display: grid;
          grid-template-columns:
            minmax(230px, 1.5fr)
            minmax(160px, 1fr)
            140px
            150px
            150px;
          gap: 18px;
          align-items: center;
        }

        .job-title-line {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .job-title {
          font-size: 14px;
          font-weight: 800;
          color: #101828;
        }

        .job-number {
          margin-top: 5px;
          color: #667085;
          font-size: 11px;
          font-weight: 600;
        }

        .job-label {
          margin-bottom: 5px;
          color: #98a2b3;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .job-value {
          color: #344054;
          font-size: 12px;
          font-weight: 600;
        }

        .job-amount {
          color: #101828;
          font-size: 13px;
          font-weight: 800;
        }

        .job-meta {
          margin-top: 4px;
          color: #667085;
          font-size: 11px;
        }

        .job-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 7px;
        }

        .job-status,
        .job-priority {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .job-status-pending {
          background: #f2f4f7;
          color: #475467;
        }

        .job-status-scheduled {
          background: #eff8ff;
          color: #175cd3;
        }

        .job-status-in_progress {
          background: #ecfdf3;
          color: #027a48;
        }

        .job-status-on_hold {
          background: #fffaeb;
          color: #b54708;
        }

        .job-status-completed {
          background: #ecfdf3;
          color: #027a48;
        }

        .job-status-cancelled {
          background: #fef3f2;
          color: #b42318;
        }

        .job-priority-low {
          background: #f2f4f7;
          color: #667085;
        }

        .job-priority-normal {
          background: #f2f4f7;
          color: #475467;
        }

        .job-priority-high {
          background: #fff4ed;
          color: #c4320a;
        }

        .job-priority-urgent {
          background: #fef3f2;
          color: #b42318;
        }

        .job-overdue {
          color: #b42318;
          font-weight: 800;
        }

        .job-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }

        .job-action {
          border: 1px solid #dfe3e8;
          background: #fff;
          color: #344054;
          border-radius: 7px;
          padding: 7px 9px;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.16s ease;
        }

        .job-action:hover {
          background: #f8fafc;
          border-color: #cfd5dd;
        }

        .job-action-primary {
          background: #111827;
          border-color: #111827;
          color: #fff;
        }

        .job-action-primary:hover {
          background: #1f2937;
        }

        .job-action-danger {
          color: #b42318;
          border-color: #f1c7c3;
        }

        /* JOB ACTIVITY */

        .job-activity-card {
          margin-top: 22px;
          border-top: 1px solid #edf0f4;
          padding-top: 20px;
        }

        .job-activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }

        .job-activity-header h3 {
          margin: 0;
          font-size: 15px;
          color: #101828;
        }

        .job-activity-header p {
          margin: 4px 0 0;
          color: #667085;
          font-size: 12px;
        }

        .job-activity-add {
          border: 1px solid #d9dee7;
          background: #fff;
          color: #344054;
          border-radius: 8px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .job-activity-form {
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 11px;
          background: #fafbfc;
          margin-bottom: 16px;
        }

        .job-activity-form-grid {
          display: grid;
          grid-template-columns:
            180px minmax(0, 1fr);
          gap: 12px;
        }

        .job-activity-form input,
        .job-activity-form select,
        .job-activity-form textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d9dee7;
          border-radius: 8px;
          background: #fff;
          color: #182230;
          padding: 9px 10px;
          font-size: 12px;
          outline: none;
        }

        .job-activity-form textarea {
          min-height: 80px;
          resize: vertical;
          margin-top: 10px;
        }

        .job-activity-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 10px;
        }

        .job-activity-list {
          position: relative;
          padding-left: 25px;
        }

        .job-activity-list::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 5px;
          bottom: 5px;
          width: 1px;
          background: #e4e7ec;
        }

        .job-activity-item {
          position: relative;
          padding-bottom: 17px;
        }

        .job-activity-item:last-child {
          padding-bottom: 0;
        }

        .job-activity-dot {
          position: absolute;
          left: -23px;
          top: 3px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #111827;
          border: 3px solid #fff;
          box-shadow: 0 0 0 1px #d9dee7;
        }

        .job-activity-content {
          padding: 12px 14px;
          border: 1px solid #e7e9ee;
          border-radius: 10px;
          background: #fff;
        }

        .job-activity-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .job-activity-title {
          color: #101828;
          font-size: 12px;
          font-weight: 800;
        }

        .job-activity-type {
          display: inline-flex;
          margin-left: 7px;
          padding: 3px 7px;
          border-radius: 999px;
          background: #f2f4f7;
          color: #667085;
          font-size: 9px;
          font-weight: 800;
        }

        .job-activity-date {
          color: #98a2b3;
          font-size: 10px;
          white-space: nowrap;
        }

        .job-activity-description {
          margin-top: 6px;
          color: #667085;
          font-size: 11px;
          line-height: 1.6;
        }

        .job-activity-status {
          margin-top: 7px;
          color: #667085;
          font-size: 10px;
        }

        .jobs-empty {
          padding: 55px 25px;
          text-align: center;
        }

        .jobs-empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #f2f4f7;
          color: #667085;
          font-size: 21px;
        }

        .jobs-empty strong {
          display: block;
          font-size: 15px;
        }

        .jobs-empty p {
          margin: 7px 0 0;
          color: #667085;
          font-size: 13px;
        }

        @media (max-width: 1150px) {
          .jobs-stats {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .job-main {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .job-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
            padding-top: 10px;
            border-top: 1px solid #edf0f4;
          }
        }

        @media (max-width: 760px) {
          .jobs-admin {
            padding: 18px 12px;
          }

          .jobs-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .jobs-header h1 {
            font-size: 27px;
          }

          .jobs-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .jobs-card-header {
            align-items: flex-start;
          }

          .jobs-form-grid {
            grid-template-columns: 1fr;
          }

          .jobs-field-full {
            grid-column: auto;
          }

          .jobs-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .jobs-search {
            max-width: none;
          }

          .job-main {
            grid-template-columns:
              1fr 1fr;
            gap: 14px;
          }

          .job-primary {
            grid-column: 1 / -1;
          }

          .job-activity-form-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 500px) {
          .jobs-stats {
            grid-template-columns:
              1fr 1fr;
            gap: 9px;
          }

          .jobs-stat {
            padding: 13px;
          }

          .jobs-stat-value {
            font-size: 21px;
          }

          .jobs-card-header {
            padding: 16px;
          }

          .jobs-form {
            padding: 16px;
          }

          .job-item {
            padding: 14px;
          }

          .job-main {
            grid-template-columns: 1fr;
          }

          .job-actions {
            grid-column: auto;
          }

          .job-action {
            flex: 1 1 auto;
          }

          .jobs-form-actions {
            flex-direction: column-reverse;
          }

          .jobs-form-actions .jobs-btn {
            width: 100%;
          }

          .job-activity-top {
            flex-direction: column;
          }
        }
      `}</style>

      {/* HEADER */}

      <div className="jobs-header">
        <div>
          <span className="jobs-eyebrow">
            PROJECT MANAGEMENT
          </span>

          <h1>
            Jobs
          </h1>

          <p>
            Track accepted work from assignment
            through completion.
          </p>
        </div>

        <button
          type="button"
          className="jobs-btn jobs-btn-primary"
          onClick={newJob}
        >
          + New Job
        </button>
      </div>

      {/* MESSAGE */}

      {message && (
        <div className="jobs-message">
          {message}
        </div>
      )}

      {/* STATS */}

      <div className="jobs-stats">

        <div className="jobs-stat">
          <div className="jobs-stat-label">
            Total Jobs
          </div>

          <div className="jobs-stat-value">
            {stats.total}
          </div>
        </div>

        <div className="jobs-stat">
          <div className="jobs-stat-label">
            Pending
          </div>

          <div className="jobs-stat-value">
            {stats.pending}
          </div>
        </div>

        <div className="jobs-stat">
          <div className="jobs-stat-label">
            Active
          </div>

          <div className="jobs-stat-value">
            {stats.active}
          </div>
        </div>

        <div className="jobs-stat">
          <div className="jobs-stat-label">
            Completed
          </div>

          <div className="jobs-stat-value">
            {stats.completed}
          </div>
        </div>

        <div className="jobs-stat">
          <div className="jobs-stat-label">
            Overdue
          </div>

          <div className="jobs-stat-value">
            {stats.overdue}
          </div>
        </div>

      </div>

      {/* CREATE / EDIT JOB */}

      <div className="jobs-card">

        <div className="jobs-card-header">

          <div>
            <h2>
              {form.id
                ? 'Edit Job'
                : 'Create Job'}
            </h2>

            <p>
              {form.id
                ? 'Update this job and keep the project information current.'
                : 'Create a job from a customer, service request or accepted quote.'}
            </p>
          </div>

          {form.id && (
            <button
              type="button"
              className="jobs-btn jobs-btn-secondary"
              onClick={newJob}
            >
              + New Job
            </button>
          )}

        </div>

        <form
          className="jobs-form"
          onSubmit={saveJob}
        >

          <div className="jobs-form-grid">

            <div className="jobs-field">
              <label>
                Job Number
              </label>

              <input
                value={
                  form.job_number
                }
                onChange={e =>
                  updateField(
                    'job_number',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="jobs-field">
              <label>
                Job Title
              </label>

              <input
                value={form.title}
                onChange={e =>
                  updateField(
                    'title',
                    e.target.value
                  )
                }
                placeholder="Website design project"
              />
            </div>

            <div className="jobs-field">
              <label>
                Customer
              </label>

              <select
                value={
                  form.customer_id
                }
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    customer_id:
                      e.target.value,
                    service_request_id:
                      '',
                    quote_id:
                      ''
                  }))
                }
              >
                <option value="">
                  Select customer
                </option>

                {customers.map(
                  customer => (
                    <option
                      key={
                        customer.id
                      }
                      value={
                        customer.id
                      }
                    >
                      {
                        customer.full_name
                      }

                      {customer.company_name
                        ? ` — ${customer.company_name}`
                        : ''}
                    </option>
                  )
                )}
              </select>

              {form.customer_id && (
                <div className="jobs-customer-preview">
                  <strong>
                    {
                      getCustomer(
                        form.customer_id
                      )?.full_name
                    }
                  </strong>

                  <span>
                    {
                      getCustomer(
                        form.customer_id
                      )?.company_name ||
                      getCustomer(
                        form.customer_id
                      )?.email ||
                      getCustomer(
                        form.customer_id
                      )?.phone ||
                      'Customer details available in CRM'
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="jobs-field">
              <label>
                Service Request
              </label>

              <select
                value={
                  form.service_request_id
                }
                onChange={e =>
                  handleRequestChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  No service request
                </option>

                {filteredRequests.map(
                  request => (
                    <option
                      key={request.id}
                      value={request.id}
                    >
                      {request.service_name ||
                        request.service ||
                        'Service Request'}
                    </option>
                  )
                )}
              </select>

              <small className="jobs-help">
                Only requests belonging to the selected
                customer are shown.
              </small>
            </div>

            <div className="jobs-field">
              <label>
                Quote
              </label>

              <select
                value={
                  form.quote_id
                }
                onChange={e =>
                  handleQuoteChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  No quote
                </option>

                {filteredQuotes.map(
                  quote => (
                    <option
                      key={quote.id}
                      value={quote.id}
                    >
                      {quote.quote_number ||
                        'Quote'}{' '}
                      —{' '}
                      {formatMoney(
                        quote.total,
                        quote.currency
                      )}
                    </option>
                  )
                )}
              </select>

              <small className="jobs-help">
                Linking a quote automatically links its
                customer and service request.
              </small>
            </div>

            <div className="jobs-field">
              <label>
                Assigned To
              </label>

              <select
                value={
                  form.assigned_to
                }
                onChange={e =>
                  updateField(
                    'assigned_to',
                    e.target.value
                  )
                }
              >
                <option value="">
                  Unassigned
                </option>

                {admins.map(
                  admin => (
                    <option
                      key={
                        admin.id ||
                        admin.user_id
                      }
                      value={
                        admin.id ||
                        admin.user_id
                      }
                    >
                      {admin.full_name ||
                        admin.email ||
                        'Administrator'}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="jobs-field">
              <label>
                Status
              </label>

              <select
                value={form.status}
                onChange={e =>
                  updateField(
                    'status',
                    e.target.value
                  )
                }
              >
                {statusOptions.map(
                  status => (
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

            <div className="jobs-field">
              <label>
                Priority
              </label>

              <select
                value={
                  form.priority
                }
                onChange={e =>
                  updateField(
                    'priority',
                    e.target.value
                  )
                }
              >
                {priorityOptions.map(
                  priority => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {formatPriority(
                        priority
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="jobs-field">
              <label>
                Agreed Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.agreed_amount
                }
                onChange={e =>
                  updateField(
                    'agreed_amount',
                    e.target.value
                  )
                }
                placeholder="0.00"
              />
            </div>

            <div className="jobs-field">
              <label>
                Currency
              </label>

              <select
                value={form.currency}
                onChange={e =>
                  updateField(
                    'currency',
                    e.target.value
                  )
                }
              >
                <option value="NGN">
                  NGN — Nigerian Naira
                </option>

                <option value="USD">
                  USD — US Dollar
                </option>

                <option value="GBP">
                  GBP — British Pound
                </option>

                <option value="EUR">
                  EUR — Euro
                </option>
              </select>
            </div>

            <div className="jobs-field">
              <label>
                Start Date
              </label>

              <input
                type="datetime-local"
                value={
                  form.start_date
                }
                onChange={e =>
                  updateField(
                    'start_date',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="jobs-field">
              <label>
                Due Date
              </label>

              <input
                type="datetime-local"
                value={
                  form.due_date
                }
                onChange={e =>
                  updateField(
                    'due_date',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="jobs-field">
              <label>
                Completion Date
              </label>

              <input
                type="datetime-local"
                value={
                  form.completed_at
                }
                onChange={e =>
                  updateField(
                    'completed_at',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="jobs-field jobs-field-full">
              <label>
                Job Description
              </label>

              <textarea
                value={
                  form.description
                }
                onChange={e =>
                  updateField(
                    'description',
                    e.target.value
                  )
                }
                placeholder="Describe the work that needs to be completed..."
              />
            </div>

            <div className="jobs-field jobs-field-full">
              <label>
                Internal Notes
              </label>

              <textarea
                value={form.notes}
                onChange={e =>
                  updateField(
                    'notes',
                    e.target.value
                  )
                }
                placeholder="Internal notes for your team..."
              />
            </div>

          </div>

          {/* JOB ACTIVITY */}

          {form.id && (
            <div className="job-activity-card">

              <div className="job-activity-header">

                <div>
                  <h3>
                    Job Activity
                  </h3>

                  <p>
                    Keep a timeline of updates,
                    status changes and team notes.
                  </p>
                </div>

                <button
                  type="button"
                  className="job-activity-add"
                  onClick={() =>
                    setShowActivityForm(
                      prev => !prev
                    )
                  }
                >
                  {showActivityForm
                    ? 'Close'
                    : '+ Add Activity'}
                </button>

              </div>

              {showActivityForm && (
                <form
                  className="job-activity-form"
                  onSubmit={
                    saveActivity
                  }
                >

                  <div className="job-activity-form-grid">

                    <select
                      value={
                        activityForm.activity_type
                      }
                      onChange={e =>
                        setActivityForm(
                          prev => ({
                            ...prev,
                            activity_type:
                              e.target.value
                          })
                        )
                      }
                    >
                      {activityTypes.map(
                        type => (
                          <option
                            key={type}
                            value={type}
                          >
                            {formatActivityType(
                              type
                            )}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      value={
                        activityForm.title
                      }
                      onChange={e =>
                        setActivityForm(
                          prev => ({
                            ...prev,
                            title:
                              e.target.value
                          })
                        )
                      }
                      placeholder="Activity title"
                    />

                  </div>

                  <textarea
                    value={
                      activityForm.description
                    }
                    onChange={e =>
                      setActivityForm(
                        prev => ({
                          ...prev,
                          description:
                            e.target.value
                        })
                      )
                    }
                    placeholder="Describe what happened..."
                  />

                  <div className="job-activity-form-actions">

                    <button
                      type="button"
                      className="jobs-btn jobs-btn-secondary"
                      onClick={() => {
                        setShowActivityForm(
                          false
                        );

                        setActivityForm(
                          emptyActivityForm
                        );
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="jobs-btn jobs-btn-primary"
                      disabled={
                        activitySaving
                      }
                    >
                      {activitySaving
                        ? 'Adding...'
                        : 'Add Activity'}
                    </button>

                  </div>

                </form>
              )}

              {activityLoading ? (
                <div className="jobs-empty">
                  <strong>
                    Loading activity...
                  </strong>
                </div>
              ) : activities.length === 0 ? (
                <div
                  style={{
                    padding:
                      '18px 0',
                    color:
                      '#667085',
                    fontSize:
                      '12px'
                  }}
                >
                  No activity has been
                  recorded for this job yet.
                </div>
              ) : (
                <div className="job-activity-list">

                  {activities.map(
                    activity => {

                      const creator =
                        getAdmin(
                          activity.created_by
                        );

                      return (
                        <div
                          key={
                            activity.id
                          }
                          className="job-activity-item"
                        >

                          <div className="job-activity-dot" />

                          <div className="job-activity-content">

                            <div className="job-activity-top">

                              <div>

                                <span className="job-activity-title">
                                  {
                                    activity.title
                                  }
                                </span>

                                <span className="job-activity-type">
                                  {formatActivityType(
                                    activity.activity_type
                                  )}
                                </span>

                              </div>

                              <span className="job-activity-date">
                                {formatDateTime(
                                  activity.created_at
                                )}
                              </span>

                            </div>

                            {activity.description && (
                              <div className="job-activity-description">
                                {
                                  activity.description
                                }
                              </div>
                            )}

                            {activity.old_status &&
                              activity.new_status && (
                                <div className="job-activity-status">
                                  Status:{' '}
                                  {formatStatus(
                                    activity.old_status
                                  )}
                                  {' → '}
                                  {formatStatus(
                                    activity.new_status
                                  )}
                                </div>
                              )}

                            {creator && (
                              <div className="job-activity-status">
                                By:{' '}
                                {creator.full_name ||
                                  creator.email ||
                                  'Administrator'}
                              </div>
                            )}

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>
          )}

          <div className="jobs-form-actions">

            {form.id && (
              <button
                type="button"
                className="jobs-btn jobs-btn-secondary"
                onClick={newJob}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="jobs-btn jobs-btn-primary"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : form.id
                  ? 'Update Job'
                  : 'Create Job'}
            </button>

          </div>

        </form>

      </div>

      {/* EXISTING JOBS */}

      <div className="jobs-card">

        <div className="jobs-card-header">

          <div>
            <h2>
              Existing Jobs
            </h2>

            <p>
              View and manage your active and
              completed jobs.
            </p>
          </div>

          <span className="jobs-count">
            {filteredJobs.length}{' '}
            {filteredJobs.length === 1
              ? 'job'
              : 'jobs'}
          </span>

        </div>

        <div className="jobs-toolbar">

          <div className="jobs-search">
            <input
              value={search}
              onChange={e =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search by job number, title or customer..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              All Statuses
            </option>

            {statusOptions.map(
              status => (
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

        {loading ? (
          <div className="jobs-empty">
            <strong>
              Loading jobs...
            </strong>

            <p>
              Please wait while your jobs are loaded.
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="jobs-empty">

            <div className="jobs-empty-icon">
              ✓
            </div>

            <strong>
              No jobs found
            </strong>

            <p>
              Create a job or adjust your search
              and status filter.
            </p>

          </div>
        ) : (
          <div className="jobs-list">

            {filteredJobs.map(
              job => {

                const customer =
                  getCustomer(
                    job.customer_id
                  );

                const assigned =
                  getAdmin(
                    job.assigned_to
                  );

                const overdue =
                  isOverdue(job);

                return (
                  <div
                    key={job.id}
                    className="job-item"
                  >

                    <div className="job-main">

                      {/* JOB */}

                      <div className="job-primary">

                        <div className="job-title-line">

                          <span className="job-title">
                            {job.title}
                          </span>

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

                        <div className="job-number">
                          {job.job_number}
                        </div>

                        <div className="job-badges">

                          <span
                            className={getPriorityClass(
                              job.priority
                            )}
                          >
                            Priority:{' '}
                            {formatPriority(
                              job.priority
                            )}
                          </span>

                        </div>

                      </div>

                      {/* CUSTOMER */}

                      <div>

                        <div className="job-label">
                          Customer
                        </div>

                        <div className="job-value">
                          {customer?.full_name ||
                            job.customer_name ||
                            'No customer'}
                        </div>

                        {customer?.company_name && (
                          <div className="job-meta">
                            {
                              customer.company_name
                            }
                          </div>
                        )}

                      </div>

                      {/* AMOUNT */}

                      <div>

                        <div className="job-label">
                          Amount
                        </div>

                        <div className="job-amount">
                          {formatMoney(
                            job.agreed_amount,
                            job.currency
                          )}
                        </div>

                      </div>

                      {/* ASSIGNED */}

                      <div>

                        <div className="job-label">
                          Assigned
                        </div>

                        <div className="job-value">
                          {assigned?.full_name ||
                            assigned?.email ||
                            'Unassigned'}
                        </div>

                      </div>

                      {/* DUE */}

                      <div>

                        <div className="job-label">
                          Due
                        </div>

                        <div
                          className={
                            overdue
                              ? 'job-value job-overdue'
                              : 'job-value'
                          }
                        >
                          {formatDate(
                            job.due_date
                          )}
                        </div>

                        {overdue && (
                          <div className="job-meta job-overdue">
                            Overdue
                          </div>
                        )}

                      </div>

                      {/* ACTIONS */}

                      <div className="job-actions">

                        {job.customer_id && (
                          <button
                            type="button"
                            className="job-action"
                            onClick={() =>
                              openCustomer(
                                job.customer_id
                              )
                            }
                          >
                            Customer
                          </button>
                        )}

                        {job.service_request_id && (
                          <button
                            type="button"
                            className="job-action"
                            onClick={() =>
                              openRequest(
                                job.service_request_id
                              )
                            }
                          >
                            Request
                          </button>
                        )}

                        {job.quote_id && (
                          <>
                            <button
                              type="button"
                              className="job-action"
                              onClick={() =>
                                openQuote(
                                  job.quote_id
                                )
                              }
                            >
                              Quote
                            </button>

                            <button
                              type="button"
                              className="job-action"
                              onClick={() =>
                                printQuote(
                                  job.quote_id
                                )
                              }
                            >
                              PDF
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          className="job-action"
                          onClick={() =>
                            editJob(job)
                          }
                        >
                          Activity
                        </button>

                        <button
                          type="button"
                          className="job-action"
                          onClick={() =>
                            editJob(job)
                          }
                        >
                          Edit
                        </button>

                        {job.status !==
                          'completed' &&
                          job.status !==
                            'cancelled' && (
                            <button
                              type="button"
                              className="job-action job-action-primary"
                              onClick={() =>
                                updateJobStatus(
                                  job,
                                  job.status ===
                                    'pending'
                                    ? 'scheduled'
                                    : 'completed'
                                )
                              }
                            >
                              {job.status ===
                              'pending'
                                ? 'Start'
                                : 'Complete'}
                            </button>
                          )}

                        <button
                          type="button"
                          className="job-action job-action-danger"
                          onClick={() =>
                            deleteJob(
                              job.id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

    </section>
  );
}