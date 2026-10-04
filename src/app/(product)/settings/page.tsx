import { Metadata } from "next";
import { getProductSnapshot } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = {
  title: "Settings · DSA Club",
  description: "Customize your visual appearance, study cadence, AI mentor guidance, and platform preferences.",
};

export default async function SettingsPage() {
  const userId = await requireUserId();
  const data = await getProductSnapshot(userId);

  return (
    <SettingsView
      initialPreferences={data.profile?.preferences as any}
    />
  );
}
