
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const INITIAL_FORM = {
  target_type: "product",
  target_id: "",
  enabled: true,
  commission_type: "percentage",
  commission_rate: "5",
  recurring_enabled: false,
  max_recurring_cycles: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatCommission = (rule) => {
  const rate = Number(rule.commission_rate) || 0;

  return rule.commission_type === "percentage"
    ? `${rate}%`
    : money(rate);
};

export default function StoreAffiliateRules() {
  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [rulesResult, productsResult, servicesResult] =
        await Promise.all([
          supabase
            .from("store_affiliate_commission_rules")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("store_products")
            .select("id, name, price, status")
            .order("name", { ascending: true }),

          supabase
            .from("services")
            .select("id, title, active")
            .order("title", { ascending: true }),
        ]);

      if (rulesResult.error) throw rulesResult.error;
      if (productsResult.error) throw productsResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setRules(rulesResult.data || []);
      setProducts(productsResult.data || []);
      setServices(servicesResult.data || []);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load commission rules. Check your Supabase permissions and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = useMemo(() => {
    return [
      ...products.map((product) => ({
        id: product.id,
        name: product.name,
        target_type: "product",
        detail: `${money(product.price)} · ${product.status || "unknown status"}`,
        active: product.status === "active" || product.status === "published",
      })),
      ...services.map((service) => ({
        id: service.id,
        name: service.title,
        target_type: "service",
        detail: service.active === false ? "Inactive service" : "Service",
        active: service.active !== false,
      })),
    ];
  }, [products, services]);

  const itemMap = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      map.set(`${item.target_type}:${item.id}`, item);
    });
    return map;
  }, [items]);

  const currentItems = useMemo(
    () => items.filter((item) => item.target_type === form.target_type),
    [items, form.target_type]
  );

  const filteredRules = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rules.filter((rule) => {
      const item = itemMap.get(`${rule.target_type}:${rule.target_id}`);
      const name = item?.name || "Unknown item";

      const matchesSearch =
        !term ||
        name.toLowerCase().includes(term) ||
        String(rule.commission_type || "").toLowerCase().includes(term) ||
        String(rule.target_type || "").toLowerCase().includes(term);

      const matchesType =
        typeFilter === "all" || rule.target_type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && rule.enabled) ||
        (statusFilter === "disabled" && !rule.enabled);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rules, search, typeFilter, statusFilter, itemMap]);

  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const productRuleCount = rules.filter(
    (rule) => rule.target_type === "product"
  ).length;
  const serviceRuleCount = rules.filter(
    (rule) => rule.target_type === "service"
  ).length;

  const updateForm = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setError("");
    setNotice("");
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      target_type: rule.target_type,
      target_id: rule.target_id,
      enabled: rule.enabled,
      commission_type: rule.commission_type,
      commission_rate: String(rule.commission_rate),
      recurring_enabled: rule.recurring_enabled,
      max_recurring_cycles:
        rule.max_recurring_cycles == null
          ? ""
          : String(rule.max_recurring_cycles),
    });
    setError("");
    setNotice("");

    document
      .getElementById("affiliate-rule-editor")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTypeChange = (value) => {
    setForm((previous) => ({
      ...previous,
      target_type: value,
      target_id: "",
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.target_id) {
      setError("Please select a product or service.");
      return;
    }

    const rate = Number(form.commission_rate);

    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Commission rate must be greater than zero.");
      return;
    }

    if (form.commission_type === "percentage" && rate > 100) {
      setError("Percentage commission cannot exceed 100%.");
      return;
    }

    let maxCycles = null;

    if (form.recurring_enabled && form.max_recurring_cycles.trim() !== "") {
      maxCycles = Number(form.max_recurring_cycles);

      if (!Number.isInteger(maxCycles) || maxCycles < 1) {
        setError("Recurring cycle limit must be a whole number of at least 1.");
        return;
      }
    }

    setSaving(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const payload = {
        target_type: form.target_type,
        target_id: form.target_id,
        enabled: form.enabled,
        commission_type: form.commission_type,
        commission_rate: rate,
        recurring_enabled: form.recurring_enabled,
        max_recurring_cycles: form.recurring_enabled ? maxCycles : null,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (editingId) {
        result = await supabase
          .from("store_affiliate_commission_rules")
          .update(payload)
          .eq("id", editingId)
          .select("id")
          .single();
      } else {
        // Reuse an existing rule for the same product/service to avoid
        // creating duplicate rules for the same target.
        const existing = rules.find(
          (rule) =>
            rule.target_type === form.target_type &&
            rule.target_id === form.target_id
        );

        if (existing) {
          result = await supabase
            .from("store_affiliate_commission_rules")
            .update(payload)
            .eq("id", existing.id)
            .select("id")
            .single();
        } else {
          result = await supabase
            .from("store_affiliate_commission_rules")
            .insert({
              ...payload,
              created_by: authData?.user?.id || null,
            })
            .select("id")
            .single();
        }
      }

      if (result.error) throw result.error;

      setNotice(editingId ? "Commission rule updated." : "Commission rule saved.");
      setForm(INITIAL_FORM);
      setEditingId(null);

      await loadData();
    } catch (err) {
      setError(
        err?.message ||
          "Unable to save this rule. Check your administrator permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule) => {
    setError("");
    setNotice("");

    try {
      const { error: updateError } = await supabase
        .from("store_affiliate_commission_rules")
        .update({
          enabled: !rule.enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rule.id);

      if (updateError) throw updateError;

      setNotice(
        `Commission rule ${rule.enabled ? "disabled" : "enabled"}.`
      );
      await loadData();
    } catch (err) {
      setError(err?.message || "Unable to change this rule's status.");
    }
  };

  const deleteRule = async (rule) => {
    const item = itemMap.get(`${rule.target_type}:${rule.target_id}`);
    const itemName = item?.name || "this item";

    if (
      !window.confirm(
        `Delete the commission rule for "${itemName}"? The product or service itself will not be deleted.`
      )
    ) {
      return;
    }

    setDeletingId(rule.id);
    setError("");
    setNotice("");

    try {
      const { error: deleteError } = await supabase
        .from("store_affiliate_commission_rules")
        .delete()
        .eq("id", rule.id);

      if (deleteError) throw deleteError;

      if (editingId === rule.id) resetForm();

      setNotice("Commission rule deleted. The product or service was not affected.");
      await loadData();
    } catch (err) {
      setError(err?.message || "Unable to delete this rule.");
    } finally {
      setDeletingId(null);
    }
  };

  const getItemName = (rule) =>
    itemMap.get(`${rule.target_type}:${rule.target_id}`)?.name ||
    "Item not found";

  const getItemDetail = (rule) =>
    itemMap.get(`${rule.target_type}:${rule.target_id}`)?.detail ||
    "The linked item may have been removed.";

  return (
    <div className="sar-page">
      <style>{`
        .sar-page {
          --sar-ink: #172033;
          --sar-muted: #687386;
          --sar-line: #e5e9f0;
          --sar-yellow: #f5b82e;
          color: var(--sar-ink);
          padding: 24px;
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .sar-page * { box-sizing: border-box; }
        .sar-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .sar-eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #8a650c;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
          margin-bottom: 8px;
        }
        .sar-page h1 { font-size: clamp(24px, 3vw, 32px); line-height: 1.2; margin: 0 0 9px; letter-spacing: -.035em; }
        .sar-page h2 { font-size: 17px; margin: 0; letter-spacing: -.02em; }
        .sar-muted { color: var(--sar-muted); font-size: 13px; line-height: 1.6; }
        .sar-button {
          border: 1px solid var(--sar-line);
          border-radius: 10px;
          padding: 10px 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          background: #fff;
          color: var(--sar-ink);
          text-decoration: none;
          min-height: 40px;
        }
        .sar-button:disabled { opacity: .6; cursor: not-allowed; }
        .sar-button-primary { background: var(--sar-yellow); border-color: var(--sar-yellow); color: #201800; }
        .sar-button-danger { color: #b42318; }
        .sar-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }
        .sar-stat, .sar-panel {
          background: #fff;
          border: 1px solid var(--sar-line);
          border-radius: 16px;
          box-shadow: 0 3px 14px rgba(16,24,40,.035);
        }
        .sar-stat { padding: 17px; display: flex; gap: 13px; align-items: center; }
        .sar-stat-icon { width: 43px; height: 43px; border-radius: 12px; display: grid; place-items: center; background: #fff4d5; color: #805b00; flex-shrink: 0; }
        .sar-stat-value { font-size: 25px; font-weight: 800; line-height: 1.1; margin-bottom: 5px; }
        .sar-stat-label { font-size: 12px; color: var(--sar-muted); }
        .sar-panel { padding: 21px; margin-bottom: 22px; }
        .sar-panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
        .sar-panel-head p { margin: 6px 0 0; }
        .sar-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .sar-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
        .sar-field label { font-size: 12px; font-weight: 750; color: #39445a; }
        .sar-field input, .sar-field select, .sar-search input, .sar-filter {
          width: 100%; min-width: 0; border: 1px solid #d9deea; border-radius: 9px;
          background: #fff; padding: 11px 12px; color: var(--sar-ink); font: inherit; font-size: 13px; outline: none;
        }
        .sar-field input:focus, .sar-field select:focus, .sar-search input:focus, .sar-filter:focus { border-color: #d29a10; box-shadow: 0 0 0 3px rgba(245,184,46,.16); }
        .sar-field small { color: var(--sar-muted); font-size: 11px; line-height: 1.5; }
        .sar-toggle-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
        .sar-toggle {
          display: flex; align-items: flex-start; gap: 10px; flex: 1 1 220px;
          border: 1px solid var(--sar-line); border-radius: 11px; padding: 13px;
          cursor: pointer; background: #fbfcfe;
        }
        .sar-toggle input { margin-top: 3px; accent-color: #a97900; }
        .sar-toggle strong { display: block; font-size: 13px; margin-bottom: 4px; }
        .sar-toggle span { display: block; color: var(--sar-muted); font-size: 11px; line-height: 1.5; }
        .sar-form-actions { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 19px; }
        .sar-alert { border-radius: 10px; padding: 12px 14px; margin: 0 0 16px; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
        .sar-alert-error { background: #fff1f0; border: 1px solid #ffd5d2; color: #9b1c14; }
        .sar-alert-success { background: #ecfdf3; border: 1px solid #b7ebc9; color: #166534; }
        .sar-toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .sar-search { position: relative; flex: 1 1 240px; }
        .sar-search svg { position: absolute; top: 12px; left: 12px; color: #8993a5; }
        .sar-search input { padding-left: 38px; }
        .sar-filter { width: auto; min-width: 145px; }
        .sar-table-wrap { width: 100%; overflow-x: auto; }
        .sar-table { border-collapse: collapse; width: 100%; min-width: 780px; text-align: left; }
        .sar-table th { font-size: 11px; color: #697386; font-weight: 800; text-transform: uppercase; letter-spacing: .045em; background: #f8fafc; }
        .sar-table th, .sar-table td { border-bottom: 1px solid #edf0f5; padding: 13px 11px; vertical-align: middle; }
        .sar-table td { font-size: 13px; }
        .sar-item { font-weight: 750; margin-bottom: 4px; }
        .sar-item-meta { font-size: 11px; color: var(--sar-muted); }
        .sar-type { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #e2e7ef; background: #f8fafc; padding: 5px 8px; border-radius: 7px; font-size: 11px; font-weight: 750; text-transform: capitalize; }
        .sar-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; }
        .sar-status::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
        .sar-status-on { color: #16804a; }
        .sar-status-off { color: #7a8495; }
        .sar-actions { display: flex; gap: 6px; }
        .sar-icon-button { width: 34px; height: 34px; border: 1px solid var(--sar-line); border-radius: 8px; background: #fff; display: grid; place-items: center; cursor: pointer; color: #39445a; }
        .sar-icon-button:hover { background: #f8fafc; }
        .sar-icon-button:disabled { opacity: .5; cursor: not-allowed; }
        .sar-empty { text-align: center; padding: 40px 16px; color: var(--sar-muted); }
        .sar-empty-icon { width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 14px; display: grid; place-items: center; background: #fff4d5; color: #805b00; }
        .sar-empty strong { display: block; color: var(--sar-ink); margin-bottom: 6px; }
        @media (max-width: 700px) {
          .sar-page { padding: 15px; }
          .sar-stats { grid-template-columns: 1fr; gap: 10px; }
          .sar-stat { padding: 13px; }
          .sar-stat-value { font-size: 22px; }
          .sar-panel { padding: 15px; border-radius: 13px; }
          .sar-form-grid { grid-template-columns: 1fr; }
          .sar-filter { flex: 1 1 130px; }
        }
      `}</style>

      <div className="sar-header">
        <div>
          <div className="sar-eyebrow">
            <Settings2 size={15} /> Affiliate programme
          </div>
          <h1>Commission rules</h1>
          <div className="sar-muted">
            Configure affiliate earnings separately for store products and services.
          </div>
        </div>

        <button
          className="sar-button"
          type="button"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="sar-alert sar-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="sar-alert sar-alert-success" role="status">
          {notice}
        </div>
      )}

      <div className="sar-stats">
        <div className="sar-stat">
          <div className="sar-stat-icon"><Settings2 size={21} /></div>
          <div>
            <div className="sar-stat-value">{rules.length}</div>
            <div className="sar-stat-label">Total commission rules</div>
          </div>
        </div>

        <div className="sar-stat">
          <div className="sar-stat-icon"><CheckCircle2 size={21} /></div>
          <div>
            <div className="sar-stat-value">{enabledCount}</div>
            <div className="sar-stat-label">Enabled rules</div>
          </div>
        </div>

        <div className="sar-stat">
          <div className="sar-stat-icon"><BadgePercent size={21} /></div>
          <div>
            <div className="sar-stat-value">
              {productRuleCount} / {serviceRuleCount}
            </div>
            <div className="sar-stat-label">Product rules / service rules</div>
          </div>
        </div>
      </div>

      <section className="sar-panel" id="affiliate-rule-editor">
        <div className="sar-panel-head">
          <div>
            <h2>{editingId ? "Edit commission rule" : "Add a commission rule"}</h2>
            <p className="sar-muted">
              {editingId
                ? "Update the commission settings for the selected item."
                : "Choose an item and set how much an affiliate can earn."}
            </p>
          </div>
          {editingId && (
            <button className="sar-button" type="button" onClick={resetForm}>
              <X size={15} /> Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="sar-form-grid">
            <div className="sar-field">
              <label htmlFor="sar-target-type">Item type</label>
              <select
                id="sar-target-type"
                value={form.target_type}
                onChange={(event) => handleTypeChange(event.target.value)}
                disabled={Boolean(editingId)}
              >
                <option value="product">Store product</option>
                <option value="service">Valuedam service</option>
              </select>
              {editingId && (
                <small>To change the item, cancel editing and create a new rule.</small>
              )}
            </div>

            <div className="sar-field">
              <label htmlFor="sar-target-id">Product or service</label>
              <select
                id="sar-target-id"
                value={form.target_id}
                onChange={(event) => updateForm("target_id", event.target.value)}
                required
                disabled={Boolean(editingId)}
              >
                <option value="">Select an item</option>
                {currentItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.target_type === "product" ? ` — ${money(products.find((p) => p.id === item.id)?.price)}` : ""}
                    {!item.active ? " (inactive/draft)" : ""}
                  </option>
                ))}
              </select>
              <small>
                {currentItems.length} {form.target_type === "product" ? "products" : "services"} available.
              </small>
            </div>

            <div className="sar-field">
              <label htmlFor="sar-commission-type">Commission calculation</label>
              <select
                id="sar-commission-type"
                value={form.commission_type}
                onChange={(event) => updateForm("commission_type", event.target.value)}
              >
                <option value="percentage">Percentage of sale</option>
                <option value="fixed">Fixed amount per eligible sale</option>
              </select>
            </div>

            <div className="sar-field">
              <label htmlFor="sar-commission-rate">
                {form.commission_type === "percentage"
                  ? "Commission percentage (%)"
                  : "Commission amount (NGN)"}
              </label>
              <input
                id="sar-commission-rate"
                type="number"
                min="0.01"
                max={form.commission_type === "percentage" ? "100" : undefined}
                step="0.01"
                value={form.commission_rate}
                onChange={(event) => updateForm("commission_rate", event.target.value)}
                required
              />
              <small>
                {form.commission_type === "percentage"
                  ? "For example, 5 means the affiliate earns 5% of the eligible sale amount."
                  : "For example, 1000 means the affiliate earns ₦1,000 per eligible sale."}
              </small>
            </div>
          </div>

          <div className="sar-toggle-row">
            <label className="sar-toggle">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => updateForm("enabled", event.target.checked)}
              />
              <div>
                <strong>Enable this rule</strong>
                <span>Allow this item to use the configured commission rule.</span>
              </div>
            </label>

            <label className="sar-toggle">
              <input
                type="checkbox"
                checked={form.recurring_enabled}
                onChange={(event) =>
                  updateForm("recurring_enabled", event.target.checked)
                }
              />
              <div>
                <strong>Recurring commissions</strong>
                <span>Mark this rule as eligible for recurring commission cycles.</span>
              </div>
            </label>
          </div>

          {form.recurring_enabled && (
            <div className="sar-field" style={{ marginTop: 16, maxWidth: 450 }}>
              <label htmlFor="sar-recurring-cycles">
                Maximum recurring cycles (optional)
              </label>
              <input
                id="sar-recurring-cycles"
                type="number"
                min="1"
                step="1"
                placeholder="Leave blank for no rule-specific limit"
                value={form.max_recurring_cycles}
                onChange={(event) =>
                  updateForm("max_recurring_cycles", event.target.value)
                }
              />
              <small>
                Leave blank to store no specific cycle limit for this rule.
                The global programme settings may also limit recurring cycles.
              </small>
            </div>
          )}

          <div className="sar-form-actions">
            <button className="sar-button sar-button-primary" type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle size={16} className="sar-spin" />
              ) : editingId ? (
                <CheckCircle2 size={16} />
              ) : (
                <Plus size={16} />
              )}
              {saving ? "Saving..." : editingId ? "Update rule" : "Save commission rule"}
            </button>

            {!editingId && (
              <button
                className="sar-button"
                type="button"
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setError("");
                  setNotice("");
                }}
              >
                Clear form
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="sar-panel">
        <div className="sar-panel-head">
          <div>
            <h2>Existing commission rules</h2>
            <p className="sar-muted">
              {filteredRules.length} rules shown. Changes here do not delete products or services.
            </p>
          </div>
        </div>

        <div className="sar-toolbar">
          <div className="sar-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search commission rules"
              placeholder="Search by product or service..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="sar-filter"
            aria-label="Filter by item type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All item types</option>
            <option value="product">Products</option>
            <option value="service">Services</option>
          </select>

          <select
            className="sar-filter"
            aria-label="Filter by rule status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {loading ? (
          <div className="sar-empty">
            <LoaderCircle size={25} />
            <p>Loading commission rules...</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="sar-empty">
            <div className="sar-empty-icon"><BadgePercent size={23} /></div>
            <strong>No commission rules found</strong>
            <div className="sar-muted">
              Create your first rule above, or change your search filters.
            </div>
          </div>
        ) : (
          <div className="sar-table-wrap">
            <table className="sar-table">
              <thead>
                <tr>
                  <th>Product / service</th>
                  <th>Type</th>
                  <th>Commission</th>
                  <th>Recurring</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <div className="sar-item">{getItemName(rule)}</div>
                      <div className="sar-item-meta">{getItemDetail(rule)}</div>
                    </td>
                    <td>
                      <span className="sar-type">
                        {rule.target_type === "product" ? (
                          <Package size={12} />
                        ) : (
                          <Wrench size={12} />
                        )}
                        {rule.target_type}
                      </span>
                    </td>
                    <td>
                      <strong>{formatCommission(rule)}</strong>
                    </td>
                    <td>
                      {rule.recurring_enabled ? (
                        <span>
                          Yes
                          {rule.max_recurring_cycles != null
                            ? ` · ${rule.max_recurring_cycles} cycles`
                            : " · no rule-specific limit"}
                        </span>
                      ) : (
                        <span className="sar-muted">No</span>
                      )}
                    </td>
                    <td>
                      <span className={`sar-status ${rule.enabled ? "sar-status-on" : "sar-status-off"}`}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <div className="sar-actions">
                        <button
                          type="button"
                          className="sar-icon-button"
                          title="Edit rule"
                          aria-label={`Edit ${getItemName(rule)}`}
                          onClick={() => startEdit(rule)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="sar-icon-button"
                          title={rule.enabled ? "Disable rule" : "Enable rule"}
                          aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                          onClick={() => toggleRule(rule)}
                        >
                          {rule.enabled ? <X size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                        <button
                          type="button"
                          className="sar-icon-button"
                          title="Delete rule"
                          aria-label={`Delete rule for ${getItemName(rule)}`}
                          disabled={deletingId === rule.id}
                          onClick={() => deleteRule(rule)}
                        >
                          {deletingId === rule.id ? (
                            <LoaderCircle size={15} />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="sar-muted" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "0 2px 20px" }}>
        <CircleDollarSign size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Important: this page saves commission rules. Automatically calculating,
          attributing, and paying commissions still requires the affiliate sales
          processing workflow; enabling a rule alone does not trigger a payment.
        </span>
      </div>
    </div>
  );
}
