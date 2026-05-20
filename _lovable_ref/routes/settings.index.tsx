import { createFileRoute } from "@tanstack/react-router";
import { Check, Pin } from "lucide-react";
import {
  usePrefs, toggleModule, toggleMobilePin, setOrgType,
  ALL_MODULES, MODULE_META, type OrgType,
} from "@/lib/prefs-store";

export const Route = createFileRoute("/settings/")({
  head: () => ({ meta: [{ title: "General — Settings" }] }),
  component: GeneralSettings,
});

function GeneralSettings() {
  const prefs = usePrefs();

  return (
    <div className="space-y-6">
      <Section title="Modules" hint="Toggle what your team sees in the sidebar and mobile nav.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_MODULES.map((m) => {
            const on = prefs.enabled.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggleModule(m)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition ${
                  on ? "border-[#89CFF0]/40 bg-[#89CFF0]/8" : "border-[var(--hairline)] bg-white/3 hover:bg-white/5"
                }`}
              >
                <span className="text-[13px] font-medium">{MODULE_META[m].label}</span>
                {on && <Check size={13} className="text-[#89CFF0]" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Pin to mobile" hint="Choose up to 4 modules for the bottom bar on phone. SOS is always pinned.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {prefs.enabled.map((m) => {
            const pinned = prefs.mobilePins.includes(m);
            const order = pinned ? prefs.mobilePins.indexOf(m) + 1 : null;
            const disabled = !pinned && prefs.mobilePins.length >= 4;
            return (
              <button
                key={m}
                onClick={() => toggleMobilePin(m)}
                disabled={disabled}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition ${
                  pinned
                    ? "border-[#EF4E4B]/50 bg-[#EF4E4B]/10"
                    : disabled
                      ? "border-[var(--hairline)] bg-white/3 opacity-40 cursor-not-allowed"
                      : "border-[var(--hairline)] bg-white/3 hover:bg-white/5"
                }`}
              >
                <span className="text-[13px] font-medium">{MODULE_META[m].label}</span>
                {pinned && (
                  <span className="flex items-center gap-1 text-[#EF4E4B]">
                    <Pin size={11} className="fill-[#EF4E4B]" />
                    <span className="font-mono text-[10px]">{order}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Org size" hint="Sets density and default mobile pins.">
        <div className="grid grid-cols-3 gap-2">
          {(["small", "mid", "large"] as const).map((d) => {
            const a = prefs.orgType === d;
            return (
              <button
                key={d}
                onClick={() => setOrgType(d as OrgType)}
                className={`px-3 py-3 rounded-xl border text-left transition ${a ? "border-[#89CFF0] bg-[#89CFF0]/8" : "border-[var(--hairline)] bg-white/3 hover:bg-white/5"}`}
              >
                <p className="font-medium text-[13px] capitalize">{d}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mt-0.5">
                  {d === "small" ? "<5 ppl" : d === "mid" ? "5–50" : "50+"}
                </p>
              </button>
            );
          })}
        </div>
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
