import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Avatar } from "@/components/directory/Avatar";
import { Logomark } from "@/components/Logomark";

export const Route = createFileRoute("/join")({
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : "",
  }),
  head: () => ({
    meta: [
      { title: "Join SOS Connect" },
      { name: "description", content: "Get your SOS Score and connect with your local mutual-aid network." },
    ],
  }),
  component: JoinPage,
});

// Mock referrer lookup — in production this hits the API
function lookupReferrer(refId: string) {
  if (!refId) return null;
  return {
    id: refId,
    name: "Melissa Hart",
    tier: { label: "Resilient", color: "#89CFF0" },
    score: 78,
    county: "Burke",
  };
}

function JoinPage() {
  const { ref } = Route.useSearch();
  const referrer = lookupReferrer(ref);

  return (
    <div className="min-h-dvh bg-[var(--background)] text-white flex flex-col">
      <header className="h-14 px-5 flex items-center border-b border-[var(--hairline)]">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <Logomark size={22} />
          <span className="text-[13px] font-semibold tracking-tight">SOS Connect</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {referrer ? (
            <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-6 text-center">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar name={referrer.name} size={64} />
                  <span
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-[var(--surface-1)]"
                    style={{ background: referrer.tier.color }}
                    title={referrer.tier.label}
                  >
                    <ShieldCheck size={14} className="text-[#0a0a0a]" />
                  </span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50 mt-4">
                  You've been invited
                </p>
                <h1 className="text-[22px] font-semibold tracking-tight mt-2 leading-tight">
                  <span className="text-white">{referrer.name}</span>
                  <span className="text-white/55"> invited you to SOS</span>
                </h1>

                <div
                  className="inline-flex items-center gap-1.5 mt-4 px-2.5 h-7 rounded-full text-[11.5px] font-medium"
                  style={{ color: referrer.tier.color, background: `${referrer.tier.color}14` }}
                >
                  <Sparkles size={11} /> {referrer.tier.label} · SOS {referrer.score}
                </div>
              </div>

              <p className="text-[13px] text-white/65 mt-5 leading-relaxed">
                SOS Connect helps neighbors stay prepared and respond together.
                See where you stand, then build your score.
              </p>

              <button className="mt-6 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-[#EF4E4B] to-[#c45c7c] text-white text-[14px] font-semibold hover:from-[#d94340] hover:to-[#b04e6c] transition">
                Get your SOS Score <ArrowRight size={14} />
              </button>
              <p className="mt-3 text-[11px] text-white/40">Takes ~2 minutes. No account required to start.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-6 text-center">
              <h1 className="text-[22px] font-semibold tracking-tight">Welcome to SOS Connect</h1>
              <p className="text-[13px] text-white/65 mt-3 leading-relaxed">
                See where you stand on readiness and connect with your local mutual-aid network.
              </p>
              <button className="mt-6 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-[#EF4E4B] to-[#c45c7c] text-white text-[14px] font-semibold hover:from-[#d94340] hover:to-[#b04e6c] transition">
                Get your SOS Score <ArrowRight size={14} />
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-[11.5px] text-white/40">
            By continuing you agree to our <a className="text-white/60 underline">terms</a> and <a className="text-white/60 underline">privacy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
