"use client";

import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Strikethrough } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichNoteEditorProps {
  defaultValue?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

// Tiptap editor for meeting-note fields (body, actionItems). Stores HTML in the existing
// String DB columns — no schema migration required. Unlike RichCommentEditor, no @mentions
// and no submit shortcut; submit is owned by the parent form button.
export function RichNoteEditor({
  defaultValue,
  onChange,
  placeholder,
  className,
  minHeight = "min-h-32",
}: RichNoteEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    content: defaultValue || "",
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Type here…" }),
    ],
    editorProps: {
      attributes: {
        class: `${minHeight} max-h-96 overflow-y-auto px-3 py-2 text-sm outline-none`,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border border-input bg-background focus-within:border-primary", className)}>
      <NoteToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function NoteToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      headingValue: currentHeadingValue(e),
      isBold: e.isActive("bold"),
      isItalic: e.isActive("italic"),
      isStrike: e.isActive("strike"),
      isBulletList: e.isActive("bulletList"),
      isOrderedList: e.isActive("orderedList"),
    }),
  });

  return (
    <div className="flex items-center gap-0.5 border-b px-1.5 py-1">
      <select
        value={state.headingValue}
        onChange={(e) => {
          const level = Number(e.target.value);
          if (level === 0) editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
        }}
        className="h-6 rounded-md border border-input bg-background px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus:border-primary"
      >
        <option value="0">Normal</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>
      <ToolbarBtn icon={Bold} label="Bold" active={state.isBold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarBtn icon={Italic} label="Italic" active={state.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarBtn icon={Strikethrough} label="Strikethrough" active={state.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarBtn icon={List} label="Bullet list" active={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarBtn icon={ListOrdered} label="Numbered list" active={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
    </div>
  );
}

function currentHeadingValue(editor: Editor): string {
  for (const level of [1, 2, 3] as const) {
    if (editor.isActive("heading", { level })) return String(level);
  }
  return "0";
}

function ToolbarBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground"
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
