import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

const PIPELINE_STAGES = [
  {
    key: 'new',
    label: 'New',
    description: 'New enquiries',
    accent: '#2563eb'
  },
  {
    key: 'contacted',
    label: 'Contacted',
    description: 'Customer contacted',
    accent: '#0891b2'
  },
  {
    key: 'qualified',
    label: 'Qualified',
    description: 'Potential customer',
    accent: '#7c3aed'
  },
  {
    key: 'proposal',
    label: 'Proposal',
    description: 'Proposal or quote sent',
    accent: '#d97706'
  },
  {
    key: 'won',
    label: 'Won',
    description: 'Customer accepted',
    accent: '#16a34a'
  },
  {
    key: 'lost',
    label: 'Lost',
    description: 'Lead closed',
    accent: '#dc2626'
  }
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' }
];

function formatDate(value) {
  if (!value) return 'No date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No date';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return 'No date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No date';
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getPriorityLabel(priority) {
  const found = PRIORITY_OPTIONS.find(
    item => item.value === priority
  );

  return found?.label || 'Normal';
}

function getPriorityClass(priority) {
  switch (priority) {
    case 'urgent':
      return 'pipeline-priority urgent';

    case 'high':
      return 'pipeline-priority high';

    case 'low':
      return 'pipeline-priority low';

    default:
      return 'pipeline-priority normal';
  }
}

function getFollowUpState(dateValue) {
  if (!dateValue) {
    return {
      label: 'No follow-up',
      className: 'followup none'
    };
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return {
      label: 'No follow-up',
      className: 'followup none'
    };
  }

  const now = new Date();

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(
    tomorrowStart.getDate() + 1
  );

  if (date < todayStart) {
    return {
      label: 'Overdue',
      className: 'followup overdue'
    };
  }

  if (date < tomorrowStart) {
    return {
      label: 'Today',
      className: 'followup today'
    };
  }

  return {
    label: formatDate(dateValue),
    className: 'followup upcoming'
  };
}

function getStageInfo(stage) {
  return (
    PIPELINE_STAGES.find(
      item => item.key === stage
    ) || PIPELINE_STAGES[0]
  );
}

function initials(name) {
  if (!name) return '?';

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

export default function SalesPipeline() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] =
    useState('all');
  const [sourceFilter, setSourceFilter] =
    useState('all');
  const [stageFilter, setStageFilter] =
    useState('all');

  const [selectedLead, setSelectedLead] =
    useState(null);

  const [savingStage, setSavingStage] =
    useState(false);

  const [message, setMessage] = useState('');

  async function loadMessages(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from('contact_messages')
      .select(`
        id,
        name,
        email,
        phone,
        message,
        status,
        lead_status,
        follow_up_date,
        assigned_to,
        customer_id,
        source,
        priority,
        admin_notes,
        created_at,
        updated_at
      `)
      .order('created_at', {
        ascending: false
      });

    if (error) {
      setMessage(error.message);
      setMessages([]);
    } else {
      setMessages(data || []);

      if (selectedLead) {
        const updatedSelected = (data || []).find(
          item => item.id === selectedLead.id
        );

        if (updatedSelected) {
          setSelectedLead(updatedSelected);
        }
      }
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadMessages();
  }, []);

  const sources = useMemo(() => {
    return Array.from(
      new Set(
        messages
          .map(item => item.source)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return messages.filter(item => {
      const matchesSearch =
        !query ||
        item.name
          ?.toLowerCase()
          .includes(query) ||
        item.email
          ?.toLowerCase()
          .includes(query) ||
        item.phone
          ?.toLowerCase()
          .includes(query) ||
        item.message
          ?.toLowerCase()
          .includes(query) ||
        item.source
          ?.toLowerCase()
          .includes(query);

      const matchesPriority =
        priorityFilter === 'all' ||
        (item.priority || 'normal') ===
          priorityFilter;

      const matchesSource =
        sourceFilter === 'all' ||
        item.source === sourceFilter;

      const matchesStage =
        stageFilter === 'all' ||
        (item.lead_status || 'new') ===
          stageFilter;

      return (
        matchesSearch &&
        matchesPriority &&
        matchesSource &&
        matchesStage
      );
    });
  }, [
    messages,
    search,
    priorityFilter,
    sourceFilter,
    stageFilter
  ]);

  const stageCounts = useMemo(() => {
    const counts = {};

    PIPELINE_STAGES.forEach(stage => {
      counts[stage.key] = 0;
    });

    messages.forEach(item => {
      const stage =
        item.lead_status || 'new';

      if (counts[stage] !== undefined) {
        counts[stage] += 1;
      }
    });

    return counts;
  }, [messages]);

  const overdueCount = useMemo(() => {
    return messages.filter(item => {
      if (!item.follow_up_date) return false;

      const date = new Date(
        item.follow_up_date
      );

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return date < new Date();
    }).length;
  }, [messages]);

  const urgentCount = useMemo(() => {
    return messages.filter(
      item =>
        (item.priority || 'normal') ===
        'urgent'
    ).length;
  }, [messages]);

  const activeLeadCount = useMemo(() => {
    return messages.filter(item => {
      const stage =
        item.lead_status || 'new';

      return !['won', 'lost'].includes(stage);
    }).length;
  }, [messages]);

  const hasFilters =
    search.trim() ||
    priorityFilter !== 'all' ||
    sourceFilter !== 'all' ||
    stageFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setPriorityFilter('all');
    setSourceFilter('all');
    setStageFilter('all');
  }

  function getStageLeads(stageKey) {
    return filteredMessages.filter(
      item =>
        (item.lead_status || 'new') ===
        stageKey
    );
  }

  async function updateLeadStage(
    lead,
    newStage
  ) {
    if (
      !lead ||
      !newStage ||
      lead.lead_status === newStage
    ) {
      return;
    }

    setSavingStage(true);
    setMessage('');

    const { error } = await supabase
      .from('contact_messages')
      .update({
        lead_status: newStage,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (error) {
      setMessage(error.message);
      setSavingStage(false);
      return;
    }

    setMessages(prev =>
      prev.map(item =>
        item.id === lead.id
          ? {
              ...item,
              lead_status: newStage,
              updated_at:
                new Date().toISOString()
            }
          : item
      )
    );

    setSelectedLead(prev =>
      prev?.id === lead.id
        ? {
            ...prev,
            lead_status: newStage,
            updated_at:
              new Date().toISOString()
          }
        : prev
    );

    setMessage(
      `Lead moved to ${getStageInfo(
        newStage
      ).label}.`
    );

    setSavingStage(false);
  }

  function openLead(lead) {
    setSelectedLead(lead);
    setMessage('');
  }

  function closeLead() {
    setSelectedLead(null);
  }

  return (
    <section className="sales-pipeline-page">

      <style>{`
        .sales-pipeline-page {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding-bottom: 50px;
        }

        .pipeline-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }

        .pipeline-header-copy {
          max-width: 760px;
        }

        .pipeline-header-copy h2 {
          margin: 6px 0 8px;
          font-size: 32px;
          line-height: 1.15;
          letter-spacing: -0.8px;
        }

        .pipeline-header-copy p {
          margin: 0;
          color: #667085;
          font-size: 15px;
          line-height: 1.6;
        }

        .pipeline-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .pipeline-refresh {
          min-width: 110px;
        }

        .pipeline-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 16px;
          margin-bottom: 20px;
          border: 1px solid #dbe3ef;
          border-radius: 12px;
          background: #fff;
          color: #344054;
          font-size: 14px;
        }

        .pipeline-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .pipeline-stat {
          position: relative;
          overflow: hidden;
          min-height: 118px;
          padding: 18px 20px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 4px 18px rgba(16, 24, 40, 0.045);
        }

        .pipeline-stat::after {
          content: "";
          position: absolute;
          width: 80px;
          height: 80px;
          right: -30px;
          bottom: -35px;
          border-radius: 50%;
          background: #f5f7fa;
        }

        .pipeline-stat-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #667085;
          font-size: 13px;
          font-weight: 600;
        }

        .pipeline-stat-number {
          margin-top: 9px;
          color: #101828;
          font-size: 28px;
          line-height: 1;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .pipeline-stat-meta {
          margin-top: 10px;
          color: #98a2b3;
          font-size: 12px;
        }

        .pipeline-stat-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }

        .pipeline-stat-blue {
          color: #2563eb;
        }

        .pipeline-stat-purple {
          color: #7c3aed;
        }

        .pipeline-stat-green {
          color: #16a34a;
        }

        .pipeline-stat-red {
          color: #dc2626;
        }

        .pipeline-filter-card {
          margin-bottom: 22px;
          padding: 17px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 4px 18px rgba(16, 24, 40, 0.04);
        }

        .pipeline-filter-row {
          display: grid;
          grid-template-columns:
            minmax(250px, 1.7fr)
            repeat(3, minmax(150px, 0.7fr))
            auto;
          gap: 10px;
          align-items: center;
        }

        .pipeline-search {
          position: relative;
        }

        .pipeline-search input,
        .pipeline-select {
          width: 100%;
          height: 44px;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          background: #fff;
          color: #101828;
          font-size: 14px;
          outline: none;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .pipeline-search input {
          padding: 0 14px 0 40px;
        }

        .pipeline-select {
          padding: 0 12px;
        }

        .pipeline-search input:focus,
        .pipeline-select:focus {
          border-color: #98a2b3;
          box-shadow:
            0 0 0 3px rgba(16, 24, 40, 0.05);
        }

        .pipeline-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #98a2b3;
          font-size: 15px;
          pointer-events: none;
        }

        .pipeline-clear {
          height: 44px;
          padding: 0 14px;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          background: #fff;
          color: #475467;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .pipeline-clear:hover {
          background: #f9fafb;
        }

        .pipeline-board-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .pipeline-board-header h3 {
          margin: 0;
          color: #101828;
          font-size: 17px;
        }

        .pipeline-board-header span {
          color: #667085;
          font-size: 13px;
        }

        .pipeline-board {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(270px, 1fr));
          gap: 14px;
          overflow-x: auto;
          padding: 2px 2px 14px;
          align-items: start;
        }

        .pipeline-column {
          min-width: 270px;
          min-height: 540px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #f8fafc;
          overflow: hidden;
        }

        .pipeline-column-header {
          padding: 15px 15px 13px;
          background: #fff;
          border-top: 3px solid var(--stage-accent);
          border-bottom: 1px solid #e5e7eb;
        }

        .pipeline-column-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .pipeline-column-title strong {
          color: #101828;
          font-size: 14px;
        }

        .pipeline-column-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 25px;
          height: 25px;
          padding: 0 7px;
          border-radius: 999px;
          background: #f2f4f7;
          color: #344054;
          font-size: 12px;
          font-weight: 700;
        }

        .pipeline-column-description {
          margin-top: 5px;
          color: #98a2b3;
          font-size: 11px;
        }

        .pipeline-column-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 11px;
        }

        .pipeline-lead-card {
          border: 1px solid #e4e7ec;
          border-radius: 13px;
          background: #fff;
          box-shadow:
            0 2px 8px rgba(16, 24, 40, 0.035);
          cursor: pointer;
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            border-color 0.16s ease;
          overflow: hidden;
        }

        .pipeline-lead-card:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
          box-shadow:
            0 8px 20px rgba(16, 24, 40, 0.08);
        }

        .pipeline-lead-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          padding: 13px 13px 8px;
        }

        .pipeline-person {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .pipeline-avatar {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #eef2ff;
          color: #3730a3;
          font-size: 11px;
          font-weight: 800;
        }

        .pipeline-person-info {
          min-width: 0;
        }

        .pipeline-person-name {
          overflow: hidden;
          color: #101828;
          font-size: 13px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pipeline-person-contact {
          margin-top: 2px;
          overflow: hidden;
          color: #98a2b3;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pipeline-priority {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }

        .pipeline-priority.urgent {
          background: #fef2f2;
          color: #b42318;
        }

        .pipeline-priority.high {
          background: #fff7ed;
          color: #c2410c;
        }

        .pipeline-priority.normal {
          background: #f2f4f7;
          color: #475467;
        }

        .pipeline-priority.low {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .pipeline-message-preview {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          min-height: 43px;
          overflow: hidden;
          margin: 4px 13px 10px;
          color: #475467;
          font-size: 11px;
          line-height: 1.55;
        }

        .pipeline-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 0 13px 11px;
        }

        .pipeline-meta-item {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          padding: 4px 7px;
          border-radius: 7px;
          background: #f8fafc;
          color: #667085;
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pipeline-meta-item.followup-overdue {
          background: #fef2f2;
          color: #b42318;
          font-weight: 700;
        }

        .pipeline-meta-item.followup-today {
          background: #fffaeb;
          color: #b54708;
          font-weight: 700;
        }

        .pipeline-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 9px 13px;
          border-top: 1px solid #f0f2f5;
          background: #fcfcfd;
        }

        .pipeline-card-date {
          color: #98a2b3;
          font-size: 9px;
        }

        .pipeline-stage-select {
          max-width: 120px;
          height: 29px;
          padding: 0 7px;
          border: 1px solid #d0d5dd;
          border-radius: 7px;
          background: #fff;
          color: #344054;
          font-size: 10px;
          cursor: pointer;
        }

        .pipeline-empty {
          padding: 40px 14px;
          text-align: center;
          color: #98a2b3;
        }

        .pipeline-empty-icon {
          width: 42px;
          height: 42px;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #f2f4f7;
          color: #667085;
          font-size: 18px;
        }

        .pipeline-empty strong {
          display: block;
          margin-bottom: 4px;
          color: #475467;
          font-size: 12px;
        }

        .pipeline-empty span {
          font-size: 11px;
          line-height: 1.5;
        }

        .pipeline-drawer-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(16, 24, 40, 0.35);
          backdrop-filter: blur(2px);
        }

        .pipeline-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: min(500px, 94vw);
          height: 100vh;
          overflow-y: auto;
          background: #fff;
          box-shadow:
            -12px 0 40px rgba(16, 24, 40, 0.14);
          z-index: 1001;
        }

        .pipeline-drawer-header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px;
          border-bottom: 1px solid #eaecf0;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(8px);
        }

        .pipeline-drawer-person {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .pipeline-drawer-avatar {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #eef2ff;
          color: #3730a3;
          font-size: 13px;
          font-weight: 800;
        }

        .pipeline-drawer-name {
          color: #101828;
          font-size: 16px;
          font-weight: 750;
        }

        .pipeline-drawer-subtitle {
          margin-top: 3px;
          color: #98a2b3;
          font-size: 11px;
        }

        .pipeline-close {
          width: 34px;
          height: 34px;
          border: 1px solid #e4e7ec;
          border-radius: 9px;
          background: #fff;
          color: #667085;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }

        .pipeline-close:hover {
          background: #f9fafb;
        }

        .pipeline-drawer-content {
          padding: 20px;
        }

        .pipeline-drawer-section {
          margin-bottom: 22px;
        }

        .pipeline-drawer-section:last-child {
          margin-bottom: 0;
        }

        .pipeline-drawer-section-title {
          margin-bottom: 9px;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .pipeline-contact-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .pipeline-contact-item {
          min-width: 0;
          padding: 11px 12px;
          border: 1px solid #eaecf0;
          border-radius: 10px;
          background: #f9fafb;
        }

        .pipeline-contact-label {
          margin-bottom: 4px;
          color: #98a2b3;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pipeline-contact-value {
          overflow: hidden;
          color: #344054;
          font-size: 12px;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pipeline-drawer-stage {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .pipeline-drawer-stage select {
          width: 100%;
          height: 43px;
          padding: 0 12px;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          background: #fff;
          color: #101828;
          font-size: 13px;
        }

        .pipeline-enquiry {
          padding: 14px;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #f9fafb;
          color: #475467;
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .pipeline-notes {
          padding: 14px;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #fff;
          color: #667085;
          font-size: 12px;
          line-height: 1.6;
        }

        .pipeline-drawer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 18px;
          border-top: 1px solid #eaecf0;
        }

        .pipeline-created {
          color: #98a2b3;
          font-size: 10px;
        }

        @media (max-width: 1100px) {
          .pipeline-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .pipeline-filter-row {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .pipeline-search {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 720px) {
          .pipeline-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .pipeline-header-copy h2 {
            font-size: 26px;
          }

          .pipeline-header-actions {
            width: 100%;
          }

          .pipeline-refresh {
            width: 100%;
          }

          .pipeline-summary {
            grid-template-columns: 1fr 1fr;
          }

          .pipeline-filter-row {
            grid-template-columns: 1fr;
          }

          .pipeline-search {
            grid-column: auto;
          }

          .pipeline-clear {
            width: 100%;
          }

          .pipeline-contact-grid {
            grid-template-columns: 1fr;
          }

          .pipeline-board {
            grid-template-columns:
              repeat(6, minmax(255px, 255px));
          }
        }

        @media (max-width: 460px) {
          .pipeline-summary {
            grid-template-columns: 1fr;
          }

          .pipeline-stat {
            min-height: 105px;
          }
        }
      `}</style>

      <div className="pipeline-header">

        <div className="pipeline-header-copy">

          <span className="eyebrow">
            SALES & CRM
          </span>

          <h2>
            Sales Pipeline
          </h2>

          <p>
            Track enquiries from first contact
            through qualification, proposal,
            conversion and closure.
          </p>

        </div>

        <div className="pipeline-header-actions">

          <button
            type="button"
            className="btn secondary pipeline-refresh"
            onClick={() => loadMessages(true)}
            disabled={refreshing}
          >
            {refreshing
              ? 'Refreshing…'
              : 'Refresh'}
          </button>

        </div>

      </div>

      {message && (
        <div className="pipeline-alert">
          <strong>Update:</strong>
          <span>{message}</span>
        </div>
      )}

      {/* SUMMARY */}

      <div className="pipeline-summary">

        <div className="pipeline-stat">
          <div className="pipeline-stat-label pipeline-stat-blue">
            <span>Total Leads</span>
            <span className="pipeline-stat-dot" />
          </div>

          <div className="pipeline-stat-number">
            {messages.length}
          </div>

          <div className="pipeline-stat-meta">
            All enquiries in your CRM
          </div>
        </div>

        <div className="pipeline-stat">
          <div className="pipeline-stat-label pipeline-stat-purple">
            <span>Active Leads</span>
            <span className="pipeline-stat-dot" />
          </div>

          <div className="pipeline-stat-number">
            {activeLeadCount}
          </div>

          <div className="pipeline-stat-meta">
            Leads not yet won or lost
          </div>
        </div>

        <div className="pipeline-stat">
          <div className="pipeline-stat-label pipeline-stat-green">
            <span>Won</span>
            <span className="pipeline-stat-dot" />
          </div>

          <div className="pipeline-stat-number">
            {stageCounts.won || 0}
          </div>

          <div className="pipeline-stat-meta">
            Converted customers
          </div>
        </div>

        <div className="pipeline-stat">
          <div className="pipeline-stat-label pipeline-stat-red">
            <span>Attention Needed</span>
            <span className="pipeline-stat-dot" />
          </div>

          <div className="pipeline-stat-number">
            {overdueCount + urgentCount}
          </div>

          <div className="pipeline-stat-meta">
            {overdueCount} overdue · {urgentCount}{' '}
            urgent
          </div>
        </div>

      </div>

      {/* FILTERS */}

      <div className="pipeline-filter-card">

        <div className="pipeline-filter-row">

          <div className="pipeline-search">

            <span className="pipeline-search-icon">
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
              placeholder="Search leads, email, phone or enquiry..."
            />

          </div>

          <select
            className="pipeline-select"
            value={stageFilter}
            onChange={e =>
              setStageFilter(e.target.value)
            }
          >
            <option value="all">
              All stages
            </option>

            {PIPELINE_STAGES.map(stage => (
              <option
                key={stage.key}
                value={stage.key}
              >
                {stage.label} (
                {stageCounts[stage.key] || 0})
              </option>
            ))}
          </select>

          <select
            className="pipeline-select"
            value={priorityFilter}
            onChange={e =>
              setPriorityFilter(e.target.value)
            }
          >
            <option value="all">
              All priorities
            </option>

            {PRIORITY_OPTIONS.map(option => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="pipeline-select"
            value={sourceFilter}
            onChange={e =>
              setSourceFilter(e.target.value)
            }
          >
            <option value="all">
              All sources
            </option>

            {sources.map(source => (
              <option
                key={source}
                value={source}
              >
                {source}
              </option>
            ))}
          </select>

          {hasFilters ? (
            <button
              type="button"
              className="pipeline-clear"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          ) : (
            <div />
          )}

        </div>

      </div>

      {/* BOARD */}

      <div className="pipeline-board-header">

        <div>
          <h3>
            Lead Board
          </h3>
        </div>

        <span>
          Showing {filteredMessages.length} of{' '}
          {messages.length} leads
        </span>

      </div>

      {loading ? (
        <div className="admin-card">
          <p>
            Loading sales pipeline...
          </p>
        </div>
      ) : (
        <div className="pipeline-board">

          {PIPELINE_STAGES.map(stage => {

            const stageLeads =
              getStageLeads(stage.key);

            return (
              <div
                key={stage.key}
                className="pipeline-column"
                style={{
                  '--stage-accent':
                    stage.accent
                }}
              >

                <div className="pipeline-column-header">

                  <div className="pipeline-column-title">

                    <strong>
                      {stage.label}
                    </strong>

                    <span className="pipeline-column-count">
                      {stageCounts[
                        stage.key
                      ] || 0}
                    </span>

                  </div>

                  <div className="pipeline-column-description">
                    {stage.description}
                  </div>

                </div>

                <div className="pipeline-column-body">

                  {stageLeads.length === 0 ? (
                    <div className="pipeline-empty">

                      <div className="pipeline-empty-icon">
                        —
                      </div>

                      <strong>
                        No leads here
                      </strong>

                      <span>
                        Leads moved to this stage
                        will appear here.
                      </span>

                    </div>
                  ) : (
                    stageLeads.map(lead => {

                      const followUp =
                        getFollowUpState(
                          lead.follow_up_date
                        );

                      return (
                        <div
                          key={lead.id}
                          className="pipeline-lead-card"
                          onClick={() =>
                            openLead(lead)
                          }
                        >

                          <div className="pipeline-lead-top">

                            <div className="pipeline-person">

                              <div className="pipeline-avatar">
                                {initials(
                                  lead.name
                                )}
                              </div>

                              <div className="pipeline-person-info">

                                <div className="pipeline-person-name">
                                  {lead.name ||
                                    'Unnamed lead'}
                                </div>

                                <div className="pipeline-person-contact">
                                  {lead.email ||
                                    lead.phone ||
                                    'No contact details'}
                                </div>

                              </div>

                            </div>

                            <span
                              className={getPriorityClass(
                                lead.priority
                              )}
                            >
                              {getPriorityLabel(
                                lead.priority
                              )}
                            </span>

                          </div>

                          <div className="pipeline-message-preview">
                            {lead.message ||
                              'No enquiry message provided.'}
                          </div>

                          <div className="pipeline-meta">

                            {lead.source && (
                              <span className="pipeline-meta-item">
                                {lead.source}
                              </span>
                            )}

                            <span
                              className={
                                `pipeline-meta-item ${
                                  followUp.className.includes(
                                    'overdue'
                                  )
                                    ? 'followup-overdue'
                                    : followUp.className.includes(
                                        'today'
                                      )
                                      ? 'followup-today'
                                      : ''
                                }`
                              }
                            >
                              {followUp.label}
                            </span>

                            {lead.assigned_to && (
                              <span className="pipeline-meta-item">
                                Assigned
                              </span>
                            )}

                            {lead.customer_id && (
                              <span className="pipeline-meta-item">
                                CRM customer
                              </span>
                            )}

                          </div>

                          <div
                            className="pipeline-card-footer"
                            onClick={e =>
                              e.stopPropagation()
                            }
                          >

                            <span className="pipeline-card-date">
                              {formatDate(
                                lead.created_at
                              )}
                            </span>

                            <select
                              className="pipeline-stage-select"
                              value={
                                lead.lead_status ||
                                'new'
                              }
                              onChange={e =>
                                updateLeadStage(
                                  lead,
                                  e.target.value
                                )
                              }
                              disabled={savingStage}
                              aria-label="Change lead stage"
                            >
                              {PIPELINE_STAGES.map(
                                option => (
                                  <option
                                    key={
                                      option.key
                                    }
                                    value={
                                      option.key
                                    }
                                  >
                                    {option.label}
                                  </option>
                                )
                              )}
                            </select>

                          </div>

                        </div>
                      );
                    })
                  )}

                </div>

              </div>
            );
          })}

        </div>
      )}

      {/* DETAIL DRAWER */}

      {selectedLead && (
        <>
          <div
            className="pipeline-drawer-overlay"
            onClick={closeLead}
          />

          <aside className="pipeline-drawer">

            <div className="pipeline-drawer-header">

              <div className="pipeline-drawer-person">

                <div className="pipeline-drawer-avatar">
                  {initials(
                    selectedLead.name
                  )}
                </div>

                <div>
                  <div className="pipeline-drawer-name">
                    {selectedLead.name ||
                      'Unnamed lead'}
                  </div>

                  <div className="pipeline-drawer-subtitle">
                    Lead details
                  </div>
                </div>

              </div>

              <button
                type="button"
                className="pipeline-close"
                onClick={closeLead}
                aria-label="Close lead details"
              >
                ×
              </button>

            </div>

            <div className="pipeline-drawer-content">

              {/* CONTACT */}

              <div className="pipeline-drawer-section">

                <div className="pipeline-drawer-section-title">
                  Contact
                </div>

                <div className="pipeline-contact-grid">

                  <div className="pipeline-contact-item">

                    <div className="pipeline-contact-label">
                      Email
                    </div>

                    <div className="pipeline-contact-value">
                      {selectedLead.email ||
                        'Not provided'}
                    </div>

                  </div>

                  <div className="pipeline-contact-item">

                    <div className="pipeline-contact-label">
                      Phone
                    </div>

                    <div className="pipeline-contact-value">
                      {selectedLead.phone ||
                        'Not provided'}
                    </div>

                  </div>

                  <div className="pipeline-contact-item">

                    <div className="pipeline-contact-label">
                      Source
                    </div>

                    <div className="pipeline-contact-value">
                      {selectedLead.source ||
                        'Not specified'}
                    </div>

                  </div>

                  <div className="pipeline-contact-item">

                    <div className="pipeline-contact-label">
                      Priority
                    </div>

                    <div className="pipeline-contact-value">
                      {getPriorityLabel(
                        selectedLead.priority
                      )}
                    </div>

                  </div>

                </div>

              </div>

              {/* PIPELINE */}

              <div className="pipeline-drawer-section">

                <div className="pipeline-drawer-section-title">
                  Pipeline Stage
                </div>

                <div className="pipeline-drawer-stage">

                  <select
                    value={
                      selectedLead.lead_status ||
                      'new'
                    }
                    onChange={e =>
                      updateLeadStage(
                        selectedLead,
                        e.target.value
                      )
                    }
                    disabled={savingStage}
                  >
                    {PIPELINE_STAGES.map(
                      stage => (
                        <option
                          key={stage.key}
                          value={stage.key}
                        >
                          {stage.label}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>

              {/* FOLLOW UP */}

              <div className="pipeline-drawer-section">

                <div className="pipeline-drawer-section-title">
                  Follow-up
                </div>

                <div className="pipeline-contact-item">

                  <div className="pipeline-contact-label">
                    Scheduled Date
                  </div>

                  <div className="pipeline-contact-value">
                    {selectedLead.follow_up_date
                      ? formatDateTime(
                          selectedLead.follow_up_date
                        )
                      : 'No follow-up scheduled'}
                  </div>

                </div>

              </div>

              {/* ENQUIRY */}

              <div className="pipeline-drawer-section">

                <div className="pipeline-drawer-section-title">
                  Enquiry
                </div>

                <div className="pipeline-enquiry">
                  {selectedLead.message ||
                    'No enquiry message provided.'}
                </div>

              </div>

              {/* NOTES */}

              <div className="pipeline-drawer-section">

                <div className="pipeline-drawer-section-title">
                  Admin Notes
                </div>

                <div className="pipeline-notes">
                  {selectedLead.admin_notes ||
                    'No admin notes have been added yet.'}
                </div>

              </div>

              {/* FOOTER */}

              <div className="pipeline-drawer-footer">

                <div className="pipeline-created">
                  Created{' '}
                  {formatDate(
                    selectedLead.created_at
                  )}
                </div>

                <button
                  type="button"
                  className="btn secondary"
                  onClick={closeLead}
                >
                  Close
                </button>

              </div>

            </div>

          </aside>
        </>
      )}

    </section>
  );
}