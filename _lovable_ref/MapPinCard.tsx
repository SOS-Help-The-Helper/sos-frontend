import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  X, ChevronLeft, ChevronRight, MessageSquare, Sparkles, Share2,
  ArrowUpRight, Send, ShieldCheck, Calendar,
} from "lucide-react";
import { Logomark } from "@/components/Logomark";
import {
  cases, requests, resources, reports, events, facilities,
  type ReqDetail, type ResourceDetail, type ReportDetail, type Facility,
} from "@/lib/prototype-data";

export type PinLayer =
  | "cases" | "requests" | "resources" | "reports" | "events" | "facilities";

const LAYER: Record<PinLayer, { label: string; color: string }> = {
  cases:      { label: "Case",     color: "#F59E0B" },
  requests:   { label: "Request",  color: "#EF4E4B" },
  resources:  { label: "Resource", color: "#89CFF0" },
  reports:    { label: "Report",   color: "#FBBF24" },
  events:     { label: "Event",    color: "#A78BFA" },
  facilities: { label: "Facility", color: "#34D399" },
};

export type SelectedPin = { layer: PinLayer; id: string; href: string };

export function MapPinCard({
  pin, x, y, onClose,
}: { pin: SelectedPin; x: number; y: number; onClose: () => void }) {
  const [stack, setStack] = useState<SelectedPin[]>([pin]);
  const current = stack[stack.length - 1];
  const push = (p: SelectedPin) => setStack((s) => [...s, p]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const accent = LAYER[current.layer].color;

  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"above" | "below">("above");
  const [shiftX, setShiftX] = useState(0);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const parentRect = el.offsetParent?.getBoundingClientRect();
    setPlacement(y - rect.height - 24 < 8 ? "below" : "above");
    if (parentRect) {
      const half = rect.width / 2;
      let dx = 0;
      if (x - half < 8) dx = 8 - (x - half);
      else if (x + half > parentRect.width - 8) dx = parentRect.width - 8 - (x + half);
      setShiftX(dx);
    }
  }, [x, y, stack.length]);

  const translateY = placement === "above" ? "calc(-100% - 18px)" : "18px";

  return (
    <div
      ref={cardRef}
      className="pointer-events-auto absolute z-30 w-[300px] max-w-[calc(100vw-24px)]"
      style={{ left: x + shiftX, top: y, transform: `translate(-50%, ${translateY})` }}
      role="dialog"
    >
      <div
        className="rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: "var(--sos-navy)",
          boxShadow: "0 20px 50px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Header — centered logomark */}
        <div className="relative px-4 pt-4 pb-2">
          {stack.length > 1 && (
            <button
              onClick={pop}
              className="absolute left-2.5 top-2.5 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60"
              aria-label="Back"
            >
              <ChevronLeft size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute right-2.5 top-2.5 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60"
            aria-label="Close"
          >
            <X size={15} />
          </button>
          <div className="flex flex-col items-center gap-1.5">
            <Logomark size={26} className="opacity-95" />
            <span
              className="font-mono text-[9.5px] uppercase tracking-[0.14em]"
              style={{ color: accent }}
            >
              {LAYER[current.layer].label}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-1">
          <Variant pin={current} push={push} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

function Variant({
  pin, push, onClose,
}: { pin: SelectedPin; push: (p: SelectedPin) => void; onClose: () => void }) {
  switch (pin.layer) {
    case "cases":      return <CaseCard id={pin.id} push={push} onClose={onClose} />;
    case "requests":   return <RequestCard id={pin.id} onClose={onClose} />;
    case "resources":  return <ResourceCard id={pin.id} onClose={onClose} />;
    case "reports":    return <ReportCard id={pin.id} onClose={onClose} />;
    case "events":     return <EventCard id={pin.id} onClose={onClose} />;
    case "facilities": return <FacilityCard id={pin.id} onClose={onClose} />;
  }
}

// ============ Primitives ============

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-[19px] leading-tight text-white text-center">{children}</h2>
  );
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[12.5px] text-white/55 text-center">{children}</p>
  );
}

function Primary({
  children, onClick,
}: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-10 rounded-full bg-white text-[#0F1E2B] text-[13px] font-semibold hover:bg-white/90 transition"
    >
      {children}
    </button>
  );
}

function SecondaryRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-5 text-[11.5px] text-white/55">
      {children}
    </div>
  );
}

