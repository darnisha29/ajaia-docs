"use client"

import type { Editor } from "@tiptap/react"
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react"

import ToolbarButton from "@/sections/DocumentEditor/editor/ToolbarButton"

export type EditorToolbarProps = {
  editor: Editor | null
  /** Viewers get a visible, disabled toolbar rather than none — the affordance explains the restriction. */
  disabled: boolean
}

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-border" />

const EditorToolbar = ({ editor, disabled }: EditorToolbarProps) => {
  if (!editor) return null

  const iconClass = "size-4"

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-14 z-30 flex flex-wrap items-center gap-0.5 border-b border-border bg-surface/95 px-2 py-1.5 backdrop-blur-sm"
    >
      <ToolbarButton
        label="Bold"
        icon={<Bold className={iconClass} />}
        active={editor.isActive("bold")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Italic"
        icon={<Italic className={iconClass} />}
        active={editor.isActive("italic")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="Underline"
        icon={<UnderlineIcon className={iconClass} />}
        active={editor.isActive("underline")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />

      <Divider />

      <ToolbarButton
        label="Heading 1"
        icon={<Heading1 className={iconClass} />}
        active={editor.isActive("heading", { level: 1 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label="Heading 2"
        icon={<Heading2 className={iconClass} />}
        active={editor.isActive("heading", { level: 2 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="Heading 3"
        icon={<Heading3 className={iconClass} />}
        active={editor.isActive("heading", { level: 3 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Divider />

      <ToolbarButton
        label="Bulleted list"
        icon={<List className={iconClass} />}
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Numbered list"
        icon={<ListOrdered className={iconClass} />}
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        label="Quote"
        icon={<Quote className={iconClass} />}
        active={editor.isActive("blockquote")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />

      <Divider />

      <ToolbarButton
        label="Undo"
        icon={<Undo2 className={iconClass} />}
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        label="Redo"
        icon={<Redo2 className={iconClass} />}
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  )
}

export default EditorToolbar
