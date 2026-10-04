import { Metadata } from "next";
import { getCachedCompanyPrepPageData, getProductSnapshot } from "@/features/product/services/product.service";
import { requireUserId } from "@/lib/auth-guard";
import { InterviewView } from "@/components/product/interview-view";

export const metadata: Metadata = {
  title: "Interview Preparation | DSA Club",
  description: "Company collections, timed mock interview practice, and multi-dimensional readiness evidence.",
};

export default async function InterviewPage() {
  const userId = await requireUserId();
  const [snapshot, companyData] = await Promise.all([
    getProductSnapshot(userId),
    getCachedCompanyPrepPageData(userId),
  ]);

  return <InterviewView companyData={companyData} snapshot={snapshot} />;
}
