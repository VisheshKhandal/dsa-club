import { Metadata } from "next";
import { getProductSnapshot } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { AccountView } from "./account-view";

export const metadata: Metadata = {
  title: "Account · DSA Club",
  description: "Manage your student identity, career targets, credentials, and data privacy.",
};

export default async function AccountPage() {
  const userId = await requireUserId();
  const data = await getProductSnapshot(userId);

  return (
    <AccountView
      user={data.user}
      profile={data.profile}
    />
  );
}
