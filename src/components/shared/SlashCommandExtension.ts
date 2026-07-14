import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import {
  SLASH_COMMANDS,
  SlashCommandList,
  type SlashCommandItem,
  type SlashCommandListHandle,
} from "@/components/shared/SlashCommandList";

export type SlashCommandId = "status" | "task";

export interface SlashCommandOptions {
  onCommandSelect: (cmd: SlashCommandId) => void;
  /** Subset of commands to show. Defaults to all SLASH_COMMANDS when omitted. */
  commands?: SlashCommandItem[];
}

// Mirrors the buildSuggestionRender pattern in RichCommentEditor, typed for SlashCommandList.
function buildSlashSuggestionRender() {
  let component: ReactRenderer<
    SlashCommandListHandle,
    { items: SlashCommandItem[]; command: (item: { id: string }) => void }
  > | null = null;
  let popup: HTMLDivElement | null = null;

  function position(props: SuggestionProps<SlashCommandItem>) {
    if (!popup) return;
    const rect = props.clientRect?.();
    if (!rect) return;
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
  }

  return {
    onStart(props: SuggestionProps<SlashCommandItem>) {
      component = new ReactRenderer(SlashCommandList, {
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
    onUpdate(props: SuggestionProps<SlashCommandItem>) {
      component?.updateProps({ items: props.items, command: props.command });
      position(props);
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === "Escape") {
        popup?.remove();
        return true;
      }
      return component?.ref?.onKeyDown(props) ?? false;
    },
    onExit() {
      popup?.remove();
      popup = null;
      component?.destroy();
      component = null;
    },
  };
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return { onCommandSelect: () => {} };
  },

  addProseMirrorPlugins() {
    // Capture into local variables so the Suggestion closure always reads the latest
    // values without needing to re-create the ProseMirror plugin on each render.
    const onCommandSelect = this.options.onCommandSelect;
    const commands = this.options.commands ?? SLASH_COMMANDS;

    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        command({ editor, range, props }) {
          editor.chain().focus().deleteRange(range).run();
          onCommandSelect(props.id as SlashCommandId);
        },
        items({ query }) {
          if (!query) return commands;
          const term = query.toLowerCase();
          return commands.filter((cmd) => cmd.label.toLowerCase().includes(term));
        },
        render: buildSlashSuggestionRender,
      }),
    ];
  },
});
