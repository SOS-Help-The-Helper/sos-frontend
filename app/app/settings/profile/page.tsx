"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Mail, Phone, Shield, Upload } from "lucide-react";
import { Avatar } from "@/components/directory/Avatar";
import { ScoreRing, FactorBar, ScoreCard, tierFor, type Factor } from "@/components/crm/Scoring";
import { ShareSOS, ReferralLineItems, DEMO_REFERRALS } from "@/components/crm/ShareSOS";
import { api } from "@/lib/api";
import { toast } from "sonner";


const PERSON_ID = "p-melissa-hart";

const READINESS: Factor = {
  key: "readiness", label: "Readiness", earned: 32, max: 40,
  items: [
    { label: "Emergency contacts on file", done: true },
    { label: "Go-bag checklist completed", done: true },
    { label: "First-aid certification current", done: true },
    { label: "Evacuation plan submitted", done: false },
  ],
};
const COMMUNITY: Factor = {
  key: "community", label: "Community", earned: 22, max: 30,
  items: [
    { label: `${DEMO_REFERRALS.length} referrals signed up (+${DEMO_REFERRALS.length * 6} pts)`, done: true },
    { label: "3 reports verified by staff", done: true },
    { label: "Connected to local mutual aid", done: false },
  ],
};
const IMPACT: Factor = {
  key: "impact", label: "Impact", earned: 24, max: 30,
  items: [
    { label: "12 matches fulfilled", done: true },
    { label: "48 volunteer hours logged", done: true },
    { label: "Avg rating 4.6 / 5", done: true },
  ],
};

export default function MyProfile() {
  const score = READINESS.earned + COMMUNITY.earned + IMPACT.earned;
  const tier = tierFor(score);

  const [name, setName] = useState("Demo User");
  const [email, setEmail] = useState("demo@sos.org");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.efCall("sos-events", { action: "settings.update_profile", name, email, phone });
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ScoreCard title="SOS Score" hint="Your personal readiness, community trust, and impact.">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <ScoreRing score={score} color={tier.color} tierLabel={tier.label} />
          <div className="flex-1 w-full space-y-3.5">
            <FactorBar factor={READINESS} accent={tier.color} />
            <FactorBar factor={COMMUNITY} accent={tier.color} />
            <FactorBar factor={IMPACT} accent={tier.color} />
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-[var(--hairline)]">
          <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-2.5">
            Community · referrals
          </p>
          <ReferralLineItems />
        </div>
      </ScoreCard>

      <ScoreCard title="Share SOS" hint="Each referral who signs up earns you +6 Community points.">
        <ShareSOS personId={PERSON_ID} />
      </ScoreCard>

      <Section title="You" hint="How teammates see you across SOS Connect.">
        <div className="flex items-start gap-4">
          <Avatar name={name} size={64} />
          <div className="flex-1 space-y-3">
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/6 hover:bg-white/10 text-[12px] font-medium transition">
              <Upload size={12} /> Change photo
            </button>
            <p className="text-[11.5px] text-white/45">PNG or JPG · square · 256px+</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Title" defaultValue="Operations Director" />
          <Field label="Email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Phone" icon={Phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="mt-3">
          <Label>Bio</Label>
          <textarea
            defaultValue="Twelve years in disaster response. Based in Morganton."
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40 resize-none"
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-[#89CFF0] text-[#0a0a0a] text-[13px] font-semibold hover:bg-[#89CFF0]/90 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </Section>

      <Section title="Notifications" hint="What pings you and where.">
        <div className="space-y-2">
          {[
            { label: "New cases assigned to me", on: true },
            { label: "Mentions in notes", on: true },
            { label: "Daily digest", on: false },
            { label: "Inventory low-stock alerts", on: false },
          ].map((n) => (
            <Toggle key={n.label} label={n.label} defaultOn={n.on} />
          ))}
        </div>
      </Section>

      <Section title="Security">
        <div className="space-y-2">
          <Row icon={Shield} label="Password" hint="Last changed 4 months ago" action="Change" />
          <Row icon={Bell} label="Two-factor auth" hint="Authenticator app" action="Manage" />
        </div>
      </Section>

      <Section title="Session">
        <button className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-[#EF4E4B]/12 hover:bg-[#EF4E4B]/20 text-[#EF4E4B] text-[13px] font-medium transition">
          <LogOut size={13} /> Sign out
        </button>
      </Section>
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
  defaultValue,
  onChange,
  icon: Icon,
}: {
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />}
        <input
          {...(value !== undefined ? { value, onChange } : { defaultValue })}
          className={`w-full h-10 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40 ${Icon ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
    </div>
  );
}

function Toggle({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  return (
    <label className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/3 hover:bg-white/5 transition cursor-pointer">
      <span className="text-[13px]">{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="peer sr-only" />
      <span className="relative w-9 h-5 rounded-full bg-white/10 peer-checked:bg-[#89CFF0] transition after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
    </label>
  );
}

function Row({ icon: Icon, label, hint, action }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; hint: string; action: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3">
      <Icon size={15} className="text-white/55" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11.5px] text-white/45">{hint}</p>
      </div>
      <button className="h-8 px-3 rounded-md bg-white/6 hover:bg-white/10 text-[12px] font-medium transition">{action}</button>
    </div>
  );
}
