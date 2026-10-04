"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/features/auth/actions/logout.action";

export function LogoutButton() {
  return <form action={logoutAction}><button type="submit" className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.075]"><LogOut size={16} />Sign out</button></form>;
}
