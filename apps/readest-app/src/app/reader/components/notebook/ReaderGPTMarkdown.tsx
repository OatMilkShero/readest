'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ReaderGPTMarkdown = memo(function ReaderGPTMarkdown({ content }: { content: string }) {
  return (
    <div className='text-base-content min-w-0 max-w-none break-words text-sm leading-relaxed'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className='mb-2 mt-3 text-lg font-semibold tracking-tight first:mt-0'>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className='mb-2 mt-3 text-base font-semibold tracking-tight first:mt-0'>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className='mb-1.5 mt-3 text-sm font-semibold tracking-tight first:mt-0'>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className='mb-1.5 mt-2 text-sm font-semibold first:mt-0'>{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className='mb-1 mt-2 text-sm font-medium first:mt-0'>{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className='text-base-content/75 mb-1 mt-2 text-xs font-semibold first:mt-0'>
              {children}
            </h6>
          ),
          p: ({ children }) => <p className='my-2 first:mt-0 last:mb-0'>{children}</p>,
          ul: ({ children }) => <ul className='my-2 ms-5 list-disc space-y-1'>{children}</ul>,
          ol: ({ children }) => <ol className='my-2 ms-5 list-decimal space-y-1'>{children}</ol>,
          li: ({ children }) => <li className='ps-0.5'>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className='border-base-300 text-base-content/75 my-2 border-s-2 ps-3 italic'>
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary break-all underline underline-offset-2'
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => (
            <code
              className={`bg-base-200 rounded px-1 py-0.5 font-mono text-[0.85em] ${className ?? ''}`}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className='bg-base-200 my-2 max-w-full overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed [&_code]:bg-transparent [&_code]:p-0'>
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default ReaderGPTMarkdown;
