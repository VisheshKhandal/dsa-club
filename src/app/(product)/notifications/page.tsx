import { NotificationsView } from "@/components/product/data-views";
import { getNotifications } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";

export default async function NotificationsPage() {
  return <NotificationsView notifications={await getNotifications(await requireUserId())} />;
}
