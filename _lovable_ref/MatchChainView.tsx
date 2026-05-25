import {
  Users, MapPin, Truck, UserCheck, Search,
  Clock, Award, AlertCircle,
} from "lucide-react";
import { drivers, type MatchCandidate, type Driver } from "@/lib/prototype-data";
import { PipelineStepper } from "./PipelineStepper";
import {
  MatchCardShell,
  ChainCard,
  ChainArrow,
  ScoreBreakdownPanel,
  TimelinePanel,
  Bar,
  URGENCY_PILL,
  RV_STATUS_PILL,
  DRIVER_STATUS_PILL,
} from "./match-primitives";

export function MatchChainView({ match }: { match: MatchCandidate }) {
  if (!match.survivor || !match.rv || !match.pipelineStatus) return null;

  const driver: Driver | null = match.driverId ? drivers[match.driverId] ?? null : null;
  const survivor = match.survivor;
  const rv = match.rv;
  const transportScore = match.transportScore;

  return (
    <MatchCardShell kindLabel="Three-way match" match={match}>
      <PipelineStepper current={match.pipelineStatus} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-stretch">
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
          icon={<Truck size={13} className="text-[#89CFF0]" />}
          eyebrow="RV"
          title={`${rv.year} ${rv.make} ${rv.model}`}
          pills={[
            <span key="s" className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${RV_STATUS_PILL[rv.status]}`}>
              {rv.status.replace(/_/g, " ")}
            </span>,
            <span key="c" className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/8 text-white/65">
              {rv.condition}
            </span>,
          ]}
          rows={[
            { label: "VIN", value: <span className="font-mono">····{rv.vinLast5}</span> },
            { label: "Sleeps", value: `${rv.sleeps}` },
          ]}
        />
        <ChainArrow />
        {driver ? (
          <ChainCard
            icon={<UserCheck size={13} className="text-[#89CFF0]" />}
            eyebrow="Driver"
            title={driver.name}
            pills={[
              <span key="s" className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${DRIVER_STATUS_PILL[driver.status]}`}>
                {driver.status.replace(/_/g, " ")}
              </span>,
              driver.hasClassA ? (
                <span key="cdl" className="inline-flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/12 text-[#34D399]">
                  <Award size={9} /> Class A
                </span>
              ) : null,
            ]}
            rows={[
              { label: "Tow", value: driver.towVehicle },
              { label: "Capacity", value: `${driver.towCapacityLbs.toLocaleString()} lbs` },
              { label: "Hours", value: driver.availabilityHours, icon: <Clock size={10} /> },
            ]}
          />
        ) : (
          <AwaitingDriverCard />
        )}
      </div>

      <ScoreBreakdownPanel
        match={match}
        extra={driver && transportScore != null ? (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-white/45 mb-2">Transport score (driver ↔ RV)</p>
            <div className="grid grid-cols-3 gap-2">
              <Bar label="Deadhead" v={Math.max(0, 30 - (driver.deadheadMiles ?? 0) / 10)} max={30} suffix={`${driver.deadheadMiles} mi`} />
              <Bar label="Delivery" v={Math.max(0, 40 - (driver.deliveryMiles ?? 0) / 20)} max={40} suffix={`${driver.deliveryMiles} mi`} />
              <Bar label="Return" v={Math.max(0, 30 - (driver.returnMiles ?? 0) / 20)} max={30} suffix={`${driver.returnMiles} mi`} />
            </div>
          </div>
        ) : undefined}
      />

      {match.timeline && <TimelinePanel events={match.timeline} />}
    </MatchCardShell>
  );
}

function AwaitingDriverCard() {
  return (
    <div className="rounded-xl border border-dashed border-[#F5A524]/40 bg-[#F5A524]/[0.04] p-3.5 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <UserCheck size={13} className="text-[#F5A524]" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#F5A524]">Driver</span>
      </div>
      <div className="flex items-center gap-1.5">
        <AlertCircle size={12} className="text-[#F5A524]" />
        <p className="text-[12.5px] font-medium text-white/85">Awaiting Driver</p>
      </div>
      <p className="text-[11px] text-white/55 leading-snug">
        RV accepted. Dispatch is sourcing a qualified driver within range.
      </p>
      <button className="mt-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-[#89CFF0]/15 text-[#89CFF0] text-[11px] font-medium hover:bg-[#89CFF0]/25 transition">
        <Search size={11} /> Find Driver
      </button>
    </div>
  );
}
