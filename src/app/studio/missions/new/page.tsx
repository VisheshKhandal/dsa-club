import type { Metadata } from "next";
import MissionEditor from "@/components/studio/missions/mission-editor";

export const metadata: Metadata = { title: "New Mission" };
export default function NewMissionPage() { return <MissionEditor />; }