function TextAction({
  icon: Icon, children, onClick,
}: { icon: React.ComponentType<{ size?: number }>; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-white transition">
      <Icon size={11} /> {children}
    </button>
  );
}

function shareLink(href: string) {
  const url = typeof window !== "undefined" ? window.location.origin + href : href;
  navigator?.clipboard?.writeText(url).catch(() => {});
  toast.success("Link copied");
}

// ============ Case ============

function CaseCard({ id, push, onClose }: { id: string; push: (p: SelectedPin) => void; onClose: () => void }) {
  const c = cases.find((x) => x.id === id);
  if (!c) return <Empty label={`Case ${id} not found`} />;

  const childRequests = requests.filter((r) => r.caseId === id);
  const childResources = resources.filter((res) => res.matchedTo?.caseId === id);
  const total = childRequests.length + childResources.length;

  return (
    <>
      <Title>{c.citizen}</Title>
      <Subtitle>{c.county} County · {c.opened}</Subtitle>

      {total > 0 && (
        <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {childRequests.map((r) => (
            <ChildRow
              key={r.id}
              dot="#EF4E4B"
              label={r.taxonomy.replace(/_/g, " ")}
              sub={r.personName}
              onClick={() => push({ layer: "requests", id: r.id, href: `/directory/request/${r.id}` })}
            />
          ))}
          {childResources.map((r) => (
            <ChildRow
              key={r.id}
              dot="#89CFF0"
              label={r.title}
              sub={r.ownerName}
              onClick={() => push({ layer: "resources", id: r.id, href: `/directory/resource/${r.id}` })}
            />
          ))}
        </ul>
      )}

      <div className="mt-5">
        <Primary onClick={() => { window.location.href = `/cases/${c.id}`; onClose(); }}>
          Open case
        </Primary>
      </div>
      <SecondaryRow>
        <TextAction icon={Share2} onClick={() => shareLink(`/cases/${c.id}`)}>Share</TextAction>
        <span className="font-mono text-[10px] text-white/35">{c.id}</span>
      </SecondaryRow>
    </>
  );
}

function ChildRow({
  dot, label, sub, onClick,
}: { dot: string; label: string; sub: string; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 py-2.5 hover:bg-white/[0.04] transition text-left"
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-white truncate">{label}</p>
          <p className="text-[11px] text-white/45 truncate">{sub}</p>
        </div>
        <ChevronRight size={13} className="text-white/30" />
      </button>
    </li>
  );
}

// ============ Request ============

function RequestCard({ id, onClose }: { id: string; onClose: () => void }) {
  const r = requests.find((x) => x.id === id);
  if (!r) return <Empty label={`Request ${id} not found`} />;

  return (
    <>
      <Title>{r.taxonomy.replace(/_/g, " ")}</Title>
      <Subtitle>{r.personName} · {r.county} County</Subtitle>

      <RequestNotes r={r} />

      <div className="mt-5">
        <Primary onClick={() => {
          toast.success("Match started", { description: r.taxonomy });
          window.location.href = `/directory/request/${r.id}`; onClose();
        }}>
          <span className="inline-flex items-center gap-1.5"><Sparkles size={13} /> Match</span>
        </Primary>
      </div>
      <SecondaryRow>
        <TextAction icon={Share2} onClick={() => shareLink(`/directory/request/${r.id}`)}>Share</TextAction>
        <FullRecord to={`/directory/request/${r.id}`} />
      </SecondaryRow>
    </>
  );
}

function RequestNotes({ r }: { r: ReqDetail }) {
  const last = r.notes[r.notes.length - 1];
  if (!last) return null;
  return (
    <p className="mt-4 text-[12.5px] text-white/65 text-center line-clamp-2 italic">
      "{last.msg}"
    </p>
  );
}

// ============ Resource ============

function ResourceCard({ id, onClose }: { id: string; onClose: () => void }) {
  const r = resources.find((x) => x.id === id);
  if (!r) return <Empty label={`Resource ${id} not found`} />;

  return (
    <>
      <Title>{r.title}</Title>
      <Subtitle>{r.ownerName} · {r.location}</Subtitle>

      <p className="mt-4 text-[12.5px] text-white/65 text-center">{r.capacity}</p>

      <div className="mt-5">
        <Primary onClick={() => {
          toast.success("Match started", { description: r.title });
          window.location.href = `/directory/resource/${r.id}`; onClose();
        }}>
          <span className="inline-flex items-center gap-1.5"><Sparkles size={13} /> Match</span>
        </Primary>
      </div>
      <SecondaryRow>
        <TextAction icon={Share2} onClick={() => shareLink(`/directory/resource/${r.id}`)}>Share</TextAction>
        <FullRecord to={`/directory/resource/${r.id}`} />
      </SecondaryRow>
    </>
  );
}

