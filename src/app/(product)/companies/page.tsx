import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getCachedCompanyPrepPageData } from "@/features/product/services/product.service";
import { CompanyPrepView } from "@/components/product/company-prep-view";
import CompaniesLoading from "./loading";

async function CompaniesDataLoader({ userId }: { userId?: string }) {
  const pageData = await getCachedCompanyPrepPageData(userId);
  return <CompanyPrepView data={pageData} />;
}

export default async function CompaniesPage() {
  const session = await auth();
  return (
    <Suspense fallback={<CompaniesLoading />}>
      <CompaniesDataLoader userId={session?.user?.id} />
    </Suspense>
  );
}
