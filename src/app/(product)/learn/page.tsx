import { Suspense } from "react";
import { Metadata } from "next";
import { getCachedLearnData } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { LearnPageView } from "@/components/product/learn-page-view";
import LearnLoading from "./loading";

export const metadata: Metadata = {
  title: "Learn | DSA Club",
  description: "Your guided DSA learning hub — continue your mission, track your path, and explore the curriculum.",
};

async function LearnDataLoader({ userId }: { userId: string }) {
  const data = await getCachedLearnData(userId);
  return <LearnPageView data={data as any} />;
}

export default async function LearnPage() {
  const userId = await requireUserId();
  return (
    <Suspense fallback={<LearnLoading />}>
      <LearnDataLoader userId={userId} />
    </Suspense>
  );
}
