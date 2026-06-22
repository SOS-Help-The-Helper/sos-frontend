"use client";

/**
 * Case detail — Phase 2 of the console redesign.
 * Two-column: LEFT entity card (identity + actions) · RIGHT tabs
 * (Details / Timeline / Items / Chat). Composed entirely from
 * @/components/console. Data via lib/api (cases.detail EF) only.
 * Redesign 2026-06 (SOS Connect System).
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Share2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import {
  ConsoleShell,
  AgentPanel,
  Surface,
  SectionLabel,
  MonogramTile,
  Tag,
  Chip,
  Badge,
  Button,
  Field,
  Tabs,
  StatusDot,
  Skeleton,
  EmptyState,
  Dropdown,
  ScoreBreakdown,
  useDemoMode,
  URGENCY_TONE,
  stageLabel,
  stageTone,
  resolveStage,
  type AgentMessage,
  type DisasterOption,
  type StatusTone,
  type TabItem,
  type DropdownItem,
} from "@/components/console";

/* ------------------------------------------------------------------ */
/* Narrow shapes for cases.detail (verified live)                      */
/* ------------------------------------------------------------------ */
type Meta = Record<string, unknown> | null | undefined;

interface Person {
  id?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  verification_level?: string;
  email?: string;
  phone?: string;
  location_text?: string;
  home_region?: string;
  metadata?: Meta;
}
interface Sos {
  id?: string;
  status?: string;
  urgency?: string;
  household_size?: number;
  has_children?: boolean;
  has_elderly?: boolean;
  has_disabled?: boolean;
  has_pets?: boolean;
  request_count?: number;
  resource_count?: number;
  housing_type?: string;
  housing_status?: string;
  metadata?: Meta;
  created_at?: string;
  channel?: string;
  assigned_to?: string;
  coordinator?: string;
}
interface ReqItem {
  id?: string;
  title?: string;
  description?: string;
  urgency?: string;
  status?: string;
  county?: string;
  state?: string;
  taxonomy_code?: string;
  category?: string;
}
interface ResItem {
  id?: string;
  category?: string;
  description?: string;
  status?: string;
  capacity_available?: number;
  city?: string;
  county?: string;
}
interface MatchItem {
  request_id?: string;
  resource_id?: string;
  match_score?: number;
  match_reasoning?: string | Record<string, unknown> | null;
  status?: string;
}
interface TimelineItem {
  who?: string;
  author?: string;
  actor?: string;
  kind?: string;
  event_type?: string;
  msg?: string;
  text?: string;
  message?: string;
  time?: string;
  date?: string;
}
interface NoteItem {
  id?: string;
  content?: string;
  text?: string;
  created_at?: string;
  author_name?: string;
  note_type?: string;
}
interface CaseDetail {
  id?: string;
  person?: Person;
  sos?: Sos;
  requests?: ReqItem[];
  resources?: ResItem[];
  matches?: MatchItem[];
  notes?: NoteItem[];
  timeline?: TimelineItem[];
  household_members?: unknown[];
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
function personName(p?: Person): string {
  if (!p) return "Unnamed";
  return p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unnamed";
}
function shortRef(id: string): string {
  return `SOS-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}
function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function metaStr(meta: Meta, ...keys: string[]): string | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  for (const k of keys) {
    const v = (meta as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
    if (Array.isArray(v) && v.length) return v.map(String).join(", ");
  }
  return undefined;
}

const TABS: TabItem[] = [
  { id: "details", label: "Details" },
  { id: "timeline", label: "Timeline" },
  { id: "items", label: "Items" },
  { id: "chat", label: "Chat" },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function CaseDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const router = useRouter();
  const { orgId, loading: authLoading } = useAuthContext();
  const demo = useDemoMode();

  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("details");
  const [disasters, setDisasters] = useState<DisasterOption[]>([]);

  useEffect(() => {
    let alive = true;
    api
      .crmDisastersList()
      .then((d: unknown) => {
        if (!alive) return;
        const raw = (d as { disasters?: DisasterOption[] })?.disasters ?? (Array.isArray(d) ? (d as DisasterOption[]) : []);
        setDisasters(raw.map((x) => ({ id: x.id, name: x.name, day: x.day })));
      })
      .catch(() => alive && setDisasters([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (authLoading || !orgId || !id) return;
    let alive = true;
    setDetail(null);
    setNotFound(false);
    api
      .crmCasesDetail({ sos_id: id })
      .then((d: unknown) => {
        if (!alive) return;
        if (!d) {
          setNotFound(true);
          return;
        }
        setDetail(d as CaseDetail);
      })
      .catch(() => alive && setNotFound(true));
    return () => {
      alive = false;
    };
  }, [id, orgId, authLoading, demo]);

  const person = detail?.person;
  const sos = detail?.sos;
  const name = personName(person);
  const urgency = (sos?.urgency || "").toLowerCase();
  const urgencyTone: StatusTone = URGENCY_TONE[urgency] || "neutral";
  const stage = resolveStage(sos?.status);

  const matchByRequest = useMemo(() => {
    const m: Record<string, MatchItem> = {};
    for (const x of detail?.matches ?? []) if (x.request_id) m[x.request_id] = x;
    return m;
  }, [detail?.matches]);

  const counts = useMemo(
    () => ({
      requests: detail?.requests?.length ?? sos?.request_count ?? 0,
      resources: detail?.resources?.length ?? sos?.resource_count ?? 0,
      timeline: detail?.timeline?.length ?? 0,
      notes: detail?.notes?.length ?? 0,
    }),
    [detail, sos],
  );

  const tabItems: TabItem[] = TABS.map((t) =>
    t.id === "items"
      ? { ...t, count: counts.requests + counts.resources }
      : t.id === "timeline"
        ? { ...t, count: counts.timeline }
        : t.id === "chat"
          ? { ...t, count: counts.notes }
          : t,
  );

  const actionItems: DropdownItem[] = [
    { id: "match", label: "Find matches", tone: "matching", onSelect: () => router.push(`/app/match?sos=${id}`) },
    { id: "coordinator", label: "Assign coordinator" },
    { id: "add-request", label: "Add request" },
    { id: "add-resource", label: "Add resource" },
    { id: "status", label: "Update status" },
    { id: "escalate", label: "Escalate", tone: "new" },
    { id: "close", label: "Close case", tone: "neutral" },
  ];

  const share = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  const agentMessages: AgentMessage[] = useMemo(
    () => [
      {
        id: "m1",
        role: "agent",
        text: `${name} — ${counts.requests} request${counts.requests === 1 ? "" : "s"}, ${counts.resources} resource${counts.resources === 1 ? "" : "s"}.`,
      },
      {
        id: "m2",
        role: "agent",
        text: detail?.matches?.length ? "I scored the open matches — want a recommendation?" : "No matches yet. I can search for candidates.",
      },
    ],
    [name, counts.requests, counts.resources, detail?.matches?.length],
  );

  const subActions = (
    <Button variant="ghost" size="sm" leading={<ArrowLeft size={14} />} onClick={() => router.push("/app/cases")}>
      Cases
    </Button>
  );

  const loading = !authLoading && detail === null && !notFound;

  return (
    <ConsoleShell
      disasters={disasters}
      subActions={subActions}
      agent={
        <AgentPanel
          status={urgency ? `Priority · ${urgency}` : "Reviewing case"}
          statusTone={urgencyTone === "neutral" ? "active" : urgencyTone}
          messages={agentMessages}
          suggestions={[
            { id: "match", label: "Find matches", tone: "matching", onSelect: () => router.push(`/app/match?sos=${id}`) },
          ]}
          onSend={() => setTab("chat")}
        />
      }
    >
      {notFound ? (
        <Surface variant="card" radius="xl">
          <EmptyState title="Case not found" hint="This case ID doesn’t exist or you don’t have access to it." />
        </Surface>
      ) : loading ? (
        <DetailSkeleton />
      ) : (
        <div
          className="cn-detail-grid"
          style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 16, maxWidth: 1200, margin: "0 auto" }}
        >
          {/* LEFT — entity card */}
          <Surface variant="card" radius="xl" style={{ alignSelf: "start", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <MonogramTile name={name} type="person" size={52} />
              <div style={{ minWidth: 0 }}>
                <Tag type="person" verified={!!person?.verification_level && person.verification_level !== "none"} />
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "var(--cn-text)", marginTop: 2, lineHeight: 1.1 }}>{name}</div>
              </div>
            </div>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--cn-text-3)", letterSpacing: "0.02em" }}>
              {[
                shortRef(sos?.id || detail?.id || id),
                person?.home_region ? `${person.home_region} County` : person?.location_text,
                sos?.household_size ? `household of ${sos.household_size}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {urgency && <Chip tone={urgencyTone}>{urgency}</Chip>}
              <Chip tone={stageTone(stage)}>{stageLabel(stage)}</Chip>
              {sos?.channel && (
                <Chip tone="neutral" dot={false}>
                  {sos.channel}
                </Chip>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Dropdown
                trigger={
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      height: 38,
                      padding: "0 16px",
                      borderRadius: 10,
                      background: "var(--cn-coral)",
                      color: "var(--cn-text)",
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                      fontSize: 13.5,
                    }}
                  >
                    Actions <ChevronDown size={14} />
                  </span>
                }
                items={actionItems}
              />
              <Button variant="secondary" size="md" leading={<Share2 size={14} />} onClick={share}>
                Share
              </Button>
            </div>
          </Surface>

          {/* RIGHT — tabs */}
          <Surface variant="card" pad={0} radius="xl" style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 14px" }}>
              <Tabs items={tabItems} value={tab} onChange={setTab} />
            </div>
            <div role="tabpanel" style={{ padding: 18 }}>
              {tab === "details" && <DetailsTab person={person} sos={sos} />}
              {tab === "timeline" && <TimelineTab items={detail?.timeline ?? []} />}
              {tab === "items" && (
                <ItemsTab requests={detail?.requests ?? []} resources={detail?.resources ?? []} matchByRequest={matchByRequest} />
              )}
              {tab === "chat" && <ChatTab notes={detail?.notes ?? []} />}
            </div>
          </Surface>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .cn-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </ConsoleShell>
  );
}

