"use client";

export type PinType = "request" | "resource" | "report";

interface PinDetailCardProps {
  type: PinType;
  properties: Record<string, any>;
  onClose: () => void;
  onMatch?: () => void;
}

const CFG: Record<PinType, { label: string; color: string; matchLabel: string }> = {
  request:  { label: "SOS Request",  color: "#EF4E4B", matchLabel: "Match" },
  resource: { label: "SOS Resource", color: "#89CFF0", matchLabel: "Match" },
  report:   { label: "SOS Report",   color: "rgba(255,255,255,0.5)", matchLabel: "Confirm Report" },
};

function timeAgo(d: string | undefined) {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function topCategory(p: Record<string, any>) {
  const t = p.taxonomy_code || p.category || "";
  const top = t.split(".")[0] || "General";
  return top.charAt(0).toUpperCase() + top.slice(1).toLowerCase();
}

/** Extract city/town only — strips street address and zip code */
function townOnly(loc: string | undefined) {
  if (!loc) return null;
  // Remove zip codes (5 or 9 digit)
  let cleaned = loc.replace(/\b\d{5}(-\d{4})?\b/g, "").trim();
  // Split by comma
  const parts = cleaned.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    // "629 Reems Creek Rd", "Weaverville", "NC" → "Weaverville, NC"
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }
  if (parts.length === 2) {
    // Could be "Street, City ST" or "City, ST"
    // If first part has numbers (street address), take second part only
    if (/\d/.test(parts[0])) return parts[1];
    return cleaned;
  }
  // Single part — try to strip leading numbers (street address)
  // "15 Leapfrog Lane Weaverville NC" → harder, just return as-is but strip numbers at start
  const words = cleaned.split(/\s+/);
  // Find first word that looks like a city (uppercase first letter, no numbers)
  // Simple heuristic: skip words that are numbers or contain digits
  const cityWords = words.filter(w => !/^\d/.test(w) && !/\d/.test(w) && w.length > 2);
  if (cityWords.length >= 2) {
    // Take last 2 meaningful words as "City, ST" — but this is rough
    // Better: just return last 2 words
    return cityWords.slice(-2).join(", ");
  }
  return cleaned;
}

