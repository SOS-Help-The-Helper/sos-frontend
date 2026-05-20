import { useState } from "react";
import { Copy, Check, MessageSquare, Share2 } from "lucide-react";

export const REFERRAL_BASE = "sosconnect.org/join?ref=";
export const REFERRAL_MESSAGE = "I use SOS to stay prepared. Join me — ";

export type Referral = {
  name: string;
  joinedOn: string; // e.g. "May 18"
  points: number;  // typically 6
};

export const DEMO_REFERRALS: Referral[] = [
  { name: "Maria R.", joinedOn: "May 18", points: 6 },
  { name: "Devon K.", joinedOn: "May 12", points: 6 },
  { name: "Aliyah N.", joinedOn: "Apr 29", points: 6 },
];

export function buildReferralLink(personId: string) {
  return `${REFERRAL_BASE}${personId}`;
}

export function buildReferralMessage(personId: string) {
  return `${REFERRAL_MESSAGE}https://${buildReferralLink(personId)}`;
}

function initials(name: string) {
  return name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export function ShareSOS({
  personId,
  referrals = DEMO_REFERRALS,
  compact = false,
}: {
  personId: string;
  referrals?: Referral[];
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const link = buildReferralLink(personId);
  const message = buildReferralMessage(personId);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const sms = `sms:?&body=${encodeURIComponent(message)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <button
        onClick={copy}
        className="group w-full flex items-center gap-2 px-3 h-11 rounded-xl bg-white/5 border border-[var(--hairline)] hover:border-[#89CFF0]/40 hover:bg-white/8 transition text-left"
      >
        <span className="font-mono text-[12px] text-white/85 truncate flex-1">{link}</span>
        <span className={`inline-flex items-center gap-1 text-[11.5px] font-medium shrink-0 ${copied ? "text-[#34D399]" : "text-white/55 group-hover:text-[#89CFF0]"}`}>
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </span>
      </button>

      <div className="grid grid-cols-3 gap-2">
        <a href={sms} className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-[var(--hairline)] text-[12.5px] font-medium text-white/85 transition">
          <MessageSquare size={13} /> SMS
        </a>
        <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[#34D399]/12 hover:bg-[#34D399]/20 border border-[#34D399]/25 text-[12.5px] font-medium text-[#34D399] transition">
          <Share2 size={13} /> WhatsApp
        </a>
        <button onClick={copy} className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-[var(--hairline)] text-[12.5px] font-medium text-white/85 transition">
          {copied ? <Check size={13} /> : <Copy size={13} />} Link
        </button>
      </div>

      <p className="text-[11.5px] text-white/45 leading-relaxed">
        Pre-filled: <span className="text-white/65">"{REFERRAL_MESSAGE}[link]"</span>
      </p>

      {referrals.length > 0 && (
        <div className="rounded-xl bg-white/3 border border-[var(--hairline)] p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12.5px] font-medium">
              <span className="text-white/85">{referrals.length} people</span>
              <span className="text-white/55"> joined from your link</span>
            </p>
            <div className="flex -space-x-1.5">
              {referrals.slice(0, 5).map((r) => (
                <span
                  key={r.name}
                  title={r.name}
                  className="w-6 h-6 rounded-full bg-[#89CFF0]/20 text-[#89CFF0] text-[9.5px] font-semibold flex items-center justify-center ring-2 ring-[var(--surface-1)]"
                >
                  {initials(r.name)}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11.5px] text-[#89CFF0]">
            +{referrals[0]?.points ?? 6} Community points per signup
          </p>
        </div>
      )}
    </div>
  );
}

export function ReferralLineItems({ referrals = DEMO_REFERRALS }: { referrals?: Referral[] }) {
  if (referrals.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {referrals.map((r) => (
        <li key={r.name} className="flex items-center gap-2 text-[12px]">
          <span className="w-5 h-5 rounded-full bg-[#89CFF0]/18 text-[#89CFF0] text-[9px] font-semibold flex items-center justify-center shrink-0">
            {initials(r.name)}
          </span>
          <span className="text-white/75 flex-1 truncate">
            Referred <span className="text-white">{r.name}</span>
            <span className="text-white/45"> — signed up {r.joinedOn}</span>
          </span>
          <span className="font-mono text-[10.5px] tabular-nums text-[#89CFF0] shrink-0">+{r.points} pts</span>
        </li>
      ))}
    </ul>
  );
}