/* ------------------------------------------------------------------ */
/* Details tab                                                         */
/* ------------------------------------------------------------------ */
function DetailsTab({ person, sos }: { person?: Person; sos?: Sos }) {
  const householdFlags = [
    sos?.has_children && "children",
    sos?.has_elderly && "elderly",
    sos?.has_disabled && "disabled",
    sos?.has_pets && "pets",
  ].filter(Boolean) as string[];

  const opened = [fmtDate(sos?.created_at), sos?.channel ? `via ${sos.channel}` : null].filter(Boolean).join(" · ");
  const language = metaStr(person?.metadata, "language", "preferred_language");
  const medical = metaStr(sos?.metadata, "medical", "medical_needs", "conditions");

  return (
    <div>
      <Field label="Coordinator">{sos?.coordinator || sos?.assigned_to || "Unassigned"}</Field>
      <Field label="Opened">{opened || "—"}</Field>
      <Field label="Address">{person?.location_text || person?.home_region || "—"}</Field>
      <Field label="Household">
        {sos?.household_size ? `Household of ${sos.household_size}` : "—"}
        {householdFlags.length > 0 && (
          <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", marginLeft: 8 }}>
            {householdFlags.map((f) => (
              <Chip key={f} tone="reserved" dot={false}>
                {f}
              </Chip>
            ))}
          </span>
        )}
      </Field>
      <Field label="Pets">{sos?.has_pets ? "Yes" : "None reported"}</Field>
      <Field label="Language">{language || "—"}</Field>
      <Field label="Medical">{medical || "—"}</Field>
      <Field label="Priority">
        <Chip tone={URGENCY_TONE[(sos?.urgency || "").toLowerCase()] || "neutral"}>{sos?.urgency || "—"}</Chip>
      </Field>
      <Field label="Stage">
        <Chip tone={stageTone(resolveStage(sos?.status))}>{stageLabel(resolveStage(sos?.status))}</Chip>
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline tab                                                        */
/* ------------------------------------------------------------------ */
function kindTone(kind: string): StatusTone {
  const k = kind.toLowerCase();
  if (k.includes("fulfil") || k.includes("deliver") || k.includes("complete")) return "active";
  if (k.includes("match")) return "matching";
  if (k.includes("rout") || k.includes("accept") || k.includes("schedul")) return "reserved";
  if (k.includes("file") || k.includes("intake") || k.includes("escalat")) return "new";
  if (k.includes("note") || k.includes("contact")) return "contacted";
  return "neutral";
}

function TimelineTab({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="No activity yet" hint="Status changes, matches and notes will appear here." />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((t, i) => {
        const who = t.who || t.author || t.actor || "System";
        const kind = t.kind || t.event_type || "note";
        const msg = t.msg || t.text || t.message || "";
        const when = [t.date, t.time].filter(Boolean).join(" ");
        return (
          <div key={i} style={{ display: "flex", gap: 11, padding: "11px 2px", borderBottom: "1px solid var(--cn-border)" }}>
            <StatusDot tone={kindTone(kind)} size={9} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13.5, color: "var(--cn-text)" }}>{who}</span>
                  <Chip tone={kindTone(kind)} dot={false}>
                    {kind}
                  </Chip>
                </span>
                {when && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cn-text-3)", whiteSpace: "nowrap" }}>{when}</span>
                )}
              </div>
              {msg && <p style={{ fontSize: 13, color: "var(--cn-text-2)", margin: "4px 0 0", lineHeight: 1.5 }}>{msg}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Items tab                                                           */
/* ------------------------------------------------------------------ */
function ItemsTab({
  requests,
  resources,
  matchByRequest,
}: {
  requests: ReqItem[];
  resources: ResItem[];
  matchByRequest: Record<string, MatchItem>;
}) {
  if (requests.length === 0 && resources.length === 0) {
    return <EmptyState title="No items" hint="Requests and offered resources for this case will appear here." />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {requests.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel tone="new">Requests · {requests.length}</SectionLabel>
          {requests.map((r, i) => {
            const match = r.id ? matchByRequest[r.id] : undefined;
            return (
              <Surface key={r.id || i} variant="raised" pad={3} radius="lg">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <Tag type="request" />
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--cn-text)", marginTop: 2 }}>
                      {r.title || r.category || r.taxonomy_code || "Request"}
                    </div>
                    {r.description && <p style={{ fontSize: 13, color: "var(--cn-text-2)", margin: "4px 0 0", lineHeight: 1.5 }}>{r.description}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                    {r.urgency && <Chip tone={URGENCY_TONE[r.urgency.toLowerCase()] || "neutral"}>{r.urgency}</Chip>}
                    {r.status && (
                      <Chip tone={stageTone(resolveStage(r.status))} dot={false}>
                        {stageLabel(resolveStage(r.status))}
                      </Chip>
                    )}
                  </div>
                </div>
                {match && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--cn-border)" }}>
                    <ScoreBreakdown compact score={match.match_score} reasoning={match.match_reasoning} />
                  </div>
                )}
              </Surface>
            );
          })}
        </section>
      )}

      {resources.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel tone="reserved">Resources · {resources.length}</SectionLabel>
          {resources.map((r, i) => (
            <Surface key={r.id || i} variant="raised" pad={3} radius="lg">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <Tag type="resource" />
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--cn-text)", marginTop: 2 }}>
                    {r.category || r.description?.slice(0, 48) || "Resource"}
                  </div>
                  {r.description && <p style={{ fontSize: 13, color: "var(--cn-text-2)", margin: "4px 0 0", lineHeight: 1.5 }}>{r.description}</p>}
                  {(r.city || r.county) && (
                    <div style={{ fontSize: 12, color: "var(--cn-text-3)", marginTop: 4 }}>{[r.city, r.county].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                  {r.status && (
                    <Chip tone={stageTone(resolveStage(r.status))} dot={false}>
                      {stageLabel(resolveStage(r.status))}
                    </Chip>
                  )}
                  {typeof r.capacity_available === "number" && <Badge tone="blue">{r.capacity_available}</Badge>}
                </div>
              </div>
            </Surface>
          ))}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat tab                                                            */
/* ------------------------------------------------------------------ */
function ChatTab({ notes }: { notes: NoteItem[] }) {
  if (notes.length === 0) {
    return <EmptyState title="No notes" hint="Case notes and coordinator chat will appear here." />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {notes.map((n, i) => (
        <div key={n.id || i} style={{ borderLeft: "2px solid var(--cn-coral)", paddingLeft: 12, paddingTop: 2, paddingBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, color: "var(--cn-text)" }}>{n.author_name || "Coordinator"}</span>
            {n.note_type && (
              <Chip tone="neutral" dot={false}>
                {n.note_type}
              </Chip>
            )}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cn-text-3)", marginLeft: "auto" }}>{fmtDate(n.created_at)}</span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--cn-text-2)", margin: "4px 0 0", lineHeight: 1.55 }}>{n.content || n.text || ""}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function DetailSkeleton() {
  return (
    <div
      className="cn-detail-grid"
      style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 16, maxWidth: 1200, margin: "0 auto" }}
    >
      <Surface variant="card" radius="xl">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Skeleton h={52} w={52} radius={11} />
          <div style={{ flex: 1 }}>
            <Skeleton h={12} w={60} />
            <div style={{ height: 8 }} />
            <Skeleton h={22} w="80%" />
          </div>
        </div>
        <div style={{ height: 16 }} />
        <Skeleton h={12} w="90%" />
        <div style={{ height: 12 }} />
        <Skeleton h={30} w="100%" />
      </Surface>
      <Surface variant="card" radius="xl">
        <Skeleton h={16} w={240} />
        <div style={{ height: 20 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <Skeleton h={12} w="100%" />
          </div>
        ))}
      </Surface>
    </div>
  );
}
