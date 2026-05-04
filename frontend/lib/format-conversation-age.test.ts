import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatConversationAge } from './format-conversation-age';

describe('formatConversationAge', (): void => {
	beforeEach((): void => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-05-03T12:00:00.000Z'));
	});

	afterEach((): void => {
		vi.useRealTimers();
	});

	it('returns null for invalid date strings', (): void => {
		expect(formatConversationAge('not a date')).toBeNull();
	});

	it('formats seconds when under one minute', (): void => {
		expect(formatConversationAge('2026-05-03T11:59:30.000Z')).toBe('30s');
	});

	it('formats minutes when under one hour', (): void => {
		expect(formatConversationAge('2026-05-03T11:30:00.000Z')).toBe('30m');
	});

	it('formats hours when under one day', (): void => {
		expect(formatConversationAge('2026-05-03T02:00:00.000Z')).toBe('10h');
	});

	it('formats days when under one week', (): void => {
		expect(formatConversationAge('2026-04-28T12:00:00.000Z')).toBe('5d');
	});

	it('formats weeks when under five weeks', (): void => {
		expect(formatConversationAge('2026-04-05T12:00:00.000Z')).toBe('4w');
	});

	it('formats months when at least 30 days but under a year bucket', (): void => {
		expect(formatConversationAge('2026-01-15T12:00:00.000Z')).toBe('3mo');
	});

	it('formats years when beyond the month threshold', (): void => {
		expect(formatConversationAge('2024-05-03T12:00:00.000Z')).toBe('2y');
	});

	it('never returns negative durations (clamps to 0s)', (): void => {
		expect(formatConversationAge('2026-05-03T13:00:00.000Z')).toBe('0s');
	});
});
