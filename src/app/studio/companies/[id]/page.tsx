import type { Metadata } from "next";
import CompanyEditor from "@/components/studio/companies/company-editor";

export const metadata: Metadata = { title: "Edit Company" };

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyEditor companyId={id} />;
}
