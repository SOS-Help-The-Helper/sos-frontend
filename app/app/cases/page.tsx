"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { UrgencyBadge, SubStatusPill, CountChip } from "@/components/crm/pills";
import { BUCKETS, bucketOf, type RequestStatus, type Bucket } from "@/lib/display-constants";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { Plus, Link2, AlertTriangle, X } from "lucide-react";
import { EditableTable, type TableColumn } from "@/components/crm/editable-table";

type TabKey = "cases" | "requests" | "resources";

type Column = { id: string; label: string; accent: string };

type Card = {
  id: string;
  col: string;
  title: string;
  meta?: string;
  sub?: string;
  href: string;
  urgency?: "critical" | "high" | "medium" | "low";
  status?: RequestStatus;
  orgColor?: string;
  orgName?: string;
  badge?: string;
  // Raw API fields preserved for the table view
  taxonomy?: string;
  description?: string;
  capacity?: string | number;
};

// Stage definitions per tab
// Cases tab = SOS umbrellas (active / resolved / closed)
const CASE_COLS: Column[] = [
  { id: "active", label: "Active", accent: "#EF4E4B" },
  { id: "resolved", label: "Resolved", accent: "#34D399" },
  { id: "closed", label: "Closed", accent: "#9CA3AF" },
];
// Requests tab uses the full pipeline stages
const REQUEST_COLS: Column[] = BUCKETS.map((b) => ({ id: b.id, label: b.label, accent: b.accent }));

const RESOURCE_COLS: Column[] = [
  { id: "available", label: "Available", accent: "#34D399" },
  { id: "pending", label: "Pending", accent: "#EF4E4B" },
  { id: "approved", label: "Approved", accent: "#34D399" },
  { id: "matched", label: "Matched", accent: "#89CFF0" },
  { id: "fulfilled", label: "Fulfilled", accent: "#34D399" },
  { id: "closed", label: "Closed", accent: "#9CA3AF" },
];

const REPORT_COLS: Column[] = [
  { id: "Critical", label: "Critical", accent: "#EF4E4B" },
  { id: "Elevated", label: "Elevated", accent: "#89CFF0" },
  { id: "Routine", label: "Routine", accent: "#89CFF0" },
  { id: "Resolved", label: "Resolved", accent: "#34D399" },
];

// Table view column definitions (one set per tab)
const CASE_TABLE_COLS: TableColumn[] = [
  { id: 'title', label: 'Name', width: 180, editable: false, type: 'readonly' },
  { id: 'status', label: 'Status', width: 110, editable: true, type: 'badge', options: [
    { value: 'active', label: 'Active', color: '#EF4E4B' },
    { value: 'resolved', label: 'Resolved', color: '#34D399' },
    { value: 'closed', label: 'Closed', color: '#9CA3AF' },
  ]},
  { id: 'category', label: 'Category', width: 150, editable: false, type: 'readonly' },
  { id: 'urgency', label: 'Urgency', width: 100, editable: true, type: 'badge', options: [
    { value: 'critical', label: 'Critical', color: '#EF4E4B' },
    { value: 'high', label: 'High', color: '#F59E0B' },
    { value: 'medium', label: 'Medium', color: '#89CFF0' },
    { value: 'low', label: 'Low', color: '#9CA3AF' },
  ]},
  { id: 'meta', label: 'Location', width: 180, editable: false, type: 'readonly' },
  { id: 'sub', label: 'Age', width: 70, editable: false, type: 'readonly' },
];

