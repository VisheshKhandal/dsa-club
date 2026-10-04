import { Suspense } from "react";
import { requireUserId } from "@/lib/auth-guard";
import { RevisionSessionClient } from "@/components/product/revision-session";

export default async function RevisionSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ queue?: string }>;
}) {
  await requireUserId(); // guard
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const queueIds = sp.queue ? sp.queue.split(",").filter(Boolean) : undefined;

  return (
    <Suspense fallback={<div className="p-10 text-purple-100/40 text-sm">Loading session…</div>}>
      <RevisionSessionClient queueId={id} queueIds={queueIds} />
    </Suspense>
  );
}
