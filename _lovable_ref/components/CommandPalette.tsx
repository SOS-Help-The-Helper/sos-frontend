import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, MapPin, Users, Package, FileText, Layers, ArrowRight, Mic, X, Share2 } from "lucide-react";
import { Logomark } from "@/components/Logomark";
import { Link } from "@tanstack/react-router";
import { cases, orgs, people, inventory } from "@/lib/prototype-data";
import { ShareSOS } from "@/components/crm/ShareSOS";

type Msg = { who: "user" | "agent"; text?: string; block?: React.ReactNode };

const cannedQueries = [
  { q: "Show housing cases in Buncombe", icon: Layers, kind: "cases-housing-buncombe", mobile: true },
  { q: "Closest open request on the map", icon: MapPin, kind: "map-closest", mobile: true },
  { q: "Who in our network has a CDL?", icon: Users, kind: "people-cdl", mobile: true },
  { q: "Draft an outreach to Marcus H.", icon: FileText, kind: "draft-marcus", mobile: true },
  { q: "What inventory is low this week?", icon: Package, kind: "inventory-low", mobile: false },
  { q: "Share SOS with a friend", icon: Share2, kind: "share-sos", mobile: false },
] as const;

type Kind = (typeof cannedQueries)[number]["kind"];

export function CommandPalette({
  open,
  onClose,
  module = "Directory",
}: {
  open: boolean;
  onClose: () => void;
  module?: string;
}) {
  const [input, setInput] = useState("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setInput("");
      setThread([]);
      setThinking(false);
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 80);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [thread, thinking]);

  function ask(q: string, kind?: Kind) {
    setThread((t) => [...t, { who: "user", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setThread((t) => [...t, { who: "agent", block: renderBlock(kind, q, onClose) }]);
    }, 520);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const lower = input.toLowerCase();
    const match = cannedQueries.find((c) =>
      c.kind === "cases-housing-buncombe" ? lower.includes("housing") :
      c.kind === "map-closest" ? lower.includes("closest") || lower.includes("map") :
      c.kind === "people-cdl" ? lower.includes("cdl") || lower.includes("driver") :
      c.kind === "draft-marcus" ? lower.includes("draft") || lower.includes("outreach") :
      c.kind === "inventory-low" ? lower.includes("inventory") || lower.includes("low") :
      
      c.kind === "share-sos" ? lower.includes("share") || lower.includes("invite") || lower.includes("refer") :
      false
    );
    ask(input, match?.kind);
  }

  if (!open) return null;

  const isEmpty = thread.length === 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/70 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Ambient background — still, single soft wash */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-[#EF4E4B]/[0.06] blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-[#89CFF0]/[0.06] blur-[120px]" />
      </div>

      <div
        className="relative w-full max-w-3xl mx-4 my-4 md:my-8 flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-[#0a0d12]/85 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="absolute top-3 right-3 z-10">
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-white/55 hover:text-white transition">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(90vh - 9rem)" }}>
          {isEmpty ? (
            <div className="px-6 md:px-10 pt-12 pb-6">
              {/* Hero avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#EF4E4B]/30 blur-2xl" />
                  <div className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center ring-1 ring-white/20">
                    <Logomark size={44} />
                  </div>
                </div>
                <h2 className="text-[26px] font-semibold tracking-tight mt-5 text-white">
                  Hi Melissa — I'm <span className="text-[#EF4E4B]">SOS</span>
                </h2>
                <p className="text-[14px] text-white/55 mt-2 max-w-md leading-relaxed">
                  Search, draft, and act across SOS.
                </p>
              </div>

              {/* Suggestion cards */}
              <div className="mt-8">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40 mb-3 px-1">Try asking</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cannedQueries.map((c) => (
                    <button
                      key={c.kind}
                      onClick={() => ask(c.q, c.kind)}
                      className={`group relative flex items-center gap-3 text-left px-3.5 py-3 rounded-xl bg-white/[0.04] hover:bg-[#89CFF0]/[0.08] border border-white/8 hover:border-[#89CFF0]/30 transition ${c.mobile ? "" : "hidden sm:flex"}`}
                    >
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[#89CFF0]/10 text-[#89CFF0] group-hover:bg-[#89CFF0]/20 transition">
                        <c.icon size={13} />
                      </span>
                      <p className="text-[13px] text-white/85 group-hover:text-white leading-snug flex-1 min-w-0">{c.q}</p>
                      <ArrowRight size={12} className="transition text-white/25 group-hover:text-[#89CFF0] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          ) : (
            <div className="px-6 md:px-10 py-6 space-y-5">
              {thread.map((m, i) => (
                <Bubble key={i} who={m.who}>
                  {m.text}
                  {m.block}
                </Bubble>
              ))}
              {thinking && (
                <div className="flex gap-3 items-center">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#EF4E4B] to-[#89CFF0] flex items-center justify-center shrink-0 ring-1 ring-white/15">
                    <Sparkles size={12} className="text-white animate-pulse" />
                  </div>
                  <div className="flex gap-1 px-3 py-2 rounded-2xl bg-white/[0.04]">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/45 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/45 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/45 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="p-3 md:p-4 border-t border-white/8 shrink-0 bg-white/[0.02]">
          <div className="relative rounded-2xl bg-white/[0.06] border border-white/10 focus-within:border-[#89CFF0]/40 focus-within:bg-white/[0.08] transition">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e as unknown as React.FormEvent);
                }
              }}
              rows={1}
              placeholder="Ask SOS anything — search, summarize, draft, navigate…"
              className="w-full bg-transparent text-white text-[14px] placeholder:text-white/35 focus:outline-none resize-none px-4 pt-3.5 pb-2 leading-relaxed"
              style={{ minHeight: "48px", maxHeight: "160px" }}
            />
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              <div className="flex items-center gap-1">
                <button type="button" className="w-7 h-7 rounded-md hover:bg-white/8 text-white/45 hover:text-white flex items-center justify-center transition" title="Voice">
                  <Mic size={12} />
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/10 hover:bg-white/15 disabled:bg-white/[0.04] disabled:text-white/35 text-white text-[11.5px] font-medium transition"
              >
                Send <Send size={10} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Bubble({ who, children }: { who: "user" | "agent"; children: React.ReactNode }) {
  if (who === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-md bg-white/[0.08] border border-white/10 text-white text-[13.5px] leading-relaxed">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#EF4E4B] to-[#89CFF0] flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-white/15">
        <Sparkles size={12} className="text-white" />
      </div>
      <div className="max-w-[88%] text-[13.5px] text-white/90 space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────────────
// Inline result blocks — each query renders a real component
// ──────────────────────────────────────────────────────────────────────

function renderBlock(kind: Kind | undefined, q: string, close: () => void): React.ReactNode {
  switch (kind) {
    case "cases-housing-buncombe":
      return <CaseListBlock query="HOUSING.* · Buncombe" close={close} />;
    case "map-closest":
      return <MapMiniBlock close={close} />;
    case "people-cdl":
      return <PersonCardBlock credential="CDL Class B" close={close} />;
    case "draft-marcus":
      return <DraftBlock to="Marcus H." />;
    case "inventory-low":
      return <InventoryBlock close={close} />;
    case "share-sos":
      return <ShareBlock />;
    default:
      return (
        <div className="px-3 py-2 rounded-lg bg-white/5 text-white/65 text-[12px]">
          I'd interpret <span className="text-white/85">"{q}"</span> and route it to the right module. In production I can search, draft, and act across everything in SOS.
        </div>
      );
  }
}

function ShareBlock() {
  return (
    <div className="space-y-2.5">
      <p className="text-white/85">
        Here's your personal invite link. Each person who joins earns you Community points toward your SOS Score.
      </p>
      <div className="rounded-xl bg-white/[0.04] border border-[var(--hairline)] p-3">
        <ShareSOS personId="p-melissa-hart" compact />
      </div>
    </div>
  );
}

function ResultShell({ label, count, children, action }: { label: string; count?: number; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-[var(--hairline)] overflow-hidden">
      <div className="flex items-center justify-between px-3 h-8 border-b border-[var(--hairline)]">
        <span className="t-meta">{label}{typeof count === "number" ? ` · ${count}` : ""}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function CaseListBlock({ query, close }: { query: string; close: () => void }) {
  const hits = cases.filter((c) => c.county === "Buncombe" && c.taxonomy.some((t) => t.startsWith("HOUSING")));
  // Synthesize a couple more so it looks substantive
  const display = [...hits, ...cases.filter((c) => c.taxonomy[0].startsWith("HOUSING")).slice(0, 2)].slice(0, 4);
  return (
    <ResultShell label={query} count={display.length} action={<Link to="/cases" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">open ↗</Link>}>
      <div>
        {display.map((c) => {
          const org = orgs.find((o) => o.id === c.org);
          return (
            <Link key={c.id} to="/cases/$id" params={{ id: c.parentCaseId ?? c.id }} onClick={close} className="row row-hover">
              <span className="font-mono text-[10px] text-white/40 w-12 shrink-0">{c.id}</span>
              <span className="text-[12.5px] font-medium flex-1 truncate">{c.citizen}</span>
              <span className="t-meta hidden sm:inline">{c.county}</span>
              {org && <span className="w-2 h-2 rounded-full" style={{ background: org.color }} />}
            </Link>
          );
        })}
      </div>
    </ResultShell>
  );
}

function MapMiniBlock({ close }: { close: () => void }) {
  return (
    <ResultShell label="Closest open request" action={<Link to="/map" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">open map ↗</Link>}>
      <div className="p-3">
        <div className="relative rounded-lg overflow-hidden bg-[var(--background)] h-32">
          <svg viewBox="0 0 300 130" className="w-full h-full">
            <circle cx="80" cy="60" r="38" fill="rgba(137,207,240,0.08)" stroke="rgba(137,207,240,0.25)" />
            <circle cx="170" cy="50" r="32" fill="rgba(137,207,240,0.05)" stroke="rgba(137,207,240,0.18)" />
            <circle cx="220" cy="85" r="28" fill="rgba(137,207,240,0.05)" stroke="rgba(137,207,240,0.18)" />
            <circle cx="80" cy="60" r="6" fill="#EF4E4B" />
            <circle cx="80" cy="60" r="14" fill="none" stroke="#EF4E4B" strokeWidth="1" opacity="0.4">
              <animate attributeName="r" from="6" to="20" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <div className="flex items-center justify-between mt-3 px-1">
          <div>
            <p className="text-[12.5px] font-medium">Janet T. · C-1042</p>
            <p className="t-meta mt-0.5">Buncombe · 2.4 mi from you · HOUSING.TEMPORARY</p>
          </div>
          <Link to="/cases/$id" params={{ id: "C-1042" }} onClick={close} className="text-[11px] text-[#89CFF0] hover:text-white inline-flex items-center gap-1">
            Open <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </ResultShell>
  );
}

function PersonCardBlock({ credential, close }: { credential: string; close: () => void }) {
  const hits = people.filter((p) => p.credentials.some((c) => c.includes("CDL")));
  return (
    <ResultShell label={`People with ${credential}`} count={hits.length} action={<Link to="/directory" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">directory ↗</Link>}>
      <div>
        {hits.map((p) => {
          const org = orgs.find((o) => o.id === p.org);
          return (
            <Link key={p.id} to="/directory/person/$id" params={{ id: p.id }} onClick={close} className="row row-hover">
              <div className="w-8 h-8 rounded-full bg-[#89CFF0]/15 text-[#89CFF0] flex items-center justify-center text-[11px] font-semibold shrink-0">
                {p.name.split(" ").map((s) => s[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium truncate">{p.name}</p>
                <p className="t-meta mt-0.5 truncate normal-case tracking-normal">{p.role} · {org?.name}</p>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399] font-mono">verified</span>
            </Link>
          );
        })}
      </div>
    </ResultShell>
  );
}

function DraftBlock({ to }: { to: string }) {
  const draft = `Hi ${to.split(" ")[0]} — checking in on your repair + childcare needs. Blue Ridge is scheduled Mar 14 for the muck-out; Mountain Area Aid has childcare slots Tues/Wed. Reply YES to confirm both, or tell me what's changed. — Melissa, Mountain Area Aid`;
  return (
    <ResultShell label={`Draft → ${to}`} action={<span className="t-meta">SMS · 178 chars</span>}>
      <div className="p-3 space-y-2">
        <textarea
          defaultValue={draft}
          rows={4}
          className="w-full text-[12.5px] text-white/90 bg-transparent resize-none focus:outline-none leading-relaxed"
        />
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="t-meta">References U-204 · 3 child cases</span>
          <div className="flex gap-1.5">
            <button className="h-7 px-2.5 rounded-md text-[11px] text-white/65 hover:text-white hover:bg-white/[0.06]">Regenerate</button>
            <button className="h-7 px-2.5 rounded-md text-[11px] bg-[#EF4E4B] hover:bg-[#d94340] text-white font-medium">Send</button>
          </div>
        </div>
      </div>
    </ResultShell>
  );
}

function InventoryBlock({ close }: { close: () => void }) {
  const low = inventory.filter((i) => i.qty < i.threshold);
  return (
    <ResultShell label="Inventory below threshold" count={low.length} action={<Link to="/inventory" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">inventory ↗</Link>}>
      <div>
        {low.map((i) => {
          const org = orgs.find((o) => o.id === i.org);
          const pct = Math.min(100, Math.round((i.qty / i.threshold) * 100));
          return (
            <div key={i.id} className="row">
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium truncate">{i.item}</p>
                <p className="t-meta mt-0.5 truncate normal-case tracking-normal">{org?.name} · {i.location}</p>
              </div>
              <div className="w-20 shrink-0">
                <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full bg-[#EF4E4B]" style={{ width: `${pct}%` }} />
                </div>
                <p className="t-meta text-right mt-1 normal-case tracking-normal">{i.qty}/{i.threshold}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ResultShell>
  );
}
