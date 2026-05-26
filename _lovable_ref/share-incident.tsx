import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { incidents, cases, orgs, availableResources, type Taxonomy } from "@/lib/prototype-data";
import { Sparkline } from "@/components/crm/Sparkline";
import {
  AlertTriangle, MapPin, Calendar, TrendingDown, TrendingUp,
  Home, Utensils, HeartPulse, Baby, Bus, ShieldCheck, ArrowRight,
} from "lucide-react";

const CATEGORIES: { id: string; label: string; icon: typeof Home; taxonomies: Taxonomy[] }[] = [
  { id: "housing",   label: "Housing",   icon: Home,       taxonomies: ["HOUSING.TEMPORARY", "HOUSING.REPAIR"] },
  { id: "food",      label: "Food",      icon: Utensils,   taxonomies: ["FOOD.PANTRY", "FOOD.HOT_MEAL"] },
  { id: "health",    label: "Health",    icon: HeartPulse, taxonomies: ["MEDICAL.SUPPLIES", "MENTAL_HEALTH"] },
  { id: "childcare", label: "Childcare", icon: Baby,       taxonomies: ["CHILDCARE"] },
  { id: "transport", label: "Transport", icon: Bus,        taxonomies: ["TRANSPORT"] },
];

export const Route = createFileRoute("/share/incident/$id")({
  loader: ({ params }) => {
    const incident = incidents.find((i) => i.id === params.id);
    if (!incident) throw notFound();
    return { incident };
  },
  head: ({ params, loaderData }) => {
    const i = loaderData?.incident;
    const title = i ? `${i.name} — Situation Report` : "Situation Report";
    const desc = i
      ? `${i.county} County, NC. Declared ${i.declared}. ${i.cases} open cases coordinated across partner organizations. Live data from SOS Connect.`
      : "Public situation report.";
    const url = `https://nexus-people-finder.lovable.app/share/incident/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: i
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: title,
                description: desc,
                datePublished: i.declared,
                author: { "@type": "Organization", name: "SOS Connect" },
                publisher: { "@type": "Organization", name: "SOS Connect" },
                articleSection: "Situation Report",
                about: i.name,
                spatialCoverage: { "@type": "Place", name: `${i.county} County, NC` },
              }),
            },
          ]
        : undefined,
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">404</p>
        <h1 className="text-[22px] font-semibold mt-2">Situation report not found</h1>
        <Link to="/" className="text-[13px] text-primary hover:underline mt-3 inline-block">
          Back to SOS Connect →
        </Link>
      </div>
    </div>
  ),
  component: PublicSitrep,
});

function PublicSitrep() {
  const { incident } = Route.useLoaderData();
  const incidentCases = cases.slice(0, incident.cases);
  const orgsInvolved = Array.from(new Set(incidentCases.map((c) => c.org)))
    .map((id) => orgs.find((o) => o.id === id))
    .filter(Boolean) as typeof orgs;
  const resolved = incidentCases.filter((c) => c.status === "fulfilled" || c.status === "closed").length;
  const peopleServed = incidentCases.reduce((acc, c) => acc + 1 + (c.daysOpen > 0 ? 1 : 0), 0) * 3;

  const categoryStats = CATEGORIES.map((cat) => {
    const requests = incidentCases.filter((c) =>
      c.taxonomy.some((t) => cat.taxonomies.includes(t as Taxonomy))
    ).length;
    const resources = availableResources.filter((r) => cat.taxonomies.includes(r.taxonomy)).length;
    return { ...cat, requests, resources };
  }).filter((s) => s.requests + s.resources > 0);
  const maxBar = Math.max(1, ...categoryStats.flatMap((s) => [s.requests, s.resources]));

  const peakCategory = [...categoryStats].sort((a, b) => b.requests - a.requests)[0];
  const matchTrend = incident.avgMatchHistory[0] - incident.avgMatchHours;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Masthead */}
      <header className="border-b border-border bg-card">
        <div className="max-w-[760px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-[12px]">
              S
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
                SOS Connect
              </p>
              <p className="text-[12px] font-medium leading-tight">Situation Report</p>
            </div>
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {incident.id}
          </p>
        </div>
      </header>

      <article className="max-w-[760px] mx-auto px-5 py-10 space-y-10">
        {/* Hero */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider ${
                incident.status === "active"
                  ? "bg-destructive/10 text-destructive"
                  : incident.status === "monitoring"
                  ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                  : "bg-[var(--success)]/15 text-[var(--success)]"
              }`}
            >
              {incident.status === "active" && (
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              )}
              {incident.status}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Declared {incident.declared}
            </span>
          </div>
          <h1 className="text-[36px] md:text-[44px] font-serif leading-[1.05] tracking-tight">
            {incident.name}
          </h1>
          <p className="text-[16px] text-muted-foreground mt-4 leading-relaxed">
            A coordinated community response in {incident.county} County, North Carolina.
            Live data from {orgsInvolved.length} partner organizations working through the SOS Connect network.
          </p>
          <div className="flex items-center gap-4 mt-5 flex-wrap text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={12} /> {incident.county} County, NC
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} /> {incident.declared}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle size={12} /> {incident.priority === "urgent" ? "Urgent priority" : "Normal priority"}
            </span>
          </div>
        </section>

        {/* Impact strip */}
        <section className="grid grid-cols-3 gap-3">
          <ImpactStat label="People served" value={peopleServed} accent="text-foreground" />
          <ImpactStat label="Cases resolved" value={`${resolved}/${incidentCases.length}`} accent="text-[var(--success)]" />
          <ImpactStat label="Partner orgs" value={orgsInvolved.length} accent="text-foreground" />
        </section>

        {/* Narrative */}
        <section className="space-y-4 text-[15px] leading-[1.7] text-foreground/90">
          <h2 className="font-serif text-[24px] tracking-tight">What's happening on the ground</h2>
          <p>
            The {incident.name.toLowerCase()} response was declared on {incident.declared}.
            Since then, {incidentCases.length} households in {incident.county} County have filed
            requests through SOS Connect, ranging from emergency housing to medical supplies.
          </p>
          {peakCategory && (
            <p>
              Peak demand has concentrated around <strong className="font-semibold">{peakCategory.label.toLowerCase()}</strong>,
              with {peakCategory.requests} active requests against {peakCategory.resources} offered resources.
              {peakCategory.requests > peakCategory.resources
                ? " The gap is being actively coordinated across partner organizations."
                : " Supply currently meets demand for this category."}
            </p>
          )}
          <p>
            Average time-to-first-match has{" "}
            {matchTrend > 0 ? (
              <span className="text-[var(--success)] font-medium">improved by {matchTrend.toFixed(1)}h</span>
            ) : (
              <span className="text-foreground font-medium">held steady</span>
            )}{" "}
            since the response began, currently sitting at <strong className="font-semibold tabular-nums">{incident.avgMatchHours}h</strong>{" "}
            from request to confirmed offer.
          </p>
        </section>

        {/* Needs vs resources */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Needs &amp; resources
          </p>
          <h2 className="font-serif text-[22px] tracking-tight mt-1 mb-5">
            Open requests vs offered resources
          </h2>
          <ul className="space-y-3">
            {categoryStats.map((s) => {
              const Icon = s.icon;
              const reqPct = (s.requests / maxBar) * 100;
              const resPct = (s.resources / maxBar) * 100;
              const gap = s.requests - s.resources;
              return (
                <li key={s.id} className="grid grid-cols-[120px_1fr_auto] gap-3 items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={13} className="text-muted-foreground" />
                    <span className="text-[13px] truncate">{s.label}</span>
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9.5px] w-14 shrink-0 text-muted-foreground">Requests</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-destructive/70" style={{ width: `${reqPct}%` }} />
                      </div>
                      <span className="font-mono text-[10.5px] tabular-nums w-6 text-right text-foreground/80">{s.requests}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9.5px] w-14 shrink-0 text-muted-foreground">Offered</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--success)]/60" style={{ width: `${resPct}%` }} />
                      </div>
                      <span className="font-mono text-[10.5px] tabular-nums w-6 text-right text-foreground/80">{s.resources}</span>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[10.5px] tabular-nums px-1.5 py-0.5 rounded shrink-0 ${
                      gap > 0
                        ? "bg-destructive/10 text-destructive"
                        : gap < 0
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : "text-muted-foreground"
                    }`}
                  >
                    {gap > 0 ? `+${gap} gap` : gap < 0 ? `${Math.abs(gap)} extra` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Match trend */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Time to first match
              </p>
              <p className="text-[40px] font-serif tabular-nums leading-none mt-1">
                {incident.avgMatchHours}<span className="text-[20px] text-muted-foreground">h</span>
              </p>
              <p className="text-[12px] text-muted-foreground mt-2 inline-flex items-center gap-1">
                {matchTrend > 0 ? (
                  <>
                    <TrendingDown size={11} className="text-[var(--success)]" />
                    <span className="text-[var(--success)]">{matchTrend.toFixed(1)}h faster</span> than at declaration
                  </>
                ) : (
                  <>
                    <TrendingUp size={11} className="text-destructive" />
                    <span className="text-destructive">steady</span>
                  </>
                )}
              </p>
            </div>
            <Sparkline
              values={[...incident.avgMatchHistory].reverse()}
              stroke="var(--success)"
              fill="var(--success)"
              width={180}
              height={56}
            />
          </div>
        </section>

        {/* Partners */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Partner organizations
          </p>
          <h2 className="font-serif text-[22px] tracking-tight mt-1 mb-4">
            Coordinating this response
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {orgsInvolved.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <span className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0"
                  style={{ background: `${o.color}1A`, color: o.color }}
                >
                  {o.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">{o.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <ShieldCheck size={9} /> verified partner
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer CTA */}
        <section className="rounded-2xl bg-foreground text-background p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider opacity-70">
            Built with SOS Connect
          </p>
          <h2 className="font-serif text-[28px] tracking-tight mt-2">
            Coordinate your community's response.
          </h2>
          <p className="text-[14px] opacity-80 mt-3 max-w-md mx-auto">
            SOS Connect helps mutual-aid groups, nonprofits, and local government route
            requests to the right partner in minutes — not days.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 mt-5 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition"
          >
            See how it works <ArrowRight size={13} />
          </Link>
        </section>

        <footer className="text-center pt-4 pb-2">
          <p className="font-mono text-[10px] text-muted-foreground">
            Public report · PII redacted · Updated continuously
          </p>
        </footer>
      </article>
    </div>
  );
}

function ImpactStat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`text-[28px] font-serif tabular-nums leading-none mt-2 ${accent}`}>
        {value}
      </p>
    </div>
  );
}
