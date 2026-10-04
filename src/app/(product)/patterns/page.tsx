import { PatternSheetsView } from "@/components/product/data-views";
import { getCachedPatternSheetsData } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";

export default async function PatternSheetsPage() {
  return <PatternSheetsView patterns={await getCachedPatternSheetsData(await requireUserId())} />;
}
