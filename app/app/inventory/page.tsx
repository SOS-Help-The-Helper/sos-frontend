'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { toast } from "sonner";
type Facility = {
  id: string; name: string; type: string; org: string; address: string;
  capacity: number; currentCount: number; status: string;
};
type ResourceDetail = {
  id: string; title: string; taxonomy: string; status: string; location: string;
  ownerName: string; ownerId?: string; org?: string; capacity: string;
  matchedTo?: { personName: string; caseId: string } | null;
  history: { event: string; date: string }[];
  petFriendly?: boolean; available?: string; county?: string; qty?: number;
};
const assetEvents: any[] = [];
const orgs: Array<{ id: string; name?: string; color?: string }> = [];
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { AlertTriangle, Plus, Warehouse, Truck, Package, MapPin, X, ArrowRightLeft, ChevronRight, Star, ChevronDown } from "lucide-react";

const CONDITION_OPTIONS = ["new", "good", "fair", "poor"] as const;
type Condition = typeof CONDITION_OPTIONS[number];
const CONDITION_RATING: Record<Condition, number> = { new: 4, good: 3, fair: 2, poor: 1 };
const CATEGORY_OPTIONS = ["food", "water", "medical", "supplies", "equipment"] as const;

const TYPE_ICON: Record<Facility["type"], React.ElementType> = {
  staging_lot: Truck,
  warehouse: Warehouse,
  distribution_hub: Package,
  satellite: MapPin,
};

