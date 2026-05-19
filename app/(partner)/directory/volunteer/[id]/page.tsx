"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ChevronLeft, Clock, Activity } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { volunteers } from "@/lib/prototype-data";

function Avatar({ name, size }: { name: string; size: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-white/10 flex items-center justify-center font-semibold text-white/85 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials}
    </div>
  );
}

export default function VolunteerPage() {
  const params = useParams();
  const id = params.id as string;

  const v = useMemo(() => volunteers.find((x) => x.id === id), [id]);

  if (!v) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Volunteer not found ·{" "}
        <Link href="/directory" className="text-[#89CFF0] underline ml-2">
          Back
        </Link>
      </div>
    );
  }

  const statusTone =
    v.status === "active"
      ? "bg-[#34D399]/15 text-[#34D399]"
      : v.status === "new"
      ? "bg-[#89CFF0]/15 text-[#89CFF0]"
      : "bg-white/10 text-white/55";

  return (
    <CrmShell module="Directory">
      <div className="min-h-screen text-white">
        <header className="sticky top-0 z-30 glass border-b border-[var(--hairline)]">
          <div className="max-w-[900px] mx-auto px-5 md:px-10 h-12 flex items-center">
            <Link
              href="/directory"
              className="inline-flex items-center gap-1 text-[15px] text-[#89CFF0] -ml-1.5"
            >
              <ChevronLeft size={20} />
              <span>Directory</span>
            </Link>
          </div>
        </header>

        <main className="max-w-[900px] mx-auto px-5 md:px-10 py-6 md:py-10">
          <div className="flex flex-col items-center text-center pt-2 pb-7">
            <Avatar name={v.name} size={96} />
            <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight mt-4">
              {v.name}
            </h1>
            <p className="text-[15px] text-white/55 mt-0.5">Volunteer · {v.id}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <span
                className={`px-3 py-1 text-[12px] font-medium rounded-full capitalize ${statusTone}`}
              >
                {v.status}
              </span>
              <span className="px-3 py-1 text-[12px] font-medium rounded-full bg-white/8 text-white/75 inline-flex items-center gap-1">
                <Clock size={12} strokeWidth={2} /> {v.hours}h logged
              </span>
            </div>
          </div>

          <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {v.skills.map((s: string) => (
                <span
                  key={s}
                  className="h-7 px-2.5 inline-flex items-center rounded-md bg-white/6 text-[12px] text-white/85"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 mt-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3 inline-flex items-center gap-1.5">
              <Activity size={11} /> Activity
            </p>
            <p className="text-[13px] text-white/55">No recent activity logged.</p>
          </section>
        </main>
      </div>
    </CrmShell>
  );
}
