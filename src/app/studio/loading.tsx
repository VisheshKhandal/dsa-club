import { PageHeader } from "@/components/studio/ui";

export default function StudioLoading() {
  return (
    <div className="space-y-8">
      <PageHeader title="Loading Studio" description="Preparing the next workspace..." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="studio-skeleton h-32" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <div className="studio-skeleton h-80" />
        <div className="studio-skeleton h-80" />
      </div>
    </div>
  );
}
