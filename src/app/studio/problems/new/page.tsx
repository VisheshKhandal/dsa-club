import type { Metadata } from "next";
import ProblemEditor from "@/components/studio/problems/problem-editor";

export const metadata: Metadata = { title: "New Problem" };
export default function NewProblemPage() { return <ProblemEditor />; }
