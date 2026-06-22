"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import {
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  $createTextNode,
  TextNode,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getNodeByKey,
  KEY_TAB_COMMAND
} from "lexical";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, $isListItemNode } from "@lexical/list";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Strikethrough,
  Quote,
  Link,
  Heading1,
  Heading2,
  Heading3,
  Underline,
  Check,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import {
  TEXT_FORMAT_TRANSFORMERS,
  UNORDERED_LIST,
  ORDERED_LIST,
  LINK,
  HEADING,
  QUOTE,
  CODE,
  STRIKETHROUGH,
  TextMatchTransformer,
} from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, TOGGLE_LINK_COMMAND, $createLinkNode } from "@lexical/link";
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { CodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";

// Custom Underline Transformer using TextMatchTransformer to handle <u>...</u>
const UNDERLINE: TextMatchTransformer = {
  dependencies: [],
  export: (node) => {
    if (node instanceof TextNode && node.hasFormat("underline")) {
      return `<u>${node.getTextContent()}</u>`;
    }
    return null;
  },
  importRegExp: /<u>(.*?)<\/u>/,
  regExp: /<u>(.*?)<\/u>$/,
  replace: (node, match) => {
    const [, text] = match;
    const textNode = $createTextNode(text);
    textNode.toggleFormat("underline");
    node.replace(textNode);
    return textNode;
  },
  trigger: ">",
  type: "text-match",
};

// Define targeted transformers
const EDITOR_TRANSFORMERS = [
  ...TEXT_FORMAT_TRANSFORMERS,
  STRIKETHROUGH,
  UNDERLINE,
  UNORDERED_LIST,
  ORDERED_LIST,
  LINK,
  HEADING,
  QUOTE,
  CODE,
];

// Formatting Toolbar Sub-component
function ToolbarPlugin({ isFullscreen, toggleFullscreen }: { isFullscreen: boolean; toggleFullscreen: () => void }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isBullet, setIsBullet] = useState(false);
  const [isNumbered, setIsNumbered] = useState(false);
  const [activeHeading, setActiveHeading] = useState<'h1' | 'h2' | 'h3' | null>(null);
  const [isQuote, setIsQuote] = useState(false);
  const [isLink, setIsLink] = useState(false);

  // Link input popover state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsUnderline(selection.hasFormat("underline"));
        setIsStrikethrough(selection.hasFormat("strikethrough"));
        setIsCode(selection.hasFormat("code"));

        // Walk up nodes to check block types
        const anchorNode = selection.anchor.getNode();
        let parent = anchorNode.getParent();
        let listFound = false;
        let headingFound: 'h1' | 'h2' | 'h3' | null = null;
        let quoteFound = false;
        let linkFound = false;

        while (parent !== null) {
          const type = parent.getType();
          if (type === "list") {
            const listTag = (parent as any).getTag();
            setIsBullet(listTag === "ul");
            setIsNumbered(listTag === "ol");
            listFound = true;
          } else if (type === "heading") {
            headingFound = (parent as any).getTag() as 'h1' | 'h2' | 'h3';
          } else if (type === "quote") {
            quoteFound = true;
          } else if (type === "link") {
            linkFound = true;
          }
          parent = parent.getParent();
        }

        if (!listFound) {
          setIsBullet(false);
          setIsNumbered(false);
        }
        setActiveHeading(headingFound);
        setIsQuote(quoteFound);
        setIsLink(linkFound);
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      1
    );
  }, [editor, updateToolbar]);

  const toggleHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (activeHeading === headingSize) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
      }
    });
  };

  const toggleQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (isQuote) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      }
    });
  };

  const handleConfirmLink = () => {
    const url = linkUrl.trim();
    if (url) {
      editor.focus();
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            const linkNode = $createLinkNode(url);
            const textNode = $createTextNode(url);
            linkNode.append(textNode);
            selection.insertNodes([linkNode]);
          } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
          }
        }
      });
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const insertLink = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      setShowLinkInput(true);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap pb-2 mb-2 border-b border-outline-variant/60 select-none shrink-0">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        className={`p-1 rounded transition-colors cursor-pointer ${isBold ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        className={`p-1 rounded transition-colors cursor-pointer ${isItalic ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        className={`p-1 rounded transition-colors cursor-pointer ${isUnderline ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
        className={`p-1 rounded transition-colors cursor-pointer ${isStrikethrough ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        className={`p-1 rounded transition-colors cursor-pointer ${isCode ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Inline Code"
      >
        <Code className="h-3.5 w-3.5" />
      </button>

      {showLinkInput ? (
        <div className="flex items-center gap-1.5 bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant animate-in fade-in duration-100">
          <input
            type="text"
            placeholder="Enter URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="bg-transparent text-[11px] outline-none w-36 text-on-surface"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirmLink();
              } else if (e.key === "Escape") {
                setShowLinkInput(false);
              }
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleConfirmLink}
            className="p-0.5 hover:bg-primary/20 text-primary rounded transition-colors"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="p-0.5 hover:bg-error/20 text-error rounded transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className={`p-1 rounded transition-colors cursor-pointer ${isLink ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
            }`}
          title={isLink ? "Remove Link" : "Add Link"}
        >
          <Link className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="w-[1px] h-4 bg-outline-variant/60 mx-0.5" />

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleHeading("h1")}
        className={`p-1 rounded transition-colors cursor-pointer ${activeHeading === "h1" ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleHeading("h2")}
        className={`p-1 rounded transition-colors cursor-pointer ${activeHeading === "h2" ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleHeading("h3")}
        className={`p-1 rounded transition-colors cursor-pointer ${activeHeading === "h3" ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Heading 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-outline-variant/60 mx-0.5" />

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        className={`p-1 rounded transition-colors cursor-pointer ${isBullet ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        className={`p-1 rounded transition-colors cursor-pointer ${isNumbered ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Numbered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleQuote}
        className={`p-1 rounded transition-colors cursor-pointer ${isQuote ? "bg-primary/20 text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-high"
          }`}
        title="Blockquote"
      >
        <Quote className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleFullscreen}
        className="p-1.5 rounded text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer ml-auto"
        title={isFullscreen ? "Minimize Description Editor" : "Expand Description Editor"}
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// Custom plugin to initialize the value on mount or when async value loads
function InitialValuePlugin({ value }: { value: string }) {
  const [editor] = useLexicalComposerContext();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      editor.update(() => {
        const currentMarkdown = $convertToMarkdownString(EDITOR_TRANSFORMERS);
        if (currentMarkdown.trim() !== value.trim()) {
          $convertFromMarkdownString(value || "", EDITOR_TRANSFORMERS);
        }
        if (value) {
          hasInitializedRef.current = true;
        }
      });
    }
  }, [value, editor]);

  useEffect(() => {
    if (value === "") {
      editor.update(() => {
        const currentMarkdown = $convertToMarkdownString(EDITOR_TRANSFORMERS);
        if (currentMarkdown.trim() !== "") {
          $convertFromMarkdownString("", EDITOR_TRANSFORMERS);
        }
      });
    }
  }, [value, editor]);

  return null;
}

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const initialConfig = {
    namespace: "AikaEditor",
    theme: {
      paragraph: "text-xs text-on-surface leading-relaxed mb-1",
      list: {
        ul: "list-disc list-outside mb-2 text-xs text-on-surface",
        ol: "list-decimal list-outside mb-2 text-xs text-on-surface",
        ulDepth: [
          "pl-5",
          "pl-5",
          "pl-5",
          "pl-5",
          "pl-5"
        ],
        olDepth: [
          "pl-5",
          "pl-5",
          "pl-5",
          "pl-5",
          "pl-5"
        ],
        listitem: "text-xs text-on-surface",
      },
      heading: {
        h1: "text-lg font-bold text-on-surface mt-2 mb-1",
        h2: "text-base font-bold text-on-surface mt-2 mb-1",
        h3: "text-sm font-bold text-on-surface mt-2 mb-1",
        h4: "text-xs font-bold text-on-surface",
        h5: "text-xs font-bold text-on-surface",
        h6: "text-xs font-bold text-on-surface",
      },
      quote: "text-xs text-on-surface italic ml-2 pl-2 border-l-2 border-outline-variant my-1.5",
      code: "text-xs text-on-surface",
      text: {
        bold: "font-bold text-on-surface",
        italic: "italic text-on-surface",
        underline: "underline text-on-surface",
        strikethrough: "line-through text-on-surface",
        code: "px-1 py-0.5 bg-surface-container-high rounded font-mono text-[11px] text-primary",
        link: "text-primary hover:underline",
        blockquote: "text-xs text-on-surface italic ml-2 pl-2 border-l-2 border-outline-variant",
        codeblock: "text-xs text-on-surface",
        hashtag: "text-primary font-bold",
        mention: "text-primary font-bold",
      },
    },
    onError: (error: Error) => {
      console.error(error);
    },
    nodes: [
      ListNode,
      ListItemNode,
      LinkNode,
      HeadingNode,
      QuoteNode,
      CodeNode,
    ],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-surface/95 dark:bg-[#0a0a0c]/98 backdrop-blur-md p-6 flex flex-col h-screen w-screen animate-in fade-in duration-200"
          : "relative bg-transparent min-h-[140px] focus-within:ring-0 p-0 transition-all flex flex-col"
      }>
        <ToolbarPlugin isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />

        <div className={isFullscreen ? "flex-1 flex flex-col mt-4 min-h-0 relative" : "relative flex-1"}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable className={
                isFullscreen
                  ? "outline-none text-xs flex-1 resize-none text-on-surface font-sans overflow-y-auto h-full p-4 border border-outline-variant rounded-xl bg-surface-container-low/50"
                  : "outline-none text-xs min-h-[70px] resize-none text-on-surface font-sans"
              } />
            }
            placeholder={
              <div className={
                isFullscreen
                  ? "absolute top-4 left-4 text-xs text-outline pointer-events-none select-none font-sans"
                  : "absolute top-0 left-0 text-xs text-outline pointer-events-none select-none font-sans"
              }>
                {placeholder || "Enter description..."}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <MarkdownShortcutPlugin transformers={EDITOR_TRANSFORMERS} />
          <ListPlugin />
          <LinkPlugin />
          <TabIndentationPlugin />
          <OnChangePlugin
            onChange={(editorState) => {
              editorState.read(() => {
                const markdown = $convertToMarkdownString(EDITOR_TRANSFORMERS);
                onChange(markdown);
              });
            }}
          />
          <InitialValuePlugin value={value} />
        </div>
      </div>
    </LexicalComposer>
  );
}
