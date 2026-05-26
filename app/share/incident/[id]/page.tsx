"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, MapPin, Calendar, Home, Utensils,
  HeartPulse, Baby, Bus, ArrowRight, Share2, Copy,
} from "lucide-react";
import { api } from "@/lib/api";
import { redactName, countyOnly } from "@/lib/redact-for-public";
import { toast } from "sonner";

type CategoryId = "housing" | "food" | "health" | "childcare" | "transport";
const CATEGORIES: { id: CategoryId; label: string; icon: typeof Home; tone: string }[] = [
  { id: "housing", label: "Housing", icon: Home, tone: "#89CFF0" },
  { id: "food", label: "Food", icon: Utensils, tone: "#F5EBD6" },
  { id: "health", label: "Health", icon: HeartPulse, tone: "#EF4E4B" },
  { id: "childcare", label: "Childcare", icon: Baby, tone: "#A78BFA" },
  { id: "transport", label: "Transport", icon: Bus, tone: "#34D399" },
];

export default function PublicIncidentPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.crmCommandSummary(id as string)
      .then((res: any) => setIncident(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1E2B] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#89CFF0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-[#0F1E2B] text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-[#EF4E4B] mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Incident not found</h1>
          <p className="text-white/55 mt-2">This incident may have been resolved or the link is invalid.</p>
          <Link href="/" className="inline-flex items-center gap-1.5 mt-6 text-[#89CFF0] text-sm hover:underline">
            Go to SOS Connect <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const name = incident.name ?? incident.incident_name ?? "Active Incident";
  const county = incident.county ?? "Unknown County";
  const status = incident.status ?? "active";
  const declared = incident.declared ?? incident.created_at;
  const totalCases = incident.cases ?? incident.total_cases ?? 0;
  const fulfilled = incident.fulfilled ?? incident.fulfilled_count ?? 0;
  const capacity = incident.capacity ?? incident.total_capacity ?? 0;
  const categories = incident.categories ?? [];

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logomark.svg" alt="SOS" width={22} height={22} />
            <span className="font-serif text-lg text-white">SOS Connect</span>
          </Link>
          <button onClick={copyLink} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-xs font-medium transition">
            <Share2 size={12} /> Share
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            status === "active" ? "bg-[#EF4E4B]/15 text-[#EF4E4B]" : "bg-[#34D399]/15 text-[#34D399]"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" /> {status === "active" ? "Active" : "Resolved"}
          </span>
          {declared && (
            <span className="font-mono text-[10px] text-white/40 flex items-center gap-1">
              <Calendar size={10} /> Declared {new Date(declared).toLocaleDateString()}
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">{name}</h1>
        <p className="text-white/55 flex items-center gap-1 mt-1">
          <MapPin size={14} /> {countyOnly("", county)}
        </p>
      </div>

      {/* KPI Row */}
      <div className="max-w-3xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Cases", value: totalCases, tone: "#EF4E4B" },
            { label: "Fulfilled", value: fulfilled, tone: "#34D399" },
            { label: "Capacity", value: capacity, tone: "#89CFF0" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/5 border border-white/8 p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums" style={{ color: s.tone }}>{s.value}</p>
              <p className="font-mono text-[10px] text-white/45 mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 pb-8">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">By Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {CATEGORIES.map((cat) => {
              const count = categories.find((c: any) => c.id === cat.id)?.count ?? 0;
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
                  <Icon size={20} className="mx-auto mb-1" style={{ color: cat.tone }} />
                  <p className="text-lg font-semibold tabular-nums">{count}</p>
                  <p className="font-mono text-[9px] text-white/45 uppercase">{cat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center">
        <p className="text-white/30 text-xs">
          Powered by{" "}
          <Link href="https://sosconnect.org" className="text-[#89CFF0] hover:underline">
            SOS Connect
          </Link>
          {" "}· Everyone is a helper
        </p>
      </footer>
    </div>
  );
}