const REQUEST_TABLE_COLS: TableColumn[] = [
  { id: 'title', label: 'Citizen', width: 160, editable: false, type: 'readonly' },
  { id: 'taxonomy', label: 'Taxonomy', width: 160, editable: false, type: 'readonly' },
  { id: 'status', label: 'Status', width: 120, editable: true, type: 'badge', options: [
    { value: 'pending', label: 'Pending', color: '#EF4E4B' },
    { value: 'active', label: 'Active', color: '#F59E0B' },
    { value: 'matched', label: 'Matched', color: '#89CFF0' },
    { value: 'in_progress', label: 'In Progress', color: '#8B5CF6' },
    { value: 'fulfilled', label: 'Fulfilled', color: '#34D399' },
    { value: 'closed', label: 'Closed', color: '#9CA3AF' },
  ]},
  { id: 'urgency', label: 'Urgency', width: 100, editable: true, type: 'badge', options: [
    { value: 'critical', label: 'Critical', color: '#EF4E4B' },
    { value: 'high', label: 'High', color: '#F59E0B' },
    { value: 'medium', label: 'Medium', color: '#89CFF0' },
    { value: 'low', label: 'Low', color: '#9CA3AF' },
  ]},
  { id: 'description', label: 'Description', width: 220, editable: true, type: 'text' },
  { id: 'meta', label: 'Location', width: 160, editable: false, type: 'readonly' },
];

const RESOURCE_TABLE_COLS: TableColumn[] = [
  { id: 'title', label: 'Provider', width: 160, editable: false, type: 'readonly' },
  { id: 'taxonomy', label: 'Taxonomy', width: 160, editable: false, type: 'readonly' },
  { id: 'status', label: 'Status', width: 120, editable: true, type: 'badge', options: [
    { value: 'pending', label: 'Pending', color: '#EF4E4B' },
    { value: 'approved', label: 'Approved', color: '#34D399' },
    { value: 'matched', label: 'Matched', color: '#89CFF0' },
    { value: 'fulfilled', label: 'Fulfilled', color: '#34D399' },
    { value: 'closed', label: 'Closed', color: '#9CA3AF' },
  ]},
  { id: 'capacity', label: 'Capacity', width: 90, editable: true, type: 'text' },
  { id: 'description', label: 'Description', width: 220, editable: true, type: 'text' },
  { id: 'meta', label: 'Location', width: 160, editable: false, type: 'readonly' },
  { id: 'orgName', label: 'Org', width: 140, editable: false, type: 'readonly' },
];

// Format taxonomy code for display: "HOUSING.TEMPORARY" → "Housing — Temporary"
function fmtTaxonomy(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return code.split('.').map(p => p.charAt(0) + p.slice(1).toLowerCase()).join(' — ');
}

// Pluralize helper
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// Map live API cases to Card shape
function liveToCards(items: any[]): Card[] {
  return items.map((c) => ({
    id: c.id ?? c.request_id ?? String(Math.random()),
    col: bucketOf(c.status),
    title: c.display_name ?? c.person_name ?? c.citizen ?? c.id,
    meta: [c.county, fmtTaxonomy(c.category ?? c.taxonomy_code)].filter(Boolean).join(" · "),
    sub: c.days_open != null ? `${c.days_open}d` : undefined,
    href: `/app/cases/${c.umbrella_id ?? c.id}`,
    urgency: c.urgency,
    status: c.status,
    taxonomy: fmtTaxonomy(c.taxonomy_code),
    description: c.description,
    capacity: c.capacity_available,
  }));
}

// Map live API requests to Card shape
function liveRequestsToCards(items: any[]): Card[] {
  return items.map((r) => {
    const personName = r.persons?.display_name ?? r.person_name ?? r.contact_name ?? r.display_name ?? (r.persons?.phone ? `(${r.persons.phone.slice(-4)})` : null) ?? "—";
    const category = fmtTaxonomy(r.taxonomy_code) ?? (r.category ? r.category.charAt(0).toUpperCase() + r.category.slice(1) : null) ?? "Request";
    const location = r.city ?? r.county ?? r.state ?? undefined;
    const daysAgo = r.created_at ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000) : null;
    const badges: string[] = [];
    if (r.is_veteran || r.persons?.is_veteran) badges.push("🎖 Veteran");
    if (r.is_first_responder || r.persons?.is_first_responder) badges.push("🚒 First Responder");
    return {
      id: r.id,
      col: bucketOf(r.status ?? "pending"),
      title: personName,
      meta: [category, location].filter(Boolean).join(" · "),
      sub: [daysAgo != null ? `${daysAgo}d ago` : null, ...badges].filter(Boolean).join(" · ") || undefined,
      href: `/app/directory/request/${r.id}`,
      urgency: r.urgency,
      status: r.status ?? "pending",
      taxonomy: fmtTaxonomy(r.taxonomy_code),
      description: r.description,
    };
  });
}