/** Truncate text to ~150 chars for card display */
function truncateText(text: string | undefined, max = 150) {
  if (!text) return null;
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function urgencyColor(u: string | undefined) {
  if (!u) return null;
  const colors: Record<string, string> = { critical: "#EF4E4B", high: "#FCD34D", medium: "#89CFF0", low: "rgba(255,255,255,0.3)" };
  return colors[u] || null;
}

export function PinDetailCard({ type, properties: p, onClose, onMatch }: PinDetailCardProps) {
  const c = CFG[type];
  const accentStyle = { backgroundColor: c.color };
  const borderColor = type === "report" ? "rgba(255,255,255,0.3)" : c.color;
  const town = townOnly(p.location_text);
  const desc = truncateText(p.public_display_text || p.description);

  const copyLink = () => {
    const url = p.share_url || `https://sosconnect.org/s/${p.id}?type=${type}`;
    navigator.clipboard?.writeText(url);
  };

  return (
    <div className="relative max-w-[360px] w-full pointer-events-auto" style={{ marginTop: 20 }}>
      {/* Floating logomark */}
      <div
        className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#0F1E2B] flex items-center justify-center z-10"
        style={{ border: `2px solid ${borderColor}`, boxShadow: `0 0 16px ${borderColor}66` }}
      >
        <svg viewBox="0 0 40 40" fill="none" className="w-[22px] h-[22px]">
          <path d="M33.3 34.9L26 27.6c-1.5 1.5-3.4 3.1-5.8 4.7-2.4-1.6-4.3-3.2-5.8-4.7L6.8 35C10.3 38.1 15 40 20 40s9.8-1.9 13.3-5.1z" fill={type === "report" ? "#fff" : c.color} />
          <path d="M26.8 12.5c-2-0.6-4.2-0.2-5.7 1.3L20.2 14.9l-1-1c-1.5-1.6-3.7-1.9-5.7-1.3L6.3 5.4C9.9 2.1 14.7 0 20 0s10.2 2.1 13.8 5.6L26.8 12.5z" fill={type === "report" ? "#fff" : c.color} />
          <path d="M6.3 7.8L5.1 6.7C1.9 10.2 0 14.9 0 20s2.1 10.2 5.6 13.8L6.7 32.7C3.6 29.4 1.7 24.9 1.7 20S3.4 11.1 6.2 7.9l.1-.1z" fill={type === "report" ? "#fff" : c.color} />
          <path d="M33.4 32.5l1.2 1.2C37.9 30.1 40 25.3 40 20s-1.9-9.6-5-13.2L33.9 8C36.7 11.2 38.3 15.4 38.3 20s-1.9 9.2-4.9 12.5z" fill={type === "report" ? "#fff" : c.color} />
        </svg>
      </div>

      {/* Card body — high contrast, opaque */}
      <div className="relative bg-[#152D40] border-[1.5px] border-white/[0.12] rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] pt-7 px-5 pb-4 overflow-hidden">
        {/* Accent line */}
        <div className="absolute top-0 left-5 right-5 h-[2px]" style={accentStyle} />

        {/* Close */}
        <button onClick={onClose} className="absolute top-2 right-2.5 w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white/50 hover:text-white text-sm flex items-center justify-center transition">×</button>

        {/* Type label */}
        <div className="text-[10px] uppercase tracking-[1px] font-bold mb-0.5" style={{ color: c.color }}>{c.label}</div>

        {/* Category title */}
        <h3 className="font-serif text-lg text-white font-normal leading-tight mb-2.5">{topCategory(p)}</h3>

        {/* Meta row — urgency dot, status, time, town, household */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60 pb-2.5 mb-2.5 border-b border-white/[0.08]">
          {p.urgency && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: urgencyColor(p.urgency) || 'rgba(255,255,255,0.3)' }} />
              <span className="capitalize">{p.urgency}</span>
            </span>
          )}
          {p.status && <span className="capitalize">{p.status}</span>}
          {p.created_at && <span className="flex items-center gap-1"><ClockIcon />{timeAgo(p.created_at)}</span>}
          {town && <span className="flex items-center gap-1"><PinIcon />{town}</span>}
          {type === "request" && p.household_size && <span className="flex items-center gap-1"><UsersIcon />Family of {p.household_size}</span>}
          {type === "resource" && p.org_name && <span className="flex items-center gap-1"><OrgIcon />{p.org_name}</span>}
        </div>

        {/* Description — truncated, high contrast, no header */}
        {desc && (
          <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-3 mb-3">
            <p className="text-[13px] text-white/80 leading-relaxed">{desc}</p>
          </div>
        )}

        {/* Capacity bar — resources only */}
        {type === "resource" && p.capacity_available != null && (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-white/50">Capacity</span>
              <span className="text-sky-400 font-bold">{p.capacity_remaining ?? p.capacity_available} / {p.capacity_available} available</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.1]">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, ((p.capacity_remaining ?? p.capacity_available) / p.capacity_available) * 100)}%` }} />
            </div>
          </div>
        )}

        {/* Corroboration — reports only */}
        {type === "report" && p.corroboration_count != null && p.corroboration_count > 0 && (
          <div className="bg-white/[0.06] rounded-lg p-2 flex items-center gap-3 mb-3">
            <span className="font-serif text-lg font-bold text-white/80">{p.corroboration_count}</span>
            <span className="text-[11px] text-white/50 leading-tight">other reports within 500m<br/>in the last 24 hours</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mb-1">
          <button
            onClick={onMatch}
            className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-bold text-center transition ${
              type === "request" ? "bg-[#EF4E4B] text-white hover:bg-red-600" :
              type === "resource" ? "bg-[#89CFF0] text-[#0F1E2B] hover:bg-sky-300" :
              "bg-white/15 text-white hover:bg-white/20"
            }`}
          >{c.matchLabel}</button>
          <button className="flex-1 py-2.5 rounded-[10px] text-[13px] font-bold bg-white/[0.08] text-white/70 border border-white/[0.1] hover:bg-white/[0.12] transition">Comment</button>
        </div>

        {/* Share row */}
        <div className="border-t border-white/[0.06] mt-1 pt-2.5 flex justify-center gap-4">
          <span className="text-[10px] text-white/40 hover:text-sky-400 cursor-pointer flex items-center gap-1"><ShareIcon />Share</span>
          <span onClick={copyLink} className="text-[10px] text-white/40 hover:text-sky-400 cursor-pointer flex items-center gap-1"><CopyIcon />Copy Link</span>
          <span className="text-[10px] text-white/40 hover:text-sky-400 cursor-pointer flex items-center gap-1"><MapIcon />View on Map</span>
        </div>
      </div>
    </div>
  );
}

const ClockIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-60"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zM8.5 4H7v4.5l3.5 2 .75-1.23L8.5 7.5V4z"/></svg>;
const PinIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-60"><path d="M8 0C5.2 0 3 2.2 3 4.9 3 8.4 8 14 8 14s5-5.6 5-9.1C13 2.2 10.8 0 8 0zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>;
const UsersIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-60"><path d="M7 1v2H5a2 2 0 00-2 2v1h10V5a2 2 0 00-2-2H9V1H7zM3 7v6a2 2 0 002 2h6a2 2 0 002-2V7H3z"/></svg>;
const OrgIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-60"><path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4zm1 3h6v1H5V5zm0 2h6v1H5V7zm0 2h3v1H5V9z"/></svg>;
const ShareIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M10 2a2 2 0 110 4 2 2 0 010-4zM4 6a2 2 0 110 4 2 2 0 010-4zM10 10a2 2 0 110 4 2 2 0 010-4zM8.6 4.5L5.4 6.5M5.4 9.5l3.2 2"/></svg>;
const CopyIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M5 2a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H5zM3 5a1 1 0 00-1 1v7a1 1 0 001 1h6v-1H3V5z"/></svg>;
const MapIcon = () => <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M1 3l4-2 6 2 4-2v12l-4 2-6-2-4 2V3zm4-.5v10l6 2v-10l-6-2z"/></svg>;

export default PinDetailCard;
