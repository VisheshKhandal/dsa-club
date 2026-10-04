import { redirect } from "next/navigation";

export default async function PracticeProblemsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const queryString = sp ? new URLSearchParams(sp as Record<string, string>).toString() : "";
  redirect(queryString ? `/practice?${queryString}` : "/practice");
}