// ============ Report ============

function ReportCard({ id }: { id: string; onClose: () => void }) {
  const r = reports.find((x) => x.id === id);
  const [commenting, setCommenting] = useState(false);
  const [draft, setDraft] = useState("");
  if (!r) return <Empty label={`Report ${id} not found`} />;

  return (
    <>
      <Title>{r.taxonomy.replace(/_/g, " ")}</Title>
      <Subtitle>
        {r.severity} · {r.location}
      </Subtitle>

      {r.verifiedBy && (
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center gap-1 text-[10.5px] text-[#34D399]">
            <ShieldCheck size={11} /> Verified
          </span>
        </div>
      )}

      {commenting ? (
        <div className="mt-4">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            className="w-full h-20 px-3 py-2 rounded-xl bg-white/[0.06] text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          />
          <div className="mt-2.5">
            <Primary onClick={() => {
              if (!draft.trim()) return;
              toast.success("Comment posted");
              setDraft(""); setCommenting(false);
            }}>
              <span className="inline-flex items-center gap-1.5"><Send size={12} /> Post</span>
            </Primary>
          </div>
          <SecondaryRow>
            <TextAction icon={X} onClick={() => { setDraft(""); setCommenting(false); }}>Cancel</TextAction>
          </SecondaryRow>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <Primary onClick={() => setCommenting(true)}>
              <span className="inline-flex items-center gap-1.5"><MessageSquare size={12} /> Comment</span>
            </Primary>
          </div>
          <SecondaryRow>
            <TextAction icon={Share2} onClick={() => shareLink(`/directory/report/${r.id}`)}>Share</TextAction>
            <FullRecord to={`/directory/report/${r.id}`} />
          </SecondaryRow>
        </>
      )}
    </>
  );
}

// ============ Event ============

function EventCard({ id }: { id: string; onClose: () => void }) {
  const e = events.find((x) => x.id === id);
  const [rsvped, setRsvped] = useState(false);
  if (!e) return <Empty label={`Event ${id} not found`} />;

  const full = e.filled >= e.slots;

  return (
    <>
      <Title>{e.title}</Title>
      <Subtitle>{e.date} · {e.time}</Subtitle>

      <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-wider text-white/55">
        {e.filled}/{e.slots} slots filled
      </p>

      <div className="mt-5">
        <Primary onClick={() => {
          if (full && !rsvped) { toast("This event is full"); return; }
          setRsvped((v) => !v);
          toast.success(rsvped ? "RSVP cancelled" : "RSVP confirmed", { description: e.title });
        }}>
          <span className="inline-flex items-center gap-1.5">
            {rsvped ? <ShieldCheck size={13} /> : <Calendar size={13} />}
            {rsvped ? "RSVP'd" : full ? "Join waitlist" : "RSVP"}
          </span>
        </Primary>
      </div>
      <SecondaryRow>
        <TextAction icon={Share2} onClick={() => shareLink(`/calendar#${e.id}`)}>Share</TextAction>
      </SecondaryRow>
    </>
  );
}

// ============ Facility ============

function FacilityCard({ id }: { id: string; onClose: () => void }) {
  const f = facilities.find((x) => x.id === id);
  if (!f) return <Empty label={`Facility ${id} not found`} />;

  return (
    <>
      <Title>{f.name}</Title>
      <Subtitle>{f.type.replace(/_/g, " ")} · {f.address}</Subtitle>

      <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-wider text-white/55">
        {f.currentCount}/{f.capacity} capacity
      </p>

      <div className="mt-5">
        <Primary onClick={() => toast.success("Check-in recorded", { description: f.name })}>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Check in</span>
        </Primary>
      </div>
      <SecondaryRow>
        <TextAction icon={Share2} onClick={() => shareLink(`/inventory#${f.id}`)}>Share</TextAction>
      </SecondaryRow>
    </>
  );
}

// ============ Helpers ============

function FullRecord({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 hover:text-white transition">
      Open <ArrowUpRight size={11} />
    </Link>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-[12.5px] text-white/55 py-6 text-center">{label}</p>;
}

export { LAYER as PIN_LAYER_META };
export type { Facility, ReqDetail, ResourceDetail, ReportDetail };
