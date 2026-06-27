"use client";

import { forwardRef, useImperativeHandle } from "react";
import { EditorContent, ReactRenderer, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Mention, { type MentionOptions } from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { JSONContent } from "@tiptap/core";
import { Bold, Italic, Link2, List, ListOrdered, Strikethrough } from "lucide-react";
import {
  MentionSuggestionList,
  type MentionSuggestionItem,
  type MentionSuggestionListHandle,
} from "@/components/shared/MentionSuggestionList";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

const MAX_SUGGESTIONS = 8;

export interface RichCommentEditorHandle {
  isEmpty: () => boolean;
  getPayload: () => { richContent: JSONContent; text: string };
  clear: () => void;
  focus: () => void;
}

interface RichCommentEditorProps {
  users: AppUser[];
  placeholder?: string;
  className?: string;
  initialContent?: JSONContent;
  // Cmd/Ctrl+Enter inside the editor forwards here — the parent decides what "submit" means
  // (it owns the actual post button/async call, via the imperative handle above).
  onSubmitShortcut: () => void;
  onEmptyChange?: (isEmpty: boolean) => void;
}

// Replaces the old MentionTextarea: a real WYSIWYG composer (Tiptap/ProseMirror) so pasted rich
// text (bold/italic/links/lists copied from Word, a webpage, etc.) keeps its formatting instead
// of requiring the user to retype markdown syntax. Supports the same format set as before
// (bold, italic, strikethrough, links, headings 1-3, bulleted/numbered lists) plus @mentions via
// Tiptap's Mention extension — mentions are now structured nodes in the document, not a string
// token, see lib/mentions/tiptap-mentions.ts.
export const RichCommentEditor = forwardRef<RichCommentEditorHandle, RichCommentEditorProps>(
  function RichCommentEditor({ users, placeholder, className, initialContent, onSubmitShortcut, onEmptyChange }, ref) {
    const editor = useEditor({
      immediatelyRender: false,
      content: initialContent,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
          code: false,
          heading: { levels: [1, 2, 3] },
          // Registered separately below with custom validation/autolink options — StarterKit
          // bundles its own Link extension by default, which would otherwise collide with it.
          link: false,
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto"],
          validate: (href) => /^(https?:\/\/|mailto:)/i.test(href),
        }),
        Placeholder.configure({ placeholder: placeholder ?? "Write a comment…" }),
        Mention.configure(buildMentionOptions(users)),
      ],
      editorProps: {
        attributes: {
          // min-h fits the two-line placeholder without clipping it; max-h+overflow caps how tall
          // the box grows for long pasted/typed text so the Comment button below it stays visible
          // instead of being pushed off the bottom of the drawer.
          class: "prose-comment min-h-[3.5rem] max-h-48 overflow-y-auto px-2 py-1.5 text-sm outline-none",
        },
        handleKeyDown(_view, event) {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmitShortcut();
            return true;
          }
          return false;
        },
      },
      // editor.isEmpty returns true for mention-only content in Tiptap v3 because inline
      // atom nodes have no text. Check doc.content.size instead: an empty paragraph has
      // size 2 (open+close), any real content (text or mention atom) raises it above 2.
      onUpdate: ({ editor: e }) => onEmptyChange?.(e.state.doc.content.size <= 2),
      onCreate: ({ editor: e }) => onEmptyChange?.(e.state.doc.content.size <= 2),
    });

    useImperativeHandle(
      ref,
      () => ({
        isEmpty: () => (editor?.state.doc.content.size ?? 0) <= 2,
        getPayload: () => ({ richContent: editor?.getJSON() ?? { type: "doc", content: [] }, text: editor?.getText() ?? "" }),
        clear: () => editor?.commands.clearContent(true),
        focus: () => editor?.commands.focus(),
      }),
      [editor]
    );

    if (!editor) return null;

    return (
      <div className={cn("rounded-md border border-input bg-background focus-within:border-primary", className)}>
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    );
  }
);

function Toolbar({ editor }: { editor: Editor }) {
  // editor.isActive(...) only reflects the latest state at render time — without subscribing via
  // useEditorState, moving the cursor (a selection-only change, no doc mutation) never triggers a
  // re-render, so these controls would silently go stale until some unrelated state change happened
  // to re-render the parent. useEditorState subscribes to every transaction (selection and doc).
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      headingValue: currentHeadingValue(e),
      isBold: e.isActive("bold"),
      isItalic: e.isActive("italic"),
      isStrike: e.isActive("strike"),
      isBulletList: e.isActive("bulletList"),
      isOrderedList: e.isActive("orderedList"),
      isLink: e.isActive("link"),
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
      <ToolbarButton
        icon={Bold}
        label="Bold"
        active={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={Italic}
        label="Italic"
        active={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={Strikethrough}
        label="Strikethrough"
        active={state.isStrike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        icon={List}
        label="Bulleted list"
        active={state.isBulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Numbered list"
        active={state.isOrderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={Link2}
        label="Link"
        active={state.isLink}
        onClick={() => insertLink(editor)}
      />
    </div>
  );
}

function currentHeadingValue(editor: Editor): string {
  for (const level of [1, 2, 3] as const) {
    if (editor.isActive("heading", { level })) return String(level);
  }
  return "0";
}

function insertLink(editor: Editor) {
  const previousHref = editor.getAttributes("link").href as string | undefined;
  const href = window.prompt("Link URL", previousHref ?? "https://");
  if (href === null) return;
  if (href.trim() === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
}

function ToolbarButton({
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
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground"
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function buildMentionOptions(users: AppUser[]): Partial<MentionOptions> {
  return {
    HTMLAttributes: { class: "mention" },
    renderHTML: ({ node }) => ["span", { class: "mention" }, `@${node.attrs.label ?? node.attrs.id}`],
    suggestion: {
      items: ({ query }) => {
        const term = query.toLowerCase();
        return users
          .filter((u) => u.name.toLowerCase().includes(term))
          .slice(0, MAX_SUGGESTIONS)
          .map((u): MentionSuggestionItem => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }));
      },
      render: () => {
        let component: ReactRenderer<MentionSuggestionListHandle, { items: MentionSuggestionItem[]; command: (item: { id: string; label: string }) => void }> | null = null;
        let popup: HTMLDivElement | null = null;

        function position(props: SuggestionProps<MentionSuggestionItem>) {
          if (!popup) return;
          const rect = props.clientRect?.();
          if (!rect) return;
          popup.style.left = `${rect.left + window.scrollX}px`;
          popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
        }

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionSuggestionList, {
              props: { items: props.items, command: props.command },
              editor: props.editor,
            });

            popup = document.createElement("div");
            popup.style.position = "absolute";
            popup.style.zIndex = "50";
            document.body.appendChild(popup);
            popup.appendChild(component.element);
            position(props);
          },
          onUpdate: (props) => {
            component?.updateProps({ items: props.items, command: props.command });
            position(props);
          },
          onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === "Escape") {
              popup?.remove();
              return true;
            }
            return component?.ref?.onKeyDown(props) ?? false;
          },
          onExit: () => {
            popup?.remove();
            popup = null;
            component?.destroy();
            component = null;
          },
        };
      },
    },
  };
}
