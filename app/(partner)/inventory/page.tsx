'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import {
  facilities,
  inventory,
  orgs,
  resources,
  assetEvents,
  type Facility,
  type ResourceDetail,
} from "@/lib/prototype-data";
import { AlertTriangle, Plus, Warehouse, Truck, Package, MapPin, X, ArrowRightLeft, ChevronRight, Star } from "lucide-react";

const TYPE_ICON: Record<Facility["type"], React.ElementType> = {
  staging_lot: Truck,
  warehouse: Warehouse,
  distribution_hub: Package,
  satellite: MapPin,
};

export default function InventoryPage() {
  const [facilityId, setFacilityId] = useState<string | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (facilityId === "all") return inventory;
    const fac = facilities.find((f) => f.id === facilityId);
    return inventory.filter(
      (i) => i.location === fac?.name || i.location.includes(fac?.address.split(",")[0] ?? "")
    );
  }, [facilityId]);

  const lowStock = filteredItems.filter((i) => i.qty < i.threshold);
  const activeFac = facilities.find((f) => f.id === facilityId);
  const drawerResource = drawerId ? resources.find((r) => r.id === drawerId) : null;

  return (
    <CrmShell module="Inventory">
      <PageHeader
        title="Inventory"
        subtitle={`${facilities.length} facilities · ${inventory.length} items tracked · ${lowStock.length} low-stock`}
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Plus size={12} /> Add item
          </button>
        }
      />
      <div className="px-6 pt-6 pb-10 space-y-5">
        {/* Facility selector strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <FacilityChip
            active={facilityId === "all"}
            onClick={() => setFacilityId("all")}
            label="All facilities"
            count={facilities.length}
          />
          {facilities.map((f) => (
            <FacilityChip
              key={f.id}
              active={facilityId === f.id}
              onClick={() => setFacilityId(f.id)}
              label={f.name}
              count={f.currentCount}
              capacity={f.capacity}
              color={orgs.find((o) => o.id === f.org)?.color}
              type={f.type}
            />
          ))}
        </div>

        {activeFac && <FacilityHeader f={activeFac} />}

        {/* Capacity bars (all-facilities view) */}
        {facilityId === "all" && (
          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 mb-3">Capacity by facility</p>
            <div className="space-y-2">
              {facilities.map((f) => {
                const pct = (f.currentCount / f.capacity) * 100;
                const color = pct > 90 ? "#EF4E4B" : pct > 70 ? "#F5EBD6" : "#34D399";
                return (
                  <div key={f.id} className="rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12.5px] font-medium">{f.name}</span>
                      <span className="font-mono text-[10.5px] tabular-nums text-white/65">{f.currentCount} / {f.capacity}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Low-stock alerts */}
        {lowStock.length > 0 && (
          <div className="rounded-2xl bg-[#F5EBD6]/10 border border-[#F5EBD6]/30 p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-[#F5EBD6] mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-[13px]">
                {lowStock.length} items below threshold{activeFac && ` at ${activeFac.name}`}
              </p>
              <p className="text-[12px] text-white/65 mt-0.5">{lowStock.map((i) => i.item).join(" · ")}</p>
            </div>
          </div>
        )}

        {/* Tracked assets table */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 mb-3">Tracked assets</p>
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-white/45 border-b border-[var(--hairline)]">
                  <th className="px-4 py-3 font-normal">ID</th>
                  <th className="px-4 py-3 font-normal">Item</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Condition</th>
                  <th className="px-4 py-3 font-normal">Location</th>
                  <th className="px-4 py-3 font-normal">Last event</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => {
                  const lastEvt = assetEvents.filter((e) => e.resourceId === r.id).slice(-1)[0];
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setDrawerId(r.id)}
                      className="border-t border-white/5 hover:bg-white/4 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-white/45">{r.id}</td>
                      <td className="px-4 py-3 font-medium">{r.title}</td>
                      <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                      <td className="px-4 py-3"><Stars n={4} /></td>
                      <td className="px-4 py-3 text-white/65 text-[12px]">{r.location}</td>
                      <td className="px-4 py-3 font-mono text-[10.5px] text-white/55">{lastEvt?.timestamp ?? "—"}</td>
                      <td className="px-4 py-3 text-right"><ChevronRight size={14} className="text-white/35 inline" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Resources / inventory table */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 mb-3">Resources</p>
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-white/45 border-b border-[var(--hairline)]">
                  <th className="px-4 py-3 font-normal">Item</th>
                  <th className="px-4 py-3 font-normal">Owner</th>
                  <th className="px-4 py-3 font-normal">Location</th>
                  <th className="px-4 py-3 font-normal text-right">Qty</th>
                  <th className="px-4 py-3 font-normal text-right">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it) => {
                  const org = orgs.find((o) => o.id === it.org);
                  const low = it.qty < it.threshold;
                  return (
                    <tr key={it.id} className="border-t border-white/5 hover:bg-white/4 transition">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {low && <span className="w-1.5 h-1.5 rounded-full bg-[#F5EBD6]" />}
                          {it.item}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: org?.color }}>{org?.name}</td>
                      <td className="px-4 py-3 text-white/65 text-[12px]">{it.location}</td>
                      <td className={`px-4 py-3 font-mono text-right tabular-nums ${low ? "text-[#F5EBD6]" : "text-white/80"}`}>{it.qty}</td>
                      <td className="px-4 py-3 font-mono text-right tabular-nums text-white/40">{it.threshold}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {drawerResource && <ResourceDrawer r={drawerResource} onClose={() => setDrawerId(null)} />}
    </CrmShell>
  );
}

function FacilityChip({
  active,
  onClick,
  label,
  count,
  capacity,
  color,
  type,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  capacity?: number;
  color?: string;
  type?: Facility["type"];
}) {
  const Icon = type ? TYPE_ICON[type] : Warehouse;
  const pct = capacity ? (count / capacity) * 100 : 0;
  const cap = pct > 90 ? "#EF4E4B" : pct > 70 ? "#F5EBD6" : "#34D399";
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-xl border px-3 py-2.5 text-left min-w-[160px] transition ${
        active
          ? "bg-[var(--surface-1)] border-[#89CFF0]"
          : "bg-[var(--surface-1)] border-[var(--hairline)] hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} style={{ color: color ?? "#89CFF0" }} />
        <span className="text-[12px] font-medium truncate">{label}</span>
      </div>
      {capacity ? (
        <>
          <p className="font-mono text-[10px] tabular-nums text-white/55">{count} / {capacity}</p>
          <div className="h-1 rounded-full bg-white/8 overflow-hidden mt-1.5">
            <div className="h-full" style={{ width: `${pct}%`, background: cap }} />
          </div>
        </>
      ) : (
        <p className="font-mono text-[10px] text-white/55">{count} sites</p>
      )}
    </button>
  );
}

function FacilityHeader({ f }: { f: Facility }) {
  const org = orgs.find((o) => o.id === f.org);
  const pct = (f.currentCount / f.capacity) * 100;
  return (
    <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5 flex items-center justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1">{f.type.replace(/_/g, " ")}</p>
        <h2 className="text-[18px] font-semibold">{f.name}</h2>
        <p className="text-[12px] text-white/65 mt-0.5">
          {f.address} · <span style={{ color: org?.color }}>{org?.name}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Capacity</p>
        <p className="text-[26px] font-semibold tabular-nums">{Math.round(pct)}%</p>
        <p className="font-mono text-[10.5px] text-white/55">{f.currentCount} / {f.capacity}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ResourceDetail["status"] }) {
  const c = status === "deployed" ? "#34D399" : status === "matched" ? "#89CFF0" : "#F5EBD6";
  return (
    <span
      className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ color: c, background: `${c}1A` }}
    >
      {status}
    </span>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={10} className={i < n ? "fill-[#F5EBD6] text-[#F5EBD6]" : "text-white/20"} />
      ))}
    </div>
  );
}

