import { redirect } from "next/navigation";

export default async function PracticePatternDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/patterns/${slug}`);
}
