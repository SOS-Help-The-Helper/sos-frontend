import { Building2, Lock, Globe2, Network } from "lucide-react";
import { scopeForOrg, type Scope } from "@/lib/directory-store";

type Props = {
  ownerOrgId: string;
  ownerOrgName?: string;
  size?: "sm" | "md";
};

const META: Record<Scope, { label: string; tint: string; Icon: typeof Lock; marker: string }> = {
  yours:  { label: "Your org", tint: "#89CFF0",              Icon: Building2, marker: "●" },
  shared: { label: "Shared",   tint: "#89CFF0",              Icon: Network,   marker: "○" },
  public: { label: "Public",   tint: "#6B7280", Icon: Globe2,   marker: "◇" },
};

export function StewardshipChip({ ownerOrgId, ownerOrgName, size = "sm" }: Props) {
  const scope = scopeForOrg(ownerOrgId);
  const { label, tint } = META[scope];
  const text = size === "md"
    ? (scope === "shared" && ownerOrgName ? `Shared · ${ownerOrgName}` : label)
    : label;
  const px = size === "sm" ? "text-[10.5px]" : "px-2 py-1 text-[11px] rounded bg-white/[0.04]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono ${px}`}
      style={{ color: tint }}
      title={ownerOrgName ? `Maintained by ${ownerOrgName}` : label}
    >
      <span aria-hidden className="text-[10px] leading-none" style={{ color: tint }}>
        {META[scope].marker}
      </span>
      {text}
    </span>
  );
}


export function StewardshipBand({
  ownerOrgId,
  ownerOrgName,
  onRequestChange,
}: {
  ownerOrgId: string;
  ownerOrgName: string;
  onRequestChange?: () => void;
}) {
  const scope = scopeForOrg(ownerOrgId);
  const editable = scope === "yours";
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] px-3.5 py-2.5 flex items-center gap-3">
      <StewardshipChip ownerOrgId={ownerOrgId} ownerOrgName={ownerOrgName} size="md" />
      <p className="text-[12px] text-white/55 min-w-0 truncate">
        {editable ? (
          <>Maintained by your org · fields below are editable inline.</>
        ) : (
          <>Maintained by {ownerOrgName} · read-only in your view.</>
        )}
      </p>
      <span className="flex-1" />
      {!editable && (
        <button
          onClick={onRequestChange}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white/6 hover:bg-white/10 text-[11.5px] text-white/80 transition"
        >
          Request change
        </button>
      )}
    </div>
  );
}
