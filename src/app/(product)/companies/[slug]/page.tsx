import { getCachedCompanyPrepWorkspaceData } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { ProductPage, Card, EmptyState, ProgressRing, SectionHeader, Timeline, ProblemRow, MissionRow, ButtonLink } from "@/components/product/ui";

export default async function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const userId = await requireUserId();
  const company = await getCachedCompanyPrepWorkspaceData(userId, slug);
  
  if (!company) {
    return (
      <ProductPage title="Company not found" description="This company is not active in MongoDB.">
        <EmptyState title="No company record" description="Choose an active company from company prep." />
      </ProductPage>
    );
  }

  return (
    <ProductPage title={`${company.name} prep`} description={company.description || "Company overview, recommended topics, pattern distribution, interview sets, practice lists, and readiness."}>
      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <SectionHeader eyebrow="Readiness" title="Signal" />
          <div className="flex items-center gap-6">
            <ProgressRing value={company.readiness} />
            <div className="flex flex-col">
              <span className="text-sm text-purple-100/60">Based on pattern mastery</span>
              <span className="text-lg font-semibold text-white">{company.readiness >= 80 ? "Ready for interview" : "Needs preparation"}</span>
            </div>
          </div>
          <div className="mt-8">
            <ButtonLink href="/interview" variant="primary">Start mock interview</ButtonLink>
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Focus" title="Important topics" />
          <Timeline items={company.focus} />
        </Card>
      </section>

      {company.patterns.length > 0 && (
        <section className="mt-10">
          <SectionHeader eyebrow="Patterns" title="Frequently asked patterns" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {company.patterns.map((pattern: any) => (
              <div key={pattern.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-2 transition hover:border-purple-300/20 hover:bg-white/[0.035]">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-white">{pattern.name}</span>
                  <span className="text-xs font-semibold text-purple-300/80 bg-purple-400/[0.08] px-2 py-0.5 rounded-full">{pattern.frequency}</span>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <div className="h-1.5 flex-1 bg-white/[0.07] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-fuchsia-400 to-violet-400 rounded-full" style={{ width: `${pattern.progress}%` }}></div>
                  </div>
                  <span className="text-xs text-purple-100/40">{pattern.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {company.problems.length > 0 && (
        <section className="mt-10">
          <SectionHeader eyebrow="Practice" title="Recommended problems" />
          <div className="grid gap-3 lg:grid-cols-2 mt-4">
            {company.problems.map((problem: any) => (
              <ProblemRow key={problem.id} problem={problem} />
            ))}
          </div>
        </section>
      )}

      {company.missions.length > 0 && (
        <section className="mt-10">
          <SectionHeader eyebrow="Learning" title="Recommended missions" />
          <div className="grid gap-3 lg:grid-cols-2 mt-4">
            {company.missions.map((mission: any) => (
              <MissionRow key={mission.id} mission={mission} />
            ))}
          </div>
        </section>
      )}

      {company.interviewProcess && (
        <section className="mt-10">
          <Card>
            <SectionHeader eyebrow="Hiring" title="Interview Process" />
            <p className="text-sm leading-relaxed text-purple-100/70 whitespace-pre-wrap">{company.interviewProcess}</p>
          </Card>
        </section>
      )}
    </ProductPage>
  );
}
