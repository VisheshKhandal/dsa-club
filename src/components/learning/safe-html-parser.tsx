"use client";

import React from "react";
import { decodeHtmlEntities } from "./content-normalizer";
import { CodeIllustration } from "./code-illustration";
import { TreeVisualization } from "./tree-visualization";
import { ArrayVisualization } from "./array-visualization";
import { StackQueueVisualization } from "./stack-queue-visualization";
import { DryRunStepper } from "./dry-run-stepper";
import { StructuredExample } from "./structured-example";
import {
  KeyInsight,
  ThinkCheckpoint,
  WarningCallout,
  KeyTakeaways,
  MentalModelCallout,
} from "./content-blocks";
import {
  HtmlNode,
  getNodeText,
  transformAst,
} from "./ast-semantic-transformer";
import { cn } from "@/lib/utils";

const VOID_TAGS = new Set(["br", "hr", "img", "input", "meta", "link"]);

const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "div", "span",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "strong", "b", "em", "i", "u", "s", "strike",
  "a", "img", "hr", "br",
  "table", "thead", "tbody", "tr", "th", "td",
]);

/**
 * Tokenizes HTML into an AST node tree.
 * 100% deterministic and isomorphic (identical execution on Server SSR and Client).
 */
export function parseHtmlToAst(html: string): HtmlNode[] {
  const root: HtmlNode = { type: "element", tag: "root", children: [] };
  const stack: HtmlNode[] = [root];

  // Tokenizer regex matching tags and text chunks
  const tokenRegex = /(<!--[\s\S]*?-->)|(<(?:\/)?([a-zA-Z0-9]+)([^>]*)>)|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(html)) !== null) {
    const [fullMatch, comment, tagMatch, tagNameRaw, attrString, textChunk] = match;

    // 1. Skip comments
    if (comment) continue;

    // 2. Text node
    if (textChunk) {
      const decoded = decodeHtmlEntities(textChunk);
      if (decoded) {
        const current = stack[stack.length - 1];
        current.children?.push({
          type: "text",
          text: decoded,
        });
      }
      continue;
    }

    // 3. Tag token
    if (tagMatch && tagNameRaw) {
      const isClosing = tagMatch.startsWith("</");
      const tagName = tagNameRaw.toLowerCase();

      // Disallow unsafe tags (script, style, iframe, etc.)
      if (!ALLOWED_TAGS.has(tagName)) {
        continue;
      }

      if (isClosing) {
        // Pop back to the matching opening tag
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tag === tagName) {
            stack.splice(i);
            break;
          }
        }
      } else {
        // Opening tag: parse attributes
        const attrs: Record<string, string> = {};
        if (attrString) {
          const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
          let attrMatch: RegExpExecArray | null;
          while ((attrMatch = attrRegex.exec(attrString)) !== null) {
            const attrName = attrMatch[1].toLowerCase();
            const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

            // Prevent on* event handlers and javascript: URIs
            if (attrName.startsWith("on")) continue;
            if ((attrName === "href" || attrName === "src") && attrVal.trim().toLowerCase().startsWith("javascript:")) continue;

            attrs[attrName] = decodeHtmlEntities(attrVal);
          }
        }

        const newNode: HtmlNode = {
          type: "element",
          tag: tagName,
          attrs,
          children: [],
        };

        const current = stack[stack.length - 1];
        current.children?.push(newNode);

        if (!VOID_TAGS.has(tagName)) {
          stack.push(newNode);
        }
      }
    }
  }

  return (root.children ?? []).filter(
    (n) => n.type !== "text" || (n.text && n.text.trim().length > 0)
  );
}

/**
 * Converts an AST node into styled, accessible React elements
 */
