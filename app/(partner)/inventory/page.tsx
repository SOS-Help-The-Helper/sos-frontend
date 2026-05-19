'use client';

import { CrmShell } from "@/components/crm-shell";
import { ManageTabs, PageHeader } from "@/components/crm/manage-tabs";
import { inventory, orgs } from "@/lib/prototype-data";
import { AlertTriangle, Plus } from "lucide-react";

export default function InventoryPage() {
  const lowStock = inventory.filter((i) => i.qty < i.threshold);
  return (
    <CrmShell module="Inventory">
      <ManageTabs />
      <PageHeader
        title="Inventory"
        subtitle={`${inventory.length} items · ${lowStock.length} low-stock alerts`}
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Plus size={12} /> Add item
          </button>
        }
      />
      <div className="px-6 pt-6 pb-10 space-y-4">
        {lowStock.length > 0 && (
          <div className="rounded-2xl bg-[#F5EBD6]/10 border border-[#F5EBD6]/30 p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-[#F5EBD6] mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-[13px]">{lowStock.length} items below threshold</p>
              <p className="text-[12px] text-white/65 mt-0.5">{lowStock.map((i) => i.item).join(" · ")}</p>
            </div>
          </div>
        )}
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
          <table className="w-full text-[13px] t-cols">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-white/45">
                <th className="px-4 py-3 font-normal">ID</th>
                <th className="px-4 py-3 font-normal">Item</th>
                <th className="px-4 py-3 font-normal">Owner</th>
                <th className="px-4 py-3 font-normal">Location</th>
                <th className="px-4 py-3 font-normal text-right">Qty</th>
                <th className="px-4 py-3 font-normal text-right">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((it) => {
                const org = orgs.find((o) => o.id === it.org);
                const low = it.qty < it.threshold;
                return (
                  <tr key={it.id} className="border-t border-white/5 hover:bg-white/4 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-white/45">{it.id}</td>
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
      </div>
    </CrmShell>
  );
}
