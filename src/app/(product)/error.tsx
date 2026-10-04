"use client";

import { EmptyState } from "@/components/product/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <EmptyState title="Something did not load" description="The product shell is still available. Retry the page when the backing service is ready." action={<button onClick={reset} className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950">Retry</button>} />;
}
