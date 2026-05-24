import { createFileRoute } from "@tanstack/react-router";
import { Building2, Globe, Mail, MapPin, Phone, Upload } from "lucide-react";
import { ScoreRing, FactorBar, ScoreCard, type Factor } from "@/components/crm/Scoring";

export const Route = createFileRoute("/settings/org")({
  head: () => ({ meta: [{ title: "Organization — Settings" }] }),
  component: OrgSettings,
});

const TRUST_FACTORS: Factor[] = [
  { key: "fulfillment", label: "Fulfillment rate", earned: 92, max: 100 },
  { key: "response", label: "Response speed", earned: 78, max: 100 },
  { key: "satisfaction", label: "Citizen satisfaction", earned: 88, max: 100 },
  { key: "capacity", label: "Capacity reliability", earned: 81, max: 100 },
];

const SERVICES = ["Shelter", "Transport", "Hot meals", "Supply distribution", "Wellness checks"];

const ACTIVE_STATS = [
  { label: "Open cases", value: "14" },
  { label: "Resources deployed", value: "32" },
  { label: "Volunteers", value: "47" },
  { label: "Avg match time", value: "2.4h" },
];

function OrgSettings() {
  const trust = Math.round(TRUST_FACTORS.reduce((a, f) => a + f.earned, 0) / TRUST_FACTORS.length);
  const trustColor = trust >= 85 ? "#34D399" : trust >= 70 ? "#89CFF0" : trust >= 50 ? "#4A5462" : "#EF4E4B";
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
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Services</p>
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
          <Field label="Legal name" value="Mountain Area Aid" />
          <Field label="Short name" value="MAA" />
          <Field label="Tax ID (EIN)" value="84-3927145" />
          <Field label="Founded" value="2018" />
        </div>
        <div className="mt-3">
          <Label>Mission</Label>
          <textarea
            defaultValue="Coordinating shelter, transport, and supply response across western counties."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40 resize-none"
          />
        </div>
      </Section>

      <Section title="Contact" hint="Primary channels routed to your inbox.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email" icon={Mail} value="ops@mountainareaaid.org" />
          <Field label="Phone" icon={Phone} value="(828) 555-0142" />
          <Field label="Website" icon={Globe} value="mountainareaaid.org" />
          <Field label="Primary county" icon={MapPin} value="Burke" />
        </div>
      </Section>

      <Section title="Address" hint="Headquarters / mailing address.">
        <div className="space-y-3">
          <Field label="Street" value="412 Ridge Road" />
          <div className="grid grid-cols-3 gap-3">
            <Field label="City" value="Morganton" />
            <Field label="State" value="NC" />
            <Field label="ZIP" value="28655" />
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
        <button className="h-9 px-4 rounded-lg text-[13px] text-white/65 hover:text-white transition">Discard</button>
        <button className="h-9 px-4 rounded-lg bg-[#89CFF0] text-[#0a0a0a] text-[13px] font-semibold hover:bg-[#89CFF0]/90 transition">Save changes</button>
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
  return <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">{children}</p>;
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />}
        <input
          defaultValue={value}
          className={`w-full h-10 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40 ${Icon ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
    </div>
  );
}
