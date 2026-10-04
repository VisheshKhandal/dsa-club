import type { Metadata } from "next";
import ProblemEditor from "@/components/studio/problems/problem-editor";

export const metadata: Metadata = { title: "Edit Problem" };
export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProblemEditor problemId={id} />;
}
