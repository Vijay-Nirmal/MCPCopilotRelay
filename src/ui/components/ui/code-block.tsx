import { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import { cn } from '../../lib/utils';

interface CodeBlockProps {
  code: string;
  language: 'typescript' | 'json' | 'markdown' | 'javascript';
  className?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language, className, showLineNumbers = true }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div className={cn('relative', className)}>
      <pre className={cn('rounded-lg overflow-auto text-sm', showLineNumbers && 'line-numbers')}>
        <code ref={codeRef} className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
}
