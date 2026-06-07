"use client";

export type PinType = "request" | "resource" | "report";

interface PinDetailCardProps {
  type: PinType;
  properties: Record<string, any>;
  onClose: () => void;
  onMatch?: () => void;
}

const CFG: Record<PinType, {
  label: string; color: string; matchLabel: string;
  cardBg: string; cardBorder: string;
  titleColor: string; metaColor: string; descBg: string; descBorder: string; descText: string;
  btnPrimary: string; btnSecondary: string; shareColor: string;
}> = {
  request: {
    label: "SOS Request", color: "#EF4E4B", matchLabel: "Match",
    cardBg: "#2A1519", cardBorder: "rgba(239,78,75,0.25)",
    titleColor: "#ffffff", metaColor: "rgba(255,255,255,0.7)", descBg: "rgba(239,78,75,0.08)", descBorder: "rgba(239,78,75,0.15)", descText: "rgba(255,255,255,0.85)",
    btnPrimary: "bg-[#EF4E4B] text-white hover:bg-red-600", btnSecondary: "bg-white/[0.08] text-white/80 border-white/[0.12] hover:bg-white/[0.12]",
    shareColor: "rgba(255,255,255,0.5)",
  },
  resource: {
    label: "SOS Resource", color: "#89CFF0", matchLabel: "Match",
    cardBg: "#142833", cardBorder: "rgba(137,207,240,0.25)",
    titleColor: "#ffffff", metaColor: "rgba(255,255,255,0.7)", descBg: "rgba(137,207,240,0.08)", descBorder: "rgba(137,207,240,0.15)", descText: "rgba(255,255,255,0.85)",
    btnPrimary: "bg-[#89CFF0] text-[#0F1E2B] hover:bg-sky-300", btnSecondary: "bg-white/[0.08] text-white/80 border-white/[0.12] hover:bg-white/[0.12]",
    shareColor: "rgba(255,255,255,0.5)",
  },
  report: {
    label: "SOS Report", color: "rgba(255,255,255,0.6)", matchLabel: "Confirm Report",
    cardBg: "#1E2A33", cardBorder: "rgba(255,255,255,0.2)",
    titleColor: "#ffffff", metaColor: "rgba(255,255,255,0.7)", descBg: "rgba(255,255,255,0.06)", descBorder: "rgba(255,255,255,0.1)", descText: "rgba(255,255,255,0.85)",
    btnPrimary: "bg-white/20 text-white hover:bg-white/25", btnSecondary: "bg-white/[0.08] text-white/80 border-white/[0.12] hover:bg-white/[0.12]",
    shareColor: "rgba(255,255,255,0.5)",
  },
};

function timeAgo(d: string | undefined) {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function topCategory(p: Record<string, any>) {
  const t = p.taxonomy_code || p.category || "";
  const top = t.split(".")[0] || "General";
  return top.charAt(0).toUpperCase() + top.slice(1).toLowerCase();
}

function townOnly(loc: string | undefined) {
  if (!loc) return null;
  // Strip zip codes
  let cleaned = loc.replace(/\b\d{5}(-\d{4})?\b/g, "").trim().replace(/,\s*$/, "");
  const parts = cleaned.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    // "629 Reems Creek Rd, Weaverville, NC" → "Weaverville, NC"
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }
  if (parts.length === 2) {
    // If first part has a number (street), skip it
    if (/\d/.test(parts[0])) return parts[1].trim();
    return cleaned;
  }
  // Single part — "629 reems creek road weaverville nc"
  // Try to find state abbreviation at end
  const stateMatch = cleaned.match(/\b([A-Z]{2})\s*$/i);
  if (stateMatch) {
    // Remove state, find city-like word before it
    const beforeState = cleaned.replace(/\b[A-Z]{2}\s*$/i, "").trim();
    const words = beforeState.split(/\s+/);
    // Last non-numeric word is likely the city
    const cityWords = [];
    for (let i = words.length - 1; i >= 0 && cityWords.length < 2; i--) {
      if (!/^\d/.test(words[i])) cityWords.unshift(words[i]);
      else break;
    }
    if (cityWords.length > 0) {
      const city = cityWords.join(" ");
      return `${city.charAt(0).toUpperCase()}${city.slice(1)}, ${stateMatch[1].toUpperCase()}`;
    }
  }
  return cleaned;
}

