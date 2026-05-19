'use client';

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, MapPin, Users, Package, FileText, Calendar, Layers, ArrowRight, Mic, Command as CmdIcon, X, Radio } from "lucide-react";
import Link from "next/link";
import { cases, orgs, people, inventory, events as shifts } from "@/lib/prototype-data";

type Msg = { who: "user" | "agent"; text?: string; block?: React.ReactNode };

const cannedQueries = [
  { q: "Show housing cases in Buncombe", icon: Layers, kind: "cases-housing-buncombe", hint: "Filter cases" },
  { q: "Closest open request on the map", icon: MapPin, kind: "map-closest", hint: "Geospatial" },
  { q: "Who in our network has a CDL?", icon: Users, kind: "people-cdl", hint: "Find people" },
  { q: "Draft an outreach to Marcus H.", icon: FileText, kind: "draft-marcus", hint: "Compose" },
  { q: "What inventory is low this week?", icon: Package, kind: "inventory-low", hint: "Logistics" },
  { q: "Today's volunteer shifts", icon: Calendar, kind: "shifts-today", hint: "Schedule" },
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
      c.kind === "shifts-today" ? lower.includes("shift") || lower.includes("today") :
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
      {/* Ambient mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-[#EF4E4B]/15 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-[#89CFF0]/15 blur-[120px] animate-pulse" style={{ animationDuration: "11s" }} />
        <div className="absolute top-1/3 right-1/4 w-[30vw] h-[30vw] rounded-full bg-[#34D399]/8 blur-[100px] animate-pulse" style={{ animationDuration: "14s" }} />
      </div>

      <div
        className="relative w-full max-w-3xl mx-4 my-4 md:my-8 flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-[#0a0d12]/85 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top status bar */}
        <div className="h-11 px-4 flex items-center justify-between border-b border-white/8 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="relative flex items-center justify-center w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-[#34D399] animate-ping opacity-60" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
              <Radio size={9} className="inline -mt-0.5 mr-1" /> Listening · {module}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="font-mono text-[9px] text-white/45 px-1.5 py-0.5 rounded bg-white/8">esc</kbd>
            <button onClick={onClose} className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/55 hover:text-white transition">
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(90vh - 11rem)" }}>
          {isEmpty ? (
            <div className="px-6 md:px-10 pt-10 pb-6">
              {/* Hero avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#EF4E4B] to-[#89CFF0] blur-2xl opacity-50 animate-pulse" style={{ animationDuration: "3s" }} />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#EF4E4B] via-[#c45c7c] to-[#89CFF0] flex items-center justify-center ring-1 ring-white/20">
                    <Sparkles size={28} className="text-white drop-shadow" strokeWidth={2.2} />
                  </div>
                </div>
                <h2 className="text-[26px] font-semibold tracking-tight mt-5 text-white">
                  Hi Melissa — I'm <span className="bg-gradient-to-r from-[#EF4E4B] to-[#89CFF0] bg-clip-text text-transparent">SOS</span>
                </h2>
                <p className="text-[14px] text-white/55 mt-2 max-w-md leading-relaxed">
                  Your coordination partner. I can search across cases, people, inventory, and the map — draft messages, surface gaps, and act on what you need.
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
                      className="group relative flex items-start gap-3 text-left px-3.5 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 hover:border-[#89CFF0]/30 transition"
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#89CFF0]/12 text-[#89CFF0] flex items-center justify-center shrink-0 group-hover:bg-[#89CFF0]/20 transition">
                        <c.icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[8.5px] uppercase tracking-wider text-white/40 group-hover:text-[#89CFF0]/80 transition">{c.hint}</p>
                        <p className="text-[12.5px] text-white/85 group-hover:text-white mt-0.5 leading-snug">{c.q}</p>
                      </div>
                      <ArrowRight size={12} className="text-white/25 group-hover:text-[#89CFF0] mt-1.5 transition" />
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
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/35 inline-flex items-center gap-1 ml-1">
                  <CmdIcon size={9} /> + Enter to send
                </span>
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-gradient-to-r from-[#EF4E4B] to-[#c45c7c] hover:from-[#d94340] hover:to-[#b04e6c] disabled:from-white/10 disabled:to-white/10 disabled:text-white/35 text-white text-[11.5px] font-medium transition"
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
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-md bg-gradient-to-br from-[#89CFF0]/22 to-[#89CFF0]/12 border border-[#89CFF0]/20 text-white text-[13.5px] leading-relaxed">
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
    case "shifts-today":
      return <ShiftsBlock close={close} />;
    default:
      return (
        <div className="px-3 py-2 rounded-lg bg-white/5 text-white/65 text-[12px]">
          I'd interpret <span className="text-white/85">"{q}"</span> and route it to the right module. In production I can search, draft, and act across everything in SOS.
        </div>
      );
  }
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
  const display = [...hits, ...cases.filter((c) => c.taxonomy[0].startsWith("HOUSING")).slice(0, 2)].slice(0, 4);
  return (
    <ResultShell label={query} count={display.length} action={<Link href="/cases" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">open ↗</Link>}>
      <div>
        {display.map((c) => {
          const org = orgs.find((o) => o.id === c.org);
          return (
            <Link key={c.id} href={`/cases/${c.umbrella ?? c.id}`} onClick={close} className="row row-hover">
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
    <ResultShell label="Closest open request" action={<Link href="/map" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">open map ↗</Link>}>
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
          <Link href="/cases/C-1042" onClick={close} className="text-[11px] text-[#89CFF0] hover:text-white inline-flex items-center gap-1">
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
    <ResultShell label={`People with ${credential}`} count={hits.length} action={<Link href="/directory" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">directory ↗</Link>}>
      <div>
        {hits.map((p) => {
          const org = orgs.find((o) => o.id === p.org);
          return (
            <Link key={p.id} href={`/directory/person/${p.id}`} onClick={close} className="row row-hover">
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
    <ResultShell label="Inventory below threshold" count={low.length} action={<Link href="/inventory" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">inventory ↗</Link>}>
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

function ShiftsBlock({ close }: { close: () => void }) {
  const today = shifts.slice(0, 3);
  return (
    <ResultShell label="Shifts today" count={today.length} action={<Link href="/calendar" onClick={close} className="text-[10px] font-mono uppercase tracking-wider text-[#89CFF0] hover:text-white">calendar ↗</Link>}>
      <div>
        {today.map((s) => {
          const org = orgs.find((o) => o.id === s.org);
          const full = s.filled >= s.slots;
          return (
            <div key={s.id} className="row">
              <div className="w-1 h-8 rounded-full shrink-0" style={{ background: org?.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium truncate">{s.title}</p>
                <p className="t-meta mt-0.5 normal-case tracking-normal">{s.date} · {s.time} · {org?.name}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums ${full ? "bg-[#34D399]/15 text-[#34D399]" : "bg-[#F5EBD6]/15 text-[#F5EBD6]"}`}>
                {s.filled}/{s.slots}
              </span>
            </div>
          );
        })}
      </div>
    </ResultShell>
  );
}
