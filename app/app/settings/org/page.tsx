"use client";
import { useEffect, useState } from "react";
import { Building2, Globe, Mail, MapPin, Phone, Upload } from "lucide-react";
import { ScoreRing, FactorBar, ScoreCard, type Factor } from "@/components/crm/Scoring";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { toast } from "sonner";

const FALLBACK_TRUST: Factor[] = [
  { key: "fulfillment", label: "Fulfillment rate", earned: 0, max: 100 },
  { key: "response", label: "Response speed", earned: 0, max: 100 },
  { key: "satisfaction", label: "Citizen satisfaction", earned: 0, max: 100 },
  { key: "capacity", label: "Capacity reliability", earned: 0, max: 100 },
];

type FormState = {
  legalName: string;
  shortName: string;
  taxId: string;
  founded: string;
  mission: string;
  email: string;
  phone: string;
  website: string;
  primaryCounty: string;
  street: string;
  city: string;
  stateField: string;
  zip: string;
};

const DEFAULT_FORM: FormState = {
  legalName: "Mountain Area Aid",
  shortName: "MAA",
  taxId: "84-3927145",
  founded: "2018",
  mission: "Coordinating shelter, transport, and supply response across western counties.",
  email: "ops@mountainareaaid.org",
  phone: "(828) 555-0142",
  website: "mountainareaaid.org",
  primaryCounty: "Burke",
  street: "412 Ridge Road",
  city: "Morganton",
  stateField: "NC",
  zip: "28655",
};

