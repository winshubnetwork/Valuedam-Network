import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const LEAD_STATUSES = [
  { key: "new", label: "New", color: "#2563eb" },
  { key: "contacted", label: "Contacted", color: "#4f46e5" },
  { key: "qualified", label: "Qualified", color: "#7c3aed" },
  { key: "proposal", label: "Proposal", color: "#ea580c" },
  { key: "won", label: "Won", color: "#059669" },
  { key: "lost", label: "Lost", color: "#dc2626" },
];

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function Icon({ type, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const paths = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    message: (
      <>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6A8.38 8.38 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z" />
      </>
    ),
    clipboard: (
      <>
        <rect x="4" y="4" width="16" height="18" rx="2" />
        <path d="M9 4V2h6v2" />
        <path d="M8 10h8" />
        <path d="M8 14h8" />
        <path d="M8 18h5" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.2 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 0 0-15.2-6.5L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 15.2 6.5L21 16" />
        <path d="M21 21v-5h-5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    activity: (
      <>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
  };

  return <svg {...common}>{paths[type]}</svg>;
}

function StatusBadge({ status }) {
  const value = String(status || "").toLowerCase();

  const colors = {
    new: ["#eff6ff", "#1d4ed8"],
    contacted: ["#eef2ff", "#4338ca"],
    qualified: ["#f5f3ff", "#6d28d9"],
    proposal: ["#fff7ed", "#c2410c"],
    won: ["#ecfdf5", "#047857"],
    lost: ["#fef2f2", "#b91c1c"],
    completed: ["#ecfdf5", "#047857"],
    cancelled: ["#fef2f2", "#b91c1c"],
    "in progress": ["#fffbeb", "#b45309"],
    accepted: ["#f0fdf4", "#15803d"],
    active: ["#ecfdf5", "#047857"],
    inactive: ["#f3f4f6", "#4b5563"],
    prospect: ["#fff7ed", "#c2410c"],
  };

  const [background, color] = colors[value] || ["#f3f4f6", "#4b5563"];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 6,
        background,
        color,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status || "—"}
    </span>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div
      style={{
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#9ca3af",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Icon type={icon} size={18} />
      </div>

      <span style={{ fontSize: 12 }}>{text}</span>
    </div>
  );
}

function SectionHeader({ title, subtitle, href }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderBottom: "1px solid #eef0f3",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {href && (
        <Link
          to={href}
          style={{
            color: "#6b7280",
            fontSize: 11,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          View all →
        </Link>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  note,
  href,
  background,
  color,
}) {
  const content = (
    <div
      style={{
        minHeight: 92,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: 13,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon type={icon} size={20} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 25,
            lineHeight: 1,
            fontWeight: 800,
            color: "#111827",
          }}
        >
          {value}
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: 10,
            color: "#9ca3af",
          }}
        >
          {note}
        </div>
      </div>

      {href && (
        <div
          style={{
            marginLeft: "auto",
            color: "#d1d5db",
          }}
        >
          <Icon type="arrow" size={15} />
        </div>
      )}
    </div>
  );

  return href ? (
    <Link
      to={href}
      style={{
        textDecoration: "none",
        display: "block",
      }}
    >
      {content}
    </Link>
  ) : (
    content
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activities, setActivities] = useState([]);

  async function loadDashboard(refresh = false) {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        customersResult,
        messagesResult,
        requestsResult,
        activitiesResult,
      ] = await Promise.all([
        supabase
          .from("crm_customers")
          .select(
            "id, full_name, email, phone, whatsapp, company_name, status, created_at, updated_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("contact_messages")
          .select(
            "id, name, email, phone, message, status, lead_status, follow_up_date, source, customer_id, created_at, updated_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("service_requests")
          .select(
            "id, name, phone, email, service, description, status, budget, quote_amount, customer_id, customer_name, service_name, preferred_timeline, created_at, updated_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("crm_lead_activities")
          .select(
            "id, contact_message_id, customer_id, activity_type, title, description, created_by, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const firstError = [
        customersResult.error,
        messagesResult.error,
        requestsResult.error,
        activitiesResult.error,
      ].find(Boolean);

      if (firstError) {
        throw new Error(firstError.message);
      }

      setCustomers(customersResult.data || []);
      setMessages(messagesResult.data || []);
      setRequests(requestsResult.data || []);
      setActivities(activitiesResult.data || []);
    } catch (err) {
      console.error("CRM dashboard error:", err);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    const overdue = messages.filter((item) => {
      if (!item.follow_up_date) return false;

      return (
        new Date(item.follow_up_date) < todayStart &&
        !["won", "lost"].includes(
          String(item.lead_status || "").toLowerCase()
        )
      );
    });

    const today = messages.filter((item) => {
      if (!item.follow_up_date) return false;

      const date = new Date(item.follow_up_date);

      return date >= todayStart && date <= todayEnd;
    });

    const upcoming = messages.filter(
      (item) =>
        item.follow_up_date &&
        new Date(item.follow_up_date) > todayEnd
    );

    const activeLeads = messages.filter(
      (item) =>
        !["won", "lost"].includes(
          String(item.lead_status || "").toLowerCase()
        )
    );

    const newCustomersToday = customers.filter((item) => {
      const date = new Date(item.created_at);
      return date >= todayStart && date <= todayEnd;
    });

    const newRequestsToday = requests.filter((item) => {
      const date = new Date(item.created_at);
      return date >= todayStart && date <= todayEnd;
    });

    return {
      overdue,
      today,
      upcoming,
      activeLeads,
      newCustomersToday,
      newRequestsToday,
    };
  }, [customers, messages, requests]);

  const pipeline = useMemo(
    () =>
      LEAD_STATUSES.map((status) => ({
        ...status,
        count: messages.filter(
          (item) =>
            String(item.lead_status || "new").toLowerCase() ===
            status.key
        ).length,
      })),
    [messages]
  );

  const maxPipeline = Math.max(
    ...pipeline.map((item) => item.count),
    1
  );

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          color: "#6b7280",
          fontSize: 13,
        }}
      >
        Loading dashboard...
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1500,
        margin: "0 auto",
        padding: "4px 0 30px",
        color: "#111827",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        .crm-dashboard-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .crm-dashboard-grid-main {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
          gap: 18px;
        }

        .crm-dashboard-grid-activity {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
          gap: 18px;
        }

        .crm-dashboard-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }

        .crm-dashboard-link {
          text-decoration: none;
          color: inherit;
        }

        .crm-dashboard-row:hover {
          background: #f9fafb;
        }

        .crm-dashboard-pipeline-row:hover .crm-dashboard-pipeline-bar {
          filter: brightness(.92);
        }

        .crm-dashboard-action:hover {
          background: #f9fafb !important;
          border-color: #d1d5db !important;
        }

        @media (max-width: 1100px) {
          .crm-dashboard-grid-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .crm-dashboard-grid-main,
          .crm-dashboard-grid-activity {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .crm-dashboard-grid-4 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 15,
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 23,
              lineHeight: 1.2,
              fontWeight: 800,
              color: "#111827",
            }}
          >
            Business Dashboard
          </h1>

          <p
            style={{
              margin: "5px 0 0",
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            Overview of your CRM and client activity.
          </p>
        </div>

        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          style={{
            height: 36,
            padding: "0 13px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11,
            fontWeight: 700,
            cursor: refreshing ? "default" : "pointer",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <span
            style={{
              display: "flex",
              transform: refreshing ? "rotate(360deg)" : "none",
              transition: "transform .6s linear",
            }}
          >
            <Icon type="refresh" size={14} />
          </span>
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: "11px 14px",
            borderRadius: 9,
            marginBottom: 15,
            fontSize: 12,
          }}
        >
          <strong>Dashboard error:</strong> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="crm-dashboard-grid-4" style={{ marginBottom: 18 }}>
        <StatCard
          icon="users"
          label="Customers"
          value={customers.length}
          note={`${metrics.newCustomersToday.length} new today`}
          href="/admin/customers"
          background="#eff6ff"
          color="#2563eb"
        />

        <StatCard
          icon="message"
          label="Active Leads"
          value={metrics.activeLeads.length}
          note={`${messages.length} total enquiries`}
          href="/admin/messages"
          background="#f5f3ff"
          color="#7c3aed"
        />

        <StatCard
          icon="clipboard"
          label="Service Requests"
          value={requests.length}
          note={`${metrics.newRequestsToday.length} new today`}
          href="/admin/requests"
          background="#ecfdf5"
          color="#059669"
        />

        <StatCard
          icon="alert"
          label="Overdue"
          value={metrics.overdue.length}
          note="Follow-ups requiring attention"
          href="/admin/messages"
          background="#fef2f2"
          color="#dc2626"
        />
      </div>

      {/* Pipeline + Followups */}
      <div className="crm-dashboard-grid-main" style={{ marginBottom: 18 }}>
        <section className="crm-dashboard-card">
          <SectionHeader
            title="Lead Pipeline"
            subtitle="Current position of your enquiries"
            href="/admin/messages"
          />

          <div style={{ padding: "18px 20px" }}>
            {pipeline.map((item) => {
              const width =
                item.count === 0
                  ? 0
                  : Math.max(
                      5,
                      Math.round((item.count / maxPipeline) * 100)
                    );

              return (
                <Link
                  key={item.key}
                  to={`/admin/messages?lead_status=${item.key}`}
                  className="crm-dashboard-link crm-dashboard-pipeline-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "82px 1fr 28px",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 17,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#4b5563",
                    }}
                  >
                    {item.label}
                  </span>

                  <div
                    style={{
                      height: 8,
                      background: "#f1f5f9",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="crm-dashboard-pipeline-bar"
                      style={{
                        width: `${width}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: item.color,
                        transition: "width .3s ease",
                      }}
                    />
                  </div>

                  <span
                    style={{
                      textAlign: "right",
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  >
                    {item.count}
                  </span>
                </Link>
              );
            })}

            <div
              style={{
                borderTop: "1px solid #f0f1f3",
                paddingTop: 15,
                marginTop: 3,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: "#dc2626",
                  }}
                >
                  {metrics.overdue.length}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>
                  Overdue
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  borderLeft: "1px solid #f0f1f3",
                  borderRight: "1px solid #f0f1f3",
                }}
              >
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: "#ea580c",
                  }}
                >
                  {metrics.today.length}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>
                  Today
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: "#2563eb",
                  }}
                >
                  {metrics.upcoming.length}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>
                  Upcoming
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="crm-dashboard-card">
          <SectionHeader
            title="Follow-ups"
            subtitle="What needs your attention"
            href="/admin/messages"
          />

          {metrics.overdue.length > 0 ? (
            metrics.overdue.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                to={`/admin/messages?message=${lead.id}`}
                className="crm-dashboard-link crm-dashboard-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "13px 18px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon type="alert" size={15} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#111827",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {lead.name}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      marginTop: 3,
                    }}
                  >
                    Due {formatDate(lead.follow_up_date)}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "#dc2626",
                  }}
                >
                  OVERDUE
                </span>
              </Link>
            ))
          ) : metrics.today.length > 0 ? (
            metrics.today.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                to={`/admin/messages?message=${lead.id}`}
                className="crm-dashboard-link crm-dashboard-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "13px 18px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#fff7ed",
                    color: "#ea580c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon type="clock" size={15} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {lead.name}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      marginTop: 3,
                    }}
                  >
                    Follow up today
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "#ea580c",
                  }}
                >
                  TODAY
                </span>
              </Link>
            ))
          ) : metrics.upcoming.length > 0 ? (
            metrics.upcoming.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                to={`/admin/messages?message=${lead.id}`}
                className="crm-dashboard-link crm-dashboard-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "13px 18px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon type="clock" size={15} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {lead.name}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      marginTop: 3,
                    }}
                  >
                    {formatDate(lead.follow_up_date)}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "#2563eb",
                  }}
                >
                  UPCOMING
                </span>
              </Link>
            ))
          ) : (
            <EmptyState
              icon="check"
              text="No follow-ups need your attention."
            />
          )}
        </section>
      </div>

      {/* Requests + Customers */}
      <div className="crm-dashboard-grid-main" style={{ marginBottom: 18 }}>
        <section className="crm-dashboard-card">
          <SectionHeader
            title="Recent Service Requests"
            subtitle="Latest client requests"
            href="/admin/requests"
          />

          {requests.length === 0 ? (
            <EmptyState
              icon="clipboard"
              text="No service requests yet."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 570,
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Client", "Service", "Status", "Date"].map(
                      (heading, index) => (
                        <th
                          key={heading}
                          style={{
                            padding: "10px 16px",
                            textAlign:
                              index === 3 ? "right" : "left",
                            fontSize: 9,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                            letterSpacing: ".05em",
                            borderBottom: "1px solid #f0f1f3",
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {requests.slice(0, 6).map((request) => (
                    <tr
                      key={request.id}
                      className="crm-dashboard-row"
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <Link
                          to={`/admin/requests?request=${request.id}`}
                          className="crm-dashboard-link"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              background: "#f3f4f6",
                              color: "#6b7280",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon type="users" size={14} />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#111827",
                                maxWidth: 170,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {request.customer_name ||
                                request.name ||
                                "Unknown"}
                            </div>

                            <div
                              style={{
                                fontSize: 9,
                                color: "#9ca3af",
                                marginTop: 2,
                              }}
                            >
                              {request.phone || "No phone"}
                            </div>
                          </div>
                        </Link>
                      </td>

                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 11,
                          color: "#4b5563",
                          fontWeight: 600,
                        }}
                      >
                        {request.service_name ||
                          request.service ||
                          "General Service"}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <StatusBadge status={request.status} />
                      </td>

                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontSize: 10,
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(request.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="crm-dashboard-card">
          <SectionHeader
            title="Recent Customers"
            subtitle="Recently added"
            href="/admin/customers"
          />

          {customers.length === 0 ? (
            <EmptyState icon="users" text="No customers yet." />
          ) : (
            customers.slice(0, 6).map((customer) => (
              <Link
                key={customer.id}
                to={`/admin/customers?customer=${customer.id}`}
                className="crm-dashboard-link crm-dashboard-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 18px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#f3f4f6",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon type="users" size={14} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#111827",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {customer.full_name}
                  </div>

                  <div
                    style={{
                      fontSize: 9,
                      color: "#9ca3af",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {customer.company_name ||
                      customer.email ||
                      customer.phone ||
                      "No contact details"}
                  </div>
                </div>

                <StatusBadge status={customer.status} />
              </Link>
            ))
          )}
        </section>
      </div>

      {/* Enquiries + Activity */}
      <div
        className="crm-dashboard-grid-activity"
        style={{ marginBottom: 18 }}
      >
        <section className="crm-dashboard-card">
          <SectionHeader
            title="Latest Enquiries"
            subtitle="Recent contact messages"
            href="/admin/messages"
          />

          {messages.length === 0 ? (
            <EmptyState
              icon="message"
              text="No contact messages yet."
            />
          ) : (
            messages.slice(0, 6).map((message) => (
              <Link
                key={message.id}
                to={`/admin/messages?message=${message.id}`}
                className="crm-dashboard-link crm-dashboard-row"
                style={{
                  display: "flex",
                  gap: 11,
                  padding: "12px 18px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#f5f3ff",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon type="message" size={14} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {message.name}
                    </div>

                    <StatusBadge
                      status={message.lead_status || "new"}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 10,
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {message.message}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 10,
                      fontSize: 9,
                      color: "#9ca3af",
                    }}
                  >
                    {message.email && <span>✉ Email</span>}
                    {message.phone && (
                      <span>☎ {message.phone}</span>
                    )}
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </section>

        <section className="crm-dashboard-card">
          <SectionHeader
            title="Recent Activity"
            subtitle="Latest CRM actions"
          />

          {activities.length === 0 ? (
            <EmptyState
              icon="activity"
              text="Activity will appear here as you work."
            />
          ) : (
            activities.slice(0, 6).map((activity) => (
              <div
                key={activity.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 18px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "#f3f4f6",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon type="activity" size={14} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {activity.title}
                  </div>

                  {activity.description && (
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 9,
                        color: "#9ca3af",
                        lineHeight: 1.4,
                      }}
                    >
                      {activity.description}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 9,
                      color: "#9ca3af",
                      textTransform: "capitalize",
                    }}
                  >
                    {activity.activity_type || "note"} ·{" "}
                    {formatTime(activity.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Quick Actions */}
      <section className="crm-dashboard-card">
        <div
          style={{
            padding: "15px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Quick Actions
            </div>

            <div
              style={{
                marginTop: 2,
                fontSize: 10,
                color: "#9ca3af",
              }}
            >
              Common CRM tasks
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/admin/messages"
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 7,
                background: "#111827",
                color: "#fff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              <Icon type="message" size={13} />
              Leads
            </Link>

            <Link
              to="/admin/customers?action=add"
              className="crm-dashboard-action"
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 7,
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              <Icon type="plus" size={13} />
              Customer
            </Link>

            <Link
              to="/admin/requests"
              className="crm-dashboard-action"
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 7,
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              <Icon type="clipboard" size={13} />
              Requests
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}