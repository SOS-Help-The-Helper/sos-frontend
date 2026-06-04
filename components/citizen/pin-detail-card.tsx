"use client";

import { MapPin, Clock, Users, AlertTriangle, Package, FileText, Heart } from "lucide-react";

export type PinType = "request" | "resource" | "report";

interface PinDetailCardProps {
  type: PinType;
  properties: Record<string, any>;
  onClose: () => void;
  onMatch?: () => void;
}

const TYPE_CONFIG = {
  request: {
    label: "SOS Request",
    color: "#EF4E4B",
    colorFaded: "rgba(239,78,75,",
    logomark: "/logomark-red.svg",
    matchLabel: "I Can Help",
  },
  resource: {
    label: "Resource Available",
    color: "#89CFF0",
    colorFaded: "rgba(137,207,240,",
    logomark: "/logomark-blue.svg",
    matchLabel: "I Need This",
  },
  report: {
    label: "Field Report",
    color: "#FFFFFF",
    colorFaded: "rgba(255,255,255,",
    logomark: "/logomark-white.svg",
    matchLabel: "Report Update",
  },
};

const URGENCY_STYLE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-200/80",
  low: "bg-white/8 text-white/50",
};

const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  housing: Heart,
  food: Package,
  health: AlertTriangle,
  transport: MapPin,
  supplies: Package,
};

export function PinDetailCard({ type, properties: p, onClose, onMatch }: PinDetailCardProps) {
  const cfg = TYPE_CONFIG[type];
  const category = (p.category || p.taxonomy_code?.split(".")?.[0] || "").toLowerCase();
  const CategoryIcon = CATEGORY_ICONS[category] || MapPin;

  // Normalize field names across data sources
  const householdSize = p.household_size || p.household;
  const urgency = p.urgency;
  const status = p.status;
  const description = p.public_display_text || p.description || p.details;
  const displayName = p.display_name || p.name;
  const locationText = p.location_text || p.location;
  const taxonomyCode = p.taxonomy_code;
  const capacity = p.capacity_available || p.capacity;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-25 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Centered card */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-6">
        <div
          className="pointer-events-auto w-full max-w-[340px] animate-[cardPop_0.25s_ease-out] relative"
          style={{
            background: "rgba(26, 56, 80, 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "24px",
            boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 40px ${cfg.colorFaded}0.15)`,
          }}
        >
          {/* Border */}
          <div
            className="absolute inset-0 rounded-[24px] pointer-events-none"
            style={{
              border: `1.5px solid ${cfg.colorFaded}0.3)`,
              mask: "linear-gradient(to bottom, transparent 0px, transparent 24px, black 24px)",
              WebkitMask: "linear-gradient(to bottom, transparent 0px, transparent 24px, black 24px)",
            }}
          />

          {/* Top logomark */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(15,30,43,0.95)",
                boxShadow: `0 0 24px ${cfg.colorFaded}0.4)`,
                border: `2px solid ${cfg.colorFaded}0.4)`,
              }}
            >
              <img src={cfg.logomark} alt="SOS" className="w-8 h-8" />
            </div>
          </div>

          <div className="px-6 pt-6 pb-5">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-4 text-white/30 hover:text-white text-lg transition-colors"
            >
              ✕
            </button>

            {/* Type label */}
            <p
              className="text-center text-[11px] font-bold uppercase tracking-[0.2em] mb-1"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </p>

            {/* Taxonomy / category */}
            {taxonomyCode && (
              <p className="text-center text-[10px] text-white/40 uppercase tracking-wider mb-3">
                {taxonomyCode.replace(/\./g, " · ")}
              </p>
            )}

            {/* Display name */}
            {displayName && (
              <p className="text-center text-xs font-semibold text-white/90 mb-1">{displayName}</p>
            )}

            {/* Description */}
            {description && (
              <p className="text-center text-sm text-white/70 leading-relaxed mb-4 line-clamp-3">
                {description}
              </p>
            )}
            {!description && (
              <p className="text-center text-sm text-white/50 leading-relaxed mb-4 italic">
                {category.replace(/_/g, " ")} {type}
              </p>
            )}

            {/* Location */}
            {locationText && (
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <MapPin size={12} className="text-white/40 shrink-0" />
                <p className="text-[12px] text-white/50 truncate max-w-[240px]">{locationText}</p>
              </div>
            )}

            {/* Metadata pills */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap mb-5">
              {/* Status */}
              {status && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">
                  {status}
                </span>
              )}

              {/* Request-specific */}
              {type === "request" && urgency && (
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${URGENCY_STYLE[urgency] || URGENCY_STYLE.medium}`}
                >
                  {urgency}
                </span>
              )}
              {type === "request" && householdSize && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/60 flex items-center gap-1">
                  <Users size={10} /> {householdSize}
                </span>
              )}

              {/* Resource-specific */}
              {type === "resource" && capacity != null && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                  Capacity: {capacity}
                </span>
              )}

              {/* Category pill */}
              {category && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/8 text-white/50 capitalize flex items-center gap-1">
                  <CategoryIcon size={10} />
                  {category.replace(/_/g, " ")}
                </span>
              )}
            </div>

            {/* Match button */}
            {onMatch && (
              <button
                onClick={onMatch}
                className="w-full py-3 rounded-2xl text-white text-xs font-bold tracking-wide active:scale-[0.97] transition-transform"
                style={{
                  background: cfg.color,
                  boxShadow: `0 4px 20px ${cfg.colorFaded}0.3)`,
                  color: type === "resource" ? "#0F1E2B" : "#FFFFFF",
                }}
              >
                {cfg.matchLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes cardPop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </>
  );
}