// Map live API resources to Card shape
function liveResourcesToCards(items: any[]): Card[] {
  return items.map((r) => {
    const personName = r.persons?.display_name ?? r.person_name ?? r.contact_name ?? (r.persons?.phone ? `(${r.persons.phone.slice(-4)})` : null) ?? "—";
    const category = fmtTaxonomy(r.taxonomy_code) ?? (r.category ? r.category.charAt(0).toUpperCase() + r.category.slice(1) : null) ?? r.description?.slice(0, 40) ?? "Resource";
    const location = r.city ?? r.county ?? r.location_text ?? undefined;
    const daysAgo = r.created_at ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000) : null;
    const cap = r.capacity_available != null && r.capacity_available > 1 ? `${r.capacity_available} units` : undefined;
    return {
      id: r.id,
      col: r.status ?? "available",
      title: personName,
      meta: [category, location].filter(Boolean).join(" · ") || undefined,
      sub: [daysAgo != null ? `${daysAgo}d ago` : null, cap].filter(Boolean).join(" · ") || undefined,
      href: `/app/directory/resource/${r.id}`,
      taxonomy: fmtTaxonomy(r.taxonomy_code),
      description: r.description,
      capacity: r.capacity_available,
    };
  });
}

// Map SOS umbrella cases to Card shape (shared by initial fetch and refreshCases)
function mapCasesToCards(items: any[]): Card[] {
  return items.map((s: any) => {
    const name = s.person_name || s.persons?.display_name || null;
    const reqCount = s.request_count || 0;
    const fulCount = s.fulfilled_count || 0;
    const region = s.persons?.home_region || undefined;
    const daysAgo = s.created_at ? Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000) : null;
    const badges: string[] = [];
    if (s.persons?.is_veteran) badges.push("🎖 Veteran");
    if (s.persons?.is_first_responder) badges.push("🚒 FR");
    return {
      id: s.id,
      col: s.status === "resolved" ? "resolved" : s.status === "closed" ? "closed" : "active",
      title: name || "Anonymous",
      meta: [plural(reqCount, 'request'), fulCount > 0 ? `${fulCount} fulfilled` : null, region].filter(Boolean).join(' · '),
      sub: [daysAgo != null ? `${daysAgo}d ago` : null, ...badges].filter(Boolean).join(' · ') || undefined,
      href: `/app/cases/${s.persons?.id || s.id}`,
      taxonomy: fmtTaxonomy(s.taxonomy_code),
      description: s.description,
    };
  });
}

