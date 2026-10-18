import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' },
];

const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const ACTIVITY_TYPES = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'follow_up', label: 'Follow-up' },
];

const leadStatusColors = {
  new: ['#eff6ff', '#1d4ed8', '#bfdbfe'],
  contacted: ['#fefce8', '#a16207', '#fde68a'],
  qualified: ['#ecfeff', '#0e7490', '#a5f3fc'],
  proposal: ['#f5f3ff', '#6d28d9', '#ddd6fe'],
  won: ['#ecfdf5', '#047857', '#a7f3d0'],
  lost: ['#fff1f2', '#be123c', '#fecdd3'],
};

const priorityColors = {
  low: ['#f8fafc', '#64748b', '#cbd5e1'],
  normal: ['#eff6ff', '#2563eb', '#bfdbfe'],
  high: ['#fff7ed', '#c2410c', '#fed7aa'],
  urgent: ['#fff1f2', '#be123c', '#fecdd3'],
};

const statusColors = {
  new: ['#eff6ff', '#1d4ed8', '#bfdbfe'],
  read: ['#f8fafc', '#475569', '#e2e8f0'],
  replied: ['#ecfdf5', '#047857', '#a7f3d0'],
  archived: ['#f8fafc', '#64748b', '#e2e8f0'],
};

function formatDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateOnly(date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(name) {
  if (!name) return '?';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function getLeadStatusLabel(status) {
  return (
    LEAD_STATUS_OPTIONS.find(
      (item) => item.value === status
    )?.label ||
    'New Lead'
  );
}

function getPriorityLabel(priority) {
  return (
    PRIORITY_OPTIONS.find(
      (item) => item.value === priority
    )?.label ||
    'Normal'
  );
}

function getStatusLabel(status) {
  return (
    STATUS_OPTIONS.find(
      (item) => item.value === status
    )?.label ||
    'New'
  );
}

function getFollowUpState(date) {
  if (!date) return 'none';

  const target = new Date(date);

  if (Number.isNaN(target.getTime())) {
    return 'none';
  }

  const now = new Date();

  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);

  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);

  if (target < startToday) return 'overdue';

  if (target >= startToday && target <= endToday) {
    return 'today';
  }

  return 'upcoming';
}

function Badge({ type, value }) {
  let colors;

  if (type === 'lead') {
    colors =
      leadStatusColors[value] ||
      leadStatusColors.new;
  }

  if (type === 'priority') {
    colors =
      priorityColors[value] ||
      priorityColors.normal;
  }

  if (type === 'status') {
    colors =
      statusColors[value] ||
      statusColors.read;
  }

  const labels = {
    lead: getLeadStatusLabel(value),
    priority: getPriorityLabel(value),
    status: getStatusLabel(value),
  };

  return (
    <span
      className="cm-badge"
      style={{
        background: colors[0],
        color: colors[1],
        borderColor: colors[2],
      }}
    >
      {type === 'priority' && (
        <span
          className="cm-priority-dot"
          style={{ background: colors[1] }}
        />
      )}

      {labels[type]}
    </span>
  );
}

function FollowUpBadge({ date }) {
  const state = getFollowUpState(date);

  if (state === 'none') return null;

  const config = {
    overdue: {
      label: 'Overdue',
      background: '#fff1f2',
      color: '#be123c',
      border: '#fecdd3',
    },
    today: {
      label: 'Today',
      background: '#fff7ed',
      color: '#c2410c',
      border: '#fed7aa',
    },
    upcoming: {
      label: 'Upcoming',
      background: '#eff6ff',
      color: '#2563eb',
      border: '#bfdbfe',
    },
  }[state];

  return (
    <span
      className="cm-followup"
      style={{
        background: config.background,
        color: config.color,
        borderColor: config.border,
      }}
    >
      {config.label}
    </span>
  );
}

