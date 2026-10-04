"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log privately without exposing database or backend internals to user
    console.error("Dashboard error:", error?.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertCircle size={24} />
      </div>
      <h2 className="text-xl font-bold text-white">Couldn&apos;t load your learning dashboard.</h2>
      <p className="mt-2 text-sm text-purple-200/50">
        We encountered an issue while loading your learning action center. Please try again.
      </p>
      <div className="mt-6">
        <button
          onClick={() => reset()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white transition hover:bg-purple-500 active:scale-[0.98]"
        >
          <RotateCcw size={15} /> Retry
        </button>
      </div>
    </div>
  );
}