function ResourceDrawer({ r, onClose }: { r: ResourceDetail; onClose: () => void }) {
  const events = assetEvents.filter((e) => e.resourceId === r.id);
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative ml-auto w-full max-w-md h-full bg-[var(--surface-1)] border-l border-[var(--hairline)] overflow-y-auto">
        <header className="sticky top-0 glass border-b border-[var(--hairline)] px-5 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-white/45">{r.id}</p>
            <p className="font-medium text-[14px] truncate">{r.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/8 rounded"><X size={14} /></button>
        </header>
        <div className="p-5 space-y-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Current facility</p>
            <div className="flex items-center gap-2">
              <p className="text-[13px] text-white/85 flex-1">{r.location}</p>
              <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white/6 hover:bg-white/12 text-[11px] transition">
                <ArrowRightLeft size={11} /> Move to…
              </button>
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Condition</p>
            <Stars n={4} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">Asset event timeline · {events.length}</p>
            {events.length === 0 ? (
              <p className="text-[12px] text-white/45">No events yet.</p>
            ) : (
              <ol className="relative ml-2 space-y-3 border-l border-[var(--hairline)] pl-5">
                {events.map((e) => {
                  const color =
                    e.eventType === "status_change" ? "#89CFF0" :
                    e.eventType === "location_move" ? "#34D399" :
                    e.eventType === "condition_update" ? "#F5EBD6" :
                    e.eventType === "assignment" ? "#EF4E4B" : "white";
                  return (
                    <li key={e.id} className="relative">
                      <span
                        className="absolute -left-[28px] top-0.5 w-4 h-4 rounded-full ring-4 ring-[var(--surface-1)]"
                        style={{ background: `${color}33` }}
                      >
                        <span className="absolute inset-1 rounded-full" style={{ background: color }} />
                      </span>
                      <p className="font-mono text-[9.5px] uppercase tracking-wider" style={{ color }}>
                        {e.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[12.5px] text-white/85 mt-0.5">
                        {e.fromStatus && e.toStatus ? `${e.fromStatus} → ${e.toStatus}` : ""}
                        {e.fromLocation && e.toLocation ? `${e.fromLocation} → ${e.toLocation}` : ""}
                        {e.notes && !e.fromStatus && !e.fromLocation ? e.notes : ""}
                      </p>
                      {e.notes && (e.fromStatus || e.fromLocation) && (
                        <p className="text-[11.5px] text-white/55 mt-0.5">{e.notes}</p>
                      )}
                      <p className="font-mono text-[9.5px] text-white/40 mt-1">{e.performedBy} · {e.timestamp}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <Link
            href={`/directory/resource/${r.id}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition"
          >
            Open full record
          </Link>
        </div>
      </aside>
    </div>
  );
}