function Icon({ children, size = 18 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

export default function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] =
    useState(false);
  const [activitiesLoading, setActivitiesLoading] =
    useState(false);

  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leadFilter, setLeadFilter] = useState('all');
  const [followUpFilter, setFollowUpFilter] =
    useState('all');
  const [priorityFilter, setPriorityFilter] =
    useState('all');
  const [sourceFilter, setSourceFilter] =
    useState('all');

  const [adminNotes, setAdminNotes] = useState('');
  const [leadStatus, setLeadStatus] = useState('new');
  const [followUpDate, setFollowUpDate] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [priority, setPriority] = useState('normal');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [creatingRequest, setCreatingRequest] =
    useState(false);

  const [activityType, setActivityType] = useState('note');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] =
    useState('');
  const [addingActivity, setAddingActivity] =
    useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadMessages() {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      console.error(loadError);
      setError(loadError.message);
      setMessages([]);
      setLoading(false);
      return;
    }

    setMessages(data || []);
    setLoading(false);
  }

  async function loadCustomers() {
    setCustomersLoading(true);

    const { data, error: customerError } =
      await supabase
        .from('crm_customers')
        .select(
          'id, full_name, email, phone, whatsapp, company_name, status'
        )
        .order('full_name', {
          ascending: true,
        });

    if (customerError) {
      console.error(customerError);
      setError(customerError.message);
      setCustomers([]);
    } else {
      setCustomers(data || []);
    }

    setCustomersLoading(false);
  }

  async function loadActivities(messageId) {
    if (!messageId) return;

    setActivitiesLoading(true);

    const { data, error: activityError } =
      await supabase
        .from('crm_lead_activities')
        .select('*')
        .eq('contact_message_id', messageId)
        .order('created_at', {
          ascending: false,
        });

    if (activityError) {
      console.error(activityError);
      setError(activityError.message);
      setActivities([]);
    } else {
      setActivities(data || []);
    }

    setActivitiesLoading(false);
  }

  useEffect(() => {
    loadMessages();
    loadCustomers();
  }, []);

  const availableSources = useMemo(() => {
    return Array.from(
      new Set(
        messages
          .map((message) =>
            String(message.source || '').trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [messages]);

  const activeLeadMessages = useMemo(() => {
    return messages.filter(
      (item) =>
        !['won', 'lost'].includes(
          String(item.lead_status || 'new').toLowerCase()
        )
    );
  }, [messages]);

  const matchesSearch = (message) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      message.name,
      message.email,
      message.phone,
      message.subject,
      message.message,
      message.source,
      message.lead_status,
      message.priority,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value)
          .toLowerCase()
          .includes(query)
      );
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const messageLeadStatus =
        message.lead_status || 'new';

      const messagePriority =
        message.priority || 'normal';

      const messageSource =
        String(message.source || '').trim();

      const matchesStatus =
        statusFilter === 'all' ||
        message.status === statusFilter;

      const matchesLead =
        leadFilter === 'all' ||
        messageLeadStatus === leadFilter;

      const matchesPriority =
        priorityFilter === 'all' ||
        messagePriority === priorityFilter;

      const matchesFollowUp =
        followUpFilter === 'all' ||
        getFollowUpState(message.follow_up_date) ===
          followUpFilter;

      const matchesSource =
        sourceFilter === 'all' ||
        messageSource === sourceFilter;

      return (
        matchesStatus &&
        matchesLead &&
        matchesPriority &&
        matchesFollowUp &&
        matchesSource &&
        matchesSearch(message)
      );
    });
  }, [
    messages,
    search,
    statusFilter,
    leadFilter,
    followUpFilter,
    priorityFilter,
    sourceFilter,
  ]);

  const displayedMessages = useMemo(() => {
    if (leadFilter !== 'active') {
      return filteredMessages;
    }

    return activeLeadMessages.filter((message) => {
      const matchesStatus =
        statusFilter === 'all' ||
        message.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'all' ||
        (message.priority || 'normal') ===
          priorityFilter;

      const matchesFollowUp =
        followUpFilter === 'all' ||
        getFollowUpState(message.follow_up_date) ===
          followUpFilter;

      const matchesSource =
        sourceFilter === 'all' ||
        String(message.source || '').trim() ===
          sourceFilter;

      return (
        matchesStatus &&
        matchesPriority &&
        matchesFollowUp &&
        matchesSource &&
        matchesSearch(message)
      );
    });
  }, [
    filteredMessages,
    activeLeadMessages,
    leadFilter,
    search,
    statusFilter,
    priorityFilter,
    followUpFilter,
    sourceFilter,
  ]);

  const stats = useMemo(() => {
    return {
      total: messages.length,

      new: messages.filter(
        (item) => item.status === 'new'
      ).length,

      leads: activeLeadMessages.length,

      qualified: messages.filter(
        (item) => item.lead_status === 'qualified'
      ).length,

      proposal: messages.filter(
        (item) => item.lead_status === 'proposal'
      ).length,

      won: messages.filter(
        (item) => item.lead_status === 'won'
      ).length,

      overdue: messages.filter(
        (item) =>
          getFollowUpState(item.follow_up_date) ===
          'overdue'
      ).length,

      today: messages.filter(
        (item) =>
          getFollowUpState(item.follow_up_date) ===
          'today'
      ).length,

      urgent: messages.filter(
        (item) =>
          (item.priority || 'normal') === 'urgent'
      ).length,
    };
  }, [messages, activeLeadMessages]);

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setLeadFilter('all');
    setFollowUpFilter('all');
    setPriorityFilter('all');
    setSourceFilter('all');
  }

  function applyStatFilter(type) {
    clearFilters();

    if (type === 'new') {
      setStatusFilter('new');
    }

    if (type === 'leads') {
      setLeadFilter('active');
    }

    if (type === 'qualified') {
      setLeadFilter('qualified');
    }

    if (type === 'proposal') {
      setLeadFilter('proposal');
    }

    if (type === 'won') {
      setLeadFilter('won');
    }

    if (type === 'overdue') {
      setFollowUpFilter('overdue');
    }

    if (type === 'today') {
      setFollowUpFilter('today');
    }

    if (type === 'urgent') {
      setPriorityFilter('urgent');
    }
  }

  function openMessage(message) {
    setSelectedMessage(message);

    setAdminNotes(message.admin_notes || '');
    setLeadStatus(message.lead_status || 'new');
    setLeadSource(message.source || '');
    setCustomerId(message.customer_id || '');
    setPriority(message.priority || 'normal');

    setFollowUpDate(
      message.follow_up_date
        ? new Date(message.follow_up_date)
            .toISOString()
            .slice(0, 16)
        : ''
    );

    setActivities([]);
    setActivityType('note');
    setActivityTitle('');
    setActivityDescription('');
    setError('');
    setSuccess('');

    loadActivities(message.id);
  }

  function closeMessage() {
    setSelectedMessage(null);
    setAdminNotes('');
    setLeadStatus('new');
    setFollowUpDate('');
    setLeadSource('');
    setCustomerId('');
    setPriority('normal');
    setActivities([]);
    setActivityTitle('');
    setActivityDescription('');
    setError('');
    setSuccess('');
  }

  async function saveMessage() {
    if (!selectedMessage) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const updatePayload = {
      status: selectedMessage.status,
      admin_notes: adminNotes.trim() || null,
      lead_status: leadStatus || 'new',
      follow_up_date: followUpDate
        ? new Date(followUpDate).toISOString()
        : null,
      source: leadSource.trim() || null,
      customer_id: customerId || null,
      priority: priority || 'normal',
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } =
      await supabase
        .from('contact_messages')
        .update(updatePayload)
        .eq('id', selectedMessage.id)
        .select()
        .single();

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === selectedMessage.id ? data : item
      )
    );

    setSelectedMessage(data);
    setAdminNotes(data.admin_notes || '');
    setLeadStatus(data.lead_status || 'new');
    setLeadSource(data.source || '');
    setCustomerId(data.customer_id || '');
    setPriority(data.priority || 'normal');

    setFollowUpDate(
      data.follow_up_date
        ? new Date(data.follow_up_date)
            .toISOString()
            .slice(0, 16)
        : ''
    );

    setSuccess('Lead information saved.');
    setSaving(false);
  }

  async function markAsRead() {
    if (!selectedMessage) return;

    const { data, error: updateError } =
      await supabase
        .from('contact_messages')
        .update({
          status: 'read',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedMessage.id)
        .select()
        .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === selectedMessage.id ? data : item
      )
    );

    setSelectedMessage(data);
    setSuccess('Message marked as read.');
  }

  async function deleteMessage() {
    if (!selectedMessage) return;

    if (
      !window.confirm(
        'Delete this contact message? This cannot be undone.'
      )
    ) {
      return;
    }

    setDeleting(true);
    setError('');
    setSuccess('');

    const { error: deleteError } =
      await supabase
        .from('contact_messages')
        .delete()
        .eq('id', selectedMessage.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setMessages((current) =>
      current.filter(
        (item) => item.id !== selectedMessage.id
      )
    );

    closeMessage();
    setDeleting(false);
  }

  async function convertToCustomer() {
    if (!selectedMessage) return;

    setConverting(true);
    setError('');
    setSuccess('');

    try {
      const normalizedEmail =
        selectedMessage.email?.trim().toLowerCase() ||
        null;

      const normalizedPhone =
        selectedMessage.phone?.trim() || null;

      let existingCustomer = null;

      if (normalizedEmail) {
        const { data } = await supabase
          .from('crm_customers')
          .select('*')
          .ilike('email', normalizedEmail)
          .limit(1)
          .maybeSingle();

        existingCustomer = data || null;
      }

      if (!existingCustomer && normalizedPhone) {
        const { data } = await supabase
          .from('crm_customers')
          .select('*')
          .eq('phone', normalizedPhone)
          .limit(1)
          .maybeSingle();

        existingCustomer = data || null;
      }

      let customer = existingCustomer;

      if (!customer) {
        const { data, error: insertError } =
          await supabase
            .from('crm_customers')
            .insert({
              full_name: selectedMessage.name.trim(),
              email: normalizedEmail,
              phone: normalizedPhone,
              whatsapp:
                selectedMessage.whatsapp ||
                normalizedPhone,
              status: 'prospect',
              notes:
                selectedMessage.admin_notes ||
                'Created from website contact message.',
            })
            .select()
            .single();

        if (insertError) {
          throw insertError;
        }

        customer = data;

        setCustomers((current) =>
          [...current, customer].sort((a, b) =>
            String(a.full_name || '').localeCompare(
              String(b.full_name || '')
            )
          )
        );
      }

      const { data: updatedMessage, error: messageError } =
        await supabase
          .from('contact_messages')
          .update({
            customer_id: customer.id,
            lead_status: 'qualified',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedMessage.id)
          .select()
          .single();

      if (messageError) {
        throw messageError;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === selectedMessage.id
            ? updatedMessage
            : item
        )
      );

      setSelectedMessage(updatedMessage);
      setCustomerId(customer.id);
      setLeadStatus('qualified');

      await supabase
        .from('crm_lead_activities')
        .insert({
          contact_message_id: selectedMessage.id,
          customer_id: customer.id,
          activity_type: 'note',
          title: existingCustomer
            ? 'Linked to existing customer'
            : 'Converted to CRM customer',
          description: existingCustomer
            ? `This lead was linked to ${customer.full_name}.`
            : `Created CRM customer ${customer.full_name} from this contact message.`,
        });

      await loadActivities(selectedMessage.id);

      setSuccess(
        existingCustomer
          ? 'Lead linked to existing customer.'
          : 'Lead converted to CRM customer.'
      );
    } catch (conversionError) {
      setError(
        conversionError.message ||
          'Unable to convert this lead.'
      );
    }

    setConverting(false);
  }

  async function addActivity() {
    if (!selectedMessage) return;

    if (!activityTitle.trim()) {
      setError('Please enter an activity title.');
      return;
    }

    setAddingActivity(true);
    setError('');
    setSuccess('');

    const { data, error: activityError } =
      await supabase
        .from('crm_lead_activities')
        .insert({
          contact_message_id: selectedMessage.id,
          customer_id: customerId || null,
          activity_type: activityType,
          title: activityTitle.trim(),
          description:
            activityDescription.trim() || null,
        })
        .select()
        .single();

    if (activityError) {
      setError(activityError.message);
      setAddingActivity(false);
      return;
    }

    setActivities((current) => [data, ...current]);
    setActivityTitle('');
    setActivityDescription('');
    setActivityType('note');
    setSuccess('Activity added.');
    setAddingActivity(false);
  }

  async function createServiceRequest() {
    if (!selectedMessage) return;

    setCreatingRequest(true);
    setError('');
    setSuccess('');

    try {
      let linkedCustomerId = customerId || null;

      if (!linkedCustomerId) {
        await convertToCustomer();

        const { data: refreshedMessage } =
          await supabase
            .from('contact_messages')
            .select('*')
            .eq('id', selectedMessage.id)
            .single();

        linkedCustomerId =
          refreshedMessage?.customer_id ||
          customerId ||
          null;
      }

      const serviceRequestPayload = {
        name: selectedMessage.name.trim(),

        phone:
          selectedMessage.phone?.trim() ||
          selectedMessage.whatsapp?.trim() ||
          'Not provided',

        email:
          selectedMessage.email?.trim() || null,

        service:
          selectedMessage.subject?.trim() ||
          'General Service',

        description:
          selectedMessage.message.trim(),

        customer_id: linkedCustomerId,

        customer_name:
          selectedMessage.name.trim(),

        whatsapp:
          selectedMessage.whatsapp?.trim() ||
          selectedMessage.phone?.trim() ||
          null,

        source: 'Contact Message',

        status: 'New',
      };

      const { data, error: requestError } =
        await supabase
          .from('service_requests')
          .insert(serviceRequestPayload)
          .select()
          .single();

      if (requestError) {
        throw requestError;
      }

      await supabase
        .from('crm_lead_activities')
        .insert({
          contact_message_id: selectedMessage.id,
          customer_id: linkedCustomerId,
          activity_type: 'service_request',
          title: 'Service request created',
          description: `Service request ${data.id} was created from this contact message.`,
        });

      await loadActivities(selectedMessage.id);

      setSuccess(
        'Service request created successfully.'
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          'Unable to create service request.'
      );
    }

    setCreatingRequest(false);
  }

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== 'all' ||
    leadFilter !== 'all' ||
    followUpFilter !== 'all' ||
    priorityFilter !== 'all' ||
    sourceFilter !== 'all';

  return (
    <>
      <style>{`
        .cm-page {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 30px 28px 60px;
        }

        .cm-container {
          max-width: 1320px;
          margin: 0 auto;
        }

        .cm-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 28px;
        }

        .cm-eyebrow {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.6px;
          margin-bottom: 8px;
        }

        .cm-title {
          margin: 0;
          color: #0f172a;
          font-size: 32px;
          line-height: 1.15;
          letter-spacing: -0.7px;
        }

        .cm-subtitle {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .cm-refresh {
          border: 1px solid #dbe1ea;
          background: #fff;
          color: #1e293b;
          border-radius: 10px;
          padding: 11px 15px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 7px rgba(15,23,42,.04);
        }

        .cm-refresh:hover {
          background: #f8fafc;
        }

        .cm-stats {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 20px;
        }

        .cm-stat {
          appearance: none;
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 14px;
          padding: 17px;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(15,23,42,.035);
          transition: .18s ease;
        }

        .cm-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(15,23,42,.07);
          border-color: #cbd5e1;
        }

        .cm-stat-label {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 9px;
        }

        .cm-stat-value {
          font-size: 27px;
          line-height: 1;
          font-weight: 850;
          color: #0f172a;
        }

        .cm-stat-foot {
          margin-top: 9px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 600;
        }

        .cm-panel {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(15,23,42,.045);
        }

        .cm-filters {
          padding: 15px;
          margin-bottom: 17px;
        }

        .cm-filter-row {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .cm-search {
          flex: 1 1 300px;
          min-width: 200px;
          position: relative;
        }

        .cm-search input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dbe1ea;
          border-radius: 10px;
          padding: 11px 13px 11px 38px;
          outline: none;
          font-size: 13px;
          color: #1e293b;
          background: #fff;
        }

        .cm-search input:focus,
        .cm-select:focus,
        .cm-input:focus,
        .cm-textarea:focus {
          border-color: #94a3b8;
          box-shadow: 0 0 0 3px rgba(148,163,184,.13);
        }

        .cm-search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .cm-select {
          min-width: 145px;
          border: 1px solid #dbe1ea;
          border-radius: 10px;
          padding: 11px 12px;
          background: #fff;
          color: #334155;
          font-size: 13px;
          outline: none;
        }

        .cm-filter-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 11px;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
        }

        .cm-results {
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }

        .cm-clear {
          border: 0;
          background: transparent;
          color: #2563eb;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .cm-alert {
          padding: 12px 14px;
          border-radius: 11px;
          margin-bottom: 15px;
          font-size: 13px;
          border: 1px solid;
        }

        .cm-alert-error {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .cm-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 17px 19px;
          border-bottom: 1px solid #edf1f5;
        }

        .cm-list-title {
          margin: 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
        }

        .cm-list-count {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
        }

        .cm-list {
          display: grid;
        }

        .cm-message {
          padding: 18px 19px;
          border-bottom: 1px solid #eef2f6;
          cursor: pointer;
          transition: background .15s ease;
          position: relative;
        }

        .cm-message:last-child {
          border-bottom: 0;
        }

        .cm-message:hover {
          background: #fbfcfe;
        }

        .cm-message-inner {
          display: flex;
          gap: 14px;
        }

        .cm-avatar {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg,#e0ecff,#eef4ff);
          color: #2457a6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 850;
        }

        .cm-message-main {
          min-width: 0;
          flex: 1;
        }

        .cm-message-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .cm-name {
          margin: 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
        }

        .cm-contact {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 11px;
        }

        .cm-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }

        .cm-date {
          color: #94a3b8;
          font-size: 10px;
          margin-right: 3px;
        }

        .cm-badge,
        .cm-followup {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 1px solid;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .cm-priority-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .cm-subject {
          margin-top: 11px;
          color: #334155;
          font-size: 13px;
          font-weight: 750;
        }

        .cm-message-preview {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .cm-bottom {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 11px;
        }

        .cm-source {
          padding: 4px 8px;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .cm-empty {
          padding: 70px 20px;
          text-align: center;
        }

        .cm-empty-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: #64748b;
          font-size: 25px;
        }

        .cm-empty h3 {
          margin: 0 0 6px;
          color: #0f172a;
          font-size: 16px;
        }

        .cm-empty p {
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .cm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,.58);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
        }

        .cm-drawer {
          width: min(720px, 100%);
          height: 100%;
          background: #f8fafc;
          overflow-y: auto;
          box-shadow: -15px 0 45px rgba(15,23,42,.2);
        }

        .cm-drawer-head {
          position: sticky;
          top: 0;
          z-index: 5;
          padding: 18px 21px;
          background: rgba(255,255,255,.97);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #e2e8f0;
        }

        .cm-drawer-head-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .cm-drawer-kicker {
          color: #64748b;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.3px;
          margin-bottom: 6px;
        }

        .cm-drawer-title {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
          letter-spacing: -.3px;
        }

        .cm-close {
          width: 34px;
          height: 34px;
          border: 1px solid #dbe1ea;
          border-radius: 9px;
          background: #fff;
          color: #64748b;
          cursor: pointer;
          font-size: 18px;
        }

        .cm-close:hover {
          background: #f1f5f9;
        }

        .cm-drawer-body {
          padding: 19px;
        }

        .cm-section {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 15px;
          box-shadow: 0 2px 9px rgba(15,23,42,.025);
        }

        .cm-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 13px;
        }

        .cm-section-title {
          margin: 0;
          color: #0f172a;
          font-size: 13px;
          font-weight: 850;
        }

        .cm-section-subtitle {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.5;
        }

        .cm-person {
          display: flex;
          gap: 12px;
          align-items: center;
          padding-bottom: 14px;
          margin-bottom: 14px;
          border-bottom: 1px solid #eef2f6;
        }

        .cm-person-avatar {
          width: 48px;
          height: 48px;
          border-radius: 13px;
          background: #e0ecff;
          color: #2457a6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 850;
        }

        .cm-person-name {
          color: #0f172a;
          font-size: 15px;
          font-weight: 800;
        }

        .cm-person-caption {
          color: #94a3b8;
          font-size: 11px;
          margin-top: 2px;
        }

        .cm-contact-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px;
        }

        .cm-contact-item label {
          display: block;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: .8px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .cm-contact-item span {
          color: #334155;
          font-size: 12px;
          word-break: break-word;
        }

        .cm-actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }

        .cm-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          padding: 9px 12px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
        }

        .cm-action.email {
          background: #eef2ff;
          color: #3730a3;
        }

        .cm-action.call {
          background: #f0fdf4;
          color: #166534;
        }

        .cm-action.whatsapp {
          background: #ecfdf5;
          color: #047857;
        }

        .cm-form-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 12px;
        }

        .cm-field label {
          display: block;
          color: #475569;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .cm-input,
        .cm-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dbe1ea;
          border-radius: 9px;
          padding: 10px 11px;
          background: #fff;
          color: #334155;
          font-family: inherit;
          font-size: 12px;
          outline: none;
        }

        .cm-textarea {
          resize: vertical;
          line-height: 1.55;
        }

        .cm-full {
          grid-column: 1 / -1;
        }

        .cm-followup-info {
          margin-top: 11px;
          padding: 9px 11px;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
          font-weight: 700;
        }

        .cm-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 13px;
        }

        .cm-btn {
          border: 1px solid #dbe1ea;
          border-radius: 9px;
          padding: 9px 12px;
          background: #fff;
          color: #334155;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .cm-btn.primary {
          background: #0f172a;
          border-color: #0f172a;
          color: #fff;
        }

        .cm-btn.blue {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }

        .cm-btn.green {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #047857;
        }

        .cm-btn.danger {
          background: #fff1f2;
          border-color: #fecdd3;
          color: #be123c;
        }

        .cm-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .cm-message-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 14px;
          color: #334155;
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .cm-note-help {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 10px;
        }

        .cm-activity-form {
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          margin-bottom: 12px;
        }

        .cm-activity-row {
          display: grid;
          grid-template-columns: 125px 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }

        .cm-activity-list {
          display: grid;
          gap: 8px;
        }

        .cm-activity {
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
        }

        .cm-activity-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .cm-activity-type {
          color: #64748b;
          font-size: 9px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .8px;
        }

        .cm-activity-title {
          margin-top: 3px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 800;
        }

        .cm-activity-date {
          color: #94a3b8;
          font-size: 9px;
          white-space: nowrap;
        }

        .cm-activity-description {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .cm-drawer-footer {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
        }

        .cm-success {
          padding: 10px 12px;
          border-radius: 9px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        @media (max-width: 1100px) {
          .cm-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 760px) {
          .cm-page {
            padding: 22px 14px 45px;
          }

          .cm-header {
            align-items: flex-start;
          }

          .cm-title {
            font-size: 27px;
          }

          .cm-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .cm-message-top {
            display: block;
          }

          .cm-meta {
            justify-content: flex-start;
            margin-top: 9px;
          }

          .cm-contact-grid,
          .cm-form-grid {
            grid-template-columns: 1fr;
          }

          .cm-full {
            grid-column: auto;
          }

          .cm-activity-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .cm-stats {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .cm-stat {
            padding: 13px;
          }

          .cm-stat-value {
            font-size: 23px;
          }

          .cm-message {
            padding: 15px 13px;
          }

          .cm-message-inner {
            gap: 10px;
          }

          .cm-avatar {
            width: 38px;
            height: 38px;
            min-width: 38px;
            border-radius: 10px;
          }

          .cm-drawer-body {
            padding: 13px;
          }

          .cm-drawer-head {
            padding: 15px;
          }
        }
      `}</style>

      <div className="cm-page">
        <div className="cm-container">

          {/* HEADER */}
          <div className="cm-header">
            <div>
              <div className="cm-eyebrow">
                CRM / COMMUNICATION
              </div>

              <h1 className="cm-title">
                Contact Messages
              </h1>

              <p className="cm-subtitle">
                Manage enquiries, follow-ups and customer
                conversations from one place.
              </p>
            </div>

            <button
              type="button"
              className="cm-refresh"
              onClick={loadMessages}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

          {/* STATS */}
          <div className="cm-stats">
            {[
              {
                label: 'Total Messages',
                value: stats.total,
                color: '#0f172a',
                filter: 'all',
              },
              {
                label: 'New',
                value: stats.new,
                color: '#2563eb',
                filter: 'new',
              },
              {
                label: 'Active Leads',
                value: stats.leads,
                color: '#7c3aed',
                filter: 'leads',
              },
              {
                label: 'Qualified',
                value: stats.qualified,
                color: '#0891b2',
                filter: 'qualified',
              },
              {
                label: 'Proposal',
                value: stats.proposal,
                color: '#7c3aed',
                filter: 'proposal',
              },
              {
                label: 'Won',
                value: stats.won,
                color: '#059669',
                filter: 'won',
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="cm-stat"
                onClick={() => {
                  if (item.filter === 'all') {
                    clearFilters();
                  } else {
                    applyStatFilter(item.filter);
                  }
                }}
              >
                <div className="cm-stat-label">
                  {item.label}
                </div>

                <div
                  className="cm-stat-value"
                  style={{ color: item.color }}
                >
                  {item.value}
                </div>

                <div className="cm-stat-foot">
                  Click to filter
                </div>
              </button>
            ))}
          </div>

          {/* FILTERS */}
          <div className="cm-panel cm-filters">
            <div className="cm-filter-row">

              <div className="cm-search">
                <span className="cm-search-icon">
                  <Icon size={15}>⌕</Icon>
                </span>

                <input
                  type="search"
                  placeholder="Search name, email, phone, source or message..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </div>

              <select
                className="cm-select"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="all">
                  All Messages
                </option>

                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="cm-select"
                value={leadFilter}
                onChange={(e) =>
                  setLeadFilter(e.target.value)
                }
              >
                <option value="all">
                  All Lead Stages
                </option>

                <option value="active">
                  All Active Leads
                </option>

                {LEAD_STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="cm-select"
                value={followUpFilter}
                onChange={(e) =>
                  setFollowUpFilter(e.target.value)
                }
              >
                <option value="all">
                  All Follow-ups
                </option>
                <option value="overdue">
                  Overdue
                </option>
                <option value="today">
                  Today
                </option>
                <option value="upcoming">
                  Upcoming
                </option>
                <option value="none">
                  No Follow-up
                </option>
              </select>

              <select
                className="cm-select"
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value)
                }
              >
                <option value="all">
                  All Priorities
                </option>

                {PRIORITY_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="cm-select"
                value={sourceFilter}
                onChange={(e) =>
                  setSourceFilter(e.target.value)
                }
              >
                <option value="all">
                  All Sources
                </option>

                {availableSources.map((source) => (
                  <option
                    key={source}
                    value={source}
                  >
                    {source}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <div className="cm-filter-footer">
                <span className="cm-results">
                  Showing {displayedMessages.length} of{' '}
                  {messages.length} messages
                </span>

                <button
                  type="button"
                  className="cm-clear"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="cm-alert cm-alert-error">
              {error}
            </div>
          )}

          {/* LIST */}
          <div className="cm-panel">

            <div className="cm-list-header">
              <h2 className="cm-list-title">
                Enquiries
              </h2>

              <span className="cm-list-count">
                {displayedMessages.length} result
                {displayedMessages.length === 1
                  ? ''
                  : 's'}
              </span>
            </div>

            {loading ? (
              <div className="cm-empty">
                <div className="cm-empty-icon">
                  …
                </div>

                <h3>
                  Loading messages
                </h3>

                <p>
                  Getting the latest enquiries from your
                  database.
                </p>
              </div>
            ) : displayedMessages.length === 0 ? (
              <div className="cm-empty">
                <div className="cm-empty-icon">
                  ✉
                </div>

                <h3>
                  No messages found
                </h3>

                <p>
                  Try changing your filters or search term.
                </p>
              </div>
            ) : (
              <div className="cm-list">
                {displayedMessages.map((message) => {
                  const messagePriority =
                    message.priority || 'normal';

                  return (
                    <div
                      key={message.id}
                      className="cm-message"
                      onClick={() =>
                        openMessage(message)
                      }
                    >
                      <div className="cm-message-inner">

                        <div className="cm-avatar">
                          {getInitials(message.name)}
                        </div>

                        <div className="cm-message-main">

                          <div className="cm-message-top">

                            <div>
                              <h3 className="cm-name">
                                {message.name}
                              </h3>

                              <div className="cm-contact">
                                {message.email ||
                                  'No email'}

                                {message.phone
                                  ? ` • ${message.phone}`
                                  : ''}
                              </div>
                            </div>

                            <div className="cm-meta">
                              <span className="cm-date">
                                {formatDate(
                                  message.created_at
                                )}
                              </span>

                              <Badge
                                type="status"
                                value={
                                  message.status ||
                                  'new'
                                }
                              />

                              <Badge
                                type="lead"
                                value={
                                  message.lead_status ||
                                  'new'
                                }
                              />

                              <Badge
                                type="priority"
                                value={messagePriority}
                              />
                            </div>
                          </div>

                          <div className="cm-subject">
                            {message.subject ||
                              'General enquiry'}
                          </div>

                          <p className="cm-message-preview">
                            {message.message}
                          </p>

                          <div className="cm-bottom">

                            <FollowUpBadge
                              date={
                                message.follow_up_date
                              }
                            />

                            {message.follow_up_date && (
                              <span
                                style={{
                                  color: '#64748b',
                                  fontSize: '10px',
                                }}
                              >
                                Follow-up:{' '}
                                {formatDateOnly(
                                  message.follow_up_date
                                )}
                              </span>
                            )}

                            {message.source && (
                              <span className="cm-source">
                                {message.source}
                              </span>
                            )}

                            {message.customer_id && (
                              <span className="cm-source">
                                CRM Customer
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {selectedMessage && (
        <div
          className="cm-overlay"
          onClick={closeMessage}
        >
          <aside
            className="cm-drawer"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="cm-drawer-head">
              <div className="cm-drawer-head-row">

                <div>
                  <div className="cm-drawer-kicker">
                    MESSAGE DETAILS
                  </div>

                  <h2 className="cm-drawer-title">
                    {selectedMessage.subject ||
                      'General enquiry'}
                  </h2>

                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginTop: '9px',
                    }}
                  >
                    <Badge
                      type="lead"
                      value={
                        selectedMessage.lead_status ||
                        'new'
                      }
                    />

                    <Badge
                      type="priority"
                      value={
                        selectedMessage.priority ||
                        'normal'
                      }
                    />

                    <Badge
                      type="status"
                      value={
                        selectedMessage.status ||
                        'new'
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="cm-close"
                  onClick={closeMessage}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="cm-drawer-body">

              {/* CONTACT */}
              <div className="cm-section">

                <div className="cm-person">
                  <div className="cm-person-avatar">
                    {getInitials(
                      selectedMessage.name
                    )}
                  </div>

                  <div>
                    <div className="cm-person-name">
                      {selectedMessage.name}
                    </div>

                    <div className="cm-person-caption">
                      Website enquiry
                    </div>
                  </div>
                </div>

                <div className="cm-contact-grid">

                  <div className="cm-contact-item">
                    <label>Email</label>
                    <span>
                      {selectedMessage.email || '—'}
                    </span>
                  </div>

                  <div className="cm-contact-item">
                    <label>Phone</label>
                    <span>
                      {selectedMessage.phone || '—'}
                    </span>
                  </div>

                  <div className="cm-contact-item">
                    <label>Source</label>
                    <span>
                      {selectedMessage.source ||
                        'Website'}
                    </span>
                  </div>

                  <div className="cm-contact-item">
                    <label>Received</label>
                    <span>
                      {formatDate(
                        selectedMessage.created_at
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="cm-actions">

                {selectedMessage.email && (
                  <a
                    className="cm-action email"
                    href={`mailto:${selectedMessage.email}`}
                  >
                    ✉ Email
                  </a>
                )}

                {selectedMessage.phone && (
                  <a
                    className="cm-action call"
                    href={`tel:${selectedMessage.phone}`}
                  >
                    ☎ Call
                  </a>
                )}

                {selectedMessage.phone && (
                  <a
                    className="cm-action whatsapp"
                    href={`https://wa.me/${selectedMessage.phone.replace(
                      /\D/g,
                      ''
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
              </div>

              {/* LEAD MANAGEMENT */}
              <div className="cm-section">

                <div className="cm-section-head">
                  <div>
                    <h3 className="cm-section-title">
                      Lead Management
                    </h3>

                    <p className="cm-section-subtitle">
                      Track the enquiry through your sales
                      process.
                    </p>
                  </div>

                  <Badge
                    type="lead"
                    value={leadStatus}
                  />
                </div>

                <div className="cm-form-grid">

                  <div className="cm-field">
                    <label>
                      Lead Status
                    </label>

                    <select
                      className="cm-input"
                      value={leadStatus}
                      onChange={(e) =>
                        setLeadStatus(
                          e.target.value
                        )
                      }
                    >
                      {LEAD_STATUS_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="cm-field">
                    <label>
                      Priority
                    </label>

                    <select
                      className="cm-input"
                      value={priority}
                      onChange={(e) =>
                        setPriority(
                          e.target.value
                        )
                      }
                    >
                      {PRIORITY_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="cm-field">
                    <label>
                      Follow-up Date
                    </label>

                    <input
                      type="datetime-local"
                      className="cm-input"
                      value={followUpDate}
                      onChange={(e) =>
                        setFollowUpDate(
                          e.target.value
                        )
                      }
                    />

                    {followUpDate && (
                      <button
                        type="button"
                        onClick={() =>
                          setFollowUpDate('')
                        }
                        style={{
                          border: 0,
                          background:
                            'transparent',
                          padding: 0,
                          marginTop: 5,
                          color: '#be123c',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Clear follow-up
                      </button>
                    )}
                  </div>

                  <div className="cm-field">
                    <label>
                      Lead Source
                    </label>

                    <input
                      className="cm-input"
                      value={leadSource}
                      onChange={(e) =>
                        setLeadSource(
                          e.target.value
                        )
                      }
                      placeholder="Website, referral..."
                    />
                  </div>

                  <div className="cm-field cm-full">
                    <label>
                      CRM Customer
                    </label>

                    <select
                      className="cm-input"
                      value={customerId}
                      disabled={customersLoading}
                      onChange={(e) =>
                        setCustomerId(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        {customersLoading
                          ? 'Loading customers...'
                          : 'Not linked'}
                      </option>

                      {customers.map(
                        (customer) => (
                          <option
                            key={customer.id}
                            value={customer.id}
                          >
                            {customer.full_name}
                            {customer.company_name
                              ? ` — ${customer.company_name}`
                              : ''}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {followUpDate && (
                  <div className="cm-followup-info">
                    Follow-up scheduled for{' '}
                    {formatDate(followUpDate)}
                  </div>
                )}

                <div className="cm-buttons">

                  <button
                    type="button"
                    className="cm-btn blue"
                    onClick={convertToCustomer}
                    disabled={converting}
                  >
                    {converting
                      ? 'Processing...'
                      : customerId
                      ? 'Link Customer'
                      : 'Convert to Customer'}
                  </button>

                  <button
                    type="button"
                    className="cm-btn green"
                    onClick={createServiceRequest}
                    disabled={creatingRequest}
                  >
                    {creatingRequest
                      ? 'Creating...'
                      : 'Create Service Request'}
                  </button>
                </div>
              </div>

              {/* MESSAGE */}
              <div className="cm-section">

                <div className="cm-section-head">
                  <div>
                    <h3 className="cm-section-title">
                      Customer Message
                    </h3>

                    <p className="cm-section-subtitle">
                      Original enquiry submitted through
                      the website.
                    </p>
                  </div>
                </div>

                <div className="cm-message-box">
                  {selectedMessage.message}
                </div>
              </div>

              {/* STATUS */}
              <div className="cm-section">

                <div className="cm-field">
                  <label>
                    Message Status
                  </label>

                  <select
                    className="cm-input"
                    value={selectedMessage.status}
                    onChange={(e) =>
                      setSelectedMessage(
                        (current) => ({
                          ...current,
                          status:
                            e.target.value,
                        })
                      )
                    }
                  >
                    {STATUS_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* NOTES */}
              <div className="cm-section">

                <div className="cm-section-head">
                  <div>
                    <h3 className="cm-section-title">
                      Internal Notes
                    </h3>

                    <p className="cm-section-subtitle">
                      Private information for your team.
                    </p>
                  </div>
                </div>

                <textarea
                  className="cm-textarea"
                  rows="5"
                  placeholder="Add private notes about this enquiry..."
                  value={adminNotes}
                  onChange={(e) =>
                    setAdminNotes(
                      e.target.value
                    )
                  }
                />

                <p className="cm-note-help">
                  These notes are not shown to the customer.
                </p>
              </div>

              {/* ACTIVITY */}
              <div className="cm-section">

                <div className="cm-section-head">
                  <div>
                    <h3 className="cm-section-title">
                      Lead Activity
                    </h3>

                    <p className="cm-section-subtitle">
                      Record calls, notes, emails and
                      follow-ups.
                    </p>
                  </div>

                  <span className="cm-list-count">
                    {activities.length} activities
                  </span>
                </div>

                <div className="cm-activity-form">

                  <div className="cm-activity-row">

                    <select
                      className="cm-input"
                      value={activityType}
                      onChange={(e) =>
                        setActivityType(
                          e.target.value
                        )
                      }
                    >
                      {ACTIVITY_TYPES.map(
                        (type) => (
                          <option
                            key={type.value}
                            value={type.value}
                          >
                            {type.label}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      className="cm-input"
                      placeholder="Activity title..."
                      value={activityTitle}
                      onChange={(e) =>
                        setActivityTitle(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <textarea
                    className="cm-textarea"
                    rows="3"
                    placeholder="Add details..."
                    value={activityDescription}
                    onChange={(e) =>
                      setActivityDescription(
                        e.target.value
                      )
                    }
                  />

                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="cm-btn primary"
                      onClick={addActivity}
                      disabled={addingActivity}
                    >
                      {addingActivity
                        ? 'Adding...'
                        : '+ Add Activity'}
                    </button>
                  </div>
                </div>

                {activitiesLoading ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 11,
                    }}
                  >
                    Loading activity...
                  </div>
                ) : activities.length === 0 ? (
                  <div
                    style={{
                      padding: 18,
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: 9,
                      color: '#94a3b8',
                      fontSize: 11,
                    }}
                  >
                    No activity recorded yet.
                  </div>
                ) : (
                  <div className="cm-activity-list">
                    {activities.map(
                      (activity) => (
                        <div
                          key={activity.id}
                          className="cm-activity"
                        >
                          <div className="cm-activity-top">

                            <div>
                              <div className="cm-activity-type">
                                {activity.activity_type}
                              </div>

                              <div className="cm-activity-title">
                                {activity.title}
                              </div>
                            </div>

                            <span className="cm-activity-date">
                              {formatDate(
                                activity.created_at
                              )}
                            </span>
                          </div>

                          {activity.description && (
                            <p className="cm-activity-description">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {success && (
                <div className="cm-success">
                  {success}
                </div>
              )}

              {/* FOOTER ACTIONS */}
              <div className="cm-drawer-footer">

                <button
                  type="button"
                  className="cm-btn primary"
                  style={{ flex: '1 1 180px' }}
                  onClick={saveMessage}
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>

                {selectedMessage.status === 'new' && (
                  <button
                    type="button"
                    className="cm-btn"
                    onClick={markAsRead}
                  >
                    Mark as Read
                  </button>
                )}

                <button
                  type="button"
                  className="cm-btn danger"
                  onClick={deleteMessage}
                  disabled={deleting}
                >
                  {deleting
                    ? 'Deleting...'
                    : 'Delete'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}