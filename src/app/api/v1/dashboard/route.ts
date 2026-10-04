import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProductSnapshot } from "@/features/product/services/product.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getProductSnapshot(session.user.id));
}
