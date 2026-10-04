import type { Metadata } from "next";
import PatternEditor from "@/components/studio/patterns/pattern-editor";

export const metadata: Metadata = { title: "New Pattern" };
export default function NewPatternPage() { return <PatternEditor />; }
