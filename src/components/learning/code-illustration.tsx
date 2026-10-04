"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodeIllustrationProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export const KEYWORDS = new Set([
  "const", "let", "var", "int", "long", "float", "double", "char", "bool", "void", "auto",
  "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
  "class", "struct", "public", "private", "protected", "template", "typename",
  "nullptr", "NULL", "true", "false", "new", "delete", "sizeof",
  // Python
  "def", "import", "from", "self", "in", "is", "not", "and", "or", "range", "elif",
  "None", "True", "False", "lambda", "pass", "yield", "with", "as",
  // JS/TS
  "function", "async", "await", "export", "default", "type", "interface", "null", "undefined",
  // Java
  "final", "static", "throw", "throws", "boolean", "byte", "short", "package",
]);

export const TYPES = new Set([
  "vector", "string", "unordered_map", "unordered_set", "map", "set",
  "queue", "stack", "priority_queue", "pair", "list", "deque",
  "ListNode", "TreeNode", "Node", "Array", "Set", "Map", "Promise",
]);

export function detectLanguage(code: string, explicitLang?: string): string {
  if (explicitLang && explicitLang !== "code" && explicitLang !== "text") return explicitLang;
  if (/def\s+[a-zA-Z_]\w*\s*\(|import\s+\w+|elif\s+|None|True|False|self\./.test(code)) return "python";
  if (/#include\s+<|nullptr|std::|vector<|cout\s*<<|cin\s*>>|TreeNode\s*\*/.test(code)) return "cpp";
  if (/const\s+|let\s+|console\.log|=>|function\s+|export\s+/.test(code)) return "typescript";
  if (/public\s+class\s+|System\.out\.print/.test(code)) return "java";
  return "cpp";
}

function highlightToken(token: string): React.ReactNode {
  // Comment
  if (token.startsWith("//") || token.startsWith("#") || token.startsWith("/*")) {
    return <span className="text-purple-100/40 italic">{token}</span>;
  }
  // String
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    return <span className="text-amber-300/90">{token}</span>;
  }
  // Number
  if (/^\d+(\.\d+)?$/.test(token)) {
    return <span className="text-emerald-300 font-medium">{token}</span>;
  }
  // Keyword
  if (KEYWORDS.has(token)) {
    return <span className="text-fuchsia-300 font-semibold">{token}</span>;
  }
  // Types
  if (TYPES.has(token)) {
    return <span className="text-cyan-300 font-medium">{token}</span>;
  }
  // Operators / punctuation
  if (/^[+\-*/%=!<>|&^~?:;,.(){}\[\]]$/.test(token)) {
    return <span className="text-purple-100/60">{token}</span>;
  }
  return token;
}

function highlightLine(line: string): React.ReactNode[] {
  const regex = /(\/\/.*$|#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[a-zA-Z_]\w*|\d+(?:\.\d+)?|[+\-*/%=!<>|&^~?:;,.(){}\[\]]|\s+)/g;
  const parts = line.match(regex) || [line];

  return parts.map((part, idx) => (
    <React.Fragment key={idx}>{highlightToken(part)}</React.Fragment>
  ));
}

export function normalizeLanguage(lang?: string): string {
  if (!lang) return "Code";
  const clean = lang.toLowerCase().trim();
  if (clean === "cpp" || clean === "c++") return "C++";
  if (clean === "python" || clean === "py") return "Python";
  if (clean === "javascript" || clean === "js") return "JavaScript";
  if (clean === "typescript" || clean === "ts") return "TypeScript";
  if (clean === "java") return "Java";
  if (clean === "pseudocode") return "Pseudocode";
  return clean.toUpperCase();
}

export function CodeIllustration({
  code,
  language,
  title,
  showLineNumbers,
  className,
}: CodeIllustrationProps) {
  const [copied, setCopied] = useState(false);
  const cleanCode = code.replace(/^\n+|\n+$/g, "");
  const lines = cleanCode.split("\n");
  const effectiveLang = detectLanguage(cleanCode, language);
  const displayLang = normalizeLanguage(effectiveLang);
  const shouldShowLines = showLineNumbers ?? lines.length > 2;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard access error fallback
    }
  };

  return (
    <div
      className={cn(
        "group my-5 overflow-hidden rounded-xl border border-white/[0.09] bg-[#070311] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-150 hover:border-purple-400/25",
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.025] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-purple-300/60" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-purple-200/70">
            {title || displayLang}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className="focus-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-purple-100/50 transition hover:bg-white/[0.06] hover:text-white"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-300">Copied ✓</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Container */}
      <div className="overflow-x-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <pre className="font-mono text-[13px] leading-[1.7] text-purple-100/85">
          <code>
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                {shouldShowLines && (
                  <span className="table-cell select-none pr-4 text-right text-[11px] text-purple-100/25 font-mono">
                    {idx + 1}
                  </span>
                )}
                <span className="table-cell whitespace-pre">{highlightLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
