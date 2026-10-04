import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Compass, ListChecks, Target } from "lucide-react";
import { getCachedLearnData } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { ButtonLink, DifficultyBadge, EmptySlate, MissionCard, ProductPage, ProgressTrack, SectionHeader, StatusBadge, Surface } from "@/components/product/ui";

type Mission = {
  id: string;
  slug: string;
  title: string;
  topic: string;
  progress: number;
  duration: string;
  difficulty: string;
  status: string;
};

function missionStatusLabel(status: string) {
  return status === "completed" ? "Completed" : status === "in_progress" ? "In Progress" : "Not Started";
}

function MissionFocusCard({ mission }: { mission: Mission }) {
  return (
    <Surface level="elevated" className="overflow-hidden p-0">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200">
              <Compass size={12} /> Current
            </span>
            <DifficultyBadge difficulty={mission.difficulty} />
            <StatusBadge status={mission.status} />
          </div>
          <p className="label-xs mb-1.5 text-purple-300/65">{mission.topic}</p>
          <h2 className="text-2xl font-bold leading-tight text-white">{mission.title}</h2>
          <div className="mt-5 flex max-w-lg items-center gap-3">
            <ProgressTrack value={mission.progress} />
            <span className="shrink-0 text-sm font-semibold text-purple-200">{mission.progress}%</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <ButtonLink href={`/missions/${mission.slug}`}>
            {mission.status === "in_progress" ? "Resume Mission" : "Start Mission"} <ArrowRight size={14} />
          </ButtonLink>
          <ButtonLink href="/learn" variant="secondary">
            Back to Learn
          </ButtonLink>
        </div>
      </div>
    </Surface>
  );
}

function TopicMissionGroup({ topic, missions }: { topic: string; missions: Mission[] }) {
  const completed = missions.filter((mission) => mission.status === "completed").length;
  const progress = missions.length ? Math.round((completed / missions.length) * 100) : 0;

  return (
    <section>
      <SectionHeader
        eyebrow={`${missions.length} mission${missions.length === 1 ? "" : "s"}`}
        title={topic}
        action={<span className="text-xs font-semibold text-purple-100/45">{progress}% complete</span>}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission as never} />
        ))}
      </div>
    </section>
  );
}

export default async function MissionsPage() {
  const data = await getCachedLearnData(await requireUserId());
  const missions = data.missions as Mission[];
  const currentMission = missions.find((mission) => mission.status === "in_progress")
    ?? missions.find((mission) => mission.status !== "completed")
    ?? missions[0];
  const completedCount = missions.filter((mission) => mission.status === "completed").length;
  const inProgressCount = missions.filter((mission) => mission.status === "in_progress").length;
  const notStartedCount = missions.filter((mission) => mission.status !== "completed" && mission.status !== "in_progress").length;
  const grouped = Array.from(
    missions.reduce((map, mission) => {
      const items = map.get(mission.topic) ?? [];
      items.push(mission);
      map.set(mission.topic, items);
      return map;
    }, new Map<string, Mission[]>())
  );

  return (
    <ProductPage title="Missions" description="Work through focused DSA missions, continue where you stopped, and track each topic path.">
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "In Progress", value: inProgressCount, icon: Target, tone: "text-cyan-300" },
            { label: "Completed", value: completedCount, icon: CheckCircle2, tone: "text-emerald-300" },
            { label: "Waiting", value: notStartedCount, icon: Clock, tone: "text-amber-300" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Surface key={item.label} className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                  <Icon size={17} className={item.tone} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{item.value}</p>
                  <p className="text-xs font-medium text-purple-100/45">{item.label}</p>
                </div>
              </Surface>
            );
          })}
        </section>

        {currentMission ? <MissionFocusCard mission={currentMission} /> : <EmptySlate context="mission" />}

        {missions.length ? (
          <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
            <div className="space-y-8">
              {grouped.map(([topic, topicMissions]) => (
                <TopicMissionGroup key={topic} topic={topic} missions={topicMissions} />
              ))}
            </div>
            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <Surface>
                <div className="mb-4 flex items-center gap-2">
                  <ListChecks size={16} className="text-purple-300" />
                  <h3 className="text-sm font-semibold text-white">Mission Queue</h3>
                </div>
                <div className="space-y-2">
                  {missions.slice(0, 6).map((mission) => (
                    <Link key={mission.id} href={`/missions/${mission.slug}`} className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-white/[0.04]">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-purple-100/70 group-hover:text-white">{mission.title}</p>
                        <p className="text-[10px] text-purple-100/35">{missionStatusLabel(mission.status)}</p>
                      </div>
                      <ArrowRight size={12} className="shrink-0 text-purple-100/30 group-hover:text-purple-300" />
                    </Link>
                  ))}
                </div>
              </Surface>
            </aside>
          </div>
        ) : null}
      </div>
    </ProductPage>
  );
}
