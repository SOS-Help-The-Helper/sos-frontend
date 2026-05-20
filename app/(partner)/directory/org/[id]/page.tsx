'use client';

import { useParams } from "next/navigation";
import { CrmShell } from "@/components/crm-shell";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Building2, MapPin, Users, Globe } from "lucide-react";

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuthContext();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.crmBrowseOrgs({ limit: 100 })
      .then((data: any) => {
        const orgs = data?.organizations ?? data?.results ?? (Array.isArray(data) ? data : []);
        const found = orgs.find((o: any) => o.id === id);
        if (found) setOrg(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <CrmShell module="Directory">
      <div className="px-6 py-6">
        <Link href="/directory" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white mb-4">
          <ChevronLeft size={14} /> Back to Directory
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#4ADE80] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !org ? (
          <div className="text-center py-20 text-white/50">Organization not found</div>
        ) : (
          <div className="max-w-3xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4ADE80]/30 to-[#4ADE80]/10 border border-[#4ADE80]/30 flex items-center justify-center">
                <Building2 size={24} className="text-[#4ADE80]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{org.name}</h1>
                <p className="text-sm text-white/50 mt-0.5">{org.org_type ?? "Organization"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(org.city || org.state) && (
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase text-white/40 mb-1">Location</p>
                  <p className="text-sm flex items-center gap-1"><MapPin size={12} /> {[org.city, org.state].filter(Boolean).join(", ")}</p>
                </div>
              )}
              {org.status && (
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase text-white/40 mb-1">Status</p>
                  <p className="text-sm">{org.status}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CrmShell>
  );
}
