import type { Metadata } from "next";
import CompanyEditor from "@/components/studio/companies/company-editor";

export const metadata: Metadata = { title: "New Company" };
export default function NewCompanyPage() { return <CompanyEditor />; }
