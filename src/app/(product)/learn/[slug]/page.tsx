import { redirect } from "next/navigation";

export default async function LegacyLearnTopicRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/learn/topics/${slug}`);
}
