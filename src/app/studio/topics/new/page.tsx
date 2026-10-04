import type { Metadata } from "next";
import TopicEditor from "@/components/studio/topics/topic-editor";

export const metadata: Metadata = { title: "New Topic" };

export default function NewTopicPage() {
  return <TopicEditor />;
}
