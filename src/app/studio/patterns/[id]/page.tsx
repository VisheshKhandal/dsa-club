import type { Metadata } from "next";
import PatternEditor from "@/components/studio/patterns/pattern-editor";

export const metadata: Metadata = { title: "Edit Pattern" };
export default async function EditPatternPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatternEditor patternId={id} />;
}
