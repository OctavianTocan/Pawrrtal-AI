import { describe, expect, it } from 'vitest';
import { extractConversationIdFromPath } from './route-utils';

describe('extractConversationIdFromPath', (): void => {
	it('returns the id for a standard conversation route', (): void => {
		expect(extractConversationIdFromPath('/c/550e8400-e29b-41d4-a716-446655440000')).toBe(
			'550e8400-e29b-41d4-a716-446655440000'
		);
	});

	it('returns null for the app root', (): void => {
		expect(extractConversationIdFromPath('/')).toBeNull();
	});

	it('returns null when there is no /c prefix', (): void => {
		expect(extractConversationIdFromPath('/login')).toBeNull();
	});

	it('ignores trailing segments after the conversation id', (): void => {
		expect(extractConversationIdFromPath('/c/abc123/extra')).toBe('abc123');
	});

	it('returns null for empty string', (): void => {
		expect(extractConversationIdFromPath('')).toBeNull();
	});
});
