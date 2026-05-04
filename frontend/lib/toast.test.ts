import { describe, expect, it } from 'vitest';
import { TOAST_IDS, toast } from './toast';

describe('lib/toast', () => {
	it('exposes a sonner-shaped toast singleton with the standard surface', () => {
		expect(typeof toast).toBe('function');
		expect(typeof toast.success).toBe('function');
		expect(typeof toast.error).toBe('function');
		expect(typeof toast.info).toBe('function');
		expect(typeof toast.loading).toBe('function');
	});

	it('exposes stable IDs covering every conversation surface', () => {
		const expected = [
			'conversationFlag',
			'conversationArchive',
			'conversationUnread',
			'conversationStatus',
			'conversationLabel',
			'conversationCopyLink',
			'conversationRegenerateTitle',
			'conversationDuplicate',
			'conversationExport',
		];
		for (const key of expected) {
			expect(Object.keys(TOAST_IDS)).toContain(key);
			expect((TOAST_IDS as Record<string, string>)[key]).toMatch(/^conversation:/);
		}
	});

	it('keeps every TOAST_ID value unique so dedupe never collapses unrelated toasts', () => {
		const values = Object.values(TOAST_IDS);
		expect(new Set(values).size).toBe(values.length);
	});
});
