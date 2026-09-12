import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import ReaderGPTMarkdown from '@/app/reader/components/notebook/ReaderGPTMarkdown';

afterEach(cleanup);

describe('ReaderGPTMarkdown', () => {
  it('renders plain text and common Markdown without source punctuation', () => {
    const { container } = render(
      <ReaderGPTMarkdown
        content={`Plain text.

### Small heading

This is **bold** and *italic* with \`inline code\`.

- First bullet
- Second bullet

1. First step
2. Second step

> A quoted thought

[Readest](https://readest.com)`}
      />,
    );

    expect(screen.getByText('Plain text.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Small heading' })).toBeTruthy();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('italic').tagName).toBe('EM');
    expect(screen.getByText('inline code').tagName).toBe('CODE');
    expect(container.querySelector('ul')?.textContent).toContain('First bullet');
    expect(container.querySelector('ol')?.textContent).toContain('First step');
    expect(container.querySelector('blockquote')?.textContent).toContain('A quoted thought');

    const link = screen.getByRole('link', { name: 'Readest' });
    expect(link.getAttribute('href')).toBe('https://readest.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not execute raw HTML or unsafe link protocols', () => {
    const { container } = render(
      <ReaderGPTMarkdown
        content={'<img src=x onerror="alert(1)">\n\n[unsafe](javascript:alert(1))'}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('');
  });

  it('renders fenced code without overflowing its container', () => {
    const { container } = render(<ReaderGPTMarkdown content={'```ts\nconst answer = 42;\n```'} />);

    expect(screen.getByText('const answer = 42;').tagName).toBe('CODE');
    expect(container.querySelector('pre')?.className).toContain('overflow-x-auto');
  });

  it('keeps rendering as a streamed message grows', () => {
    const { rerender } = render(<ReaderGPTMarkdown content='**part' />);
    expect(screen.getByText('**part')).toBeTruthy();

    rerender(<ReaderGPTMarkdown content={'**partial bold**\n\n- streamed item'} />);
    expect(screen.getByText('partial bold').tagName).toBe('STRONG');
    expect(screen.getByText('streamed item')).toBeTruthy();
  });
});
