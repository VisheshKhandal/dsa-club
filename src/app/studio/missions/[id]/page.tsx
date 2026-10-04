import type { Metadata } from "next";
import MissionEditor from "@/components/studio/missions/mission-editor";

export const metadata: Metadata = { title: "Edit Mission" };
export default async function EditMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MissionEditor missionId={id} />;
}
