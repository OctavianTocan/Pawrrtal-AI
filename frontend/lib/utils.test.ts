import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', (): void => {
	it('merges class strings', (): void => {
		expect(cn('a', 'b')).toBe('a b');
	});

	it('filters falsy entries', (): void => {
		expect(cn('a', false, null, undefined, 'b')).toBe('a b');
	});

	it('resolves conflicting Tailwind utilities using tailwind-merge', (): void => {
		expect(cn('px-2', 'px-4')).toBe('px-4');
	});
});
