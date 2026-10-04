import { redirect } from "next/navigation";

export default async function LearnMissionDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/missions/${slug}`);
}