function CreateCaseModal({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [personName, setPersonName] = useState("");
  const [category, setCategory] = useState("housing");
  const [urgency, setUrgency] = useState("medium");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;
    setSubmitting(true);
    try {
      // Use sos-write — the canonical intake path (SOS DB only).
      // Handles: taxonomy validation, SOS umbrella find-or-create,
      // location geocoding, household resolution.
      await api.submitIntake({
        person_name: personName.trim(),
        org_id: orgId,
        records: [{
          type: "request",
          taxonomy_code: category,
          urgency,
          notes: notes.trim(),
          source: "crm_portal",
        }],
      });
      toast.success("Case created");
      onCreated();
      onClose();
    } catch {
      toast.error("Failed to create case");
    } finally {
      setSubmitting(false);
    }
  };

  const selectCls =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25 appearance-none";
  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-white/25";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0F1E2B] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">New case</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-md hover:bg-white/8 text-white/45 flex items-center justify-center transition"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider text-white/45">Person name</label>
            <input
              autoFocus
              className={inputCls}
              placeholder="Jane Smith"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-xs uppercase tracking-wider text-white/45">Category</label>
              <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="housing">Housing</option>
                <option value="food">Food</option>
                <option value="medical">Medical</option>
                <option value="childcare">Childcare</option>
                <option value="transport">Transport</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-xs uppercase tracking-wider text-white/45">Urgency</label>
              <select className={selectCls} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider text-white/45">Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Additional context…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg bg-white/6 hover:bg-white/10 text-[13px] font-medium text-white/70 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !personName.trim()}
              className="flex-1 h-9 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[13px] font-medium text-white transition disabled:opacity-40"
            >
              {submitting ? "Creating…" : "Create case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SkeletonColumn({ accent }: { accent: string }) {
  return (
    <div className="snap-start rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-3 animate-pulse">
      <div className="flex items-center gap-2 px-1.5 pb-3">
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span className="h-2 w-16 bg-white/10 rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-3 bg-white/4 border border-transparent space-y-2">
            <div className="h-2 w-24 bg-white/10 rounded" />
            <div className="h-3 w-32 bg-white/15 rounded" />
            <div className="h-2 w-20 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CasesPage() {
  const { orgId } = useAuthContext();
  const [tab, setTab] = useState<TabKey>("cases");

  // Board / table view toggle (persisted to localStorage)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('sos-view-mode') as any) || 'kanban';
    return 'kanban';
  });
  useEffect(() => { localStorage.setItem('sos-view-mode', viewMode); }, [viewMode]);

  // Org-customizable table column config (keyed by tab)
  const [orgTableConfig, setOrgTableConfig] = useState<Record<string, any>>({});

  // Live data from EFs (null = not yet loaded or EF failed → fall back to prototype)
  const [liveCases, setLiveCases] = useState<Card[] | null>(null);
  const [liveRequests, setLiveRequests] = useState<Card[] | null>(null);
  const [liveResources, setLiveResources] = useState<Card[] | null>(null);

  const [loading, setLoading] = useState(true);

  // Per-tab kanban state (populated by EF calls)
  const [caseCards, setCaseCards] = useState<Card[]>([]);
  const [requestCards, setRequestCards] = useState<Card[]>([]);
  const [resourceCards, setResourceCards] = useState<Card[]>([]);
  const [reportCards, setReportCards] = useState<Card[]>([]);
  // Real totals from API (not capped by limit)
  const [casesTotal, setCasesTotal] = useState(0);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [resourcesTotal, setResourcesTotal] = useState(0);

  // Fetch all tab data in parallel
  useEffect(() => {
    // Clear stale data so a switched org doesn't show the previous org's rows
    setLiveCases(null);
    setLiveRequests(null);
    setLiveResources(null);
    setCaseCards([]);
    setRequestCards([]);
    setResourceCards([]);
    setLoading(true);
    Promise.allSettled([
      api.crmSosesList({ limit: 200, org_id: orgId || undefined }),
      api.crmRequestsList(orgId || "", { limit: 200 }),
      api.crmResourcesList(orgId || "", { limit: 500 }),
      api.efCall("crm-reports", { report_type: "impact_dashboard" }).catch(() => null),
    ])
      .then(([casesRes, requestsRes, resourcesRes, reportsRes]) => {
        const casesData = casesRes.status === "fulfilled" ? casesRes.value : null;
        const requestsData = requestsRes.status === "fulfilled" ? requestsRes.value : null;
        const resourcesData = resourcesRes.status === "fulfilled" ? resourcesRes.value : null;
        const reportsData = reportsRes.status === "fulfilled" ? reportsRes.value : null;
        const caseItems: any[] = casesData?.cases ?? (Array.isArray(casesData) ? casesData : []);
        setCasesTotal(casesData?.total ?? caseItems.length);
        if (caseItems.length > 0) {
          const cards = mapCasesToCards(caseItems);
          setLiveCases(cards);
          setCaseCards(cards);
        }

        const requestItems: any[] = requestsData?.requests ?? (Array.isArray(requestsData) ? requestsData : []);
        setRequestsTotal(requestsData?.total ?? requestItems.length);
        if (requestItems.length > 0) {
          requestItems.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          const cards = liveRequestsToCards(requestItems);
          setLiveRequests(cards);
          setRequestCards(cards);
        }

        const resourceItems: any[] = resourcesData?.resources ?? (Array.isArray(resourcesData) ? resourcesData : []);
        setResourcesTotal(resourcesData?.total ?? resourceItems.length);
        if (resourceItems.length > 0) {
          resourceItems.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          const cards = liveResourcesToCards(resourceItems);
          setLiveResources(cards);
          setResourceCards(cards);
        }

        const reportItems: any[] = reportsData?.reports ?? reportsData?.data ?? (Array.isArray(reportsData) ? reportsData : []);
        if (reportItems.length > 0) {
          const cards: Card[] = reportItems.map((r: any) => ({
            id: r.id,
            col: r.status === "fulfilled" ? "resolved" : r.severity === "critical" ? "needs_attention" : "active_work",
            title: r.category ?? r.description?.slice(0, 40) ?? r.id?.slice(0, 8),
            meta: r.description?.slice(0, 60),
            sub: r.created_at ? `${Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)}d` : undefined,
            href: `/app/directory/report/${r.id}`,
            urgency: r.severity as any,
            status: r.status,
          }));
          setReportCards(cards);
        }
      })
      .catch(() => toast.error("Failed to load cases"))
      .finally(() => setLoading(false));
  }, [orgId]);

  const { cards, setCards, columns, label } = useMemo(() => {
    switch (tab) {
      case "requests":
        return { cards: requestCards, setCards: setRequestCards, columns: REQUEST_COLS, label: "request" };
      case "resources":
        return { cards: resourceCards, setCards: setResourceCards, columns: RESOURCE_COLS, label: "resource" };
      default:
        return { cards: caseCards, setCards: setCaseCards, columns: CASE_COLS, label: "case" };
    }
  }, [tab, caseCards, requestCards, resourceCards, reportCards]);

  const totalOpen = cards.filter((c) => c.col !== "resolved" && c.col !== "Resolved").length;

  const [modalOpen, setModalOpen] = useState(false);
  const [mobileCol, setMobileCol] = useState<string>(CASE_COLS[0].id);

  // Reset mobile column to first when tab changes
  useEffect(() => {
    setMobileCol(columns[0]?.id ?? "");
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const onDrop = (colId: string) => {
    if (!dragId) return;
    const card = cards.find((c) => c.id === dragId);
    if (!card) return;
    const previousCol = card.col;

    // Optimistic update
    setCards((prev) => prev.map((c) => (c.id === dragId ? { ...c, col: colId } : c)));
    setDragId(null);
    setDragOverCol(null);

    // API mutation + toast
    if (tab === "cases" || tab === "requests") {
      api.crmCaseAction("transition_status", { request_id: card.id, new_status: colId })
        .then(() => toast.success(`Moved to ${colId}`))
        .catch(() => {
          // Rollback optimistic update on failure
          setCards((prev) => prev.map((c) => (c.id === dragId ? { ...c, col: previousCol } : c)));
          toast.error("Failed to update status");
        });
    }
  };

  // Merge default table columns with the org's table_config (hide + custom cols)
  function mergeColumns(defaults: TableColumn[], tabKey: string): TableColumn[] {
    const cfg = orgTableConfig[tabKey];
    if (!cfg) return defaults;
    let cols = [...defaults];
    // Hide columns
    if (cfg.hidden?.length) cols = cols.filter(c => !cfg.hidden.includes(c.id));
    // Add custom metadata columns
    if (cfg.custom?.length) {
      for (const custom of cfg.custom) {
        cols.push({ id: custom.id, label: custom.label, source: custom.source, editable: custom.editable ?? true, type: custom.type ?? 'text', width: custom.width ?? 140 });
      }
    }
    return cols;
  }

  async function handleTableSave(rowId: string, field: string, value: any) {
    if (field === 'status' && tab === 'requests') {
      await api.crmCaseAction('transition_status', { request_id: rowId, new_status: value });
    } else if (field === 'status' && tab === 'resources') {
      await api.inventoryUpdateCondition(rowId, value);
    } else if (field === 'description') {
      await api.efCall('crm-directory', { action: 'update_record', record_type: tab === 'requests' ? 'request' : 'resource', record_id: rowId, field: 'description', value });
    } else if (field === 'urgency') {
      await api.efCall('crm-directory', { action: 'update_record', record_type: 'request', record_id: rowId, field: 'urgency', value });
    }
    toast.success('Saved');
  }

  const refreshCases = () => {
    setLoading(true);
    api.crmSosesList({ limit: 200, org_id: orgId || undefined })
      .then((data: any) => {
        const items: any[] = data?.cases ?? (Array.isArray(data) ? data : []);
        if (items.length > 0) {
          const newCards = mapCasesToCards(items);
          setLiveCases(newCards);
          setCaseCards(newCards);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const TABS: { id: TabKey; label: string; count: number }[] = [
    { id: "cases", label: "Cases", count: casesTotal },
    { id: "requests", label: "Requests", count: requestsTotal },
    { id: "resources", label: "Resources", count: resourcesTotal },
  ];

  return (
    <CrmShell module="Cases">
      {modalOpen && (
        <CreateCaseModal
          orgId={orgId || ""}
          onClose={() => setModalOpen(false)}
          onCreated={refreshCases}
        />
      )}
      <PageHeader
        title="Cases"
        subtitle={`${totalOpen} open · ${tab === 'cases' ? casesTotal : tab === 'requests' ? requestsTotal : resourcesTotal} total ${label}s · drag to change stage`}
        actions={
          <button
            onClick={() => tab === "cases" && setModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition"
          >
            <Plus size={12} /> New {label}
          </button>
        }
      />

      {/* Tab strip */}
      <div className="px-6 pt-4 flex items-center gap-1 border-b border-[var(--hairline)]">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative h-11 px-3 inline-flex items-center gap-2 text-[12px] font-medium transition ${
                active ? "text-white" : "text-white/55 hover:text-white/85"
              }`}
            >
              {t.label}
              <span className="font-mono text-xs text-white/40 tabular-nums">{t.count}</span>
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-px bg-[#EF4E4B]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Board / table view toggle */}
      <div className="px-6 pt-3 flex justify-end">
        <div className="inline-flex rounded-lg overflow-hidden border border-[var(--hairline)]">
          {(["kanban", "table"] as const).map((mode) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  height: 28,
                  fontSize: 11,
                  padding: "0 12px",
                  background: active ? "var(--sos-navy)" : "transparent",
                  color: active ? "#fff" : "var(--foreground)",
                  opacity: active ? 1 : 0.5,
                  fontWeight: active ? 600 : 500,
                  transition: "background 150ms ease, color 150ms ease",
                }}
              >
                {mode === "kanban" ? "Board" : "Table"}
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === "kanban" ? (
        <>
      {/* Mobile column switcher */}
      <div role="tablist" aria-label="Case stages" className="md:hidden flex gap-1.5 px-4 pt-3 pb-1 overflow-x-auto">
        {columns.map((col) => (
          <button
            key={col.id}
            role="tab"
            aria-selected={mobileCol === col.id}
            aria-controls={`col-${col.id}`}
            onClick={() => {
              setMobileCol(col.id);
              const el = document.getElementById(`col-${col.id}`);
              el?.parentElement?.scrollTo({ left: el.offsetLeft - 16, behavior: 'smooth' });
            }}
            className={`shrink-0 h-7 px-3 rounded-full text-[11px] font-medium transition ${
              mobileCol === col.id
                ? "bg-[var(--sos-navy)] text-white"
                : "bg-foreground/5 text-[var(--foreground)]/50 hover:text-[var(--foreground)]/80"
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-[var(--foreground)]/30 text-center mt-1 md:hidden">← swipe columns →</p>

      <div className="px-4 pt-4 pb-4">
        <div
          className="grid gap-3 overflow-x-auto snap-x md:snap-none"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }}
        >
          {loading
            ? columns.map((col) => <SkeletonColumn key={col.id} accent={col.accent} />)
            : columns.map((col) => {
                const items = cards.filter((c) => c.col === col.id);
                const isOver = dragOverCol === col.id;
                return (
                  <div
                    key={col.id}
                    id={`col-${col.id}`}
                    role="tabpanel"
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverCol !== col.id) setDragOverCol(col.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverCol === col.id) setDragOverCol(null);
                    }}
                    onDrop={() => onDrop(col.id)}
                    className={`snap-start rounded-2xl border p-3 transition ${
                      isOver
                        ? "bg-white/[0.06] border-white/20"
                        : "bg-[var(--surface-1)] border-[var(--hairline)]"
                    }`}
                  >
                    <div className="flex items-center justify-between px-1.5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} aria-hidden="true" />
                        <span className="sr-only">{col.label}: </span>
                        <span className="font-mono text-xs uppercase tracking-wider text-white/75">
                          {col.label}
                        </span>
                      </div>
                      <CountChip>{items.length}</CountChip>
                    </div>

                    <div className="space-y-2 min-h-[80px]">
                      {items.map((c) => (
                        <DraggableCard
                          key={c.id}
                          card={c}
                          tab={tab}
                          columns={columns}
                          onDragStart={() => setDragId(c.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setDragOverCol(null);
                          }}
                          onMoveTo={(colId) => onDrop(colId)}
                          isDragging={dragId === c.id}
                        />
                      ))}
                      {items.length === 0 && (
                        <div className="rounded-xl border border-dashed border-white/8 py-6 text-center font-mono text-xs uppercase tracking-wider text-white/30">
                          Drop here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
        </>
      ) : (
        <div className="px-4 pt-4 pb-4">
          <EditableTable
            columns={mergeColumns(tab === "cases" ? CASE_TABLE_COLS : tab === "requests" ? REQUEST_TABLE_COLS : RESOURCE_TABLE_COLS, tab)}
            rows={cards}
            onSave={handleTableSave}
            onRowClick={(id) => { const card = cards.find((c) => c.id === id); if (card?.href) window.location.href = card.href; }}
            loading={loading}
            emptyMessage={"No " + tab + " found"}
          />
        </div>
      )}
    </CrmShell>
  );
}

function DraggableCard({
  card,
  tab,
  columns,
  onDragStart,
  onDragEnd,
  onMoveTo,
  isDragging,
}: {
  card: Card;
  tab: TabKey;
  columns: Column[];
  onDragStart: () => void;
  onDragEnd: () => void;
  onMoveTo: (colId: string) => void;
  isDragging: boolean;
}) {
  const [touchMoveOpen, setTouchMoveOpen] = useState(false);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => setTouchMoveOpen(true), 300);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  return (
    <div className="relative">
      <Link
        href={card.href}
        draggable
        onDragStart={(e) => {
          // Prevent ghost from being the full link drag-image quirks
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onClick={(e) => {
          // suppress click if a drag just happened or touch-move menu is open
          if (isDragging || touchMoveOpen) e.preventDefault();
        }}
        className={`block rounded-xl p-3 bg-white/4 hover:bg-white/7 border border-transparent hover:border-white/8 transition cursor-grab active:cursor-grabbing ${
          isDragging ? "opacity-40" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium leading-tight truncate">{card.title}</p>
          {card.urgency && (
            <>
              <UrgencyBadge urgency={card.urgency} />
              <span className="sr-only">{card.urgency}</span>
            </>
          )}
        </div>
        {card.meta && <p className="text-[11px] text-white/50 mt-1 truncate">{card.meta}</p>}
        {card.sub && (
          <p className="text-xs text-white/35 mt-1.5 tabular-nums">{card.sub}</p>
        )}
        {card.orgName && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <span className="text-[11px]" style={{ color: card.orgColor }}>
              {card.orgName}
            </span>
          </div>
        )}
      </Link>
      {touchMoveOpen && (
        <div className="mt-1 rounded-lg bg-[#0F1E2B] border border-white/15 p-2 z-10">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 px-1 pb-1">Move to stage</p>
          <select
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-[12px] text-white focus:outline-none appearance-none"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onMoveTo(e.target.value);
                setTouchMoveOpen(false);
              }
            }}
            onBlur={() => setTouchMoveOpen(false)}
          >
            <option value="" disabled>Select stage…</option>
            {columns.map((col) => (
              <option key={col.id} value={col.id}>{col.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
