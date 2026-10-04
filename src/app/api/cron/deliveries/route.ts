import { NextRequest, NextResponse } from "next/server";
import {
  processDeliveryBatch,
  recoverStaleDeliveries,
  verifyCronAuthorization,
} from "@/features/intelligence/services/learning-delivery.service";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret");
  if (!verifyCronAuthorization(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Recover expired leases first
  const recovered = await recoverStaleDeliveries();

  // Process a batch of pending deliveries
  const workerId = `worker-cron-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const batchResult = await processDeliveryBatch({ workerId, batchSize: 20 });

  return NextResponse.json({
    ok: true,
    recoveredStaleLeases: recovered,
    ...batchResult,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
