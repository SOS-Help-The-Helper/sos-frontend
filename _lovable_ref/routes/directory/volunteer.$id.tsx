import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock, Phone, MessageSquare, Share2, Flag, XCircle } from "lucide-react";
import { CrmShell } from "@/components/crm/CrmShell";
import { Avatar } from "@/components/directory/Avatar";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroLine, ActionBtn,
} from "@/components/crm/DetailShell";
import { volunteers } from "@/lib/prototype-data";

type Volunteer = (typeof volunteers)[number];

export const Route = createFileRoute("/directory/volunteer/$id")({
  loader: ({ params }): Volunteer => {
    const v = volunteers.find((x) => x.id === params.id);
    if (!v) throw notFound();
    return v;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Volunteer"} — SOS Connect` },
      { name: "description", content: `${loaderData?.name} volunteer profile.` },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-dvh flex items-center justify-center text-white/70">
      Volunteer not found ·{" "}
      <Link to="/directory" className="text-[#89CFF0] underline ml-2">
        Back
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-white/70">{error.message}</div>,
  component: VolunteerPage,
});

function VolunteerPage() {
  const v = Route.useLoaderData();
  const statusTint =
    v.status === "active" ? "#34D399" :
    v.status === "new" ? "#89CFF0" :
    "rgba(245,235,214,0.55)";

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      content: <EmptyTab label="No recent activity logged." />,
    },
    {
      key: "assignments",
      label: "Assignments",
      content: <EmptyTab label="No active assignments." />,
    },
    {
      key: "skills",
      label: "Skills",
      count: v.skills.length,
      content: v.skills.length === 0 ? (
        <EmptyTab label="No skills listed." />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {v.skills.map((s: string) => (
            <span key={s} className="h-7 px-2.5 inline-flex items-center rounded-md bg-white/6 text-[12px] text-white/85">
              {s}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <CrmShell module="Directory">
      <DetailTopBar backTo="/directory" backLabel="Directory" />

      <main className="max-w-[960px] mx-auto px-4 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={<Avatar name={v.name} size={56} />}
          pills={<StatusPill tint={statusTint}>{v.status}</StatusPill>}
          title={v.name}
          chips={
            <>
              <MetaChip icon={Clock}>{v.hours}h logged</MetaChip>
              <MetaPopover>
                <span className="font-mono text-[10px] text-white/40">{v.id}</span>
                <MetaChip>{v.skills.length} skill{v.skills.length === 1 ? "" : "s"}</MetaChip>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call" />
              <ActionBtn icon={MessageSquare} label="Message" />
              <OverflowMenu
                actions={[
                  { label: "Share", icon: Share2 },
                  { label: "Flag", icon: Flag, danger: true },
                  { label: "Deactivate", icon: XCircle, danger: true },
                ]}
              />
            </>
          }
        />

        <HeroLine
          primary={
            <>
              <span className="font-semibold tabular-nums">{v.hours}</span>
              <span className="text-white/55"> hours logged · </span>
              <span className="text-white/70 capitalize">{v.status}</span>
            </>
          }
          meta={`${v.skills.length} ${v.skills.length === 1 ? "skill" : "skills"}`}
        />

        <AiSummary
          id={v.id}
          tldr={`${v.status} volunteer · ${v.hours}h logged.`}
          summary={`${v.name} is a ${v.status} volunteer with ${v.hours} hours logged. Tracked skills: ${v.skills.length > 0 ? v.skills.join(", ") : "none on file"}.`}
        />

        <DetailTabs tabs={tabs} defaultKey="activity" />
      </main>
    </CrmShell>
  );
}
