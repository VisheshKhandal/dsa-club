import type { Metadata } from "next";
import TopicEditor from "@/components/studio/topics/topic-editor";

export const metadata: Metadata = { title: "Edit Topic" };

export default async function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TopicEditor topicId={id} />;
}