function truncateText(text: string | undefined, max = 150) {
  if (!text) return null;
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function urgencyColor(u: string | undefined) {
  const colors: Record<string, string> = { critical: "#EF4E4B", high: "#FCD34D", medium: "#89CFF0", low: "rgba(255,255,255,0.4)" };
  return u ? colors[u] || "rgba(255,255,255,0.4)" : null;
}

export function PinDetailCard({ type, properties: p, onClose, onMatch }: PinDetailCardProps) {
  const c = CFG[type];
  const town = townOnly(p.location_text);
  // Only show AI-generated summary, NEVER raw user comments
  const desc = truncateText(p.public_display_text);

  const copyLink = () => {
    const url = p.share_url || `https://sosconnect.org/s/${p.id}?type=${type}`;
    navigator.clipboard?.writeText(url);
  };

  return (
    <div className="relative max-w-[360px] w-full pointer-events-auto" style={{ marginTop: 20 }}>
      {/* Floating logomark — proper SVG from Figma */}
      <div
        className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
        style={{ backgroundColor: c.cardBg, border: `2px solid ${c.color}`, boxShadow: `0 0 16px ${c.color}44` }}
      >
        <img src={type === "request" ? "/logomark-red.svg" : type === "resource" ? "/logomark-blue.svg" : "/logomark-white.svg"} alt="SOS" className="w-[22px] h-[22px]" />
      </div>

      {/* Card body — themed by type */}
      <div className="relative rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] pt-7 px-5 pb-4 overflow-hidden"
        style={{ backgroundColor: c.cardBg, border: `1.5px solid ${c.cardBorder}` }}>
        {/* Accent line */}
        <div className="absolute top-0 left-5 right-5 h-[2px]" style={{ backgroundColor: c.color }} />

        {/* Close — small, subtle */}
        <button onClick={onClose} className="absolute top-3 right-3 text-white/30 hover:text-white/60 text-xs transition leading-none">✕</button>

        {/* Type label */}
        <div className="text-[10px] uppercase tracking-[1px] font-bold mb-0.5" style={{ color: c.color }}>{c.label}</div>

        {/* Category title — WHITE, high contrast */}
        <h3 className="font-serif text-xl font-normal leading-tight mb-2.5" style={{ color: c.titleColor }}>{topCategory(p)}</h3>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] pb-2.5 mb-2.5" style={{ color: c.metaColor, borderBottom: `1px solid ${c.cardBorder}` }}>
          {p.urgency && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: urgencyColor(p.urgency)! }} />
              <span className="capitalize">{p.urgency}</span>
            </span>
          )}
          {p.status && <span className="capitalize">{p.status}</span>}
          {p.created_at && <span className="flex items-center gap-1"><ClockIcon />{timeAgo(p.created_at)}</span>}
          {town && <span className="flex items-center gap-1"><PinIcon />{town}</span>}
          {type === "request" && p.household_size && <span className="flex items-center gap-1"><UsersIcon />Family of {p.household_size}</span>}
          {type === "resource" && p.org_name && <span className="flex items-center gap-1"><OrgIcon />{p.org_name}</span>}
        </div>

        {/* Description — themed box, no header */}
        {desc && (
          <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: c.descBg, border: `1px solid ${c.descBorder}` }}>
            <p className="text-[13px] leading-relaxed" style={{ color: c.descText }}>{desc}</p>
          </div>
        )}

        {/* Capacity bar — resources only */}
        {type === "resource" && p.capacity_available != null && (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span style={{ color: c.metaColor }}>Capacity</span>
              <span className="font-bold" style={{ color: c.color }}>{p.capacity_remaining ?? p.capacity_available} / {p.capacity_available}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.1]">
              <div className="h-full rounded-full" style={{ backgroundColor: c.color, width: `${Math.min(100, ((p.capacity_remaining ?? p.capacity_available) / p.capacity_available) * 100)}%` }} />
            </div>
          </div>
        )}

        {/* Corroboration — reports only */}
        {type === "report" && p.corroboration_count != null && p.corroboration_count > 0 && (
          <div className="rounded-lg p-2 flex items-center gap-3 mb-3" style={{ backgroundColor: c.descBg }}>
            <span className="font-serif text-lg font-bold text-white/90">{p.corroboration_count}</span>
            <span className="text-[11px] leading-tight" style={{ color: c.metaColor }}>other reports within 500m<br/>in the last 24 hours</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mb-1">
          <button onClick={onMatch} className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-bold text-center transition ${c.btnPrimary}`}>{c.matchLabel}</button>
          <button className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-bold border transition ${c.btnSecondary}`}>Comment</button>
        </div>

        {/* Share row */}
        <div className="mt-1 pt-2.5 flex justify-center gap-4" style={{ borderTop: `1px solid ${c.cardBorder}` }}>
          <span className="text-[10px] hover:text-sky-400 cursor-pointer flex items-center gap-1" style={{ color: c.shareColor }}><ShareIcon />Share</span>
          <span onClick={copyLink} className="text-[10px] hover:text-sky-400 cursor-pointer flex items-center gap-1" style={{ color: c.shareColor }}><CopyIcon />Copy Link</span>
          <span className="text-[10px] hover:text-sky-400 cursor-pointer flex items-center gap-1" style={{ color: c.shareColor }}><MapIcon />View on Map</span>
        </div>
      </div>
    </div>
  );
}

const ClockIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-70"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zM8.5 4H7v4.5l3.5 2 .75-1.23L8.5 7.5V4z"/></svg>;
const PinIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-70"><path d="M8 0C5.2 0 3 2.2 3 4.9 3 8.4 8 14 8 14s5-5.6 5-9.1C13 2.2 10.8 0 8 0zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>;
const UsersIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-70"><path d="M7 1v2H5a2 2 0 00-2 2v1h10V5a2 2 0 00-2-2H9V1H7zM3 7v6a2 2 0 002 2h6a2 2 0 002-2V7H3z"/></svg>;
const OrgIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-70"><path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4zm1 3h6v1H5V5zm0 2h6v1H5V7zm0 2h3v1H5V9z"/></svg>;
const ShareIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M10 2a2 2 0 110 4 2 2 0 010-4zM4 6a2 2 0 110 4 2 2 0 010-4zM10 10a2 2 0 110 4 2 2 0 010-4zM8.6 4.5L5.4 6.5M5.4 9.5l3.2 2"/></svg>;
const CopyIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M5 2a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H5zM3 5a1 1 0 00-1 1v7a1 1 0 001 1h6v-1H3V5z"/></svg>;
const MapIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M1 3l4-2 6 2 4-2v12l-4 2-6-2-4 2V3zm4-.5v10l6 2v-10l-6-2z"/></svg>;

export default PinDetailCard;
