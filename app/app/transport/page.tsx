'use client';

export const dynamic = 'force-dynamic';

import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { Truck } from "lucide-react";

export default function TransportPage() {
  return (
    <CrmShell module="Transport">
      <PageHeader
        title="Transport"
        subtitle="Vehicle and convoy management."
      />
      <div className="px-4 pt-12 pb-4 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Truck size={28} className="text-white/30" />
        </div>
        <h2 className="text-[18px] font-semibold text-white/80">Transport tracking coming soon</h2>
        <p className="text-[13px] text-white/45 mt-2 max-w-md">
          Vehicle assignments, convoy management, and driver tracking will be available here once transport integrations are complete.
        </p>
      </div>
    </CrmShell>
  );
}