function renderAstNode(node: HtmlNode, index: number, stageTitle?: string): React.ReactNode {
  // ── 0. Text Node ──
  if (node.type === "text") {
    return node.text;
  }

  // ── 1. Custom Semantic Component Nodes ──
  if (node.type === "custom") {
    switch (node.customType) {
      case "code-illustration":
        return (
          <CodeIllustration
            key={index}
            code={node.customData.code}
            language={node.customData.language}
            className="my-5"
          />
        );

      case "tree-viz":
        return (
          <TreeVisualization
            key={index}
            treeData={node.customData.treeData}
            title={node.customData.title}
          />
        );

      case "dry-run":
        return <DryRunStepper key={index} data={node.customData} />;

      case "array-viz":
        return (
          <ArrayVisualization
            key={index}
            title={node.customData.title}
            elements={node.customData.elements}
            intervals={node.customData.intervals}
            pointers={node.customData.pointers}
          />
        );

      case "stack-queue-viz":
        return (
          <StackQueueVisualization
            key={index}
            type={node.customData.type}
            items={node.customData.items}
            title={node.customData.title}
            operation={node.customData.operation}
          />
        );

      case "structured-example":
        return (
          <StructuredExample
            key={index}
            title={node.customData.title}
            problemStatement={node.customData.problemStatement}
            input={node.customData.input}
            output={node.customData.output}
            explanation={node.customData.explanation}
          />
        );

      case "mental-model":
        return (
          <MentalModelCallout key={index} title={node.customData.title || "Mental Model"}>
            {node.customData.content || (
              <div className="space-y-2">
                {node.customData.children?.map((c: HtmlNode, cIdx: number) =>
                  renderAstNode(c, cIdx, stageTitle)
                )}
              </div>
            )}
          </MentalModelCallout>
        );

      case "key-insight":
        return (
          <KeyInsight key={index} title={node.customData.title || "Key Insight"}>
            {node.customData.content}
          </KeyInsight>
        );

      case "warning-callout":
        return (
          <WarningCallout key={index} title={node.customData.title || "Common Mistake"}>
            {node.customData.content}
          </WarningCallout>
        );

      case "think-checkpoint":
        return (
          <ThinkCheckpoint
            key={index}
            question={node.customData.question}
            explanation={node.customData.explanation}
          />
        );
    }
  }

  // ── 2. Standard HTML Elements with Technical Blog Typography ──
  const { tag, attrs = {}, children = [] } = node;
  const childElements = children.map((c, i) => renderAstNode(c, i, stageTitle));
  const fullText = getNodeText(node).trim();

  switch (tag) {
    // Headings
    case "h1":
      return (
        <h1 key={index} className="text-2xl sm:text-3xl font-black tracking-tight text-(--color-text-primary) pt-6 pb-2">
          {childElements}
        </h1>
      );
    case "h2":
      return (
        <h2 key={index} className="text-xl sm:text-2xl font-bold tracking-tight text-(--color-text-primary) pt-6 pb-2 border-b border-(--color-border)">
          {childElements}
        </h2>
      );
    case "h3":
      return (
        <h3 key={index} className="text-lg sm:text-xl font-bold tracking-tight text-(--color-text-primary) pt-5 pb-1">
          {childElements}
        </h3>
      );
    case "h4":
    case "h5":
    case "h6":
      return (
        <h4 key={index} className="text-base sm:text-lg font-semibold text-(--color-text-primary) pt-3 pb-1">
          {childElements}
        </h4>
      );

    // Paragraph
    case "p": {
      if (!fullText && !children.some((c) => c.tag === "img" || c.tag === "br")) {
        return null;
      }
      return (
        <p key={index} className="text-[15px] sm:text-[16px] leading-[1.8] text-(--color-text-secondary) mb-4">
          {childElements}
        </p>
      );
    }

    // Code & Pre (in case not transformed by custom passes)
    case "pre": {
      const codeNode = children.find((c) => c.tag === "code");
      const rawCode = codeNode ? getNodeText(codeNode) : fullText;
      return (
        <CodeIllustration
          key={index}
          code={rawCode}
          className="my-5"
        />
      );
    }

    case "code":
      return (
        <code key={index} className="font-mono text-[13px] px-1.5 py-0.5 rounded bg-(--color-surface-2) text-cyan-300 font-medium">
          {childElements}
        </code>
      );

    // Lists
    case "ul":
      return (
        <ul key={index} className="my-4 list-disc pl-6 space-y-2 text-[15px] sm:text-[16px] text-(--color-text-secondary)">
          {childElements}
        </ul>
      );
    case "ol":
      return (
        <ol key={index} className="my-4 list-decimal pl-6 space-y-2 text-[15px] sm:text-[16px] text-(--color-text-secondary)">
          {childElements}
        </ol>
      );
    case "li":
      return (
        <li key={index} className="leading-[1.75]">
          {childElements}
        </li>
      );

    // Blockquote
    case "blockquote":
      return (
        <blockquote key={index} className="my-5 border-l-3 border-(--color-purple)/50 bg-(--color-surface-2)/40 py-3 px-4 rounded-r-(--radius-card) italic text-(--color-text-secondary) leading-relaxed">
          {childElements}
        </blockquote>
      );

    // Inline
    case "strong":
    case "b":
      return (
        <strong key={index} className="font-bold text-(--color-text-primary)">
          {childElements}
        </strong>
      );
    case "em":
    case "i":
      return (
        <em key={index} className="italic text-(--color-text-primary)/95">
          {childElements}
        </em>
      );
    case "a": {
      const href = attrs.href || "#";
      const isExternal = /^https?:\/\//i.test(href);
      return (
        <a
          key={index}
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors font-medium"
        >
          {childElements}
        </a>
      );
    }
    case "u":
      return (
        <span key={index} className="underline underline-offset-2 decoration-(--color-text-muted)/40">
          {childElements}
        </span>
      );
    case "s":
    case "strike":
      return (
        <span key={index} className="line-through text-(--color-text-muted)">
          {childElements}
        </span>
      );
    case "img": {
      const src = attrs.src || "";
      const alt = attrs.alt || "";
      if (!src) return null;
      return (
        <figure key={index} className="my-6">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="rounded-(--radius-card) border border-(--color-border) max-w-full h-auto"
          />
          {alt && (
            <figcaption className="mt-2 text-xs text-(--color-text-muted) text-center">{alt}</figcaption>
          )}
        </figure>
      );
    }
    case "br":
      return <br key={index} />;
    case "hr":
      return <hr key={index} className="my-6 border-(--color-border)" />;

    // Tables
    case "table":
      return (
        <div key={index} className="my-6 overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1)">
          <table className="w-full text-left text-sm text-(--color-text-secondary)">
            {childElements}
          </table>
        </div>
      );
    case "thead":
      return <thead key={index} className="border-b border-(--color-border) bg-(--color-surface-2)/50 text-xs font-semibold uppercase text-(--color-text-muted)">{childElements}</thead>;
    case "tbody":
      return <tbody key={index} className="divide-y divide-(--color-border)">{childElements}</tbody>;
    case "tr":
      return <tr key={index} className="hover:bg-(--color-surface-2)/30 transition-colors">{childElements}</tr>;
    case "th":
      return <th key={index} className="px-4 py-3 font-semibold text-(--color-text-primary)">{childElements}</th>;
    case "td":
      return <td key={index} className="px-4 py-3">{childElements}</td>;

    case "div":
    default:
      return <div key={index}>{childElements}</div>;
  }
}

/**
 * Safe, isomorphic HTML parser component that renders structured learning blocks
 */
export function SafeHtmlParser({ html, stageTitle }: { html: string; stageTitle?: string }) {
  if (!html || !html.trim()) return null;

  try {
    const rawAst = parseHtmlToAst(html);
    const transformedAst = transformAst(rawAst, stageTitle);
    return (
      <div className="space-y-4">
        {transformedAst.map((node, i) => renderAstNode(node, i, stageTitle))}
      </div>
    );
  } catch {
    // Graceful fallback to pure decoded text in case of corrupted markup
    return (
      <div className="space-y-4 text-[15px] sm:text-[16px] leading-[1.8] text-(--color-text-secondary)">
        <p>{decodeHtmlEntities(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())}</p>
      </div>
    );
  }
}
