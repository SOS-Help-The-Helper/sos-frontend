import { Building2, Lock, Globe2, Network } from "lucide-react";
import { scopeForOrg, type Scope } from "@/lib/directory-store";

type Props = {
  ownerOrgId: string;
  ownerOrgName?: string;
  size?: "sm" | "md";
};

const META: Record<Scope, { label: string; tint: string; Icon: typeof Lock }> = {
  yours: { label: "Your org", tint: "#89CFF0", Icon: Building2 },
  shared: { label: "Shared", tint: "#F5EBD6", Icon: Network },
  public: { label: "Public", tint: "rgba(255,255,255,0.55)", Icon: Globe2 },
};

export function StewardshipChip({ ownerOrgId, ownerOrgName, size = "sm" }: Props) {
  const scope = scopeForOrg(ownerOrgId);
  const { label, tint, Icon } = META[scope];
  const text = scope === "shared" && ownerOrgName ? `Shared · ${ownerOrgName}` : label;
  const px = size === "sm" ? "px-1.5 py-0.5 text-[9.5px]" : "px-2 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider rounded ${px}`}
      style={{ color: tint, background: `${tint}1a` }}
      title={ownerOrgName ? `Maintained by ${ownerOrgName}` : label}
    >
      <Icon size={size === "sm" ? 10 : 12} />
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
