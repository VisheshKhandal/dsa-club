import { stats, systemModules } from "@/lib/app-data";
import type { ProductSummaryDto } from "@/features/platform/dto/platform.dto";

export async function getProductSummary(): Promise<ProductSummaryDto> {
  return {
    stats: stats.map(({ label, value, delta }) => ({ label, value, delta })),
    modules: systemModules.map(({ label, state }) => ({ label, state })),
  };
}
