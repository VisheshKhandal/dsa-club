import { Award } from "lucide-react";
import { EmptyState, SectionHeader } from "@/components/product/ui";
import { ProductPage } from "@/components/product/ui";
import { getAchievements } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";

type AchievementRow = {
  _id: unknown;
  unlockedAt?: Date;
  achievementId?: {
    title?: string;
    description?: string;
    category?: string;
    points?: number;
  } | null;
};

export default async function AchievementsPage() {
  const achievements = await getAchievements(await requireUserId()) as AchievementRow[];

  return (
    <ProductPage title="Achievements" description="Milestones unlocked from your real learning activity and Admin Studio achievement records.">
      {achievements.length ? (
        <section>
          <SectionHeader eyebrow="Unlocked" title="Your achievement history" />
          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {achievements.map((item) => {
              const achievement = item.achievementId;
              return (
                <div key={String(item._id)} className="grid gap-4 py-5 transition hover:bg-white/[0.025] sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="grid size-11 place-items-center rounded-lg border border-purple-300/20 bg-purple-300/[0.08] text-purple-200">
                    <Award size={19} />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">{achievement?.title ?? "Achievement"}</p>
                    {achievement?.description ? <p className="mt-1 text-sm leading-6 text-purple-100/48">{achievement.description}</p> : null}
                  </div>
                  <div className="text-left sm:text-right">
                    {achievement?.points ? <p className="text-sm font-semibold text-purple-200">{achievement.points} pts</p> : null}
                    {item.unlockedAt ? <p className="mt-1 text-xs text-purple-100/35">{new Date(item.unlockedAt).toLocaleDateString()}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState title="No achievements unlocked yet" description="When your activity satisfies published achievement rules, they will appear here from the database." />
      )}
    </ProductPage>
  );
}

