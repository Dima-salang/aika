import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/** Allow underline/strikethrough tags from the editor; strip scripts/events. */
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u", "s"],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
  },
};

/**
 * Renders Markdown safely: raw HTML is parsed then sanitized.
 */
export function renderMarkdown(md: string | null | undefined): React.ReactNode {
  if (!md) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
      components={{
        strong: ({ node, ...props }) => <strong className="font-bold text-on-surface" {...props} />,
        em: ({ node, ...props }) => <em className="italic text-on-surface" {...props} />,
        code: ({ node, ...props }) => (
          <code className="px-1 py-0.5 bg-surface-container-high dark:bg-neutral-850 rounded font-mono text-[0.9em] text-primary" {...props} />
        ),
        p: ({ node, ...props }) => <p className="text-on-surface-variant text-body-sm leading-relaxed mb-1 last:mb-0" {...props} />,
        a: ({ node, href, ...props }) => {
          const safeHref =
            typeof href === "string" && /^(https?:|mailto:|\/)/i.test(href) ? href : undefined;
          return (
            <a
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer noopener"
              href={safeHref}
              {...props}
            />
          );
        },
        u: ({ node, ...props }) => <span className="underline text-on-surface" {...props} />,
        s: ({ node, ...props }) => <span className="line-through text-on-surface-variant" {...props} />,

        h1: ({ node, ...props }) => <h1 className="text-lg font-black text-on-surface mt-3 mb-1.5" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-base font-bold text-on-surface mt-2.5 mb-1" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-on-surface mt-2 mb-0.5" {...props} />,

        ul: ({ node, ...props }) => <ul className="list-disc list-inside ml-3 my-1.5 space-y-0.5 text-on-surface-variant text-xs" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal list-inside ml-3 my-1.5 space-y-0.5 text-on-surface-variant text-xs" {...props} />,
        li: ({ node, ...props }) => <li className="text-on-surface-variant" {...props} />,

        blockquote: ({ node, ...props }) => (
          <blockquote className="text-xs text-outline italic ml-2 pl-2.5 border-l-2 border-outline-variant/80 my-2" {...props} />
        ),
      }}
    >
      {md}
    </ReactMarkdown>
  );
}
