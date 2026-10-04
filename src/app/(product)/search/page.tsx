import Link from "next/link";
import { searchMongoProvider } from "@/features/platform/services/search.service";
import { Card, ProductPage, SectionHeader } from "@/components/product/ui";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { groups, results } = await searchMongoProvider(q, 25);

  return (
    <ProductPage title="Global search" description="Search topics, missions, problems, patterns, companies, revision items, and learning content from MongoDB.">
      <Card>
        <form className="mb-4">
          <input name="q" defaultValue={q} placeholder="Search MongoDB content..." className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm" />
        </form>
        <SectionHeader eyebrow="Index" title="Search results" />
        {results.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5 text-sm text-slate-400">
            {q.trim() ? `No results for "${q.trim()}". Try a topic, mission, problem, pattern, company, or learning path.` : "Start typing to search published MongoDB content."}
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-purple-200/45">{group.category}</p>
                <div className="grid gap-2">
                  {group.results.map((item) => (
                    <Link key={`${item.href}-${item.title}`} href={item.href} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 hover:bg-white/[0.065]">
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="text-xs text-slate-500">{item.description}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Card>
    </ProductPage>
  );
}
