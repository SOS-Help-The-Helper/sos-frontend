"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users, Building2, FileText, Package, Map, ArrowRight, UserPlus, Upload } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

const DEMO_ORG_ID = "9ad0f2ad-7789-47a8-bfba-0ae3382c86cc";

type Counts = {
  people: number;
  orgs: number;
  requests: number;
  resources: number;
};

const CATEGORIES: {
  key: keyof Counts;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  href: string;
}[] = [
  { key: "people", label: "People", description: "Survivors, volunteers, and team members in your network", icon: Users, color: "#89CFF0", href: "/app/directory/browse?type=people" },
  { key: "orgs", label: "Organizations", description: "Partner orgs, shelters, and service providers", icon: Building2, color: "#34D399", href: "/app/directory/browse?type=orgs" },
  { key: "requests", label: "Requests", description: "Active help requests from people in need", icon: FileText, color: "#EF4E4B", href: "/app/cases?tab=requests" },
  { key: "resources", label: "Resources", description: "Available resources, supplies, and volunteer capacity", icon: Package, color: "#A78BFA", href: "/app/cases?tab=resources" },
];

export default function DirectoryPage() {
  const router = useRouter();
  const { orgId: authOrgId } = useAuthContext();
  const orgId = authOrgId || DEMO_ORG_ID;
  const [counts, setCounts] = useState<Counts>({ people: 0, orgs: 0, requests: 0, resources: 0 });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      api.crmBrowsePersons(orgId, { limit: 1 }).catch(() => null),
      api.crmBrowseOrgs({ limit: 1 }).catch(() => null),
      api.crmRequestsList(orgId).catch(() => null),
      api.crmResourcesList(orgId).catch(() => null),
    ]).then(([pRes, oRes, rqRes, rsRes]: any[]) => {
      setCounts({
        people: pRes?.total ?? pRes?.persons?.length ?? 0,
        orgs: oRes?.total ?? oRes?.orgs?.length ?? 0,
        requests: rqRes?.total ?? rqRes?.requests?.length ?? 0,
        resources: rsRes?.total ?? rsRes?.resources?.length ?? 0,
      });
    }).finally(() => setLoading(false));
  }, [orgId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/app/directory/browse?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <CrmShell module="Directory">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Directory</h1>
            <p className="text-[14px] text-white/50 mt-1">
              Search and browse your network of people, organizations, and resources.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/app/directory/browse?add=1"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium text-white transition"
            >
              <UserPlus size={13} /> New
            </Link>
            <Link
              href="/app/directory/import"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/8 hover:bg-white/12 text-[12px] font-medium text-white transition"
            >
              <Upload size={13} /> Import
            </Link>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, organizations, requests..."
              className="w-full h-12 pl-12 pr-28 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] focus:bg-white/[0.10] border border-[var(--hairline)] focus:border-white/20 text-[15px] text-white placeholder:text-white/35 focus:outline-none transition"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-[13px] font-medium text-white transition"
            >
              Search
            </button>
          </div>
        </form>

        {/* Browse by Category */}
        <div className="mb-8">
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-3">Browse by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = counts[cat.key];
              return (
                <Link
                  key={cat.key}
                  href={cat.href}
                  className="group rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:bg-white/[0.04] hover:border-white/15 transition p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${cat.color}15`, color: cat.color }}>
                      <Icon size={18} />
                    </div>
                    <span className="text-2xl font-bold tabular-nums text-white">
                      {loading ? (
                        <span className="inline-block h-7 w-10 rounded bg-white/10 animate-pulse" />
                      ) : (
                        count.toLocaleString()
                      )}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-white mb-0.5">{cat.label}</h3>
                  <p className="text-[12.5px] text-white/45 leading-relaxed">{cat.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-[12px] font-medium opacity-0 group-hover:opacity-100 transition" style={{ color: cat.color }}>
                    Browse {cat.label.toLowerCase()} <ArrowRight size={12} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Map CTA */}
        <Link
          href="/app/map"
          className="group flex items-center justify-between rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:bg-white/[0.04] hover:border-white/15 transition p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
              <Map size={18} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">See the network on the map</h3>
              <p className="text-[12px] text-white/45">View cases, resources, and facilities across your service area</p>
            </div>
          </div>
          <span className="text-[12px] font-medium text-[#F59E0B] opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
            Open map <ArrowRight size={12} />
          </span>
        </Link>
      </div>
    </CrmShell>
  );
}
