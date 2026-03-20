"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  RemoveFormatting,
  Heading1,
  Heading2,
  AlignLeft,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  tags?: string[];
  onInsertTag?: (tag: string) => void;
}

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#9ca3af" },
  { label: "Orange", value: "#eb9447" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
];

export default function RichTextEditor({ value, onChange, placeholder, tags }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || "Write your email..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none min-h-[160px] px-3 py-2 focus:outline-none text-zinc-200",
      },
    },
  });

  // Sync external value changes (e.g. AI generation)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  function insertTag(tag: string) {
    editor?.chain().focus().insertContent(tag).run();
  }

  if (!editor) return null;

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-zinc-700 bg-zinc-800/60">
        {/* Heading size */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`p-1.5 rounded text-xs transition-colors ${editor.isActive("paragraph") && !editor.isActive("heading") ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Normal text"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded text-xs transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded text-xs transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("bold") ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("italic") ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("underline") ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("bulletList") ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive("orderedList") ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Numbered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        {/* Link */}
        <button
          type="button"
          onClick={setLink}
          className={`p-1.5 rounded transition-colors ${editor.isActive("link") ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
          title="Insert link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        {/* Text color */}
        <div className="relative group">
          <button
            type="button"
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center gap-0.5"
            title="Text color"
          >
            <span className="text-xs font-bold" style={{ color: editor.getAttributes("textStyle").color || "currentColor" }}>A</span>
          </button>
          <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 hidden group-hover:flex gap-1.5 z-10 shadow-lg">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()}
                className="w-5 h-5 rounded-full border border-zinc-600 transition-transform hover:scale-110"
                style={{ backgroundColor: c.value || "#e4e4e7" }}
              />
            ))}
          </div>
        </div>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          title="Clear formatting"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>

        {/* Personalization tags */}
        {tags && tags.length > 0 && (
          <>
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-1.5 py-0.5 rounded transition-colors"
              >
                {tag}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Editor content area */}
      <EditorContent editor={editor} />
    </div>
  );
}