export default function OrgSettings() {
  const { orgId, orgName } = useAuthContext();
  const [orgData, setOrgData] = useState<Record<string, any> | null>(null);
  const [stats, setStats] = useState<{ active_cases: number; fulfilled: number; total_matches: number } | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    api.getPortalConfig(orgId).then((res: any) => {
      const config = res?.org ?? res?.portal_config ?? res?.config ?? res;
      setOrgData(config);
      if (config) {
        setForm((f) => ({
          ...f,
          legalName: config.name ?? config.legal_name ?? f.legalName,
          shortName: config.short_name ?? f.shortName,
          mission: config.mission ?? config.description ?? f.mission,
          email: config.email ?? f.email,
          phone: config.phone ?? f.phone,
          website: config.website ?? f.website,
        }));
      }
    }).catch(() => { toast.error("Failed to load org settings"); });
    api.crmOrgStats(orgId).then((res: any) => setStats(res)).catch(() => {});
  }, [orgId]);

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    try {
      await api.updatePortalConfig(orgId, {
        name: form.legalName,
        short_name: form.shortName,
        tax_id: form.taxId,
        founded: form.founded,
        mission: form.mission,
        email: form.email,
        phone: form.phone,
        website: form.website,
        primary_county: form.primaryCounty,
        address: { street: form.street, city: form.city, state: form.stateField, zip: form.zip },
      });
      toast.success("Org settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const TRUST_FACTORS: Factor[] = orgData?.trust_factors ?? FALLBACK_TRUST;
  const SERVICES: string[] = orgData?.services ?? orgData?.capabilities ?? [];
  const ACTIVE_STATS = [
    { label: "Open cases", value: String(stats?.active_cases ?? "—") },
    { label: "Fulfilled", value: String(stats?.fulfilled ?? "—") },
    { label: "Total matches", value: String(stats?.total_matches ?? "—") },
    { label: "Org name", value: orgData?.name ?? orgName ?? "—" },
  ];

  const trust = TRUST_FACTORS.length > 0 ? Math.round(TRUST_FACTORS.reduce((a, f) => a + f.earned, 0) / TRUST_FACTORS.length) : 0;
  const trustColor = trust >= 85 ? "#34D399" : trust >= 70 ? "#89CFF0" : trust >= 50 ? "#F5EBD6" : "#EF4E4B";
  const trustLabel = trust >= 85 ? "Trusted" : trust >= 70 ? "Reliable" : trust >= 50 ? "Building" : "New";

  return (
    <div className="space-y-6">
      <ScoreCard title="Trust Score" hint="How partners and citizens experience your org.">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <ScoreRing score={trust} suffix="%" color={trustColor} tierLabel={trustLabel} />
          <div className="flex-1 w-full space-y-3.5">
            {TRUST_FACTORS.map((f) => <FactorBar key={f.key} factor={f} accent={trustColor} />)}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[var(--hairline)]">
          <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-2">Services</p>
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map((s) => (
              <span key={s} className="inline-flex items-center h-7 px-2.5 rounded-full bg-white/5 border border-[var(--hairline)] text-[12px] text-white/80">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ACTIVE_STATS.map((s) => (
            <div key={s.label} className="rounded-lg bg-white/3 border border-[var(--hairline)] px-3 py-2.5">
              <p className="text-[16px] font-semibold tabular-nums">{s.value}</p>
              <p className="text-[11px] text-white/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </ScoreCard>


      <Section title="Identity" hint="How your org appears to partners and the public.">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EF4E4B] to-[#89CFF0] flex items-center justify-center text-[22px] font-semibold shrink-0">
            M
          </div>
          <div className="flex-1 space-y-3">
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/6 hover:bg-white/10 text-[12px] font-medium transition">
              <Upload size={12} /> Upload logo
            </button>
            <p className="text-[11.5px] text-white/45">PNG or SVG · square · 256px+</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <Field label="Legal name" value={form.legalName} onChange={set("legalName")} />
          <Field label="Short name" value={form.shortName} onChange={set("shortName")} />
          <Field label="Tax ID (EIN)" value={form.taxId} onChange={set("taxId")} />
          <Field label="Founded" value={form.founded} onChange={set("founded")} />
        </div>
        <div className="mt-3">
          <Label>Mission</Label>
          <textarea
            value={form.mission}
            onChange={set("mission")}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40 resize-none"
          />
        </div>
      </Section>

      <Section title="Contact" hint="Primary channels routed to your inbox.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email" icon={Mail} value={form.email} onChange={set("email")} />
          <Field label="Phone" icon={Phone} value={form.phone} onChange={set("phone")} />
          <Field label="Website" icon={Globe} value={form.website} onChange={set("website")} />
          <Field label="Primary county" icon={MapPin} value={form.primaryCounty} onChange={set("primaryCounty")} />
        </div>
      </Section>

      <Section title="Address" hint="Headquarters / mailing address.">
        <div className="space-y-3">
          <Field label="Street" value={form.street} onChange={set("street")} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="City" value={form.city} onChange={set("city")} />
            <Field label="State" value={form.stateField} onChange={set("stateField")} />
            <Field label="ZIP" value={form.zip} onChange={set("zip")} />
          </div>
        </div>
      </Section>

      <Section title="Service area" hint="Counties you actively respond in.">
        <div className="flex flex-wrap gap-1.5">
          {["Burke", "McDowell", "Caldwell", "Catawba", "Avery"].map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#89CFF0]/12 text-[#89CFF0] text-[12px] font-medium">
              <Building2 size={11} /> {c}
            </span>
          ))}
          <button className="h-7 px-2.5 rounded-full border border-dashed border-white/20 text-[12px] text-white/55 hover:text-white hover:border-white/40 transition">
            + Add county
          </button>
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setForm(DEFAULT_FORM)}
          className="h-9 px-4 rounded-lg text-[13px] text-white/65 hover:text-white transition"
        >
          Discard
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-[#89CFF0] text-[#0a0a0a] text-[13px] font-semibold hover:bg-[#89CFF0]/90 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
      <h2 className="text-[15px] font-semibold mb-1">{title}</h2>
      {hint && <p className="text-[12px] text-white/55 mb-4">{hint}</p>}
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-1.5">{children}</p>;
}

function Field({
  label,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />}
        <input
          value={value}
          onChange={onChange}
          className={`w-full h-10 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40 ${Icon ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
    </div>
  );
}
