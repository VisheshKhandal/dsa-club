"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import CodeBlock from "@tiptap/extension-code-block";
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, List, ListOrdered, Quote, Undo, Redo, ImageIcon, LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const ToolbarButton = ({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) => (
  <button
    type="button"
    title={title}
    onClick={(e) => { e.preventDefault(); onClick(); }}
    disabled={disabled}
    className={cn(
      "p-1.5 rounded text-purple-300/50 hover:bg-purple-500/10 hover:text-purple-100 transition-colors focus-ring disabled:opacity-50",
      active && "bg-purple-500/15 text-purple-200"
    )}
  >
    {children}
  </button>
);

/** Normalize an HTML string so that semantically-empty values compare equal. */
function normalizeHtml(html: string | undefined | null): string {
  const s = (html ?? "").trim();
  return s === "<p></p>" || s === "<br>" ? "" : s;
}

export function RichTextEditor({ value, onChange, placeholder = "Start typing...", className }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Image,
      Link.configure({ openOnClick: false }),
      CodeBlock,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4",
      },
    },
  });

  /**
   * Sync the `value` prop into Tiptap whenever the parent feeds new content
   * asynchronously (e.g. after API fetch or localStorage restore).
   * Only update when incoming content differs and user is not actively typing.
   */
  useEffect(() => {
    if (!editor) return;
    const incoming = normalizeHtml(value);
    const current = normalizeHtml(editor.getHTML());
    if (incoming !== current && !editor.isFocused) {
      editor.commands.setContent(value ?? "");
    }
  }, [editor, value]);

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt("URL of the image:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL:", previousUrl);
    
    // cancelled
    if (url === null) return;
    
    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    
    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className={cn("rounded-xl border border-purple-500/15 bg-[rgba(12,6,24,0.75)] overflow-hidden flex flex-col", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-purple-500/10 bg-[rgba(8,3,18,0.5)] p-1">
        <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </ToolbarButton>
        <ToolbarButton title="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={14} />
        </ToolbarButton>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <ToolbarButton title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={14} />
        </ToolbarButton>
        <ToolbarButton title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} />
        </ToolbarButton>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <ToolbarButton title="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton title="Ordered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </ToolbarButton>
        <ToolbarButton title="Code Block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />
        
        <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon size={14} />
        </ToolbarButton>
        <ToolbarButton title="Image" onClick={addImage}>
          <ImageIcon size={14} />
        </ToolbarButton>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={14} />
        </ToolbarButton>
        <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={14} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto cursor-text" onClick={() => editor.commands.focus()} />
    </div>
  );
}