export default function InventoryPage() {
  const { orgId } = useAuthContext();
  const [facilityId, setFacilityId] = useState<string | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [inventory, setInventory] = useState<Array<{ id: string; item: string; qty: number; threshold: number; location: string; org: string }>>([]);
  const [resources, setResources] = useState<ResourceDetail[]>([]);

  // Add-item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<typeof CATEGORY_OPTIONS[number]>("food");
  const [addQty, setAddQty] = useState(1);
  const [addCondition, setAddCondition] = useState<Condition>("good");
  const [addFacilityId, setAddFacilityId] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Move-popover state: itemId → boolean
  const [moveOpenId, setMoveOpenId] = useState<string | null>(null);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setAddSubmitting(true);
    try {
      await api.writeInventory({
        name: addName.trim(),
        category: addCategory,
        quantity: addQty,
        condition: addCondition,
        facility_id: addFacilityId || undefined,
        org_id: orgId,
      });
      toast("Item added");
      setShowAddForm(false);
      setAddName(""); setAddQty(1); setAddCondition("good"); setAddFacilityId("");
      // refresh
      const data = await api.queryInventory({ org_id: orgId }) as { inventory?: typeof prototypeInventory; resources?: ResourceDetail[] };
      if (data?.inventory?.length) setInventory(data.inventory);
      if (data?.resources?.length) setResources(data.resources);
    } catch {
      toast.error("Failed to add item");
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleConditionChange(itemId: string, condition: Condition) {
    try {
      await api.inventoryUpdateCondition(itemId, CONDITION_RATING[condition]);
      toast(`Condition updated to ${condition}`);
    } catch {
      toast.error("Failed to update condition");
    }
  }

  async function handleMove(itemId: string, targetFacilityId: string) {
    setMoveOpenId(null);
    try {
      await api.inventoryMoveToFacility(itemId, targetFacilityId);
      const fac = facilities.find(f => f.id === targetFacilityId);
      toast(`Moved to ${fac?.name ?? "facility"}`);
      const data = await api.queryInventory({ org_id: orgId }) as { inventory?: typeof prototypeInventory; resources?: ResourceDetail[] };
      if (data?.inventory?.length) setInventory(data.inventory);
    } catch {
      toast.error("Failed to move item");
    }
  }

  useEffect(() => {
    // admin: proceed without org filter
    api.crmFacilitiesList(orgId || '')
      .then((data: unknown) => {
        const rows = (data as { facilities?: Facility[] })?.facilities;
        if (rows?.length) setFacilities(rows);
      })
      .catch(() => {/* fall back to prototype */});
    api.queryInventory({ org_id: orgId })
      .then((data: unknown) => {
        const d = data as { inventory?: typeof prototypeInventory; resources?: ResourceDetail[] };
        if (d?.inventory?.length) setInventory(d.inventory);
        if (d?.resources?.length) setResources(d.resources);
      })
      .catch(() => {/* fall back to prototype */});
  }, [orgId]);

  const filteredItems = useMemo(() => {
    if (facilityId === "all") return inventory;
    const fac = facilities.find((f) => f.id === facilityId);
    return inventory.filter(
      (i) => i.location === fac?.name || i.location.includes(fac?.address.split(",")[0] ?? "")
    );
  }, [facilityId, facilities, inventory]);

  const lowStock = filteredItems.filter((i) => i.qty < i.threshold);
  const activeFac = facilities.find((f) => f.id === facilityId);
  const drawerResource = drawerId ? resources.find((r) => r.id === drawerId) : null;

  return (
    <CrmShell module="Inventory">
      <PageHeader
        title="Inventory"
        subtitle={`${facilities.length} facilities · ${inventory.length} items tracked · ${lowStock.length} low-stock`}
        actions={
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition"
          >
            <Plus size={12} /> Add item
          </button>
        }
      />

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="mx-4 mt-3 rounded-xl bg-[var(--surface-1)] border border-[#89CFF0]/40 p-4 space-y-3"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">New item</p>
          <input
            required
            placeholder="Item name"
            value={addName}
            onChange={e => setAddName(e.target.value)}
            className="w-full h-9 bg-white/6 border border-white/10 rounded-lg px-3 text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#89CFF0]/60"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={addCategory}
              onChange={e => setAddCategory(e.target.value as typeof CATEGORY_OPTIONS[number])}
              className="h-9 bg-white/6 border border-white/10 rounded-lg px-3 text-[13px] focus:outline-none focus:border-[#89CFF0]/60"
            >
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              min={0}
              value={addQty}
              onChange={e => setAddQty(Number(e.target.value))}
              placeholder="Quantity"
              className="h-9 bg-white/6 border border-white/10 rounded-lg px-3 text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#89CFF0]/60"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={addCondition}
              onChange={e => setAddCondition(e.target.value as Condition)}
              className="h-9 bg-white/6 border border-white/10 rounded-lg px-3 text-[13px] focus:outline-none focus:border-[#89CFF0]/60"
            >
              {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={addFacilityId}
              onChange={e => setAddFacilityId(e.target.value)}
              className="h-9 bg-white/6 border border-white/10 rounded-lg px-3 text-[13px] focus:outline-none focus:border-[#89CFF0]/60"
            >
              <option value="">No facility</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-8 px-3 rounded-lg bg-white/6 hover:bg-white/10 text-[12px] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addSubmitting}
              className="h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] disabled:opacity-50 text-[12px] font-medium transition"
            >
              {addSubmitting ? "Adding…" : "Add item"}
            </button>
          </div>
        </form>
      )}

      <div className="px-4 pt-4 pb-4 space-y-5">
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
                  <th className="px-4 py-3 font-normal">Condition</th>
                  <th className="px-4 py-3 font-normal">Move</th>
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
                      <td className="px-4 py-3">
                        <select
                          defaultValue="good"
                          onChange={e => handleConditionChange(it.id, e.target.value as Condition)}
                          onClick={e => e.stopPropagation()}
                          className="h-7 bg-white/6 border border-white/10 rounded-md px-2 text-[11px] focus:outline-none focus:border-[#89CFF0]/60"
                        >
                          {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <button
                            onClick={e => { e.stopPropagation(); setMoveOpenId(moveOpenId === it.id ? null : it.id); }}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-white/6 hover:bg-white/12 text-[11px] transition"
                          >
                            <ArrowRightLeft size={11} /> Move <ChevronDown size={10} />
                          </button>
                          {moveOpenId === it.id && (
                            <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] rounded-xl bg-[#1a2e3f] border border-white/10 shadow-xl overflow-hidden">
                              {facilities.map(f => (
                                <button
                                  key={f.id}
                                  onClick={() => handleMove(it.id, f.id)}
                                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-white/8 transition"
                                >
                                  {f.name}
                                </button>
                              ))}
                              {facilities.length === 0 && (
                                <p className="px-3 py-2 text-[12px] text-white/45">No facilities</p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
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
        <p className="font-serif text-[28px] tabular-nums">{Math.round(pct)}%</p>
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
            href={`/app/directory/resource/${r.id}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition"
          >
            Open full record
          </Link>
        </div>
      </aside>
    </div>
  );
}
