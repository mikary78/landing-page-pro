import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface StyledDocumentViewerProps {
  content: string;
  className?: string;
}

export function StyledDocumentViewer({ content, className }: StyledDocumentViewerProps) {
  if (!content) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>표시할 콘텐츠가 없습니다.</p>
      </div>
    );
  }

  return (
    <article className={cn("styled-document mx-auto", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-10 mb-6 pb-3 border-b-2 border-primary/20 text-foreground flex items-center gap-3">
              <span className="w-1 h-7 bg-primary rounded-full inline-block flex-shrink-0" />
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-10 mb-4 pb-3 border-b border-border text-foreground flex items-center gap-3">
              <span className="w-1 h-6 bg-primary/70 rounded-full inline-block flex-shrink-0" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-8 mb-3 text-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-6 mb-2 text-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-5 leading-[1.8] text-[15px] text-muted-foreground">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-muted-foreground">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-6 bg-primary/5 border-l-4 border-primary rounded-r-lg pl-5 pr-4 py-4 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2 mb-5 pl-0 list-none">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 mb-5 pl-0 list-none counter-reset-item">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => {
            const isOrdered = props.node?.position && props.ordered;
            return (
              <li className="flex items-start gap-2.5 text-[15px] leading-[1.8] text-muted-foreground">
                <span className="mt-[0.6em] w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                <span className="flex-1">{children}</span>
              </li>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-muted rounded-lg p-4 my-6 overflow-x-auto">
                <code className={cn("text-sm font-mono", codeClassName)}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-border">
              <table className="min-w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/70">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-foreground border-b-2 border-border whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 border-b border-border text-muted-foreground">
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr className="hover:bg-muted/30 transition-colors even:bg-muted/20">
              {children}
            </tr>
          ),
          hr: () => <Separator className="my-10" />,
          img: ({ src, alt }) => (
            <figure className="my-6">
              <img
                src={src}
                alt={alt || ''}
                className="rounded-lg max-w-full h-auto mx-auto shadow-sm"
              />
              {alt && (
                <figcaption className="text-center text-sm text-muted-foreground mt-2">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
