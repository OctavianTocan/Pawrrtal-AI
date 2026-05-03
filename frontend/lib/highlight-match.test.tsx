import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { highlightMatch } from './highlight-match';

describe('highlightMatch', (): void => {
  it('returns plain text when query is empty or whitespace', (): void => {
    expect(highlightMatch('Hello', '')).toBe('Hello');
    expect(highlightMatch('Hello', '   ')).toBe('Hello');
  });

  it('returns plain text when there is no case-insensitive match', (): void => {
    expect(highlightMatch('Hello', 'xyz')).toBe('Hello');
  });

  it('wraps a single case-insensitive match in a span', (): void => {
    const { container } = render(<div>{highlightMatch('Hello World', 'world')}</div>);

    expect(container.textContent).toBe('Hello World');
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span).toHaveTextContent('World');
    expect(span).toHaveClass('bg-yellow-300/25');
  });

  it('highlights every occurrence recursively', (): void => {
    render(<div>{highlightMatch('foo Foo foo', 'foo')}</div>);

    const spans = document.querySelectorAll('span.bg-yellow-300\\/25');
    expect(spans).toHaveLength(3);
  });
});
