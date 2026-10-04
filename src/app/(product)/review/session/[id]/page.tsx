import { redirect } from "next/navigation";

export default async function ReviewSessionRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/revision/session/${id}`);
}
