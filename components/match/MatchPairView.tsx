import {
  Users, MapPin, Home, Package, Utensils, Wrench, HeartPulse, Gift, Box, Clock,
} from "lucide-react";
import type { MatchCandidate, MatchResourceKind } from "@/lib/match-data";
import { PIPELINE_STAGES_PAIR } from "@/lib/match-data";
import { PipelineStepper } from "./PipelineStepper";
import {
  MatchCardShell,
  ChainCard,
  ChainArrow,
  ScoreBreakdownPanel,
  TimelinePanel,
  URGENCY_PILL,
  RESOURCE_STATUS_PILL,
} from "./match-primitives";

const KIND_META: Record<MatchResourceKind, { icon: typeof Home; label: string }> = {
  shelter: { icon: Home, label: "Shelter" },
  supply: { icon: Package, label: "Supply" },
  food: { icon: Utensils, label: "Food" },
  repair: { icon: Wrench, label: "Repair" },
  medical: { icon: HeartPulse, label: "Medical" },
  gift_card: { icon: Gift, label: "Gift card" },
  other: { icon: Box, label: "Resource" },
};

export function MatchPairView({ match }: { match: MatchCandidate }) {
  if (!match.survivor || !match.resource) return null;
  const survivor = match.survivor;
  const resource = match.resource;
  const kindMeta = KIND_META[resource.kind] ?? KIND_META.other;
  const KindIcon = kindMeta.icon;

  return (
    <MatchCardShell kindLabel="Two-way match" match={match}>
      {match.pipelineStatus && (
        <PipelineStepper current={match.pipelineStatus} stages={PIPELINE_STAGES_PAIR} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-2 items-stretch">
        <ChainCard
          icon={<Users size={13} className="text-[#89CFF0]" />}
          eyebrow="Survivor"
          title={survivor.name}
          pills={[
            <span key="u" className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${URGENCY_PILL[survivor.urgency]}`}>
              {survivor.urgency}
            </span>,
          ]}
          rows={[
            { label: "Household", value: `${survivor.householdSize} people` },
            { label: "Location", value: `${survivor.county}, ${survivor.state}`, icon: <MapPin size={10} /> },
          ]}
        />
        <ChainArrow />
        <ChainCard
          icon={<KindIcon size={13} className="text-[#89CFF0]" />}
          eyebrow={kindMeta.label}
          title={resource.title}
          pills={[
            <span key="s" className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${RESOURCE_STATUS_PILL[resource.status]}`}>
              {(resource.status ?? "").replace(/_/g, " ")}
            </span>,
            <span key="o" className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/8 text-white/65">
              {resource.orgName}
            </span>,
          ]}
          rows={[
            ...(resource.capacity ? [{ label: "Capacity", value: resource.capacity }] : []),
            ...(resource.locationLabel ? [{ label: "Location", value: resource.locationLabel, icon: <MapPin size={10} /> }] : []),
            ...(resource.leadTime ? [{ label: "Lead", value: resource.leadTime, icon: <Clock size={10} /> }] : []),
          ]}
        />
      </div>

      <ScoreBreakdownPanel match={match} />

      {match.timeline && <TimelinePanel events={match.timeline} />}
    </MatchCardShell>
  );
}
