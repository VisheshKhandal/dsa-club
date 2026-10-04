import Link from "next/link";
import { EmptyState } from "@/components/product/ui";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center p-6"><div className="w-full max-w-2xl"><EmptyState title="Page not found" description="That route is not part of the current learning operating system." action={<Link className="rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" href="/dashboard">Back to dashboard</Link>} /></div></main>;
}
