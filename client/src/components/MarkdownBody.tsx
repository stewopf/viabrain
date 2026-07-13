import { Children, isValidElement } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "./MermaidBlock";

function isMermaidCode(child: unknown): child is {
  props: { className?: string; children?: unknown };
} {
  return (
    isValidElement(child) &&
    typeof child.props === "object" &&
    child.props !== null &&
    typeof (child.props as { className?: string }).className === "string" &&
    Boolean(
      /language-mermaid/.test(
        (child.props as { className?: string }).className ?? "",
      ),
    )
  );
}

const components: Components = {
  pre({ children }) {
    const only = Children.count(children) === 1 ? Children.only(children) : null;
    if (isMermaidCode(only)) {
      const text = String(only.props.children ?? "").replace(/\n$/, "");
      return (
        <div className="mermaid-wrap">
          <MermaidBlock chart={text} />
        </div>
      );
    }
    return <pre>{children}</pre>;
  },
};

type Props = {
  children: string;
};

export function MarkdownBody({ children }: Props) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
