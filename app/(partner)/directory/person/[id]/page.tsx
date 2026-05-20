'use client';

import { useParams } from "next/navigation";
import { CrmShell } from "@/components/crm-shell";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, MapPin, Phone, Mail, ShieldCheck, Clock } from "lucide-react";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuthContext();
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !orgId) return;
    api.crmBrowsePersons(orgId, { limit: 200 })
      .then((data: any) => {
        const persons = data?.persons ?? data?.results ?? (Array.isArray(data) ? data : []);
        const found = persons.find((p: any) => p.id === id);
        if (found) setPerson(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, orgId]);

  return (
    <CrmShell module="Directory">
      <div className="px-6 py-6">
        <Link href="/directory" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white mb-4">
          <ChevronLeft size={14} /> Back to Directory
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#89CFF0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !person ? (
          <div className="text-center py-20 text-white/50">Person not found</div>
        ) : (
          <div className="max-w-3xl">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#89CFF0]/30 to-[#89CFF0]/10 border border-[#89CFF0]/30 flex items-center justify-center text-lg font-semibold">
                {(person.display_name || person.name || "?")[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-semibold">{person.display_name || person.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                  {person.phone && <span className="flex items-center gap-1"><Phone size={12} /> {person.phone}</span>}
                  {person.email && <span className="flex items-center gap-1"><Mail size={12} /> {person.email}</span>}
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {person.city && (
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase text-white/40 mb-1">Location</p>
                  <p className="text-sm flex items-center gap-1"><MapPin size={12} /> {person.city}{person.state ? `, ${person.state}` : ""}</p>
                </div>
              )}
              {person.sos_score != null && (
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase text-white/40 mb-1">SOS Score</p>
                  <p className="text-sm flex items-center gap-1"><ShieldCheck size={12} /> {person.sos_score}</p>
                </div>
              )}
              <div className="rounded-xl bg-white/5 p-3">
                <p className="font-mono text-[10px] uppercase text-white/40 mb-1">Member Since</p>
                <p className="text-sm flex items-center gap-1"><Clock size={12} /> {new Date(person.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </CrmShell>
  );
}
